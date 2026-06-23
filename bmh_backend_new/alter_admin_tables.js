require('dotenv').config();
const pool = require('./db');

async function alterAdminTables() {
  try {
    await pool.query(`
      ALTER TABLE department_admins ADD COLUMN IF NOT EXISTS profile_data TEXT;
      ALTER TABLE super_admins ADD COLUMN IF NOT EXISTS profile_data TEXT;
    `);

    console.log('Successfully added profile_data to department_admins and super_admins tables.');
  } catch (error) {
    console.error('Error altering tables:', error);
  } finally {
    pool.end();
  }
}

alterAdminTables();
