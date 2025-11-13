// Quick Redis connection test - ES Module version
import { Redis } from '@upstash/redis'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Manually load .env.local
const envPath = join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      process.env[key] = value
    }
  })
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

async function testRedis() {
  console.log('Testing Redis connection...')
  console.log('URL:', process.env.UPSTASH_REDIS_REST_URL ? 'Set ✓' : 'MISSING ✗')
  console.log('Token:', process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set ✓' : 'MISSING ✗')

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('\n❌ Environment variables not loaded from .env.local')
    process.exit(1)
  }

  try {
    console.log('\n1. Testing simple GET...')
    const result = await redis.get('test-key')
    console.log('✓ GET successful:', result)

    console.log('\n2. Testing SET...')
    await redis.set('test-key', 'hello-world', { ex: 60 })
    console.log('✓ SET successful')

    console.log('\n3. Testing SISMEMBER (the failing operation)...')
    const isMember = await redis.sismember('test-set', 'test-value')
    console.log('✓ SISMEMBER successful:', isMember)

    console.log('\n4. Testing ZCOUNT (rate limiter operation)...')
    const count = await redis.zcount('test-sorted-set', 0, Date.now())
    console.log('✓ ZCOUNT successful:', count)

    console.log('\n✅ All Redis operations successful!')
    console.log('Redis is working correctly. Try restarting your dev server.')

  } catch (error) {
    console.error('\n❌ Redis Error:', error.message)
    console.error('\nFull error:', error)
    console.error('\nThis is the same error appearing in your dev server.')
    console.error('\nSolutions:')
    console.error('1. Update credentials in .env.local from Vercel dashboard')
    console.error('2. Check if Redis instance exists at: https://console.upstash.com/')
    console.error('3. Verify no IP restrictions on your Upstash Redis instance')
  }
}

testRedis()
