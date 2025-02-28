import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  
  // If the hostname is www.pokemon-fusion.com, redirect to pokemon-fusion.com
  if (hostname === 'www.pokemon-fusion.com') {
    url.hostname = 'pokemon-fusion.com';
    return NextResponse.redirect(url.toString(), 301);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 