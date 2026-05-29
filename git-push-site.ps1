# git-push-site.ps1
# Shows status, stages all changes, asks for a commit message, commits, and pushes.

$RepoRoot = "D:\code\websites\linguisticagents"

Set-Location $RepoRoot

Write-Host ""
Write-Host "Git status before add:" -ForegroundColor Cyan
git status

Write-Host ""
$Message = Read-Host "Enter commit message"

if ([string]::IsNullOrWhiteSpace($Message)) {
    Write-Host ""
    Write-Host "Commit message cannot be empty. Stopping." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Adding all changes..." -ForegroundColor Cyan
git add -A

Write-Host ""
Write-Host "Git status after add:" -ForegroundColor Cyan
git status

git diff --cached --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "No changes to commit." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Committing..." -ForegroundColor Cyan
git commit -m $Message

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Commit failed. Push skipped." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Pushing..." -ForegroundColor Cyan
git push

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Push failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
git status

