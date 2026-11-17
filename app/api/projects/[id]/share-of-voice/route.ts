import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { engines } from "@/lib/engines/registry";
import { verifyProjectOwnership } from "@/lib/project-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const projectId = parseInt(params.id);

  const { rows: brands } = await pool.query(
    "SELECT * FROM tracked_brands WHERE project_id = $1",
    [projectId]
  ) as { rows: { id: number; name: string }[] };

  const { rows: queries } = await pool.query(
    "SELECT * FROM tracked_queries WHERE project_id = $1",
    [projectId]
  ) as { rows: { id: number; query: string }[] };

  const { rows: latestRunRows } = await pool.query(
    "SELECT * FROM analysis_runs WHERE project_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1",
    [projectId]
  );
  const latestRun = latestRunRows[0] as { id: number; created_at: string } | undefined;

  if (!latestRun || brands.length === 0) {
    return NextResponse.json({ sov: [], run: null });
  }

  const { rows: prevRunRows } = await pool.query(
    "SELECT * FROM analysis_runs WHERE project_id = $1 AND status = 'completed' AND created_at < $2 ORDER BY created_at DESC LIMIT 1",
    [projectId, latestRun.created_at]
  );
  const prevRun = prevRunRows[0] as { id: number } | undefined;

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
      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) as cnt
         FROM brand_mentions bm
         JOIN raw_responses rr ON bm.raw_response_id = rr.id
         WHERE rr.run_id = $1 AND bm.brand_id = $2 AND rr.engine_id = $3`,
        [latestRun.id, brand.id, engine.id]
      );
      const count = parseInt(countRows[0].cnt);

      byEngine[engine.id] = {
        mention_count: count,
        mention_rate:
          totalSlots > 0 ? Math.round((count / totalSlots) * 1000) / 10 : 0,
      };
    }

    const { rows: totalCountRows } = await pool.query(
      `SELECT COUNT(*) as cnt
       FROM brand_mentions bm
       JOIN raw_responses rr ON bm.raw_response_id = rr.id
       WHERE rr.run_id = $1 AND bm.brand_id = $2`,
      [latestRun.id, brand.id]
    );
    const totalMentions = parseInt(totalCountRows[0].cnt);

    const totalEngineSlots = totalSlots * engines.length;
    brandData.push({
      brand,
      by_engine: byEngine,
      total_mentions: totalMentions,
      overall_mention_rate:
        totalEngineSlots > 0
          ? Math.round((totalMentions / totalEngineSlots) * 1000) / 10
          : 0,
    });
  }

  const result = await Promise.all(
    brandData.map(async (bd) => {
      const sovByEngine: Record<string, number> = {};

      for (const engine of engines) {
        const totalForEngine = brandData.reduce(
          (s, b) => s + b.by_engine[engine.id].mention_count,
          0
        );
        sovByEngine[engine.id] =
          totalForEngine > 0
            ? Math.round(
                (bd.by_engine[engine.id].mention_count / totalForEngine) * 1000
              ) / 10
            : 0;
      }

      const totalAllBrands = brandData.reduce((s, b) => s + b.total_mentions, 0);
      const overallSov =
        totalAllBrands > 0
          ? Math.round((bd.total_mentions / totalAllBrands) * 1000) / 10
          : 0;

      let prevSov: number | null = null;
      if (prevRun) {
        const { rows: prevCountRows } = await pool.query(
          `SELECT COUNT(*) as cnt
           FROM brand_mentions bm
           JOIN raw_responses rr ON bm.raw_response_id = rr.id
           WHERE rr.run_id = $1 AND bm.brand_id = $2`,
          [prevRun.id, bd.brand.id]
        );
        const prevTotal = parseInt(prevCountRows[0].cnt);

        let prevAllBrands = 0;
        for (const b of brands) {
          const { rows: pRows } = await pool.query(
            `SELECT COUNT(*) as cnt
             FROM brand_mentions bm
             JOIN raw_responses rr ON bm.raw_response_id = rr.id
             WHERE rr.run_id = $1 AND bm.brand_id = $2`,
            [prevRun.id, b.id]
          );
          prevAllBrands += parseInt(pRows[0].cnt);
        }

        prevSov =
          prevAllBrands > 0
            ? Math.round((prevTotal / prevAllBrands) * 1000) / 10
            : 0;
      }

      return {
        brand: bd.brand,
        overall_sov: overallSov,
        overall_mention_rate: bd.overall_mention_rate,
        sov_change:
          prevSov !== null
            ? Math.round((overallSov - prevSov) * 10) / 10
            : null,
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
    })
  );

  return NextResponse.json({ sov: result, run: latestRun });
}
