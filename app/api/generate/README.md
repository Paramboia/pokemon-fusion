# Pokemon Fusion Generation Architecture 

This document explains the technical architecture of the Pokemon fusion generation system, to help future developers.

## Overview

The generation system uses a three-step process for creating AI-generated Pokémon fusions:
1. **Replicate Blend**: Creates the initial fusion image by blending features from two Pokémon
2. **GPT-4 Vision Description**: Analyzes the initial fusion and creates a detailed description
3. **GPT Image Enhancement**: Uses the description to generate a refined, high-quality image

The system is designed for resilience, with fallbacks at each step if any part of the process fails.

## Key Files

- `route.ts` - Main API endpoint handler that orchestrates the generation process
- `replicate-blend.ts` - Implementation for the initial fusion using Replicate's blend-images model
- `dalle.ts` - Contains both the GPT-4 Vision description and GPT-image-1 enhancement functionality
- `config.ts` - Configuration module that sets default environment variables

## Generation Pipeline

The system generates a fusion using the following sequence:

1. **Primary Flow**:
   - Replicate Blend creates the initial fusion image (img_1)
   - GPT-4 Vision analyzes img_1 and creates a detailed, structured description
   - The description is parsed to extract body structure, color palette, and key features
   - GPT-image-1 uses the custom prompt built from this description to generate a final image (img_2)
   - The enhanced image (img_2) is shown to the user

2. **Fallback Flows**:
   - If GPT-4 Vision description fails: Use generic enhancement prompt with GPT-image-1
   - If GPT Image Enhancement fails: Use the initial Replicate Blend image (img_1)
   - If Replicate Blend fails: Use the Simple Method (one of the original Pokémon images)

## Model Approaches

- **Replicate Blend**: Uses two Pokémon images as input to blend their features into a fusion
- **GPT-4 Vision Description**: Analyzes the blended image and creates a structured description with:
  - Body structure and pose
  - Color palette
  - Key features
- **GPT Image Enhancement**: Takes the structured description to create a custom prompt for generating an improved version with clean outlines and animation style
- **Simple Method**: Uses one of the original Pokémon images as a fallback if all AI generation methods fail

## GPT-4 Vision Description Process

The description step works as follows:
1. The Replicate Blend image URL is sent to GPT-4 Vision
2. GPT-4 is prompted to describe the image in a structured format:
   ```
   Body structure and pose: [description]
   Color palette: [description]  
   Key features: [description]
   ```
3. The response is parsed to extract these sections
4. A custom prompt is created using this structured information:
   ```
   Illustrate an original cartoon creature with [body structure], using a [color palette]. 
   The creature features [key features]. 
   Style it in early 2000s anime with smooth outlines, cel shading, and soft shadows. 
   Keep the background transparent.
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

Each model implementation file should follow these patterns:

1. Export a main generation function that takes common parameters:
   - `pokemon1Name`, `pokemon2Name` - Names of the Pokemon to fuse
   - `processedImage1`, `processedImage2` - URLs or base64 of the Pokemon images
   
2. Return types should be consistent:
   - Return a URL string on success
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
- `REPLICATE_API_TOKEN` - API token for Replicate
- `OPENAI_API_KEY` - API key for OpenAI (required for both GPT-4 Vision description and GPT-image-1 enhancement)
- `ENHANCEMENT_TIMEOUT` - Timeout for the enhancement process in milliseconds

## Timeout Configuration

The system uses tiered timeouts to work within Vercel's limits:

1. **API Route Timeout**: 60 seconds (Vercel Hobby plan limit)
2. **Individual Service Timeouts**:
   - Replicate Blend: 25 seconds
   - GPT-4 Vision Description: 20 seconds (production) / 30 seconds (development)
   - GPT-image-1 Enhancement: 45 seconds 

If you upgrade to a Vercel Pro/Team plan, you can increase these timeouts:
1. Change `maxDuration` in `route.ts` from 60 to 300 seconds
2. Increase the service-specific timeouts accordingly

## Error Handling and Fallbacks

The system includes a multi-level fallback mechanism:

1. Primary Generation: Replicate Blend → GPT-4 Vision Description → GPT-image-1 Enhancement
2. If GPT-4 Vision Description fails: Use generic enhancement prompt with GPT-image-1
3. If GPT-image-1 Enhancement fails: Use the original Replicate Blend image
4. If Replicate Blend fails: Use Simple Method (one of the original Pokémon images)
5. Each implementation includes retries for API calls with exponential backoff

## Optimizations

Several optimizations are included:

1. URL-only approach: Uses direct URLs between services without saving to disk
   - Eliminates file system operations for greater reliability
   - Better suited for serverless environments
   - Reduces latency by eliminating download/upload steps
   - More scalable and stateless architecture
   - Image URLs are passed directly between services with no intermediate file storage

2. Timeout configuration for API calls to stay within Vercel limits
3. Retry logic with exponential backoff for resilience
4. Background conversion of transparent images to white backgrounds
5. Logging at each step for debugging
6. Modular design to isolate failures and enable graceful degradation

