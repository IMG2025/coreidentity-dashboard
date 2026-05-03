'use strict';
// Inline migration runner — scans src/db/migrations/*.sql, applies in order.
// Idempotent: tracks applied files in schema_migrations table.
const fs     = require('fs');
const path   = require('path');
const pool   = require('./pool');
const logger = require('../utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations() {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    logger.warn('plgs_migration_skipped_no_db', { error: err.message });
    return;
  }
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
      if (rows.length > 0) { logger.info('migration_already_applied', { file }); continue; }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info('migration_applied', { file });
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error('migration_failed', { file, error: err.message });
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
