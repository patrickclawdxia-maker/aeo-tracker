import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";

export async function POST(_req: NextRequest) {
  const now = new Date().toISOString();

  const { rows: dueProjects } = await pool.query(
    `SELECT id, name FROM projects
     WHERE schedule IS NOT NULL AND next_run_at IS NOT NULL AND next_run_at <= $1`,
    [now]
  ) as { rows: { id: number; name: string }[] };

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
