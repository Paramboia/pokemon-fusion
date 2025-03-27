import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// This function will run before each request to add debugging
function logRequest(req: NextRequest) {
  console.log(`Middleware - Processing request for: ${req.url}`);
}

// Handle non-www to www redirects
function handleDomainRedirects(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get('host') || '';
  
  // Check if we're on the naked domain (without www)
  if (hostname === 'pokemon-fusion.com') {
    console.log(`Middleware - Redirecting from naked domain to www: ${hostname}`);
    
    // Create the new URL with www
    const wwwUrl = new URL(url.pathname + url.search, `https://www.pokemon-fusion.com`);
    
    // Return a 301 permanent redirect
    return NextResponse.redirect(wwwUrl.toString(), 301);
  }
  
  return null;
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
  
  // Check if we need to redirect from non-www to www
  const redirectResponse = handleDomainRedirects(req);
  if (redirectResponse) {
    return redirectResponse;
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