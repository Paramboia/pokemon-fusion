import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(request: Request) {
  try {
    // Get the image name from query parameters
    const url = new URL(request.url);
    const imageName = url.searchParams.get('name');
    
    if (!imageName) {
      return NextResponse.json({ error: 'Image name is required' }, { status: 400 });
    }
    
    // Ensure the image name is safe (only alphanumeric and allowed extensions)
    if (!/^[a-zA-Z0-9-]+\.(png|jpg|jpeg|svg|webp)$/.test(imageName)) {
      return NextResponse.json({ error: 'Invalid image name format' }, { status: 400 });
    }
    
    // Construct the path to the image in the public directory
    const imagePath = path.join(process.cwd(), 'public', 'pokemon', imageName);
    
    // Check if the file exists
    if (!fs.existsSync(imagePath)) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    // Read the file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Determine content type based on extension
    const extension = path.extname(imageName).toLowerCase();
    let contentType = 'image/png'; // Default
    
    if (extension === '.jpg' || extension === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (extension === '.svg') {
      contentType = 'image/svg+xml';
    } else if (extension === '.webp') {
      contentType = 'image/webp';
    }
    
    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error serving Pokemon image:', error);
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
} 