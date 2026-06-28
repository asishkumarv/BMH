const fs = require('fs');
const pool = require('./db');
const path = require('path');

async function runInit() {
  const sql = fs.readFileSync(path.join(__dirname, 'init_ecogreen.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('init_ecogreen.sql executed successfully.');
  } catch (err) {
    console.error('Error executing init_ecogreen.sql:', err);
  } finally {
    pool.end();
  }
}

runInit();
