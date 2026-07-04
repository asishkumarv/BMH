const pool = require('./db');
pool.query('UPDATE ecogreen_sales_invoices SET bus_details = $1 WHERE id = $2 RETURNING *', [JSON.stringify({}), 1])
  .then(res=>console.log("Success!"))
  .catch(e => console.error("Error:", e.message))
  .finally(() => process.exit());
