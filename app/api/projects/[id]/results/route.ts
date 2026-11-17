import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { engines } from "@/lib/engines/registry";
import { verifyProjectOwnership } from "@/lib/project-auth";

interface BrandEngineStats {
  mention_rate: number;
  avg_position: number;
  sentiment_breakdown: { positive: number; neutral: number; negative: number };
  total_mentions: number;
}

interface BrandResult {
  brand: { id: number; name: string };
  overall: BrandEngineStats;
  by_engine: Record<string, BrandEngineStats>;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const db = getDb();
  const projectId = parseInt(params.id);

  const brands = db
    .prepare("SELECT * FROM tracked_brands WHERE project_id = ?")
    .all(projectId) as { id: number; name: string }[];

  const queries = db
    .prepare("SELECT * FROM tracked_queries WHERE project_id = ?")
    .all(projectId) as { id: number; query: string }[];

  const latestRun = db
    .prepare(
      "SELECT * FROM analysis_runs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(projectId) as { id: number; created_at: string; status: string } | undefined;

  if (!latestRun) {
    return NextResponse.json({ results: [], latestRun: null, queries });
  }

  const totalSlots = queries.length * 3;

  const brandResults: BrandResult[] = [];

  for (const brand of brands) {
    const byEngine: Record<string, BrandEngineStats> = {};

    for (const engine of engines) {
      const mentions = db
        .prepare(
          `SELECT bm.position, bm.sentiment
           FROM brand_mentions bm
           JOIN raw_responses rr ON bm.raw_response_id = rr.id
           WHERE rr.run_id = ?
             AND bm.brand_id = ?
             AND rr.engine_id = ?`
        )
        .all(latestRun.id, brand.id, engine.id) as {
        position: number;
        sentiment: string;
      }[];

      const totalMentions = mentions.length;
      const mentionRate =
        totalSlots > 0 ? (totalMentions / totalSlots) * 100 : 0;
      const avgPosition =
        totalMentions > 0
          ? mentions.reduce((s, m) => s + m.position, 0) / totalMentions
          : 0;
      const sentimentBreakdown = {
        positive: mentions.filter((m) => m.sentiment === "positive").length,
        neutral: mentions.filter((m) => m.sentiment === "neutral").length,
        negative: mentions.filter((m) => m.sentiment === "negative").length,
      };

      byEngine[engine.id] = {
        mention_rate: Math.round(mentionRate * 10) / 10,
        avg_position: Math.round(avgPosition * 10) / 10,
        sentiment_breakdown: sentimentBreakdown,
        total_mentions: totalMentions,
      };
    }

    const allMentions = db
      .prepare(
        `SELECT bm.position, bm.sentiment
         FROM brand_mentions bm
         JOIN raw_responses rr ON bm.raw_response_id = rr.id
         WHERE rr.run_id = ?
           AND bm.brand_id = ?`
      )
      .all(latestRun.id, brand.id) as { position: number; sentiment: string }[];

    const totalEngineSlots = totalSlots * engines.length;
    const overallRate =
      totalEngineSlots > 0
        ? (allMentions.length / totalEngineSlots) * 100
        : 0;
    const overallAvgPos =
      allMentions.length > 0
        ? allMentions.reduce((s, m) => s + m.position, 0) / allMentions.length
        : 0;

    brandResults.push({
      brand,
      overall: {
        mention_rate: Math.round(overallRate * 10) / 10,
        avg_position: Math.round(overallAvgPos * 10) / 10,
        sentiment_breakdown: {
          positive: allMentions.filter((m) => m.sentiment === "positive").length,
          neutral: allMentions.filter((m) => m.sentiment === "neutral").length,
          negative: allMentions.filter((m) => m.sentiment === "negative").length,
        },
        total_mentions: allMentions.length,
      },
      by_engine: byEngine,
    });
  }

  const queryBreakdown = queries.map((q) => {
    const queryBrands = brands.map((brand) => {
      const mentions = db
        .prepare(
          `SELECT bm.position, bm.sentiment, bm.context_snippet, rr.engine_id
           FROM brand_mentions bm
           JOIN raw_responses rr ON bm.raw_response_id = rr.id
           WHERE rr.run_id = ?
             AND bm.brand_id = ?
             AND rr.query_id = ?`
        )
        .all(latestRun.id, brand.id, q.id) as {
        position: number;
        sentiment: string;
        context_snippet: string;
        engine_id: string;
      }[];

      return {
        brand,
        mention_count: mentions.length,
        avg_position:
          mentions.length > 0
            ? Math.round(
                (mentions.reduce((s, m) => s + m.position, 0) /
                  mentions.length) *
                  10
              ) / 10
            : 0,
        snippets: mentions.slice(0, 3).map((m) => ({
          engine_id: m.engine_id,
          sentiment: m.sentiment,
          context_snippet: m.context_snippet,
        })),
      };
    });

    return {
      query: q,
      brands: queryBrands,
    };
  });

  return NextResponse.json({
    results: brandResults,
    latestRun,
    queries,
    queryBreakdown,
  });
}
