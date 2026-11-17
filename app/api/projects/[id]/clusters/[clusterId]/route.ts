import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { verifyProjectOwnership } from "@/lib/project-auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; clusterId: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const clusterId = parseInt(params.clusterId);
  const body = await req.json();
  const { name, description, queryIds } = body as {
    name: string;
    description?: string;
    queryIds: number[];
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE query_clusters SET name = $1, description = $2 WHERE id = $3",
      [name.trim(), description?.trim() || null, clusterId]
    );

    // Replace members
    await client.query("DELETE FROM query_cluster_members WHERE cluster_id = $1", [clusterId]);

    if (queryIds && queryIds.length > 0) {
      for (const qid of queryIds) {
        await client.query(
          "INSERT INTO query_cluster_members (cluster_id, query_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [clusterId, qid]
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; clusterId: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const clusterId = parseInt(params.clusterId);

  await pool.query("DELETE FROM query_cluster_members WHERE cluster_id = $1", [clusterId]);
  await pool.query("DELETE FROM query_clusters WHERE id = $1", [clusterId]);

  return NextResponse.json({ success: true });
}
