import { NextRequest, NextResponse } from "next/server";

const POE_BASE_URL = "https://api.poe.com/v1";
const POE_API_KEY = "***REDACTED***";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const topic: string = body.topic;

  if (!topic?.trim()) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const prompt = `Generate 10 specific, realistic questions that a person would ask an AI search engine (like ChatGPT or Perplexity) when researching the "${topic}" category.
These should be natural questions a buyer or researcher would ask.
Return ONLY a JSON array of strings, no explanation.
Example format: ["What is the best X for Y?", "Compare X vs Z for small businesses"]`;

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
    const errorText = await response.text();
    return NextResponse.json(
      { error: `Poe API error: ${errorText}` },
      { status: 500 }
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Parse JSON array from response
  let suggestions: string[] = [];
  try {
    // Find JSON array in response
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      suggestions = JSON.parse(match[0]);
    }
  } catch {
    // fallback: split by newline
    suggestions = content
      .split("\n")
      .map((s: string) => s.replace(/^[\d\.\-\*]+\s*/, "").trim())
      .filter((s: string) => s.length > 10)
      .slice(0, 10);
  }

  return NextResponse.json({ suggestions });
}
