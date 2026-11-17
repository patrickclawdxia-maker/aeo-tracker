import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyProjectOwnership } from "@/lib/project-auth";

function computeNextRunAt(schedule: string | null): string | null {
  if (!schedule) return null;
  const next = new Date();
  if (schedule === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (schedule === "weekly") {
    next.setDate(next.getDate() + 7);
  }
  return next.toISOString();
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const db = getDb();
  const projectId = parseInt(params.id);
  const body = await req.json();
  const schedule: string | null = body.schedule || null;

  const nextRunAt = computeNextRunAt(schedule);

  db.prepare(
    `UPDATE projects SET schedule = ?, next_run_at = ? WHERE id = ?`
  ).run(schedule, nextRunAt, projectId);

  return NextResponse.json({ success: true, schedule, next_run_at: nextRunAt });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const db = getDb();
  const projectId = parseInt(params.id);
  const project = db
    .prepare("SELECT schedule, last_run_at, next_run_at FROM projects WHERE id = ?")
    .get(projectId) as { schedule: string | null; last_run_at: string | null; next_run_at: string | null } | undefined;

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}
