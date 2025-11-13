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

- [ ] Verify this is a NEW repo (not forked): `git remote -v` (should be empty)
- [ ] Check first commit message has no identifying info: `git log --all`
- [ ] Ensure no branches from old repo: `git branch -a`

## Infrastructure

- [ ] Create NEW Supabase project (not production)
- [ ] Create NEW R2 bucket (separate account if possible)
- [ ] Create NEW Upstash Redis (separate)
- [ ] Use DIFFERENT email for Vercel deployment

## Final Scan

Run these PowerShell commands:

```powershell
# Search for TODO/FIXME comments
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.py | Select-String -Pattern "TODO|FIXME|XXX"

# Find .env files (should only be .example files)
Get-ChildItem -Recurse -Filter ".env*" | Where-Object { $_.Name -notlike "*.example" }

# Search for production R2 domain
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js | Select-String -Pattern "pub-e6837020c2914a68818d29940768ace8"

# Review all README files
Get-ChildItem -Recurse -Filter "README*" | ForEach-Object { Get-Content $_.FullName }
```

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
