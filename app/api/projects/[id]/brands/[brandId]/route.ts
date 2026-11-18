import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { verifyProjectOwnership } from "@/lib/project-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; brandId: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  await pool.query(
    "DELETE FROM tracked_brands WHERE id = $1 AND project_id = $2",
    [params.brandId, params.id]
  );
  return NextResponse.json({ success: true });
}

// PATCH /api/projects/[id]/brands/[brandId] — update aliases
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; brandId: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const { aliases } = await req.json() as { aliases: string[] };
  if (!Array.isArray(aliases)) {
    return NextResponse.json({ error: "aliases must be an array" }, { status: 400 });
  }

  // Sanitise: trim, dedupe, remove empties
  const seen = new Set<string>();
  const clean = aliases.map((a) => a.trim()).filter((a) => { if (!a || seen.has(a)) return false; seen.add(a); return true; });

  const { rows } = await pool.query(
    "UPDATE tracked_brands SET aliases = $1 WHERE id = $2 AND project_id = $3 RETURNING *",
    [clean, params.brandId, params.id]
  );

  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
