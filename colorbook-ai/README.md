## Colorbook AI — Coloring Book Generator (MVP)

Production-minded monorepo MVP for generating coloring book projects, prompts, and pages.

### Repo structure

- `apps/web`: Next.js 14+ (App Router) — Vercel
- `apps/api`: Node.js + Fastify — Railway
- `apps/worker`: BullMQ worker — Railway
- `packages/shared`: shared types/schemas/constants

### Local development

1) Create env files:

- Copy `/.env.example` to `/.env` and fill values.
- Optionally also create `apps/web/.env.local`, `apps/api/.env`, `apps/worker/.env` (the apps read from process env).

2) Start local Postgres + Redis:

```bash
cd colorbook-ai
docker compose up -d
```

3) Install deps and run:

```bash
pnpm install
pnpm dev
```

### Deploy (Vercel)

This repo is nested under `colweb/colorbook-ai`.

**Deploy without env vars (Preview mode)**: the website will load even with no Clerk keys configured (auth is disabled until you add keys).

**Vercel setup (REQUIRED):**

In Vercel → **Project Settings → Build & Development Settings**, set:

- **Root Directory**: `colorbook-ai/apps/web`
- **Framework Preset**: Next.js
- **Install Command**: `corepack enable && cd ../.. && corepack pnpm install`
- **Build Command**: (leave default: `next build`)
- **Output Directory**: (leave default)

**Why**: Vercel needs to detect Next.js in the Root Directory. Setting it to `colorbook-ai/apps/web` makes it find `package.json` with Next.js, then the install command goes up to the monorepo root to install all workspace dependencies.

**If you see `404: NOT_FOUND` after deployment:**
1. Check you're opening the **"Visit"** URL from Vercel → Deployments (not a custom domain)
2. Verify **Root Directory** matches one of the options above
3. Check build logs for "Build Completed" (not just "Deployment completed")

### Database migrations (Prisma)

```bash
cd colorbook-ai/apps/api
pnpm prisma migrate dev
pnpm prisma studio
```

### Notes / MVP constraints

- **No external storage**: we store prompts + metadata + image URLs (may expire).
- **PDF export**: generated on demand and streamed (not stored).


