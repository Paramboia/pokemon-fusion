# Pokemon Fusion Generation Architecture

This document explains the technical architecture of the Pokemon fusion generation system, to help future developers adapt or extend it.

## Overview

The generation system uses a pipeline approach with multiple AI models, attempting each one in sequence until a successful fusion is generated. The system is designed for resilience and flexibility, with environment variables controlling which models are enabled.

## Key Files

- `route.ts` - Main API endpoint handler that orchestrates the generation pipeline
- `stable-diffusion.ts` - Implementation for Stable Diffusion 3.5
- `replicate-blend.ts` - Implementation for Replicate's blending model
- `dalle.ts` - Implementation for DALL-E/OpenAI image models

## Generation Pipeline

The system attempts to generate a fusion using each enabled model in the following order:

1. OpenAI Image Editing (if `useImageEditing` is true)
2. Replicate Blend (if `USE_REPLICATE_BLEND` is enabled)
3. Stable Diffusion 3.5 (if `USE_STABLE_DIFFUSION` is enabled)
   - First tries advanced fusion method (with detailed prompt)
   - Falls back to standard method if advanced fails
4. DALL-E 3 (if `USE_OPENAI_MODEL` is enabled) - currently a placeholder
5. Legacy Replicate model (if `USE_REPLICATE_MODEL` is enabled)

If all models fail, the system falls back to using one of the original Pokemon images.

## Model Approaches

Different models use different approaches to generate fusions:

- **OpenAI Image Editing**: Uses actual image manipulation to edit/blend two Pokémon images
- **Replicate Blend**: Uses a specialized model to blend two input images
- **Stable Diffusion 3.5**: Uses only Pokémon names with text-to-image generation (no image inputs)
- **Legacy Replicate**: Uses both images and names for generation

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
  useReplicate, 
  useOpenAI,
  useReplicateBlend,
  useStableDiffusion,
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
   - Return `string` with the URL of the generated image on success
   - Return `null` if generation fails but doesn't throw an error
   
3. Include robust error handling:
   - Catch and log all errors
   - Return `null` on error for graceful fallback
   
4. Check if the feature is enabled at the beginning of the function
   - Early return if disabled

5. Include detailed logging for debugging

## Environment Variables

The system uses these environment variables to control behavior:

- `USE_REPLICATE_MODEL` - Enable legacy Replicate model
- `USE_OPENAI_MODEL` - Enable DALL-E 3 (placeholder)
- `USE_REPLICATE_BLEND` - Enable Replicate's blending model
- `USE_STABLE_DIFFUSION` - Enable Stable Diffusion 3.5
- `REPLICATE_API_TOKEN` - API token for Replicate
- `OPENAI_API_KEY` - API key for OpenAI

## Error Handling and Fallbacks

The system includes multiple fallback mechanisms:

1. If one model fails, the next one is attempted
2. If all models fail, the system uses a processed original image
3. Each model implementation includes retries for API calls

## Optimizations

Several optimizations are included:

1. Timeout configuration for API calls to stay within Vercel limits
2. Retry logic with exponential backoff for resilience
3. Background conversion of transparent images to white backgrounds
4. Logging at each step for debugging 