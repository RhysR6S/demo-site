/**
 * Demo Data Seeding Script
 *
 * This script populates the demo database with safe, fictional data
 * Uses Unsplash API for placeholder images
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// ============================================
// Configuration
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ============================================
// Demo Users (6 tiers + admin)
// ============================================

const DEMO_USERS = [
  {
    id: 'demo_bronze_001',
    email: 'bronze@demo.com',
    name: 'Bronze Demo User',
    membership_tier: 'bronze',
    is_active_patron: true,
    free_commissions_remaining: 0,
  },
  {
    id: 'demo_silver_001',
    email: 'silver@demo.com',
    name: 'Silver Demo User',
    membership_tier: 'silver',
    is_active_patron: true,
    free_commissions_remaining: 0,
  },
  {
    id: 'demo_gold_001',
    email: 'gold@demo.com',
    name: 'Gold Demo User',
    membership_tier: 'gold',
    is_active_patron: true,
    free_commissions_remaining: 1,
  },
  {
    id: 'demo_diamond_001',
    email: 'diamond@demo.com',
    name: 'Diamond Demo User',
    membership_tier: 'diamond',
    is_active_patron: true,
    free_commissions_remaining: 2,
  },
  {
    id: 'demo_platinum_001',
    email: 'platinum@demo.com',
    name: 'Platinum Demo User',
    membership_tier: 'platinum',
    is_active_patron: true,
    free_commissions_remaining: 3,
  },
  {
    id: 'demo_creator_001',
    email: 'admin@demo.com',
    name: 'Demo Creator',
    membership_tier: 'creator',
    is_creator: true,
    is_active_patron: true,
  },
]

// ============================================
// Demo Content Categories (Safe Themes)
// ============================================

const CONTENT_THEMES = {
  nature: {
    collections: ['3330448', '3356584', '1459961'], // Nature, Landscapes, Wildlife
    tags: ['nature', 'landscape', 'wildlife', 'scenic', 'outdoors'],
  },
  architecture: {
    collections: ['3348849', '1172564'], // Architecture, Buildings
    tags: ['architecture', 'building', 'urban', 'city', 'structure'],
  },
  abstract: {
    collections: ['3356584', '9977527'], // Abstract, Patterns
    tags: ['abstract', 'pattern', 'geometric', 'colorful', 'modern'],
  },
  travel: {
    collections: ['1162990', '1191376'], // Travel, Destinations
    tags: ['travel', 'destination', 'culture', 'landmark', 'explore'],
  },
}

// ============================================
// Demo Series & Characters
// ============================================

const DEMO_SERIES = [
  { name: 'Nature Photography', slug: 'nature-photography' },
  { name: 'Urban Architecture', slug: 'urban-architecture' },
  { name: 'Abstract Art', slug: 'abstract-art' },
  { name: 'Travel Destinations', slug: 'travel-destinations' },
]

const DEMO_CHARACTERS = [
  { name: 'Sunset Series', series_slug: 'nature-photography', slug: 'sunset-series' },
  { name: 'Mountain Peaks', series_slug: 'nature-photography', slug: 'mountain-peaks' },
  { name: 'Ocean Views', series_slug: 'nature-photography', slug: 'ocean-views' },
  { name: 'Modern Buildings', series_slug: 'urban-architecture', slug: 'modern-buildings' },
  { name: 'Historic Landmarks', series_slug: 'urban-architecture', slug: 'historic-landmarks' },
  { name: 'Street Photography', series_slug: 'urban-architecture', slug: 'street-photography' },
  { name: 'Geometric Patterns', series_slug: 'abstract-art', slug: 'geometric-patterns' },
  { name: 'Color Studies', series_slug: 'abstract-art', slug: 'color-studies' },
  { name: 'Asian Destinations', series_slug: 'travel-destinations', slug: 'asian-destinations' },
  { name: 'European Cities', series_slug: 'travel-destinations', slug: 'european-cities' },
]

// ============================================
// Helper: Fetch Unsplash Images
// ============================================

async function fetchUnsplashImages(query: string, count: number = 10) {
  const response = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&per_page=${count}&orientation=portrait`,
    {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_KEY}`,
      },
    }
  )
  const data = await response.json()
  return data.results || []
}

// ============================================
// Seeding Functions
// ============================================

async function seedUsers() {
  console.log('📝 Seeding demo users...')

  for (const user of DEMO_USERS) {
    const { error } = await supabase
      .from('users')
      .upsert({
        ...user,
        subscription_status: 'active',
        subscription_started_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days ago
        subscription_renewed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
        login_count: Math.floor(Math.random() * 50) + 10,
        last_login_at: new Date().toISOString(),
      })

    if (error) {
      console.error(`Error creating user ${user.email}:`, error)
    } else {
      console.log(`✅ Created user: ${user.email}`)
    }
  }
}

async function seedSeriesAndCharacters() {
  console.log('📝 Seeding series and characters...')

  // Seed series
  for (const series of DEMO_SERIES) {
    const { data, error } = await supabase
      .from('series')
      .upsert(series)
      .select()
      .single()

    if (error) {
      console.error(`Error creating series ${series.name}:`, error)
      continue
    }

    console.log(`✅ Created series: ${series.name}`)

    // Seed characters for this series
    const seriesCharacters = DEMO_CHARACTERS.filter(c => c.series_slug === series.slug)
    for (const char of seriesCharacters) {
      const { error: charError } = await supabase
        .from('characters')
        .upsert({
          name: char.name,
          slug: char.slug,
          series_id: data.id,
        })

      if (charError) {
        console.error(`Error creating character ${char.name}:`, charError)
      } else {
        console.log(`  ✅ Created character: ${char.name}`)
      }
    }
  }
}

async function seedContentSets() {
  console.log('📝 Seeding content sets...')

  const themes = Object.keys(CONTENT_THEMES)
  const { data: characters } = await supabase.from('characters').select('*')

  if (!characters || characters.length === 0) {
    console.error('❌ No characters found. Run seedSeriesAndCharacters first.')
    return
  }

  for (let i = 0; i < 20; i++) {
    const theme = themes[i % themes.length]
    const themeData = CONTENT_THEMES[theme as keyof typeof CONTENT_THEMES]
    const character = characters[i % characters.length]

    // Generate set metadata
    const setTitle = `${character.name} - Set ${i + 1}`
    const setSlug = `${character.slug}-set-${i + 1}`
    const imageCount = Math.floor(Math.random() * 30) + 15 // 15-45 images

    // Fetch placeholder images from Unsplash
    console.log(`  Fetching ${imageCount} images for "${setTitle}"...`)
    const images = await fetchUnsplashImages(theme, imageCount)

    if (images.length === 0) {
      console.warn(`  ⚠️  No images found for theme: ${theme}`)
      continue
    }

    // Create content set
    const { data: setData, error: setError } = await supabase
      .from('content_sets')
      .insert({
        title: setTitle,
        slug: setSlug,
        description: `A collection of ${imageCount} stunning ${theme} photographs showcasing ${character.name}.`,
        image_count: images.length,
        r2_folder_key: `demo/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${setSlug}`,
        tags: themeData.tags,
        published_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(), // Random time in last 90 days
        view_count: Math.floor(Math.random() * 500),
        download_count: Math.floor(Math.random() * 100),
        like_count: Math.floor(Math.random() * 50),
      })
      .select()
      .single()

    if (setError) {
      console.error(`Error creating set "${setTitle}":`, setError)
      continue
    }

    console.log(`✅ Created set: ${setTitle} (${images.length} images)`)

    // Link character to set
    await supabase.from('set_characters').insert({
      set_id: setData.id,
      character_id: character.id,
      is_primary: true,
    })

    // Create image records
    for (let j = 0; j < images.length; j++) {
      const unsplashImage = images[j]
      const imageId = crypto.randomUUID()

      await supabase.from('images').insert({
        id: imageId,
        set_id: setData.id,
        filename: `${setSlug}-${String(j + 1).padStart(3, '0')}.jpg`,
        r2_key: `demo/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${setSlug}/${imageId}.jpg`,
        watermarked_r2_key: `demo/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${setSlug}/watermarked_${imageId}.jpg`,
        thumbnail_r2_key: `demo/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${setSlug}/thumbnails/${imageId}.jpg`,
        order_index: j,
        width: unsplashImage.width,
        height: unsplashImage.height,
        mime_type: 'image/jpeg',
      })
    }

    // Set thumbnail (first image)
    if (images.length > 0) {
      const { data: firstImage } = await supabase
        .from('images')
        .select('id')
        .eq('set_id', setData.id)
        .eq('order_index', 0)
        .single()

      if (firstImage) {
        await supabase
          .from('content_sets')
          .update({ thumbnail_image_id: firstImage.id })
          .eq('id', setData.id)
      }
    }

    // Add some delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

async function seedCommissions() {
  console.log('📝 Seeding demo commissions...')

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .in('membership_tier', ['gold', 'diamond', 'platinum'])

  if (!users) return

  const commissionTypes = ['set', 'custom']
  const descriptions = [
    'Looking for a custom nature photography set featuring mountain landscapes',
    'Would like an abstract art series with geometric patterns',
    'Requesting a travel destination series showcasing European cities',
    'Custom architecture photography focusing on modern buildings',
  ]

  for (let i = 0; i < 10; i++) {
    const user = users[i % users.length]
    const status = ['pending', 'in_progress', 'completed'][Math.floor(Math.random() * 3)]

    await supabase.from('commissions').insert({
      user_id: user.id,
      user_email: user.email,
      user_name: user.name,
      user_tier: user.membership_tier,
      type: commissionTypes[i % 2],
      status,
      is_free_tier: Math.random() > 0.5,
      request_data: {
        type: commissionTypes[i % 2],
        description: descriptions[i % descriptions.length],
        mode: 'simple',
        femaleCharacters: ['Nature Photography', 'Urban Architecture'],
        imageDistribution: {
          solo: 50,
          duo_ff: 30,
          duo_mf: 20,
          duo_mf_pov: 0,
          pov_ffm: 0,
          gangbang: 0,
        },
      },
      notes: status === 'completed' ? 'Completed and delivered successfully!' : null,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })

    console.log(`✅ Created commission for ${user.name} (${status})`)
  }
}

async function seedCommunity() {
  console.log('📝 Seeding community channels and messages...')

  // Create channels
  const channels = [
    { name: 'General', emoji: '💬', description: 'General discussion', min_tier: 'bronze', is_default: true, position: 0 },
    { name: 'Announcements', emoji: '📢', description: 'Platform updates', min_tier: 'bronze', allow_member_posts: false, position: 1 },
    { name: 'Gold Lounge', emoji: '🌟', description: 'For Gold+ members', min_tier: 'gold', position: 2 },
    { name: 'VIP Chat', emoji: '💎', description: 'Diamond+ exclusive', min_tier: 'diamond', position: 3 },
  ]

  const creator = DEMO_USERS.find(u => u.is_creator)!

  for (const channelData of channels) {
    const { data: channel, error } = await supabase
      .from('channels')
      .insert({ ...channelData, created_by: creator.id })
      .select()
      .single()

    if (error) {
      console.error(`Error creating channel ${channelData.name}:`, error)
      continue
    }

    console.log(`✅ Created channel: ${channelData.name}`)

    // Add some messages
    const messages = [
      'Welcome to the demo platform!',
      'This is a demonstration of the community features.',
      'Feel free to explore the different channels.',
    ]

    for (const content of messages) {
      await supabase.from('channel_messages').insert({
        channel_id: channel.id,
        user_id: creator.id,
        user_name: creator.name,
        user_tier: creator.membership_tier,
        content,
      })
    }
  }
}

async function seedAnalytics() {
  console.log('📝 Seeding analytics data...')

  // Create historical metrics for last 90 days
  for (let i = 90; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)

    await supabase.from('patreon_metrics_history').insert({
      created_at: date.toISOString(),
      patron_count: Math.floor(200 + Math.random() * 50),
      total_members: Math.floor(250 + Math.random() * 75),
      monthly_revenue: Math.floor(1500 + Math.random() * 500),
      tier_breakdown: {
        bronze: Math.floor(50 + Math.random() * 20),
        silver: Math.floor(40 + Math.random() * 15),
        gold: Math.floor(30 + Math.random() * 10),
        diamond: Math.floor(20 + Math.random() * 8),
        platinum: Math.floor(10 + Math.random() * 5),
      },
    })
  }

  console.log('✅ Created 90 days of analytics history')
}

// ============================================
// Main Seeding Function
// ============================================

async function main() {
  console.log('🌱 Starting demo data seeding...\n')

  try {
    await seedUsers()
    await seedSeriesAndCharacters()
    await seedContentSets()
    await seedCommissions()
    await seedCommunity()
    await seedAnalytics()

    console.log('\n✅ Demo data seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log('   - 6 demo users (all tiers)')
    console.log('   - 4 series with 10 characters')
    console.log('   - 20 content sets with images')
    console.log('   - 10 commissions')
    console.log('   - 4 community channels')
    console.log('   - 90 days of analytics')
    console.log('\n🔑 Demo accounts:')
    DEMO_USERS.forEach(u => console.log(`   - ${u.email} / demo123`))
  } catch (error) {
    console.error('❌ Error seeding data:', error)
    process.exit(1)
  }
}

main()
