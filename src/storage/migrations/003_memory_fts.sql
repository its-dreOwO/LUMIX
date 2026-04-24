-- FTS5 virtual table for full-text search over memory facts.
-- content=memories links it to the memories table (read-through on query).
-- Triggers keep the FTS index in sync with every INSERT / UPDATE / DELETE.

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  fact,
  content=memories,
  content_rowid=id
);

-- Rebuild FTS index from content table — idempotent, safe to re-run every migration pass
INSERT INTO memories_fts(memories_fts) VALUES('rebuild');

CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, fact) VALUES (new.id, new.fact);
END;

CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
  UPDATE memories_fts SET fact = new.fact WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
  DELETE FROM memories_fts WHERE rowid = old.id;
END;
