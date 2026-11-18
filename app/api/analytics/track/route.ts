import { NextRequest, NextResponse } from "next/server";
import { track, trackPageView } from "@/lib/analytics";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    // Use null for analytics — we just track presence, not tied to integer userId
    const userId = clerkId ? null : null;
    const body = await req.json();
    const { type, event, category, properties, path, referrer, sessionId } = body;

    if (type === "pageview") {
      await trackPageView(path, userId, sessionId, referrer);
    } else if (type === "event") {
      await track(event, category, properties ?? {}, userId, sessionId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
