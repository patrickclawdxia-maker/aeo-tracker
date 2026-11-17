import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyProjectOwnership } from "@/lib/project-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; queryId: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const db = getDb();
  db.prepare(
    "DELETE FROM tracked_queries WHERE id = ? AND project_id = ?"
  ).run(params.queryId, params.id);
  return NextResponse.json({ success: true });
}
