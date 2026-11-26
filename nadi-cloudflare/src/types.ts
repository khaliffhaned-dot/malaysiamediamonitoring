import { z } from "zod";

export const OrgTier = z.enum(["desk", "group", "enterprise"]);
export const WorkspaceRole = z.enum(["ws_admin", "editor", "analyst", "viewer"]);
export const HoldingStatus = z.enum(["draft", "legal_review", "approved", "sent_external", "superseded"]);
export const Platform = z.enum(["x", "facebook", "instagram", "tiktok", "news", "telegram", "xiaohongshu", "other"]);
export const Lang = z.enum(["en", "bm", "zh-hant", "zh-hans", "ta", "mixed"]);

export const MentionSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  workspace_id: z.string(),
  published_at: z.string(),
  platform: Platform,
  lang: Lang,
  text: z.string(),
  excerpt: z.string().optional(),
  three_r: z.object({
    flags: z.array(z.enum(["race", "religion", "royalty"])).default([]),
    severity: z.string().default("none"),
    review: z.string().default("clear"),
  }).default({}),
  east_my: z.boolean().default(false),
  codes: z.array(z.string()).default([]),
});

export type Mention = z.infer<typeof MentionSchema>;

export const HoldingSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  workspace_id: z.string(),
  war_room_id: z.string().nullable().optional(),
  status: HoldingStatus,
  locale: z.string().default("bilingual"),
  audience: z.string().default("press"),
  facts_used: z.array(z.string()).default([]),
  lines: z.record(z.string()),
  do_not_say: z.array(z.string()).default([]),
  ops: z.array(z.record(z.any())).default([]),
  posture: z.string().optional(),
  model_version: z.string().optional(),
  prompt_hash: z.string().optional(),
});

export type Holding = z.infer<typeof HoldingSchema>;

export const MethodologySchema = z.object({
  framework: z.string().default("AMEC Integrated Evaluation Framework"),
  principles: z.string().default("Barcelona Principles 4.0"),
  codename: z.string().default("berry-bison-yonder-cabin"),
  ave: z.literal(false),
  ave_statement: z.string().default(
    "Invalid under Barcelona Principles 4.0 — NADI measures contribution, not advertising equivalents."
  ),
  weights: z.record(z.number()).default({
    outputs: 0.15,
    outtakes: 0.25,
    outcomes: 0.35,
    impact: 0.25,
  }),
});

export type Env = {
  DB: D1Database;
  // AI?: Ai; // Workers AI binding if used
  // KV?: KVNamespace;
};

export type Ctx = {
  role: z.infer<typeof WorkspaceRole>;
  org_id: string;
  workspace_id: string;
  user_id?: string;
};
