// Advanced test of Stability AI's Stable Diffusion 3.5 model for Pokemon fusion
require('dotenv').config({ path: '.env.local' });
const Replicate = require('replicate');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { writeFile } = require('fs/promises');
const readline = require('readline');

// Initialize the Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Create interactive command line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Default model parameters
const defaultParams = {
  width: 1024,
  height: 1024,
  num_outputs: 2,
  guidance_scale: 7.5,
  apply_watermark: false,
  high_noise_frac: 0.8,
  negative_prompt: "deformed, ugly, bad anatomy, poor drawing, poorly drawn, lowres, blurry"
};

async function promptUser(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function testStableDiffusion35Advanced() {
  try {
    console.log("\n=== Advanced Testing of Stable Diffusion 3.5 for Pokemon Fusion ===");
    console.log("API Token check:", process.env.REPLICATE_API_TOKEN?.substring(0, 5) + "...");
    
    // Get user input for Pokemon names
    const pokemon1 = await promptUser("Enter first Pokemon name (default: Pikachu): ") || "Pikachu";
    const pokemon2 = await promptUser("Enter second Pokemon name (default: Charizard): ") || "Charizard";
    
    // Ask for prompt modifiers
    const promptModifier = await promptUser("Enter any additional prompt modifiers (optional): ");
    
    // Ask for style choice
    console.log("\nChoose a style for the fusion:");
    console.log("1. Game official art style (default)");
    console.log("2. Realistic 3D rendering");
    console.log("3. Anime/manga style");
    console.log("4. Watercolor painting");
    const styleChoice = await promptUser("Enter style number (1-4): ") || "1";
    
    let stylePrompt = "";
    switch (styleChoice) {
      case "2":
        stylePrompt = "realistic 3D rendering, photorealistic, detailed textures, studio lighting";
        break;
      case "3":
        stylePrompt = "anime style, manga illustration, vibrant colors, clean lines";
        break;
      case "4":
        stylePrompt = "watercolor painting style, soft colors, artistic, hand-painted";
        break;
      default:
        stylePrompt = "official Pokemon game art style, vibrant colors, digital art";
    }
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    console.log(`\nGenerating fusion between: ${pokemon1} and ${pokemon2}`);
    console.log(`Style: ${stylePrompt}`);
    if (promptModifier) console.log(`Additional modifiers: ${promptModifier}`);
    console.log("\nThis may take a few minutes...");
    
    // Create the base prompt
    const basePrompt = `A fusion of ${pokemon1} and ${pokemon2} Pokemon. The creature has features from both Pokemon.`;
    
    // Create the full prompt with style and modifiers
    const fullPrompt = `${basePrompt} ${stylePrompt}. ${promptModifier}`.trim();
    
    // Create the input for the Stable Diffusion 3.5 model
    const input = {
      prompt: fullPrompt,
      ...defaultParams
    };
    
    // Run the model
    console.log("Running Stable Diffusion 3.5 model...");
    console.log(`Full prompt: "${fullPrompt}"`);
    
    const output = await replicate.run(
      "stability-ai/stable-diffusion-3.5-large",
      { input }
    );
    
    if (output && output.length > 0) {
      console.log(`Model returned ${output.length} image(s)`);
      
      // Create a subfolder for this specific fusion
      const fusionFolder = path.join(outputDir, `${pokemon1}-${pokemon2}-fusion`);
      if (!fs.existsSync(fusionFolder)) {
        fs.mkdirSync(fusionFolder);
      }
      
      // Save the prompt to a file
      const promptPath = path.join(fusionFolder, "prompt.txt");
      fs.writeFileSync(promptPath, fullPrompt);
      console.log(`Prompt saved to ${promptPath}`);
      
      // Download and save the images
      try {
        for (const [index, imageUrl] of output.entries()) {
          const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const imagePath = path.join(fusionFolder, `fusion-${index}.webp`);
          await writeFile(imagePath, Buffer.from(imageResponse.data));
          console.log(`Image ${index+1} downloaded and saved to ${imagePath}`);
        }
        
        console.log(`\nSuccess! Generated ${output.length} Pokemon fusion image(s).`);
      } catch (downloadError) {
        console.error('Error downloading the images:', downloadError.message);
      }
    } else {
      console.error("No output received from Stable Diffusion 3.5 model");
    }
    
  } catch (error) {
    console.error("Error using Replicate:", error);
    
    // Check for common errors
    if (error.message) {
      if (error.message.includes('API token') || error.message.includes('auth')) {
        console.error("\nAPI token error. Please check your REPLICATE_API_TOKEN environment variable.");
        console.error("You can sign up for a free Replicate account at https://replicate.com/");
      } else if (error.message.includes('rate limit')) {
        console.error("\nRate limit reached. Please try again later.");
      }
    }
  } finally {
    // Close the readline interface
    rl.close();
  }
}

// Run the test
testStableDiffusion35Advanced().then(() => {
  console.log("\nTest completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
}); 