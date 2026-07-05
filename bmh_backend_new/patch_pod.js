const fs = require('fs');

function patchManualOrderController() {
  const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/manualOrderController.js';
  let content = fs.readFileSync(file, 'utf8');
  
  // Extract pod_payment_mode from req.body
  content = content.replace(/new_note, note_author, delivery_otp, address/, 'new_note, note_author, delivery_otp, address, pod_payment_mode');
  
  // Add to updateFields
  content = content.replace(/addField\('address', address\);/, `addField('address', address);\n    addField('pod_payment_mode', pod_payment_mode);`);

  // After the updateQuery succeeds, add to wallet
  const successBlock = `res.json({ success: true, data: result.rows[0] });`;
  
  const walletLogic = `
    const updatedOrder = result.rows[0];
    
    // Wallet update logic for POD Cash Orders
    if (updatedOrder.status === 'Delivered' && updatedOrder.payment_mode === 'POD' && updatedOrder.delivery_boy_id) {
      if (updatedOrder.pod_payment_mode === 'Cash') {
        const amt = updatedOrder.amount || 0;
        await pool.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand + $1 WHERE employee_id = $2', [amt, updatedOrder.delivery_boy_id]);
        
        // Optionally add a transaction
        await pool.query('INSERT INTO wallet_transactions (employee_id, type, amount, note, status, payment_mode) VALUES ($1, $2, $3, $4, $5, $6)', 
          [updatedOrder.delivery_boy_id, 'cash_collection', amt, \`Order \${updatedOrder.order_no} Delivered (POD Cash)\`, 'completed', 'Cash']);
      } else if (updatedOrder.pod_payment_mode === 'Online') {
        const amt = updatedOrder.amount || 0;
        await pool.query('UPDATE employee_wallets SET online_collected = online_collected + $1 WHERE employee_id = $2', [amt, updatedOrder.delivery_boy_id]);
        
        await pool.query('INSERT INTO wallet_transactions (employee_id, type, amount, note, status, payment_mode) VALUES ($1, $2, $3, $4, $5, $6)', 
          [updatedOrder.delivery_boy_id, 'online_collection', amt, \`Order \${updatedOrder.order_no} Delivered (POD Online)\`, 'completed', 'Online']);
      }
    }
    
    res.json({ success: true, data: updatedOrder });`;

  content = content.replace(successBlock, walletLogic);
  fs.writeFileSync(file, content, 'utf8');
  console.log('manualOrderController patched.');
}

function patchOnlineOrderController() {
  const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/onlineOrderController.js';
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/const \{ status, delivery_otp \} = req.body;/, 'const { status, delivery_otp, pod_payment_mode } = req.body;');
  
  // The onlineOrderController just does an UPDATE online_orders SET status ... Let's find it.
  const updateQuery = `const query = 'UPDATE online_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';`;
  const replacement = `let query = 'UPDATE online_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
          let params = [status, id];
          if (pod_payment_mode) {
              query = 'UPDATE online_orders SET status = $1, pod_payment_mode = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *';
              params = [status, pod_payment_mode, id];
          }`;
          
  content = content.replace(updateQuery, replacement);
  content = content.replace(/const result = await pool.query\(query, \[status, id\]\);/, 'const result = await pool.query(query, params);');

  const successBlock = `res.json({\n              success: true,\n              data: result.rows[0],\n              message: 'Order status updated successfully'\n          });`;
  
  const walletLogic = `
          const updatedOrder = result.rows[0];
          
          if (updatedOrder.status === 'DELIVERED' && updatedOrder.payment_mode === 'POD' && updatedOrder.delivery_boy_id) {
              if (updatedOrder.pod_payment_mode === 'Cash') {
                  const amt = updatedOrder.total_amount || 0;
                  await pool.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand + $1 WHERE employee_id = $2', [amt, updatedOrder.delivery_boy_id]);
                  
                  await pool.query('INSERT INTO wallet_transactions (employee_id, type, amount, note, status, payment_mode) VALUES ($1, $2, $3, $4, $5, $6)', 
                      [updatedOrder.delivery_boy_id, 'cash_collection', amt, \`Order \${updatedOrder.order_id} Delivered (POD Cash)\`, 'completed', 'Cash']);
              } else if (updatedOrder.pod_payment_mode === 'Online') {
                  const amt = updatedOrder.total_amount || 0;
                  await pool.query('UPDATE employee_wallets SET online_collected = online_collected + $1 WHERE employee_id = $2', [amt, updatedOrder.delivery_boy_id]);
                  
                  await pool.query('INSERT INTO wallet_transactions (employee_id, type, amount, note, status, payment_mode) VALUES ($1, $2, $3, $4, $5, $6)', 
                      [updatedOrder.delivery_boy_id, 'online_collection', amt, \`Order \${updatedOrder.order_id} Delivered (POD Online)\`, 'completed', 'Online']);
              }
          }
          
          res.json({
              success: true,
              data: updatedOrder,
              message: 'Order status updated successfully'
          });`;

  content = content.replace(successBlock, walletLogic);
  fs.writeFileSync(file, content, 'utf8');
  console.log('onlineOrderController patched.');
}

patchManualOrderController();
patchOnlineOrderController();
