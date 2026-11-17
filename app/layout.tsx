import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from "./components/Analytics";
import { AppShell } from "./components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AEO Tracker",
  description: "AI Engine Optimization Tracker — track brand mentions in AI search engines",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen`}>
        <Providers>
          <Analytics />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
