/**
 * Configuration for the image generation API
 * This file ensures all required environment variables have default values
 */

// Force set environment variables if not already set
export function initializeConfig() {
  // Default to true for image saving
  if (process.env.SAVE_LOCAL_COPIES === undefined) {
    console.log('Setting SAVE_LOCAL_COPIES=true (default)');
    process.env.SAVE_LOCAL_COPIES = 'true';
  }

  // Default to true for enhancement
  if (process.env.USE_GPT_VISION_ENHANCEMENT === undefined) {
    console.log('Setting USE_GPT_VISION_ENHANCEMENT=true (default)');
    process.env.USE_GPT_VISION_ENHANCEMENT = 'true';
  }

  // Default to true for Replicate Blend
  if (process.env.USE_REPLICATE_BLEND === undefined) {
    console.log('Setting USE_REPLICATE_BLEND=true (default)');
    process.env.USE_REPLICATE_BLEND = 'true';
  }

  // Default to false for skipping local files
  if (process.env.SKIP_LOCAL_FILES === undefined) {
    console.log('Setting SKIP_LOCAL_FILES=false (default)');
    process.env.SKIP_LOCAL_FILES = 'false';
  }

  // Default timeout is 60 seconds
  if (process.env.ENHANCEMENT_TIMEOUT === undefined) {
    console.log('Setting ENHANCEMENT_TIMEOUT=60000 (default)');
    process.env.ENHANCEMENT_TIMEOUT = '60000';
  }
}

// Log configuration status
export function logConfigStatus() {
  console.log('*** Image Generation Configuration ***');
  console.log(`SAVE_LOCAL_COPIES: ${process.env.SAVE_LOCAL_COPIES}`);
  console.log(`USE_GPT_VISION_ENHANCEMENT: ${process.env.USE_GPT_VISION_ENHANCEMENT}`);
  console.log(`USE_REPLICATE_BLEND: ${process.env.USE_REPLICATE_BLEND}`);
  console.log(`SKIP_LOCAL_FILES: ${process.env.SKIP_LOCAL_FILES}`);
  console.log(`ENHANCEMENT_TIMEOUT: ${process.env.ENHANCEMENT_TIMEOUT}`);
  console.log(`REPLICATE_API_TOKEN available: ${!!process.env.REPLICATE_API_TOKEN}`);
  console.log(`OPENAI_API_KEY available: ${!!process.env.OPENAI_API_KEY}`);
  console.log('*** End Configuration ***');
} 