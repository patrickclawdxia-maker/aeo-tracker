import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyProjectOwnership } from "@/lib/project-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const db = getDb();
  const projectId = parseInt(params.id);

  const latestRun = db
    .prepare(
      "SELECT id FROM analysis_runs WHERE project_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1"
    )
    .get(projectId) as { id: number } | undefined;

  if (!latestRun) {
    return NextResponse.json({ citations: [] });
  }

  const rows = db
    .prepare(
      `SELECT c.domain, COUNT(*) as count, GROUP_CONCAT(DISTINCT c.url) as urls
       FROM citations c
       JOIN raw_responses rr ON c.raw_response_id = rr.id
       WHERE rr.run_id = ?
       GROUP BY c.domain
       ORDER BY count DESC
       LIMIT 50`
    )
    .all(latestRun.id) as Array<{
    domain: string;
    count: number;
    urls: string;
  }>;

  const citations = rows.map((r) => ({
    domain: r.domain,
    count: r.count,
    urls: r.urls ? r.urls.split(",").slice(0, 5) : [],
  }));

  return NextResponse.json({ citations });
}
