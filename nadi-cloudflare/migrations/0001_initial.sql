-- NADI D1 (SQLite) schema
-- Foreign keys are OFF by default in D1; enforce in application layer.
-- No AVE: methodology.ave must always be false.

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'desk',
  status TEXT NOT NULL DEFAULT 'trial',
  data_region TEXT DEFAULT 'ap-southeast-1',
  retention_days INTEGER DEFAULT 396,
  ave_enabled INTEGER NOT NULL DEFAULT 0 CHECK (ave_enabled = 0),
  settings TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT DEFAULT 'brand',
  status TEXT DEFAULT 'active',
  timezone TEXT DEFAULT 'Asia/Kuala_Lumpur',
  locale TEXT DEFAULT 'en',
  settings TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_workspaces_org ON workspaces(org_id);

CREATE TABLE IF NOT EXISTS mentions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  published_at TEXT NOT NULL,
  ingested_at TEXT DEFAULT (datetime('now')),
  platform TEXT NOT NULL,
  lang TEXT DEFAULT 'en',
  url TEXT,
  author_handle TEXT,
  author_name TEXT,
  text TEXT NOT NULL,
  excerpt TEXT,
  sentiment TEXT DEFAULT '{}',
  three_r TEXT DEFAULT '{}',
  east_my INTEGER DEFAULT 0,
  engagement TEXT DEFAULT '{}',
  codes TEXT DEFAULT '[]',
  peso TEXT DEFAULT 'earned',
  starred INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_mentions_ws_pub ON mentions(workspace_id, published_at DESC);
CREATE INDEX IF NOT EXISTS ix_mentions_org_ws ON mentions(org_id, workspace_id);

CREATE TABLE IF NOT EXISTS holdings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  war_room_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  locale TEXT DEFAULT 'bilingual',
  audience TEXT DEFAULT 'press',
  facts_used TEXT DEFAULT '[]',
  lines TEXT NOT NULL,
  do_not_say TEXT DEFAULT '[]',
  ops TEXT DEFAULT '[]',
  posture TEXT,
  model_version TEXT,
  prompt_hash TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_holdings_ws ON holdings(workspace_id, status);

CREATE TABLE IF NOT EXISTS evaluation_snapshots (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  schema_version TEXT DEFAULT '1.0.0',
  status TEXT DEFAULT 'locked',
  title TEXT NOT NULL,
  methodology TEXT NOT NULL,
  contribution TEXT,
  moves TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS ix_eval_ws ON evaluation_snapshots(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS war_rooms (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  summary TEXT,
  holdings TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_warrooms_ws ON war_rooms(workspace_id, status);
