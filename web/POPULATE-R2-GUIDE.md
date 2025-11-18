# Populating R2 with Unsplash Images

This guide explains how to automatically populate your R2 bucket with demo images from Unsplash.

## Prerequisites

1. **Unsplash Access Key**
   - Go to https://unsplash.com/developers
   - Create a new app (free tier allows 50 requests/hour)
   - Copy your Access Key

2. **Environment Variables**
   Add to your `.env.local`:
   ```env
   UNSPLASH_ACCESS_KEY=your-unsplash-access-key-here
   ```

3. **Database with Image Records**
   - The script requires existing image records in your database
   - If you haven't seeded the database yet, run the demo seed script first

## How It Works

The script will:
1. Query all content sets and images from your database
2. For each image:
   - Download a matching photo from Unsplash based on the set's theme
   - Upload the original to R2 at the correct path
   - Create and upload a watermarked version (for bronze tier users)
   - Create and upload a thumbnail (400px wide)

## Running the Script

### Initial Run

```bash
cd web
npm run populate-r2
```

### Resume After Rate Limit

If you hit Unsplash's rate limit (50 requests/hour on free tier), wait 1 hour and run:

```bash
npm run populate-r2:resume
```

The resume script intelligently:
- Checks which images already exist in R2
- Only downloads and uploads missing images
- Skips already-completed work
- Tracks progress with detailed statistics
- Stops gracefully if rate limit is hit again

You can run the resume script multiple times until all images are populated.

### Cleanup Empty Sets

If you want to remove sets that have no images in R2 (failed due to rate limits):

```bash
# Preview which sets would be deleted (dry run)
npm run cleanup-empty-sets

# Actually delete empty sets
npm run cleanup-empty-sets -- --execute
```

The cleanup script will:
- Scan all content sets and check R2 for actual images
- Categorize sets as: Complete, Partial, or Empty
- In execute mode, delete only completely empty sets
- Preserve partial sets (sets with at least one image)

**Note:** This deletes the database records for empty sets. It's safe to run and only affects sets with zero images in R2.

## What to Expect

```
🚀 Starting R2 population with Unsplash images

Using bucket: rhys-bucket
Unsplash API configured: ✅

Found 20 content sets to process

============================================================
📦 Processing Set: Mountain Peaks - Set 1
============================================================
Found 10 images to process

[1/10] Processing: mountain-peaks-set-1-001.jpg
  Search query: "mountain peak"
  Downloading from Unsplash: https://images.unsplash.com/...
    ✅ Uploaded to R2: demo/2025/11/mountain-peaks-set-1/abc-123.jpg
  Creating watermarked version...
    ✅ Uploaded to R2: demo/2025/11/mountain-peaks-set-1/watermarked_abc-123.jpg
  Creating thumbnail...
    ✅ Uploaded to R2: demo/2025/11/mountain-peaks-set-1/thumbnails/abc-123.jpg
  ✅ Completed: mountain-peaks-set-1-001.jpg
```

## Rate Limiting

- The script waits **1 second between images** to respect Unsplash's rate limits
- Waits **3 seconds between sets**
- Free tier: 50 requests/hour
- If you have many images, the script may take some time

## Customization

### Changing Search Keywords

Edit the `THEME_KEYWORDS` object in the script to customize what images are downloaded for each theme:

```typescript
const THEME_KEYWORDS: Record<string, string[]> = {
  'mountain-peaks': ['mountain peak', 'snowy mountain', 'alpine'],
  'sunset-series': ['sunset', 'sunrise', 'golden hour'],
  // Add your own themes here
}
```

### Processing Specific Sets

To process only specific sets, modify the query in the `main()` function:

```typescript
const { data: sets, error } = await supabase
  .from('content_sets')
  .select('*')
  .eq('slug', 'mountain-peaks-set-1') // Process only one set
  .order('created_at', { ascending: true })
```

## Troubleshooting

### "Unsplash API error: 401"
- Your `UNSPLASH_ACCESS_KEY` is invalid or not set
- Check your `.env.local` file

### "Unsplash API error: 403" (Rate Limit)
- You've exceeded your rate limit (50 requests/hour on free tier)
- **Solution:** Wait 1 hour, then run `npm run populate-r2:resume`
- The resume script will pick up where you left off
- You may need to run it 2-3 times if you have many sets (200+ images)

### Some Sets Worked, Some Didn't
- This is normal when hitting the rate limit
- Successfully uploaded images are safe in R2
- Run `npm run populate-r2:resume` after the rate limit resets
- The script will automatically skip images that already exist

### "No value provided for input HTTP label: Bucket"
- Your R2 credentials are not set correctly
- Verify `R2_BUCKET_NAME`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` in `.env.local`

### Images still not showing
- Clear your browser cache
- Check the dev console for any CORS errors
- Verify the images exist in R2 by checking your Cloudflare dashboard

## After Running

Once complete, restart your Next.js dev server:

```bash
npm run dev
```

Your gallery should now display actual images from Unsplash!

## Notes

- Images are high-quality (1920px+ wide typically)
- Watermarks are subtle and professional
- Thumbnails are optimized for fast loading
- All images comply with Unsplash's license (free to use)
