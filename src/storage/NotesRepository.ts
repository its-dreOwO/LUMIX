import { getDb } from './db';

export interface Note {
  id: number;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export async function getNotes(): Promise<Note[]> {
  const db = await getDb();
  return db.getAllAsync<Note>(
    'SELECT id, title, body, created_at as createdAt, updated_at as updatedAt FROM notes ORDER BY updated_at DESC'
  );
}

export async function insertNote(title: string, body: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO notes (title, body) VALUES (?, ?)',
    title, body
  );
  return result.lastInsertRowId;
}

export async function updateNote(id: number, title: string, body: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE notes SET title = ?, body = ?, updated_at = unixepoch() WHERE id = ?',
    title, body, id
  );
}

export async function deleteNote(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM notes WHERE id = ?', id);
}
