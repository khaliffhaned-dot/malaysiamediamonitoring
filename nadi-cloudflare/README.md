# NADI — Cloudflare Workers edition

Port of the NADI social listening + AMEC Evaluation scaffold to **Cloudflare Workers + Hono + D1**.

## Why this shape

- FastAPI → Hono (same route style, edge runtime)
- Postgres/SQLAlchemy → D1 (SQLite). Foreign keys off; enforce tenancy in every query.
- In-memory store → D1. Scale-to-zero is free.
- Auth demo remains `X-Nadi-Role` header. Production path: Cloudflare Access or JWT verified in middleware.
- Product invariants preserved: `ave_enabled` always false, holdings never auto-publish, transition state machine, tenant filter on every query.

## Stack notes (from platform constraints)

- No `process.env` at runtime. Bindings only (`c.env.DB`).
- D1: use `.batch()` for multi-statement atomicity when needed. No cross-request transactions.
- Queues (not wired yet) for ingest: make every consumer idempotent.
- Durable Objects available for war-room collaborative state if you need real-time later.
- Workers AI binding optional for the LLM holding path (or call external Gemini).

## Quick start

```bash
cd nadi-cloudflare
npm install
npx wrangler d1 create nadi          # copy the database_id into wrangler.toml
npx wrangler d1 migrations apply nadi --local
npx wrangler d1 execute nadi --local --file=./migrations/seed.sql
npm run dev
```

Health: `GET /health`

Demo:

```bash
curl -H "X-Nadi-Role: ws_admin" http://localhost:8787/v1/workspaces/ws_aurora/mentions
curl -H "X-Nadi-Role: editor" -X POST http://localhost:8787/v1/workspaces/ws_aurora/briefs \
  -H "Content-Type: application/json" \
  -d '{"mention_ids":["mnt_demo1"],"tabletop":true}'
```

## What was refined

- Tenant isolation enforced in every SQL (org_id + workspace_id).
- AVE guard on holdings and evaluation lock.
- Holding transition rules kept.
- D1 schema matches the core entities.
- Ready for Cron Triggers (reports) and Queues (ingest) without rewriting the core.

## Noticed but didn't touch

- Full LLM path (original Gemini/Vertex). Stub uses deterministic draft. Wire Workers AI or external fetch when needed.
- Connectors (RSS, social). Add a Queue consumer.
- Frontend (vanilla HTML/JS). Serve as static assets or migrate to Next.js + OpenNext.
- Full RBAC matrix. Current middleware covers the demo routes.
- Audit log. Add an append-only table and write on mutations.

## Deploy

```bash
npx wrangler deploy
```

Set real `database_id` in wrangler.toml first.
