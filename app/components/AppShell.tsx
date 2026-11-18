"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/sign-up");

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="mesh-bg flex-1 overflow-y-auto px-8 py-8">
        {children}
      </main>
    </div>
  );
}
