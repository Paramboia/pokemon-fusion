import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Stripe webhook URL is correctly configured',
    webhook_secret: process.env.STRIPE_WEBHOOK_SECRET ? 'Configured' : 'Missing',
    url: req.url
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    return NextResponse.json({
      success: true,
      message: 'Received POST request to webhook verify endpoint',
      headers: Object.fromEntries(req.headers.entries()),
      body
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to parse request body',
      error: error.message
    });
  }
} 