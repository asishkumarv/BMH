const pool = require('./db');

async function createTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Stationary Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS stationary_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        stock INTEGER DEFAULT 0,
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Stationary Requests
    await client.query(`
      CREATE TABLE IF NOT EXISTS stationary_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending', -- pending, approved, partially_approved, rejected
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Stationary Request Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS stationary_request_items (
        id SERIAL PRIMARY KEY,
        request_id INTEGER REFERENCES stationary_requests(id) ON DELETE CASCADE,
        item_id INTEGER REFERENCES stationary_items(id) ON DELETE CASCADE,
        requested_qty INTEGER NOT NULL,
        approved_qty INTEGER DEFAULT 0
      )
    `);

    // Employee Wallets
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_wallets (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
        balance NUMERIC(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Wallet Transactions (Allowance Usage / Requests / Allocations)
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL, -- allocation_request, allocation_granted, usage
        amount NUMERIC(10, 2) NOT NULL,
        note TEXT,
        status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, completed
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('Tables created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

createTables();
