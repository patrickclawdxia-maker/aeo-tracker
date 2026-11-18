import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "./components/Analytics";
import { AppShell } from "./components/AppShell";

const inter = Inter({ subsets: ["latin"] });

const APP_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://aeo-tracker-navy.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "AEO Tracker — AI Engine Optimization & Brand Visibility",
    template: "%s | AEO Tracker",
  },
  description:
    "Track your brand's visibility across ChatGPT, Gemini, and Claude. Monitor AI mentions, citations, share of voice, and competitor benchmarks — the SEMrush for the AI era.",
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
    description:
      "Track your brand's visibility across ChatGPT, Gemini, and Claude. Monitor AI mentions, citations, share of voice, and competitor benchmarks.",
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
    description:
      "Track your brand's visibility across ChatGPT, Gemini, and Claude. Monitor AI mentions, citations, share of voice, and competitor benchmarks.",
    images: ["/og-image.png"],
    creator: "@aeotracker",
  },
  alternates: {
    canonical: APP_URL,
  },
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
          <Analytics />
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
