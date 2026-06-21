import initSqlJs, { type Database as SqlJsDb, type SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';

interface Statement {
  run(params?: unknown[] | Record<string, unknown>): { changes: number; lastInsertRowid: number | bigint };
  get(params?: unknown[] | Record<string, unknown>): unknown;
  all(params?: unknown[] | Record<string, unknown>): unknown[];
}

interface Database {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  pragma(sql: string): unknown;
  close(): void;
  export(): Uint8Array;
}

let _Sql: SqlJsStatic | null = null;
let db: Database | null = null;
let _overrideDb: Database | null = null;

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'wedding.db');

async function getSql(): Promise<SqlJsStatic> {
  if (_Sql) return _Sql;
  const wasmPath = path.resolve(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  const wasmBuffer = fs.existsSync(wasmPath) ? fs.readFileSync(wasmPath) : undefined;
  _Sql = await initSqlJs({
    locateFile: (file: string) => path.resolve(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    ...(wasmBuffer ? { wasmBinary: wasmBuffer } : {})
  });
  return _Sql;
}

function wrap(sqlJsDb: SqlJsDb, saveFn?: () => void): Database {
  function normalizeParams(p: unknown[] | Record<string, unknown> | undefined): unknown[] | Record<string, unknown> {
    if (p === undefined || p === null) return [];
    if (Array.isArray(p)) return p;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(p)) {
      out[`$${k}`] = v;
    }
    return out;
  }

  return {
    prepare(sql: string): Statement {
      return {
        run(params): { changes: number; lastInsertRowid: number | bigint } {
          const ps = sqlJsDb.prepare(sql);
          try {
            ps.run(normalizeParams(params) as any);
            const changes = sqlJsDb.getRowsModified();
            const lastIdRow = sqlJsDb.exec('SELECT last_insert_rowid() as id')[0];
            const lastId = lastIdRow ? (lastIdRow.values[0][0] as number) : 0;
            saveFn?.();
            return { changes, lastInsertRowid: lastId };
          } finally {
            ps.free();
          }
        },
        get(params): unknown {
          const ps = sqlJsDb.prepare(sql);
          try {
            ps.bind(normalizeParams(params) as any);
            if (!ps.step()) return undefined;
            return ps.getAsObject() as unknown;
          } finally {
            ps.free();
          }
        },
        all(params): unknown[] {
          const ps = sqlJsDb.prepare(sql);
          try {
            ps.bind(normalizeParams(params) as any);
            const results: unknown[] = [];
            while (ps.step()) {
              results.push(ps.getAsObject());
            }
            return results;
          } finally {
            ps.free();
          }
        }
      };
    },
    exec(sql: string) {
      sqlJsDb.exec(sql);
      saveFn?.();
    },
    pragma(sql: string): unknown {
      const lower = sql.toLowerCase().trim();
      if (lower.startsWith('journal_mode')) {
        return undefined;
      }
      if (lower.startsWith('foreign_keys')) {
        const match = sql.match(/=\s*(\w+)/);
        if (match) {
          const v = match[1] === 'ON' || match[1] === '1' ? 1 : 0;
          sqlJsDb.run(`PRAGMA foreign_keys = ${v}`);
        }
        return [{ foreign_keys: sqlJsDb.exec('PRAGMA foreign_keys')[0]?.values[0][0] }] as any;
      }
      const results = sqlJsDb.exec(`PRAGMA ${sql}`);
      return results;
    },
    close() {
      sqlJsDb.close();
    },
    export() {
      return sqlJsDb.export();
    }
  };
}

export async function getDb(): Promise<Database> {
  if (_overrideDb) return _overrideDb;
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const isNewDb = !fs.existsSync(DB_PATH);
  const SQL = await getSql();
  let sqlJsDb: SqlJsDb;

  if (isNewDb) {
    sqlJsDb = new SQL.Database();
  } else {
    const buffer = fs.readFileSync(DB_PATH);
    sqlJsDb = new SQL.Database(buffer);
  }

  const save = () => {
    try {
      const data = sqlJsDb.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) {
      console.error('Failed to persist DB:', e);
    }
  };

  db = wrap(sqlJsDb, save);
  db.pragma('foreign_keys = ON');

  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'server', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at: ${schemaPath}`);
  }
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  if (isNewDb) save();

  return db;
}

export function setTestDb(testDb: Database | null) {
  _overrideDb = testDb;
}

export async function getDbForTest(): Promise<Database> {
  const SQL = await getSql();
  const sqlJsDb = new SQL.Database();
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'server', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema not found at ${schemaPath}`);
  }
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const testDb = wrap(sqlJsDb);
  testDb.pragma('foreign_keys = ON');
  testDb.exec(schema);
  return testDb;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
