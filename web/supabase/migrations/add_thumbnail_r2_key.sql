-- Add thumbnail_r2_key column to images table for pre-generated thumbnails
-- This optimizes thumbnail serving by avoiding on-the-fly Sharp processing

ALTER TABLE images
ADD COLUMN IF NOT EXISTS thumbnail_r2_key TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN images.thumbnail_r2_key IS 'R2 key for pre-generated thumbnail (400x600 JPEG). Falls back to on-the-fly generation if NULL.';

-- Create index for faster thumbnail lookups
CREATE INDEX IF NOT EXISTS idx_images_thumbnail_r2_key ON images(thumbnail_r2_key) WHERE thumbnail_r2_key IS NOT NULL;
