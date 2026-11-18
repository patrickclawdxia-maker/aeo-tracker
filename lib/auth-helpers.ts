import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Returns a stable integer userId from a Clerk user ID string.
 * Uses a simple djb2 hash — same input always gives same output.
 * This lets us keep the existing integer-keyed DB schema without migration.
 */
function clerkIdToInt(clerkId: string): number {
  let hash = 5381;
  for (let i = 0; i < clerkId.length; i++) {
    hash = ((hash << 5) + hash) + clerkId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

export async function getAuthSession() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return {
      session: null,
      userId: null,
      clerkUserId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return {
    session: { user: { id: clerkUserId } },
    userId: clerkIdToInt(clerkUserId),
    clerkUserId,
    error: null,
  };
}
