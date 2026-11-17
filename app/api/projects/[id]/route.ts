import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { verifyProjectOwnership } from "@/lib/project-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const { rows: projectRows } = await pool.query(
    "SELECT * FROM projects WHERE id = $1",
    [params.id]
  );
  if (!projectRows[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { rows: brands } = await pool.query(
    "SELECT * FROM tracked_brands WHERE project_id = $1",
    [params.id]
  );
  const { rows: queries } = await pool.query(
    "SELECT * FROM tracked_queries WHERE project_id = $1",
    [params.id]
  );
  const { rows: runs } = await pool.query(
    "SELECT * FROM analysis_runs WHERE project_id = $1 ORDER BY created_at DESC",
    [params.id]
  );

  return NextResponse.json({ project: projectRows[0], brands, queries, runs });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  await pool.query("DELETE FROM projects WHERE id = $1", [params.id]);
  return NextResponse.json({ success: true });
}
