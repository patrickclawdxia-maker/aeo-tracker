/**
 * /api/try — Anonymous AEO teaser
 * 
 * Flow:
 *   1. User submits a brand name or URL
 *   2. We auto-generate 2 queries for that brand
 *   3. Run 1 engine (ChatGPT) × 2 queries × 1 iteration (2 LLM calls total)
 *   4. Return mention rate, sentiment, and a couple of answer snippets
 * 
 * Rate limit: 3 tries per IP per day (stored in simple in-memory map; resets on deploy)
 */

import { NextRequest, NextResponse } from "next/server";
import { queryEngine } from "@/lib/poe";
import { engines } from "@/lib/engines/registry";

// In-memory rate limiter — good enough for teaser, resets on cold start
const ipHits = new Map<string, { count: number; resetAt: number }>();
const MAX_FREE_TRIES = 3;

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const resetAt = midnight.getTime();

  const entry = ipHits.get(ip);
  if (!entry || entry.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_FREE_TRIES - 1 };
  }
  if (entry.count >= MAX_FREE_TRIES) {
    return { allowed: false, remaining: 0 };
  }
  entry.count += 1;
  return { allowed: true, remaining: MAX_FREE_TRIES - entry.count };
}

function extractDomain(input: string): string | null {
  try {
    const url = input.startsWith("http") ? input : `https://${input}`;
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname.includes(".")) return hostname;
  } catch {}
  return null;
}

function brandFromInput(input: string): string {
  const domain = extractDomain(input);
  if (domain) {
    // "stripe.com" → "Stripe", "my-brand.io" → "My Brand"
    const base = domain.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1).replace(/-/g, " ");
  }
  // Raw brand name — capitalise words
  return input.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildQueries(brand: string): string[] {
  return [
    `What are the best tools for "${brand.toLowerCase()}" type products? Mention specific companies.`,
    `I'm evaluating ${brand} — how does it compare to alternatives?`,
  ];
}

function extractUrls(text: string): string[] {
  const regex = /https?:\/\/[^\s\]\)>"]+/g;
  return text.match(regex) || [];
}

function getSentiment(text: string, brandIndex: number): "positive" | "neutral" | "negative" {
  const window = text.slice(Math.max(0, brandIndex - 120), brandIndex + 120).toLowerCase();
  if (/recommend|best|top|great|excellent|leading|popular|ideal|outstanding/.test(window)) return "positive";
  if (/avoid|bad|poor|expensive|limited|worst|disappointing|problematic/.test(window)) return "negative";
  return "neutral";
}

function getSnippet(text: string, brandIndex: number): string {
  const start = Math.max(text.lastIndexOf(".", brandIndex - 1) + 1, text.lastIndexOf("\n", brandIndex - 1) + 1, 0);
  const ep = text.indexOf(".", brandIndex);
  const en = text.indexOf("\n", brandIndex);
  let end = text.length;
  if (ep !== -1 && en !== -1) end = Math.min(ep, en) + 1;
  else if (ep !== -1) end = ep + 1;
  else if (en !== -1) end = en + 1;
  const s = text.slice(start, end).trim();
  return s.length > 240 ? s.slice(0, 237) + "…" : s;
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const { allowed, remaining } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "You've used your 3 free previews for today. Sign up to unlock unlimited tracking.",
      },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const rawInput: string = body?.input?.trim() ?? "";

  if (!rawInput || rawInput.length < 2) {
    return NextResponse.json({ error: "invalid_input", message: "Please enter a brand name or URL." }, { status: 400 });
  }

  const brand = brandFromInput(rawInput);
  const queries = buildQueries(brand);

  // Use only the first engine (ChatGPT) for the teaser
  const engine = engines[0]; // chatgpt

  const results: {
    query: string;
    mentioned: boolean;
    sentiment: "positive" | "neutral" | "negative" | null;
    snippet: string | null;
    citations: string[];
  }[] = [];

  for (const query of queries) {
    try {
      const response = await queryEngine(engine.model, query);
      const idx = response.toLowerCase().indexOf(brand.toLowerCase());
      const mentioned = idx !== -1;
      results.push({
        query,
        mentioned,
        sentiment: mentioned ? getSentiment(response, idx) : null,
        snippet: mentioned ? getSnippet(response, idx) : null,
        citations: extractUrls(response).slice(0, 3),
      });
    } catch {
      results.push({ query, mentioned: false, sentiment: null, snippet: null, citations: [] });
    }
  }

  const mentionCount = results.filter((r) => r.mentioned).length;
  const mentionRate = Math.round((mentionCount / results.length) * 100);

  const sentiments = results.filter((r) => r.sentiment).map((r) => r.sentiment);
  const overallSentiment =
    sentiments.includes("positive") ? "positive" :
    sentiments.includes("negative") ? "negative" : "neutral";

  return NextResponse.json({
    brand,
    engine: engine.name,
    mentionRate,
    overallSentiment,
    results,
    triesRemaining: remaining,
    // Teaser: only 1 of 3 engines, 2 of N queries
    teaserNote: "Showing 1 of 3 AI engines · 2 of 10 queries",
  });
}
