require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Test the new GPT Image model
async function testGptImage() {
  try {
    console.log('\n=== Testing OpenAI GPT Image model (gpt-image-1) ===');
    console.log('Note: This model requires organization verification with OpenAI');
    
    const prompt = "A highly detailed pixel art of a Pokemon fusion between Pikachu and Charmander, with a transparent background";
    
    console.log(`Generating image with prompt: "${prompt}"`);
    console.log('This may take up to 2 minutes as mentioned in the documentation...');
    
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "high",  // options: low, medium, high, auto
      background: "transparent",  // Enable transparent background
    });

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Log the result to see its structure
    console.log('API Response for GPT Image:', JSON.stringify(result, null, 2));

    // Save the generated image data
    if (result.data && result.data.length > 0) {
      // Check what kind of data we got back (URL or base64)
      if (result.data[0].url) {
        const outputPath = path.join(outputDir, 'gpt-image-url.txt');
        fs.writeFileSync(outputPath, result.data[0].url);
        console.log(`GPT Image URL saved to: ${outputPath}`);
        
        // Additionally download the image
        try {
          const response = await axios.get(result.data[0].url, { responseType: 'arraybuffer' });
          const imagePath = path.join(outputDir, 'gpt-image-pokemon.png');
          fs.writeFileSync(imagePath, response.data);
          console.log(`GPT Image downloaded and saved to: ${imagePath}`);
        } catch (downloadError) {
          console.error('Error downloading the image:', downloadError.message);
        }
      } else if (result.data[0].b64_json) {
        const image_base64 = result.data[0].b64_json;
        const image_bytes = Buffer.from(image_base64, "base64");
        const imagePath = path.join(outputDir, 'gpt-image-pokemon.png');
        fs.writeFileSync(imagePath, image_bytes);
        console.log(`GPT Image successfully saved to: ${imagePath}`);
      } else {
        console.log('No image data or URL found in the response');
      }
    }
    
    // Print additional result details if available
    if (result.data && result.data.length > 0 && result.data[0].revised_prompt) {
      console.log('Generation details:');
      console.log('- Model used:', 'gpt-image-1');
      console.log('- Revised prompt:', result.data[0].revised_prompt);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error generating GPT Image:', error);
    
    if (error.status === 403 && error.error && error.error.message && 
        error.error.message.includes('organization verification')) {
      console.log('\n=== ORGANIZATION VERIFICATION REQUIRED ===');
      console.log('To access gpt-image-1, please complete organization verification:');
      console.log('https://help.openai.com/en/articles/10910291-api-organization-verification');
      console.log('Once verified, you can run this test again.');
    }
    
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    return { success: false, error };
  }
}

// Test DALL·E 3 image generation (keeping for comparison)
async function testDallE3() {
  try {
    console.log('\n=== Testing OpenAI DALL·E 3 image generation ===');
    
    // Basic image generation with DALL·E 3 model
    const prompt = "A cute Pokemon fusion between Pikachu and Charmander in a vibrant forest setting";
    
    console.log(`Generating image with prompt: "${prompt}"`);
    console.log('This may take a moment...');
    
    const result = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard", // options for DALL·E 3: standard, hd
      style: "vivid", // options: vivid, natural
    });

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Log the result to see its structure
    console.log('API Response for DALL·E 3:', JSON.stringify(result, null, 2));

    // Save the generated image URL or base64 data
    if (result.data && result.data.length > 0) {
      const outputPath = path.join(outputDir, 'dalle3-pokemon-url.txt');
      
      // Check what kind of data we got back (URL or base64)
      if (result.data[0].url) {
        fs.writeFileSync(outputPath, result.data[0].url);
        console.log(`DALL·E 3 Image URL saved to: ${outputPath}`);
        
        // Additionally download the image
        try {
          const response = await axios.get(result.data[0].url, { responseType: 'arraybuffer' });
          const imagePath = path.join(outputDir, 'dalle3-pokemon.png');
          fs.writeFileSync(imagePath, response.data);
          console.log(`DALL·E 3 Image downloaded and saved to: ${imagePath}`);
        } catch (downloadError) {
          console.error('Error downloading the image:', downloadError.message);
        }
      } else if (result.data[0].b64_json) {
        const image_base64 = result.data[0].b64_json;
        const image_bytes = Buffer.from(image_base64, "base64");
        const imagePath = path.join(outputDir, 'dalle3-pokemon.png');
        fs.writeFileSync(imagePath, image_bytes);
        console.log(`DALL·E 3 Image successfully saved to: ${imagePath}`);
      } else {
        console.log('No image data or URL found in the response');
      }
    }
    
    // Print additional result details if available
    if (result.data && result.data.length > 0 && result.data[0].revised_prompt) {
      console.log('Generation details:');
      console.log('- Model used:', 'dall-e-3');
      console.log('- Revised prompt:', result.data[0].revised_prompt);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error generating DALL·E 3 image:', error);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    return { success: false, error };
  }
}

// Test DALL·E 2 image generation (keeping for comparison)
async function testDallE2() {
  try {
    console.log('\n=== Testing DALL·E 2 image generation ===');
    
    const prompt = "A Pokemon character in pixel art style";
    
    console.log(`Generating image with prompt: "${prompt}"`);
    
    const result = await openai.images.generate({
      model: "dall-e-2",
      prompt,
      n: 1,
      size: "1024x1024", // options for DALL·E 2: 256x256, 512x512, or 1024x1024
      response_format: "url", // options: url or b64_json
    });

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Log the result to see its structure
    console.log('API Response for DALL·E 2:', JSON.stringify(result, null, 2));

    // Save the generated image data
    if (result.data && result.data.length > 0) {
      const outputPath = path.join(outputDir, 'dalle2-pokemon-url.txt');
      
      // Check what kind of data we got back (URL or base64)
      if (result.data[0].url) {
        fs.writeFileSync(outputPath, result.data[0].url);
        console.log(`DALL·E 2 Image URL saved to: ${outputPath}`);
        
        // Additionally download the image
        try {
          const response = await axios.get(result.data[0].url, { responseType: 'arraybuffer' });
          const imagePath = path.join(outputDir, 'dalle2-pokemon.png');
          fs.writeFileSync(imagePath, response.data);
          console.log(`DALL·E 2 Image downloaded and saved to: ${imagePath}`);
        } catch (downloadError) {
          console.error('Error downloading the image:', downloadError.message);
        }
      } else if (result.data[0].b64_json) {
        const image_base64 = result.data[0].b64_json;
        const image_bytes = Buffer.from(image_base64, "base64");
        const imagePath = path.join(outputDir, 'dalle2-pokemon.png');
        fs.writeFileSync(imagePath, image_bytes);
        console.log(`DALL·E 2 Image saved to: ${imagePath}`);
      } else {
        console.log('No image data or URL found in the response');
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error generating DALL·E 2 image:', error);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    return { success: false, error };
  }
}

// Run the tests
async function runTests() {
  // First, try the new GPT Image model
  await testGptImage();
  
  // Uncomment the following lines if you want to test DALL·E models as well
  // console.log('\n=== Testing Other OpenAI Image Models for Comparison ===');
  // await testDallE3();
  // await testDallE2();
  
  console.log('\nTests completed!');
}

// Function to download an image from a URL
async function downloadImage(url, outputPath) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(outputPath, response.data);
    return true;
  } catch (error) {
    console.error('Error downloading image:', error.message);
    return false;
  }
}

runTests(); 