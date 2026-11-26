#Requires -Version 5.1
# Быстрая проверка парсера на файлах answers/*.docx
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $Root "lib\Normalize-Text.ps1")
. (Join-Path $Root "lib\Parse-WordAnswers.ps1")
. (Join-Path $Root "lib\Find-Answer.ps1")

$config = Get-Content (Join-Path $Root "config.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$failed = 0

foreach ($topic in $config.topics) {
    Write-Host "`n=== $($topic.name) ===" -ForegroundColor Cyan
    $bank = Import-AnswerBank -Files @($topic.files) -BaseDir $Root
    if ($bank.Count -eq 0) {
        Write-Host "FAIL: пустая база" -ForegroundColor Red
        $failed++
        continue
    }

    $sample = $bank[0].Question
    $short = if ($sample.Length -gt 40) { $sample.Substring(0, 40) } else { $sample }
    $hits = Find-BestAnswers -Query $short -Bank $bank -MinScore 0.4 -MaxCandidates 3
    if ($hits.Count -eq 0) {
        Write-Host "FAIL: поиск по фрагменту не нашёл ответ" -ForegroundColor Red
        $failed++
    }
    else {
        Write-Host ("OK: {0} пар, топ-ответ: {1}" -f $bank.Count, $hits[0].Answer) -ForegroundColor Green
    }
}

if ($failed -gt 0) {
    Write-Host "`nЕсть ошибки: $failed" -ForegroundColor Red
    exit 1
}

Write-Host "`nВсе проверки прошли." -ForegroundColor Green
