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
  const project = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(params.id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const brands = db
    .prepare("SELECT * FROM tracked_brands WHERE project_id = ?")
    .all(params.id);
  const queries = db
    .prepare("SELECT * FROM tracked_queries WHERE project_id = ?")
    .all(params.id);
  const runs = db
    .prepare(
      "SELECT * FROM analysis_runs WHERE project_id = ? ORDER BY created_at DESC"
    )
    .all(params.id);

  return NextResponse.json({ project, brands, queries, runs });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const db = getDb();
  db.prepare("DELETE FROM projects WHERE id = ?").run(params.id);
  return NextResponse.json({ success: true });
}
