import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { engines } from "@/lib/engines/registry";
import { verifyProjectOwnership } from "@/lib/project-auth";

const POE_BASE_URL = "https://api.poe.com/v1";
const POE_API_KEY = process.env.POE_API_KEY ?? "";

async function getLLMRecommendations(
  brandName: string,
  query: string,
  mentionRate: number
): Promise<Array<{ title: string; content_type: string; rationale: string }>> {
  const prompt = `A brand named "${brandName}" is trying to rank in AI search engines for the query: "${query}"
They currently have low visibility (mentioned in ${Math.round(mentionRate)}% of AI responses).
Suggest 3 specific content pieces they should create to improve their AI search visibility for this query.
For each piece, provide: title, content_type (blog/guide/comparison/FAQ), and a 1-sentence rationale.
Return as JSON array: [{"title": "...", "content_type": "...", "rationale": "..."}]`;

  const response = await fetch(`${POE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${POE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4.6",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Poe API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  try {
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const projectId = parseInt(params.id);

  const { rows: brands } = await pool.query(
    "SELECT * FROM tracked_brands WHERE project_id = $1",
    [projectId]
  ) as { rows: { id: number; name: string }[] };

  const { rows: queries } = await pool.query(
    "SELECT * FROM tracked_queries WHERE project_id = $1",
    [projectId]
  ) as { rows: { id: number; query: string }[] };

  const { rows: latestRunRows } = await pool.query(
    "SELECT * FROM analysis_runs WHERE project_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1",
    [projectId]
  );
  const latestRun = latestRunRows[0] as { id: number } | undefined;

  if (!latestRun) {
    return NextResponse.json({ error: "No completed runs found" }, { status: 404 });
  }

  const results: Array<{
    brand: { id: number; name: string };
    gaps: Array<{
      query: { id: number; query: string };
      mention_rate: number;
      recommendations: Array<{ title: string; content_type: string; rationale: string }>;
    }>;
  }> = [];

  for (const brand of brands) {
    const gaps = [];
    for (const query of queries) {
      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) as cnt
         FROM brand_mentions bm
         JOIN raw_responses rr ON bm.raw_response_id = rr.id
         WHERE rr.run_id = $1 AND bm.brand_id = $2 AND rr.query_id = $3`,
        [latestRun.id, brand.id, query.id]
      );
      const count = parseInt(countRows[0].cnt);

      const perQuerySlots = 3 * engines.length;
      const mentionRate = perQuerySlots > 0 ? (count / perQuerySlots) * 100 : 0;

      if (mentionRate < 50) {
        const { rows: existingRows } = await pool.query(
          `SELECT * FROM content_gaps
           WHERE project_id = $1 AND run_id = $2 AND brand_id = $3 AND query_id = $4`,
          [projectId, latestRun.id, brand.id, query.id]
        );
        const existing = existingRows[0] as { recommendations: string } | undefined;

        let recommendations: Array<{ title: string; content_type: string; rationale: string }>;
        if (existing) {
          recommendations = JSON.parse(existing.recommendations);
        } else {
          recommendations = await getLLMRecommendations(
            brand.name,
            query.query,
            mentionRate
          );

          await pool.query(
            `INSERT INTO content_gaps
              (project_id, run_id, brand_id, query_id, mention_rate, recommendations)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              projectId,
              latestRun.id,
              brand.id,
              query.id,
              Math.round(mentionRate * 10) / 10,
              JSON.stringify(recommendations),
            ]
          );
        }

        gaps.push({
          query,
          mention_rate: Math.round(mentionRate * 10) / 10,
          recommendations,
        });
      }
    }

    if (gaps.length > 0) {
      results.push({ brand, gaps });
    }
  }

  return NextResponse.json({ gaps: results, run_id: latestRun.id });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const projectId = parseInt(params.id);

  const { rows: latestRunRows } = await pool.query(
    "SELECT * FROM analysis_runs WHERE project_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1",
    [projectId]
  );
  const latestRun = latestRunRows[0] as { id: number } | undefined;

  if (!latestRun) {
    return NextResponse.json({ gaps: [] });
  }

  const { rows } = await pool.query(
    `SELECT cg.*, tb.name as brand_name, tq.query as query_text
     FROM content_gaps cg
     JOIN tracked_brands tb ON cg.brand_id = tb.id
     JOIN tracked_queries tq ON cg.query_id = tq.id
     WHERE cg.project_id = $1 AND cg.run_id = $2
     ORDER BY cg.brand_id, cg.mention_rate ASC`,
    [projectId, latestRun.id]
  ) as {
    rows: Array<{
      id: number;
      brand_id: number;
      brand_name: string;
      query_id: number;
      query_text: string;
      mention_rate: number;
      recommendations: string;
    }>;
  };

  const grouped: Record<
    number,
    {
      brand: { id: number; name: string };
      gaps: Array<{
        query: { id: number; query: string };
        mention_rate: number;
        recommendations: Array<{ title: string; content_type: string; rationale: string }>;
      }>;
    }
  > = {};

  for (const row of rows) {
    if (!grouped[row.brand_id]) {
      grouped[row.brand_id] = {
        brand: { id: row.brand_id, name: row.brand_name },
        gaps: [],
      };
    }
    grouped[row.brand_id].gaps.push({
      query: { id: row.query_id, query: row.query_text },
      mention_rate: row.mention_rate,
      recommendations: JSON.parse(row.recommendations),
    });
  }

  return NextResponse.json({ gaps: Object.values(grouped) });
}
