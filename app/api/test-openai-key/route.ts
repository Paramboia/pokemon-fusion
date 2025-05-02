import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  // Simple endpoint to test OpenAI API key
  const timestamp = new Date().toISOString();
  console.log(`🔑 OpenAI Key Test [${timestamp}] - Starting test`);
  
  try {
    // Get the API key
    const apiKey = process.env.OPENAI_API_KEY;
    
    // Check if API key exists
    if (!apiKey) {
      console.error(`🔑 OpenAI Key Test [${timestamp}] - No API key found in environment variables`);
      return NextResponse.json({
        success: false,
        error: "No OpenAI API key found",
        timestamp
      });
    }
    
    // Log key format (not the actual key) for debugging
    const keyFormat = apiKey.startsWith('sk-') 
      ? `starts with 'sk-' and is ${apiKey.length} characters long` 
      : "doesn't start with 'sk-'";
    console.log(`🔑 OpenAI Key Test [${timestamp}] - API key ${keyFormat}`);
    
    // Try to initialize the client
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 30000, // 30 seconds timeout
        maxRetries: 1
      });
      
      console.log(`🔑 OpenAI Key Test [${timestamp}] - OpenAI client created successfully`);
      
      // First list available models to see what we have access to
      console.log(`🔑 OpenAI Key Test [${timestamp}] - Listing available models`);
      const models = await openai.models.list();
      const modelNames = models.data.map(m => m.id);
      console.log(`🔑 OpenAI Key Test [${timestamp}] - Available models:`, modelNames.join(', '));
      
      return NextResponse.json({
        success: true,
        message: "OpenAI API key is valid and working",
        availableModels: modelNames,
        timestamp
      });
    } catch (clientError) {
      console.error(`🔑 OpenAI Key Test [${timestamp}] - Error creating or using OpenAI client:`, clientError);
      return NextResponse.json({
        success: false,
        error: `OpenAI client error: ${clientError.message}`,
        timestamp
      });
    }
  } catch (error) {
    console.error(`🔑 OpenAI Key Test [${timestamp}] - Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      error: `Unexpected error: ${error.message}`,
      timestamp
    });
  }
} 