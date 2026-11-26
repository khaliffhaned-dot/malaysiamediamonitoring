import { Holding, Mention } from "../types";

const AVE_RE = /ave|emv|advertising\s*value|media\s*value|pr\s*value/i;

export function rejectIfAve(payload: Record<string, any>) {
  if (payload.include_ave || payload.publish === true || payload.media_value) {
    throw new Error("AVE / auto-publish not allowed under Barcelona Principles 4.0");
  }
}

export function draftHolding(mentions: Mention[], opts: {
  war_room_id?: string | null;
  locale?: string;
  audience?: string;
  tabletop?: boolean;
}): Holding {
  rejectIfAve({});

  const facts = mentions.map((m) => m.id);
  const flags = [...new Set(mentions.flatMap((m) => m.three_r.flags))];

  let en = "We are aware of circulating materials related to a prior creative line. Owned channels no longer use that line. We are completing a retail and residual-asset sweep and will apply a one-line superseded notice where needed. Current campaign creative does not use the withdrawn line.";
  let bm = "Kami sedar tentang bahan yang masih beredar berkaitan baris kreatif lama. Saluran rasmi tidak lagi menggunakan baris itu. Sapuan runcit dan aset sisa sedang diselesaikan, dengan notis satu baris 'telah diganti' jika perlu. Kreatif kempen semasa tidak menggunakan baris yang telah ditarik balik.";

  if (opts.tabletop) {
    en = `[TABLETOP — DO NOT SEND] ${en}`;
    bm = `[TABLETOP — JANGAN HANTAR] ${bm}`;
  }

  if (AVE_RE.test(en) || AVE_RE.test(bm)) {
    throw new Error("holding body failed AVE guard");
  }

  const id = `hld_${crypto.randomUUID().slice(0, 12)}`;

  return {
    id,
    org_id: mentions[0]?.org_id ?? "org_aurora",
    workspace_id: mentions[0]?.workspace_id ?? "ws_aurora",
    war_room_id: opts.war_room_id ?? null,
    status: "draft",
    locale: opts.locale ?? "bilingual",
    audience: opts.audience ?? "press",
    facts_used: facts,
    lines: { en, bm },
    do_not_say: [
      "That the line was directed by any authority",
      "Any AVE or circulation value",
      "A second public apology unless new facts require it",
    ],
    ops: [
      { action: "Complete residual asset / POS sweep", owner_role: "editor", sla_hours: 48 },
      { action: "Legal/comms review of 3R posture before any external line", owner_role: "ws_admin", sla_hours: 12 },
    ],
    posture: "self_regulated_not_directed",
    model_version: "nadi-brief-2026-11",
    prompt_hash: `sha256:${crypto.randomUUID().slice(0, 8)}`,
  };
}

const TRANSITIONS: Record<string, string[]> = {
  draft: ["legal_review", "approved", "superseded"],
  legal_review: ["approved", "draft", "superseded"],
  approved: ["sent_external", "superseded"],
  sent_external: ["superseded"],
  superseded: [],
};

export function transitionHolding(h: Holding, next: string): Holding {
  const allowed = TRANSITIONS[h.status] ?? [];
  if (!allowed.includes(next)) {
    throw new Error(`cannot transition ${h.status} -> ${next}`);
  }
  return { ...h, status: next as any };
}
