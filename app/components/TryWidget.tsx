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
  | { role: "assistant"; text?: string; result?: TryResponse; loading?: boolean; error?: string; cta?: boolean };

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
          <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
            {/* Query text */}
            <p className="mb-2 text-xs font-medium text-gray-500 leading-relaxed line-clamp-2">
              {r.query}
            </p>
            {r.mentioned ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    <span>✓</span> Mentioned
                  </span>
                  {r.sentiment && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${sentimentLabel[r.sentiment].bg} ${sentimentLabel[r.sentiment].color}`}>
                      {sentimentLabel[r.sentiment].label}
                    </span>
                  )}
                </div>
                {r.snippet && (
                  <p className="mt-2 text-xs leading-5 text-gray-500 italic border-l-2 border-indigo-200 pl-2.5">
                    &ldquo;{r.snippet}&rdquo;
                  </p>
                )}
              </>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                — Not mentioned
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Teaser lock */}
      <div className="border-t border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm">🔒</span>
          <span className="text-xs font-semibold text-indigo-700">{result.teaserNote}</span>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          {["Gemini", "Claude", "+8 queries"].map((label) => (
            <div key={label} className="rounded-xl border border-indigo-200 bg-white/80 py-2.5 shadow-sm">
              <div className="text-xs font-semibold text-indigo-400">{label}</div>
              <div className="mt-0.5 text-[10px] text-indigo-300">🔒 locked</div>
            </div>
          ))}
        </div>
        <Link
          href="/login"
          className="block w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-center text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:shadow-indigo-300"
        >
          Unlock full report — it&apos;s free →
        </Link>
        <p className="mt-2 text-center text-[11px] text-indigo-400">No credit card · takes 30 seconds</p>
      </div>
    </div>
  );
}

function SaveCTA({ result }: { result: TryResponse }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function sendReport(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/try/email-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), scanResult: result }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("done");
        setMsg(data.message ?? "Report sent!");
      } else {
        setStatus("error");
        setMsg("Something went wrong. Try again.");
      }
    } catch {
      setStatus("error");
      setMsg("Network error. Try again.");
    }
  }

  return (
    <div className="mt-3 w-full overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 shadow-md">
      <div className="px-4 py-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-base">💾</span>
          <span className="text-sm font-bold text-indigo-900">Save your report</span>
        </div>
        <p className="mb-4 text-xs leading-5 text-indigo-700">
          Get this report in your inbox + unlock Gemini, Claude, and 8 more queries — free.
        </p>

        {status === "done" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
            <div className="text-base">✅</div>
            <p className="mt-1 text-sm font-semibold text-emerald-700">{msg}</p>
            <Link href="/login" className="mt-2 inline-block text-xs font-semibold text-indigo-600 underline">
              Create full account →
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={sendReport} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <button
                type="submit"
                disabled={status === "loading" || !email.trim()}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50 hover:shadow-md transition-all whitespace-nowrap"
              >
                {status === "loading" ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                ) : "Send →"}
              </button>
            </form>
            {status === "error" && <p className="mt-1.5 text-xs text-red-500">{msg}</p>}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-px bg-indigo-200" />
              <span className="text-[11px] text-indigo-400">or</span>
              <div className="flex-1 h-px bg-indigo-200" />
            </div>
            <Link
              href="/login"
              className="mt-3 block w-full rounded-xl border-2 border-indigo-300 bg-white py-2.5 text-center text-sm font-bold text-indigo-700 transition-all hover:border-indigo-500 hover:bg-indigo-50"
            >
              Sign up free — no credit card →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

const SCAN_STEPS = [
  { icon: "🔍", text: "Looking up your brand…" },
  { icon: "🤖", text: "Querying ChatGPT…" },
  { icon: "📊", text: "Analyzing mentions & sentiment…" },
  { icon: "🔗", text: "Extracting citations…" },
  { icon: "✨", text: "Building your visibility report…" },
];

function ScanningLoader() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, SCAN_STEPS.length - 1));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const step = SCAN_STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / SCAN_STEPS.length) * 100);

  return (
    <div className="rounded-2xl rounded-tl-sm border border-indigo-100 bg-indigo-50 px-4 py-4 w-full">
      {/* Step label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{step.icon}</span>
        <span className="text-sm font-medium text-indigo-700 transition-all">{step.text}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="mt-3 flex items-center gap-1.5">
        {SCAN_STEPS.map((s, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i < stepIndex
                ? "w-4 bg-indigo-400"
                : i === stepIndex
                ? "w-4 bg-indigo-600 animate-pulse"
                : "w-1.5 bg-indigo-200"
            }`}
          />
        ))}
        <span className="ml-auto text-[10px] font-semibold text-indigo-400">{progress}%</span>
      </div>

      <p className="mt-3 text-[11px] text-indigo-400">
        Live scan across AI engines — usually takes 10–20 seconds
      </p>
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
          // Inject SaveCTA as next message
          { role: "assistant", cta: true, result: data },
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
    <div className="flex flex-col rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-indigo-100 overflow-hidden">
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
      <div className="max-h-[500px] overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" ? (
              <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm">
                {msg.text}
              </div>
            ) : (
              <div className="max-w-[90%] w-full">
                {"loading" in msg && msg.loading ? (
                  <ScanningLoader />
                ) : "error" in msg && msg.error ? (
                  <div className="rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {msg.error}
                    {msg.error.includes("Sign up") && (
                      <Link href="/login" className="ml-2 font-semibold underline">Sign up free →</Link>
                    )}
                  </div>
                ) : "cta" in msg && msg.cta && msg.result ? (
                  <SaveCTA result={msg.result} />
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
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 hover:shadow-md transition-all"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                Scanning
              </>
            ) : "Scan →"}
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
