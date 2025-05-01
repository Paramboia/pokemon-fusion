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
  } else if (process.env.USE_GPT_VISION_ENHANCEMENT !== 'true') { 
    // Force this to 'true' regardless of what it was set to previously
    console.warn('⚠️ Forcing USE_GPT_VISION_ENHANCEMENT=true to ensure enhancement is enabled (was set to:', 
    process.env.USE_GPT_VISION_ENHANCEMENT, ')');
    process.env.USE_GPT_VISION_ENHANCEMENT = 'true';
  } else {
    console.log('USE_GPT_VISION_ENHANCEMENT already set to true ✓');
  }

  // Force USE_OPENAI_MODEL to true if it's false or not set
  if (process.env.USE_OPENAI_MODEL === undefined) {
    console.log('Setting USE_OPENAI_MODEL=true (default)');
    process.env.USE_OPENAI_MODEL = 'true';
  } else if (process.env.USE_OPENAI_MODEL !== 'true') {
    console.warn('⚠️ Forcing USE_OPENAI_MODEL=true to ensure OpenAI can be used (was set to:', 
    process.env.USE_OPENAI_MODEL, ')');
    process.env.USE_OPENAI_MODEL = 'true';
  } else {
    console.log('USE_OPENAI_MODEL already set to true ✓');
  }

  // Verify OpenAI API Key
  if (process.env.OPENAI_API_KEY) {
    if (process.env.OPENAI_API_KEY.startsWith('sk-proj-')) {
      console.log('OPENAI_API_KEY is present and has correct project-based format (sk-proj-) ✓');
    } else {
      console.warn('⚠️ OPENAI_API_KEY is present but does not have correct format (should start with sk-proj-)');
    }
  } else {
    console.warn('⚠️ OPENAI_API_KEY is missing - GPT enhancement will not work!');
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
  console.log(`USE_OPENAI_MODEL: ${process.env.USE_OPENAI_MODEL}`);
  console.log(`USE_REPLICATE_BLEND: ${process.env.USE_REPLICATE_BLEND}`);
  console.log(`ENHANCEMENT_TIMEOUT: ${process.env.ENHANCEMENT_TIMEOUT}`);
  console.log(`REPLICATE_API_TOKEN available: ${!!process.env.REPLICATE_API_TOKEN}`);
  console.log(`OPENAI_API_KEY available: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`OPENAI_API_KEY format: ${process.env.OPENAI_API_KEY ? (process.env.OPENAI_API_KEY.startsWith('sk-proj-') ? 'valid project key' : 'invalid format') : 'missing'}`);
  console.log('*** End Configuration ***');
} 