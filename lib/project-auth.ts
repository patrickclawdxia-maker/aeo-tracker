import { pool } from "@/lib/pool";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-helpers";

interface ProjectRow {
  id: number;
  name: string;
  user_id: number | null;
}

/**
 * Verifies the requesting user owns the project.
 * Returns { project, userId } on success or { error } response on failure.
 */
export async function verifyProjectOwnership(projectId: number | string): Promise<
  | { project: ProjectRow; userId: number; error: null }
  | { project: null; userId: null; error: NextResponse }
> {
  const { userId, error: authError } = await getAuthSession();
  if (authError) return { project: null, userId: null, error: authError };

  const { rows } = await pool.query(
    "SELECT id, name, user_id FROM projects WHERE id = $1",
    [projectId]
  );
  const project = rows[0] as ProjectRow | undefined;

  if (!project) {
    return {
      project: null,
      userId: null,
      error: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  // Allow if project has no user_id (legacy data) OR user_id matches
  if (project.user_id !== null && project.user_id !== userId) {
    return {
      project: null,
      userId: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { project, userId: userId!, error: null };
}
