import { NextRequest, NextResponse } from "next/server";
import { pool, ensureDb } from "@/lib/pool";
import { getAuthSession } from "@/lib/auth-helpers";
import { track } from "@/lib/analytics";

export async function GET() {
  const { userId, error } = await getAuthSession();
  if (error) return error;

  await ensureDb();

  const { rows: projects } = await pool.query(
    `SELECT 
      p.id,
      p.name,
      p.created_at,
      (SELECT MAX(ar.created_at) FROM analysis_runs ar WHERE ar.project_id = p.id) as last_run,
      (SELECT COUNT(*) FROM tracked_brands tb WHERE tb.project_id = p.id) as brand_count,
      (SELECT COUNT(*) FROM tracked_queries tq WHERE tq.project_id = p.id) as query_count
    FROM projects p
    WHERE p.user_id = $1
    ORDER BY p.created_at DESC`,
    [userId]
  );

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const { userId, error } = await getAuthSession();
  if (error) return error;

  await ensureDb();

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { rows } = await pool.query(
    "INSERT INTO projects (name, user_id) VALUES ($1, $2) RETURNING *",
    [name.trim(), userId]
  );

  await track("project_created", "project", { name: name.trim() }, userId);

  return NextResponse.json(rows[0], { status: 201 });
}
