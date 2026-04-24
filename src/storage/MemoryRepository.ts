import { getDb } from './db';

export interface MemoryFact {
  id: number;
  fact: string;
  created_at: number;
  updated_at: number;
}

async function ensureTableExists() {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS memories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      fact       TEXT    NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
}

/** Insert a new fact. Returns the new row id, or undefined if it was an exact duplicate. */
export async function insertMemory(fact: string): Promise<number | undefined> {
  await ensureTableExists();
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO memories (fact) VALUES (?)`,
    [fact]
  );
  return result.lastInsertRowId || undefined;
}

/** Update an existing fact in-place (also bumps updated_at). */
export async function updateMemory(id: number, newFact: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE memories SET fact = ?, updated_at = unixepoch() WHERE id = ?`,
    [newFact, id]
  );
}

/** Delete a single fact by id. */
export async function deleteMemory(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM memories WHERE id = ?`, [id]);
}

/**
 * FTS5 full-text search over memory facts.
 * Returns facts ranked by relevance to the query (best match first).
 */
export async function searchMemoriesFTS(query: string, limit: number): Promise<MemoryFact[]> {
  const db = await getDb();
  // Sanitise query: strip FTS5 special chars to prevent syntax errors
  const safe = query.replace(/['"*()]/g, ' ').trim();
  if (!safe) return [];
  try {
    return db.getAllAsync<MemoryFact>(
      `SELECT m.id, m.fact, m.created_at, m.updated_at
       FROM memories_fts f
       JOIN memories m ON m.id = f.rowid
       WHERE memories_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
      [safe, limit]
    );
  } catch {
    // FTS syntax error fallback — return empty so caller falls back to recency
    return [];
  }
}

/** Fetch the N most recently added/updated facts (recency fallback). */
export async function getMemories(limit: number): Promise<MemoryFact[]> {
  await ensureTableExists();
  const db = await getDb();
  return db.getAllAsync<MemoryFact>(
    `SELECT * FROM memories ORDER BY updated_at DESC LIMIT ?`,
    [limit]
  );
}

/** Fetch all facts (for the cleanup UI). */
export async function getAllMemories(): Promise<MemoryFact[]> {
  await ensureTableExists();
  const db = await getDb();
  return db.getAllAsync<MemoryFact>(
    `SELECT * FROM memories ORDER BY updated_at DESC`
  );
}

/** Clear all facts (debug / full reset). */
export async function clearMemories(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM memories`);
}
