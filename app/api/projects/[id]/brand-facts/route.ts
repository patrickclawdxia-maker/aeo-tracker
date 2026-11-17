import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { verifyProjectOwnership } from "@/lib/project-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const projectId = parseInt(params.id);

  const { rows } = await pool.query(
    `SELECT tb.id as brand_id, tb.name as brand_name, bf.facts, bf.updated_at
     FROM tracked_brands tb
     LEFT JOIN brand_facts bf ON bf.brand_id = tb.id
     WHERE tb.project_id = $1
     ORDER BY tb.id`,
    [projectId]
  );

  return NextResponse.json({
    brands: rows.map((r: { brand_id: number; brand_name: string; facts: string | null; updated_at: string | null }) => ({
      brand_id: r.brand_id,
      brand_name: r.brand_name,
      facts: r.facts || null,
      updated_at: r.updated_at || null,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const body = await req.json();
  const { brandId, facts } = body as { brandId: number; facts: string };

  if (!brandId || !facts?.trim()) {
    return NextResponse.json({ error: "brandId and facts are required" }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO brand_facts (brand_id, facts, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (brand_id) DO UPDATE SET facts = EXCLUDED.facts, updated_at = NOW()`,
    [brandId, facts.trim()]
  );

  return NextResponse.json({ success: true });
}
