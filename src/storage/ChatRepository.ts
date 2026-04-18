import { getDb } from './db';

export interface Message {
  id: number;
  session: string;
  role: 'user' | 'ai';
  content: string;
  createdAt: number;
}

export async function insertMessage(
  session: string,
  role: 'user' | 'ai',
  content: string
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO messages (session, role, content) VALUES (?, ?, ?)',
    session, role, content
  );
  return result.lastInsertRowId;
}

export async function getMessages(session: string): Promise<Message[]> {
  const db = await getDb();
  return db.getAllAsync<Message>(
    'SELECT id, session, role, content, created_at as createdAt FROM messages WHERE session = ? ORDER BY created_at ASC',
    session
  );
}

export async function clearSession(session: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM messages WHERE session = ?', session);
}
