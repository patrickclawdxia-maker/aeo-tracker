import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { verifyProjectOwnership } from "@/lib/project-auth";
import { track } from "@/lib/analytics";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, userId } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const { query } = await req.json();
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const { rows } = await pool.query(
    "INSERT INTO tracked_queries (project_id, query) VALUES ($1, $2) RETURNING *",
    [params.id, query.trim()]
  );

  await track("query_added", "query", { projectId: params.id, query: query.trim() }, userId);

  return NextResponse.json(rows[0], { status: 201 });
}
