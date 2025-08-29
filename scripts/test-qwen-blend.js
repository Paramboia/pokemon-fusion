/**
 * Test script to explore Qwen image blending capabilities
 * 
 * This script:
 * 1. Tests if qwen/qwen-image supports image inputs for blending
 * 2. Attempts to blend gengar.png and tauros.png directly
 * 3. Compares with text-only fusion approach
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
 * Test 1: Try to get model schema/info to see available parameters
 */
async function exploreModelParameters() {
  console.log('🔍 Exploring Qwen model parameters...');
  
  try {
    // Try to get model information
    const model = await replicate.models.get("qwen", "qwen-image");
    console.log('📋 Model info:', JSON.stringify(model, null, 2));
    
    if (model.latest_version && model.latest_version.openapi_schema) {
      console.log('📋 OpenAPI Schema:', JSON.stringify(model.latest_version.openapi_schema, null, 2));
    }
  } catch (error) {
    console.log('❌ Could not get model schema:', error.message);
  }
}

/**
 * Test 2: Try blending with image inputs (if supported)
 */
async function testImageBlending() {
  console.log('\n🎨 Testing image blending with Qwen...');
  
  try {
    // First, let's try with different input parameter combinations
    const testCases = [
      {
        name: "With image parameter",
        input: {
          image: fs.createReadStream(gengarImagePath),
          prompt: "Blend this image with a Tauros-like creature, creating a fusion that combines the ghostly features of this creature with the strong, bovine characteristics of Tauros. The result should be an anime-style fusion creature.",
          guidance: 4,
          num_inference_steps: 50
        }
      },
      {
        name: "With images array parameter",
        input: {
          images: [
            fs.createReadStream(gengarImagePath),
            fs.createReadStream(taurosImagePath)
          ],
          prompt: "Blend these two Pokemon into a fusion creature that combines their characteristics",
          guidance: 4,
          num_inference_steps: 50
        }
      },
      {
        name: "With image_1 and image_2 parameters",
        input: {
          image_1: fs.createReadStream(gengarImagePath),
          image_2: fs.createReadStream(taurosImagePath),
          prompt: "Create a fusion of these two Pokemon",
          guidance: 4,
          num_inference_steps: 50
        }
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      try {
        const output = await replicate.run("qwen/qwen-image", { input: testCase.input });
        console.log(`✅ ${testCase.name} succeeded!`);
        console.log('Output:', output);
        return { success: true, output, method: testCase.name };
      } catch (error) {
        console.log(`❌ ${testCase.name} failed:`, error.message);
      }
    }
    
    return { success: false };
  } catch (error) {
    console.error('❌ Error testing image blending:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Compare with text-only approach (baseline)
 */
async function testTextOnlyFusion() {
  console.log('\n📝 Testing text-only fusion (baseline)...');
  
  try {
    const input = {
      prompt: "Create a fusion Pokemon that combines Gengar (a purple ghost-type with a mischievous grin, round body, and spiky features) with Tauros (a brown bull-like creature with horns, muscular build, and multiple tails). The fusion should have a compact rounded body on strong legs, purple and brown coloring, curved horns, a toothy grin, and ghostly-bovine characteristics. Anime art style.",
      guidance: 4,
      num_inference_steps: 50
    };

    const output = await replicate.run("qwen/qwen-image", { input });
    console.log('✅ Text-only fusion succeeded');
    return { success: true, output };
  } catch (error) {
    console.error('❌ Text-only fusion failed:', error.message);
    return { success: false, error: error.message };
  }
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
 * Main test function
 */
async function runQwenBlendTest() {
  const timestamp = Date.now();
  const testId = `qwen-blend-test-${timestamp}`;
  
  console.log('🚀 Starting Qwen Image Blending Test');
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

    // Test 1: Explore model parameters
    await exploreModelParameters();

    // Test 2: Try image blending
    const blendResult = await testImageBlending();
    
    // Test 3: Text-only baseline
    const textResult = await testTextOnlyFusion();

    // Save results
    console.log('\n📊 RESULTS SUMMARY:');
    console.log('==========================================');
    
    if (blendResult.success) {
      console.log(`✅ Image blending WORKS with method: ${blendResult.method}`);
      
      if (blendResult.output && blendResult.output.length > 0) {
        const imageUrl = blendResult.output[0].url ? blendResult.output[0].url() : blendResult.output[0];
        await downloadAndSaveImage(imageUrl, `${testId}-blend-result.webp`);
        
        fs.writeFileSync(
          path.join(outputDir, `${testId}-blend-url.txt`), 
          imageUrl, 
          'utf8'
        );
      }
    } else {
      console.log('❌ Image blending NOT supported or failed');
    }
    
    if (textResult.success) {
      console.log('✅ Text-only fusion works (baseline confirmed)');
      
      if (textResult.output && textResult.output.length > 0) {
        const imageUrl = textResult.output[0].url ? textResult.output[0].url() : textResult.output[0];
        await downloadAndSaveImage(imageUrl, `${testId}-text-result.webp`);
        
        fs.writeFileSync(
          path.join(outputDir, `${testId}-text-url.txt`), 
          imageUrl, 
          'utf8'
        );
      }
    }

    console.log('==========================================');
    console.log('🎯 CONCLUSION:');
    
    if (blendResult.success) {
      console.log(`🎉 YES! You can use qwen/qwen-image for image blending!`);
      console.log(`   Working method: ${blendResult.method}`);
      console.log(`   This could replace your blend-images model.`);
    } else {
      console.log('❌ No, qwen/qwen-image does not support direct image blending');
      console.log('   You would need to stick with the text-based fusion approach');
      console.log('   or continue using the blend-images model for the blend step');
    }

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
runQwenBlendTest();
