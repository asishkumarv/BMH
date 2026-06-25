const pool = require('./db');

async function syncCash() {
  try {
    const res = await pool.query(`
      SELECT pb.booked_by, SUM(ds.fee) as total_cash
      FROM patient_bookings pb
      JOIN doctor_slots ds ON pb.slot_id = ds.id
      WHERE pb.payment_mode = 'Cash' AND pb.booked_by IS NOT NULL
      GROUP BY pb.booked_by
    `);
    
    for (let row of res.rows) {
      const wCheck = await pool.query('SELECT * FROM employee_wallets WHERE employee_id = $1', [row.booked_by.toString()]);
      if (wCheck.rowCount === 0) {
        await pool.query('INSERT INTO employee_wallets (employee_id, cash_in_hand, balance) VALUES ($1, $2, 0)', [row.booked_by.toString(), row.total_cash]);
      } else {
        await pool.query('UPDATE employee_wallets SET cash_in_hand = $1 WHERE employee_id = $2', [row.total_cash, row.booked_by.toString()]);
      }
    }
    console.log("Synced cash_in_hand successfully!");
  } catch (error) {
    console.error("Error syncing cash:", error);
  } finally {
    pool.end();
  }
}

syncCash();
