import { authMiddleware, clerkClient } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This function will run before each request to add debugging
function logRequest(req: NextRequest) {
  console.log(`Middleware - Processing request for: ${req.url}`);
}

// Export the Clerk auth middleware with proper configuration
export default authMiddleware({
  debug: true, // Enable debug mode to see detailed logs
  publicRoutes: [
    "/", 
    "/api/hello",
    "/api/test-api(.*)",
    "/api/test-supabase-simple(.*)",
    "/api/auth/sync-user",
    "/api/generate",
    "/api/favorites(.*)",
    "/api/webhooks(.*)",
    "/api/likes(.*)",
    "/api/notifications(.*)",
    "/test-auth",
    "/debug",
    "/popular",
    "/community",
  ],
  beforeAuth: (req) => {
    logRequest(req);
    return NextResponse.next();
  },
  afterAuth: (auth, req) => {
    // If the user is authenticated or the route is public, allow the request
    if (auth.isPublicRoute) {
      return NextResponse.next();
    }

    // For API routes, allow the request even if not authenticated
    // This is important for your generate and favorites APIs
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    // If the user is not authenticated and the route is not public, redirect to sign-in
    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  },
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

// Temporary middleware that does nothing
// export default function middleware() {
//   return;
// }