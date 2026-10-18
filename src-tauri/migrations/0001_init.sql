-- Estheros initial schema.
-- Domain dates are local (YYYY-MM-DD / YYYY-MM-DDTHH:mm:ss); audit timestamps are UTC ISO 8601 with Z.
-- Positional parameters only (`?`) so the same SQL runs on the Tauri plugin and on better-sqlite3.

CREATE TABLE IF NOT EXISTS tag (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL COLLATE NOCASE UNIQUE,
  color      TEXT
);

-- Calendar ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS event (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT,
  all_day          INTEGER NOT NULL DEFAULT 1 CHECK (all_day IN (0, 1)),
  date             TEXT,
  start_at         TEXT,
  end_at           TEXT,
  tz               TEXT,
  color            TEXT,
  recurrence       TEXT NOT NULL DEFAULT 'none'
                   CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  recurrence_until TEXT,
  location         TEXT,
  is_past_log      INTEGER NOT NULL DEFAULT 0 CHECK (is_past_log IN (0, 1)),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_date ON event (date);
CREATE INDEX IF NOT EXISTS idx_event_start_at ON event (start_at);

CREATE TABLE IF NOT EXISTS event_tag (
  event_id TEXT NOT NULL REFERENCES event (id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tag (id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, tag_id)
);

-- Journal -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS journal_entry (
  id           TEXT PRIMARY KEY,
  date         TEXT NOT NULL,
  title        TEXT,
  content_json TEXT NOT NULL,
  content_text TEXT NOT NULL,
  mood         TEXT CHECK (mood IS NULL OR mood IN ('great', 'good', 'okay', 'low', 'bad')),
  is_favorite  INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_journal_entry_date ON journal_entry (date);

CREATE TABLE IF NOT EXISTS journal_tag (
  entry_id TEXT NOT NULL REFERENCES journal_entry (id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tag (id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

-- To-do ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS todo_list (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL COLLATE NOCASE UNIQUE,
  color       TEXT,
  icon        TEXT,
  sort_order  INTEGER NOT NULL,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task (
  id           TEXT PRIMARY KEY,
  list_id      TEXT NOT NULL REFERENCES todo_list (id),
  parent_id    TEXT REFERENCES task (id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  notes        TEXT,
  due_date     TEXT,
  due_time     TEXT CHECK (due_time IS NULL OR due_date IS NOT NULL),
  priority     TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high')),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  sort_order   INTEGER NOT NULL,
  completed_at TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_list_status ON task (list_id, status);
CREATE INDEX IF NOT EXISTS idx_task_due_date ON task (due_date);
CREATE INDEX IF NOT EXISTS idx_task_parent_id ON task (parent_id);

CREATE TABLE IF NOT EXISTS task_tag (
  task_id TEXT NOT NULL REFERENCES task (id) ON DELETE CASCADE,
  tag_id  TEXT NOT NULL REFERENCES tag (id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Settings ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS setting (
  key        TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

-- Seed ----------------------------------------------------------------------

INSERT OR IGNORE INTO todo_list (id, name, color, icon, sort_order, is_archived, created_at, updated_at)
VALUES ('inbox', 'Inbox', NULL, 'inbox', 0, 0,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

INSERT OR IGNORE INTO setting (key, value_json) VALUES
  ('theme', '"pink"'),
  ('week_starts_on', '1'),
  ('time_format', '"24h"'),
  ('default_calendar_view', '"month"'),
  ('sidebar_collapsed', 'false'),
  ('user_name', '""'),
  ('onboarding_done', 'false'),
  ('keybindings', '{}'),
  ('font_scale', '1'),
  ('reduce_motion', 'false');
