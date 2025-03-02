import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  return NextResponse.json({
    success: true,
    message: 'API is working correctly',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  try {
    // Parse the request body
    const body = await req.json();
    
    return NextResponse.json({
      success: true,
      message: 'POST request received successfully',
      receivedData: body,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in test-api POST:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error processing request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
} 