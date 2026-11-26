function Normalize-Text {
    param(
        [Parameter(Mandatory = $true, AllowEmptyString = $true)]
        [string]$Text
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return ""
    }

    $t = $Text.ToLowerInvariant()
    $t = $t -replace "ё", "е"
    $t = $t -replace "[\u00A0\u2000-\u200B\u202F\u205F\u3000]", " "
    $t = $t -replace "[«»""„“”‘’`´]", "'"
    $t = $t -replace "[^\p{L}\p{Nd}\s]+", " "
    $t = $t -replace "\s+", " "
    return $t.Trim()
}

function Get-TokenSet {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text
    )

    $norm = Normalize-Text $Text
    if (-not $norm) {
        return [string[]]@()
    }

    return @(
        $norm -split " " |
            Where-Object { $_.Length -ge 2 }
    )
}

function Get-TextSimilarity {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Query,
        [Parameter(Mandatory = $true)]
        [string]$Candidate
    )

    $qTokens = Get-TokenSet $Query
    $cTokens = Get-TokenSet $Candidate

    if ($qTokens.Count -eq 0 -or $cTokens.Count -eq 0) {
        return 0.0
    }

    $qSet = [System.Collections.Generic.HashSet[string]]::new([string[]]$qTokens)
    $cSet = [System.Collections.Generic.HashSet[string]]::new([string[]]$cTokens)

    $intersection = 0
    foreach ($token in $qSet) {
        if ($cSet.Contains($token)) {
            $intersection++
        }
    }

    if ($intersection -eq 0) {
        return 0.0
    }

    $union = $qSet.Count + $cSet.Count - $intersection
    $jaccard = [double]$intersection / [double]$union

    # Bonus when query is largely contained in candidate (or vice versa)
    $containment = [double]$intersection / [double][Math]::Min($qSet.Count, $cSet.Count)
    $score = (0.55 * $jaccard) + (0.45 * $containment)

    $qNorm = Normalize-Text $Query
    $cNorm = Normalize-Text $Candidate
    if ($cNorm.Contains($qNorm) -or $qNorm.Contains($cNorm)) {
        $score = [Math]::Max($score, 0.92)
    }

    return [Math]::Min(1.0, $score)
}
