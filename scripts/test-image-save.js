/**
 * Script to test direct image saving to the pending_enhancement_output directory
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');

// Define a test Pokemon image URL
const TEST_IMAGE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png'; // Pikachu

// Test function to download and save an image
async function downloadAndSaveImage() {
  try {
    // Create directory path if it doesn't exist
    const outputDirPath = path.join(process.cwd(), 'public', 'pending_enhancement_output');
    if (!fs.existsSync(outputDirPath)) {
      console.log(`Creating directory: ${outputDirPath}`);
      fs.mkdirSync(outputDirPath, { recursive: true });
      console.log(`Created directory: ${outputDirPath}`);
    } else {
      console.log(`Directory already exists: ${outputDirPath}`);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `test-save_pikachu_${timestamp}.png`;
    const filePath = path.join(outputDirPath, filename);
    const relativeFilePath = `/pending_enhancement_output/${filename}`;

    // Download the image
    console.log(`Downloading image from ${TEST_IMAGE_URL}...`);
    const response = await axios.get(TEST_IMAGE_URL, { 
      responseType: 'arraybuffer', 
      timeout: 15000
    });
    
    // Save the image using sharp
    await sharp(Buffer.from(response.data))
      .toFormat('png')
      .toFile(filePath);

    console.log(`Saved image to ${filePath}`);
    
    // Verify the file was actually saved
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`Verified file exists with size: ${stats.size} bytes`);
      return {
        success: true,
        path: filePath,
        size: stats.size
      };
    } else {
      console.error(`File was not saved successfully: ${filePath}`);
      return {
        success: false,
        error: 'File does not exist after save operation'
      };
    }
  } catch (error) {
    console.error(`Error saving image: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
console.log('Starting image save test...');
process.env.SAVE_LOCAL_COPIES = 'true'; // Force enable for testing

downloadAndSaveImage()
  .then(result => {
    console.log('Test completed with result:', result);
    if (result.success) {
      console.log('✅ SUCCESS: Image was downloaded and saved successfully!');
    } else {
      console.log('❌ FAILED: Could not save the image.');
    }
  })
  .catch(err => {
    console.error('Test failed with error:', err);
  }); 