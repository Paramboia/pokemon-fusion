import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// First, handle the www to non-www redirect
export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  
  // If the hostname is www.pokemon-fusion.com, redirect to pokemon-fusion.com
  if (hostname === 'www.pokemon-fusion.com') {
    const newUrl = new URL(url.pathname + url.search, `https://pokemon-fusion.com`);
    return NextResponse.redirect(newUrl);
  }
  
  // Otherwise, continue with the request
  return clerkMiddlewareHandler(request);
}

// Then, handle Clerk authentication
const clerkMiddlewareHandler = clerkMiddleware((auth, request) => {
  // Define public routes that don't require authentication
  const isPublicRoute = createRouteMatcher([
    "/", 
    "/popular", 
    "/favorites", 
    "/api/generate", 
    "/api/webhooks(.*)",
    "/about",
    "/explore"
  ]);
  
  // If it's not a public route, protect it
  if (!isPublicRoute(request)) {
    return auth.protect();
  }
});

// Stop Middleware running on static files and configure matcher
export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api/auth routes
     * 2. /_next (Next.js internals)
     * 3. /_static (static files)
     * 4. /_vercel (Vercel internals)
     * 5. Static files with extensions (.jpg, .png, etc.)
     */
    "/((?!api/auth|_next|_static|_vercel|[\\w-]+\\.\\w+).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};

// Temporary middleware that does nothing
// export default function middleware() {
//   return;
// }