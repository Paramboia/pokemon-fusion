import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// This function will run before each request to add debugging
function logRequest(req: NextRequest) {
  console.log(`Middleware - Processing request for: ${req.url}`);
  
  // Add special logging for test routes
  if (req.url.includes('/api/test-') || req.url.includes('/api/generate')) {
    console.log(`Middleware - TEST ROUTE DETECTED: ${req.url}`);
  }
}

// Define public routes using createRouteMatcher
const isPublicRoute = createRouteMatcher([
  '/',
  '/home',
  '/favorites',
  '/gallery',
  '/popular',
  '/credits',
  '/api/webhooks(.*)',
  '/api/auth(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/community',
  '/about',
  '/api/pokemon(.*)',
  '/api/community(.*)',
  '/api/health',
  '/api/credits/checkout',
  '/api/webhooks/stripe(.*)',
  '/api/webhooks/stripe/test',
  '/api/webhooks/stripe/verify',
  '/api/proxy-pokemon-image(.*)',
  // Add test routes as public routes
  '/api/test-(.*)', // Match all test routes
  '/api/test-dalle',
  '/api/test-openai-basic',
  '/api/test-openai(.*)',
  '/api/test-env',
  '/api/test-supabase(.*)',
  '/api/generate', // Make the main generate endpoint public for testing
  '/api/test-static',
  '/api/notifications(.*)', // Allow notification endpoints for cron jobs and sync
  '/_next(.*)',
  '/favicon.ico',
  '/sitemap.xml',
  '/robots.txt',
  '/manifest.json',
  '/images(.*)',
  '/pokemon/(.*)',
  '/fonts(.*)',
  '/icons(.*)',
  '/styles(.*)',
  '/scripts(.*)',
]);

// Middleware that handles authentication and logging
export default clerkMiddleware(async (auth, req) => {
  // Log the request
  logRequest(req);
  
  // Special handling for test routes to ensure they're not blocked
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/test-') || url.pathname === '/api/generate') {
    console.log(`Middleware - Bypassing auth for test route: ${url.pathname}`);
    return NextResponse.next();
  }
  
  // If the user is authenticated and we have a userId, log it
  const session = await auth();
  if (session.userId) {
    console.log(`Middleware - User authenticated: ${session.userId}`);
  } else {
    console.log(`Middleware - User not authenticated for: ${req.url}`);
  }
  
  // If it's not a public route, protect it
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  
  // Allow the request to proceed
  return NextResponse.next();
}, {
  // Add security configuration for production
  // Update this with your actual domain when deploying to production
  authorizedParties: process.env.NODE_ENV === 'production' 
    ? [`https://${process.env.VERCEL_URL}`, 'https://pokemon-fusion.com'] // Replace with your actual domain
    : undefined,
});

// Configure matcher to exclude static files but include API routes
export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /_next (Next.js internals)
     * 2. /_static (static files)
     * 3. /_vercel (Vercel internals)
     * 4. Static files with extensions (.jpg, .png, etc.)
     * 5. /pokemon directory (added to fix image loading)
     */
    "/((?!_next|_static|_vercel|pokemon|[\\w-]+\\.\\w+).*)",
    "/",
    // Explicitly include all API routes for testing
    "/api/(.*)",
  ],
};