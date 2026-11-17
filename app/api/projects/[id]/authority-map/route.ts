import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { verifyProjectOwnership } from "@/lib/project-auth";

const POE_BASE_URL = "https://api.poe.com/v1";
const POE_API_KEY = process.env.POE_API_KEY ?? "";

interface TrackedBrand {
  id: number;
  name: string;
}

interface TrackedQuery {
  id: number;
  query: string;
}

interface QueryCategorization {
  query_index: number;
  topic: string;
  category: string;
}

async function categorizeQueriesWithLLM(
  queries: TrackedQuery[]
): Promise<QueryCategorization[]> {
  const prompt = `You are an SEO/AEO expert. Categorize each of these search queries into a topic name and category.

Queries:
${queries.map((q, i) => `${i + 1}. "${q.query}"`).join("\n")}

For each query, return a JSON array:
[
  { "query_index": 1, "topic": "CRM Software", "category": "Product Discovery" },
  ...
]

Topic should be 2-4 words, specific but groupable (multiple queries can share a topic).
Category should be one of: "Product Discovery", "Comparison", "How-To", "Pricing", "Features", "Troubleshooting", "Industry News", "Best Practices"
Return ONLY the JSON array, no other text.`;

  const response = await fetch(`${POE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${POE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4.6",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`Poe API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  try {
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]) as QueryCategorization[];
    }
  } catch {
    // ignore parse errors, fall back to default
  }

  // Fallback: assign all queries to "General" topic
  return queries.map((_, i) => ({
    query_index: i + 1,
    topic: "General",
    category: "Product Discovery",
  }));
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const projectId = parseInt(params.id);

  // Get brands and queries
  const { rows: brands } = await pool.query(
    "SELECT id, name FROM tracked_brands WHERE project_id = $1 ORDER BY id",
    [projectId]
  ) as { rows: TrackedBrand[] };

  const { rows: queries } = await pool.query(
    "SELECT id, query FROM tracked_queries WHERE project_id = $1 ORDER BY id",
    [projectId]
  ) as { rows: TrackedQuery[] };

  if (brands.length === 0 || queries.length === 0) {
    return NextResponse.json(
      { error: "No brands or queries found. Add brands and queries first." },
      { status: 400 }
    );
  }

  // Get latest completed run
  const { rows: latestRunRows } = await pool.query(
    "SELECT id FROM analysis_runs WHERE project_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1",
    [projectId]
  );
  const latestRun = latestRunRows[0] as { id: number } | undefined;

  if (!latestRun) {
    return NextResponse.json(
      { error: "Run an analysis first" },
      { status: 404 }
    );
  }

  const runId = latestRun.id;

  // Categorize queries using LLM
  const categorizations = await categorizeQueriesWithLLM(queries);

  // Map queries to topics
  const queryTopicMap: Record<number, { topic: string; category: string }> = {};
  for (const cat of categorizations) {
    const idx = cat.query_index - 1;
    if (idx >= 0 && idx < queries.length) {
      queryTopicMap[queries[idx].id] = {
        topic: cat.topic,
        category: cat.category,
      };
    }
  }

  // Build unique topics
  const topicsMap: Record<string, { topic: string; category: string; queryIds: number[] }> = {};
  for (const query of queries) {
    const tc = queryTopicMap[query.id] || { topic: "General", category: "Product Discovery" };
    const key = tc.topic;
    if (!topicsMap[key]) {
      topicsMap[key] = { topic: tc.topic, category: tc.category, queryIds: [] };
    }
    topicsMap[key].queryIds.push(query.id);
  }

  // Get total engines count (3 iterations * N engines = slots per query)
  const ITERATIONS = 3;
  const ENGINES_COUNT = 3; // chatgpt, gemini, claude
  const SLOTS_PER_QUERY = ITERATIONS * ENGINES_COUNT;

  // For each brand × topic, compute metrics
  interface TopicEntry {
    brand_id: number;
    topic: string;
    topic_category: string;
    mention_rate: number;
    avg_position: number | null;
    query_count: number;
    authority_score: number;
  }

  const entries: TopicEntry[] = [];

  for (const brand of brands) {
    for (const topicKey of Object.keys(topicsMap)) {
      const { topic, category, queryIds } = topicsMap[topicKey];
      const queryCount = queryIds.length;

      // Get all mentions for this brand in these queries for this run
      const { rows: mentionRows } = await pool.query(
        `SELECT bm.position
         FROM brand_mentions bm
         JOIN raw_responses rr ON bm.raw_response_id = rr.id
         WHERE rr.run_id = $1
           AND bm.brand_id = $2
           AND rr.query_id = ANY($3::int[])`,
        [runId, brand.id, queryIds]
      ) as { rows: { position: number }[] };

      const totalSlots = queryCount * SLOTS_PER_QUERY;
      const mentionCount = mentionRows.length;
      const mentionRate = totalSlots > 0 ? (mentionCount / totalSlots) * 100 : 0;

      let avgPosition: number | null = null;
      if (mentionRows.length > 0) {
        const posSum = mentionRows.reduce((sum, r) => sum + r.position, 0);
        avgPosition = posSum / mentionRows.length;
      }

      // authority_score formula
      let authorityScore = 0;
      if (mentionRate > 0) {
        authorityScore = Math.min(
          100,
          mentionRate * (avgPosition ? (4 - avgPosition) / 3 : 0.5) * 2
        );
      }

      entries.push({
        brand_id: brand.id,
        topic,
        topic_category: category,
        mention_rate: Math.round(mentionRate * 100) / 100,
        avg_position: avgPosition !== null ? Math.round(avgPosition * 100) / 100 : null,
        query_count: queryCount,
        authority_score: Math.max(0, Math.round(authorityScore * 100) / 100),
      });
    }
  }

  // Delete existing entries for this project + run, then insert new ones
  await pool.query(
    "DELETE FROM topic_map WHERE project_id = $1 AND run_id = $2",
    [projectId, runId]
  );

  for (const entry of entries) {
    await pool.query(
      `INSERT INTO topic_map
        (project_id, run_id, brand_id, topic, topic_category, mention_rate, avg_position, query_count, authority_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        projectId,
        runId,
        entry.brand_id,
        entry.topic,
        entry.topic_category,
        entry.mention_rate,
        entry.avg_position,
        entry.query_count,
        entry.authority_score,
      ]
    );
  }

  // Return structured map data
  return NextResponse.json(buildMapResponse(entries, brands, runId));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const projectId = parseInt(params.id);

  // Get latest run that has topic_map data
  const { rows: latestRunRows } = await pool.query(
    `SELECT DISTINCT run_id FROM topic_map WHERE project_id = $1 ORDER BY run_id DESC LIMIT 1`,
    [projectId]
  );

  if (latestRunRows.length === 0) {
    return NextResponse.json({ topics: [], brands: [], summary: null });
  }

  const runId = latestRunRows[0].run_id as number;

  const { rows: mapRows } = await pool.query(
    `SELECT tm.*, tb.name as brand_name
     FROM topic_map tm
     JOIN tracked_brands tb ON tm.brand_id = tb.id
     WHERE tm.project_id = $1 AND tm.run_id = $2
     ORDER BY tm.topic, tm.brand_id`,
    [projectId, runId]
  ) as {
    rows: Array<{
      brand_id: number;
      brand_name: string;
      topic: string;
      topic_category: string;
      mention_rate: number;
      avg_position: number | null;
      query_count: number;
      authority_score: number;
    }>;
  };

  // Build brands list from map rows
  const brandsMap: Record<number, { id: number; name: string }> = {};
  for (const row of mapRows) {
    brandsMap[row.brand_id] = { id: row.brand_id, name: row.brand_name };
  }
  const brands = Object.values(brandsMap);

  // Convert map rows to entries
  const entries = mapRows.map((row) => ({
    brand_id: row.brand_id,
    topic: row.topic,
    topic_category: row.topic_category,
    mention_rate: row.mention_rate,
    avg_position: row.avg_position,
    query_count: row.query_count,
    authority_score: row.authority_score,
  }));

  return NextResponse.json(buildMapResponse(entries, brands, runId));
}

function buildMapResponse(
  entries: Array<{
    brand_id: number;
    topic: string;
    topic_category: string;
    mention_rate: number;
    avg_position: number | null;
    query_count: number;
    authority_score: number;
  }>,
  brands: TrackedBrand[],
  runId: number
) {
  const brandsById: Record<number, TrackedBrand> = {};
  for (const b of brands) {
    brandsById[b.id] = b;
  }

  // Group by topic
  const topicsMap: Record<
    string,
    {
      topic: string;
      category: string;
      query_count: number;
      brands: Array<{
        brand: { id: number; name: string };
        mention_rate: number;
        avg_position: number | null;
        authority_score: number;
      }>;
    }
  > = {};

  for (const entry of entries) {
    const brand = brandsById[entry.brand_id];
    if (!brand) continue;

    if (!topicsMap[entry.topic]) {
      topicsMap[entry.topic] = {
        topic: entry.topic,
        category: entry.topic_category,
        query_count: entry.query_count,
        brands: [],
      };
    }

    topicsMap[entry.topic].brands.push({
      brand,
      mention_rate: entry.mention_rate,
      avg_position: entry.avg_position,
      authority_score: entry.authority_score,
    });
  }

  // Build final topic objects
  const topics = Object.values(topicsMap).map((t) => {
    // Sort brands by authority_score descending
    t.brands.sort((a, b) => b.authority_score - a.authority_score);

    const topBrand = t.brands.length > 0 ? t.brands[0].brand : null;
    const topScore = t.brands.length > 0 ? t.brands[0].authority_score : 0;
    const opportunity = t.brands.every((b) => b.authority_score < 30);

    return {
      topic: t.topic,
      category: t.category,
      query_count: t.query_count,
      brands: t.brands,
      top_brand: topBrand,
      top_score: topScore,
      opportunity,
    };
  });

  // Summary
  const dominated = topics.filter((t) => t.top_score > 60).length;
  const contested = topics.filter(
    (t) => t.top_score >= 30 && t.top_score <= 60
  ).length;
  const opportunity = topics.filter((t) => t.opportunity).length;

  return {
    topics,
    run_id: runId,
    brands,
    summary: {
      total_topics: topics.length,
      dominated_topics: dominated,
      contested_topics: contested,
      opportunity_topics: opportunity,
    },
  };
}
