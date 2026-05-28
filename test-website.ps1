# test-website.ps1
# Tests the local Linguistic Agents static website before committing/pushing to GitHub.
# Run from: D:\code\websites\linguisticagents

param(
    [string]$SiteRoot = "D:\code\websites\linguisticagents"
)

$ErrorCount = 0
$WarningCount = 0

function Write-Ok {
    param([string]$Message)
    Write-Host "OK      $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    $script:WarningCount++
    Write-Host "WARNING $Message" -ForegroundColor Yellow
}

function Write-Fail {
    param([string]$Message)
    $script:ErrorCount++
    Write-Host "FAIL    $Message" -ForegroundColor Red
}

function Test-RequiredFile {
    param([string]$RelativePath)

    $Path = Join-Path $SiteRoot $RelativePath

    if (-not (Test-Path $Path)) {
        Write-Fail "Missing file: $RelativePath"
        return
    }

    $Item = Get-Item $Path

    if ($Item.Length -eq 0) {
        Write-Fail "Empty file: $RelativePath"
        return
    }

    Write-Ok "Found file: $RelativePath"
}

function Get-HtmlFiles {
    return Get-ChildItem -Path $SiteRoot -Recurse -File -Filter "*.html"
}

function Test-NoTemplateTokens {
    $Files = Get-HtmlFiles

    foreach ($File in $Files) {
        $Text = Get-Content $File.FullName -Raw

        if ($Text -match "\{\{[A-Z_]+\}\}") {
            Write-Fail "Unresolved template token in: $($File.FullName)"
        }
    }

    Write-Ok "Checked unresolved template tokens"
}

function Test-HomeOldClassesGone {
    $HomePath = Join-Path $SiteRoot "index.html"

    if (-not (Test-Path $HomePath)) {
        Write-Fail "Cannot test home page because index.html is missing"
        return
    }

    $Text = Get-Content $HomePath -Raw

    $OldPatterns = @(
        "home-v2",
        "home-v3",
        "home-hero-v3",
        "home-map",
        "Public field map"
    )

    foreach ($Pattern in $OldPatterns) {
        if ($Text -match [regex]::Escape($Pattern)) {
            Write-Fail "Old homepage pattern still present in index.html: $Pattern"
        }
    }

    Write-Ok "Checked old homepage patterns"
}

function Test-InternalLinks {
    $HtmlFiles = Get-HtmlFiles

    foreach ($File in $HtmlFiles) {
        $Text = Get-Content $File.FullName -Raw
        $Matches = [regex]::Matches($Text, 'href="([^"]+)"')

        foreach ($Match in $Matches) {
            $Href = $Match.Groups[1].Value

            if ($Href.StartsWith("#")) {
                continue
            }

            if ($Href.StartsWith("http://") -or
                $Href.StartsWith("https://") -or
                $Href.StartsWith("mailto:") -or
                $Href.StartsWith("tel:")) {

                if ($Href.StartsWith("https://linguisticagents.com")) {
                    Write-Warn "Internal link is absolute instead of relative in $($File.Name): $Href"
                }

                continue
            }

            $CleanHref = $Href.Split("#")[0]

            if ([string]::IsNullOrWhiteSpace($CleanHref)) {
                continue
            }

            $BaseFolder = Split-Path $File.FullName -Parent
            $TargetPath = Join-Path $BaseFolder $CleanHref

            if ($CleanHref.EndsWith("/")) {
                $TargetPath = Join-Path $TargetPath "index.html"
            }

            $ResolvedTarget = [System.IO.Path]::GetFullPath($TargetPath)

            if (-not (Test-Path $ResolvedTarget)) {
                Write-Fail "Broken local link in $($File.FullName): $Href"
            }
        }
    }

    Write-Ok "Checked local internal links"
}

function Test-CssFiles {
    $CssFiles = Get-ChildItem -Path (Join-Path $SiteRoot "assets\css") -Recurse -File -Filter "*.css"

    if ($CssFiles.Count -eq 0) {
        Write-Fail "No CSS files found under assets\css"
        return
    }

    foreach ($File in $CssFiles) {
        if ($File.Length -eq 0) {
            Write-Fail "Empty CSS file: $($File.FullName)"
        }
    }

    Write-Ok "Checked CSS files are present and non-empty"
}

function Test-ExpectedCssPolicy {
    $TokensPath = Join-Path $SiteRoot "assets\css\tokens.css"

    if (-not (Test-Path $TokensPath)) {
        Write-Fail "Missing tokens.css"
        return
    }

    $Tokens = Get-Content $TokensPath -Raw

    if ($Tokens -notmatch "#f9f9f9") {
        Write-Fail "tokens.css does not define #f9f9f9 almost-white"
    }
    else {
        Write-Ok "tokens.css contains #f9f9f9"
    }

    if ($Tokens -notmatch "#dddddd" -or $Tokens -notmatch "#9a9a9a" -or $Tokens -notmatch "#484848") {
        Write-Fail "tokens.css is missing one of the primary gray colors: #dddddd, #999999, #484848"
    }
    else {
        Write-Ok "tokens.css contains primary gray system"
    }
}

function Test-NoLocalBuildPathsLeaked {
    $Files = Get-ChildItem -Path $SiteRoot -Recurse -File -Include "*.html","*.css","*.js"

    foreach ($File in $Files) {
        $Text = Get-Content $File.FullName -Raw

        if ($Text -match "D:\\codex" -or $Text -match "D:\\code") {
            Write-Fail "Local Windows path leaked into file: $($File.FullName)"
        }
    }

    Write-Ok "Checked no local Windows paths leaked"
}

function Test-GitRepo {
    $GitPath = Join-Path $SiteRoot ".git"

    if (-not (Test-Path $GitPath)) {
        Write-Fail "SiteRoot is not a Git repo: $SiteRoot"
        return
    }

    Write-Ok "SiteRoot is a Git repo"
}

Write-Host ""
Write-Host "Testing website folder:"
Write-Host $SiteRoot
Write-Host ""

if (-not (Test-Path $SiteRoot)) {
    Write-Fail "Site root does not exist: $SiteRoot"
}
else {
    Test-GitRepo

    Test-RequiredFile "index.html"
    Test-RequiredFile "superintelligence-leaderboard.html"
    Test-RequiredFile "events\index.html"
    Test-RequiredFile "assets\css\tokens.css"
    Test-RequiredFile "assets\css\base.css"
    Test-RequiredFile "assets\css\components.css"
    Test-RequiredFile "assets\css\pages\home.css"
    Test-RequiredFile "assets\css\pages\leaderboard.css"
    Test-RequiredFile "assets\js\site.js"

    Test-CssFiles
    Test-ExpectedCssPolicy
    Test-NoTemplateTokens
    Test-HomeOldClassesGone
    Test-NoLocalBuildPathsLeaked
    Test-InternalLinks
}

Write-Host ""
Write-Host "Test summary:"
Write-Host "Errors:   $ErrorCount"
Write-Host "Warnings: $WarningCount"

if ($ErrorCount -gt 0) {
    Write-Host ""
    Write-Host "Website test FAILED. Do not push yet." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Website test PASSED." -ForegroundColor Green
exit 0