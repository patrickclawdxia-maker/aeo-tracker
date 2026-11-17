import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pool";
import { verifyProjectOwnership } from "@/lib/project-auth";
import { AI_CRAWLERS } from "@/lib/ai-crawlers";

type CrawlerStatus = "allowed" | "blocked" | "not_mentioned";

interface ParsedSection {
  agents: string[];
  disallows: string[];
  allows: string[];
}

function parseRobotsTxt(robotsTxt: string, userAgent: string): CrawlerStatus {
  const lines = robotsTxt.split("\n").map((l) => l.trim());

  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const line of lines) {
    if (line.startsWith("#")) continue;

    if (line === "") {
      if (current) {
        sections.push(current);
        current = null;
      }
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const field = line.substring(0, colonIdx).trim().toLowerCase();
    const value = line.substring(colonIdx + 1).trim();

    if (field === "user-agent") {
      if (!current) current = { agents: [], disallows: [], allows: [] };
      current.agents.push(value.toLowerCase());
    } else if (field === "disallow") {
      if (current) current.disallows.push(value);
    } else if (field === "allow") {
      if (current) current.allows.push(value);
    }
  }
  if (current) sections.push(current);

  const uaLower = userAgent.toLowerCase();

  const specificSection = sections.find((s) => s.agents.includes(uaLower));
  const wildcardSection = sections.find((s) => s.agents.includes("*"));

  function sectionStatus(section: ParsedSection): CrawlerStatus {
    if (section.disallows.some((d) => d === "/")) return "blocked";
    if (section.disallows.some((d) => d === "") || section.allows.some((a) => a === "/")) return "allowed";
    if (section.disallows.length > 0) return "blocked";
    return "allowed";
  }

  if (specificSection) return sectionStatus(specificSection);
  if (wildcardSection) return sectionStatus(wildcardSection);
  return "not_mentioned";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const projectId = parseInt(params.id);

  const { rows } = await pool.query(
    "SELECT * FROM crawler_checks WHERE project_id = $1 ORDER BY checked_at DESC LIMIT 1",
    [projectId]
  );

  if (!rows[0]) {
    return NextResponse.json({ check: null });
  }

  const check = rows[0] as {
    id: number;
    project_id: number;
    domain: string;
    checked_at: string;
    robots_txt: string | null;
    crawler_statuses: Record<string, string>;
  };

  const crawlers = AI_CRAWLERS.map((c) => ({
    ...c,
    status: (check.crawler_statuses[c.id] as CrawlerStatus) || "not_mentioned",
  }));

  return NextResponse.json({
    check: {
      domain: check.domain,
      checked_at: check.checked_at,
      crawlers,
      robots_txt: check.robots_txt,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await verifyProjectOwnership(params.id);
  if (error) return error;

  const projectId = parseInt(params.id);
  const body = await req.json();
  const { domain } = body as { domain: string };

  if (!domain?.trim()) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  const cleanDomain = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

  let robotsTxt: string | null = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://${cleanDomain}/robots.txt`, {
      signal: controller.signal,
      headers: { "User-Agent": "AEO-Tracker/1.0" },
    });
    clearTimeout(timeout);
    if (res.ok) {
      robotsTxt = await res.text();
    }
  } catch {
    robotsTxt = null;
  }

  const crawlerStatuses: Record<string, CrawlerStatus> = {};
  const crawlers = AI_CRAWLERS.map((c) => {
    const status: CrawlerStatus = robotsTxt
      ? parseRobotsTxt(robotsTxt!, c.userAgent)
      : "not_mentioned";
    crawlerStatuses[c.id] = status;
    return { ...c, status };
  });

  const { rows } = await pool.query(
    `INSERT INTO crawler_checks (project_id, domain, robots_txt, crawler_statuses)
     VALUES ($1, $2, $3, $4)
     RETURNING checked_at`,
    [projectId, cleanDomain, robotsTxt, JSON.stringify(crawlerStatuses)]
  );

  return NextResponse.json({
    domain: cleanDomain,
    checked_at: rows[0].checked_at,
    crawlers,
    robots_txt: robotsTxt,
  });
}
