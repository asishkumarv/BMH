const fs = require('fs');

const onlineFile = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/onlineOrderController.js';
let onlineC = fs.readFileSync(onlineFile, 'utf8');

const onlineTarget = `        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
        res.status(200).json({ success: true, message: 'Delivery assigned', order: rows[0], delivery_otp });`;

const onlineReplacement = `        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
        
        try {
            const empRes = await pool.query('SELECT push_token FROM employees WHERE id = $1', [delivery_boy_id]);
            if (empRes.rowCount > 0 && empRes.rows[0].push_token) {
                const { sendExpoPushNotification } = require('../utils/pushNotification');
                sendExpoPushNotification(empRes.rows[0].push_token, 'New Online Order Assigned', \`Order #\${rows[0].id} has been assigned to you.\`);
            }
        } catch(e) { console.error('Push error:', e); }

        res.status(200).json({ success: true, message: 'Delivery assigned', order: rows[0], delivery_otp });`;

onlineC = onlineC.replace(onlineTarget, onlineReplacement);
fs.writeFileSync(onlineFile, onlineC);

const manualFile = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/manualOrderController.js';
let manualC = fs.readFileSync(manualFile, 'utf8');

const manualTarget = `    const updatedOrder = result.rows[0];`;

const manualReplacement = `    const updatedOrder = result.rows[0];
    
    if (delivery_boy_id && currentOrder.rows[0].delivery_boy_id != delivery_boy_id) {
       try {
           const empRes = await pool.query('SELECT push_token FROM employees WHERE id = $1', [delivery_boy_id]);
           if (empRes.rowCount > 0 && empRes.rows[0].push_token) {
              const { sendExpoPushNotification } = require('../utils/pushNotification');
              sendExpoPushNotification(empRes.rows[0].push_token, 'New Manual Order Assigned', \`Order #\${updatedOrder.order_no || updatedOrder.id} has been assigned to you.\`);
           }
       } catch(e) { console.error('Push error:', e); }
    }`;

manualC = manualC.replace(manualTarget, manualReplacement);
fs.writeFileSync(manualFile, manualC);

console.log('Controllers updated with push notification triggers');
