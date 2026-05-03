'use strict';
// Postgres connection pool — PLGS policy registry backend
const { Pool } = require('pg');
const logger   = require('../utils/logger');

const pool = new Pool({
  host:                    process.env.PGHOST     || 'localhost',
  port:                    parseInt(process.env.PGPORT || '5432', 10),
  database:                process.env.PGDATABASE || 'coreidentity',
  user:                    process.env.PGUSER     || 'postgres',
  password:                process.env.PGPASSWORD || '',
  ssl:                     process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  max:                     10,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => logger.error('pg_pool_error', { error: err.message }));

module.exports = pool;
