/**
 * NotesService — On-device note storage using expo-sqlite.
 * No native rebuild required. Works with a JS hot-reload.
 */

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('nexus_notes.db');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }
  return db;
}

export interface Note {
  id: number;
  title: string;
  body: string;
  created_at: string;
}

export async function createNote(title: string, body: string): Promise<string> {
  try {
    const database = await getDb();
    const now = new Date().toISOString();
    await database.runAsync(
      'INSERT INTO notes (title, body, created_at) VALUES (?, ?, ?)',
      [title, body, now]
    );
    return `Note created successfully: "${title}"`;
  } catch (e: any) {
    return `Failed to create note: ${e.message}`;
  }
}

export async function listNotes(): Promise<string> {
  try {
    const database = await getDb();
    const notes = await database.getAllAsync<Note>(
      'SELECT * FROM notes ORDER BY created_at DESC LIMIT 20'
    );
    if (notes.length === 0) {
      return 'No notes saved yet.';
    }
    const formatted = notes
      .map((n) => `[${n.id}] ${n.title} (${n.created_at.slice(0, 10)}): ${n.body}`)
      .join('\n');
    return `Saved Notes:\n${formatted}`;
  } catch (e: any) {
    return `Failed to list notes: ${e.message}`;
  }
}

export async function deleteNote(id: number): Promise<string> {
  try {
    const database = await getDb();
    await database.runAsync('DELETE FROM notes WHERE id = ?', [id]);
    return `Note #${id} deleted.`;
  } catch (e: any) {
    return `Failed to delete note: ${e.message}`;
  }
}
