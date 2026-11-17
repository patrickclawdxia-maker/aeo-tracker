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
  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const result = db
    .prepare("INSERT INTO tracked_brands (project_id, name) VALUES (?, ?)")
    .run(params.id, name.trim());
  const brand = db
    .prepare("SELECT * FROM tracked_brands WHERE id = ?")
    .get(result.lastInsertRowid);
  return NextResponse.json(brand, { status: 201 });
}
