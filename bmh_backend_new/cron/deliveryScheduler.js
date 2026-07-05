const cron = require('node-cron');
const pool = require('../db');
const { sendExpoPushNotification } = require('../utils/pushNotification');

const startDeliveryCron = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      // We need to find scheduled orders that are assigned but not delivered
      // and their scheduled time is exactly or less than 20 minutes from now,
      // and they haven't been notified yet.
      
      const now = new Date();
      const twentyMinsFromNow = new Date(now.getTime() + 20 * 60000);
      
      const manualQuery = \`
        SELECT m.*, e.push_token 
        FROM manual_orders m
        JOIN employees e ON m.delivery_boy_id = e.id::varchar
        WHERE m.is_scheduled = true 
          AND m.status != 'Delivered' 
          AND m.delivery_boy_id IS NOT NULL
          AND m.scheduled_notified = false
      \`;
      
      const manualRes = await pool.query(manualQuery);
      
      for (let order of manualRes.rows) {
        if (!order.scheduled_date || !order.scheduled_time) continue;
        const sDate = typeof order.scheduled_date === 'string' ? order.scheduled_date.split('T')[0] : order.scheduled_date.toISOString().split('T')[0];
        const scheduledDateTime = new Date(\`\${sDate}T\${order.scheduled_time}\`);
        
        if (scheduledDateTime <= twentyMinsFromNow) {
          // It's within 20 mins! Notify and update.
          if (order.push_token) {
            sendExpoPushNotification(order.push_token, 'Scheduled Delivery Due Soon', \`Order #\${order.order_no || order.id} is scheduled for delivery at \${order.scheduled_time}!\`);
          }
          await pool.query('UPDATE manual_orders SET scheduled_notified = true WHERE id = $1', [order.id]);
        }
      }
      
      const onlineQuery = \`
        SELECT o.*, e.push_token 
        FROM online_orders o
        JOIN employees e ON o.delivery_boy_id = e.id::varchar
        WHERE o.is_scheduled = true 
          AND o.status != 'Delivered' 
          AND o.delivery_boy_id IS NOT NULL
          AND o.scheduled_notified = false
      \`;
      
      const onlineRes = await pool.query(onlineQuery);
      
      for (let order of onlineRes.rows) {
        if (!order.scheduled_date || !order.scheduled_time) continue;
        const sDate = typeof order.scheduled_date === 'string' ? order.scheduled_date.split('T')[0] : order.scheduled_date.toISOString().split('T')[0];
        const scheduledDateTime = new Date(\`\${sDate}T\${order.scheduled_time}\`);
        
        if (scheduledDateTime <= twentyMinsFromNow) {
          // It's within 20 mins! Notify and update.
          if (order.push_token) {
            sendExpoPushNotification(order.push_token, 'Scheduled Delivery Due Soon', \`Order #\${order.id} is scheduled for delivery at \${order.scheduled_time}!\`);
          }
          await pool.query('UPDATE online_orders SET scheduled_notified = true WHERE id = $1', [order.id]);
        }
      }

    } catch (err) {
      console.error('Error in delivery cron:', err);
    }
  });
  console.log("Delivery Scheduler Cron Started.");
};

module.exports = { startDeliveryCron };
