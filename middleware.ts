import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublic = createRouteMatcher([
  "/",
  "/login(.*)",
  "/sign-up(.*)",
  "/api/try(.*)",
  "/api/auth/register(.*)",
  "/api/health(.*)",
  "/api/analytics(.*)",
  "/sitemap.xml",
  "/robots.txt",
  "/opengraph-image(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
