const pool = require('./db');

async function fixDB() {
  try {
    console.log('Updating employee_leave_settings table constraints...');
    
    // Drop the old constraint that only checks employee_id
    await pool.query('ALTER TABLE employee_leave_settings DROP CONSTRAINT IF EXISTS employee_leave_settings_employee_id_key;');
    
    // Add the new constraint that checks BOTH employee_id and user_type
    await pool.query('ALTER TABLE employee_leave_settings ADD CONSTRAINT employee_leave_settings_employee_id_usertype_key UNIQUE (employee_id, user_type);');
    
    console.log('Database updated successfully! You can now deploy the backend.');
  } catch (err) {
    console.error('Error updating DB:', err);
  } finally {
    process.exit(0);
  }
}

fixDB();
