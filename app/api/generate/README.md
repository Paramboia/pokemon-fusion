# Pokemon Fusion Generation Architecture (nice)

This document explains the technical architecture of the Pokemon fusion generation system, to help future developers.

## Overview

The generation system supports two different approaches for creating AI-generated Pokémon fusions:

### **Primary Approach: Qwen Single-Step Fusion** (when `USE_QWEN_FUSION=true`)
1. **Direct Fusion**: Uses `qwen/qwen-image` model to directly blend two Pokémon images in a single step
2. **Transparent Background**: Generates high-quality fusion with transparent background
3. **Fallback**: Falls back to Simple Method (original Pokémon image) if Qwen fails, without charging credits

### **Legacy Approach: Traditional Three-Step Process** (when `USE_QWEN_FUSION=false`)
1. **Replicate Blend**: Creates the initial fusion image by blending features from two Pokémon
2. **GPT-4 Vision Description**: Analyzes the initial fusion and creates a detailed structured description
3. **GPT Image Enhancement**: Uses the description to generate a refined, high-quality image with GPT-image-1

Both systems maintain the same 3-step UI experience but use different backend processing. The system is designed for resilience, with fallbacks at each step if any part of the process fails.

## Key Files

- `route.ts` - Main API endpoint handler that orchestrates the generation process and handles credits/billing
- `stream/route.ts` - Streaming API endpoint for real-time multi-step UI updates via Server-Sent Events
- `qwen-fusion.ts` - **NEW**: Implementation for single-step fusion using Qwen image model
- `replicate-blend.ts` - Implementation for the initial fusion using Replicate's blend-images model (legacy)
- `dalle.ts` - Contains GPT-4 Vision description and GPT-image-1 enhancement functionality (legacy)
- `config.ts` - Configuration module that sets default environment variables

## Generation Pipeline

The system generates a fusion using the following sequence with a multi-step UI approach:

### Multi-Step UI Flow

The user interface displays three distinct steps with individual progress indicators. The UI experience is identical regardless of which backend approach is used:

1. **Step 1: "Capturing Pokémons"** 
   - **Qwen Mode**: Artificial timing (5 seconds) while Qwen generation starts in background
   - **Legacy Mode**: Replicate Blend creates initial fusion image
   - Shows loading animation, displays green checkmark when complete

2. **Step 2: "Merging Pokémons"** 
   - **Qwen Mode**: Artificial timing (5 seconds) while Qwen continues processing
   - **Legacy Mode**: GPT-4 Vision analyzes blended image and creates description
   - Shows loading animation, displays green checkmark when complete

3. **Step 3: "Pokédex Entering"** 
   - **Qwen Mode**: Waits for Qwen generation to complete (or timeout)
   - **Legacy Mode**: GPT-image-1 generates final enhanced image
   - Shows loading animation, displays green checkmark when complete

### Technical Implementation Flow

#### **Qwen Single-Step Flow** (when `USE_QWEN_FUSION=true`)

1. **Primary Flow**:
   - **Backend**: Qwen model directly blends both Pokémon images in a single API call
   - **UI Steps 1-2**: Artificial timing (5 seconds each) to maintain familiar 3-step experience
   - **UI Step 3**: Waits for Qwen generation to complete
   - **Final**: Generated image is stored in Supabase storage and shown to the user

2. **Fallback Flow**:
   - If Qwen generation fails: Use Simple Method (one of the original Pokémon images)
   - **Important**: No credits are charged for Qwen failures

#### **Legacy Three-Step Flow** (when `USE_QWEN_FUSION=false`)

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

### **Primary Approach: Qwen Fusion** (when `USE_QWEN_FUSION=true`)
- **Qwen Direct Fusion**: Uses `qwen/qwen-image` model to directly blend two Pokémon images
  - Accepts multiple images as input via `images` parameter
  - Generates fusion with transparent background
  - Single API call replaces entire traditional 3-step pipeline
  - Prompt: Detailed fusion instructions with specific visual requirements
  - Fallback: Simple Method (original Pokémon image) without charging credits

### **Legacy Approaches** (when `USE_QWEN_FUSION=false`)
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

### **Universal Fallback**
- **Simple Method**: Uses one of the original Pokémon images as a fallback if all AI generation methods fail

## Generation Model Details

### **Qwen Fusion Process** (Primary Method)

The Qwen single-step fusion works as follows:
1. Both original Pokémon images are sent directly to `qwen/qwen-image`
2. A detailed fusion prompt is provided with specific requirements:
   ```
   Create a fusion creature that combines both Pokemon while maintaining a transparent background.
   The fusion should be a single, unique creature with features from both Pokemon.
   Keep the main feature traits from both original Pokemon.
   Style: cartoon-like, anime-inspired, clean design.
   Background: completely transparent.
   Quality: high detail and clarity.
   ```
3. Qwen generates the final fusion image in a single API call
4. No intermediate steps or additional processing required
5. Result is stored directly in Supabase storage

### **GPT-4 Vision Description Process** (Legacy Method)

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

## Environment Configuration

### **Required Environment Variables**

#### **For Qwen Fusion** (when `USE_QWEN_FUSION=true`)
```bash
# Enable Qwen fusion mode
USE_QWEN_FUSION=true

# Replicate API (required for Qwen model)
REPLICATE_API_TOKEN=your_replicate_token

# Multi-step UI (recommended)
ENABLE_MULTI_STEP_UI=true
NEXT_PUBLIC_ENABLE_MULTI_STEP_UI=true
```

#### **For Legacy Mode** (when `USE_QWEN_FUSION=false`)
```bash
# Disable Qwen fusion mode
USE_QWEN_FUSION=false

# OpenAI API (required for GPT models)
OPENAI_API_KEY=your_openai_key
USE_OPENAI_MODEL=true
USE_GPT_VISION_ENHANCEMENT=true

# Replicate API (for blend-images model)
REPLICATE_API_TOKEN=your_replicate_token
USE_REPLICATE_BLEND=true

# Multi-step UI
ENABLE_MULTI_STEP_UI=true
NEXT_PUBLIC_ENABLE_MULTI_STEP_UI=true
```

### **Configuration Examples**

#### **Production Setup with Qwen**
```bash
USE_QWEN_FUSION=true
ENABLE_MULTI_STEP_UI=true
NEXT_PUBLIC_ENABLE_MULTI_STEP_UI=true
REPLICATE_API_TOKEN=r8_xxxxx
```

#### **Fallback Setup (Legacy Mode)**
```bash
USE_QWEN_FUSION=false
USE_OPENAI_MODEL=true
USE_GPT_VISION_ENHANCEMENT=true
USE_REPLICATE_BLEND=true
ENABLE_MULTI_STEP_UI=true
NEXT_PUBLIC_ENABLE_MULTI_STEP_UI=true
OPENAI_API_KEY=sk-xxxxx
REPLICATE_API_TOKEN=r8_xxxxx
```

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

The fusion generation process includes a credit system with enhanced logic for different generation methods:

### **Credit Charging Logic**
1. **Successful AI Generation**: Consumes 1 credit per generation
   - Qwen fusion success
   - Traditional 3-step pipeline success (Replicate Blend + GPT Enhancement)
2. **User Credit Check**: Balance verified before starting generation
3. **Insufficient Credits**: Returns 402 Payment Required response
4. **Failure Protection**: Credits are only deducted after confirmed successful AI generation

### **No-Charge Scenarios**
- **Qwen Failure Fallback**: If Qwen generation fails, system falls back to Simple Method without charging
- **Traditional Failure Fallback**: If traditional pipeline fails, system falls back to Simple Method without charging
- **Simple Method**: Always free (uses original Pokémon image)

## Timeout Configuration

The system uses environment-specific timeouts optimized for Vercel Pro plan with multi-step UI approach:

### Multi-Step Timeout Strategy

Each step in the UI has its own timeout to prevent the entire flow from appearing to fail:

#### **Qwen Mode Timeouts** (when `USE_QWEN_FUSION=true`) - Optimized for Vercel Hobby Plan
1. **Step 1: "Capturing Pokémons"** - Artificial timing: 5 seconds
2. **Step 2: "Merging Pokémons"** - Artificial timing: 5 seconds  
3. **Step 3: "Pokédex Entering"** - Qwen generation timeout:
   - Production: 50 seconds
   - Development: 45 seconds
   - Falls back to Simple Method if exceeded

#### **Legacy Mode Timeouts** (when `USE_QWEN_FUSION=false`) - Optimized for Vercel Hobby Plan
1. **Step 1: "Capturing Pokémons" (Replicate Blend)**
   - Production: 40 seconds
   - Development: 35 seconds
   - UI shows fallback to Simple Method if exceeded

2. **Step 2: "Merging Pokémons" (GPT-4 Vision Description)**
   - Production: 30 seconds
   - Development: 25 seconds
   - UI shows fallback to Simple Method if exceeded

3. **Step 3: "Pokédex Entering" (GPT Image Enhancement)**
   - Production: 25 seconds
   - Development: 20 seconds
   - UI shows fallback to Simple Method if exceeded

### API Implementation 

The system uses **Server-Sent Events (SSE)** for real-time step updates:

- **Endpoint**: `/api/generate/stream` - Streams step updates to frontend
- **Connection**: Maintains real-time connection throughout entire process
- **Compatibility**: Works seamlessly with both Qwen and Legacy generation modes
- **Fallback**: If streaming fails, frontend can fall back to regular `/api/generate` endpoint

### **System Optimization for Vercel Plans**

The system is currently optimized for **Vercel Hobby Plan** (60-second function limit):

#### **Current Configuration** (Hobby Plan - 60 seconds max)
1. **API Route Timeout**: 60 seconds - maximum allowed for Vercel Hobby plan
2. **Individual Service Timeouts**:
   - Replicate Blend: 40 seconds (production) / 35 seconds (development)
   - GPT-4 Vision Description: 30 seconds (production) / 25 seconds (development)
   - GPT-image-1 Enhancement: 25 seconds (production) / 20 seconds (development)
   - Qwen Fusion: 50 seconds (production) / 45 seconds (development)
   - Supabase Upload: 10 seconds (both production and development)
   - OpenAI Client: 50 seconds (production) / 45 seconds (development)

#### **For Vercel Pro Plan Users** (300-second function limit)
If you upgrade to Vercel Pro plan, you can increase these timeouts for better reliability:
- Set `maxDuration = 300` in both `route.ts` files
- Increase individual service timeouts proportionally
- Update timeout configurations in `config.ts`, `dalle.ts`, `replicate-blend.ts`, and `stream/route.ts`

## Error Handling and Fallbacks

The system includes robust multi-level fallback mechanisms for both generation modes:

### **Qwen Mode Fallbacks** (when `USE_QWEN_FUSION=true`)
1. **Primary**: Qwen direct fusion generation
2. **Timeout/Failure**: Falls back to Simple Method (original Pokémon image)
3. **Credit Protection**: No credits charged for Qwen failures
4. **Retries**: Includes retry logic with exponential backoff

### **Legacy Mode Fallbacks** (when `USE_QWEN_FUSION=false`)
1. **Primary Generation**: Replicate Blend → GPT-4 Vision Description → GPT-image-1 Enhancement
2. **If GPT-4 Vision description fails**: Use generic enhancement prompt with GPT-image-1
3. **If GPT Image Enhancement fails**: Use the Simple Method (one of the original Pokémon images)
4. **If Replicate Blend fails**: Use Simple Method (one of the original Pokémon images)
5. **Retries**: Each implementation includes retries for API calls with exponential backoff

### **Universal Protections**
- **Credit Safety**: Users only charged for successful AI generations
- **Graceful Degradation**: System always provides a result (even if Simple Method)
- **Error Logging**: Comprehensive error tracking for debugging

## Image Storage Strategy

Successfully generated fusion images are stored in Supabase with different naming conventions:

### **Qwen Generated Images**
- **Naming**: `fusion-qwen_{timestamp}.png`
- **Source**: Qwen model returns direct URLs from replicate.delivery
- **Storage**: Downloaded and re-uploaded to Supabase as PNG to preserve transparency

### **Legacy Generated Images**  
- **Direct URLs**: When OpenAI returns a URL directly, it's used as-is
- **Supabase Storage**: When OpenAI returns base64 data, it's uploaded to Supabase
  - **Naming**: `fusion-gpt-enhanced-{timestamp}-{randomId}.png`
  - **Tracking**: Original image IDs maintained when possible to track relationships

### **Simple Method Images**
- **Source**: Original Pokémon images (no additional storage needed)
- **Usage**: Direct reference to existing Pokémon image URLs

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

The system maintains backwards compatibility with multiple configuration options:

1. **API Endpoints**: 
   - `/api/generate` - Works for both Qwen and Legacy modes
   - `/api/generate/stream` - Streaming version for multi-step UI
2. **Feature Flags**: 
   - `USE_QWEN_FUSION` - Toggle between Qwen and Legacy generation
   - `ENABLE_MULTI_STEP_UI` - Toggle between streaming and single-response UI
3. **Graceful Degradation**: If streaming fails, falls back to single-response approach

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

