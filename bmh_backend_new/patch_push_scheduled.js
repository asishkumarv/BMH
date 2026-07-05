const fs = require('fs');

const onlineFile = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/onlineOrderController.js';
let onlineC = fs.readFileSync(onlineFile, 'utf8');

const onlineTarget = `        try {
            const empRes = await pool.query('SELECT push_token FROM employees WHERE id = $1', [delivery_boy_id]);
            if (empRes.rowCount > 0 && empRes.rows[0].push_token) {
                const { sendExpoPushNotification } = require('../utils/pushNotification');
                sendExpoPushNotification(empRes.rows[0].push_token, 'New Online Order Assigned', \`Order #\${rows[0].id} has been assigned to you.\`);
            }
        } catch(e) { console.error('Push error:', e); }`;

const onlineReplacement = `        try {
            const empRes = await pool.query('SELECT push_token FROM employees WHERE id = $1', [delivery_boy_id]);
            if (empRes.rowCount > 0 && empRes.rows[0].push_token) {
                const { sendExpoPushNotification } = require('../utils/pushNotification');
                
                let shouldPushNow = true;
                const ord = rows[0];
                if (ord.is_scheduled && ord.scheduled_date && ord.scheduled_time) {
                   const sDate = typeof ord.scheduled_date === 'string' ? ord.scheduled_date.split('T')[0] : ord.scheduled_date.toISOString().split('T')[0];
                   const scheduledDateTime = new Date(\`\${sDate}T\${ord.scheduled_time}\`);
                   const alarmTime = new Date(scheduledDateTime.getTime() - 20 * 60000);
                   if (alarmTime > new Date()) {
                      shouldPushNow = false;
                   }
                }
                
                if (shouldPushNow) {
                   sendExpoPushNotification(empRes.rows[0].push_token, 'New Online Order Assigned', \`Order #\${ord.id} has been assigned to you.\`);
                }
            }
        } catch(e) { console.error('Push error:', e); }`;

onlineC = onlineC.replace(onlineTarget, onlineReplacement);
fs.writeFileSync(onlineFile, onlineC);

const manualFile = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/manualOrderController.js';
let manualC = fs.readFileSync(manualFile, 'utf8');

const manualTarget = `       try {
           const empRes = await pool.query('SELECT push_token FROM employees WHERE id = $1', [delivery_boy_id]);
           if (empRes.rowCount > 0 && empRes.rows[0].push_token) {
              const { sendExpoPushNotification } = require('../utils/pushNotification');
              sendExpoPushNotification(empRes.rows[0].push_token, 'New Manual Order Assigned', \`Order #\${updatedOrder.order_no || updatedOrder.id} has been assigned to you.\`);
           }
       } catch(e) { console.error('Push error:', e); }`;

const manualReplacement = `       try {
           const empRes = await pool.query('SELECT push_token FROM employees WHERE id = $1', [delivery_boy_id]);
           if (empRes.rowCount > 0 && empRes.rows[0].push_token) {
              const { sendExpoPushNotification } = require('../utils/pushNotification');
              
              let shouldPushNow = true;
              if (updatedOrder.is_scheduled && updatedOrder.scheduled_date && updatedOrder.scheduled_time) {
                 const sDate = typeof updatedOrder.scheduled_date === 'string' ? updatedOrder.scheduled_date.split('T')[0] : updatedOrder.scheduled_date.toISOString().split('T')[0];
                 const scheduledDateTime = new Date(\`\${sDate}T\${updatedOrder.scheduled_time}\`);
                 const alarmTime = new Date(scheduledDateTime.getTime() - 20 * 60000);
                 if (alarmTime > new Date()) {
                    shouldPushNow = false;
                 }
              }
              
              if (shouldPushNow) {
                 sendExpoPushNotification(empRes.rows[0].push_token, 'New Manual Order Assigned', \`Order #\${updatedOrder.order_no || updatedOrder.id} has been assigned to you.\`);
              }
           }
       } catch(e) { console.error('Push error:', e); }`;

manualC = manualC.replace(manualTarget, manualReplacement);
fs.writeFileSync(manualFile, manualC);

console.log('Controllers push suppressed for future scheduled orders');
