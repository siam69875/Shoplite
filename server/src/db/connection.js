import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../core/config.js';

const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));

let db = null;
let txDepth = 0;

// Bump whenever schema.sql changes in a way old databases cannot satisfy.
// v1: USD cents. v2: BDT whole Taka, sale prices, bKash payments. v3: ON_HOLD order status.
export const SCHEMA_VERSION = 3;

function removeDatabaseFiles(file) {
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(file + suffix, { force: true });
}

export function openDatabase(file = config.dbPath) {
  if (db) db.close();
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  db = new DatabaseSync(file);

  // An outdated demo database would return rows with missing fields (e.g. no price).
  // Recreate it instead; index.js reseeds an empty database.
  const hasTables = db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'").get().n > 0;
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (file !== ':memory:' && hasTables && version !== SCHEMA_VERSION) {
    console.warn(`Database schema v${version} is outdated (need v${SCHEMA_VERSION}). Recreating ${file} with demo data.`);
    db.close();
    removeDatabaseFiles(file);
    db = new DatabaseSync(file);
  }

  db.exec('PRAGMA foreign_keys = ON;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(fs.readFileSync(schemaPath, 'utf8'));
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  txDepth = 0;
  return db;
}

export function getDb() {
  return db ?? openDatabase();
}

export function one(sql, ...params) {
  return getDb().prepare(sql).get(...params);
}

export function many(sql, ...params) {
  return getDb().prepare(sql).all(...params);
}

export function run(sql, ...params) {
  const result = getDb().prepare(sql).run(...params);
  return { changes: Number(result.changes), lastId: Number(result.lastInsertRowid) };
}

// Re-entrant transaction: nested calls join the outermost transaction.
export function transaction(fn) {
  const database = getDb();
  if (txDepth > 0) {
    txDepth++;
    try {
      return fn();
    } finally {
      txDepth--;
    }
  }
  database.exec('BEGIN IMMEDIATE');
  txDepth = 1;
  try {
    const result = fn();
    database.exec('COMMIT');
    return result;
  } catch (err) {
    database.exec('ROLLBACK');
    throw err;
  } finally {
    txDepth = 0;
  }
}

export function nowIso() {
  return new Date().toISOString();
}
