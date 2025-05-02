import { NextResponse } from 'next/server';
import { testOpenAiClient, enhanceWithDirectGeneration } from '../generate/dalle';
import OpenAI from 'openai';

export async function GET(req: Request) {
  const requestId = `test-dalle-${Date.now()}`;
  try {
    console.warn(`[${requestId}] TEST DALLE - GET request received`);
    
    // Test the OpenAI client first using the direct approach
    console.warn(`[${requestId}] TEST DALLE - Testing OpenAI client directly`);
    
    // Check if an API key exists
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error(`[${requestId}] TEST DALLE - No API key found in environment variables`);
      return NextResponse.json({
        success: false,
        error: 'No OpenAI API key found',
        clientTest: false,
        requestId
      }, { status: 500 });
    }
    
    // Create a client
    const openai = new OpenAI({
      apiKey: apiKey,
      timeout: 30000,
      maxRetries: 1
    });
    
    // Test with DALL-E 2 first (more widely available)
    console.warn(`[${requestId}] TEST DALLE - Testing DALL-E 2 generation`);
    try {
      const dalleResponse = await openai.images.generate({
        model: "dall-e-2",
        prompt: "A simple blue creature on a white background",
        n: 1,
        size: "256x256" // Smallest size for quicker test
      });
      
      // If we got this far, the client is working
      console.warn(`[${requestId}] TEST DALLE - DALL-E 2 test successful`);
      
      // We can now try the enhancement function if needed
      if (req.headers.get('X-Test-Enhancement') === 'true') {
        console.warn(`[${requestId}] TEST DALLE - Will also test enhancement function`);
        
        // Use a sample creature image
        const testImageUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png';
        
        // Call the enhancement function with empty strings for pokemon names
        console.warn(`[${requestId}] TEST DALLE - Testing enhancement function`);
        const enhancedUrl = await enhanceWithDirectGeneration(
          '', // No pokemon1Name needed
          '', // No pokemon2Name needed
          testImageUrl,
          0,
          requestId
        );
        
        if (enhancedUrl) {
          console.warn(`[${requestId}] TEST DALLE - Enhancement test successful`);
          return NextResponse.json({
            success: true,
            clientTest: true,
            enhancementTest: true,
            originalImage: testImageUrl,
            enhancedImage: enhancedUrl,
            requestId
          });
        } else {
          console.warn(`[${requestId}] TEST DALLE - Enhancement test failed but client test passed`);
          return NextResponse.json({
            success: true,
            clientTest: true,
            enhancementTest: false,
            message: "OpenAI client is working but enhancement failed",
            requestId
          });
        }
      }
      
      // Return success for client test only
      return NextResponse.json({
        success: true,
        clientTest: true,
        message: "OpenAI client is working correctly",
        requestId
      });
    } catch (dalleError) {
      console.error(`[${requestId}] TEST DALLE - DALL-E 2 test failed:`, dalleError.message);
      
      // Try the legacy test method as fallback
      console.warn(`[${requestId}] TEST DALLE - Trying legacy test method`);
      const legacyTest = await testOpenAiClient();
      
      if (legacyTest) {
        return NextResponse.json({
          success: true,
          clientTest: true,
          usedLegacyTest: true,
          message: "OpenAI client is working (via legacy test)",
          requestId
        });
      }
      
      return NextResponse.json({
        success: false,
        error: 'OpenAI client test failed with both new and legacy methods',
        clientTest: false,
        dalleError: dalleError.message,
        requestId
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`[${requestId}] TEST DALLE - Error:`, error);
    
    // Capture detailed information about the error
    const errorInfo = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    };
    
    // Try to capture more details if possible
    let additionalInfo = {};
    try {
      additionalInfo = JSON.stringify(error);
    } catch (e) {
      // Ignore if we can't stringify
    }
    
    return NextResponse.json({
      success: false,
      error: errorInfo.message,
      errorDetails: errorInfo,
      additionalInfo,
      requestId,
      suggestion: "Check your OpenAI API key and permissions"
    }, { status: 500 });
  }
} 