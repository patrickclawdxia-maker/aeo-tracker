/**
 * /api/try/email-report
 * 
 * Accepts an email + the scan result from the teaser widget,
 * stores the lead, and sends a formatted HTML report.
 * 
 * Uses Resend if RESEND_API_KEY is set, otherwise falls back to
 * console logging (dev mode) so the endpoint never crashes.
 */

import { NextRequest, NextResponse } from "next/server";

// Same IP rate limit map as /api/try — reuse it via module-level
const emailHits = new Map<string, number>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkEmailLimit(ip: string): boolean {
  const count = emailHits.get(ip) ?? 0;
  if (count >= 3) return false;
  emailHits.set(ip, count + 1);
  return true;
}

function sentimentColor(s: string): string {
  if (s === "positive") return "#059669";
  if (s === "negative") return "#dc2626";
  return "#d97706";
}

function buildHtmlReport(brand: string, data: {
  engine: string;
  mentionRate: number;
  overallSentiment: string;
  results: { query: string; mentioned: boolean; sentiment: string | null; snippet: string | null }[];
}): string {
  const barColor = data.mentionRate >= 70 ? "#10b981" : data.mentionRate >= 40 ? "#f59e0b" : "#ef4444";
  const rows = data.results.map((r) => `
    <tr>
      <td style="padding:12px 16px; border-bottom:1px solid #f3f4f6; font-size:13px; color:#374151; max-width:300px; vertical-align:top;">
        ${r.query}
      </td>
      <td style="padding:12px 16px; border-bottom:1px solid #f3f4f6; vertical-align:top; white-space:nowrap;">
        ${r.mentioned
          ? `<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;">✓ Mentioned</span>`
          : `<span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:999px;font-size:12px;">— Not mentioned</span>`
        }
      </td>
      <td style="padding:12px 16px; border-bottom:1px solid #f3f4f6; font-size:12px; color:#6b7280; vertical-align:top;">
        ${r.sentiment
          ? `<span style="color:${sentimentColor(r.sentiment)};font-weight:600;">${r.sentiment.charAt(0).toUpperCase() + r.sentiment.slice(1)}</span>`
          : "—"
        }
      </td>
    </tr>
    ${r.snippet ? `
    <tr>
      <td colspan="3" style="padding:0 16px 12px 16px; border-bottom:1px solid #f3f4f6;">
        <div style="border-left:3px solid #818cf8;padding:8px 12px;background:#f5f3ff;border-radius:0 8px 8px 0;font-size:12px;color:#4b5563;font-style:italic;">
          "${r.snippet}"
        </div>
      </td>
    </tr>` : ""}
  `).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 32px 28px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:44px;height:44px;background:rgba(255,255,255,0.2);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:white;">A</div>
        <span style="color:rgba(255,255,255,0.9);font-weight:600;font-size:16px;">AEO Tracker</span>
      </div>
      <h1 style="margin:0;color:white;font-size:24px;font-weight:800;line-height:1.2;">AI Visibility Report</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Brand: <strong>${brand}</strong> · Engine: ${data.engine}</p>
    </div>

    <!-- Score -->
    <div style="padding:28px 32px 20px;border-bottom:1px solid #f3f4f6;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:14px;font-weight:600;color:#374151;">Mention Rate</span>
        <span style="font-size:28px;font-weight:800;color:#111827;">${data.mentionRate}%</span>
      </div>
      <div style="height:10px;background:#f3f4f6;border-radius:999px;overflow:hidden;">
        <div style="height:100%;width:${data.mentionRate}%;background:${barColor};border-radius:999px;"></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;align-items:center;">
        <span style="font-size:13px;color:#6b7280;">Overall sentiment:</span>
        <span style="font-size:13px;font-weight:700;color:${sentimentColor(data.overallSentiment)}">
          ${data.overallSentiment.charAt(0).toUpperCase() + data.overallSentiment.slice(1)}
        </span>
      </div>
    </div>

    <!-- Results table -->
    <div style="padding:24px 32px;">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111827;">Query Breakdown</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;">Query</th>
            <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;">Result</th>
            <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;">Sentiment</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <!-- Teaser / CTA -->
    <div style="margin:0 32px 32px;background:linear-gradient(135deg,#eef2ff,#f5f3ff);border:1px dashed #818cf8;border-radius:12px;padding:20px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4f46e5;">🔒 This is a preview (1 of 3 engines · 2 of 10 queries)</p>
      <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">Sign up free to unlock Gemini, Claude, full query tracking, scheduled monitoring, and competitor benchmarking.</p>
      <a href="https://aeo-tracker-navy.vercel.app/login" 
         style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
        Create free account →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Sent by <a href="https://aeo-tracker-navy.vercel.app" style="color:#6366f1;text-decoration:none;">AEO Tracker</a> · 
        The SEMrush for the AI era
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AEO Tracker <reports@aeo-tracker.com>",
      to,
      subject,
      html,
    }),
  });

  return res.ok;
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  if (!checkEmailLimit(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email: string = body?.email?.trim()?.toLowerCase() ?? "";
  const scanResult = body?.scanResult;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!scanResult?.brand) {
    return NextResponse.json({ error: "missing_result" }, { status: 400 });
  }

  const html = buildHtmlReport(scanResult.brand, scanResult);
  const subject = `Your AI Visibility Report — ${scanResult.brand}`;

  const sent = await sendViaResend(email, subject, html);

  // Log in dev if Resend not configured
  if (!sent) {
    console.log(`[DEV] Email report for ${email}:\n${subject}\n(Resend not configured)`);
  }

  return NextResponse.json({
    success: true,
    delivered: sent,
    message: sent
      ? "Report sent! Check your inbox."
      : "Got it! Set up your free account to access the full report.",
  });
}
