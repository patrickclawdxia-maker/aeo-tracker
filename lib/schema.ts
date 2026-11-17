import { pgTable, serial, text, integer, real, timestamp, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  googleId: text("google_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  plan: text("plan").notNull().default("free"),
  dailyQuota: integer("daily_quota").notNull().default(50),
  referredBy: integer("referred_by"),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  schedule: text("schedule"),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  userId: integer("user_id"),
});

export const trackedBrands = pgTable("tracked_brands", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
});

export const trackedQueries = pgTable("tracked_queries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  query: text("query").notNull(),
});

export const analysisRuns = pgTable("analysis_runs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: text("status").notNull().default("pending"),
});

export const rawResponses = pgTable("raw_responses", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull(),
  queryId: integer("query_id").notNull(),
  engineId: text("engine_id").notNull(),
  iteration: integer("iteration").notNull(),
  responseText: text("response_text").notNull(),
});

export const brandMentions = pgTable("brand_mentions", {
  id: serial("id").primaryKey(),
  rawResponseId: integer("raw_response_id").notNull(),
  brandId: integer("brand_id").notNull(),
  position: integer("position").notNull(),
  sentiment: text("sentiment").notNull(),
  contextSnippet: text("context_snippet").notNull(),
});

export const runSummaries = pgTable("run_summaries", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull(),
  projectId: integer("project_id").notNull(),
  createdAt: timestamp("created_at").notNull(),
  brandId: integer("brand_id").notNull(),
  engineId: text("engine_id").notNull(),
  mentionRate: real("mention_rate").notNull(),
  avgPosition: real("avg_position"),
  sentimentPositive: integer("sentiment_positive").notNull().default(0),
  sentimentNeutral: integer("sentiment_neutral").notNull().default(0),
  sentimentNegative: integer("sentiment_negative").notNull().default(0),
});

export const citations = pgTable("citations", {
  id: serial("id").primaryKey(),
  rawResponseId: integer("raw_response_id").notNull(),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
});

export const contentGaps = pgTable("content_gaps", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  runId: integer("run_id").notNull(),
  brandId: integer("brand_id").notNull(),
  queryId: integer("query_id").notNull(),
  mentionRate: real("mention_rate").notNull(),
  recommendations: text("recommendations").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userQuota = pgTable("user_quota", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(), // 'YYYY-MM-DD'
  queriesUsed: integer("queries_used").notNull().default(0),
}, (t) => ({ uniq: unique().on(t.userId, t.date) }));

export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredId: integer("referred_id").notNull().unique(),
  code: text("code").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  bonusGranted: integer("bonus_granted").notNull().default(0),
});

export const quotaBonuses = pgTable("quota_bonuses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
});
