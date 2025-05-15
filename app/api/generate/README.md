# Pokemon Fusion Generation Architecture 

This document explains the technical architecture of the Pokemon fusion generation system, to help future developers.

## Overview

The generation system uses a three-step process for creating AI-generated Pokémon fusions:
1. **Replicate Blend**: Creates the initial fusion image by blending features from two Pokémon
2. **GPT-4 Vision Description**: Analyzes the initial fusion and creates a detailed structured description
3. **GPT Image Enhancement**: Uses the description to generate a refined, high-quality image with GPT-image-1

The system is designed for resilience, with fallbacks at each step if any part of the process fails.

## Key Files

- `route.ts` - Main API endpoint handler that orchestrates the generation process and handles credits/billing
- `replicate-blend.ts` - Implementation for the initial fusion using Replicate's blend-images model
- `dalle.ts` - Contains GPT-4 Vision description and GPT-image-1 enhancement functionality
- `config.ts` - Configuration module that sets default environment variables

## Generation Pipeline

The system generates a fusion using the following sequence:

1. **Primary Flow**:
   - Replicate Blend creates the initial fusion image using charlesmccarthy/blend-images model
   - GPT-4.1-mini Vision analyzes the fusion image and creates a detailed, structured description
   - The description is parsed to extract body structure, color palette, key features, texture, species influence, attitude, and accessories
   - GPT-image-1 uses the custom prompt built from this description to generate a final image
   - The enhanced image is stored in Supabase storage (if base64) or used directly (if URL) and shown to the user

2. **Fallback Flows**:
   - If GPT-4 Vision description fails: Use generic enhancement prompt with GPT-image-1
   - If GPT Image Enhancement fails: Use the initial Replicate Blend image
   - If Replicate Blend fails: Use the Simple Method (one of the original Pokémon images)
   - If all methods fail: Fall back to the Simple Method (one of the original Pokémon images)

## Model Approaches

- **Replicate Blend**: Uses charlesmccarthy/blend-images model with a detailed prompt to merge two Pokémon
- **GPT-4 Vision Description**: Uses GPT-4.1-mini to analyze the blended image with a structured format:
  - Body structure and pose
  - Color palette
  - Key features
  - Texture and surface
  - Species influence or type vibe
  - Attitude and expression
  - Notable accessories or markings
- **GPT Image Enhancement**: Uses GPT-image-1 model with the structured description to generate a polished image with transparent background
- **Simple Method**: Uses one of the original Pokémon images as a fallback if all AI generation methods fail

## GPT-4 Vision Description Process

The description step works as follows:
1. The Replicate Blend image URL is sent to GPT-4.1-mini Vision
2. GPT-4 is prompted to describe the image in a structured format with multiple categories
3. The response is parsed to extract these sections
4. A custom prompt is created using this structured information:
   ```
   Illustrate an original cartoon creature with [body structure], using a [color palette]. 
   The creature features [key features] with [texture and surface].
   It has a [species influence] aesthetic, displaying a [attitude and expression].
   Additional details include [notable accessories].
   The creature should be whimsical, expressive, and anime-inspired.
   Style it for a teenager-friendly, early 2000s anime look. Use smooth, clean outlines, cel-shading, soft shadows, and vibrant colors.
   Creature it's not equal to a dragon, it might resemble another cartoon species.
   Do not recreate or reference any existing character or franchise.
   Keep the background transparent, but ensure that the eyes are non-transparent.
   ```
5. This custom prompt is sent to GPT-image-1 to generate the final image

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

Each model implementation file follows these patterns:

1. Export a main generation function that takes common parameters:
   - `pokemon1Name`, `pokemon2Name` - Names of the Pokemon to fuse
   - `processedImage1`, `processedImage2` - URLs or base64 of the Pokemon images
   
2. Return types are consistent:
   - Return a URL string on success
   - Return `null` if generation fails but doesn't throw an error
   
3. Include robust error handling:
   - Catch and log all errors
   - Return `null` on error for graceful fallback
   
4. Check if the feature is enabled at the beginning of the function
   - Early return if disabled

5. Include detailed logging with unique request IDs for debugging

## Credits and Billing System

The fusion generation process includes a credit system:
1. AI-generated fusions (non-simple) consume 1 credit per generation
2. The user's credit balance is checked before starting generation
3. If insufficient credits, a 402 Payment Required response is returned
4. Credits are only deducted after successful generation
5. Simple fusion fallbacks do not consume credits

## Timeout Configuration

The system uses environment-specific timeouts to work within Vercel's limits:

1. **API Route Timeout**: 300 seconds (5 minutes) for Pro plan
2. **Individual Service Timeouts**:
   - Replicate Blend: 25 seconds (production) / 45 seconds (development)
   - GPT-4 Vision Description: 20 seconds (production) / 30 seconds (development)
   - GPT-image-1 Enhancement: 400 seconds (production) / 250 seconds (development)
   - Supabase Upload: 30 seconds (production) / 45 seconds (development)

If you're on a Vercel Hobby plan, consider reducing these timeouts further to stay within the 60-second limit.

## Error Handling and Fallbacks

The system includes a multi-level fallback mechanism:

1. Primary Generation: Replicate Blend → GPT-4 Vision Description → GPT-image-1 Enhancement
2. If GPT-4 Vision description fails: Use generic enhancement prompt with GPT-image-1
3. If GPT Image Enhancement fails: Use the original Replicate Blend image (saved as lastSuccessfulImageUrl)
4. If Replicate Blend fails: Use Simple Method (one of the original Pokémon images)
5. Each implementation includes retries for API calls with exponential backoff

## Image Storage Strategy

Successfully generated fusion images are stored in one of two ways:
1. **Direct URLs**: When OpenAI returns a URL directly, it's used as-is
2. **Supabase Storage**: When OpenAI returns base64 data, it's uploaded to Supabase
   - Images use a naming convention: `fusion-gpt-enhanced-{timestamp}-{randomId}.png`
   - Original image IDs are maintained when possible to track relationships

## Debugging and Logging

The system implements extensive logging:
1. Unique request IDs for tracking operations across multiple services
2. Environment detection (production vs. development, Vercel vs. local)
3. API key validation and format checks
4. Timing information for operations
5. Detailed error reporting with context
6. Client testing functionality via GET endpoint

