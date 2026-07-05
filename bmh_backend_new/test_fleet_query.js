const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://bmh_user:StrivenestBMHPassword7869@187.127.166.240:5432/bmh_asish'
});

async function run() {
  try {
    const res = await pool.query(`
        SELECT id, full_name, email, mobile AS phone, location_lat, location_lng, created_at AS updated_at 
        FROM employees 
        WHERE department = 'Delivery' AND status = 'approved' AND id::text IN (SELECT employee_id::text FROM attendance WHERE date = CURRENT_DATE AND checkout_timestamp IS NULL)
      `);
    console.log(res.rows);
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    pool.end();
  }
}

run();
