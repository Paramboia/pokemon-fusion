/**
 * Configuration for the image generation API
 * This file ensures all required environment variables have default values
 */

// Force set environment variables if not already set
export function initializeConfig() {
  // Default to true for enhancement - CRITICAL for GPT enhancement to work
  if (process.env.USE_GPT_VISION_ENHANCEMENT === undefined) {
    console.log('Setting USE_GPT_VISION_ENHANCEMENT=true (default)');
    process.env.USE_GPT_VISION_ENHANCEMENT = 'true';
  } else {
    // Force this to 'true' regardless of what it was set to previously
    console.log('Forcing USE_GPT_VISION_ENHANCEMENT=true to ensure enhancement is enabled');
    process.env.USE_GPT_VISION_ENHANCEMENT = 'true';
  }

  // Default to true for Replicate Blend
  if (process.env.USE_REPLICATE_BLEND === undefined) {
    console.log('Setting USE_REPLICATE_BLEND=true (default)');
    process.env.USE_REPLICATE_BLEND = 'true';
  }

  // Set maximum timeout for GPT enhancement to work (55 seconds leaves 5 second buffer for Vercel's 60s limit)
  if (process.env.ENHANCEMENT_TIMEOUT === undefined) {
    console.log('Setting ENHANCEMENT_TIMEOUT=55000 (55 seconds maximum)');
    process.env.ENHANCEMENT_TIMEOUT = '55000';
  } else {
    // Force this to maximum 55 seconds
    const currentTimeout = parseInt(process.env.ENHANCEMENT_TIMEOUT, 10);
    if (currentTimeout < 55000) {
      console.log('Increasing ENHANCEMENT_TIMEOUT to 55000 (55 seconds maximum)');
      process.env.ENHANCEMENT_TIMEOUT = '55000';
    }
  }
}

// Log configuration status
export function logConfigStatus() {
  console.log('*** Image Generation Configuration ***');
  console.log(`USE_GPT_VISION_ENHANCEMENT: ${process.env.USE_GPT_VISION_ENHANCEMENT}`);
  console.log(`USE_REPLICATE_BLEND: ${process.env.USE_REPLICATE_BLEND}`);
  console.log(`ENHANCEMENT_TIMEOUT: ${process.env.ENHANCEMENT_TIMEOUT}`);
  console.log(`REPLICATE_API_TOKEN available: ${!!process.env.REPLICATE_API_TOKEN}`);
  console.log(`OPENAI_API_KEY available: ${!!process.env.OPENAI_API_KEY}`);
  console.log('*** End Configuration ***');
} 