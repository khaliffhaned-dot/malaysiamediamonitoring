import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware, requirePerm } from "./middleware/auth";
import { draftHolding, transitionHolding } from "./services/holding";
import { Env, HoldingSchema, MentionSchema } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());
app.use("/v1/*", authMiddleware);

app.get("/health", (c) =>
  c.json({
    status: "ok",
    version: "0.1.0-cf",
    ave_enabled: false,
    evaluation_codename: "berry-bison-yonder-cabin",
    runtime: "cloudflare-workers",
  })
);

// Mentions
app.get("/v1/workspaces/:ws/mentions", async (c) => {
  const ctx = requirePerm(c, "ws.mentions.read");
  if (ctx instanceof Response) return ctx;

  const eastMy = c.req.query("east_my");
  const threeR = c.req.query("three_r");

  let sql = `SELECT * FROM mentions WHERE workspace_id = ? AND org_id = ?`;
  const params: any[] = [ctx.workspace_id, ctx.org_id];

  if (eastMy !== undefined) {
    sql += ` AND east_my = ?`;
    params.push(eastMy === "true" ? 1 : 0);
  }

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  let items = (results ?? []).map((r: any) => ({
    ...r,
    three_r: JSON.parse(r.three_r || "{}"),
    codes: JSON.parse(r.codes || "[]"),
    east_my: !!r.east_my,
  }));

  if (threeR === "true") {
    items = items.filter((m) => (m.three_r?.flags ?? []).length > 0);
  }

  return c.json({ items, count: items.length });
});

// Briefs / Holdings
app.post("/v1/workspaces/:ws/briefs", async (c) => {
  const ctx = requirePerm(c, "ws.brief.run");
  if (ctx instanceof Response) return ctx;

  const body = await c.req.json().catch(() => ({}));
  if (body.kind && body.kind !== "holding") {
    return c.json({ error: "only kind=holding implemented" }, 400);
  }

  const mentionIds: string[] = body.mention_ids ?? [];
  let mentions: any[] = [];

  if (mentionIds.length) {
    const placeholders = mentionIds.map(() => "?").join(",");
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM mentions WHERE id IN (${placeholders}) AND workspace_id = ? AND org_id = ?`
    )
      .bind(...mentionIds, ctx.workspace_id, ctx.org_id)
      .all();
    mentions = (results ?? []).map((r: any) => ({
      ...r,
      three_r: JSON.parse(r.three_r || "{}"),
    }));
  } else {
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM mentions WHERE workspace_id = ? AND org_id = ? LIMIT 5`
    )
      .bind(ctx.workspace_id, ctx.org_id)
      .all();
    mentions = (results ?? [])
      .map((r: any) => ({ ...r, three_r: JSON.parse(r.three_r || "{}") }))
      .filter((m) => (m.three_r?.flags ?? []).length > 0)
      .slice(0, 1);
  }

  const holding = draftHolding(mentions as any, {
    war_room_id: body.war_room_id,
    locale: body.locale,
    audience: body.audience,
    tabletop: body.tabletop,
  });

  await c.env.DB.prepare(
    `INSERT INTO holdings (id, org_id, workspace_id, war_room_id, status, locale, audience, facts_used, lines, do_not_say, ops, posture, model_version, prompt_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      holding.id,
      holding.org_id,
      holding.workspace_id,
      holding.war_room_id ?? null,
      holding.status,
      holding.locale,
      holding.audience,
      JSON.stringify(holding.facts_used),
      JSON.stringify(holding.lines),
      JSON.stringify(holding.do_not_say),
      JSON.stringify(holding.ops),
      holding.posture ?? null,
      holding.model_version ?? null,
      holding.prompt_hash ?? null
    )
    .run();

  return c.json(holding);
});

app.post("/v1/workspaces/:ws/holdings/:id/transition", async (c) => {
  const ctx = requirePerm(c, "ws.brief.run");
  if (ctx instanceof Response) return ctx;

  const body = await c.req.json().catch(() => ({}));
  const id = c.req.param("id");

  const row = await c.env.DB.prepare(
    `SELECT * FROM holdings WHERE id = ? AND workspace_id = ? AND org_id = ?`
  )
    .bind(id, ctx.workspace_id, ctx.org_id)
    .first();

  if (!row) return c.json({ error: "holding not found" }, 404);

  const current = {
    ...row,
    facts_used: JSON.parse((row as any).facts_used || "[]"),
    lines: JSON.parse((row as any).lines || "{}"),
    do_not_say: JSON.parse((row as any).do_not_say || "[]"),
    ops: JSON.parse((row as any).ops || "[]"),
  } as any;

  try {
    const next = transitionHolding(current, body.status);
    await c.env.DB.prepare(`UPDATE holdings SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(next.status, id)
      .run();
    return c.json(next);
  } catch (e: any) {
    return c.json({ error: e.message }, 422);
  }
});

// Evaluation (stub)
app.get("/v1/workspaces/:ws/evaluation", async (c) => {
  const ctx = requirePerm(c, "ws.evaluation.read");
  if (ctx instanceof Response) return ctx;

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM evaluation_snapshots WHERE workspace_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 1`
  )
    .bind(ctx.workspace_id, ctx.org_id)
    .all();

  return c.json({
    latest: results?.[0] ?? null,
    methodology: {
      ave: false,
      principles: "Barcelona Principles 4.0",
      codename: "berry-bison-yonder-cabin",
    },
  });
});

app.post("/v1/workspaces/:ws/evaluation/lock", async (c) => {
  const ctx = requirePerm(c, "ws.evaluation.lock");
  if (ctx instanceof Response) return ctx;

  const body = await c.req.json().catch(() => ({}));
  if (body.include_ave) {
    return c.json({ error: "AVE not allowed" }, 422);
  }

  const id = `snap_${crypto.randomUUID().slice(0, 12)}`;
  const methodology = {
    ave: false,
    principles: "Barcelona Principles 4.0",
    codename: "berry-bison-yonder-cabin",
    weights: { outputs: 0.15, outtakes: 0.25, outcomes: 0.35, impact: 0.25 },
  };

  await c.env.DB.prepare(
    `INSERT INTO evaluation_snapshots (id, org_id, workspace_id, title, methodology, contribution, moves)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      ctx.org_id,
      ctx.workspace_id,
      body.title ?? "Evaluation snapshot",
      JSON.stringify(methodology),
      JSON.stringify(body.contribution ?? {}),
      JSON.stringify(body.moves ?? [])
    )
    .run();

  return c.json({ id, locked: true, methodology });
});

// War rooms (minimal)
app.get("/v1/workspaces/:ws/war-rooms", async (c) => {
  const ctx = requirePerm(c, "ws.war_room");
  if (ctx instanceof Response) return ctx;

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM war_rooms WHERE workspace_id = ? AND org_id = ?`
  )
    .bind(ctx.workspace_id, ctx.org_id)
    .all();

  return c.json({ items: results ?? [] });
});

export default app;
