# AEO Tracker — Roadmap

## ✅ Shipped (v0.1)

- Brand visibility tracking across ChatGPT, Gemini, Claude (3 × 3 iterations)
- Competitor benchmarking & share-of-voice analysis
- Citation tracking (which URLs do AI engines cite?)
- Trend monitoring over time (run history)
- AI-powered content gap analysis + recommendations
- Query suggestion generator
- Multi-user auth (Google OAuth + email/password)
- Scheduled runs (daily/weekly)
- Quota system (50 queries/day base + referral bonuses)
- Referral program (+50 queries per successful referral)
- Railway deploy + GHCR Docker image CI

---

## 🏗️ In Progress (v0.2)

- PostgreSQL migration (replacing SQLite for persistent multi-user data)
- GitHub Actions CI: build + push to GHCR on every push to `main`

---

## 🔜 Next Up (v0.3) — Inspired by Ahrefs AEO

### 🔴 High Priority

**Prompt Cluster Tracking**
- Group semantically similar queries into clusters instead of tracking them one-off
- Surface cluster-level visibility score (e.g. "pricing queries": 34% mention rate)
- Auto-suggest related queries to add to a cluster

**AI Crawler Visibility**
- Detect which AI bots crawl your domain (GPTBot, ClaudeBot, PerplexityBot, etc.)
- Show crawl frequency and last-seen dates
- Alert when a major AI crawler stops visiting

**AI Answer Accuracy Monitoring**
- Detect when an AI engine returns *incorrect* information about your brand
- Highlight the specific wrong claims with diff view
- Trace which source the AI likely pulled the bad info from
- Alert via email/webhook when new inaccuracies are detected

---

### 🟡 Medium Priority

**Competitor Citation Intelligence**
- See which competitor URLs are most cited by AI engines for your tracked queries
- Surface the content types (blog, comparison, FAQ) that earn the most citations
- "Beat this URL" — one-click content brief to outrank a cited competitor page

**Web Mention Monitoring**
- Track brand mentions across the open web (feeds AI training data)
- Identify high-authority mentions that are likely to influence AI responses
- Surface unlinked mentions worth turning into citations

**Combined SERP + AI Visibility Score**
- Merge traditional keyword rank data with AI mention rate into a single "discoverability score"
- Track whether improving your SERP rank correlates with AI mention rate

**Custom Reports & Export**
- Shareable read-only report links (for agencies showing clients)
- PDF/CSV export of run results
- White-label options (custom logo/domain)

---

## 💡 Backlog / Ideas

- Slack/email weekly digest (visibility score change summary)
- API access (for enterprise customers to pull data into their own dashboards)
- Multi-workspace support (agencies managing multiple clients)
- AI-generated content briefs from citation gaps
- Chrome extension: highlight AI-cited competitors while browsing
- Webhook alerts (Zapier/Make integration)
- Support for more AI engines: Perplexity, Copilot, Meta AI, Grok
