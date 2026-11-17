import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export const db = drizzle(pool, { schema });

// Auto-create tables on first run (idempotent)
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT,
      google_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      plan TEXT NOT NULL DEFAULT 'free',
      daily_quota INTEGER NOT NULL DEFAULT 50,
      referred_by INTEGER
    );
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      schedule TEXT,
      last_run_at TIMESTAMPTZ,
      next_run_at TIMESTAMPTZ,
      user_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS tracked_brands (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tracked_queries (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL,
      query TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS analysis_runs (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS raw_responses (
      id SERIAL PRIMARY KEY,
      run_id INTEGER NOT NULL,
      query_id INTEGER NOT NULL,
      engine_id TEXT NOT NULL,
      iteration INTEGER NOT NULL,
      response_text TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS brand_mentions (
      id SERIAL PRIMARY KEY,
      raw_response_id INTEGER NOT NULL,
      brand_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      sentiment TEXT NOT NULL,
      context_snippet TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS run_summaries (
      id SERIAL PRIMARY KEY,
      run_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      brand_id INTEGER NOT NULL,
      engine_id TEXT NOT NULL,
      mention_rate REAL NOT NULL,
      avg_position REAL,
      sentiment_positive INTEGER NOT NULL DEFAULT 0,
      sentiment_neutral INTEGER NOT NULL DEFAULT 0,
      sentiment_negative INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS citations (
      id SERIAL PRIMARY KEY,
      raw_response_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      domain TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS content_gaps (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL,
      run_id INTEGER NOT NULL,
      brand_id INTEGER NOT NULL,
      query_id INTEGER NOT NULL,
      mention_rate REAL NOT NULL,
      recommendations TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS user_quota (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      queries_used INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, date)
    );
    CREATE TABLE IF NOT EXISTS referral_codes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL UNIQUE,
      code TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      bonus_granted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS quota_bonuses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS query_clusters (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS query_cluster_members (
      id SERIAL PRIMARY KEY,
      cluster_id INTEGER NOT NULL,
      query_id INTEGER NOT NULL,
      UNIQUE(cluster_id, query_id)
    );
    CREATE TABLE IF NOT EXISTS crawler_checks (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL,
      domain TEXT NOT NULL,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      robots_txt TEXT,
      crawler_statuses JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS brand_facts (
      id SERIAL PRIMARY KEY,
      brand_id INTEGER NOT NULL UNIQUE,
      facts TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS accuracy_checks (
      id SERIAL PRIMARY KEY,
      raw_response_id INTEGER NOT NULL,
      brand_id INTEGER NOT NULL,
      run_id INTEGER NOT NULL,
      accurate BOOLEAN NOT NULL,
      issues JSONB NOT NULL DEFAULT '[]',
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS topic_map (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL,
      run_id INTEGER NOT NULL,
      brand_id INTEGER NOT NULL,
      topic TEXT NOT NULL,
      topic_category TEXT NOT NULL,
      mention_rate REAL NOT NULL DEFAULT 0,
      avg_position REAL,
      query_count INTEGER NOT NULL DEFAULT 0,
      authority_score REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
