-- Demo seed for Aurora / Jalur Kita workspace
INSERT OR IGNORE INTO organizations (id, slug, name, tier, status)
VALUES ('org_aurora', 'aurora', 'Aurora Holdings', 'group', 'active');

INSERT OR IGNORE INTO workspaces (id, org_id, slug, name)
VALUES ('ws_aurora', 'org_aurora', 'jalur-kita', 'Jalur Kita');

-- Sample mentions (3R + east_my examples)
INSERT OR IGNORE INTO mentions (id, org_id, workspace_id, published_at, platform, lang, text, excerpt, three_r, east_my)
VALUES
  ('mnt_demo1', 'org_aurora', 'ws_aurora', datetime('now', '-2 hours'), 'x', 'bm',
   'Kenapa kempen ni guna baris lama? #JalurKita', 'Kenapa kempen ni guna baris lama?',
   '{"flags":["race"],"severity":"medium","review":"pending"}', 0),
  ('mnt_demo2', 'org_aurora', 'ws_aurora', datetime('now', '-5 hours'), 'news', 'en',
   'Retail POS still showing withdrawn creative in Sabah stores.', 'Retail POS still showing withdrawn creative',
   '{"flags":[],"severity":"none","review":"clear"}', 1);
