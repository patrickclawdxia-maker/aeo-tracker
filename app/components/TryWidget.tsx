"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Sentiment = "positive" | "neutral" | "negative";

interface QueryResult {
  query: string;
  mentioned: boolean;
  sentiment: Sentiment | null;
  snippet: string | null;
  citations: string[];
}

interface TryResponse {
  brand: string;
  engine: string;
  mentionRate: number;
  overallSentiment: Sentiment;
  results: QueryResult[];
  triesRemaining: number;
  teaserNote: string;
}

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text?: string; result?: TryResponse; loading?: boolean; error?: string };

const sentimentLabel: Record<Sentiment, { label: string; color: string; bg: string }> = {
  positive: { label: "Positive", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  neutral:  { label: "Neutral",  color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" },
  negative: { label: "Negative", color: "text-red-600",     bg: "bg-red-50 border-red-200" },
};

function MentionRateBar({ rate }: { rate: number }) {
  const color =
    rate >= 70 ? "from-emerald-500 to-teal-400" :
    rate >= 40 ? "from-amber-500 to-yellow-400" :
    "from-red-500 to-rose-400";
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs font-medium">
        <span className="text-gray-500">Mention rate (ChatGPT)</span>
        <span className="font-bold text-gray-900">{rate}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}

function ResultCard({ result, brand }: { result: TryResponse; brand: string }) {
  const s = sentimentLabel[result.overallSentiment];
  return (
    <div className="mt-3 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
            {brand[0].toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">{brand}</div>
            <div className="text-[11px] text-gray-400">{result.engine} · preview scan</div>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s.bg} ${s.color}`}>
          {s.label}
        </span>
      </div>

      {/* Mention rate */}
      <div className="px-4 py-3">
        <MentionRateBar rate={result.mentionRate} />
      </div>

      {/* Query results */}
      <div className="space-y-2 px-4 pb-3">
        {result.results.map((r, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="font-medium text-gray-600 truncate">{r.query}</span>
            </div>
            {r.mentioned ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500">✓</span>
                  <span className="text-xs font-medium text-gray-700">Mentioned</span>
                  {r.sentiment && (
                    <span className={`text-[10px] font-semibold ${sentimentLabel[r.sentiment].color}`}>
                      · {sentimentLabel[r.sentiment].label}
                    </span>
                  )}
                </div>
                {r.snippet && (
                  <p className="mt-1.5 text-[11px] leading-5 text-gray-500 italic">
                    &ldquo;{r.snippet}&rdquo;
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">—</span>
                <span className="text-xs text-gray-400">Not mentioned</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Teaser lock */}
      <div className="border-t border-dashed border-indigo-200 bg-indigo-50 px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-indigo-600">
          <span>🔒</span>
          <span className="font-medium">{result.teaserNote}</span>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Gemini", locked: true },
            { label: "Claude", locked: true },
            { label: "+8 queries", locked: true },
          ].map(({ label }) => (
            <div key={label} className="rounded-lg border border-indigo-200 bg-white/70 py-2 text-[11px] font-medium text-indigo-400">
              {label} 🔒
            </div>
          ))}
        </div>
        <Link
          href="/login"
          className="block w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
        >
          Unlock full report — it&apos;s free →
        </Link>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

const SUGGESTIONS = [
  "stripe.com", "notion.so", "Linear", "Figma", "Vercel", "Supabase",
];

export function TryWidget() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "👋 Enter your brand name or website — I'll check how visible you are in AI search engines like ChatGPT right now.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [triesLeft, setTriesLeft] = useState(3);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit(value?: string) {
    const text = (value ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "assistant", loading: true },
    ]);

    try {
      const res = await fetch("/api/try", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errorMsg =
          data.error === "rate_limited"
            ? "You've used all 3 free previews for today. Sign up to continue."
            : data.message ?? "Something went wrong. Try again.";

        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", error: errorMsg },
        ]);
      } else {
        setTriesLeft(data.triesRemaining ?? 0);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", result: data },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", error: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const hasRunOnce = messages.some((m) => m.role === "user");

  return (
    <div className="flex flex-col h-full max-h-[600px] rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-indigo-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-bold text-white">
          A
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900">AEO Tracker</div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live scan
          </div>
        </div>
        <div className="ml-auto rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
          {triesLeft} free {triesLeft === 1 ? "try" : "tries"} left
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" ? (
              <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm">
                {msg.text}
              </div>
            ) : (
              <div className="max-w-[90%] w-full">
                {"loading" in msg && msg.loading ? (
                  <div className="rounded-2xl rounded-tl-sm bg-gray-50 border border-gray-200 px-4 py-2">
                    <TypingDots />
                  </div>
                ) : "error" in msg && msg.error ? (
                  <div className="rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {msg.error}
                    {msg.error.includes("Sign up") && (
                      <Link href="/login" className="ml-2 font-semibold underline">Sign up free →</Link>
                    )}
                  </div>
                ) : "result" in msg && msg.result ? (
                  <ResultCard result={msg.result} brand={msg.result.brand} />
                ) : (
                  <div className="rounded-2xl rounded-tl-sm bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm text-gray-700">
                    {msg.text}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (only shown before first try) */}
      {!hasRunOnce && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3">
        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="flex gap-2 items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Brand name or website URL…"
            disabled={loading || triesLeft === 0}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || triesLeft === 0}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 hover:shadow-md transition-all"
          >
            {loading ? "…" : "Scan →"}
          </button>
        </form>
        {triesLeft === 0 && (
          <p className="mt-2 text-center text-xs text-gray-400">
            Free previews used up.{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:underline">Create a free account →</Link>
          </p>
        )}
      </div>
    </div>
  );
}
