function Get-DocxPlainText {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $fullPath = (Resolve-Path -LiteralPath $Path).Path

    # Prefer Word COM when available (better paragraph/table handling)
    $word = $null
    $doc = $null
    try {
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $doc = $word.Documents.Open($fullPath, $false, $true)
        $text = $doc.Content.Text
        return ($text -replace "\r", "`n")
    }
    catch {
        return Get-DocxPlainTextFromZip -Path $fullPath
    }
    finally {
        if ($doc) {
            $null = $doc.Close($false)
            [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc)
        }
        if ($word) {
            $null = $word.Quit()
            [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
        }
        [GC]::Collect()
        [GC]::WaitForPendingFinalizers()
    }
}

function Get-DocxPlainTextFromZip {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $entry = $zip.Entries | Where-Object { $_.FullName -eq "word/document.xml" } | Select-Object -First 1
        if (-not $entry) {
            throw "В файле нет word/document.xml: $Path"
        }

        $stream = $entry.Open()
        try {
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
            $xml = $reader.ReadToEnd()
        }
        finally {
            $stream.Dispose()
        }
    }
    finally {
        $zip.Dispose()
    }

    $xml = $xml -replace "</w:p>", "`n"
    $xml = $xml -replace "<w:tab[^/]*/>", "`t"
    $xml = $xml -replace "<[^>]+>", ""
    $xml = [System.Net.WebUtility]::HtmlDecode($xml)
    return $xml
}

function New-QaItem {
    param(
        [string]$Question,
        [string]$Answer,
        [string[]]$Options = @(),
        [string]$Source
    )

    [pscustomobject]@{
        Question = $Question.Trim()
        Answer   = $Answer.Trim()
        Options  = @($Options | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        Source   = $Source
    }
}

function Add-QaIfReady {
    param(
        [System.Collections.Generic.List[object]]$Items,
        [ref]$Question,
        [System.Collections.Generic.List[string]]$Options,
        [ref]$PendingAnswer,
        [string]$Source
    )

    $q = $Question.Value
    $a = $PendingAnswer.Value

    if ($q -and $a) {
        $Items.Add((New-QaItem -Question $q -Answer $a -Options $Options.ToArray() -Source $Source))
    }
    elseif ($q -and $Options.Count -gt 0 -and -not $a) {
        $marked = @($Options | Where-Object { $_ -match '^[\+\*✓✔]\s*' -or $_ -match '\s*[\+\*✓✔]\s*$' })
        if ($marked.Count -gt 0) {
            $ans = ($marked[0] -replace '^[\+\*✓✔]\s*', '' -replace '\s*[\+\*✓✔]\s*$', '')
            $cleanOptions = @($Options | ForEach-Object {
                    $_ -replace '^[\+\*✓✔]\s*', '' -replace '\s*[\+\*✓✔]\s*$', ''
                })
            $Items.Add((New-QaItem -Question $q -Answer $ans -Options $cleanOptions -Source $Source))
        }
    }

    $Question.Value = $null
    $PendingAnswer.Value = $null
    $Options.Clear()
}

function Parse-QaBlocks {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,
        [Parameter(Mandatory = $true)]
        [string]$Source
    )

    $items = New-Object System.Collections.Generic.List[object]
    $lines = @($Text -split "`r?`n" | ForEach-Object { $_.Trim() })

    $question = $null
    $options = New-Object System.Collections.Generic.List[string]
    $pendingAnswer = $null

    foreach ($raw in $lines) {
        if ([string]::IsNullOrWhiteSpace($raw)) {
            continue
        }

        $line = $raw

        if ($line -match '^(?i)вопрос\s*(?:\d+)?\s*[:.\)]\s*(.+)$') {
            Add-QaIfReady -Items $items -Question ([ref]$question) -Options $options -PendingAnswer ([ref]$pendingAnswer) -Source $Source
            $question = $Matches[1].Trim()
            continue
        }

        if ($line -match '^(\d{1,4})[\.\)]\s+(.+\?)\s*$' -or
            ($line -match '^(\d{1,4})[\.\)]\s+(.{20,})$' -and $Matches[2] -notmatch '^(?i)(ответ|правильн)')) {
            $maybeQ = $Matches[2].Trim()
            Add-QaIfReady -Items $items -Question ([ref]$question) -Options $options -PendingAnswer ([ref]$pendingAnswer) -Source $Source
            $question = $maybeQ
            continue
        }

        if ($line -match '^(?i)(?:ответ|правильный\s*ответ|верно)\s*[:.\-–—]\s*(.+)$') {
            $pendingAnswer = $Matches[1].Trim()
            Add-QaIfReady -Items $items -Question ([ref]$question) -Options $options -PendingAnswer ([ref]$pendingAnswer) -Source $Source
            continue
        }

        if ($line -match '^(?i)([a-zа-яё\d]{1,2})[\.\)\-]\s+(.+)$') {
            if ($question) {
                $optLabel = $Matches[1]
                $optText = $Matches[2].Trim()
                $options.Add("$optLabel) $optText")
                continue
            }
        }

        if ($question -and -not $pendingAnswer -and $options.Count -eq 0) {
            if ($line -notmatch '^(?i)(вариант|выберите)') {
                $question = "$question $line"
            }
        }
    }

    Add-QaIfReady -Items $items -Question ([ref]$question) -Options $options -PendingAnswer ([ref]$pendingAnswer) -Source $Source

    if ($items.Count -eq 0) {
        $joined = ($lines -join "`n")
        $regex = [regex]'(?is)Вопрос\s*[:.\)]\s*(?<q>.+?)(?:\r?\n)+Ответ\s*[:.\-–—]\s*(?<a>.+?)(?=(?:\r?\n)+Вопрос\s*[:.\)]|\z)'
        foreach ($m in $regex.Matches($joined)) {
            $items.Add((New-QaItem -Question $m.Groups['q'].Value -Answer $m.Groups['a'].Value -Source $Source))
        }
    }

    return @($items)
}

function Import-AnswerBank {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Files,
        [Parameter(Mandatory = $true)]
        [string]$BaseDir
    )

    $bank = New-Object System.Collections.Generic.List[object]

    foreach ($rel in $Files) {
        $path = if ([System.IO.Path]::IsPathRooted($rel)) { $rel } else { Join-Path $BaseDir $rel }
        if (-not (Test-Path -LiteralPath $path)) {
            Write-Warning "Файл не найден: $path"
            continue
        }

        Write-Host "  Загрузка: $(Split-Path -Leaf $path) ..." -ForegroundColor DarkGray
        $text = Get-DocxPlainText -Path $path
        $parsed = Parse-QaBlocks -Text $text -Source (Split-Path -Leaf $path)
        foreach ($item in $parsed) {
            $bank.Add($item)
        }
        Write-Host "    найдено пар вопрос/ответ: $($parsed.Count)" -ForegroundColor DarkGray
    }

    return @($bank)
}
