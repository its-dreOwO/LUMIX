import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('lumix.db');
  await runMigrations(db);
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Load all numbered migration files in order.
  // Add new migrations by creating 002_xxx.sql, 003_xxx.sql etc.
  const migrations = [
    require('./migrations/001_init.sql'),
  ];

  await database.execAsync('PRAGMA journal_mode = WAL;');

  for (const asset of migrations) {
    const [{ localUri }] = await Asset.loadAsync(asset);
    if (!localUri) continue;
    const sql = await FileSystem.readAsStringAsync(localUri);
    await database.execAsync(sql);
  }
}
