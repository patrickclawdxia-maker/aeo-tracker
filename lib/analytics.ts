import { Pool } from "pg";

const analyticsPool = new Pool({
  connectionString: process.env.ANALYTICS_DATABASE_URL,
  max: 5,
});

let analyticsReady = false;

export async function ensureAnalyticsDb() {
  if (analyticsReady) return;
  await analyticsPool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_id INTEGER,
      session_id TEXT,
      event TEXT NOT NULL,
      category TEXT NOT NULL,
      properties JSONB NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS events_ts ON events(ts DESC);
    CREATE INDEX IF NOT EXISTS events_user ON events(user_id);
    CREATE INDEX IF NOT EXISTS events_event ON events(event);

    CREATE TABLE IF NOT EXISTS page_views (
      id BIGSERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_id INTEGER,
      session_id TEXT,
      path TEXT NOT NULL,
      referrer TEXT
    );
    CREATE INDEX IF NOT EXISTS page_views_ts ON page_views(ts DESC);
    CREATE INDEX IF NOT EXISTS page_views_path ON page_views(path);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      page_count INTEGER NOT NULL DEFAULT 0,
      user_agent TEXT,
      country TEXT
    );
  `);
  analyticsReady = true;
}

export type EventCategory =
  | "auth"
  | "project"
  | "feature"
  | "query"
  | "brand"
  | "run"
  | "settings"
  | "navigation";

export async function track(
  event: string,
  category: EventCategory,
  properties: Record<string, unknown> = {},
  userId?: number | null,
  sessionId?: string | null
) {
  try {
    await ensureAnalyticsDb();
    await analyticsPool.query(
      `INSERT INTO events (user_id, session_id, event, category, properties)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId ?? null, sessionId ?? null, event, category, JSON.stringify(properties)]
    );
  } catch (e) {
    // Never throw — analytics must never break the app
    console.error("[analytics] track error:", e);
  }
}

export async function trackPageView(
  path: string,
  userId?: number | null,
  sessionId?: string | null,
  referrer?: string
) {
  try {
    await ensureAnalyticsDb();
    await analyticsPool.query(
      `INSERT INTO page_views (user_id, session_id, path, referrer)
       VALUES ($1, $2, $3, $4)`,
      [userId ?? null, sessionId ?? null, path, referrer ?? null]
    );
    if (sessionId) {
      await analyticsPool.query(`
        INSERT INTO sessions (id, user_id, started_at, last_seen_at, page_count)
        VALUES ($1, $2, NOW(), NOW(), 1)
        ON CONFLICT (id) DO UPDATE SET
          last_seen_at = NOW(),
          page_count = sessions.page_count + 1
      `, [sessionId, userId ?? null]);
    }
  } catch (e) {
    console.error("[analytics] pageview error:", e);
  }
}

export { analyticsPool };
