export async function GET() {
  return new Response(JSON.stringify({
    message: 'Static test response',
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
} 