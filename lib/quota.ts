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

import { pool } from "@/lib/pool";
import { nanoid } from "nanoid";

const BASE_DAILY_QUOTA = 50;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// ── Quota ────────────────────────────────────────────────────────────────────

/**
 * How many queries the user has used today and what their effective limit is.
 */
export async function getQuotaStatus(userId: number): Promise<{
  used: number;
  limit: number;
  remaining: number;
  bonusTotal: number;
}> {
  const date = todayUTC();

  const { rows: quotaRows } = await pool.query(
    "SELECT queries_used FROM user_quota WHERE user_id = $1 AND date = $2",
    [userId, date]
  );
  const used = quotaRows[0]?.queries_used ?? 0;

  const { rows: bonusRows } = await pool.query(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM quota_bonuses WHERE user_id = $1",
    [userId]
  );
  const bonusTotal = parseInt(bonusRows[0]?.total ?? "0");
  const limit = BASE_DAILY_QUOTA + bonusTotal;

  return { used, limit, remaining: Math.max(0, limit - used), bonusTotal };
}

/**
 * Attempt to consume `count` queries. Returns true if allowed, false if over limit.
 * Uses a transaction so concurrent requests don't double-spend.
 */
export async function consumeQuota(userId: number, count: number): Promise<boolean> {
  const date = todayUTC();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT queries_used FROM user_quota WHERE user_id = $1 AND date = $2 FOR UPDATE",
      [userId, date]
    );
    const used = rows[0]?.queries_used ?? 0;

    const { rows: bonusRows } = await client.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM quota_bonuses WHERE user_id = $1",
      [userId]
    );
    const bonusTotal = parseInt(bonusRows[0]?.total ?? "0");
    const limit = BASE_DAILY_QUOTA + bonusTotal;
    const remaining = Math.max(0, limit - used);

    if (remaining < count) {
      await client.query("ROLLBACK");
      return false;
    }

    await client.query(
      `INSERT INTO user_quota (user_id, date, queries_used)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, date) DO UPDATE SET queries_used = user_quota.queries_used + $3`,
      [userId, date, count]
    );

    await client.query("COMMIT");
    return true;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ── Referral codes ────────────────────────────────────────────────────────────

/**
 * Get or create a referral code for a user.
 */
export async function getReferralCode(userId: number): Promise<string> {
  const { rows } = await pool.query(
    "SELECT code FROM referral_codes WHERE user_id = $1",
    [userId]
  );
  if (rows[0]) return rows[0].code;

  // Generate a short uppercase code, retry on collision
  let code: string;
  let attempts = 0;
  do {
    code = nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, "X").slice(0, 8);
    attempts++;
    if (attempts > 10) throw new Error("Could not generate unique referral code");
    const { rows: existing } = await pool.query(
      "SELECT 1 FROM referral_codes WHERE code = $1",
      [code]
    );
    if (existing.length === 0) break;
  } while (true);

  await pool.query(
    "INSERT INTO referral_codes (user_id, code) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
    [userId, code!]
  );

  // Re-fetch in case of race
  const { rows: final } = await pool.query(
    "SELECT code FROM referral_codes WHERE user_id = $1",
    [userId]
  );
  return final[0].code;
}

/**
 * Apply a referral code when a new user signs up.
 * - Links referred_id → referrer
 * - Grants referrer +50 bonus queries
 * - Idempotent: if already used, does nothing
 */
export async function applyReferralCode(
  referredUserId: number,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const { rows: codeRows } = await pool.query(
    "SELECT user_id FROM referral_codes WHERE code = $1",
    [code.toUpperCase()]
  );
  if (!codeRows[0]) return { success: false, error: "Invalid referral code" };
  if (codeRows[0].user_id === referredUserId)
    return { success: false, error: "Cannot refer yourself" };

  const { rows: alreadyReferred } = await pool.query(
    "SELECT 1 FROM referrals WHERE referred_id = $1",
    [referredUserId]
  );
  if (alreadyReferred.length > 0)
    return { success: false, error: "Already used a referral code" };

  const referrerId = codeRows[0].user_id;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO referrals (referrer_id, referred_id, code, bonus_granted) VALUES ($1, $2, $3, 1)",
      [referrerId, referredUserId, code.toUpperCase()]
    );
    await client.query(
      "INSERT INTO quota_bonuses (user_id, amount, reason) VALUES ($1, 50, 'referral')",
      [referrerId]
    );
    await client.query(
      "INSERT INTO quota_bonuses (user_id, amount, reason) VALUES ($1, 50, 'referred')",
      [referredUserId]
    );
    await client.query(
      "UPDATE users SET referred_by = $1 WHERE id = $2",
      [referrerId, referredUserId]
    );
    await client.query("COMMIT");
    return { success: true };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
