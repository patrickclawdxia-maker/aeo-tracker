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

const SENTIMENT_CONFIG: Record<Sentiment, { label: string; dot: string; badge: string; text: string }> = {
  positive: { label: "Positive", dot: "bg-emerald-400", badge: "bg-emerald-500/20 border-emerald-500/40", text: "text-emerald-300" },
  neutral:  { label: "Neutral",  dot: "bg-amber-400",  badge: "bg-amber-500/20 border-amber-500/40",   text: "text-amber-300"  },
  negative: { label: "Negative", dot: "bg-red-400",    badge: "bg-red-500/20 border-red-500/40",       text: "text-red-300"   },
};

function MentionBar({ rate }: { rate: number }) {
  const gradient =
    rate >= 70 ? "from-emerald-500 to-teal-400" :
    rate >= 40 ? "from-amber-500 to-yellow-400" :
    "from-red-500 to-rose-400";
  const label = rate >= 70 ? "Strong" : rate >= 40 ? "Moderate" : "Low";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-white/60">Mention rate · ChatGPT</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">{label}</span>
          <span className="text-lg font-bold text-white">{rate}%</span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-1000`}
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: TryResponse }) {
  const sc = SENTIMENT_CONFIG[result.overallSentiment];
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm shadow-xl">
      {/* Brand header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-900/40">
          {result.brand[0].toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-bold text-white">{result.brand}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/40">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {result.engine} · live scan
          </div>
        </div>
        <div className={`ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${sc.badge} ${sc.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </div>
      </div>

      {/* Mention rate */}
      <div className="px-4 pt-4 pb-3">
        <MentionBar rate={result.mentionRate} />
      </div>

      {/* Query results */}
      <div className="space-y-2 px-4 pb-4">
        {result.results.map((r, i) => (
          <div key={i} className="rounded-xl border border-white/8 bg-white/5 p-3">
            <p className="mb-2 text-[11px] font-medium leading-relaxed text-white/50 line-clamp-2">{r.query}</p>
            {r.mentioned ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                    Mentioned
                  </span>
                  {r.sentiment && (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SENTIMENT_CONFIG[r.sentiment].badge} ${SENTIMENT_CONFIG[r.sentiment].text}`}>
                      {SENTIMENT_CONFIG[r.sentiment].label}
                    </span>
                  )}
                </div>
                {r.snippet && (
                  <p className="mt-2 border-l-2 border-indigo-400/50 pl-2.5 text-[11px] leading-5 text-white/50 italic">
                    &ldquo;{r.snippet}&rdquo;
                  </p>
                )}
              </>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/8 border border-white/10 px-2 py-0.5 text-[11px] text-white/30">
                — Not mentioned
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Locked engines */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="mb-2 flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
          <span className="text-[11px] font-semibold text-indigo-400">{result.teaserNote}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Gemini", "Claude", "+8 queries"].map((label) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/5 py-2 text-center">
              <div className="text-[11px] font-semibold text-white/30">{label}</div>
              <div className="mt-0.5 text-[10px] text-white/20">🔒 locked</div>
            </div>
          ))}
        </div>
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
      if (res.ok) { setStatus("done"); setMsg(data.message ?? "Report sent!"); }
      else { setStatus("error"); setMsg("Something went wrong."); }
    } catch {
      setStatus("error"); setMsg("Network error.");
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-600/20 to-violet-600/20 backdrop-blur-sm shadow-xl">
      <div className="px-4 py-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-base">💾</span>
          <span className="text-sm font-bold text-white">Save your report</span>
        </div>
        <p className="mb-4 text-xs leading-5 text-white/50">
          Get the full report (Gemini + Claude + 8 queries) delivered to your inbox — free.
        </p>

        {status === "done" ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center">
            <div className="text-xl">✅</div>
            <p className="mt-1 text-sm font-semibold text-emerald-300">{msg}</p>
            <Link href="/login" className="mt-2 inline-block text-xs font-semibold text-indigo-300 underline">
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
                className="flex-1 rounded-xl border border-white/15 bg-white/8 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <button
                type="submit"
                disabled={status === "loading" || !email.trim()}
                className="flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 disabled:opacity-50 hover:shadow-indigo-800/60 transition-all whitespace-nowrap"
              >
                {status === "loading" ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                ) : "Send →"}
              </button>
            </form>
            {status === "error" && <p className="mt-1.5 text-xs text-red-400">{msg}</p>}
            <div className="my-3 flex items-center gap-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] text-white/30">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <Link
              href="/login"
              className="block w-full rounded-xl border border-white/15 bg-white/8 py-2.5 text-center text-sm font-bold text-white transition-all hover:bg-white/12 hover:border-white/25"
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
    const iv = setInterval(() => setStepIndex((p) => Math.min(p + 1, SCAN_STEPS.length - 1)), 1800);
    return () => clearInterval(iv);
  }, []);
  const step = SCAN_STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / SCAN_STEPS.length) * 100);
  return (
    <div className="w-full rounded-2xl border border-indigo-500/20 bg-indigo-600/10 px-4 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-xl">{step.icon}</span>
        <span className="text-sm font-medium text-indigo-200">{step.text}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        {SCAN_STEPS.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all duration-500 ${
            i < stepIndex ? "w-4 bg-indigo-400/60" :
            i === stepIndex ? "w-4 bg-indigo-300 animate-pulse" :
            "w-1.5 bg-white/15"
          }`} />
        ))}
        <span className="ml-auto text-[10px] font-semibold text-white/30">{progress}%</span>
      </div>
      <p className="mt-2.5 text-[11px] text-white/30">Live scan · usually 10–20 seconds</p>
    </div>
  );
}

const SUGGESTIONS = ["stripe.com", "notion.so", "Linear", "Figma", "Vercel", "Supabase"];

export function TryWidget() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "👋 Enter your brand name or website — I'll check how visible you are across AI search engines like ChatGPT right now." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [triesLeft, setTriesLeft] = useState(3);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only auto-scroll after the user has interacted (not on initial load)
    if (messages.length > 1) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function submit(value?: string) {
    const text = (value ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text }, { role: "assistant", loading: true }]);
    try {
      const res = await fetch("/api/try", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error === "rate_limited"
          ? "You've used all 3 free previews for today. Sign up to continue."
          : data.message ?? "Something went wrong.";
        setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", error: errorMsg }]);
      } else {
        setTriesLeft(data.triesRemaining ?? 0);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", result: data },
          { role: "assistant", cta: true, result: data },
        ]);
      }
    } catch {
      setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", error: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const hasRunOnce = messages.some((m) => m.role === "user");

  return (
    <div className="relative flex flex-col overflow-hidden rounded-3xl shadow-2xl" style={{
      background: "linear-gradient(145deg, #0f0c29, #1a1040, #24243e)",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-600/15 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative flex items-center gap-3 border-b border-white/8 px-5 py-3.5">
        {/* Animated AI avatar */}
        <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 opacity-80 blur-sm animate-pulse" />
          <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg">
            A
          </div>
        </div>
        <div>
          <div className="text-sm font-bold text-white">AEO Tracker</div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/40">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live AI scan
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/50">
          <span className={`h-1.5 w-1.5 rounded-full ${triesLeft > 0 ? "bg-indigo-400" : "bg-red-400"}`} />
          {triesLeft} free {triesLeft === 1 ? "try" : "tries"} left
        </div>
      </div>

      {/* Messages */}
      <div className="relative max-h-[520px] overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" ? (
              <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-900/40">
                {msg.text}
              </div>
            ) : (
              <div className="w-full max-w-[92%]">
                {"loading" in msg && msg.loading ? (
                  <ScanningLoader />
                ) : "error" in msg && msg.error ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {msg.error}
                    {msg.error.includes("Sign up") && (
                      <Link href="/login" className="ml-2 font-semibold underline text-indigo-300">Sign up free →</Link>
                    )}
                  </div>
                ) : "cta" in msg && msg.cta && msg.result ? (
                  <SaveCTA result={msg.result} />
                ) : "result" in msg && msg.result ? (
                  <ResultCard result={msg.result} />
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/70 leading-relaxed">
                    {msg.text}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {!hasRunOnce && (
        <div className="relative px-4 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/50 hover:border-indigo-400/50 hover:bg-indigo-500/15 hover:text-white/80 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="relative border-t border-white/8 px-4 py-3">
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Brand name or website URL…"
            disabled={loading || triesLeft === 0}
            className="flex-1 rounded-xl border border-white/10 bg-white/6 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/15 disabled:opacity-40 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || triesLeft === 0}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-900/50 disabled:opacity-40 hover:shadow-indigo-800/60 hover:-translate-y-0.5 transition-all"
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
            {loading ? "Scanning" : "Scan"}
          </button>
        </form>
        {triesLeft === 0 && (
          <p className="mt-2 text-center text-xs text-white/30">
            Free previews used up.{" "}
            <Link href="/login" className="font-semibold text-indigo-400 hover:underline">Create a free account →</Link>
          </p>
        )}
      </div>
    </div>
  );
}
