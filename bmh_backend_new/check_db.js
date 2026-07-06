const pool = require('./db');
(async () => {
  try {
    const r = await pool.query(`
      SELECT ew.employee_id, ew.cash_in_hand, e.full_name
      FROM employee_wallets ew
      JOIN employees e ON ew.employee_id = e.id::text
      WHERE ew.cash_in_hand > 0
    `);
    console.log('Employees with cash_in_hand:', r.rows);

    const r2 = await pool.query(`
      SELECT mo.delivery_boy_id, mo.order_no, mo.amount, mo.pod_payment_mode, mo.status
      FROM manual_orders mo
      WHERE mo.status = 'Delivered' AND mo.payment_mode = 'POD'
      ORDER BY mo.id
    `);
    console.log('POD deliveries:', r2.rows);

    const r3 = await pool.query(`
      SELECT wt.employee_id, wt.type, wt.amount, wt.note, wt.payment_mode
      FROM wallet_transactions wt
      WHERE wt.type IN ('cash_collection', 'online_collection')
    `);
    console.log('Collection transactions:', r3.rows);

    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
