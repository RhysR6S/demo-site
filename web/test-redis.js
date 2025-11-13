// Quick Redis connection test
const fs = require('fs')
const path = require('path')

// Manually load .env.local
const envPath = path.join(__dirname, '.env.local')
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

const { Redis } = require('@upstash/redis')

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

async function testRedis() {
  console.log('Testing Redis connection...')
  console.log('URL:', process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'MISSING')
  console.log('Token:', process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'MISSING')

  try {
    console.log('\n1. Testing simple GET...')
    const result = await redis.get('test-key')
    console.log('✓ GET successful:', result)

    console.log('\n2. Testing SET...')
    await redis.set('test-key', 'hello-world', { ex: 60 })
    console.log('✓ SET successful')

    console.log('\n3. Testing GET again...')
    const result2 = await redis.get('test-key')
    console.log('✓ GET successful:', result2)

    console.log('\n4. Testing SISMEMBER (the failing operation)...')
    const isMember = await redis.sismember('test-set', 'test-value')
    console.log('✓ SISMEMBER successful:', isMember)

    console.log('\n✅ All Redis operations successful!')
    console.log('\nIf you see this, Redis is working fine.')
    console.log('The errors might be from an old process or cached code.')
    console.log('Try restarting your dev server: Ctrl+C then npm run dev')

  } catch (error) {
    console.error('\n❌ Redis Error:', error.message)
    console.error('\nFull error:', error)
    console.error('\nPossible causes:')
    console.error('1. Invalid or expired credentials in .env.local')
    console.error('2. Upstash Redis instance is down or deleted')
    console.error('3. Network/firewall blocking access to Upstash REST API')
    console.error('4. IP restrictions on your Redis instance')
  }
}

testRedis()
