import Link from "next/link";

const features = [
  {
    icon: "📊",
    title: "Brand Visibility Tracking",
    desc: "See exactly how often AI engines mention your brand across hundreds of queries.",
  },
  {
    icon: "⚔️",
    title: "Competitor Benchmarking",
    desc: "Compare your share-of-voice against competitors side-by-side.",
  },
  {
    icon: "🔍",
    title: "Content Gap Analysis",
    desc: "AI-powered recommendations for content that will boost your mentions.",
  },
  {
    icon: "🔗",
    title: "Citation Tracking",
    desc: "Discover which URLs AI engines cite when answering your queries.",
  },
  {
    icon: "📈",
    title: "Trend Monitoring",
    desc: "Track your visibility score over time and spot momentum shifts.",
  },
  {
    icon: "💡",
    title: "Query Suggestions",
    desc: "Auto-generate the right queries your buyers are asking AI engines.",
  },
];

const steps = [
  {
    num: "01",
    title: "Add your brands & queries",
    desc: "Set up your project with the brands you track and the questions your buyers ask.",
  },
  {
    num: "02",
    title: "We query every AI engine",
    desc: "We run your queries across ChatGPT, Gemini, and Claude — multiple times for accuracy.",
  },
  {
    num: "03",
    title: "Track your visibility score",
    desc: "Get a clear picture of your AI presence, with actionable steps to improve it.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <span>🤖</span>
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              AEO Tracker
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="#pricing"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-6 bg-white">
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-1.5 text-sm text-indigo-700 mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            The SEMrush for the AI era
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6 tracking-tight text-gray-900">
            Know exactly where your{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text text-transparent">
              brand stands
            </span>{" "}
            in AI search
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Track mentions, citations, and visibility across ChatGPT, Gemini,
            and Claude. See how buyers discover your brand — before your
            competitors do.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-200"
            >
              Start for free →
            </Link>
            <a
              href="#features"
              className="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-4 rounded-xl text-lg transition-colors border border-gray-300"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-gray-200 bg-gray-50 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 text-center">
          <p className="text-gray-500 text-sm font-medium">
            Tracking visibility across the top AI engines:
          </p>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <span className="text-xl">🤖</span>
              <span>ChatGPT</span>
            </div>
            <div className="text-gray-300">·</div>
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <span className="text-xl">✨</span>
              <span>Gemini</span>
            </div>
            <div className="text-gray-300">·</div>
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <span className="text-xl">🧠</span>
              <span>Claude</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need to win in AI search
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Built for marketers and SEOs who want to understand — and improve
              — their brand&apos;s presence in AI-generated answers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white border border-gray-200 hover:border-indigo-300 rounded-2xl p-6 transition-all hover:shadow-md group"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2 group-hover:text-indigo-600 transition-colors">
                  {f.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Up and running in minutes
            </h2>
            <p className="text-gray-500 text-lg">
              No complex setup. Just add your brands and start tracking.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.num} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-2/3 w-1/2 h-px bg-gradient-to-r from-indigo-200 to-transparent" />
                )}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-2xl font-bold text-indigo-600 mb-4">
                  {step.num}
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-gray-500 text-lg">Start free, upgrade when you need more.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Free</h3>
                <div className="text-4xl font-extrabold text-gray-900">$0</div>
                <p className="text-gray-500 text-sm mt-1">Forever free</p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "1 project",
                  "5 brands",
                  "10 queries",
                  "Manual runs",
                  "ChatGPT + Gemini + Claude",
                  "All 8 analytics tabs",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700 text-sm">
                    <span className="text-green-600">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className="block text-center bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-3 rounded-xl transition-colors border border-gray-300"
              >
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 border border-indigo-500 rounded-2xl p-8 relative text-white">
              <div className="absolute top-4 right-4 bg-white text-indigo-600 text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1">Pro</h3>
                <div className="text-4xl font-extrabold">
                  $49
                  <span className="text-lg font-normal text-indigo-200">/mo</span>
                </div>
                <p className="text-indigo-200 text-sm mt-1">Billed monthly</p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited projects",
                  "Unlimited brands",
                  "Unlimited queries",
                  "Scheduled runs (daily/weekly)",
                  "AI content gap analysis",
                  "Priority support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-indigo-100 text-sm">
                    <span className="text-white">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className="block text-center bg-white hover:bg-gray-50 text-indigo-600 font-semibold px-4 py-3 rounded-xl transition-all hover:shadow-lg"
              >
                Start Pro free for 14 days
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-24 px-6 border-t border-gray-200 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Start tracking your AI visibility today
          </h2>
          <p className="text-gray-500 text-lg mb-8">
            Free to start. No credit card required. Know where you stand in the
            AI era.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-200"
          >
            Create free account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-gray-400 text-sm">
          <div className="flex items-center gap-2 font-bold text-gray-500">
            <span>🤖</span>
            <span>AEO Tracker</span>
          </div>
          <p>© 2024 AEO Tracker. Track your brand in the AI era.</p>
        </div>
      </footer>
    </div>
  );
}
