# ============================================
# FIX DEMO IDENTIFIERS
# ============================================
# Replaces all identifying information with demo placeholders
# ============================================

$ErrorActionPreference = "Stop"

Write-Host "Fixing identifying information in demo..." -ForegroundColor Cyan
Write-Host ""

# Navigate to web directory
if (-not (Test-Path "web")) {
    Write-Host "ERROR: Please run this from the portfolio-demo directory" -ForegroundColor Red
    exit 1
}

cd web

# ============================================
# Replace KamiXXX with DemoCreator
# ============================================
Write-Host "Replacing creator username..." -ForegroundColor Green

$filesToUpdate = Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js | Where-Object {
    $content = Get-Content $_.FullName -Raw
    $content -match "KamiXXX"
}

$count = 0
foreach ($file in $filesToUpdate) {
    Write-Host "  Updating: $($file.FullName.Replace($PWD, '.'))" -ForegroundColor Gray

    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace 'KamiXXX', 'DemoCreator'

    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        $count++
    }
}

Write-Host "  Updated $count files" -ForegroundColor Gray
Write-Host ""

# ============================================
# Replace default Next.js README with demo README
# ============================================
Write-Host "Fixing README..." -ForegroundColor Green

if (Test-Path "README.md") {
    Remove-Item "README.md"
    Write-Host "  Removed default Next.js README.md" -ForegroundColor Gray
}

if (Test-Path "README.demo.md") {
    Copy-Item "README.demo.md" "README.md"
    Write-Host "  Copied README.demo.md to README.md" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# Update package.json
# ============================================
Write-Host "Updating package.json..." -ForegroundColor Green

if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json

    # Remove author if it exists
    if ($packageJson.PSObject.Properties['author']) {
        $packageJson.PSObject.Properties.Remove('author')
        Write-Host "  Removed author field" -ForegroundColor Gray
    }

    # Remove repository if it exists
    if ($packageJson.PSObject.Properties['repository']) {
        $packageJson.PSObject.Properties.Remove('repository')
        Write-Host "  Removed repository field" -ForegroundColor Gray
    }

    # Update name
    $packageJson.name = "portfolio-demo"
    Write-Host "  Set name to 'portfolio-demo'" -ForegroundColor Gray

    # Update description
    $packageJson.description = "Full-stack content management platform demonstration"
    Write-Host "  Updated description" -ForegroundColor Gray

    # Save
    $packageJson | ConvertTo-Json -Depth 100 | Set-Content "package.json"
}

Write-Host ""

# ============================================
# Verify changes
# ============================================
Write-Host "Verifying fixes..." -ForegroundColor Green

$remainingIssues = @()

# Check for KamiXXX
$kamiMatches = Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.json | Select-String -Pattern "KamiXXX" -List

if ($kamiMatches) {
    $remainingIssues += "Still found 'KamiXXX' in:"
    foreach ($match in $kamiMatches) {
        $remainingIssues += "  - $($match.Path)"
    }
}

# Check README
if (-not (Test-Path "README.md")) {
    $remainingIssues += "README.md is missing"
}

Write-Host ""

if ($remainingIssues.Count -eq 0) {
    Write-Host "SUCCESS: All identifiers fixed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Review the changes: git status" -ForegroundColor White
    Write-Host "  2. Add changes: git add ." -ForegroundColor White
    Write-Host "  3. Commit: git commit -m 'Replace identifying information with demo placeholders'" -ForegroundColor White
    Write-Host "  4. Proceed to infrastructure setup" -ForegroundColor White
} else {
    Write-Host "WARNING: Some issues remain:" -ForegroundColor Yellow
    Write-Host ""
    foreach ($issue in $remainingIssues) {
        Write-Host $issue -ForegroundColor Yellow
    }
}

Write-Host ""
cd ..
