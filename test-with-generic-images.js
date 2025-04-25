// Test OpenAI image editing with generic abstract images
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { createCanvas, loadImage } = require('canvas');

async function testWithGenericImages() {
  try {
    console.log("\n=== Testing OpenAI Image Editing with Abstract Images ===");
    
    // Define source image URLs (will be abstracted before use)
    const sourceImageUrl1 = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png";
    const sourceImageUrl2 = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png";
    
    // Create the output directory
    const outputDir = path.join(__dirname, 'abstract-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Download the source images
    console.log("Downloading source images...");
    const [sourceImage1Data, sourceImage2Data] = await Promise.all([
      axios.get(sourceImageUrl1, { responseType: 'arraybuffer' }),
      axios.get(sourceImageUrl2, { responseType: 'arraybuffer' })
    ]);
    
    // Save the original images
    const sourceImage1Path = path.join(outputDir, 'original1.png');
    const sourceImage2Path = path.join(outputDir, 'original2.png');
    fs.writeFileSync(sourceImage1Path, sourceImage1Data.data);
    fs.writeFileSync(sourceImage2Path, sourceImage2Data.data);
    
    // Create abstract versions of the images
    console.log("Creating abstract versions of the images...");
    const abstractImage1Path = path.join(outputDir, 'abstract1.png');
    const abstractImage2Path = path.join(outputDir, 'abstract2.png');
    
    await Promise.all([
      createAbstractImage(sourceImage1Path, abstractImage1Path, 'pixelate'),
      createAbstractImage(sourceImage2Path, abstractImage2Path, 'edges')
    ]);
    
    // Create a mask (lower half of abstract image 1)
    console.log("Creating mask...");
    const maskPath = path.join(outputDir, 'mask.png');
    await createMask(abstractImage1Path, maskPath, 'lower-half');
    
    // Set up the API call parameters
    const prompt = `Blend the shapes, colors, and patterns of these abstract images:
      - Keep the structure of the first image
      - Apply colors and patterns from the second image to the masked area
      - Create a clean, cohesive result
      - Maintain simplicity and balance`;
    
    console.log("Calling OpenAI API with abstract images...");
    
    // Create a FormData instance for the API call
    const formData = new FormData();
    formData.append('model', 'gpt-image-1');
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    
    // Add the images with proper content types
    formData.append('image', fs.readFileSync(abstractImage1Path), {
      filename: 'abstract1.png',
      contentType: 'image/png',
    });
    
    formData.append('mask', fs.readFileSync(maskPath), {
      filename: 'mask.png',
      contentType: 'image/png',
    });
    
    // Make the API call
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    try {
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
      
      // Process and save the result
      if (response.data && response.data.data && response.data.data.length > 0) {
        const imageData = response.data.data[0];
        
        if (imageData.url) {
          console.log("Result URL:", imageData.url);
          
          // Download and save the result image
          const resultResponse = await axios.get(imageData.url, { responseType: 'arraybuffer' });
          const resultPath = path.join(outputDir, 'result.png');
          fs.writeFileSync(resultPath, Buffer.from(resultResponse.data));
          
          console.log(`Result saved to: ${resultPath}`);
          console.log("Success! Test completed.");
        } else if (imageData.b64_json) {
          // Save base64 result
          const resultPath = path.join(outputDir, 'result.png');
          fs.writeFileSync(resultPath, Buffer.from(imageData.b64_json, 'base64'));
          console.log(`Result saved to: ${resultPath}`);
          console.log("Success! Test completed.");
        }
      } else {
        console.log("No image data in response");
        console.log("Response data:", response.data);
      }
    } catch (apiError) {
      console.error("API Error:", apiError.message);
      
      if (apiError.response) {
        console.error("API Error Details:", {
          status: apiError.response.status,
          data: apiError.response.data
        });
      }
    }
    
  } catch (error) {
    console.error("Error in test:", error);
  }
}

// Function to create an abstract version of an image
async function createAbstractImage(sourcePath, outputPath, effect = 'pixelate') {
  try {
    console.log(`Creating abstract image with ${effect} effect...`);
    
    // Load the source image
    const image = await loadImage(sourcePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Apply the specified effect
    switch (effect) {
      case 'pixelate':
        // Draw the original image
        ctx.drawImage(image, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Pixelate effect (create large blocks)
        const blockSize = Math.max(10, Math.floor(canvas.width / 20));
        
        for (let y = 0; y < canvas.height; y += blockSize) {
          for (let x = 0; x < canvas.width; x += blockSize) {
            // Get the color of the first pixel in the block
            const index = (y * canvas.width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];
            
            // Fill the entire block with this color
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
            ctx.fillRect(x, y, blockSize, blockSize);
          }
        }
        break;
        
      case 'edges':
        // Draw the original image
        ctx.drawImage(image, 0, 0);
        
        // Get image data
        const edgeData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = edgeData.data;
        
        // Simple edge detection
        const edgePixels = new Uint8ClampedArray(pixels.length);
        
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            const idx = (y * canvas.width + x) * 4;
            
            // Get surrounding pixels
            const left = (y * canvas.width + (x - 1)) * 4;
            const right = (y * canvas.width + (x + 1)) * 4;
            const up = ((y - 1) * canvas.width + x) * 4;
            const down = ((y + 1) * canvas.width + x) * 4;
            
            // Calculate differences
            const diffX = Math.abs(pixels[left] - pixels[right]) +
                          Math.abs(pixels[left + 1] - pixels[right + 1]) +
                          Math.abs(pixels[left + 2] - pixels[right + 2]);
                          
            const diffY = Math.abs(pixels[up] - pixels[down]) +
                          Math.abs(pixels[up + 1] - pixels[down + 1]) +
                          Math.abs(pixels[up + 2] - pixels[down + 2]);
            
            // Detect edge (simple threshold)
            const edge = (diffX + diffY) > 100 ? 255 : 0;
            
            // Set edge pixel
            edgePixels[idx] = edge;
            edgePixels[idx + 1] = edge;
            edgePixels[idx + 2] = edge;
            edgePixels[idx + 3] = pixels[idx + 3]; // Keep original alpha
          }
        }
        
        // Put the edge data back - use canvas createImageData instead of direct ImageData constructor
        const edgeImageData = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < edgePixels.length; i++) {
          edgeImageData.data[i] = edgePixels[i];
        }
        ctx.putImageData(edgeImageData, 0, 0);
        break;
        
      default:
        // Just draw the original if no effect specified
        ctx.drawImage(image, 0, 0);
    }
    
    // Save the image
    const out = fs.createWriteStream(outputPath);
    const stream = canvas.createPNGStream();
    
    await new Promise((resolve, reject) => {
      stream.pipe(out);
      out.on('finish', resolve);
      out.on('error', reject);
    });
    
    console.log(`Abstract image saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error("Error creating abstract image:", error);
    throw error;
  }
}

// Function to create a mask
async function createMask(sourcePath, outputPath, maskType = 'lower-half') {
  try {
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
    const out = fs.createWriteStream(outputPath);
    const stream = canvas.createPNGStream();
    
    await new Promise((resolve, reject) => {
      stream.pipe(out);
      out.on('finish', resolve);
      out.on('error', reject);
    });
    
    console.log(`Mask created at: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error("Error creating mask:", error);
    throw error;
  }
}

// Run the test
testWithGenericImages().then(() => {
  console.log("\nTest with generic images completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 