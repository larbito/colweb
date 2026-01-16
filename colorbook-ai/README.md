# ColorBook AI — UI-First MVP

Clean, production-ready UI for a coloring book generator. No APIs yet (easy deployment on Vercel).

## Deploy to Vercel

1. Import the repo in Vercel
2. Root directory: `colorbook-ai`
3. Deploy

No environment variables required for this UI-only phase.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Structure

- `app/(marketing)` — public marketing site
- `app/(app)` — dashboard + wizard UI
- `components/ui` — shadcn-style UI primitives

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS (tokens + dark/light)
- next-themes
- lucide-react
