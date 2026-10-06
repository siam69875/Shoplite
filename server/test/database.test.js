import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_VERSION, many, one, openDatabase } from '../src/db/connection.js';

describe('Database schema upgrades', () => {
  it('recreates an outdated database instead of serving rows with missing fields', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shoplite-'));
    const file = path.join(dir, 'old.db');
    const old = new DatabaseSync(file); // v1-style database: prices in cents, no version stamp
    old.exec('CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price_cents INTEGER);');
    old.exec("INSERT INTO products (name, price_cents) VALUES ('Coffee Mug', 1250);");
    old.close();

    openDatabase(file);
    assert.equal(one('PRAGMA user_version').user_version, SCHEMA_VERSION);
    const columns = many('PRAGMA table_info(products)').map((c) => c.name);
    assert.ok(columns.includes('price') && !columns.includes('price_cents'));
    assert.equal(one('SELECT COUNT(*) AS n FROM products').n, 0, 'old rows are gone; the server reseeds');

    openDatabase(':memory:');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
