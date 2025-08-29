/**
 * Test script for Qwen/Qwen-image model from Replicate
 * 
 * This script:
 * 1. Uses OpenAI GPT-4 Vision to describe the gengar-tauros-blend.png image
 * 2. Uses the description to generate a new image with qwen/qwen-image model
 * 3. Saves the result to the output directory
 */

// Load environment variables from .env.local file if it exists
require('dotenv').config({ path: './.env.local' });

const Replicate = require('replicate');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Initialize clients
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Paths
const tempDir = path.join(__dirname, '..', 'tests', 'temp');
const outputDir = path.join(__dirname, '..', 'tests', 'output');
const inputImagePath = path.join(tempDir, 'gengar-tauros-blend.png');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Convert local image file to base64 data URI
 */
function imageToDataUri(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64String = imageBuffer.toString('base64');
  return `data:image/png;base64,${base64String}`;
}

/**
 * Use GPT-4 Vision to describe the image
 */
async function describeImageWithGPT(imagePath) {
  console.log('🔍 Attempting to describe image with GPT Vision...');
  
  // Try different models in order of preference (same as production)
  const modelsToTry = ["gpt-4.1-mini", "gpt-4-vision-preview", "gpt-4o", "gpt-4-turbo"];
  
  for (const model of modelsToTry) {
    try {
      console.log(`🔄 Trying model: ${model}`);
      const imageDataUri = imageToDataUri(imagePath);
      
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please describe this Pokemon fusion image in detail for use in generating a new stylized version. 

Focus on:
- Overall creature design and body structure
- Color scheme and patterns
- Facial features and expression
- Distinctive characteristics
- Pose and stance
- Background elements

Provide a clear, descriptive prompt that could be used to recreate a similar creature in a new artistic style.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUri,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      const description = response.choices[0].message.content;
      console.log(`✅ Image description generated using ${model}:`);
      console.log(description);
      
      return description;
    } catch (error) {
      console.error(`❌ Error with model ${model}: ${error.message}`);
      if (model === modelsToTry[modelsToTry.length - 1]) {
        // If this was the last model, return null to indicate failure
        console.error('❌ All vision models failed, will use fallback prompt');
        return null;
      }
      // Continue to next model
    }
  }
  
  return null;
}

/**
 * Generate image using Qwen model
 */
async function generateWithQwen(prompt) {
  console.log('\n🎨 Generating image with Qwen model...');
  console.log('Prompt:', prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''));
  
  try {
    const input = {
      prompt: prompt,
      guidance: 4,
      num_inference_steps: 50
    };

    console.log('📡 Calling Qwen API...');
    const output = await replicate.run("qwen/qwen-image", { input });
    
    console.log('✅ Qwen generation completed');
    return output;
  } catch (error) {
    console.error('❌ Error generating with Qwen:', error.message);
    throw error;
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
 * Save description to text file
 */
function saveDescription(description, filename) {
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, description, 'utf8');
  console.log(`📝 Description saved to: ${filePath}`);
}

/**
 * Main test function
 */
async function runQwenTest() {
  const timestamp = Date.now();
  const testId = `qwen-test-${timestamp}`;
  
  console.log('🚀 Starting Qwen Image Model Test');
  console.log('==========================================');
  console.log(`Test ID: ${testId}`);
  console.log(`Input image: ${inputImagePath}`);
  console.log('');

  try {
    // Check if input image exists
    if (!fs.existsSync(inputImagePath)) {
      throw new Error(`Input image not found: ${inputImagePath}`);
    }

    // Step 1: Describe the image with GPT-4 Vision
    console.log('STEP 1: Analyzing input image...');
    const description = await describeImageWithGPT(inputImagePath);
    
    // Save the description
    saveDescription(description, `${testId}-description.txt`);

    // Step 2: Create a prompt for Qwen based on the description
    console.log('\nSTEP 2: Creating artistic prompt...');
    const artisticPrompt = `Create a stylized, anime-inspired illustration based on this description: ${description}. 

Style requirements:
- Clean, polished cartoon/anime art style
- Vibrant colors with smooth gradients
- Soft cel-shading and clean outlines
- Professional digital art quality
- Fantasy creature aesthetic
- Expressive and appealing design
- Transparent background preferred`;

    console.log('🎯 Final prompt created');

    // Step 3: Generate with Qwen
    console.log('\nSTEP 3: Generating with Qwen model...');
    const qwenOutput = await generateWithQwen(artisticPrompt);

    // Step 4: Download and save the result
    console.log('\nSTEP 4: Saving results...');
    
    if (qwenOutput && qwenOutput.length > 0) {
      // Get the image URL
      const imageUrl = qwenOutput[0].url ? qwenOutput[0].url() : qwenOutput[0];
      console.log('📥 Image URL:', imageUrl);
      
      // Download and save the image
      const savedImagePath = await downloadAndSaveImage(imageUrl, `${testId}-qwen-output.webp`);
      
      // Save the prompt used
      saveDescription(artisticPrompt, `${testId}-prompt.txt`);
      
      // Save URL for reference
      fs.writeFileSync(
        path.join(outputDir, `${testId}-url.txt`), 
        imageUrl, 
        'utf8'
      );

      console.log('\n🎉 Test completed successfully!');
      console.log('==========================================');
      console.log('Results:');
      console.log(`- Description: ${testId}-description.txt`);
      console.log(`- Prompt: ${testId}-prompt.txt`);
      console.log(`- Generated image: ${testId}-qwen-output.webp`);
      console.log(`- Image URL: ${testId}-url.txt`);
      console.log('==========================================');

    } else {
      throw new Error('No output received from Qwen model');
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
  console.error('   Create a .env.local file in the project root with:');
  console.error('   REPLICATE_API_TOKEN=your_token_here');
  console.error('   You can get your token from https://replicate.com/account/api-tokens');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  console.error('   Create a .env.local file in the project root with:');
  console.error('   OPENAI_API_KEY=your_api_key_here');
  console.error('   You can get your API key from https://platform.openai.com/api-keys');
  process.exit(1);
}

// Run the test
runQwenTest();
