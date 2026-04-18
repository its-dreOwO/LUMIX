import { getDb } from './db';

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;   // YYYY-MM-DD
  time: string | null;
  color: 'cyan' | 'violet' | 'silver';
  createdAt: number;
}

export async function getEvents(date?: string): Promise<CalendarEvent[]> {
  const db = await getDb();
  if (date) {
    return db.getAllAsync<CalendarEvent>(
      'SELECT id, title, date, time, color, created_at as createdAt FROM events WHERE date = ? ORDER BY time ASC',
      date
    );
  }
  return db.getAllAsync<CalendarEvent>(
    'SELECT id, title, date, time, color, created_at as createdAt FROM events ORDER BY date ASC, time ASC'
  );
}

export async function insertEvent(
  title: string,
  date: string,
  time: string | null,
  color: CalendarEvent['color'] = 'cyan'
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO events (title, date, time, color) VALUES (?, ?, ?, ?)',
    title, date, time, color
  );
  return result.lastInsertRowId;
}

export async function deleteEvent(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM events WHERE id = ?', id);
}
