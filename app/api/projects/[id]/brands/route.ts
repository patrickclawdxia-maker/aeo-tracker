import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { verifyProjectOwnership } from "@/lib/project-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { rows } = await pool.query(
    "INSERT INTO tracked_brands (project_id, name) VALUES ($1, $2) RETURNING *",
    [params.id, name.trim()]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
