import { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://aeo-tracker-navy.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/projects", "/admin", "/api/"],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/dashboard", "/projects", "/admin", "/api/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/dashboard", "/projects", "/admin", "/api/"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/dashboard", "/projects", "/admin", "/api/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/dashboard", "/projects", "/admin", "/api/"],
      },
      {
        userAgent: "cohere-ai",
        allow: "/",
        disallow: ["/dashboard", "/projects", "/admin", "/api/"],
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: ["/dashboard", "/projects", "/admin", "/api/"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
