/**
 * User quota & referral helpers.
 *
 * Base daily limit: 50 queries.
 * Each successful referral grants the referrer +50 bonus queries (added to
 * quota_bonuses, counted on top of the daily base).
 *
 * "Query" here = one LLM call (one iteration of one query on one engine).
 * A full analysis run of N queries × 3 engines × 3 iterations consumes 9N queries.
 */

import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";

const BASE_DAILY_QUOTA = 50;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// ── Quota ────────────────────────────────────────────────────────────────────

/**
 * How many queries the user has used today and what their effective limit is.
 */
export function getQuotaStatus(userId: number): {
  used: number;
  limit: number;
  remaining: number;
  bonusTotal: number;
} {
  const db = getDb();
  const date = todayUTC();

  const row = db
    .prepare("SELECT queries_used FROM user_quota WHERE user_id = ? AND date = ?")
    .get(userId, date) as { queries_used: number } | undefined;

  const used = row?.queries_used ?? 0;

  const bonusRow = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM quota_bonuses WHERE user_id = ?")
    .get(userId) as { total: number };

  const bonusTotal = bonusRow.total;
  const limit = BASE_DAILY_QUOTA + bonusTotal;

  return { used, limit, remaining: Math.max(0, limit - used), bonusTotal };
}

/**
 * Attempt to consume `count` queries. Returns true if allowed, false if over limit.
 * Uses a transaction so concurrent requests don't double-spend.
 */
export function consumeQuota(userId: number, count: number): boolean {
  const db = getDb();
  const date = todayUTC();

  const consume = db.transaction(() => {
    const { remaining } = getQuotaStatus(userId);
    if (remaining < count) return false;

    db.prepare(`
      INSERT INTO user_quota (user_id, date, queries_used)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET queries_used = queries_used + excluded.queries_used
    `).run(userId, date, count);

    return true;
  });

  return consume() as boolean;
}

// ── Referral codes ────────────────────────────────────────────────────────────

/**
 * Get or create a referral code for a user.
 */
export function getReferralCode(userId: number): string {
  const db = getDb();

  const existing = db
    .prepare("SELECT code FROM referral_codes WHERE user_id = ?")
    .get(userId) as { code: string } | undefined;

  if (existing) return existing.code;

  // Generate a short uppercase code, retry on collision
  let code: string;
  let attempts = 0;
  do {
    code = nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, "X").slice(0, 8);
    attempts++;
    if (attempts > 10) throw new Error("Could not generate unique referral code");
  } while (
    db.prepare("SELECT 1 FROM referral_codes WHERE code = ?").get(code)
  );

  db.prepare("INSERT INTO referral_codes (user_id, code) VALUES (?, ?)").run(userId, code);
  return code;
}

/**
 * Apply a referral code when a new user signs up.
 * - Links referred_id → referrer
 * - Grants referrer +50 bonus queries
 * - Idempotent: if already used, does nothing
 */
export function applyReferralCode(referredUserId: number, code: string): {
  success: boolean;
  error?: string;
} {
  const db = getDb();

  const codeRow = db
    .prepare("SELECT user_id FROM referral_codes WHERE code = ?")
    .get(code.toUpperCase()) as { user_id: number } | undefined;

  if (!codeRow) return { success: false, error: "Invalid referral code" };
  if (codeRow.user_id === referredUserId) return { success: false, error: "Cannot refer yourself" };

  // Check not already referred
  const alreadyReferred = db
    .prepare("SELECT 1 FROM referrals WHERE referred_id = ?")
    .get(referredUserId);
  if (alreadyReferred) return { success: false, error: "Already used a referral code" };

  const referrerId = codeRow.user_id;

  db.transaction(() => {
    // Record the referral
    db.prepare(`
      INSERT INTO referrals (referrer_id, referred_id, code, bonus_granted)
      VALUES (?, ?, ?, 1)
    `).run(referrerId, referredUserId, code.toUpperCase());

    // Grant +50 bonus to referrer
    db.prepare(`
      INSERT INTO quota_bonuses (user_id, amount, reason)
      VALUES (?, 50, 'referral')
    `).run(referrerId);

    // Also give the new user +50 bonus for signing up with a code
    db.prepare(`
      INSERT INTO quota_bonuses (user_id, amount, reason)
      VALUES (?, 50, 'referred')
    `).run(referredUserId);

    // Update referred_by on user
    db.prepare("UPDATE users SET referred_by = ? WHERE id = ?").run(referrerId, referredUserId);
  })();

  return { success: true };
}
