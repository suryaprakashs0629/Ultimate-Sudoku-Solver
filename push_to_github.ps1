# GitHub Push Helper Script

# Clear console
Clear-Host

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "     SUDOKU SOLVER GITHUB PUSH HELPER    " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if git is installed
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not detected on your system." -ForegroundColor Red
    Write-Host "To install Git, please run the following command in a new PowerShell window:" -ForegroundColor Yellow
    Write-Host "  winget install Git.Git" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or download and run the official installer from:" -ForegroundColor Yellow
    Write-Host "  https://git-scm.com/download/win" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit..."
    exit
}

# 2. Get GitHub Repository URL
$repoUrl = Read-Host "🔗 Enter your GitHub Repository URL (e.g., https://github.com/username/repo-name.git)"
if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "❌ Invalid URL. Exiting..." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit
}

Write-Host "`n🚀 Initializing Git repository..." -ForegroundColor Green
git init

# Create basic .gitignore to avoid pushing task logs
Write-Host "📝 Creating .gitignore..." -ForegroundColor Green
@"
.gemini/
*.log
"@ | Out-File -FilePath .gitignore -Encoding utf8

# Add all project files
Write-Host "📂 Adding files..." -ForegroundColor Green
git add index.html style.css app.js background.js assets/ walkthrough.md .gitignore

# Commit
Write-Host "💾 Committing files..." -ForegroundColor Green
git commit -m "feat: Integrate force field starfield background and DSA interactive dashboard"

# Rename branch to main
git branch -M main

# Link remote origin
Write-Host "🔗 Linking remote repository..." -ForegroundColor Green
git remote remove origin 2>$null
git remote add origin $repoUrl

# Push
Write-Host "`n📤 Pushing code to GitHub..." -ForegroundColor Green
Write-Host "⚠️  A browser window will pop up asking you to log in to GitHub to authorize the upload." -ForegroundColor Yellow
git push -u origin main

Write-Host "`n🎉 Success! Your code has been pushed to GitHub!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close..."
