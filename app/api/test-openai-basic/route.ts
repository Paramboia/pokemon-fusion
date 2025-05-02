import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  const requestId = `test-openai-basic-${Date.now()}`;
  console.warn(`[${requestId}] TEST OPENAI BASIC - Starting test`);
  
  try {
    // Get API key and validate it
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error(`[${requestId}] TEST OPENAI BASIC - No API key found`);
      return NextResponse.json({
        success: false,
        error: 'No OpenAI API key found in environment variables',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    // Log key format for debugging (just the beginning, not the whole key)
    const keyFormat = apiKey.startsWith('sk-') 
      ? `starts with 'sk-' and is ${apiKey.length} characters long` 
      : "doesn't start with 'sk-'";
    console.log(`[${requestId}] TEST OPENAI BASIC - API key ${keyFormat}`);
    
    // Create a basic OpenAI client
    console.warn(`[${requestId}] TEST OPENAI BASIC - Creating OpenAI client`);
    const openai = new OpenAI({
      apiKey: apiKey,
      timeout: 30000, // 30 seconds timeout
      maxRetries: 1
    });
    
    // Try a simple chat completions call with a model more widely available
    console.warn(`[${requestId}] TEST OPENAI BASIC - Testing chat completions API`);
    const completionResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use a more widely available model
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, how are you?" }
      ],
      max_tokens: 50
    });
    
    // Log basic info about the response
    const hasResponse = !!completionResponse;
    const hasChoices = hasResponse && Array.isArray(completionResponse.choices);
    const hasText = hasChoices && completionResponse.choices.length > 0 && !!completionResponse.choices[0].message;
    
    console.warn(`[${requestId}] TEST OPENAI BASIC - Chat completions test completed: ${hasText ? 'Success' : 'Failed'}`);
    
    // For successful response, return success
    if (hasText) {
      return NextResponse.json({
        success: true,
        message: "OpenAI API test successful",
        model: completionResponse.model,
        text: completionResponse.choices[0].message.content?.substring(0, 50) + "...",
        timestamp: new Date().toISOString()
      });
    }
    
    // If we reach here, the API call was made but the response was unexpected
    return NextResponse.json({
      success: false,
      error: "Received an unexpected response from OpenAI API",
      timestamp: new Date().toISOString()
    }, { status: 500 });
    
  } catch (error) {
    // Log the error details
    console.error(`[${requestId}] TEST OPENAI BASIC - Error:`, error.message);
    if (error.stack) console.error(`[${requestId}] TEST OPENAI BASIC - Stack:`, error.stack);
    
    // If the error indicates model not found, try an alternative approach with DALL-E
    if (error.message && error.message.includes('does not have access to model')) {
      console.warn(`[${requestId}] TEST OPENAI BASIC - Model access error, trying DALL-E test instead`);
      
      try {
        // Try image generation as a fallback test
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          timeout: 30000
        });
        
        const imageResponse = await openai.images.generate({
          model: "dall-e-2", // Use dall-e-2 which is more widely available
          prompt: "A simple blue creature on a white background",
          n: 1,
          size: "256x256" // Smallest size for quicker test
        });
        
        const hasImageData = imageResponse && imageResponse.data && imageResponse.data.length > 0;
        
        if (hasImageData) {
          return NextResponse.json({
            success: true,
            message: "OpenAI API test successful with image generation",
            model: "dall-e-2",
            timestamp: new Date().toISOString()
          });
        }
      } catch (imageError) {
        console.error(`[${requestId}] TEST OPENAI BASIC - DALL-E fallback error:`, imageError.message);
      }
    }
    
    // Try to extract OpenAI specific error info if available
    const openaiError = error.error || {};
    const statusCode = error.status || 500;
    
    return NextResponse.json({
      success: false,
      error: error.message,
      statusCode: statusCode,
      errorType: error.name || 'Unknown',
      openaiError: openaiError,
      timestamp: new Date().toISOString()
    }, { status: statusCode });
  }
} 