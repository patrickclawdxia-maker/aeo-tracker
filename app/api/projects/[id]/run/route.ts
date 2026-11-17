import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { engines } from "@/lib/engines/registry";
import { queryEngine, sleep } from "@/lib/poe";
import { parseResponse } from "@/lib/parser";
import { verifyProjectOwnership } from "@/lib/project-auth";
import { consumeQuota, getQuotaStatus } from "@/lib/quota";
import { track } from "@/lib/analytics";

const ITERATIONS = 3;

function extractUrls(text: string): string[] {
  const regex = /https?:\/\/[^\s\]\)>"]+/g;
  return text.match(regex) || [];
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function computeNextRunAt(schedule: string | null, fromDate: Date): string | null {
  if (!schedule) return null;
  const next = new Date(fromDate);
  if (schedule === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (schedule === "weekly") {
    next.setDate(next.getDate() + 7);
  }
  return next.toISOString();
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error: authError, userId } = await verifyProjectOwnership(params.id);
  if (authError) return authError;

  const projectId = parseInt(params.id);

  const { rows: projectRows } = await pool.query(
    "SELECT * FROM projects WHERE id = $1",
    [projectId]
  );
  const project = projectRows[0] as
    | { id: number; name: string; schedule: string | null }
    | undefined;
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { rows: brands } = await pool.query(
    "SELECT * FROM tracked_brands WHERE project_id = $1",
    [projectId]
  ) as { rows: { id: number; name: string }[] };

  const { rows: queries } = await pool.query(
    "SELECT * FROM tracked_queries WHERE project_id = $1",
    [projectId]
  ) as { rows: { id: number; query: string }[] };

  if (brands.length === 0) {
    return NextResponse.json({ error: "No brands to track" }, { status: 400 });
  }

  if (queries.length === 0) {
    return NextResponse.json({ error: "No queries to run" }, { status: 400 });
  }

  // Quota check: total LLM calls = queries × engines × iterations
  const totalCalls = queries.length * engines.length * ITERATIONS;
  const effectiveUserId = userId ?? 0;
  const quota = await getQuotaStatus(effectiveUserId);
  if (quota.remaining < totalCalls) {
    return NextResponse.json(
      {
        error: `Daily query limit reached. This run needs ${totalCalls} queries but you only have ${quota.remaining} remaining (${quota.used}/${quota.limit} used today).`,
        quota,
      },
      { status: 429 }
    );
  }

  const { rows: runRows } = await pool.query(
    "INSERT INTO analysis_runs (project_id, status) VALUES ($1, 'running') RETURNING id",
    [projectId]
  );
  const runId = runRows[0].id as number;

  await track("run_started", "run", { projectId, queryCount: queries.length, brandCount: brands.length }, effectiveUserId);

  const progress: string[] = [];
  const errors: string[] = [];

  try {
    for (const q of queries) {
      for (const engine of engines) {
        for (let iter = 1; iter <= ITERATIONS; iter++) {
          const label = `[${engine.name}] "${q.query}" iter ${iter}`;
          try {
            progress.push(`Starting ${label}`);
            // Consume 1 quota unit per LLM call
            await consumeQuota(effectiveUserId, 1);
            const responseText = await queryEngine(engine.model, q.query);

            const { rows: rawRows } = await pool.query(
              `INSERT INTO raw_responses (run_id, query_id, engine_id, iteration, response_text)
               VALUES ($1, $2, $3, $4, $5) RETURNING id`,
              [runId, q.id, engine.id, iter, responseText]
            );
            const rawResponseId = rawRows[0].id as number;

            const mentions = parseResponse(responseText, brands);
            for (const mention of mentions) {
              await pool.query(
                `INSERT INTO brand_mentions (raw_response_id, brand_id, position, sentiment, context_snippet)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                  rawResponseId,
                  mention.brandId,
                  mention.position,
                  mention.sentiment,
                  mention.contextSnippet,
                ]
              );
            }

            const urls = extractUrls(responseText);
            for (const url of urls) {
              const domain = extractDomain(url);
              try {
                await pool.query(
                  `INSERT INTO citations (raw_response_id, url, domain) VALUES ($1, $2, $3)`,
                  [rawResponseId, url, domain]
                );
              } catch {
                // ignore duplicate or other errors
              }
            }

            progress.push(
              `Done ${label} — ${mentions.length} mentions, ${urls.length} URLs found`
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`Error ${label}: ${msg}`);
            progress.push(`Error ${label}: ${msg}`);
          }

          await sleep(500);
        }
      }
    }

    await pool.query(
      "UPDATE analysis_runs SET status = 'completed' WHERE id = $1",
      [runId]
    );

    const { rows: runMeta } = await pool.query(
      "SELECT created_at FROM analysis_runs WHERE id = $1",
      [runId]
    );
    const runCreatedAt = (runMeta[0] as { created_at: string }).created_at;

    const totalSlots = queries.length * ITERATIONS;

    for (const brand of brands) {
      for (const engine of engines) {
        const { rows: mentions } = await pool.query(
          `SELECT bm.position, bm.sentiment
           FROM brand_mentions bm
           JOIN raw_responses rr ON bm.raw_response_id = rr.id
           WHERE rr.run_id = $1 AND bm.brand_id = $2 AND rr.engine_id = $3`,
          [runId, brand.id, engine.id]
        ) as { rows: { position: number; sentiment: string }[] };

        const mentionRate =
          totalSlots > 0 ? (mentions.length / totalSlots) * 100 : 0;
        const avgPosition =
          mentions.length > 0
            ? mentions.reduce((s, m) => s + m.position, 0) / mentions.length
            : null;

        const sentPos = mentions.filter((m) => m.sentiment === "positive").length;
        const sentNeu = mentions.filter((m) => m.sentiment === "neutral").length;
        const sentNeg = mentions.filter((m) => m.sentiment === "negative").length;

        await pool.query(
          `DELETE FROM run_summaries WHERE run_id = $1 AND brand_id = $2 AND engine_id = $3`,
          [runId, brand.id, engine.id]
        );

        await pool.query(
          `INSERT INTO run_summaries
            (run_id, project_id, created_at, brand_id, engine_id, mention_rate, avg_position,
             sentiment_positive, sentiment_neutral, sentiment_negative)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            runId,
            projectId,
            runCreatedAt,
            brand.id,
            engine.id,
            Math.round(mentionRate * 10) / 10,
            avgPosition !== null ? Math.round(avgPosition * 10) / 10 : null,
            sentPos,
            sentNeu,
            sentNeg,
          ]
        );
      }
    }

    const now = new Date();
    const nextRunAt = computeNextRunAt(project.schedule, now);
    await pool.query(
      `UPDATE projects SET last_run_at = $1, next_run_at = $2 WHERE id = $3`,
      [now.toISOString(), nextRunAt, projectId]
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await pool.query(
      "UPDATE analysis_runs SET status = 'failed' WHERE id = $1",
      [runId]
    );
    return NextResponse.json(
      { error: msg, runId, progress, errors },
      { status: 500 }
    );
  }

  await track("run_completed", "run", { projectId, runId, totalCalls, errorCount: errors.length }, effectiveUserId);

  return NextResponse.json({
    success: true,
    runId,
    progress,
    errors,
    totalCalls: queries.length * engines.length * ITERATIONS,
  });
}
