import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { engines } from "@/lib/engines/registry";
import { verifyProjectOwnership } from "@/lib/project-auth";

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
      "SELECT * FROM analysis_runs WHERE project_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1"
    )
    .get(projectId) as { id: number; created_at: string } | undefined;

  if (!latestRun || brands.length === 0) {
    return NextResponse.json({ sov: [], run: null });
  }

  const prevRun = db
    .prepare(
      "SELECT * FROM analysis_runs WHERE project_id = ? AND status = 'completed' AND created_at < ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(projectId, latestRun.created_at) as { id: number } | undefined;

  const totalSlots = queries.length * 3;

  interface BrandEngineData {
    brand: { id: number; name: string };
    by_engine: Record<string, { mention_count: number; mention_rate: number }>;
    total_mentions: number;
    overall_mention_rate: number;
  }

  const brandData: BrandEngineData[] = [];

  for (const brand of brands) {
    const byEngine: Record<string, { mention_count: number; mention_rate: number }> = {};

    for (const engine of engines) {
      const count = (db
        .prepare(
          `SELECT COUNT(*) as cnt
           FROM brand_mentions bm
           JOIN raw_responses rr ON bm.raw_response_id = rr.id
           WHERE rr.run_id = ? AND bm.brand_id = ? AND rr.engine_id = ?`
        )
        .get(latestRun.id, brand.id, engine.id) as { cnt: number }).cnt;

      byEngine[engine.id] = {
        mention_count: count,
        mention_rate: totalSlots > 0 ? Math.round((count / totalSlots) * 1000) / 10 : 0,
      };
    }

    const totalMentions = (db
      .prepare(
        `SELECT COUNT(*) as cnt
         FROM brand_mentions bm
         JOIN raw_responses rr ON bm.raw_response_id = rr.id
         WHERE rr.run_id = ? AND bm.brand_id = ?`
      )
      .get(latestRun.id, brand.id) as { cnt: number }).cnt;

    const totalEngineSlots = totalSlots * engines.length;
    brandData.push({
      brand,
      by_engine: byEngine,
      total_mentions: totalMentions,
      overall_mention_rate: totalEngineSlots > 0
        ? Math.round((totalMentions / totalEngineSlots) * 1000) / 10
        : 0,
    });
  }

  const result = brandData.map((bd) => {
    const sovByEngine: Record<string, number> = {};

    for (const engine of engines) {
      const totalForEngine = brandData.reduce(
        (s, b) => s + b.by_engine[engine.id].mention_count,
        0
      );
      sovByEngine[engine.id] =
        totalForEngine > 0
          ? Math.round((bd.by_engine[engine.id].mention_count / totalForEngine) * 1000) / 10
          : 0;
    }

    const totalAllBrands = brandData.reduce((s, b) => s + b.total_mentions, 0);
    const overallSov =
      totalAllBrands > 0
        ? Math.round((bd.total_mentions / totalAllBrands) * 1000) / 10
        : 0;

    let prevSov: number | null = null;
    if (prevRun) {
      const prevTotal = (db
        .prepare(
          `SELECT COUNT(*) as cnt
           FROM brand_mentions bm
           JOIN raw_responses rr ON bm.raw_response_id = rr.id
           WHERE rr.run_id = ? AND bm.brand_id = ?`
        )
        .get(prevRun.id, bd.brand.id) as { cnt: number }).cnt;

      const prevAllBrands = brands.reduce((sum, b) => {
        const c = (db
          .prepare(
            `SELECT COUNT(*) as cnt
             FROM brand_mentions bm
             JOIN raw_responses rr ON bm.raw_response_id = rr.id
             WHERE rr.run_id = ? AND bm.brand_id = ?`
          )
          .get(prevRun!.id, b.id) as { cnt: number }).cnt;
        return sum + c;
      }, 0);

      prevSov =
        prevAllBrands > 0
          ? Math.round((prevTotal / prevAllBrands) * 1000) / 10
          : 0;
    }

    return {
      brand: bd.brand,
      overall_sov: overallSov,
      overall_mention_rate: bd.overall_mention_rate,
      sov_change: prevSov !== null ? Math.round((overallSov - prevSov) * 10) / 10 : null,
      by_engine: Object.fromEntries(
        engines.map((e) => [
          e.id,
          {
            sov: sovByEngine[e.id],
            mention_rate: bd.by_engine[e.id].mention_rate,
          },
        ])
      ),
    };
  });

  return NextResponse.json({ sov: result, run: latestRun });
}
