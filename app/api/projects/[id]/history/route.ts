import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
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

  const { rows } = await pool.query(
    `SELECT rs.*, tb.name as brand_name
     FROM run_summaries rs
     JOIN tracked_brands tb ON rs.brand_id = tb.id
     WHERE rs.project_id = $1
     ORDER BY rs.created_at ASC`,
    [projectId]
  ) as {
    rows: Array<{
      id: number;
      run_id: number;
      project_id: number;
      created_at: string;
      brand_id: number;
      brand_name: string;
      engine_id: string;
      mention_rate: number;
      avg_position: number | null;
      sentiment_positive: number;
      sentiment_neutral: number;
      sentiment_negative: number;
    }>;
  };

  const grouped: Record<
    string,
    {
      brand: { id: number; name: string };
      by_engine: Record<
        string,
        Array<{
          run_id: number;
          created_at: string;
          mention_rate: number;
          avg_position: number | null;
        }>
      >;
      overall: Array<{
        run_id: number;
        created_at: string;
        mention_rate: number;
        avg_position: number | null;
      }>;
    }
  > = {};

  for (const brand of brands) {
    grouped[brand.id] = {
      brand,
      by_engine: {},
      overall: [],
    };
  }

  const runIds = Array.from(new Set(rows.map((r) => r.run_id)));
  for (const runId of runIds) {
    const runRows = rows.filter((r) => r.run_id === runId);
    const createdAt = runRows[0]?.created_at;

    for (const brand of brands) {
      const brandRows = runRows.filter((r) => r.brand_id === brand.id);
      if (brandRows.length === 0) continue;

      for (const row of brandRows) {
        if (!grouped[brand.id]) continue;
        if (!grouped[brand.id].by_engine[row.engine_id]) {
          grouped[brand.id].by_engine[row.engine_id] = [];
        }
        grouped[brand.id].by_engine[row.engine_id].push({
          run_id: row.run_id,
          created_at: row.created_at,
          mention_rate: row.mention_rate,
          avg_position: row.avg_position,
        });
      }

      const avgRate =
        brandRows.reduce((s, r) => s + r.mention_rate, 0) / brandRows.length;
      const posRows = brandRows.filter((r) => r.avg_position !== null);
      const avgPos =
        posRows.length > 0
          ? posRows.reduce((s, r) => s + (r.avg_position ?? 0), 0) /
            posRows.length
          : null;

      grouped[brand.id].overall.push({
        run_id: runId,
        created_at: createdAt,
        mention_rate: Math.round(avgRate * 10) / 10,
        avg_position: avgPos !== null ? Math.round(avgPos * 10) / 10 : null,
      });
    }
  }

  return NextResponse.json({ history: Object.values(grouped) });
}
