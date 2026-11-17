import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyProjectOwnership } from "@/lib/project-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const db = getDb();
  const { query } = await req.json();
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }
  const result = db
    .prepare("INSERT INTO tracked_queries (project_id, query) VALUES (?, ?)")
    .run(params.id, query.trim());
  const q = db
    .prepare("SELECT * FROM tracked_queries WHERE id = ?")
    .get(result.lastInsertRowid);
  return NextResponse.json(q, { status: 201 });
}
