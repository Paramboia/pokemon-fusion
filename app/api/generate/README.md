# Pokemon Fusion Generation Architecture (nice)

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

The system generates a fusion using the following sequence with a multi-step UI approach:

### Multi-Step UI Flow

The user interface displays three distinct steps with individual progress indicators:

1. **Step 1: "Capturing Pokémons"** (Technical: Replicate Blend)
   - Shows loading animation while blending the two Pokémon images
   - Displays green checkmark when successful
   - Individual timeout for this step only

2. **Step 2: "Merging Pokémons"** (Technical: GPT-4 Vision Description)
   - Shows loading animation while analyzing the blended image
   - Displays green checkmark when description is generated
   - Individual timeout for this step only

3. **Step 3: "Pokédex Entering"** (Technical: GPT Image Enhancement)
   - Shows loading animation while generating the final enhanced image
   - Displays green checkmark when complete
   - Individual timeout for this step only

### Technical Implementation Flow

1. **Primary Flow**:
   - **Step 1**: Replicate Blend creates the initial fusion image using charlesmccarthy/blend-images model
   - **Step 2**: GPT-4.1-mini Vision analyzes the fusion image and creates a detailed, structured description
   - **Step 3**: The description is parsed to extract body structure, color palette, key features, texture, species influence, attitude, and accessories
   - **Step 3**: GPT-image-1 uses the custom prompt built from this description to generate a final image
   - **Final**: The enhanced image is stored in Supabase storage (if base64) or used directly (if URL) and shown to the user

2. **Fallback Flows**:
   - If Step 1 (Replicate Blend) fails: Use the Simple Method (one of the original Pokémon images)
   - If Step 2 (GPT-4 Vision description) fails: Use generic enhancement prompt with GPT-image-1 for Step 3
   - If Step 3 (GPT Image Enhancement) fails: Use the Simple Method (one of the original Pokémon images)
   - If all methods fail: Fall back to the Simple Method (one of the original Pokémon images)

### Benefits of Multi-Step UI

- **Better User Experience**: Users see progress through each step instead of a single long-running loader
- **Reduced Timeout Issues**: Each step has its own timeout instead of one global timeout
- **Clear Feedback**: Users understand what's happening at each stage
- **Fallback Transparency**: If any step fails, users immediately see the fallback to Simple Method
- **Progress Indication**: Green checkmarks show successful completion of each step

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

The system uses environment-specific timeouts optimized for Vercel Pro plan with multi-step UI approach:

### Multi-Step Timeout Strategy

Each step in the UI has its own timeout to prevent the entire flow from appearing to fail:

1. **Step 1: "Capturing Pokémons" (Replicate Blend)**
   - Production: 120 seconds
   - Development: 90 seconds
   - UI shows fallback to Simple Method if exceeded

2. **Step 2: "Merging Pokémons" (GPT-4 Vision Description)**
   - Production: 60 seconds
   - Development: 60 seconds
   - UI shows fallback to Simple Method if exceeded

3. **Step 3: "Pokédex Entering" (GPT Image Enhancement)**
   - Production: 240 seconds
   - Development: 180 seconds
   - UI shows fallback to Simple Method if exceeded

### API Implementation Changes

The API route should be modified to support step-by-step responses:

- **Option 1: WebSocket Connection** - Real-time updates for each step completion
- **Option 2: Polling Approach** - Frontend polls for step status updates
- **Option 3: Server-Sent Events (SSE)** - Stream step updates to the frontend

### Legacy Configuration

For reference, the original single-timeout configuration:

1. **API Route Timeout**: 300 seconds (5 minutes) - maximum allowed for Vercel Pro plan
2. **Individual Service Timeouts**:
   - Replicate Blend: 120 seconds (production) / 90 seconds (development)
   - GPT-4 Vision Description: 60 seconds (both production and development)
   - GPT-image-1 Enhancement: 240 seconds (production) / 180 seconds (development)
   - Supabase Upload: 60 seconds (both production and development)
   - OpenAI Client: 180 seconds (both production and development)

If you're on a Vercel Hobby plan, you'll need to reduce these timeouts significantly to stay within the 60-second limit.

## Error Handling and Fallbacks

The system includes a multi-level fallback mechanism:

1. Primary Generation: Replicate Blend → GPT-4 Vision Description → GPT-image-1 Enhancement
2. If GPT-4 Vision description fails: Use generic enhancement prompt with GPT-image-1
3. If GPT Image Enhancement fails: Use the Simple Method (one of the original Pokémon images)
4. If Replicate Blend fails: Use Simple Method (one of the original Pokémon images)
5. Each implementation includes retries for API calls with exponential backoff

## Image Storage Strategy

Successfully generated fusion images are stored in one of two ways:
1. **Direct URLs**: When OpenAI returns a URL directly, it's used as-is
2. **Supabase Storage**: When OpenAI returns base64 data, it's uploaded to Supabase
   - Images use a naming convention: `fusion-gpt-enhanced-{timestamp}-{randomId}.png`
   - Original image IDs are maintained when possible to track relationships

## Multi-Step UI Implementation

### UI Components Required

The multi-step UI requires the following components:

1. **Progress Stepper Component**
   - Shows three steps: "Capturing Pokémons", "Merging Pokémons", "Pokédex Entering"
   - Each step has three states: pending (default), loading (animated), completed (green checkmark)
   - Fallback state shows Simple Method when any step fails

2. **Step States**
   ```typescript
   type StepState = 'pending' | 'loading' | 'completed' | 'failed';
   
   interface FusionStep {
     id: string;
     name: string;
     state: StepState;
     error?: string;
   }
   ```

3. **API Response Structure**
   ```typescript
   interface StepResponse {
     step: 'capturing' | 'merging' | 'entering';
     status: 'started' | 'completed' | 'failed';
     data?: {
       imageUrl?: string;
       description?: string;
       finalUrl?: string;
     };
     error?: string;
   }
   ```

### Implementation Approach

**Recommended: Server-Sent Events (SSE)**
- Create a new endpoint: `/api/generate/stream`
- Stream step updates in real-time
- Maintain connection throughout the entire process
- Automatically handle reconnection if needed

**Alternative: Polling Approach**
- Create endpoints: `/api/generate/start`, `/api/generate/status/{id}`
- Frontend polls status endpoint every 2-3 seconds
- Simpler to implement but less efficient

### Error Handling in Multi-Step UI

1. **Step-Level Errors**: If any step fails, immediately show Simple Method fallback
2. **Timeout Errors**: Each step has its own timeout, preventing false failures
3. **Network Errors**: Retry mechanism with exponential backoff
4. **User Feedback**: Clear error messages for each step failure

### User Experience Enhancements

- **Visual Progress**: Animated loading indicators for each step
- **Time Estimates**: Show approximate time remaining for each step
- **Cancel Option**: Allow users to cancel generation and use Simple Method
- **Background Processing**: Continue generation even if user navigates away

## Debugging and Logging

The system implements extensive logging:
1. Unique request IDs for tracking operations across multiple services
2. Environment detection (production vs. development, Vercel vs. local)
3. API key validation and format checks
4. Timing information for operations
5. Detailed error reporting with context
6. Client testing functionality via GET endpoint
7. **New**: Step-by-step progress logging for multi-step UI debugging

## Migration Strategy

### Backwards Compatibility

The multi-step UI implementation should maintain backwards compatibility:

1. **Existing API Endpoint**: Keep `/api/generate` working as before for legacy clients
2. **Feature Flag**: Use environment variable `ENABLE_MULTI_STEP_UI` to control the new feature
3. **Graceful Degradation**: If SSE/streaming fails, fall back to original single-loader approach

### Implementation Phases

**Phase 1: API Updates**
- Create new streaming endpoint `/api/generate/stream`
- Modify existing generation pipeline to emit step events
- Add step-by-step timeout handling
- Test with existing UI to ensure no regression

**Phase 2: UI Components**
- Create Progress Stepper component
- Implement step state management
- Add error handling for each step
- Test with mock data

**Phase 3: Integration**
- Connect new UI components to streaming API
- Implement fallback mechanisms
- Add comprehensive error handling
- Performance testing and optimization

**Phase 4: Monitoring & Optimization**
- Add analytics for step completion rates
- Monitor timeout improvements
- Optimize based on real user data
- Consider removing legacy single-loader approach

### Rollback Strategy

If issues arise with the multi-step UI:
1. Disable `ENABLE_MULTI_STEP_UI` environment variable
2. System automatically falls back to original single-loader approach
3. No data loss or user impact
4. Investigate and fix issues before re-enabling

