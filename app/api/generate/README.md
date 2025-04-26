# Pokemon Fusion Generation Architecture

This document explains the technical architecture of the Pokemon fusion generation system, to help future developers.

## Overview

The generation system uses a two-step process for creating AI-generated Pokémon fusions:
1. **Replicate Blend**: Creates the initial fusion image by blending features from two Pokémon
2. **GPT Image Enhancement**: Refines the image using OpenAI's GPT-image-1 model to ensure high quality

The system is designed for resilience and flexibility, with environment variables controlling which models are enabled. If the AI generation fails, the system falls back to the Simple Method.

## Key Files

- `route.ts` - Main API endpoint handler that orchestrates the generation process
- `replicate-blend.ts` - Implementation for the initial fusion using Replicate's blend-images model
- `dalle.ts` - Enhances the initial fusion using OpenAI's GPT-image-1 model
- `stable-diffusion.ts` - Implementation for Stable Diffusion 3.5 (requires additional licensing)
- `config.ts` - Configuration module that sets default environment variables

## Generation Pipeline

The system attempts to generate a fusion using the following sequence:

1. **Primary Flow**:
   - Replicate Blend creates the initial fusion image (img_1)
   - The URL of this image is passed directly to the GPT Image Enhancement
   - GPT Image Enhancement uses the URL to generate a new enhanced image (img_2)
   - The enhanced image (img_2) is shown to the user

2. **Fallback Flow**:
   - If Replicate Blend fails, try Stable Diffusion 3.5
   - If Stable Diffusion 3.5 fails, use the Simple Method (one of the original Pokémon images)

## Model Approaches

- **Replicate Blend**: Uses two Pokémon images as input to blend their features
- **GPT Image Enhancement**: Takes the URL output from Replicate Blend and uses it with a simple prompt to generate an improved version: "Make the image better, ensure clean animation-style with smooth outlines, maintain kid-friendly appearance, and ensure completely pure white background"
- **Stable Diffusion 3.5**: Uses advanced diffusion techniques to create a fusion based on the two Pokémon
- **Simple Method**: Uses one of the original Pokémon images as a fallback if all AI generation methods fail

## Adding a New Model

To add a new generation model:

1. Create a new file (e.g., `new-model.ts`) with your implementation functions
2. Export the main generation function with a descriptive name like `generatePokemonFusionWithNewModel`
3. In `route.ts`, import your function at the top of the file
4. Add an environment variable flag (e.g., `ENABLE_NEW_MODEL`)
5. Add a new section in the generation pipeline that:
   - Checks if your model is enabled
   - Attempts generation with proper logging and error handling
   - Updates the `fusionImageUrl` variable if successful

Example pattern for integrating a new model:

```typescript
// Add environment variable check
const useNewModel = process.env.ENABLE_NEW_MODEL === 'true';

// Update the model selection logging
console.log('Generate API - Model selection:', { 
  useReplicateBlend,
  useGptEnhancement,
  useNewModel
});

// Add new model to the pipeline
if (!fusionImageUrl && useNewModel) {
  try {
    console.log('Generate API - Attempting New Model generation');
    
    // Check for required API tokens if needed
    if (!process.env.NEW_MODEL_API_KEY) {
      console.error('Generate API - NEW_MODEL_API_KEY not available');
      throw new Error('NEW_MODEL_API_KEY not available');
    }
    
    fusionImageUrl = await generatePokemonFusionWithNewModel(
      pokemon1Name,
      pokemon2Name,
      processedImage1,
      processedImage2
    );
    
    if (fusionImageUrl) {
      console.log('Generate API - Successfully generated fusion with New Model');
    } else {
      console.log('Generate API - New Model generation failed, will try another model');
    }
  } catch (newModelError) {
    console.error('Generate API - Error with New Model:', newModelError);
    console.log('Generate API - Will try another model');
  }
}
```

## Implementation Patterns

Each model implementation file should follow these patterns:

1. Export a main generation function that takes common parameters:
   - `pokemon1Name`, `pokemon2Name` - Names of the Pokemon to fuse
   - `processedImage1`, `processedImage2` - URLs or base64 of the Pokemon images
   
2. Return types should be consistent:
   - Return a URL string or object with the URL of the generated image on success
   - Return `null` if generation fails but doesn't throw an error
   
3. Include robust error handling:
   - Catch and log all errors
   - Return `null` on error for graceful fallback
   
4. Check if the feature is enabled at the beginning of the function
   - Early return if disabled

5. Include detailed logging for debugging

## Environment Variables

The system uses these environment variables to control behavior:

- `USE_REPLICATE_BLEND` - Enable Replicate Blend for initial fusion (default: true)
- `USE_GPT_VISION_ENHANCEMENT` - Enable GPT Image Enhancement for refining the fusion (default: true)
- `USE_URL_ONLY_ENHANCEMENT` - Use URL-only approach for enhancement without saving files (default: true)
- `USE_STABLE_DIFFUSION` - Enable Stable Diffusion 3.5 (requires additional licensing)
- `REPLICATE_API_TOKEN` - API token for Replicate
- `OPENAI_API_KEY` - API key for OpenAI (for enhancement)
- `ENHANCEMENT_TIMEOUT` - Timeout for the enhancement process in milliseconds (default: 90000 - 90 seconds)

## Error Handling and Fallbacks

The system includes a multi-layered fallback mechanism:

1. Primary Generation: Replicate Blend + GPT Enhancement
2. First Fallback: Stable Diffusion 3.5 if Replicate Blend fails or GPT Enhancement fails
3. Final Fallback: Simple Method if all AI generation methods fail
4. Each implementation includes retries for API calls with exponential backoff

## Optimizations

Several optimizations are included:

1. URL-only approach: Uses direct URLs between services without saving to disk
   - Eliminates file system operations for greater reliability
   - Better suited for serverless environments
   - Reduces latency by eliminating download/upload steps
   - More scalable and stateless architecture
   - Image URLs are passed directly from Replicate to DALL-E with no intermediate file storage

2. Timeout configuration for API calls to stay within Vercel limits
3. Retry logic with exponential backoff for resilience
4. Background conversion of transparent images to white backgrounds
5. Logging at each step for debugging

