import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authMiddleware, clerkMiddleware, getAuth } from "@clerk/nextjs";
import { clerkClient } from "@clerk/nextjs";

// Create a middleware that combines Clerk auth with our custom logic
const combinedMiddleware = authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: [
    '/',
    '/api/webhooks(.*)',
    '/api/auth/sync-user',
    '/api/generate',
    '/sign-in(.*)',
    '/sign-up(.*)',
  ],
  
  // Debug logs for authentication
  debug: true,
  
  // Function to run after Clerk's middleware
  afterAuth(auth, req, evt) {
    // Log authentication state
    console.log(`Middleware - Auth state for ${req.url}:`, { 
      userId: auth.userId, 
      isPublicRoute: auth.isPublicRoute,
      isApiRoute: req.url.includes('/api/')
    });
    
    // For API routes, ensure the auth token is passed
    if (req.url.includes('/api/') && auth.userId) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-clerk-user-id', auth.userId);
      
      // Create a new request with the updated headers
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      
      return response;
    }
    
    // For non-API routes, just continue
    return NextResponse.next();
  },
});

// Export the combined middleware
export default combinedMiddleware;

// Stop Middleware running on static files and configure matcher
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

// Temporary middleware that does nothing
// export default function middleware() {
//   return;
// }