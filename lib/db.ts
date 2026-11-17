import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "aeo-tracker.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initDb(db);
  }
  return db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT,
      google_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      plan TEXT NOT NULL DEFAULT 'free'
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tracked_brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tracked_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      query TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analysis_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS raw_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      query_id INTEGER NOT NULL,
      engine_id TEXT NOT NULL,
      iteration INTEGER NOT NULL,
      response_text TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS brand_mentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_response_id INTEGER NOT NULL,
      brand_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      sentiment TEXT NOT NULL,
      context_snippet TEXT NOT NULL,
      FOREIGN KEY (raw_response_id) REFERENCES raw_responses(id) ON DELETE CASCADE,
      FOREIGN KEY (brand_id) REFERENCES tracked_brands(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS run_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      brand_id INTEGER NOT NULL,
      engine_id TEXT NOT NULL,
      mention_rate REAL NOT NULL,
      avg_position REAL,
      sentiment_positive INTEGER NOT NULL DEFAULT 0,
      sentiment_neutral INTEGER NOT NULL DEFAULT 0,
      sentiment_negative INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS citations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_response_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      domain TEXT NOT NULL,
      FOREIGN KEY (raw_response_id) REFERENCES raw_responses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS content_gaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      run_id INTEGER NOT NULL,
      brand_id INTEGER NOT NULL,
      query_id INTEGER NOT NULL,
      mention_rate REAL NOT NULL,
      recommendations TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Safe migrations — existing tables
  for (const col of [
    "ALTER TABLE projects ADD COLUMN schedule TEXT DEFAULT NULL",
    "ALTER TABLE projects ADD COLUMN last_run_at TEXT DEFAULT NULL",
    "ALTER TABLE projects ADD COLUMN next_run_at TEXT DEFAULT NULL",
    "ALTER TABLE projects ADD COLUMN user_id INTEGER DEFAULT NULL",
  ]) {
    try { db.exec(col); } catch { /* already exists */ }
  }

  // ── User quota & referral schema ─────────────────────────────────────────

  // Per-user daily query quota tracker
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_quota (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,              -- 'YYYY-MM-DD' in UTC
      queries_used INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Referral codes issued to each user (one per user)
    CREATE TABLE IF NOT EXISTS referral_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,       -- e.g. 'ABC123'
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Completed referrals: when a new user signs up with a code
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,    -- user who shared the code
      referred_id INTEGER NOT NULL UNIQUE, -- new user who used the code
      code TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      bonus_granted INTEGER NOT NULL DEFAULT 0, -- 1 once +50 credited
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Quota bonuses: extra queries granted (e.g. from referrals)
    CREATE TABLE IF NOT EXISTS quota_bonuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,         -- e.g. 50
      reason TEXT NOT NULL,            -- 'referral' | 'promo' | etc.
      granted_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Safe migrations for users table
  for (const col of [
    "ALTER TABLE users ADD COLUMN daily_quota INTEGER NOT NULL DEFAULT 50",
    "ALTER TABLE users ADD COLUMN referred_by INTEGER DEFAULT NULL",
  ]) {
    try { db.exec(col); } catch { /* already exists */ }
  }
}
