# ============================================
# COMPLETE DEMO SETUP SCRIPT
# ============================================
# Run this in your portfolio-demo directory
# ============================================

$ErrorActionPreference = "Stop"

Write-Host "Completing demo setup..." -ForegroundColor Cyan
Write-Host ""

# Check we're in the right directory
if (-not (Test-Path "web")) {
    Write-Host "ERROR: Please run this from the portfolio-demo directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# ============================================
# Step 1: Initialize Git Repository
# ============================================
Write-Host "Step 1: Initializing git repository..." -ForegroundColor Green

if (-not (Test-Path ".git")) {
    git init
    Write-Host "  Git repository initialized" -ForegroundColor Gray
} else {
    Write-Host "  Git repository already exists" -ForegroundColor Gray
}

# ============================================
# Step 2: Create Anonymization Checklist
# ============================================
Write-Host "Step 2: Creating anonymization checklist..." -ForegroundColor Green

@"
# Anonymization Checklist

Before making this repository public, verify:

## Web Application

- [ ] Search for any personal email addresses
- [ ] Search for production URLs
- [ ] Search for Patreon username
- [ ] Check for real R2 bucket URLs
- [ ] Verify no real API keys in code
- [ ] Check package.json author/repository fields
- [ ] Remove any real user data from seed scripts

## Git History

- [ ] Verify this is a NEW repo (not forked): ``git remote -v`` (should be empty)
- [ ] Check first commit message has no identifying info: ``git log --all``
- [ ] Ensure no branches from old repo: ``git branch -a``

## Infrastructure

- [ ] Create NEW Supabase project (not production)
- [ ] Create NEW R2 bucket (separate account if possible)
- [ ] Create NEW Upstash Redis (separate)
- [ ] Use DIFFERENT email for Vercel deployment

## Final Scan

Run these PowerShell commands:

``````powershell
# Search for TODO/FIXME comments
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.py | Select-String -Pattern "TODO|FIXME|XXX"

# Find .env files (should only be .example files)
Get-ChildItem -Recurse -Filter ".env*" | Where-Object { `$_.Name -notlike "*.example" }

# Search for production R2 domain
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js | Select-String -Pattern "pub-e6837020c2914a68818d29940768ace8"

# Review all README files
Get-ChildItem -Recurse -Filter "README*" | ForEach-Object { Get-Content `$_.FullName }
``````

## Before First Push

- [ ] Review all changes carefully
- [ ] Ensure GitHub username is professional
- [ ] Double-check no production credentials

## Ready to Deploy

- [ ] Push to NEW GitHub repository
- [ ] Deploy to Vercel
- [ ] Test with demo accounts
- [ ] Take screenshots for portfolio
- [ ] Update README with live demo URL
"@ | Out-File -FilePath "ANONYMIZATION_CHECKLIST.md" -Encoding UTF8

Write-Host "  Created ANONYMIZATION_CHECKLIST.md" -ForegroundColor Gray

# ============================================
# Step 3: Verify Anonymization
# ============================================
Write-Host ""
Write-Host "Step 3: Verifying anonymization..." -ForegroundColor Green
Write-Host ""

$issues = @()

# Check for production R2 domain
Write-Host "  Checking for production R2 domain..." -ForegroundColor Yellow
$r2Matches = Get-ChildItem -Path "web" -Recurse -Include *.ts,*.tsx,*.js,*.jsx | Select-String -Pattern "pub-e6837020c2914a68818d29940768ace8" -List

if ($r2Matches) {
    $issues += "Found production R2 domain in files:"
    foreach ($match in $r2Matches) {
        $issues += "  - $($match.Path)"
    }
}

# Check for .env files (should only be .example)
Write-Host "  Checking for .env files..." -ForegroundColor Yellow
$envFiles = Get-ChildItem -Path "web" -Recurse -Filter ".env*" | Where-Object { $_.Name -notlike "*.example" -and $_.Name -ne ".env.demo.example" }

if ($envFiles) {
    $issues += "Found .env files (should only be .example files):"
    foreach ($file in $envFiles) {
        $issues += "  - $($file.FullName)"
    }
}

# Check package.json
Write-Host "  Checking package.json..." -ForegroundColor Yellow
if (Test-Path "web\package.json") {
    $packageJson = Get-Content "web\package.json" -Raw
    if ($packageJson -match '"author":\s*"[^"]+"') {
        $issues += "Found author field in package.json - may need to update"
    }
    if ($packageJson -match '"repository":\s*{') {
        $issues += "Found repository field in package.json - may need to update"
    }
}

# ============================================
# Step 4: Report Results
# ============================================
Write-Host ""
if ($issues.Count -eq 0) {
    Write-Host "SUCCESS: No anonymization issues found!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Review ANONYMIZATION_CHECKLIST.md"
    Write-Host "  2. Run: git add ."
    Write-Host "  3. Run: git commit -m `"Initial commit: Portfolio demo platform`""
    Write-Host "  4. Set up NEW infrastructure (Supabase, R2, Redis)"
    Write-Host "  5. Configure .env.local"
    Write-Host "  6. Install dependencies: cd web && npm install"
} else {
    Write-Host "WARNING: Found potential anonymization issues:" -ForegroundColor Red
    Write-Host ""
    foreach ($issue in $issues) {
        Write-Host $issue -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Please fix these issues before proceeding!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Setup script completed." -ForegroundColor Cyan
