const pool = require('./db');
pool.query('UPDATE ecogreen_sales_orders SET status = $1 WHERE id = $2 RETURNING *', ['DELIVERED', 1])
  .then(res=>console.log("Success!"))
  .catch(e => console.error("Error:", e.message))
  .finally(() => process.exit());
