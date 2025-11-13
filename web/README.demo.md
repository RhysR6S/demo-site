# Content Management Platform - Portfolio Demo

This is a **demonstration version** of a full-stack subscription content platform.

## ðŸŽ¯ Purpose

This demo showcases technical capabilities without revealing private content:
- All images are safe placeholder content from Unsplash
- Authentication is mocked (no real Patreon integration)
- Database is seeded with fictional users and data

## ðŸ› ï¸ Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript 5.8
- **Backend:** Next.js API Routes, Node.js 18+
- **Database:** PostgreSQL (Supabase), 25 normalized tables
- **Storage:** Cloudflare R2 / AWS S3
- **Cache:** Redis (Upstash)
- **Auth:** NextAuth.js with mock provider
- **Styling:** Tailwind CSS 3.4
- **Deployment:** Vercel

## ðŸš€ Quick Start (Windows)

### 1. Set up infrastructure

Create NEW accounts (don't use production):
- Supabase: https://supabase.com (free tier)
- Cloudflare R2: https://cloudflare.com/r2 (free tier)
- Upstash Redis: https://upstash.com (free tier)
- Unsplash API: https://unsplash.com/developers (free)

### 2. Configure environment

```powershell
Copy-Item .env.demo.example .env.local
# Edit .env.local with your NEW credentials
```

### 3. Install dependencies

```powershell
npm install
```

### 4. Set up database

```powershell
# Run the schema from demo-schema.sql in Supabase SQL editor
npm run db:migrate
```

### 5. Seed demo data

```powershell
npm run seed-demo
```

### 6. Run development server

```powershell
npm run dev
```

Visit http://localhost:3000

## ðŸ”‘ Demo Accounts

After seeding, use these accounts:

- **Bronze Tier:** bronze@demo.com / demo123
- **Gold Tier:** gold@demo.com / demo123
- **Admin:** admin@demo.com / demo123

## âœ¨ Features Demonstrated

- Subscription tier management (6 tiers)
- Image upload pipeline with optimization
- Watermarking system (3-tier fallback)
- Content organization and scheduling
- Commission request system
- Community features (channels + DMs)
- Analytics dashboard
- Rate limiting
- Forensic activity logging
- GDPR/CCPA compliance tools
- Admin panel

## ðŸ“ For Employers/Interviewers

This project demonstrates:
- Full-stack TypeScript development skills
- Complex database design (25 tables with relationships)
- OAuth integration patterns (mocked in demo)
- Image processing pipelines
- Real-time features
- Security best practices
- Scalable serverless architecture

The original project serves a real user base with production-grade features.
