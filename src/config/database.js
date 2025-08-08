// src/config/database.js
const { Pool } = require('pg');
const logger = require('../utils/logger');

// --- REAL DATABASE CREDENTIALS ---
const pool = new Pool({
  host: 'localhost',         // <-- UPDATE to your DB host if needed
  port: 5432,               // <-- UPDATE if your DB uses a different port
  database: 'clearhouse_crm',   // <-- updated to match your real database
  user: 'postgres',         // <-- UPDATE to your real DB user
  password: 'BalanceSheet', // <-- UPDATE to your real DB password
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
const connectDB = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connected successfully at:', result.rows[0].now);
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    throw error;
  }
};

// Query helper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error', { text, error: error.message });
    throw error;
  }
};

// Transaction helper
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = () => {
    client.release();
  };

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    logger.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  const removeTimeout = () => {
    clearTimeout(timeout);
  };

  return {
    query,
    release: () => {
      removeTimeout();
      release();
    },
    client,
  };
};

// Transaction wrapper
const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  query,
  getClient,
  transaction,
  connectDB,
  pool
};