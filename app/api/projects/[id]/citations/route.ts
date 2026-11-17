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

  const { rows: latestRunRows } = await pool.query(
    "SELECT id FROM analysis_runs WHERE project_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1",
    [projectId]
  );
  const latestRun = latestRunRows[0] as { id: number } | undefined;

  if (!latestRun) {
    return NextResponse.json({ citations: [] });
  }

  const { rows } = await pool.query(
    `SELECT c.domain, COUNT(*) as count, STRING_AGG(DISTINCT c.url, ',') as urls
     FROM citations c
     JOIN raw_responses rr ON c.raw_response_id = rr.id
     WHERE rr.run_id = $1
     GROUP BY c.domain
     ORDER BY count DESC
     LIMIT 50`,
    [latestRun.id]
  ) as {
    rows: Array<{
      domain: string;
      count: number;
      urls: string;
    }>;
  };

  const citations = rows.map((r) => ({
    domain: r.domain,
    count: Number(r.count),
    urls: r.urls ? r.urls.split(",").slice(0, 5) : [],
  }));

  return NextResponse.json({ citations });
}
