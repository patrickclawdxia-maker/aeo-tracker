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

  // Get latest completed run
  const { rows: runRows } = await pool.query(
    "SELECT id FROM analysis_runs WHERE project_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1",
    [projectId]
  );
  const latestRunId = runRows[0]?.id as number | undefined;

  // Get all clusters with members
  const { rows: clusters } = await pool.query(
    `SELECT qc.id, qc.name, qc.description, qc.created_at
     FROM query_clusters qc
     WHERE qc.project_id = $1
     ORDER BY qc.created_at DESC`,
    [projectId]
  );

  // Get cluster members with query text
  const { rows: members } = await pool.query(
    `SELECT qcm.cluster_id, tq.id as query_id, tq.query
     FROM query_cluster_members qcm
     JOIN tracked_queries tq ON qcm.query_id = tq.id
     WHERE tq.project_id = $1`,
    [projectId]
  );

  // Get latest run summaries if we have a run
  let summaries: Array<{ query_id: number; engine_id: string; mention_rate: number }> = [];
  if (latestRunId) {
    const { rows } = await pool.query(
      `SELECT rr.query_id, rs.engine_id, rs.mention_rate
       FROM run_summaries rs
       JOIN raw_responses rr ON rr.run_id = rs.run_id
       WHERE rs.run_id = $1
       GROUP BY rr.query_id, rs.engine_id, rs.mention_rate`,
      [latestRunId]
    );
    summaries = rows as Array<{ query_id: number; engine_id: string; mention_rate: number }>;
  }

  // Build a map: queryId -> { engine_id -> mention_rate }
  const summaryMap = new Map<number, Map<string, number>>();
  for (const s of summaries) {
    if (!summaryMap.has(s.query_id)) summaryMap.set(s.query_id, new Map());
    summaryMap.get(s.query_id)!.set(s.engine_id, s.mention_rate);
  }

  // Assemble result
  const membersByCluster = new Map<number, Array<{ id: number; query: string }>>();
  for (const m of members) {
    if (!membersByCluster.has(m.cluster_id)) membersByCluster.set(m.cluster_id, []);
    membersByCluster.get(m.cluster_id)!.push({ id: m.query_id, query: m.query });
  }

  const result = clusters.map((c: { id: number; name: string; description: string | null; created_at: string }) => {
    const clusterMembers = membersByCluster.get(c.id) || [];
    
    // Calculate overall cluster mention rate
    let totalRate = 0;
    let count = 0;
    const engineRates: Record<string, { total: number; count: number }> = {};

    for (const member of clusterMembers) {
      const engines = summaryMap.get(member.id);
      if (engines) {
        let queryTotal = 0;
        let queryCount = 0;
        engines.forEach((rate, engineId) => {
          queryTotal += rate;
          queryCount++;
          if (!engineRates[engineId]) engineRates[engineId] = { total: 0, count: 0 };
          engineRates[engineId].total += rate;
          engineRates[engineId].count++;
        });
        if (queryCount > 0) {
          totalRate += queryTotal / queryCount;
          count++;
        }
      }
    }

    const clusterMentionRate = count > 0 ? Math.round(totalRate / count) : null;
    const perEngine: Record<string, number> = {};
    Object.entries(engineRates).forEach(([eid, { total, count: ec }]) => {
      perEngine[eid] = Math.round(total / ec);
    });

    return {
      id: c.id,
      name: c.name,
      description: c.description,
      created_at: c.created_at,
      queries: clusterMembers,
      cluster_mention_rate: clusterMentionRate,
      per_engine: perEngine,
    };
  });

  return NextResponse.json({ clusters: result });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const projectId = parseInt(params.id);
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

    const { rows } = await client.query(
      "INSERT INTO query_clusters (project_id, name, description) VALUES ($1, $2, $3) RETURNING id",
      [projectId, name.trim(), description?.trim() || null]
    );
    const clusterId = rows[0].id as number;

    if (queryIds && queryIds.length > 0) {
      for (const qid of queryIds) {
        await client.query(
          "INSERT INTO query_cluster_members (cluster_id, query_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [clusterId, qid]
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ id: clusterId, name, description, queryIds }, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
