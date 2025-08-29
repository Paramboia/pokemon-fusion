const Replicate = require('replicate');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: './.env.local' });

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Directories
const tempDir = path.join(__dirname, '../tests/temp');
const outputDir = path.join(__dirname, '../output');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
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
 * Save text content to file
 */
function saveTextFile(content, filename) {
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`📝 Text saved to: ${filePath}`);
}

/**
 * Test different prompting approaches with Qwen
 */
async function testQwenDirectBlending() {
  const timestamp = Date.now();
  const testId = `qwen-simple-blend-${timestamp}`;
  
  console.log('🚀 Testing Qwen Direct Blending with Gengar + Tauros');
  console.log('=======================================================');
  
  try {
    // Use local images
    const gengarPath = path.join(tempDir, 'gengar.png');
    const taurosPath = path.join(tempDir, 'tauros.png');
    
    if (!fs.existsSync(gengarPath) || !fs.existsSync(taurosPath)) {
      throw new Error('Required images not found in /tests/temp directory. Please ensure gengar.png and tauros.png exist.');
    }
    
    console.log('📁 Using local images:', {
      gengar: gengarPath,
      tauros: taurosPath
    });
    
    // Test different prompting approaches
    const testCases = [
      {
        name: 'simple',
        prompt: 'Blend these two images of Gengar and Tauros together into a single cohesive creature called Gentaros. Combine the distinctive features, colors, and characteristics from both Gengar and Tauros into one unified design. Keep the background completely transparent.',
        strength: 0.8,
        guidance: 2.5,
        steps: 30
      },
      {
        name: 'minimal',
        prompt: 'Merge these two Pokemon into one creature with transparent background.',
        strength: 0.8,
        guidance: 2.0,
        steps: 30
      },
      {
        name: 'detailed',
        prompt: 'Create a Pokemon fusion by blending the ghost-type features of Gengar with the bull-like characteristics of Tauros. The result should be a single creature that combines Gengar\'s purple coloring and ghostly essence with Tauros\'s muscular build and horns. Maintain Pokemon art style with transparent background.',
        strength: 0.7,
        guidance: 3.5,
        steps: 50
      },
      {
        name: 'original-params',
        prompt: 'Blend these two images of Gengar and Tauros together into a single cohesive creature called Gentaros. Combine the distinctive features, colors, and characteristics from both Gengar and Tauros into one unified design. Keep the background completely transparent.',
        strength: 0.7,
        guidance: 3.5,
        steps: 50
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      console.log(`📝 Prompt: ${testCase.prompt.substring(0, 100)}...`);
      
      const input = {
        images: [
          fs.createReadStream(gengarPath),
          fs.createReadStream(taurosPath)
        ],
        prompt: testCase.prompt,
        strength: testCase.strength,
        guidance: testCase.guidance,
        num_inference_steps: testCase.steps,
        aspect_ratio: "1:1",
        output_format: "png",
        go_fast: false,
        output_quality: 90
      };
      
      console.log(`⚙️ Parameters:`, {
        strength: testCase.strength,
        guidance: testCase.guidance,
        steps: testCase.steps
      });
      
      console.log('📡 Calling Qwen API...');
      const startTime = Date.now();
      
      try {
        const output = await replicate.run("qwen/qwen-image", { input });
        const duration = Date.now() - startTime;
        
        console.log(`✅ Generation completed in ${duration}ms`);
        
        if (output && output.length > 0) {
          const imageUrl = typeof output[0] === 'object' && output[0].url 
            ? (typeof output[0].url === 'function' ? output[0].url() : output[0].url)
            : output[0];
          
          console.log(`🖼️ Generated image URL: ${imageUrl}`);
          
          // Save the image
          const filename = `${testId}-${testCase.name}.webp`;
          await downloadAndSaveImage(imageUrl, filename);
          
          // Save the prompt
          const promptFilename = `${testId}-${testCase.name}-prompt.txt`;
          saveTextFile(testCase.prompt, promptFilename);
          
          // Save parameters
          const paramsFilename = `${testId}-${testCase.name}-params.json`;
          const params = {
            testCase: testCase.name,
            prompt: testCase.prompt,
            parameters: {
              strength: testCase.strength,
              guidance: testCase.guidance,
              num_inference_steps: testCase.steps,
              aspect_ratio: "1:1",
              output_format: "png",
              go_fast: false,
              output_quality: 90
            },
            result: {
              imageUrl,
              duration: `${duration}ms`,
              timestamp: new Date().toISOString()
            }
          };
          saveTextFile(JSON.stringify(params, null, 2), paramsFilename);
          
          console.log(`✅ Test case '${testCase.name}' completed successfully`);
          
        } else {
          console.error(`❌ No output received for test case: ${testCase.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Error in test case '${testCase.name}':`, error.message);
        
        // Save error log
        const errorFilename = `${testId}-${testCase.name}-error.json`;
        const errorLog = {
          testCase: testCase.name,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        saveTextFile(JSON.stringify(errorLog, null, 2), errorFilename);
      }
      
      // Wait between tests
      console.log('⏳ Waiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n🎉 All test cases completed!');
    console.log('==========================================');
    console.log(`Check the /output directory for results with prefix: ${testId}`);
    console.log('==========================================');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Check environment variables
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN environment variable is required');
  console.error('   Create a .env.local file in the project root with:');
  console.error('   REPLICATE_API_TOKEN=your-token-here');
  process.exit(1);
}

// Run the test
runTest();

async function runTest() {
  try {
    await testQwenDirectBlending();
  } catch (error) {
    console.error('❌ Failed to run test:', error.message);
    process.exit(1);
  }
}
