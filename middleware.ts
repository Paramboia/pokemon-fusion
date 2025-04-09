import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// This function will run before each request to add debugging
function logRequest(req: NextRequest) {
  console.log(`Middleware - Processing request for: ${req.url}`);
}

// Define public routes using createRouteMatcher
const isPublicRoute = createRouteMatcher([
  '/',
  '/home',
  '/favorites',
  '/popular',
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
  '/_next(.*)',
  '/favicon.ico',
  '/sitemap.xml',
  '/robots.txt',
  '/manifest.json',
  '/images(.*)',
  '/fonts(.*)',
  '/icons(.*)',
  '/styles(.*)',
  '/scripts(.*)',
]);

// Middleware that handles authentication and logging
export default clerkMiddleware(async (auth, req) => {
  // Log the request
  logRequest(req);
  
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
     */
    "/((?!_next|_static|_vercel|[\\w-]+\\.\\w+).*)",
    "/",
  ],
};