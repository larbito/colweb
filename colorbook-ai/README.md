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

### Database migrations (Prisma)

```bash
cd colorbook-ai/apps/api
pnpm prisma migrate dev
pnpm prisma studio
```

### Notes / MVP constraints

- **No external storage**: we store prompts + metadata + image URLs (may expire).
- **PDF export**: generated on demand and streamed (not stored).


