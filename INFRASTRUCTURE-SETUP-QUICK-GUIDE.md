# Infrastructure Setup Quick Guide

## Overview
You need to create NEW accounts for all services - DO NOT use production credentials.

---

## 1. Supabase (PostgreSQL Database)

**Time:** ~5 minutes

1. Go to: https://dashboard.supabase.com
2. Click "New Project"
3. **Project Name:** `portfolio-demo` (NOT your real project name)
4. **Database Password:** Generate strong password (save it!)
5. **Region:** Choose different from production
6. Click "Create Project" (takes ~2 minutes)

**Get Credentials:**
- Click "Project Settings" → "API"
- Copy `URL` → This is `NEXT_PUBLIC_SUPABASE_URL`
- Copy `service_role` key → This is `SUPABASE_SERVICE_ROLE_KEY`

**Important:** Don't import production data! You'll seed with demo data later.

---

## 2. Cloudflare R2 (Image Storage)

**Time:** ~5 minutes

1. Go to: https://dash.cloudflare.com
2. Navigate to "R2"
3. Click "Create bucket"
4. **Name:** `demo-portfolio-public`
5. **Location:** Your region
6. Click "Create bucket"

**Get Credentials:**
1. Go to R2 → "Manage R2 API Tokens"
2. Click "Create API token"
3. **Token Name:** `portfolio-demo-access`
4. **Permissions:** Object Read & Write
5. **Bucket:** Select `demo-portfolio-public`
6. Click "Create API Token"

**Save these:**
- Account ID → `R2_ACCOUNT_ID`
- Access Key ID → `R2_ACCESS_KEY_ID`
- Secret Access Key → `R2_SECRET_ACCESS_KEY`
- Bucket Name → `R2_BUCKET_NAME` (demo-portfolio-public)

**Configure Public Access:**
1. Go to bucket settings
2. Enable "Public Access" or configure custom domain
3. Note the public URL format

---

## 3. Upstash Redis (Caching)

**Time:** ~3 minutes

1. Go to: https://console.upstash.com
2. Click "Create Database"
3. **Name:** `portfolio-demo`
4. **Type:** Regional
5. **Region:** Closest to you
6. Click "Create"

**Get Credentials:**
- Click on your database
- Go to "REST API" tab
- Copy `UPSTASH_REDIS_REST_URL`
- Copy `UPSTASH_REDIS_REST_TOKEN`

---

## 4. Unsplash API (Placeholder Images)

**Time:** ~3 minutes

1. Go to: https://unsplash.com/developers
2. Click "Register as a developer"
3. Create new application
4. **Application Name:** "Portfolio Demo"
5. **Description:** "Demo portfolio project"
6. Accept terms
7. Copy your "Access Key" → `UNSPLASH_ACCESS_KEY`

**Rate Limits:** Free tier = 50 requests/hour (sufficient for demo)

---

## 5. NextAuth Secret

**Generate locally:**

```powershell
# In PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Or use: https://generate-secret.vercel.app/32

Save as: `NEXTAUTH_SECRET`

---

## 6. Configure Environment Variables

**In your portfolio-demo directory:**

```powershell
cd C:\Users\dashg\portfolio-demo\web
Copy-Item .env.demo.example .env.local
notepad .env.local
```

**Fill in all values:**

```env
# Demo mode
NEXT_PUBLIC_DEMO_MODE=true

# Supabase (from step 1)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cloudflare R2 (from step 2)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=demo-portfolio-public

# NextAuth (from step 5)
NEXTAUTH_SECRET=your_generated_secret
NEXTAUTH_URL=http://localhost:3000

# Upstash Redis (from step 3)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Unsplash (from step 4)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

---

## 7. Verification Checklist

Before proceeding:

- [ ] All credentials saved in password manager
- [ ] .env.local file created and filled
- [ ] NO production credentials used
- [ ] Different email used for services (optional but recommended)
- [ ] All services use "demo" or "portfolio" in names

---

## Total Time: ~20 minutes

## Cost: $0 (all free tiers)

---

## Next Steps After Infrastructure Setup:

1. Install dependencies: `npm install`
2. Set up database schema in Supabase
3. Integrate demo auth provider
4. Seed demo data
5. Test locally: `npm run dev`
6. Deploy to Vercel

---

## Troubleshooting

### Supabase connection fails
- Check URL format: `https://YOUR_PROJECT.supabase.co`
- Verify service_role key (not anon key)
- Check project is not paused

### R2 upload fails
- Verify bucket name matches exactly
- Check API token has write permissions
- Ensure account ID is correct

### Redis connection fails
- Use REST URL (not Redis URL)
- Copy token exactly (no extra spaces)
- Check database is not paused

### Unsplash rate limit
- Free tier: 50 requests/hour
- Demo seeding uses ~20-30 requests
- Wait 1 hour if exceeded

---

## Security Notes

⚠️ **NEVER commit .env.local to git!**

The .gitignore should already exclude it, but verify:

```powershell
# Check .gitignore includes .env.local
Get-Content web\.gitignore | Select-String ".env"
```

---

## Ready to Continue?

Once all services are set up and .env.local is configured, you're ready to:
1. Set up the database schema
2. Install the demo authentication
3. Seed with demo data
4. Test locally

See `DEMO-SETUP-GUIDE.md` for detailed next steps.
