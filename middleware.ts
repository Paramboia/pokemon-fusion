import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple middleware that allows all requests
export function middleware(request: NextRequest) {
  console.log(`Middleware - Processing request for: ${request.url}`);
  return NextResponse.next();
}

// Configure matcher to exclude static files
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