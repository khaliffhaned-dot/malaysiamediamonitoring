import { Context, Next } from "hono";
import { Ctx, WorkspaceRole } from "./types";

const DEMO_ORG = "org_aurora";
const DEMO_WS = "ws_aurora";

// Demo auth: X-Nadi-Role header. Production: Cloudflare Access or JWT.
export async function authMiddleware(c: Context, next: Next) {
  const roleHeader = c.req.header("X-Nadi-Role") ?? "viewer";
  const role = WorkspaceRole.safeParse(roleHeader);
  if (!role.success) {
    return c.json({ error: "invalid role" }, 400);
  }

  const wsId = c.req.param("ws") ?? c.req.param("ws_id") ?? DEMO_WS;

  // In real app: resolve org from membership table. Demo hardcodes.
  const ctx: Ctx = {
    role: role.data,
    org_id: DEMO_ORG,
    workspace_id: wsId,
  };

  c.set("ctx", ctx);
  await next();
}

export function requirePerm(c: Context, perm: string): Ctx | Response {
  const ctx = c.get("ctx") as Ctx;
  // Minimal matrix for demo. Expand from original rbac.py.
  const allowed: Record<string, string[]> = {
    "ws.mentions.read": ["ws_admin", "editor", "analyst", "viewer"],
    "ws.mentions.code": ["ws_admin", "editor", "analyst"],
    "ws.brief.run": ["ws_admin", "editor"],
    "ws.evaluation.read": ["ws_admin", "editor", "analyst", "viewer"],
    "ws.evaluation.lock": ["ws_admin", "editor"],
    "ws.war_room": ["ws_admin", "editor", "analyst"],
    "ws.reports.run": ["ws_admin", "editor", "analyst"],
  };
  const roles = allowed[perm] ?? [];
  if (!roles.includes(ctx.role)) {
    return c.json({ error: "forbidden", perm }, 403);
  }
  return ctx;
}
