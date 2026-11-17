import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { TryWidget } from "./components/TryWidget";

const APP_URL = process.env.NEXTAUTH_URL || "https://aeo-tracker.vercel.app";

export const metadata: Metadata = {
  title: "AEO Tracker — The SEMrush for the AI Era",
  description:
    "Know where your brand ranks in ChatGPT, Gemini, and Claude. Track AI mentions, citations, competitor share of voice, and content gaps — all in one dashboard.",
  alternates: {
    canonical: APP_URL,
  },
  openGraph: {
    url: APP_URL,
    title: "AEO Tracker — The SEMrush for the AI Era",
    description:
      "Know where your brand ranks in ChatGPT, Gemini, and Claude. Track AI mentions, citations, competitor share of voice, and content gaps.",
  },
};

const features = [
  {
    icon: "📊",
    title: "Brand Visibility Tracking",
    desc: "Measure how often AI engines mention your brand and where you rank in generated answers.",
    accent: "indigo",
  },
  {
    icon: "⚔️",
    title: "Competitor Benchmarking",
    desc: "Compare share of voice, sentiment, and ranking position against the brands you compete with.",
    accent: "violet",
  },
  {
    icon: "🗺️",
    title: "Topical Authority Map",
    desc: "Spot the topics where AI engines already trust you, and the gaps worth closing next.",
    badge: "New",
    accent: "pink",
  },
  {
    icon: "🔗",
    title: "Citation Tracking",
    desc: "See which sources are shaping AI answers and whether your pages are earning citations.",
    accent: "emerald",
  },
  {
    icon: "🤖",
    title: "AI Crawler Visibility",
    desc: "Monitor whether the agents and crawlers behind AI search can reach your most important content.",
    badge: "New",
    accent: "amber",
  },
  {
    icon: "🔍",
    title: "Accuracy Monitoring",
    desc: "Find inaccurate claims, outdated snippets, and risky answer patterns before buyers see them.",
    badge: "New",
    accent: "blue",
  },
];

const accentClasses: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-600 group-hover:border-indigo-300 group-hover:shadow-indigo-100",
  violet: "bg-violet-50 text-violet-600 group-hover:border-violet-300 group-hover:shadow-violet-100",
  pink: "bg-pink-50 text-pink-600 group-hover:border-pink-300 group-hover:shadow-pink-100",
  emerald: "bg-emerald-50 text-emerald-600 group-hover:border-emerald-300 group-hover:shadow-emerald-100",
  amber: "bg-amber-50 text-amber-600 group-hover:border-amber-300 group-hover:shadow-amber-100",
  blue: "bg-blue-50 text-blue-600 group-hover:border-blue-300 group-hover:shadow-blue-100",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AEO Tracker",
  url: APP_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Track your brand's visibility across ChatGPT, Gemini, and Claude. Monitor AI mentions, citations, share of voice, and competitor benchmarks.",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "49",
      priceCurrency: "USD",
      billingIncrement: "P1M",
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-sm shadow-indigo-200">
              A
            </div>
            <span className="text-lg font-bold text-gray-950">AEO Tracker</span>
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            {["Features", "How it works", "Pricing", "Blog"].map((item) => (
              <Link
                key={item}
                href={item === "Blog" ? "#" : `#${item.toLowerCase().replaceAll(" ", "-")}`}
                className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-950"
              >
                {item}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-gray-500 hover:text-gray-950 sm:block">
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:shadow-indigo-300"
            >
              Start free →
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO — dark, full bleed */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(160deg, #0d0a1e 0%, #130d2e 50%, #0f0c29 100%)" }}>
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-indigo-700/20 blur-[120px]" />
          <div className="absolute top-1/2 -right-40 h-96 w-96 rounded-full bg-violet-700/15 blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-indigo-900/30 blur-[80px]" />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }} />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-6 lg:pt-28 lg:pb-8">
          {/* Badge */}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              The SEMrush for the AI era
            </div>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-center text-5xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Know where your brand<br className="hidden sm:block" /> ranks in{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              AI search
            </span>
          </h1>

          {/* Subline */}
          <p className="mb-10 text-center text-lg leading-8 text-white/50 sm:text-xl">
            Track mentions, citations, and share of voice across ChatGPT, Gemini, and Claude.
          </p>

          {/* Widget — prominent, wide */}
          <div id="demo" className="mx-auto max-w-2xl">
            <TryWidget />
          </div>

          {/* Social proof */}
          <div className="mt-8 mb-6 flex flex-wrap items-center justify-center gap-5">
            <div className="flex -space-x-2.5">
              {["M", "A", "J", "S"].map((initial, idx) => (
                <div
                  key={initial}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#130d2e] bg-gradient-to-br from-indigo-500 to-violet-700 text-xs font-bold text-white shadow-sm"
                  style={{ transform: `translateY(${idx % 2 === 0 ? 0 : 2}px)` }}
                >
                  {initial}
                </div>
              ))}
            </div>
            <p className="text-sm text-white/40">500+ marketers tracking AI visibility</p>
            <Link
              href="/login"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/60 transition-all hover:border-indigo-400/40 hover:bg-white/10 hover:text-white/90"
            >
              Sign up free →
            </Link>
          </div>
        </div>

        {/* Bottom fade into next section */}
        <div className="h-16 bg-gradient-to-b from-transparent to-gray-50" />
      </section>

      <section className="border-y border-gray-200 bg-gray-50 px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-5 text-sm">
          <span className="font-medium text-gray-400">Tracks visibility across</span>
          <span className="font-semibold text-gray-700"><span className="text-[#10a37f]">●</span> ChatGPT</span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-700"><span className="text-[#4285f4]">●</span> Gemini</span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-700"><span className="text-[#d97706]">●</span> Claude</span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-700"><span className="text-teal-500">●</span> Perplexity <span className="text-xs text-gray-400">coming soon</span></span>
        </div>
      </section>

      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-gray-950">Everything AI search visibility needs</h2>
            <p className="mt-4 text-lg text-gray-500">A focused toolkit for marketers, SEOs, and founders who need to understand how AI answers describe their market.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${accentClasses[feature.accent]}`}
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${accentClasses[feature.accent].split(" ").slice(0, 2).join(" ")}`}>
                    {feature.icon}
                  </div>
                  {feature.badge && (
                    <span className="rounded-full bg-gray-950 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                      {feature.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-950">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-indigo-950 via-violet-900 to-purple-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-4xl font-bold tracking-tight">AI search is growing fast</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              ["317M+", "prompts"],
              ["1.08%", "AI traffic"],
              ["3×", "trust vs ads"],
            ].map(([stat, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-8 text-center backdrop-blur">
                <div className="text-5xl font-extrabold">{stat}</div>
                <div className="mt-2 text-sm font-medium text-indigo-100">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-gray-950">How it works</h2>
            <p className="mt-4 text-lg text-gray-500">Set up a project once, then watch your AI search footprint move over time.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["1", "Add brands & queries", "Choose the brands, competitors, and buying questions that matter.", "from-indigo-600 to-indigo-400"],
              ["2", "We query every AI engine", "AEO Tracker runs prompts across ChatGPT, Gemini, Claude, and more.", "from-violet-600 to-violet-400"],
              ["3", "Track & improve your score", "Use rankings, citations, and gaps to build the content AI engines prefer.", "from-pink-600 to-pink-400"],
            ].map(([num, title, desc, gradient]) => (
              <div key={num} className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
                <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-xl font-bold text-white`}>
                  {num}
                </div>
                <h3 className="text-lg font-bold text-gray-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-gray-950">Pricing that scales with your questions</h2>
            <p className="mt-4 text-lg text-gray-500">Start free and upgrade when AI visibility becomes a workflow.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-950">Free</h3>
              <div className="mt-4 text-5xl font-extrabold text-gray-950">$0<span className="text-base font-medium text-gray-400">/forever</span></div>
              <ul className="mt-8 space-y-3 text-sm text-gray-600">
                {["1 project", "5 brands", "10 queries", "50 queries/day", "All tabs included"].map((item) => (
                  <li key={item} className="flex items-center gap-3"><span className="text-emerald-500">✓</span>{item}</li>
                ))}
              </ul>
              <Link href="/login" className="mt-8 block rounded-xl border border-gray-200 px-5 py-3 text-center font-semibold text-gray-700 transition-colors hover:border-indigo-200 hover:text-indigo-700">
                Start free
              </Link>
            </div>
            <div className="relative rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white shadow-2xl shadow-indigo-200">
              <div className="absolute right-6 top-6 rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-600">POPULAR</div>
              <h3 className="text-xl font-bold">Pro</h3>
              <div className="mt-4 text-5xl font-extrabold">$49<span className="text-base font-medium text-indigo-100">/mo</span></div>
              <ul className="mt-8 space-y-3 text-sm text-indigo-50">
                {["Unlimited projects", "Unlimited brands", "Unlimited queries", "Scheduled runs", "API access"].map((item) => (
                  <li key={item} className="flex items-center gap-3"><span className="text-white">✓</span>{item}</li>
                ))}
              </ul>
              <Link href="/login" className="mt-8 block rounded-xl bg-white px-5 py-3 text-center font-semibold text-indigo-600 transition-all hover:shadow-xl">
                Start Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-gray-950">Your brand is already being searched in AI. Are you winning?</h2>
          <Link
            href="/login"
            className="mt-9 inline-flex rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:shadow-indigo-300"
          >
            Create free account →
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white">
              A
            </div>
            <span className="font-bold text-gray-700">AEO Tracker</span>
          </div>
          <div className="flex gap-5">
            <Link href="#features" className="hover:text-gray-700">Features</Link>
            <Link href="#how-it-works" className="hover:text-gray-700">How it works</Link>
            <Link href="#pricing" className="hover:text-gray-700">Pricing</Link>
          </div>
          <p>© 2026 AEO Tracker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
