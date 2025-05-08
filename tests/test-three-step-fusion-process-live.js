// Test the three-step fusion process with real API calls
// Replicate Blend → GPT-4 Vision Description → GPT-image-1 Enhancement
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Replicate = require('replicate');
const OpenAI = require('openai');
const sharp = require('sharp');

// Set test parameters
const POKEMON1 = "Gengar";
const POKEMON2 = "Tauros";

// API keys from environment variables
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Check if API keys are set
if (!REPLICATE_API_TOKEN) {
  console.warn("Warning: REPLICATE_API_TOKEN is not set in environment variables. The Replicate Blend step may fail.");
}

if (!OPENAI_API_KEY) {
  console.warn("Warning: OPENAI_API_KEY is not set in environment variables. The GPT-4 Vision and GPT-image-1 steps may fail.");
}

// Initialize Replicate client for the blend step
const replicate = new Replicate({
  auth: REPLICATE_API_TOKEN,
});

// Initialize OpenAI client for GPT-image-1
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Create output directory if it doesn't exist
const outputDir = path.join(process.cwd(), 'output', 'three-step-fusion-live');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to download an image
async function downloadImage(url, outputPath) {
  try {
    console.log(`Downloading image from ${url}`);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    
    await sharp(Buffer.from(response.data))
      .toFormat('png')
      .toFile(outputPath);
    
    console.log(`Image saved to ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`Error downloading image:`, error);
    throw error;
  }
}

// Function to get official Pokemon artwork URL
function getPokemonImageUrl(name) {
  // Convert name to lowercase for the API
  const lowercaseName = name.toLowerCase();
  return `https://pokeapi.co/api/v2/pokemon/${lowercaseName}/`;
}

// Function to get a Pokemon's official artwork
async function getPokemonOfficialArtwork(name) {
  try {
    console.log(`Getting official artwork for ${name}...`);
    
    // First try to see if we have it locally
    const localPath = path.join(process.cwd(), 'temp', `${name.toLowerCase()}.png`);
    if (fs.existsSync(localPath)) {
      console.log(`Using local image for ${name}: ${localPath}`);
      return localPath;
    }
    
    // Otherwise fetch from PokeAPI
    const response = await axios.get(getPokemonImageUrl(name));
    const artworkUrl = response.data.sprites.other['official-artwork'].front_default;
    
    if (!artworkUrl) {
      throw new Error(`No official artwork found for ${name}`);
    }
    
    // Download and save the image
    const outputPath = path.join(outputDir, `${name.toLowerCase()}.png`);
    return await downloadImage(artworkUrl, outputPath);
    
  } catch (error) {
    console.error(`Error getting artwork for ${name}:`, error);
    throw error;
  }
}

// STEP 1: Generate a fusion with Replicate Blend
async function generateWithReplicateBlend(pokemon1, pokemon2, image1Path, image2Path) {
  console.log(`\n=== STEP 1: Generating fusion with Replicate Blend: ${pokemon1} + ${pokemon2} ===`);
  
  try {
    // Check if we already have a blend result from a previous run
    const blendOutputPath = path.join(outputDir, `${pokemon1.toLowerCase()}-${pokemon2.toLowerCase()}-blend.png`);
    if (fs.existsSync(blendOutputPath)) {
      console.log(`Found existing blend result at: ${blendOutputPath}`);
      return { url: 'file://' + blendOutputPath, path: blendOutputPath };
    }
    
    // Convert file paths to base64 for the API
    const image1 = `data:image/png;base64,${fs.readFileSync(image1Path).toString('base64')}`;
    const image2 = `data:image/png;base64,${fs.readFileSync(image2Path).toString('base64')}`;
    
    // Create the input for the blend-images model
    const input = {
      image1: image1,
      image2: image2,
      num_outputs: 1,
      prompt: `Create a brand-new Pokémon that merges the traits of ${pokemon1} and ${pokemon2}, using ${pokemon1} as the base. 
              The new Pokémon should retain the same pose, angle, and overall body positioning as ${pokemon1}'s official artwork. 
              Design: Incorporate key physical features from both ${pokemon1} and ${pokemon2}, blending them into a seamless and natural-looking hybrid. 
              Art Style: Strictly follow Official Pokémon-style, cel-shaded, with clean outlines and smooth shading.
              Viewpoint: Match the exact pose and three-quarter front-facing angle of ${pokemon1}.
              Background: Pure white, no shadows, no extra elements.
              Composition: Only ONE full-body Pokémon in the image—no alternative angles, no evolution steps, no fusion schematics.
              Restrictions: No text, no labels, no extra Pokémon, no mechanical parts, no unnatural color combinations.`
    };
    
    console.log("Calling Replicate Blend API...");
    const output = await replicate.run(
      "charlesmccarthy/blend-images:1ed8aaaa04fa84f0c1191679e765d209b94866f6503038416dcbcb340fede892",
      { input }
    );
    
    console.log("Received response from Replicate Blend API");
    
    if (typeof output === 'string' && output.startsWith('http')) {
      // Save the image locally
      await downloadImage(output, blendOutputPath);
      
      console.log(`Initial fusion image saved to: ${blendOutputPath}`);
      console.log(`Initial fusion image URL: ${output}`);
      
      return { url: output, path: blendOutputPath };
    } else {
      console.error("Invalid output from Replicate Blend API:", output);
      throw new Error("Invalid output format");
    }
  } catch (error) {
    console.error("Error in Replicate Blend step:", error);
    throw error;
  }
}

// STEP 2: Generate description with GPT-4 Vision
async function generateDescriptionWithGPT4Vision(imagePath) {
  console.log(`\n=== STEP 2: Generating description with GPT-4 Vision ===`);
  
  // Check if description already exists
  const descriptionPath = `${outputDir}/${POKEMON1.toLowerCase()}-${POKEMON2.toLowerCase()}-description.txt`;
  if (fs.existsSync(descriptionPath)) {
    console.log(`Description already exists at ${descriptionPath}, reusing...`);
    return fs.readFileSync(descriptionPath, 'utf8');
  }
  
  // Convert image to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  
  // Create a detailed prompt for GPT-4 Vision
  const prompt = `You are an expert Pokemon designer. I'm showing you an AI-generated blend of ${POKEMON1} and ${POKEMON2}. 
  Please provide a detailed description of this Pokemon fusion so I can generate a high-quality version. Include:

  1. Body Structure: Describe the overall shape, proportions, and physical features.
  2. Color Palette: Detail the main colors and where they appear on the fusion.
  3. Key Features: Identify the most distinctive elements from each original Pokemon and how they've been combined.

  Make the description detailed but concise, focusing on visual elements.`;
  
  // Make API call to GPT-4 Vision
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });
    
    const description = completion.choices[0].message.content;
    console.log('Description generated successfully!');
    
    // Save description to file
    fs.writeFileSync(descriptionPath, description);
    console.log(`Description saved to ${descriptionPath}`);
    
    return description;
  } catch (error) {
    console.error('Error generating description with GPT-4 Vision:', error);
    throw error;
  }
}

// Extract key elements from the description
function parseDescription(description) {
  console.log("Parsing description to extract key elements...");
  
  let bodyStructure = "unknown body structure";
  let colorPalette = "vibrant colors";
  let keyFeatures = "distinctive features";
  
  // Try to extract the sections from the description
  const bodyMatch = description.match(/Body structure and pose:([\s\S]*?)(?:Color palette:|$)/);
  if (bodyMatch && bodyMatch[1]) {
    bodyStructure = bodyMatch[1].trim();
  }
  
  const colorMatch = description.match(/Color palette:([\s\S]*?)(?:Key features:|$)/);
  if (colorMatch && colorMatch[1]) {
    colorPalette = colorMatch[1].trim();
  }
  
  const featuresMatch = description.match(/Key features:([\s\S]*?)$/);
  if (featuresMatch && featuresMatch[1]) {
    keyFeatures = featuresMatch[1].trim();
  }
  
  console.log("Extracted elements:");
  console.log("- Body structure:", bodyStructure.substring(0, 50) + "...");
  console.log("- Color palette:", colorPalette.substring(0, 50) + "...");
  console.log("- Key features:", keyFeatures.substring(0, 50) + "...");
  
  return { bodyStructure, colorPalette, keyFeatures };
}

// STEP 3: Generate the final image with GPT-image-1
async function generateFinalImageWithGPTImage(description) {
  console.log(`\n=== STEP 3: Generating final image with GPT-image-1 ===`);
  
  try {
    // Check if we already have a final result from a previous run
    const finalImagePath = path.join(outputDir, `${POKEMON1.toLowerCase()}-${POKEMON2.toLowerCase()}-final.png`);
    if (fs.existsSync(finalImagePath)) {
      console.log(`Found existing final result at: ${finalImagePath}`);
      return finalImagePath;
    }
    
    // Parse the description to extract key elements
    const { bodyStructure, colorPalette, keyFeatures } = parseDescription(description);
    
    // Create a prompt for GPT-image-1
    const customPrompt = `Illustrate an original cartoon creature with ${bodyStructure}, using a ${colorPalette}. 
The creature features ${keyFeatures}. 
Style it in early 2000s anime with smooth outlines, cel shading, and soft shadows. 
Keep the background transparent.`;
    
    console.log("Generated custom prompt for GPT-image-1:");
    console.log(customPrompt);
    
    // Save the prompt to a file
    const promptPath = path.join(outputDir, `${POKEMON1.toLowerCase()}-${POKEMON2.toLowerCase()}-prompt.txt`);
    fs.writeFileSync(promptPath, customPrompt);
    
    console.log("Calling GPT-image-1 API...");
    
    // Make the API call to GPT-image-1
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: customPrompt,
      n: 1,
      size: "1024x1024",
      quality: "high"
    });
    
    // Check if we got a URL response
    if (response.data[0].url) {
      const finalImageUrl = response.data[0].url;
      console.log("Received URL from GPT-image-1:", finalImageUrl);
      
      // Save the final image
      await downloadImage(finalImageUrl, finalImagePath);
      
      console.log(`Final enhanced image saved to: ${finalImagePath}`);
      return finalImagePath;
    } 
    // Check if we got base64 data
    else if (response.data[0].b64_json) {
      console.log("Received base64 data from GPT-image-1");
      
      // Save the base64 image
      const imageBuffer = Buffer.from(response.data[0].b64_json, 'base64');
      fs.writeFileSync(finalImagePath, imageBuffer);
      
      console.log(`Final enhanced image saved to: ${finalImagePath}`);
      return finalImagePath;
    }
    else {
      console.error("No valid data in GPT-image-1 response");
      throw new Error("Invalid response from GPT-image-1");
    }
  } catch (error) {
    console.error("Error in GPT-image-1 generation step:", error);
    throw error;
  }
}

// Main function to run the three-step process
async function runThreeStepFusionProcess() {
  console.log(`\n====== LIVE THREE-STEP FUSION PROCESS ======`);
  console.log(`Fusing ${POKEMON1} with ${POKEMON2}`);
  
  try {
    // Get Pokemon images
    const pokemon1Path = await getPokemonOfficialArtwork(POKEMON1);
    const pokemon2Path = await getPokemonOfficialArtwork(POKEMON2);
    
    console.log(`Using images: ${pokemon1Path} and ${pokemon2Path}`);
    
    // Step 1: Generate initial fusion with Replicate Blend
    const blendResult = await generateWithReplicateBlend(POKEMON1, POKEMON2, pokemon1Path, pokemon2Path);
    
    // Step 2: Generate description with GPT-4 Vision
    const description = await generateDescriptionWithGPT4Vision(blendResult.path);
    
    // Step 3: Generate final image with GPT-image-1
    const finalImagePath = await generateFinalImageWithGPTImage(description);
    
    console.log(`\n====== FUSION PROCESS COMPLETED SUCCESSFULLY ======`);
    console.log(`Initial blend: ${blendResult.path}`);
    console.log(`Final image: ${finalImagePath}`);
    
  } catch (error) {
    console.error("Error in fusion process:", error);
  }
}

// Run the test
runThreeStepFusionProcess(); 