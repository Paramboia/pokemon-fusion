import { authMiddleware } from "@clerk/nextjs";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default authMiddleware({
  // Add any public routes that don't require authentication
  publicRoutes: ["/", "/popular", "/favorites", "/api/generate"],
  ignoredRoutes: ["/api/webhooks(.*)"]
});

// Stop Middleware running on static files
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};

// Temporary middleware that does nothing
// export default function middleware() {
//   return;
// }