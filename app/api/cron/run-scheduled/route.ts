import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(_req: NextRequest) {
  const db = getDb();
  const now = new Date().toISOString();

  const dueProjects = db
    .prepare(
      `SELECT id, name FROM projects
       WHERE schedule IS NOT NULL AND next_run_at IS NOT NULL AND next_run_at <= ?`
    )
    .all(now) as { id: number; name: string }[];

  const results: Array<{ projectId: number; name: string; status: string }> = [];

  for (const project of dueProjects) {
    try {
      // Trigger run via internal fetch
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";
      const res = await fetch(`${baseUrl}/api/projects/${project.id}/run`, {
        method: "POST",
      });
      const data = await res.json();
      results.push({
        projectId: project.id,
        name: project.name,
        status: res.ok ? "triggered" : `error: ${data.error}`,
      });
    } catch (err) {
      results.push({
        projectId: project.id,
        name: project.name,
        status: `error: ${err}`,
      });
    }
  }

  return NextResponse.json({ triggered: results.length, results });
}
