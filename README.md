# AEO Tracker

Track your brand's visibility across AI search engines (ChatGPT, Gemini, Claude). The SEMrush for the AI era.

## Features

- 📊 Brand visibility tracking across ChatGPT, Gemini, and Claude
- ⚔️ Competitor benchmarking and share-of-voice analysis
- 🔗 Citation tracking (which URLs do AI engines cite?)
- 📈 Trend monitoring over time
- 🔍 AI-powered content gap analysis
- 💡 Query suggestion generator
- 🔐 Multi-user auth (Google OAuth + email/password)
- 📅 Scheduled runs (daily/weekly)

## Local Development

```bash
# Clone the repo
git clone <your-repo-url>
cd aeo-tracker

# Install dependencies
npm install

# Set up env vars
cp .env.example .env.local
# Edit .env.local with your values (see Environment Variables below)

# Run dev server
npm run dev -- --port 3001
```

Open [http://localhost:3001](http://localhost:3001)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_SECRET` | Random secret for JWT signing. Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full URL of your app (e.g. `http://localhost:3001` or `https://your-app.railway.app`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (from Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the "Google+ API" / "Google Identity"
4. Go to **Credentials** → **Create OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/callback/google` (dev)
   - `https://your-app.railway.app/api/auth/callback/google` (production)
7. Copy the client ID and secret into your env vars

## Deploy to Railway

### Quick Deploy

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) and create a new project
3. Click **"Deploy from GitHub"** and select this repo
4. Railway will auto-detect the NIXPACKS config and build

### Environment Variables on Railway

In your Railway project dashboard:
1. Go to **Variables**
2. Add all variables from `.env.example`:
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` — set to your Railway app URL (e.g. `https://aeo-tracker.railway.app`)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

### Persistent Database Volume

The app uses SQLite (`aeo-tracker.db`). To persist data across deploys on Railway:

1. In your Railway project, go to **Settings** → **Volumes**
2. Create a new volume mounted at `/app`
3. This ensures `aeo-tracker.db` survives redeployments

> **Note:** Without a volume, the database resets on every deploy. For production use, mount the volume.

### After Deploying

1. Copy your Railway app URL (e.g. `https://aeo-tracker-production.railway.app`)
2. Update `NEXTAUTH_URL` env var to that URL
3. Add the Railway URL callback to your Google OAuth allowed redirect URIs:
   `https://your-app.railway.app/api/auth/callback/google`

## Tech Stack

- [Next.js 14](https://nextjs.org/) — App Router
- [NextAuth v5](https://authjs.dev/) — Authentication
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — SQLite database
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [Recharts](https://recharts.org/) — Charts
- [Poe API](https://developer.poe.com/) — AI engine queries
