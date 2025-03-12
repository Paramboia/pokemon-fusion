import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Fetch the image with proper headers
    const response = await fetch(imageUrl, {
      headers: {
        'Accept': 'image/*',
        // Add Azure-specific headers if needed
        'x-ms-version': '2024-02-04',
        'x-ms-date': new Date().toUTCString(),
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    // Get the image data and content type
    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // Return the image with proper headers
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'attachment',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
} 