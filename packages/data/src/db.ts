import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

let _sqlite: InstanceType<typeof Database> | null = null;
let _dbPath: string = ':memory:';

export function getDb(dbPath?: string) {
  if (dbPath !== undefined) {
    _dbPath = dbPath;
  }
  if (!_sqlite) {
    _sqlite = new Database(_dbPath);
    _sqlite.pragma('journal_mode = WAL');
    _sqlite.pragma('foreign_keys = ON');
  }
  return drizzle(_sqlite, { schema });
}

export function getRawDb(): InstanceType<typeof Database> {
  if (!_sqlite) {
    getDb();
  }
  return _sqlite!;
}

export function resetDb() {
  if (_sqlite) {
    _sqlite.close();
  }
  _sqlite = null;
}

export { schema };
