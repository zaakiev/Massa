#Requires -Version 5.1
<#
.SYNOPSIS
  Помощник поиска ответов по Word-документам для системы тестирования.

.DESCRIPTION
  1. Выбираете тему (Русский язык / АТО и ТК / Экспертиза).
  2. Скрипт загружает вопросы и ответы из .docx.
  3. В окне теста выделяете текст вопроса и копируете (Ctrl+C).
  4. Нажимаете F8 в консоли помощника — он находит ответ и копирует его в буфер.

.NOTES
  Положите свои Word-файлы в exam-assistant/answers/ и пропишите пути в config.json.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $Root "lib\Normalize-Text.ps1")
. (Join-Path $Root "lib\Parse-WordAnswers.ps1")
. (Join-Path $Root "lib\Find-Answer.ps1")

function Read-Config {
    $configPath = Join-Path $Root "config.json"
    if (-not (Test-Path -LiteralPath $configPath)) {
        throw "Не найден config.json: $configPath"
    }
    return (Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Select-Topic {
    param($Config)

    Write-Host ""
    Write-Host "Какую тему сдаём сегодня?" -ForegroundColor Cyan
    Write-Host ""

    for ($i = 0; $i -lt $Config.topics.Count; $i++) {
        $t = $Config.topics[$i]
        Write-Host ("  [{0}] {1}" -f ($i + 1), $t.name)
    }
    Write-Host "  [0] Выход"
    Write-Host ""

    while ($true) {
        $choice = Read-Host "Номер темы"
        if ($choice -eq "0") {
            return $null
        }
        $num = 0
        if ([int]::TryParse($choice, [ref]$num) -and $num -ge 1 -and $num -le $Config.topics.Count) {
            return $Config.topics[$num - 1]
        }
        Write-Host "Введите номер из списка." -ForegroundColor Yellow
    }
}

function Test-IsF8Pressed {
    # Virtual-Key F8 = 0x77
    Add-Type -Namespace ExamAssistant -Name Native -MemberDefinition @"
        [System.Runtime.InteropServices.DllImport("user32.dll")]
        public static extern short GetAsyncKeyState(int vKey);
"@ -ErrorAction SilentlyContinue

    $state = [ExamAssistant.Native]::GetAsyncKeyState(0x77)
    return ($state -band 0x8000) -ne 0
}

function Start-LookupLoop {
    param(
        [object[]]$Bank,
        [double]$MinScore,
        [int]$MaxCandidates
    )

    Write-Host ""
    Write-Host "Готово. База: $($Bank.Count) вопросов." -ForegroundColor Green
    Write-Host ""
    Write-Host "Как пользоваться:" -ForegroundColor Cyan
    Write-Host "  1. В системе тестирования выделите текст вопроса"
    Write-Host "  2. Скопируйте его (Ctrl+C)"
    Write-Host "  3. Вернитесь сюда и нажмите F8 — поиск ответа"
    Write-Host "  4. Или вставьте вопрос вручную и нажмите Enter"
    Write-Host "  5. Q + Enter — смена темы / выход"
    Write-Host ""

    $lastClipboard = $null
    try { $lastClipboard = Get-Clipboard -Raw -ErrorAction SilentlyContinue } catch { }

    $f8WasDown = $false

    while ($true) {
        # Non-blocking F8 when console has focus
        $f8Down = $false
        try { $f8Down = Test-IsF8Pressed } catch { }

        if ($f8Down -and -not $f8WasDown) {
            Start-Sleep -Milliseconds 120
            $clip = $null
            try { $clip = Get-Clipboard -Raw -ErrorAction Stop } catch { }
            if ($clip -and $clip.Trim().Length -gt 5) {
                $hits = Find-BestAnswers -Query $clip.Trim() -Bank $Bank -MinScore $MinScore -MaxCandidates $MaxCandidates
                Show-AnswerResult -Query $clip.Trim() -Hits $hits
                $lastClipboard = $clip
            }
            else {
                Write-Host "Буфер пуст. Сначала скопируйте вопрос (Ctrl+C)." -ForegroundColor Yellow
            }
        }
        $f8WasDown = $f8Down

        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)

            if ($key.Key -eq [ConsoleKey]::F8) {
                $clip = $null
                try { $clip = Get-Clipboard -Raw -ErrorAction Stop } catch { }
                if ($clip -and $clip.Trim().Length -gt 5) {
                    $hits = Find-BestAnswers -Query $clip.Trim() -Bank $Bank -MinScore $MinScore -MaxCandidates $MaxCandidates
                    Show-AnswerResult -Query $clip.Trim() -Hits $hits
                    $lastClipboard = $clip
                }
                else {
                    Write-Host "Буфер пуст. Сначала скопируйте вопрос (Ctrl+C)." -ForegroundColor Yellow
                }
                continue
            }

            if ($key.Key -eq [ConsoleKey]::Q -and -not $key.Modifiers) {
                Write-Host ""
                return
            }

            # Manual paste mode: start collecting a line
            if ($key.Key -eq [ConsoleKey]::Enter) {
                Write-Host ""
                $typed = Read-Host "Вставьте вопрос и нажмите Enter (или пусто = из буфера)"
                $query = if ([string]::IsNullOrWhiteSpace($typed)) {
                    try { (Get-Clipboard -Raw) } catch { "" }
                }
                else {
                    $typed
                }

                if ([string]::IsNullOrWhiteSpace($query)) {
                    Write-Host "Пустой запрос." -ForegroundColor Yellow
                    continue
                }

                $hits = Find-BestAnswers -Query $query.Trim() -Bank $Bank -MinScore $MinScore -MaxCandidates $MaxCandidates
                Show-AnswerResult -Query $query.Trim() -Hits $hits
                continue
            }

            # Any other printable key → prompt for full question
            if ($key.KeyChar -and [char]::IsLetterOrDigit($key.KeyChar)) {
                Write-Host ""
                $rest = Read-Host ("Вопрос (начало: {0})" -f $key.KeyChar)
                $query = "$($key.KeyChar)$rest"
                $hits = Find-BestAnswers -Query $query.Trim() -Bank $Bank -MinScore $MinScore -MaxCandidates $MaxCandidates
                Show-AnswerResult -Query $query.Trim() -Hits $hits
            }
        }

        Start-Sleep -Milliseconds 50
    }
}

function Main {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8

    Write-Host ""
    Write-Host "════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host "  Помощник ответов · система тестирования" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════" -ForegroundColor DarkCyan

    $config = Read-Config

    while ($true) {
        $topic = Select-Topic -Config $config
        if (-not $topic) {
            Write-Host "Выход." -ForegroundColor DarkGray
            return
        }

        Write-Host ""
        Write-Host "Тема: $($topic.name)" -ForegroundColor Green
        $bank = Import-AnswerBank -Files @($topic.files) -BaseDir $Root

        if ($null -eq $bank -or @($bank).Count -eq 0) {
            Write-Host ""
            Write-Host "Не удалось загрузить ни одного вопроса/ответа." -ForegroundColor Red
            Write-Host "Проверьте файлы в answers/ и формат (см. README.md)." -ForegroundColor Yellow
            Write-Host ""
            continue
        }

        $minScore = 0.55
        $maxCand = 5
        if ($config.match) {
            if ($null -ne $config.match.minScore) { $minScore = [double]$config.match.minScore }
            if ($null -ne $config.match.maxCandidates) { $maxCand = [int]$config.match.maxCandidates }
        }

        Start-LookupLoop -Bank $bank -MinScore $minScore -MaxCandidates $maxCand
    }
}

Main
