import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { verifyProjectOwnership } from "@/lib/project-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; queryId: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  await pool.query(
    "DELETE FROM tracked_queries WHERE id = $1 AND project_id = $2",
    [params.queryId, params.id]
  );
  return NextResponse.json({ success: true });
}
