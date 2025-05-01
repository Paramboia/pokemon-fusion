import { NextResponse } from 'next/server';

// CommonJS-style import
const OpenAI = require('openai');

export async function GET() {
  // Response to collect all debug info
  const debugInfo = {
    openai_init: "Not attempted",
    openai_client_keys: [],
    api_key_present: false,
    api_key_format: "None",
    api_call_attempted: false,
    api_call_result: null,
    error: null
  };
  
  try {
    // Check API key
    const apiKey = process.env.OPENAI_API_KEY || '';
    debugInfo.api_key_present = !!apiKey;
    debugInfo.api_key_format = apiKey ? 
      `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 
      "Missing";
    
    // Try to initialize OpenAI
    try {
      debugInfo.openai_init = "Starting";
      
      const openai = new OpenAI({
        apiKey: apiKey,
        timeout: 30000,
        maxRetries: 0
      });
      
      // Check what's available in the client
      debugInfo.openai_client_keys = Object.keys(openai || {});
      debugInfo.openai_init = "Success";
      
      // Try a simple API call
      try {
        debugInfo.api_call_attempted = true;
        
        // Try to list models first (fastest call)
        if (typeof openai.models?.list === 'function') {
          const models = await openai.models.list();
          debugInfo.api_call_result = {
            models_count: models.data.length,
            image_models: models.data
              .filter(m => m.id.includes('dall-e') || m.id.includes('gpt-image'))
              .map(m => m.id)
          };
        } else {
          // Try a simple image generation
          const response = await openai.images.generate({
            model: "gpt-image-1",
            prompt: "A simple test image",
            n: 1,
            size: "1024x1024",
            quality: "high"
          });
          
          debugInfo.api_call_result = {
            success: !!response.data,
            data_length: response.data?.length || 0,
            first_item_keys: response.data?.[0] ? Object.keys(response.data[0]) : []
          };
        }
      } catch (apiCallError) {
        debugInfo.api_call_result = {
          error: apiCallError.message,
          error_type: apiCallError.constructor?.name,
          status: apiCallError.status,
          details: apiCallError.error || {}
        };
      }
    } catch (initError) {
      debugInfo.openai_init = "Failed";
      debugInfo.error = {
        message: initError.message,
        stack: initError.stack?.split('\n').slice(0, 3)
      };
    }
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    return NextResponse.json({
      error: "Fatal error in diagnostic endpoint",
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    }, { status: 500 });
  }
} 