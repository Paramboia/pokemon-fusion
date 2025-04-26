/**
 * Configuration for the image generation API
 * This file ensures all required environment variables have default values
 */

// Force set environment variables if not already set
export function initializeConfig() {
  // Default to false for image saving (switching to URL-based approach)
  if (process.env.SAVE_LOCAL_COPIES === undefined) {
    console.log('Setting SAVE_LOCAL_COPIES=false (default - using URL-based enhancement)');
    process.env.SAVE_LOCAL_COPIES = 'false';
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

  // Default to true for skipping local files - we now prefer URL-based enhancement
  if (process.env.SKIP_LOCAL_FILES === undefined) {
    console.log('Setting SKIP_LOCAL_FILES=true (default - using URL-based enhancement)');
    process.env.SKIP_LOCAL_FILES = 'true';
  }

  // Default to URL-only approach for enhancement
  if (process.env.USE_URL_ONLY_ENHANCEMENT === undefined) {
    console.log('Setting USE_URL_ONLY_ENHANCEMENT=true (default)');
    process.env.USE_URL_ONLY_ENHANCEMENT = 'true';
  }

  // Default timeout is 20 seconds to fit within Vercel Hobby plan limits
  if (process.env.ENHANCEMENT_TIMEOUT === undefined) {
    console.log('Setting ENHANCEMENT_TIMEOUT=20000 (default - 20 seconds)');
    process.env.ENHANCEMENT_TIMEOUT = '20000';
  }
}

// Log configuration status
export function logConfigStatus() {
  console.log('*** Image Generation Configuration ***');
  console.log(`SAVE_LOCAL_COPIES: ${process.env.SAVE_LOCAL_COPIES}`);
  console.log(`USE_GPT_VISION_ENHANCEMENT: ${process.env.USE_GPT_VISION_ENHANCEMENT}`);
  console.log(`USE_URL_ONLY_ENHANCEMENT: ${process.env.USE_URL_ONLY_ENHANCEMENT}`);
  console.log(`USE_REPLICATE_BLEND: ${process.env.USE_REPLICATE_BLEND}`);
  console.log(`SKIP_LOCAL_FILES: ${process.env.SKIP_LOCAL_FILES}`);
  console.log(`ENHANCEMENT_TIMEOUT: ${process.env.ENHANCEMENT_TIMEOUT}`);
  console.log(`REPLICATE_API_TOKEN available: ${!!process.env.REPLICATE_API_TOKEN}`);
  console.log(`OPENAI_API_KEY available: ${!!process.env.OPENAI_API_KEY}`);
  console.log('*** End Configuration ***');
} 