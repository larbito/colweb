# ColorBook AI

AI-powered coloring book generator for KDP creators.

## Features

- 🎨 AI Theme Suggestions
- 📝 AI Story Prompt Generation (up to 80 pages)
- 🖼️ AI Coloring Page Generation (DALL-E 3)
- 📄 Print-ready PDF Export
- 🌓 Dark/Light Mode

## Deploy to Vercel

1. Import the repo in Vercel
2. Root directory: `colorbook-ai`
3. Add environment variable: `OPENAI_API_KEY`
4. Deploy

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key for AI features |

Get your API key at: https://platform.openai.com/api-keys

## Local Development

```bash
# Install dependencies
npm install

# Copy env example and add your API key
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY

# Start dev server
npm run dev
```

Open http://localhost:3000

## Structure

- `app/(marketing)` — public marketing site
- `app/(app)` — dashboard + wizard UI
- `app/api/ai` — AI API routes
- `components/ui` — shadcn-style UI primitives
- `lib/` — utilities, OpenAI client, schemas

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/suggest-theme` | POST | AI theme & character suggestions |
| `/api/ai/lock-character` | POST | Create canonical character definition for consistency |
| `/api/ai/generate-character-sheet` | POST | Generate character reference sheet image |
| `/api/ai/generate-prompts` | POST | Generate story prompts (max 80 pages) |
| `/api/ai/generate-image` | POST | Generate coloring page image |
| `/api/ai/suggest-trending` | POST | Generate idea based on current trends |
| `/api/trends` | GET | Get current trending keywords |
| `/api/cron/refresh-trends` | GET/POST | Refresh trend data (cron job) |

## Series Consistency

The **Character Lock** system ensures your main character looks identical across all pages:

1. **Lock Character** — AI creates a canonical definition with exact proportions, features, and outfit
2. **Character Sheet** — A reference sheet is generated showing multiple poses
3. **Generate Pages** — Each page uses the character lock for visual consistency

## Trending Ideas

The app includes a time-aware trending system:

1. **Automatic Refresh** — Cron job runs daily at 05:00 UTC to fetch trend signals
2. **Multiple Sources** — DataForSEO Google Trends (primary), Keepa Amazon data (optional), synthetic fallback
3. **Region-Aware** — Supports US, UK, DE markets
4. **Period Selection** — View trends for 7, 30, or 90 days

### Environment Variables for Trends

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | For DB trends | Railway Postgres connection URL |
| `CRON_SECRET` | Recommended | Secret to protect cron endpoint |
| `DATAFORSEO_LOGIN` | Optional | DataForSEO API login |
| `DATAFORSEO_PASSWORD` | Optional | DataForSEO API password |
| `KEEPA_API_KEY` | Optional | Keepa API key for Amazon data |

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS (tokens + dark/light)
- Prisma (PostgreSQL)
- OpenAI (GPT-4o-mini, DALL-E 3)
- Zod (schema validation)
- next-themes
- lucide-react
- framer-motion
