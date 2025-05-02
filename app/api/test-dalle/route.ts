import { NextResponse } from 'next/server';
import { testOpenAiClient, enhanceWithDirectGeneration } from '../generate/dalle';

export async function GET(req: Request) {
  const requestId = `test-dalle-${Date.now()}`;
  try {
    console.warn(`[${requestId}] TEST DALLE - GET request received`);
    
    // Test the OpenAI client first
    console.warn(`[${requestId}] TEST DALLE - Testing OpenAI client`);
    const clientTest = await testOpenAiClient();
    
    // Return early if the client test fails
    if (!clientTest) {
      console.error(`[${requestId}] TEST DALLE - OpenAI client test failed`);
      return NextResponse.json({
        success: false,
        error: 'OpenAI client test failed',
        clientTest,
        requestId
      }, { status: 500 });
    }
    
    // Use a sample creature image from the official repo (avoiding copyright terms)
    const testImageUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png'; // Electric creature
    
    // Call the enhancement function directly - GPT-image-1 can take up to 2 minutes per documentation
    console.warn(`[${requestId}] TEST DALLE - Calling enhanceWithDirectGeneration with a 3-minute timeout (GPT-image-1 can take 2+ minutes)`);
    
    // Create a timeout promise - giving a bit more than 2 minutes to allow for network latency
    const timeout = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.error(`[${requestId}] TEST DALLE - Enhancement timed out after 3 minutes`);
        resolve(null);
      }, 180000); // 3 minutes (180 seconds)
    });
    
    // Race the enhancement against the timeout - passing empty strings for pokemon names as they're not used anymore
    const enhancedUrl = await Promise.race([
      enhanceWithDirectGeneration(
        '', // No pokemon1Name needed
        '', // No pokemon2Name needed
        testImageUrl,
        0, // retryCount
        requestId // Pass the request ID for consistent logging
      ),
      timeout
    ]);
    
    if (enhancedUrl) {
      console.warn(`[${requestId}] TEST DALLE - Enhancement succeeded`);
      return NextResponse.json({
        success: true,
        originalImage: testImageUrl,
        enhancedImage: enhancedUrl,
        requestId
      });
    } else {
      console.error(`[${requestId}] TEST DALLE - Enhancement failed or timed out - this is expected as GPT-image-1 can take up to 2 minutes`);
      return NextResponse.json({
        success: false,
        error: 'Enhancement failed or timed out (GPT-image-1 can take up to 2 minutes)',
        originalImage: testImageUrl,
        requestId,
        note: "If testing in browser, consider that API routes may time out after 1 minute in development mode"
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
      suggestion: "Consider using a standalone Node.js script to test GPT-image-1 due to its long processing time"
    }, { status: 500 });
  }
} 