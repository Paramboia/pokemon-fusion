import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default clerkMiddleware(async (auth, request) => {
  // Handle www to non-www redirect
  const url = new URL(request.url);
  const hostname = url.hostname;
  
  // If the hostname is www.pokemon-fusion.com, redirect to pokemon-fusion.com
  if (hostname === 'www.pokemon-fusion.com') {
    url.hostname = 'pokemon-fusion.com';
    return NextResponse.redirect(url);
  }
  
  // Define public routes that don't require authentication
  const isPublicRoute = createRouteMatcher(["/", "/popular", "/favorites", "/api/generate", "/api/webhooks(.*)"]);
  
  // If it's not a public route, protect it
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

// Stop Middleware running on static files
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};

// Temporary middleware that does nothing
// export default function middleware() {
//   return;
// }