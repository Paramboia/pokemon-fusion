import { NextResponse } from 'next/server';
import { testOpenAiClient } from '../generate/dalle';

export async function GET() {
  try {
    console.warn('TEST OPENAI BASIC - Starting test');
    
    // Test the OpenAI client
    const result = await testOpenAiClient();
    
    console.warn('TEST OPENAI BASIC - Test completed with result:', result);
    
    // Return the result
    return NextResponse.json({
      success: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('TEST OPENAI BASIC - Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 