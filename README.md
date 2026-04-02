# Scrum Poker

Real-time planning poker for agile teams, built as a **pnpm monorepo** on Cloudflare.

## Architecture

| Package | Description |
|---|---|
| `packages/shared` | TypeScript types, default card decks, `computeVoteResults` |
| `apps/worker` | Cloudflare Worker + Durable Object (WebSocket room server) |
| `apps/frontend` | Nuxt 3 SPA (Tailwind CSS, deployed to Cloudflare Pages) |

Each room is one **Cloudflare Durable Object** instance that owns all game state. Players connect via WebSocket; the host facilitates while other players vote.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) v8+ — `npm install -g pnpm`
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed automatically as a dev dependency) — authenticate once with `pnpm --filter @scrum-poker/worker exec wrangler login`

---

## Install

```bash
pnpm install
```

---

## Local development

### Run worker + frontend together

```bash
pnpm dev
```

This starts both in parallel:
- **Worker** on `http://localhost:8787` (via `wrangler dev`)
- **Frontend** on `http://localhost:3000` (via `nuxt dev`)

### Run individually

```bash
pnpm dev:worker    # Worker only
pnpm dev:frontend  # Frontend only
```

### Environment variables

The frontend reads one environment variable:

| Variable | Default | Description |
|---|---|---|
| `NUXT_PUBLIC_WORKER_URL` | `http://localhost:8787` | URL of the Cloudflare Worker |

Create `apps/frontend/.env` for local overrides:

```
NUXT_PUBLIC_WORKER_URL=http://localhost:8787
```

---

## Tests

```bash
pnpm test           # Run all tests (shared + worker)
pnpm test:shared    # packages/shared only
pnpm test:worker    # apps/worker only
```

Tests use [Vitest](https://vitest.dev/) and cover `computeVoteResults` logic and worker ban/vote integration.

---

## Deployment

### 1. Deploy the Worker

```bash
pnpm deploy:worker

# Or run the worker package script explicitly
pnpm --filter @scrum-poker/worker run deploy
```

This runs `wrangler deploy`, which publishes the Worker and provisions the `RoomDO` Durable Object to your Cloudflare account. `run` is required here because `pnpm deploy` is a built-in pnpm command and will not invoke the worker's package script. Note the deployed URL (e.g. `https://scrum-poker-worker.<your-subdomain>.workers.dev`).

### 2. Deploy the Frontend to Cloudflare Pages

Build the static SPA and deploy via Wrangler Pages:

```bash
# Set your worker URL, then generate the static site
NUXT_PUBLIC_WORKER_URL=https://scrum-poker-worker.<your-subdomain>.workers.dev \
  pnpm --filter @scrum-poker/frontend run generate

# Deploy the generated output to Cloudflare Pages
pnpm --filter @scrum-poker/worker exec wrangler pages deploy apps/frontend/dist \
  --project-name scrum-poker
```

Or connect the repository to **Cloudflare Pages** in the dashboard:

| Setting | Value |
|---|---|
| Build command | `pnpm --filter @scrum-poker/frontend run generate` |
| Build output directory | `apps/frontend/dist` |
| Environment variable | `NUXT_PUBLIC_WORKER_URL` = your Worker URL |

### CORS

The Worker allows all origins by default (`Access-Control-Allow-Origin: *`). For production, update `CORS_HEADERS` in `apps/worker/src/index.ts` to restrict to your Pages domain.

