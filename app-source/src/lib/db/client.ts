import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Note: deliberately no `import 'server-only'` here — the CLI scripts in
// scripts/ import this module outside the Next bundler. Importing
// better-sqlite3 already breaks any client bundle loudly, and every consumer
// inside the app is a server module.
export type DB = Database.Database;

const DATA_DIR = process.env.LM_DATA_DIR ?? path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'live-miracle.db');
const MIGRATIONS_DIR = path.join(process.cwd(), 'src/lib/db/migrations');

/**
 * Next's dev server re-evaluates modules on HMR. Caching the handle on
 * globalThis keeps a single connection (and a single WAL writer) per process.
 */
const globalForDb = globalThis as unknown as { __lmDb?: DB };

function configure(db: DB) {
  // WAL gives concurrent readers alongside the single writer.
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
}

/**
 * Applies any migration files not yet recorded, each inside a transaction so a
 * failed migration leaves no partial schema behind.
 */
export function migrate(db: DB): string[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map((r) => (r as { name: string }).name),
  );

  if (!existsSync(MIGRATIONS_DIR)) return [];

  const pending = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .filter((f) => !applied.has(f));

  const run: string[] = [];
  for (const file of pending) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    // better-sqlite3 cannot run PRAGMA foreign_keys inside a transaction, and
    // exec() of a multi-statement script is already atomic per statement, so we
    // wrap explicitly and let a throw roll the whole file back.
    const tx = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(
        file,
        Math.floor(Date.now() / 1000),
      );
    });
    tx();
    run.push(file);
  }
  return run;
}

export function getDb(): DB {
  if (globalForDb.__lmDb) return globalForDb.__lmDb;

  mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  configure(db);
  migrate(db);

  globalForDb.__lmDb = db;
  return db;
}

/** Opens the database without the module-level cache — for CLI scripts. */
export function openDb(): DB {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  configure(db);
  return db;
}

export const now = (): number => Math.floor(Date.now() / 1000);

/** Parses a JSON column, returning the fallback rather than throwing. */
export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
