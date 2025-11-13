// scripts/test-watermark-generation.ts
import { writeFileSync } from 'fs'
import { join } from 'path'
import { createTextWatermark, createWatermarkBadge } from '../src/lib/watermark-generator'

async function testWatermarkGeneration() {
  console.log('🧪 Testing watermark generation...\n')
  
  const testUserId = 'TEST123'
  const watermarkText = `ID: ${testUserId}`
  
  try {
    // Test 1: Basic text watermark
    console.log('1️⃣ Generating basic text watermark...')
    const textWatermark = await createTextWatermark(watermarkText)
    const textPath = join(process.cwd(), 'test-watermark-text.png')
    writeFileSync(textPath, textWatermark)
    console.log(`   ✅ Saved to: ${textPath}`)
    
    // Test 2: Badge style watermark
    console.log('\n2️⃣ Generating badge style watermark...')
    const badgeWatermark = await createWatermarkBadge(watermarkText, {
      backgroundColor: '#000000',
      backgroundOpacity: 0.7,
      textColor: '#ffffff',
      fontSize: 18,
      padding: 10,
      borderRadius: 6
    })
    const badgePath = join(process.cwd(), 'test-watermark-badge.png')
    writeFileSync(badgePath, badgeWatermark)
    console.log(`   ✅ Saved to: ${badgePath}`)
    
    // Test 3: Different sizes
    console.log('\n3️⃣ Generating different sized watermarks...')
    const sizes = [14, 20, 24]
    for (const size of sizes) {
      const sizedWatermark = await createTextWatermark(watermarkText, {
        fontSize: size
      })
      const sizePath = join(process.cwd(), `test-watermark-${size}px.png`)
      writeFileSync(sizePath, sizedWatermark)
      console.log(`   ✅ Size ${size}px saved to: ${sizePath}`)
    }
    
    console.log('\n✅ All watermark tests completed successfully!')
    console.log('📁 Check the generated PNG files in your project root')
    
  } catch (error) {
    console.error('❌ Watermark generation failed:', error)
  }
}

// Run the test
if (require.main === module) {
  testWatermarkGeneration()
}

export { testWatermarkGeneration }
