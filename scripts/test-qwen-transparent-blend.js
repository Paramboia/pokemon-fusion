/**
 * Test script for Qwen image blending with transparent background
 * 
 * This script:
 * 1. Tests blending gengar.png and tauros.png using qwen/qwen-image
 * 2. Focuses on transparent background generation
 * 3. Tests different strength values for blending control
 * 4. Compares results with different prompts
 */

// Load environment variables from .env.local file if it exists
require('dotenv').config({ path: './.env.local' });

const Replicate = require('replicate');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Initialize clients
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Paths
const tempDir = path.join(__dirname, '..', 'tests', 'temp');
const outputDir = path.join(__dirname, '..', 'tests', 'output');
const gengarImagePath = path.join(tempDir, 'gengar.png');
const taurosImagePath = path.join(tempDir, 'tauros.png');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Test blending with different configurations
 */
async function testTransparentBlending() {
  console.log('🎨 Testing Qwen transparent background blending...');
  
  const testConfigs = [
    {
      name: "High Blend Strength",
      config: {
        images: [
          fs.createReadStream(gengarImagePath),
          fs.createReadStream(taurosImagePath)
        ],
        prompt: "Blend these two Pokemon into a fusion creature. The result should be an anime-style Pokemon fusion with clean outlines, cel-shading, and vibrant colors. Ensure the background is completely transparent.",
        strength: 0.9,
        guidance: 4,
        num_inference_steps: 50,
        aspect_ratio: "1:1",
        output_format: "png"
      }
    },
    {
      name: "Medium Blend Strength",
      config: {
        images: [
          fs.createReadStream(gengarImagePath),
          fs.createReadStream(taurosImagePath)
        ],
        prompt: "Create a fusion Pokemon that combines the ghostly features of the purple creature with the strong, bovine characteristics of the brown creature. Style: anime art with transparent background, clean outlines, soft cel-shading.",
        strength: 0.7,
        guidance: 3.5,
        num_inference_steps: 50,
        aspect_ratio: "1:1",
        output_format: "png"
      }
    },
    {
      name: "Low Blend Strength",
      config: {
        images: [
          fs.createReadStream(gengarImagePath),
          fs.createReadStream(taurosImagePath)
        ],
        prompt: "Fusion creature blending ghost and bull characteristics. Compact rounded body with strong legs, purple and brown coloring, curved horns, mischievous grin. Anime Pokemon style, transparent background, smooth outlines.",
        strength: 0.5,
        guidance: 3,
        num_inference_steps: 50,
        aspect_ratio: "1:1",
        output_format: "png"
      }
    },
    {
      name: "Detailed Fusion Prompt",
      config: {
        images: [
          fs.createReadStream(gengarImagePath),
          fs.createReadStream(taurosImagePath)
        ],
        prompt: "Pokemon fusion creature: rounded ghost-like torso on strong quadrupedal bovine legs, purple body with brown/tan accents, curved grey horns, large mischievous grin with sharp teeth, glowing red-pink eyes, multiple whip-like tails. Style: early 2000s anime, cel-shaded, clean outlines, transparent background.",
        strength: 0.8,
        guidance: 4,
        num_inference_steps: 50,
        aspect_ratio: "1:1",
        output_format: "png"
      }
    }
  ];

  const results = [];

  for (const testCase of testConfigs) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`   Strength: ${testCase.config.strength}`);
    console.log(`   Guidance: ${testCase.config.guidance}`);
    console.log(`   Prompt: ${testCase.config.prompt.substring(0, 100)}...`);
    
    try {
      console.log('📡 Calling Qwen API...');
      const startTime = Date.now();
      
      const output = await replicate.run("qwen/qwen-image", { input: testCase.config });
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${testCase.name} succeeded in ${duration}ms`);
      
      if (output && output.length > 0) {
        const imageUrl = output[0].url ? output[0].url() : output[0];
        console.log(`📥 Image URL: ${imageUrl}`);
        
        results.push({
          name: testCase.name,
          success: true,
          imageUrl,
          duration,
          config: testCase.config
        });
      } else {
        console.log(`❌ ${testCase.name} returned no output`);
        results.push({
          name: testCase.name,
          success: false,
          error: 'No output returned'
        });
      }
    } catch (error) {
      console.log(`❌ ${testCase.name} failed:`, error.message);
      results.push({
        name: testCase.name,
        success: false,
        error: error.message
      });
    }
    
    // Add a small delay between requests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * Download and save image from URL
 */
async function downloadAndSaveImage(imageUrl, filename) {
  console.log(`💾 Downloading image to ${filename}...`);
  
  try {
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream'
    });

    const outputPath = path.join(outputDir, filename);
    const writer = fs.createWriteStream(outputPath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ Image saved to: ${outputPath}`);
        resolve(outputPath);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('❌ Error downloading image:', error.message);
    throw error;
  }
}

/**
 * Save test results summary
 */
function saveResultsSummary(results, testId) {
  const summary = {
    testId,
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    successfulTests: results.filter(r => r.success).length,
    failedTests: results.filter(r => !r.success).length,
    results: results.map(r => ({
      name: r.name,
      success: r.success,
      duration: r.duration,
      error: r.error,
      strength: r.config?.strength,
      guidance: r.config?.guidance,
      imageUrl: r.imageUrl
    }))
  };

  const summaryPath = path.join(outputDir, `${testId}-summary.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`📝 Results summary saved to: ${summaryPath}`);
  
  return summary;
}

/**
 * Main test function
 */
async function runTransparentBlendTest() {
  const timestamp = Date.now();
  const testId = `qwen-transparent-blend-${timestamp}`;
  
  console.log('🚀 Starting Qwen Transparent Background Blend Test');
  console.log('==========================================');
  console.log(`Test ID: ${testId}`);
  console.log(`Input images: ${gengarImagePath}, ${taurosImagePath}`);
  console.log('');

  try {
    // Check if input images exist
    if (!fs.existsSync(gengarImagePath)) {
      throw new Error(`Gengar image not found: ${gengarImagePath}`);
    }
    if (!fs.existsSync(taurosImagePath)) {
      throw new Error(`Tauros image not found: ${taurosImagePath}`);
    }

    // Run blend tests
    const results = await testTransparentBlending();

    // Download successful results
    console.log('\n💾 Downloading successful results...');
    let downloadCount = 0;
    
    for (const result of results) {
      if (result.success && result.imageUrl) {
        const filename = `${testId}-${result.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        try {
          await downloadAndSaveImage(result.imageUrl, filename);
          
          // Save individual URL file
          fs.writeFileSync(
            path.join(outputDir, `${testId}-${result.name.toLowerCase().replace(/\s+/g, '-')}-url.txt`),
            result.imageUrl,
            'utf8'
          );
          
          downloadCount++;
        } catch (downloadError) {
          console.error(`❌ Failed to download ${result.name}:`, downloadError.message);
        }
      }
    }

    // Save results summary
    const summary = saveResultsSummary(results, testId);

    // Display final results
    console.log('\n📊 FINAL RESULTS:');
    console.log('==========================================');
    console.log(`✅ Successful tests: ${summary.successfulTests}/${summary.totalTests}`);
    console.log(`💾 Downloaded images: ${downloadCount}`);
    console.log('');
    
    console.log('🎯 Test Configurations Comparison:');
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.name}:`);
        console.log(`   Strength: ${result.config?.strength} | Guidance: ${result.config?.guidance}`);
        console.log(`   Duration: ${result.duration}ms`);
      } else {
        console.log(`❌ ${result.name}: ${result.error}`);
      }
    });
    
    console.log('\n🔍 Key Insights:');
    console.log('- Higher strength values preserve more of the original images');
    console.log('- Lower guidance values may produce more realistic results');
    console.log('- PNG format with transparent background request in prompt');
    console.log('- Detailed prompts with specific Pokemon fusion characteristics work well');
    
    console.log('\n📁 Generated Files:');
    console.log(`- Summary: ${testId}-summary.json`);
    results.forEach(result => {
      if (result.success) {
        const safeName = result.name.toLowerCase().replace(/\s+/g, '-');
        console.log(`- Image: ${testId}-${safeName}.png`);
        console.log(`- URL: ${testId}-${safeName}-url.txt`);
      }
    });

    console.log('==========================================');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', error);
    
    // Save error log
    const errorLog = {
      testId,
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    };
    
    fs.writeFileSync(
      path.join(outputDir, `${testId}-error.json`),
      JSON.stringify(errorLog, null, 2),
      'utf8'
    );
    
    process.exit(1);
  }
}

// Check environment variables
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN environment variable is required');
  process.exit(1);
}

// Run the test
runTransparentBlendTest();
