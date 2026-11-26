function Find-BestAnswers {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Query,
        [Parameter(Mandatory = $true)]
        [object[]]$Bank,
        [double]$MinScore = 0.55,
        [int]$MaxCandidates = 5
    )

    if ([string]::IsNullOrWhiteSpace($Query) -or $null -eq $Bank -or @($Bank).Count -eq 0) {
        return @()
    }

    $scored = foreach ($item in $Bank) {
        $score = Get-TextSimilarity -Query $Query -Candidate $item.Question
        if ($score -ge $MinScore) {
            [pscustomobject]@{
                Score    = [Math]::Round($score, 3)
                Question = $item.Question
                Answer   = $item.Answer
                Options  = $item.Options
                Source   = $item.Source
            }
        }
    }

    return @(
        $scored |
            Sort-Object -Property Score -Descending |
            Select-Object -First $MaxCandidates
    )
}

function Show-AnswerResult {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Query,
        [Alias("Matches")]
        [object[]]$Hits
    )

    Write-Host ""
    Write-Host ("=" * 72) -ForegroundColor DarkCyan
    Write-Host "Запрос:" -ForegroundColor Cyan
    Write-Host $Query
    Write-Host ("-" * 72) -ForegroundColor DarkCyan

    if ($null -eq $Hits -or @($Hits).Count -eq 0) {
        Write-Host "Совпадений не найдено. Скопируйте вопрос целиком и нажмите F8 ещё раз." -ForegroundColor Yellow
        Write-Host ("=" * 72) -ForegroundColor DarkCyan
        return
    }

    $best = $Hits[0]
    Write-Host ("Лучшее совпадение ({0:P0}):" -f $best.Score) -ForegroundColor Green
    Write-Host $best.Question
    Write-Host ""
    Write-Host "ОТВЕТ:" -ForegroundColor Green
    Write-Host $best.Answer -ForegroundColor White

    if ($best.Options -and $best.Options.Count -gt 0) {
        Write-Host ""
        Write-Host "Варианты из файла:" -ForegroundColor DarkGray
        foreach ($opt in $best.Options) {
            Write-Host "  $opt" -ForegroundColor DarkGray
        }
    }

    Write-Host ""
    Write-Host "Источник: $($best.Source)" -ForegroundColor DarkGray

    if ($Hits.Count -gt 1) {
        Write-Host ""
        Write-Host "Другие кандидаты:" -ForegroundColor DarkYellow
        for ($i = 1; $i -lt $Hits.Count; $i++) {
            $m = $Hits[$i]
            Write-Host ("  [{0:P0}] {1}" -f $m.Score, $m.Question)
            Write-Host ("         → {0}" -f $m.Answer) -ForegroundColor DarkYellow
        }
    }

    Write-Host ("=" * 72) -ForegroundColor DarkCyan

    try {
        Set-Clipboard -Value $best.Answer
        Write-Host "Правильный ответ скопирован в буфер обмена." -ForegroundColor Green
    }
    catch {
        Write-Warning "Не удалось записать ответ в буфер обмена."
    }
}
