/**
 * Script to check if environment variables for image enhancement are properly set
 * 
 * Run this script with: node scripts/check-env.js
 */

const fs = require('fs');
const path = require('path');

// Define the environment variables needed for image enhancement
const requiredVars = [
  'REPLICATE_API_TOKEN',
  'OPENAI_API_KEY',
  'USE_GPT_VISION_ENHANCEMENT',
  'SAVE_LOCAL_COPIES',
  'ENHANCEMENT_TIMEOUT'
];

// Define the directory path for image storage
const outputDirPath = path.join(process.cwd(), 'public', 'pending_enhancement_output');

// Check if the directory exists
console.log(`Checking if directory exists: ${outputDirPath}`);
if (!fs.existsSync(outputDirPath)) {
  try {
    fs.mkdirSync(outputDirPath, { recursive: true });
    console.log(`Created directory: ${outputDirPath}`);
  } catch (error) {
    console.error(`Error creating directory: ${error.message}`);
  }
} else {
  console.log(`Directory already exists: ${outputDirPath}`);
  
  // Check if the directory is writable
  try {
    const testFile = path.join(outputDirPath, 'test-write.txt');
    fs.writeFileSync(testFile, 'Test write', 'utf8');
    fs.unlinkSync(testFile);
    console.log('Directory is writable');
  } catch (error) {
    console.error(`Directory is not writable: ${error.message}`);
  }
}

// Check environment variables
console.log('\nChecking environment variables:');
const missingVars = [];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingVars.push(varName);
    console.log(`- ${varName}: MISSING`);
  } else {
    const maskedValue = varName.includes('KEY') || varName.includes('TOKEN') 
      ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` 
      : value;
    console.log(`- ${varName}: ${maskedValue}`);
  }
});

if (missingVars.length > 0) {
  console.log(`\nMissing ${missingVars.length} environment variables that are needed for image enhancement!`);
  console.log('Add the following to your .env file or environment:');
  
  missingVars.forEach(varName => {
    let defaultValue = '';
    if (varName === 'USE_GPT_VISION_ENHANCEMENT') defaultValue = 'true';
    if (varName === 'SAVE_LOCAL_COPIES') defaultValue = 'true';
    if (varName === 'ENHANCEMENT_TIMEOUT') defaultValue = '60000';
    
    console.log(`${varName}=${defaultValue}`);
  });
} else {
  console.log('\nAll required environment variables are set!');
}

// Check enhancement settings
console.log('\nCurrent image enhancement settings:');
console.log(`- USE_GPT_VISION_ENHANCEMENT: ${process.env.USE_GPT_VISION_ENHANCEMENT || 'false'}`);
console.log(`- SAVE_LOCAL_COPIES: ${process.env.SAVE_LOCAL_COPIES || 'false'}`);
console.log(`- ENHANCEMENT_TIMEOUT: ${process.env.ENHANCEMENT_TIMEOUT || '45000'} ms`);

// Guide for enabling enhancement
if (process.env.USE_GPT_VISION_ENHANCEMENT !== 'true') {
  console.log('\nTo enable image enhancement, set USE_GPT_VISION_ENHANCEMENT=true');
}

if (process.env.SAVE_LOCAL_COPIES !== 'true') {
  console.log('\nTo enable local image saving, set SAVE_LOCAL_COPIES=true');
}

console.log('\nCheck completed.'); 