import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "./components/Analytics";
import { AppShell } from "./components/AppShell";

const inter = Inter({ subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://aeo-tracker-navy.vercel.app";

const META_DESCRIPTION =
  "AEO Tracker helps you monitor and improve your brand's visibility in AI-generated answers from ChatGPT, Gemini, and Claude. Track mentions, citations, share of voice, and content gaps — the SEMrush for the AI era. Free to start.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "AEO Tracker — AI Engine Optimization & Brand Visibility",
    template: "%s | AEO Tracker",
  },
  description: META_DESCRIPTION,
  keywords: [
    "AEO tracker",
    "AI engine optimization",
    "brand visibility AI",
    "ChatGPT brand mentions",
    "Gemini brand tracking",
    "AI search optimization",
    "AI SEO",
    "share of voice AI",
    "citation tracking",
    "LLM brand monitoring",
    "generative AI search",
    "AI answer optimization",
  ],
  authors: [{ name: "AEO Tracker" }],
  creator: "AEO Tracker",
  publisher: "AEO Tracker",
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "AEO Tracker",
    title: "AEO Tracker — AI Engine Optimization & Brand Visibility",
    description: META_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AEO Tracker — The SEMrush for the AI Era",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AEO Tracker — AI Engine Optimization & Brand Visibility",
    description: META_DESCRIPTION,
    images: ["/og-image.png"],
    creator: "@aeotracker",
  },
  alternates: {
    canonical: APP_URL,
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AEO Tracker",
  url: APP_URL,
  description:
    "AEO Tracker helps you monitor and improve your brand's visibility in AI-generated answers from ChatGPT, Gemini, and Claude. Track mentions, citations, share of voice, and content gaps — the SEMrush for the AI era. Free to start.",
  logo: `${APP_URL}/favicon.ico`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen`}>
          <Script
            id="org-json-ld"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
          />
          <Analytics />
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
