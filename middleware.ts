import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authMiddleware, clerkClient, getAuth } from "@clerk/nextjs/server";

// This function will run before each request to add debugging
function logRequest(req: NextRequest) {
  console.log(`Middleware - Processing request for: ${req.url}`);
}

// Middleware that handles authentication and logging
export default authMiddleware({
  beforeAuth: (req) => {
    logRequest(req);
    return NextResponse.next();
  },
  afterAuth: async (auth, req) => {
    // If the user is authenticated and we have a userId, sync with Supabase
    if (auth.userId) {
      console.log(`Middleware - User authenticated: ${auth.userId}`);
    } else {
      console.log(`Middleware - User not authenticated for: ${req.url}`);
    }
    
    // Allow the request to proceed
    return NextResponse.next();
  },
  publicRoutes: [
    '/',
    '/home',
    '/api/webhooks(.*)',
    '/api/auth(.*)',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/community',
    '/about',
    '/api/pokemon(.*)',
    '/api/community(.*)',
    '/api/health',
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
  ],
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