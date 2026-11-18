import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { pool } from "@/lib/pool";

/**
 * Returns a stable integer userId from a Clerk user ID string.
 * Uses a simple djb2 hash — same input always gives same output.
 */
function clerkIdToInt(clerkId: string): number {
  let hash = 5381;
  for (let i = 0; i < clerkId.length; i++) {
    hash = ((hash << 5) + hash) + clerkId.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Ensures a row exists in the users table for this Clerk user.
 * Uses INSERT ... ON CONFLICT DO NOTHING so it's safe to call on every request.
 */
async function ensureUserRow(userId: number, clerkUserId: string) {
  try {
    // Try to get email from Clerk
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${clerkUserId}@clerk.local`;
    const name = clerkUser?.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
      : email.split("@")[0];

    await pool.query(
      `INSERT INTO users (id, email, name, created_at, plan, daily_quota)
       VALUES ($1, $2, $3, NOW(), 'free', 50)
       ON CONFLICT (id) DO NOTHING`,
      [userId, email, name]
    );
  } catch {
    // Non-fatal — quota/projects will just use the id directly
  }
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
  const userId = clerkIdToInt(clerkUserId);
  await ensureUserRow(userId, clerkUserId);
  return {
    session: { user: { id: clerkUserId } },
    userId,
    clerkUserId,
    error: null,
  };
}
