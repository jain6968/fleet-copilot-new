// middleware.ts
export { default } from "next-auth/middleware";

/**
 * Protect routes with NextAuth middleware.
 * 
 * - Any path matching the `matcher` is protected (requires authentication).
 * - Exclusions: `/login`, `/api/auth/*`, static assets (`/_next/*`, `favicon.ico`).
 * - If not authenticated, the user will be redirected to the Auth0 sign-in page.
 */
export const config = {
  matcher: [
    // Protect everything except login and NextAuth endpoints
    "/((?!login|api/auth|_next|favicon.ico).*)",
  ],
};
