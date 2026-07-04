const pool = require('./db');

async function patchItems() {
  try {
    const query = `
      UPDATE ecogreen_sales_order_items oi
      SET item_name = (
        SELECT item_name 
        FROM item_master im 
        WHERE im.item_code = oi.itemcode
        LIMIT 1
      )
      WHERE oi.item_name IS NULL;
    `;
    const res = await pool.query(query);
    console.log('Fixed sales order items:', res.rowCount);
    
    const query2 = `
      UPDATE ecogreen_sales_invoice_items ii
      SET item_name = (
        SELECT item_name 
        FROM item_master im 
        WHERE im.item_code = ii.itemcode
        LIMIT 1
      )
      WHERE ii.item_name IS NULL;
    `;
    const res2 = await pool.query(query2);
    console.log('Fixed sales invoice items:', res2.rowCount);
  } catch(e) {
    console.error('Error patching:', e);
  } finally {
    pool.end();
  }
}
patchItems();
