import { NextRequest, NextResponse } from "next/server";
import { track, trackPageView } from "@/lib/analytics";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? parseInt(session.user.id) : null;
    const body = await req.json();
    const { type, event, category, properties, path, referrer, sessionId } = body;

    if (type === "pageview") {
      await trackPageView(path, userId, sessionId, referrer);
    } else if (type === "event") {
      await track(event, category, properties ?? {}, userId, sessionId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // always 200
  }
}
