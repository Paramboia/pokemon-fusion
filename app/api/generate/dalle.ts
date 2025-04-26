import OpenAI from 'openai';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';
import FormData from 'form-data';

// Set environment-specific timeouts
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const API_TIMEOUT = IS_PRODUCTION ? 300000 : 600000; // 5 minutes in production, 10 minutes in development

// Initialize OpenAI client with timeout
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: API_TIMEOUT,
  maxRetries: 2, // Add retry capability
});

// Control how image enhancement works with environment variables
const ENHANCEMENT_TIMEOUT = parseInt(process.env.ENHANCEMENT_TIMEOUT || '90000', 10); // 90 seconds default
const SKIP_LOCAL_FILES = process.env.SKIP_LOCAL_FILES === 'true';

// Function to create a timeout promise that rejects after a specified time
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
}

/**
 * Enhance a Pokemon fusion image using text-to-image generation
 * This uses a generic prompt to improve the image while avoiding content policy issues
 */
export async function enhanceWithDirectGeneration(
  pokemon1Name: string,
  pokemon2Name: string,
  imageUrl?: string
): Promise<string | null> {
  const requestId = `dalle-enhance-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();
  
  // Force log this message to ensure it's visible in production
  console.warn(`[${requestId}] DALLE ENHANCEMENT - START - ${pokemon1Name} + ${pokemon2Name} at ${new Date().toISOString()}`);
  console.log(`[${requestId}] DALLE ENHANCEMENT - Original image URL: ${imageUrl?.substring(0, 50)}...`);
  
  // If we have an image source and no OpenAI API key, just return the original image
  if (imageUrl && !process.env.OPENAI_API_KEY) {
    console.warn(`[${requestId}] DALLE ENHANCEMENT - SKIPPED - No OpenAI API key, using original image directly`);
    return imageUrl;
  }
  
  // Check that OpenAI API key is properly formatted
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.error(`[${requestId}] DALLE ENHANCEMENT - ERROR - Invalid OpenAI API key format`);
    // Return the original image if we have it
    if (imageUrl) {
      console.warn(`[${requestId}] DALLE ENHANCEMENT - SKIPPED - Using original image due to API key format issue`);
      return imageUrl;
    }
    return null;
  }
  
  // Check that environment flag is enabled
  if (process.env.USE_GPT_VISION_ENHANCEMENT !== 'true') {
    console.warn(`[${requestId}] DALLE ENHANCEMENT - SKIPPED - Enhancement feature is disabled`);
    // Return the original image if we have it
    if (imageUrl) {
      console.warn(`[${requestId}] DALLE ENHANCEMENT - Using original image directly (enhancement disabled)`);
      return imageUrl;
    }
    return null;
  }
  
  console.log(`[${requestId}] DALLE ENHANCEMENT - API Key check: ${process.env.OPENAI_API_KEY ? `present (${process.env.OPENAI_API_KEY.length} chars)` : 'missing'}`);
  
  try {
    // Create a timeout controller
    const timeoutId = setTimeout(() => {
      console.warn(`[${requestId}] DALLE ENHANCEMENT - Request aborted due to timeout after ${ENHANCEMENT_TIMEOUT}ms`);
    }, ENHANCEMENT_TIMEOUT);
    
    try {
      // Force log this to ensure it appears in production logs
      console.warn(`[${requestId}] DALLE ENHANCEMENT - API CALL STARTING at ${new Date().toISOString()}`);
      
      // Create a very detailed prompt that describes the fusion without needing the image input
      const detailedPrompt = `Make the image better, ensure clean animation-style with smooth outlines, maintain kid-friendly appearance, and ensure completely pure white background`;
      
      console.log(`[${requestId}] DALLE ENHANCEMENT - Using text-to-image generation with detailed prompt`);
      
      // Generate a completely new image using text-to-image
      const response = await openai.images.generate({
        model: "dall-e-3", // Use DALL-E 3 for higher quality
        prompt: detailedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      });
      
      console.log(`[${requestId}] DALLE ENHANCEMENT - Text-to-image generation completed`);
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      const requestDuration = Date.now() - startTime;
      console.warn(`[${requestId}] DALLE ENHANCEMENT - API CALL COMPLETED in ${requestDuration}ms`);
      
      if (!response?.data || response.data.length === 0) {
        console.error(`[${requestId}] DALLE ENHANCEMENT - ERROR: Empty response data`);
        return imageUrl;
      }

      // Handle the response (URL or base64)
      if (response.data[0]?.url) {
        const newImageUrl = response.data[0].url;
        console.warn(`[${requestId}] DALLE ENHANCEMENT - SUCCESS: Generated URL: ${newImageUrl.substring(0, 50)}...`);
        return newImageUrl;
      }

      console.error(`[${requestId}] DALLE ENHANCEMENT - No image URL in response data`);
      return imageUrl;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle common error types
      if (error instanceof Error) {
        console.error(`[${requestId}] DALLE ENHANCEMENT - Error type: ${error.name}`);
        console.error(`[${requestId}] DALLE ENHANCEMENT - Error message: ${error.message}`);
        
        // Check for organization verification error
        if (error.message.includes('organization verification')) {
          console.error(`[${requestId}] DALLE ENHANCEMENT - Organization verification required. Please visit: https://help.openai.com/en/articles/10910291-api-organization-verification`);
        }

        // Check for content policy violation
        if (error.message.includes('content policy') || error.message.includes('safety system')) {
          console.error(`[${requestId}] DALLE ENHANCEMENT - Content policy violation: The request was rejected by the moderation system`);
        }
        
        // Check for timeout or aborted requests
        if (error.message.includes('timeout') || error.message.includes('abort') || error.message.includes('aborted')) {
          console.error(`[${requestId}] DALLE ENHANCEMENT - Request timed out or was aborted: ${error.message}`);
        }
      }
      
      console.error(`[${requestId}] DALLE ENHANCEMENT - Error using OpenAI API`);
      return imageUrl;
    }
  } catch (error) {
    console.error(`[${requestId}] DALLE ENHANCEMENT - Unexpected error:`, error);
    return imageUrl;
  }
}

/**
 * Helper function to perform text-to-image generation
 */
async function performTextToImageGeneration(
  requestId: string,
  pokemon1Name: string,
  pokemon2Name: string,
  controller: AbortController
): Promise<any> {
  // This is our simple prompt that works consistently with content policies
  const enhancementPrompt = `Make the image better, ensure clean animation-style with smooth outlines, maintain kid-friendly appearance, and ensure completely pure white background`;
  
  console.log(`[${requestId}] DALLE ENHANCEMENT - Generating image with text-to-image prompt`);

  // Generate a new image using GPT-image-1
  try {
    // Use Promise.race to add an additional timeout layer
    return await Promise.race([
      openai.images.generate({
        model: "gpt-image-1",
        prompt: enhancementPrompt,
        n: 1,
        size: "1024x1024"
      }),
      timeout(ENHANCEMENT_TIMEOUT * 0.8) // 80% of the main timeout
    ]).catch(err => {
      console.error(`[${requestId}] DALLE ENHANCEMENT - Text-to-image generation failed: ${err.message}`);
      throw new Error(`Text-to-image generation timed out: ${err.message}`);
    });
  } catch (error) {
    console.error(`[${requestId}] DALLE ENHANCEMENT - Text-to-image generation error:`, 
      error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n')[0]
      } : error
    );
    
    // Re-throw to allow the caller to handle
    throw error;
  }
}

/**
 * Generate a Pokemon fusion using image editing approach
 * This function is kept for backward compatibility but modified to work with current API
 */
export async function generatePokemonFusion(
  image1: string,
  image2: string,
  maskType: 'lower-half' | 'upper-half' | 'right-half' | 'left-half'
): Promise<string | null> {
  console.log('GPT Image Editing - Starting fusion with images');
  
  // This function is not currently implemented
  // Return null to allow fallback to other methods
  return null;
}

/**
 * Legacy function - kept for backward compatibility
 */
export async function enhanceImageWithGptVision(): Promise<string | null> {
  console.log('GPT Direct Enhancement - enhanceImageWithGptVision is deprecated');
  return null;
}

/**
 * Helper function to delete a local image file
 */
function deleteLocalImage(filePath: string, requestId: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[${requestId}] DALLE ENHANCEMENT - Deleted local image at: ${filePath}`);
  } else {
    console.log(`[${requestId}] DALLE ENHANCEMENT - Local image not found: ${filePath}`);
  }
} 