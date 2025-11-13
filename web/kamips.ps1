# PowerShell script to clean up debug files
# Run this from your project root: C:\Users\dashg\OneDrive\Desktop\patreon-content-site

Write-Host "Cleaning up debug files and folders..." -ForegroundColor Yellow

# Remove debug API routes
Remove-Item -Path "src\app\api\auth\debug-patreon" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src\app\api\auth\test" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src\app\api\patreon-test" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src\app\api\verify-creator" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src\app\api\creator-stats" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src\app\api\campaign-details" -Recurse -Force -ErrorAction SilentlyContinue

# Remove debug pages
Remove-Item -Path "src\app\debug" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src\app\debug-patreon" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src\app\creator-dashboard" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src\app\campaign-verify" -Recurse -Force -ErrorAction SilentlyContinue

# Remove any test route files
Remove-Item -Path "src\app\test" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✓ Debug files cleaned up!" -ForegroundColor Green
Write-Host ""
Write-Host "Remaining structure:" -ForegroundColor Cyan
Get-ChildItem -Path "src\app" -Directory | Select-Object Name