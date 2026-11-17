import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthSession } from "@/lib/auth-helpers";

export async function GET() {
  const { userId, error } = await getAuthSession();
  if (error) return error;

  const db = getDb();
  const projects = db
    .prepare(
      `
      SELECT 
        p.id,
        p.name,
        p.created_at,
        (SELECT MAX(ar.created_at) FROM analysis_runs ar WHERE ar.project_id = p.id) as last_run,
        (SELECT COUNT(*) FROM tracked_brands tb WHERE tb.project_id = p.id) as brand_count,
        (SELECT COUNT(*) FROM tracked_queries tq WHERE tq.project_id = p.id) as query_count
      FROM projects p
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `
    )
    .all(userId);

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const { userId, error } = await getAuthSession();
  if (error) return error;

  const db = getDb();
  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const result = db
    .prepare("INSERT INTO projects (name, user_id) VALUES (?, ?)")
    .run(name.trim(), userId);
  const project = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(result.lastInsertRowid);
  return NextResponse.json(project, { status: 201 });
}
