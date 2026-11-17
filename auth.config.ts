import type { NextAuthConfig } from "next-auth";

/**
 * Lightweight auth config — no DB imports, edge-runtime compatible.
 * Used by middleware to check if user is authenticated.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      // Protect dashboard and project routes
      const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/projects") ||
        pathname.startsWith("/api/projects");

      if (isProtected) {
        return !!auth?.user; // Redirect to /login if not authenticated
      }

      return true;
    },
  },
  providers: [], // Providers are only needed in auth.ts (Node.js runtime)
};
