import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { pokemon1, pokemon2, name1, name2 } = await req.json();

    const output = await replicate.run(
      "fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867",
      {
        input: {
          image_1: pokemon1,
          image_2: pokemon2,
          prompt: `a fusion of ${name1} and ${name2}, pokemon style, digital art`,
          merge_mode: "left_right",
          upscale_2x: true,
          negative_prompt: "ugly, deformed, noisy, blurry, distorted",
        }
      }
    );

    return NextResponse.json({ url: output[0], id: Date.now().toString() });
  } catch (error) {
    console.error('Error generating fusion:', error);
    return NextResponse.json(
      { error: 'Failed to generate fusion' },
      { status: 500 }
    );
  }
} 