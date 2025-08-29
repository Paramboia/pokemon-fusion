/**
 * Test script for direct fusion with Qwen (skipping blend step)
 * 
 * This script:
 * 1. Uses GPT-4.1-mini to analyze gengar.png and tauros.png separately
 * 2. Creates a fusion description based on both Pokemon characteristics
 * 3. Uses Qwen to generate the final fusion image directly
 * 4. Saves all results to the output directory
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
const gengarImagePath = path.join(tempDir, 'gengar.png');
const taurosImagePath = path.join(tempDir, 'tauros.png');

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
 * Analyze a single Pokemon image using GPT-4.1-mini (same as production)
 * Using the same structure as dalle.ts DESCRIPTION_PROMPT
 */
async function analyzePokemonWithGPT(imagePath, pokemonName) {
  console.log(`🔍 Analyzing ${pokemonName} with GPT-4.1-mini...`);
  
  const modelsToTry = ["gpt-4.1-mini", "gpt-4-vision-preview", "gpt-4o"];
  
  for (const model of modelsToTry) {
    try {
      console.log(`🔄 Trying model: ${model} for ${pokemonName}`);
      const imageDataUri = imageToDataUri(imagePath);
      
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze this Pokemon image for fusion purposes. Break it down into:

Body structure and pose:
Color palette:
Key features:
Texture and surface:
Species influence or type vibe:
Attitude and expression:
Notable accessories or markings:

Focus on the distinctive characteristics that would be important when creating a fusion with another Pokemon. Describe it generically without using the specific Pokemon name.`
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
        max_tokens: 400
      });

      const analysis = response.choices[0].message.content;
      console.log(`✅ ${pokemonName} analysis generated using ${model}:`);
      console.log(analysis);
      
      return analysis;
    } catch (error) {
      console.error(`❌ Error with model ${model} for ${pokemonName}: ${error.message}`);
      if (model === modelsToTry[modelsToTry.length - 1]) {
        console.error(`❌ All vision models failed for ${pokemonName}`);
        return null;
      }
    }
  }
  
  return null;
}

/**
 * Create fusion description based on two Pokemon analyses
 */
async function createFusionDescription(gengarAnalysis, taurosAnalysis) {
  console.log('🧬 Creating fusion description from both analyses...');
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: `Based on these two Pokemon analyses, create a detailed description of what their fusion would look like:

POKEMON 1 ANALYSIS:
${gengarAnalysis}

POKEMON 2 ANALYSIS:
${taurosAnalysis}

Please create a fusion description that combines the best characteristics of both creatures. Focus on:

Body structure and pose: (How would you combine their body types?)
Color palette: (What colors would the fusion have?)
Key features: (What distinctive features from each would appear?)
Texture and surface: (What would the fusion's surface/texture be like?)
Species influence or type vibe: (What type of creature vibe would it have?)
Attitude and expression: (What personality would it convey?)
Notable accessories or markings: (What special markings or features?)

Create an original fusion creature description that blends both Pokemon naturally. Avoid using specific Pokemon names in the final description - describe it as a unique creature.`
        }
      ],
      max_tokens: 600
    });

    const fusionDescription = response.choices[0].message.content;
    console.log('✅ Fusion description created:');
    console.log(fusionDescription);
    
    return fusionDescription;
  } catch (error) {
    console.error('❌ Error creating fusion description:', error.message);
    throw error;
  }
}

/**
 * Generate image using Qwen model based on fusion description
 */
async function generateFusionWithQwen(fusionDescription) {
  console.log('\n🎨 Generating fusion image with Qwen model...');
  
  // Extract key elements from the description to create a refined prompt
  let bodyStructure = "unknown body structure";
  let colorPalette = "vibrant colors";
  let keyFeatures = "distinctive features";
  let textureAndSurface = "smooth surface";
  let speciesInfluence = "unique creature type";
  let attitudeAndExpression = "neutral expression";
  let notableAccessories = "no distinctive markings";
  
  // Try to extract the sections from the description with more flexible matching
  console.log('🔍 Parsing fusion description for key elements...');
  
  const bodyMatch = fusionDescription.match(/\*\*Body [Ss]tructure and [Pp]ose:\*\*([\s\S]*?)(?:\*\*[A-Z]|$)/);
  if (bodyMatch && bodyMatch[1]) {
    bodyStructure = bodyMatch[1].trim();
    console.log('✅ Extracted body structure:', bodyStructure.substring(0, 100) + '...');
  }
  
  const colorMatch = fusionDescription.match(/\*\*Color [Pp]alette:\*\*([\s\S]*?)(?:\*\*[A-Z]|$)/);
  if (colorMatch && colorMatch[1]) {
    colorPalette = colorMatch[1].trim();
    console.log('✅ Extracted color palette:', colorPalette.substring(0, 100) + '...');
  }
  
  const featuresMatch = fusionDescription.match(/\*\*Key [Ff]eatures:\*\*([\s\S]*?)(?:\*\*[A-Z]|$)/);
  if (featuresMatch && featuresMatch[1]) {
    keyFeatures = featuresMatch[1].trim();
    console.log('✅ Extracted key features:', keyFeatures.substring(0, 100) + '...');
  }
  
  const textureMatch = fusionDescription.match(/\*\*Texture and [Ss]urface:\*\*([\s\S]*?)(?:\*\*[A-Z]|$)/);
  if (textureMatch && textureMatch[1]) {
    textureAndSurface = textureMatch[1].trim();
    console.log('✅ Extracted texture:', textureAndSurface.substring(0, 100) + '...');
  }
  
  const speciesMatch = fusionDescription.match(/\*\*Species [Ii]nfluence.*?:\*\*([\s\S]*?)(?:\*\*[A-Z]|$)/);
  if (speciesMatch && speciesMatch[1]) {
    speciesInfluence = speciesMatch[1].trim();
    console.log('✅ Extracted species influence:', speciesInfluence.substring(0, 100) + '...');
  }
  
  const expressionMatch = fusionDescription.match(/\*\*Attitude and [Ee]xpression:\*\*([\s\S]*?)(?:\*\*[A-Z]|$)/);
  if (expressionMatch && expressionMatch[1]) {
    attitudeAndExpression = expressionMatch[1].trim();
    console.log('✅ Extracted attitude:', attitudeAndExpression.substring(0, 100) + '...');
  }
  
  const accessoriesMatch = fusionDescription.match(/\*\*Notable [Aa]ccessories.*?:\*\*([\s\S]*?)(?:\*\*[A-Z]|$)/);
  if (accessoriesMatch && accessoriesMatch[1]) {
    notableAccessories = accessoriesMatch[1].trim();
    console.log('✅ Extracted accessories:', notableAccessories.substring(0, 100) + '...');
  }
  
  // Create the final prompt (similar to dalle.ts customPrompt structure)
  const finalPrompt = `Illustrate an original cartoon creature with ${bodyStructure}, using a ${colorPalette}. 
The creature features ${keyFeatures} with ${textureAndSurface}.
It has a ${speciesInfluence} aesthetic, displaying a ${attitudeAndExpression}.
Additional details include ${notableAccessories}.
The creature should be whimsical, expressive, and anime-inspired. 
Style it for a teenager-friendly, early 2000s anime look. Use smooth, clean outlines, cel-shading, soft shadows, and vibrant colors. 
The creature should have a fantasy/magical vibe and look like it could be from a Pokemon-style universe.
Do not recreate or reference any existing character or franchise.
Keep the background transparent, but ensure that the eyes are non-transparent.`;

  console.log('🎯 Final Qwen prompt created');
  console.log('Prompt preview:', finalPrompt.substring(0, 200) + '...');
  
  try {
    const input = {
      prompt: finalPrompt,
      guidance: 4,
      num_inference_steps: 50
    };

    console.log('📡 Calling Qwen API...');
    const output = await replicate.run("qwen/qwen-image", { input });
    
    console.log('✅ Qwen generation completed');
    return { output, finalPrompt };
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
 * Save text content to file
 */
function saveTextFile(content, filename) {
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`📝 Text saved to: ${filePath}`);
}

/**
 * Main test function
 */
async function runDirectFusionTest() {
  const timestamp = Date.now();
  const testId = `qwen-direct-fusion-${timestamp}`;
  
  console.log('🚀 Starting Qwen Direct Fusion Test');
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

    // Step 1: Analyze both Pokemon images
    console.log('STEP 1: Analyzing individual Pokemon images...');
    const gengarAnalysis = await analyzePokemonWithGPT(gengarImagePath, 'Gengar');
    const taurosAnalysis = await analyzePokemonWithGPT(taurosImagePath, 'Tauros');
    
    if (!gengarAnalysis || !taurosAnalysis) {
      throw new Error('Failed to analyze one or both Pokemon images');
    }

    // Save individual analyses
    saveTextFile(gengarAnalysis, `${testId}-gengar-analysis.txt`);
    saveTextFile(taurosAnalysis, `${testId}-tauros-analysis.txt`);

    // Step 2: Create fusion description
    console.log('\nSTEP 2: Creating fusion description...');
    const fusionDescription = await createFusionDescription(gengarAnalysis, taurosAnalysis);
    
    // Save fusion description
    saveTextFile(fusionDescription, `${testId}-fusion-description.txt`);

    // Step 3: Generate with Qwen
    console.log('\nSTEP 3: Generating fusion image with Qwen...');
    const { output: qwenOutput, finalPrompt } = await generateFusionWithQwen(fusionDescription);

    // Step 4: Download and save results
    console.log('\nSTEP 4: Saving results...');
    
    if (qwenOutput && qwenOutput.length > 0) {
      // Get the image URL
      const imageUrl = qwenOutput[0].url ? qwenOutput[0].url() : qwenOutput[0];
      console.log('📥 Image URL:', imageUrl);
      
      // Download and save the image
      const savedImagePath = await downloadAndSaveImage(imageUrl, `${testId}-fusion-output.webp`);
      
      // Save the final prompt used
      saveTextFile(finalPrompt, `${testId}-final-prompt.txt`);
      
      // Save URL for reference
      fs.writeFileSync(
        path.join(outputDir, `${testId}-url.txt`), 
        imageUrl, 
        'utf8'
      );

      console.log('\n🎉 Direct fusion test completed successfully!');
      console.log('==========================================');
      console.log('Results:');
      console.log(`- Gengar analysis: ${testId}-gengar-analysis.txt`);
      console.log(`- Tauros analysis: ${testId}-tauros-analysis.txt`);
      console.log(`- Fusion description: ${testId}-fusion-description.txt`);
      console.log(`- Final prompt: ${testId}-final-prompt.txt`);
      console.log(`- Generated image: ${testId}-fusion-output.webp`);
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
runDirectFusionTest();
