const pool = require('./db');

async function fixDB() {
  try {
    console.log('Dropping constraint payslips_employee_month_usertype_key (if exists)...');
    await pool.query('ALTER TABLE payslips DROP CONSTRAINT IF EXISTS payslips_employee_month_usertype_key;');
    console.log('Restoring old constraint payslips_employee_id_month_key...');
    await pool.query('ALTER TABLE payslips ADD CONSTRAINT payslips_employee_id_month_key UNIQUE (employee_id, month);');
    console.log('Database restored successfully!');
  } catch (err) {
    console.error('Error fixing DB:', err);
  } finally {
    process.exit(0);
  }
}

fixDB();
