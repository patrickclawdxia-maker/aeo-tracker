import { MetadataRoute } from "next";

const APP_URL = process.env.NEXTAUTH_URL || "https://aeo-tracker.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/projects", "/admin", "/api/"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
