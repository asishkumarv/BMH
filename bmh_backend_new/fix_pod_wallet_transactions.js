const pool = require('./db');
(async () => {
  try {
    // Find all delivered POD manual orders that don't have a wallet transaction log
    const orders = await pool.query(`
      SELECT mo.id, mo.order_no, mo.delivery_boy_id, mo.amount, mo.pod_payment_mode
      FROM manual_orders mo
      WHERE mo.status = 'Delivered'
        AND mo.payment_mode = 'POD'
        AND mo.delivery_boy_id IS NOT NULL
        AND mo.pod_payment_mode IN ('Cash', 'Online')
        AND NOT EXISTS (
          SELECT 1 FROM wallet_transactions wt
          WHERE wt.employee_id = mo.delivery_boy_id::text
            AND wt.note LIKE '%' || COALESCE(mo.order_no, mo.id::text) || '%'
            AND wt.type IN ('cash_collection', 'online_collection')
        )
      LIMIT 200
    `);
    console.log('Orders needing wallet transaction fix:', orders.rows.length);
    for (const order of orders.rows) {
      const type = order.pod_payment_mode === 'Cash' ? 'cash_collection' : 'online_collection';
      const pm = order.pod_payment_mode;
      const note = `Order ${order.order_no || order.id} Delivered (POD ${pm})`;
      await pool.query(
        'INSERT INTO wallet_transactions (employee_id, type, amount, note, status, payment_mode) VALUES ($1, $2, $3, $4, $5, $6)',
        [order.delivery_boy_id, type, order.amount || 0, note, 'completed', pm]
      );
      console.log(`Created ${type} record for order ${order.order_no || order.id}`);
    }
    console.log('Recovery complete!');
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message, e.stack);
    process.exit(1);
  }
})();
