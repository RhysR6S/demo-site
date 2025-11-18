# Quick Setup Guide - PhotoVault Demo

## ✅ Current Status

Your codebase is now fully rebranded to PhotoVault and the R2 signed URL bug is fixed!

### What's Working
- ✅ Rebranded from KamiContent → PhotoVault
- ✅ R2 environment variables properly configured
- ✅ Signed URL generation fixed
- ✅ Database has demo content sets and image records

### What's Missing
- ❌ Actual images in your R2 bucket

## 🚀 Next Steps to Make It Work

### 1. Get an Unsplash Access Key (Free)

1. Go to https://unsplash.com/developers
2. Sign up (free)
3. Create a new app
4. Copy your **Access Key**

### 2. Add to `.env.local`

```env
# Add this line:
UNSPLASH_ACCESS_KEY=your-unsplash-access-key-here
```

### 3. Run the Population Script

```bash
cd C:\Users\dashg\portfolio-demo\web
npm run populate-r2
```

This will:
- Download beautiful stock photos from Unsplash
- Upload them to your R2 bucket
- Create watermarked versions
- Generate thumbnails
- Match images to your existing database records

**Time estimate:** 5-10 minutes for all sets (with rate limiting)

### 4. Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### 5. View Your Gallery

Navigate to: http://localhost:3000

Images should now load properly! 🎉

## 📊 What You'll Get

- **~200 high-quality stock photos** organized into themed sets
- **Mountain landscapes** for "Mountain Peaks" sets
- **Sunsets and golden hour** for "Sunset Series"
- **Ocean and coastal views** for "Ocean Views"
- **Modern architecture** for "Urban" sets
- And more!

All images:
- Professional quality (1920px+ wide)
- Free to use (Unsplash license)
- Properly watermarked for bronze tier demo
- Optimized thumbnails for fast loading

## 🔧 Troubleshooting

### "Failed to load image" errors still appear
1. Make sure you ran `npm run populate-r2` successfully
2. Check your Cloudflare R2 dashboard to verify images were uploaded
3. Clear browser cache and hard reload (Ctrl+Shift+R)

### "Unsplash API error: 403"
- Free tier limit: 50 requests/hour
- Wait an hour or upgrade to Unsplash Plus

### Images are wrong/random
- Unsplash returns random images matching keywords
- Run the script again for different images
- Customize keywords in `scripts/populate-r2-with-images.ts`

## 📝 Notes

- The script is idempotent - safe to run multiple times
- Images will be replaced if you run it again
- Each image gets 3 versions: original, watermarked, thumbnail
- Bronze tier users see watermarked versions
- Silver+ tiers see pristine originals

## 🎨 Customization

Want different themes? Edit the keywords in the script:

```typescript
// web/scripts/populate-r2-with-images.ts

const THEME_KEYWORDS = {
  'mountain-peaks': ['mountain peak', 'snowy mountain', 'alpine'],
  'sunset-series': ['sunset', 'sunrise', 'golden hour'],
  // Add your own!
}
```

Then run `npm run populate-r2` again.

---

Need help? Check `POPULATE-R2-GUIDE.md` for detailed documentation.
