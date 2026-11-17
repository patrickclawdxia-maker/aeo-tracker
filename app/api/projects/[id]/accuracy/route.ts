import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { verifyProjectOwnership } from "@/lib/project-auth";

const POE_API_KEY = process.env.POE_API_KEY ?? "";
const POE_BASE_URL = "https://api.poe.com/v1";

async function factCheckResponse(
  brandName: string,
  facts: string,
  responseText: string
): Promise<{ accurate: boolean; issues: string[] }> {
  const prompt = `You are a fact-checker. Given these verified facts about a brand and an AI response that mentions them, identify any factually incorrect claims.

Brand: ${brandName}
Verified facts: ${facts}

AI Response excerpt: ${responseText.substring(0, 1500)}

Return ONLY valid JSON: {"accurate": true/false, "issues": ["issue1", "issue2"]}
If accurate, return: {"accurate": true, "issues": []}`;

  const response = await fetch(`${POE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${POE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4.6",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    throw new Error(`Poe API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { accurate: true, issues: [] };

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { accurate: boolean; issues: string[] };
    return {
      accurate: Boolean(parsed.accurate),
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch {
    return { accurate: true, issues: [] };
  }
}

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
  const latestRun = runRows[0] as { id: number } | undefined;

  if (!latestRun) {
    return NextResponse.json({ brands: [] });
  }

  // Get brands with facts
  const { rows: brandRows } = await pool.query(
    `SELECT tb.id as brand_id, tb.name as brand_name, bf.facts
     FROM tracked_brands tb
     LEFT JOIN brand_facts bf ON bf.brand_id = tb.id
     WHERE tb.project_id = $1`,
    [projectId]
  );

  // Get accuracy checks for this run, grouped by brand
  const { rows: checks } = await pool.query(
    `SELECT ac.brand_id, ac.raw_response_id, ac.accurate, ac.issues, ac.checked_at,
            rr.engine_id, rr.response_text,
            tq.query as query_text
     FROM accuracy_checks ac
     JOIN raw_responses rr ON rr.id = ac.raw_response_id
     JOIN tracked_queries tq ON tq.id = rr.query_id
     WHERE ac.run_id = $1
     ORDER BY ac.brand_id, ac.checked_at DESC`,
    [latestRun.id]
  );

  // Group by brand
  const brandMap = new Map<number, {
    brand_id: number;
    brand_name: string;
    facts: string | null;
    checks: Array<{
      raw_response_id: number;
      accurate: boolean;
      issues: string[];
      engine_id: string;
      response_text: string;
      query_text: string;
      checked_at: string;
    }>;
  }>();

  for (const br of brandRows) {
    brandMap.set(br.brand_id, {
      brand_id: br.brand_id,
      brand_name: br.brand_name,
      facts: br.facts || null,
      checks: [],
    });
  }

  for (const c of checks) {
    const brand = brandMap.get(c.brand_id);
    if (brand) {
      brand.checks.push({
        raw_response_id: c.raw_response_id,
        accurate: c.accurate,
        issues: c.issues as string[],
        engine_id: c.engine_id,
        response_text: c.response_text,
        query_text: c.query_text,
        checked_at: c.checked_at,
      });
    }
  }

  return NextResponse.json({
    run_id: latestRun.id,
    brands: Array.from(brandMap.values()),
  });
}

export async function POST(
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
  const latestRun = runRows[0] as { id: number } | undefined;

  if (!latestRun) {
    return NextResponse.json({ error: "No completed run found" }, { status: 400 });
  }

  // Get brands with facts
  const { rows: brandRows } = await pool.query(
    `SELECT tb.id as brand_id, tb.name as brand_name, bf.facts
     FROM tracked_brands tb
     JOIN brand_facts bf ON bf.brand_id = tb.id
     WHERE tb.project_id = $1`,
    [projectId]
  );

  if (brandRows.length === 0) {
    return NextResponse.json({ error: "No brands with facts found. Add verified facts first." }, { status: 400 });
  }

  // Get raw responses that mention any tracked brand
  const brandNames = brandRows.map((b: { brand_name: string }) => b.brand_name.toLowerCase());

  const { rows: rawResponses } = await pool.query(
    `SELECT rr.id, rr.engine_id, rr.response_text, rr.query_id,
            tq.query as query_text
     FROM raw_responses rr
     JOIN tracked_queries tq ON tq.id = rr.query_id
     WHERE rr.run_id = $1`,
    [latestRun.id]
  );

  let totalChecked = 0;
  let totalIssues = 0;
  const progress: string[] = [];

  for (const brand of brandRows) {
    const mentioningResponses = rawResponses.filter((rr: { response_text: string }) =>
      rr.response_text.toLowerCase().includes(brand.brand_name.toLowerCase())
    );

    progress.push(`Checking ${mentioningResponses.length} responses for "${brand.brand_name}"...`);

    for (const rr of mentioningResponses.slice(0, 10)) {
      // Limit to 10 per brand to avoid quota exhaustion
      try {
        // Check if already checked
        const { rows: existing } = await pool.query(
          "SELECT id FROM accuracy_checks WHERE raw_response_id = $1 AND brand_id = $2 AND run_id = $3",
          [rr.id, brand.brand_id, latestRun.id]
        );
        if (existing.length > 0) continue;

        const result = await factCheckResponse(
          brand.brand_name,
          brand.facts,
          rr.response_text
        );

        await pool.query(
          `INSERT INTO accuracy_checks (raw_response_id, brand_id, run_id, accurate, issues)
           VALUES ($1, $2, $3, $4, $5)`,
          [rr.id, brand.brand_id, latestRun.id, result.accurate, JSON.stringify(result.issues)]
        );

        totalChecked++;
        if (!result.accurate) totalIssues++;
      } catch (err) {
        progress.push(`Error checking response ${rr.id}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }
  }

  // Don't warn about unused variable
  void brandNames;

  return NextResponse.json({
    success: true,
    total_checked: totalChecked,
    total_issues: totalIssues,
    progress,
  });
}
