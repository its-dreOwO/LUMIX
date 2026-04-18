CREATE TABLE IF NOT EXISTS messages (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  session   TEXT    NOT NULL,
  role      TEXT    NOT NULL CHECK(role IN ('user','ai')),
  content   TEXT    NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL DEFAULT '',
  body       TEXT    NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  date       TEXT    NOT NULL, -- ISO date YYYY-MM-DD
  time       TEXT,             -- HH:MM or null (all-day)
  color      TEXT    NOT NULL DEFAULT 'cyan',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
