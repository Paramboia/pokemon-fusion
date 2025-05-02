// Standalone test script for gpt-image-1
// Run with: node tests/test-gpt-image1.js
require('dotenv').config({ path: '.env.local' });
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Setup logging to a file
const logFile = path.join(outputDir, `gpt-image1-test-${Date.now()}.log`);
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Function to log to both console and file
function logToFileAndConsole(type, ...args) {
  // Log to console as usual
  if (type === 'log') {
    originalConsoleLog(...args);
  } else {
    originalConsoleError(...args);
  }
  
  // Also log to file
  const timestamp = new Date().toISOString();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ');
  
  fs.appendFileSync(logFile, `[${timestamp}] ${type.toUpperCase()}: ${message}\n`);
}

// Override console.log and console.error
console.log = (...args) => logToFileAndConsole('log', ...args);
console.error = (...args) => logToFileAndConsole('error', ...args);

// Start logging
console.log('=====================================');
console.log('GPT-image-1 Test Log Started');
console.log('=====================================');

// Check if OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is not set');
  console.log(`Log file saved to: ${logFile}`);
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 180000, // 3 minutes timeout
  maxRetries: 1
});

// Define a generic enhancement prompt to avoid content policy issues
const ENHANCEMENT_PROMPT = `Use the uploaded image as inspiration.
Recreate the same figure design, keeping the body structure, pose, key features intact, and same color palette.
Only improve the artistic quality by using clean, smooth outlines, cel-shaded coloring, soft shading, and vivid colors.
The final style should be teenager-friendly, early 2000s anime-inspired, and polished.
Do not change the figure into a different animal, and do not change its overall body orientation.
Ensure the background is transparent.`;

// Test gpt-image-1 with a simple prompt
async function testGptImage1Simple() {
  console.log('\n=== Testing GPT-image-1 with a simple prompt ===');
  console.log('This may take up to 2 minutes as mentioned in the documentation...');
  
  const startTime = Date.now();
  try {
    // Make the API call with documented parameters (fixed quality value)
    console.log('Starting API call...');
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: 'A cartoon blue creature with a round body and big eyes',
      n: 1,
      size: '1024x1024',
      quality: 'medium', // Using 'medium' as documented in the API docs
      background: 'transparent',
      moderation: 'low'
    });
    
    const endTime = Date.now();
    const durationSecs = (endTime - startTime) / 1000;
    
    console.log(`API call completed in ${durationSecs.toFixed(2)} seconds`);
    console.log('Response format:', typeof response);
    console.log('Has data array:', !!response.data);
    
    // Process and save the image
    if (response.data && response.data[0]) {
      // Check if we have b64_json or url in the response
      if (response.data[0].b64_json) {
        const outputPath = path.join(outputDir, `gpt-image1-simple-${Date.now()}.png`);
        fs.writeFileSync(outputPath, Buffer.from(response.data[0].b64_json, 'base64'));
        console.log(`SUCCESS: Base64 image saved to ${outputPath}`);
        return true;
      } else if (response.data[0].url) {
        console.log(`SUCCESS: Image URL received: ${response.data[0].url}`);
        return true;
      } else {
        console.error('ERROR: No image data (neither b64_json nor url) in response');
        console.log('Response data keys:', Object.keys(response.data[0]));
        return false;
      }
    } else {
      console.error('ERROR: No data in response');
      console.log('Response structure:', JSON.stringify(response, null, 2));
      return false;
    }
  } catch (error) {
    const endTime = Date.now();
    const durationSecs = (endTime - startTime) / 1000;
    
    console.error(`ERROR after ${durationSecs.toFixed(2)} seconds:`, error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    return false;
  }
}

// Main function to run all tests
async function runTests() {
  console.log('=== GPT-image-1 Test Script ===');
  console.log('API Key available:', !!process.env.OPENAI_API_KEY);
  console.log('API Key format check:', process.env.OPENAI_API_KEY?.substring(0, 7) + '...');
  console.log('Log file:', logFile);
  
  try {
    // Run simple test
    const simpleTestResult = await testGptImage1Simple();
    
    console.log('\n=== Test Results ===');
    console.log('Simple prompt test:', simpleTestResult ? 'SUCCESS' : 'FAILED');
    
    if (simpleTestResult) {
      console.log('\nSUCCESS: GPT-image-1 is working correctly!');
      console.log('Check the output directory for generated images.');
    } else {
      console.log('\nWARNING: GPT-image-1 test failed.');
      console.log('Please check the error messages above or in the log file for more details.');
    }
  } catch (error) {
    console.error('\nUNEXPECTED ERROR:', error);
  }
  
  console.log(`\nComplete log saved to: ${logFile}`);
}

// Run the tests
runTests().catch(error => {
  console.error('FATAL ERROR:', error);
  console.log(`Log file saved to: ${logFile}`);
  process.exit(1);
}); 