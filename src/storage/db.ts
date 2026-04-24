import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

// Promise lock — prevents concurrent callers from opening multiple connections
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((e) => {
      // Reset so the next call retries instead of hanging forever
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync('lumix.db');
  await database.execAsync('PRAGMA journal_mode = WAL;');
  await runMigrations(database);
  return database;
}

const MIGRATIONS = [
  require('./migrations/001_init.sql'),
  require('./migrations/002_memory.sql'),
  require('./migrations/003_memory_fts.sql'),
];

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  for (const asset of MIGRATIONS) {
    const [{ localUri }] = await Asset.loadAsync(asset);
    if (!localUri) continue;
    const sql = await FileSystem.readAsStringAsync(localUri);
    try {
      await database.execAsync(sql);
    } catch (e) {
      // Log but don't crash — a non-critical migration failure (e.g. FTS5)
      // shouldn't take down the entire DB connection.
      console.warn('[DB] Migration failed (non-fatal):', localUri, e);
    }
  }
}
