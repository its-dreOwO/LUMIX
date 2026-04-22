import { getDb } from './db';

export interface MemoryFact {
  id: number;
  fact: string;
  created_at: number;
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

/**
 * Inserts a new fact into the memory pool.
 * Uses INSERT OR IGNORE to prevent exact duplicate facts.
 */
export async function insertMemory(fact: string): Promise<number | undefined> {
  await ensureTableExists();
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO memories (fact) VALUES (?)`,
    [fact]
  );
  return result.lastInsertRowId;
}

/**
 * Fetches recent memories from the pool up to a specified limit.
 */
export async function getMemories(limit: number): Promise<MemoryFact[]> {
  await ensureTableExists();
  const db = await getDb();
  return db.getAllAsync<MemoryFact>(
    `SELECT * FROM memories ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}

/**
 * Clears all facts from the memory pool (for debugging or user reset).
 */
export async function clearMemories(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM memories`);
}
