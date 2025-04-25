// Test OpenAI image editing endpoint using direct API calls
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { Readable } = require('stream');

async function testOpenAIImageEditDirect() {
  try {
    console.log("\n=== Testing OpenAI Image Editing Direct API ===");
    
    // Define image data
    const image1 = {
      name: "Character 1",
      imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
    };
    
    const image2 = {
      name: "Character 2",
      imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png"
    };
    
    console.log(`Generating fusion between character images`);
    
    // Download the images first
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const image1Path = path.join(outputDir, 'source1.png');
    const image2Path = path.join(outputDir, 'source2.png');
    
    // Download images
    const [image1Response, image2Response] = await Promise.all([
      axios.get(image1.imageUrl, { responseType: 'arraybuffer' }),
      axios.get(image2.imageUrl, { responseType: 'arraybuffer' })
    ]);
    
    fs.writeFileSync(image1Path, image1Response.data);
    fs.writeFileSync(image2Path, image2Response.data);
    
    console.log("Source images downloaded successfully");
    
    // Create a mask image for the base image (lower half transparent)
    const maskPath = path.join(outputDir, 'mask.png');
    await generateSimpleMask(image1Path, maskPath, 'lower-half');
    
    // Create the prompt for the fusion
    const prompt = `Create a cohesive blend of the visual elements from both reference images:
      - Maintain the overall structure and pose of image 1
      - Incorporate colors and design elements from image 2
      - Focus changes on the masked area only
      - Keep the artistic style consistent
      - Use clean white background
      - Create a harmonious composition`;
    
    console.log("Running image editing with prompt:", prompt);
    
    // Create a FormData instance for proper content type handling
    const formData = new FormData();
    formData.append('model', 'gpt-image-1');
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    
    // Add the image file with explicit content type
    formData.append('image', fs.readFileSync(image1Path), {
      filename: 'image.png',
      contentType: 'image/png',
    });
    
    // Add the mask file with explicit content type
    formData.append('mask', fs.readFileSync(maskPath), {
      filename: 'mask.png',
      contentType: 'image/png',
    });
    
    // Call the OpenAI API directly using axios
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    const response = await axios.post(
      'https://api.openai.com/v1/images/edits',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${openaiApiKey}`
        }
      }
    );
    
    console.log("API Response Status:", response.status);
    
    // Save the results
    if (response.data && response.data.data && response.data.data.length > 0) {
      const imageData = response.data.data[0];
      const outputFilename = "openai-direct-fusion";
      
      if (imageData.url) {
        // Save URL to file
        const outputUrlPath = path.join(outputDir, `${outputFilename}-url.txt`);
        fs.writeFileSync(outputUrlPath, imageData.url);
        console.log(`Image URL saved to ${outputUrlPath}`);
        
        // Download and save the image
        const imageResponse = await axios.get(imageData.url, { responseType: 'arraybuffer' });
        const imagePath = path.join(outputDir, `${outputFilename}.png`);
        fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));
        console.log(`Image downloaded and saved to ${imagePath}`);
      } else if (imageData.b64_json) {
        // Save base64 data to file
        const imagePath = path.join(outputDir, `${outputFilename}.png`);
        fs.writeFileSync(imagePath, Buffer.from(imageData.b64_json, 'base64'));
        console.log(`Image saved to ${imagePath}`);
      }
      
      console.log("Success! The image editing test completed.");
    } else {
      console.log("No image data in response");
      console.log("Response data:", response.data);
    }
    
  } catch (error) {
    console.error("Error in OpenAI direct test:", error);
    
    if (error.response) {
      console.error("API Error Response:", {
        status: error.response.status,
        data: error.response.data
      });
    }
  }
}

// Simple function to generate a mask image
async function generateSimpleMask(sourcePath, outputPath, maskType = 'lower-half') {
  try {
    console.log(`Creating a simple ${maskType} mask`);
    
    // Use the canvas module to create a mask
    const { createCanvas, loadImage } = require('canvas');
    
    // Load the source image
    const image = await loadImage(sourcePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the source image
    ctx.drawImage(image, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Set transparency based on mask type
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        
        let shouldBeMasked = false;
        
        switch (maskType) {
          case 'lower-half':
            shouldBeMasked = y > canvas.height / 2;
            break;
          case 'upper-half':
            shouldBeMasked = y < canvas.height / 2;
            break;
          case 'right-half':
            shouldBeMasked = x > canvas.width / 2;
            break;
          case 'left-half':
            shouldBeMasked = x < canvas.width / 2;
            break;
        }
        
        // If this pixel should be masked, make it transparent
        if (shouldBeMasked) {
          data[idx + 3] = 0; // Alpha channel
        }
      }
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
    
    // Save to a file
    const stream = fs.createWriteStream(outputPath);
    const pngStream = canvas.createPNGStream();
    
    await new Promise((resolve, reject) => {
      pngStream.pipe(stream);
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    
    console.log(`Mask created at: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error("Error generating mask:", error);
    throw error;
  }
}

// Run the test
testOpenAIImageEditDirect().then(() => {
  console.log("\nTest completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 