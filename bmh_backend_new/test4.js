const pool = require('./db');
Promise.all([
  pool.query('SELECT * FROM ecogreen_sales_orders LIMIT 1').catch(e => e.message),
  pool.query('SELECT * FROM ecogreen_sales_invoices LIMIT 1').catch(e => e.message),
  pool.query('SELECT * FROM manual_orders LIMIT 1').catch(e => e.message)
]).then(res => {
  console.log(res);
}).catch(console.error).finally(()=>process.exit());
