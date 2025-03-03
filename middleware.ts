import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This function will run before each request to add debugging
function logRequest(req: NextRequest) {
  console.log(`Middleware - Processing request for: ${req.url}`);
}

// Temporary middleware that allows all requests
export default function middleware(req: NextRequest) {
  logRequest(req);
  return NextResponse.next();
}

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