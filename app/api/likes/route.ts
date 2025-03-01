import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { likeFusion } from '@/lib/supabase-server-actions';

export async function POST(req: Request) {
  try {
    // Get the current user ID from Clerk
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { fusionId } = body;

    // Validate the request parameters
    if (!fusionId) {
      return NextResponse.json(
        { error: 'Missing fusion ID' },
        { status: 400 }
      );
    }

    // Like the fusion
    const success = await likeFusion(fusionId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to like fusion' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error liking fusion:', error);
    return NextResponse.json(
      { error: 'Failed to like fusion' },
      { status: 500 }
    );
  }
} 