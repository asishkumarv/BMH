const cron = require('node-cron');
const pool = require('../db');
const { sendExpoPushNotification } = require('../utils/pushNotification');

const startDeliveryCron = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const twentyMinsFromNow = new Date(now.getTime() + 20 * 60000);
      
      const manualQuery = `
        SELECT m.*, d.push_token 
        FROM manual_orders m
        LEFT JOIN delivery_boys d ON m.delivery_boy_id = d.id::varchar
        WHERE m.status != 'Delivered' 
          AND m.delivery_boy_id IS NOT NULL
          AND (m.scheduled_notified = false OR m.bus_notified = false)
      `;
      
      const manualRes = await pool.query(manualQuery);
      
      for (let order of manualRes.rows) {
        if (order.is_scheduled && !order.scheduled_notified && order.scheduled_date && order.scheduled_time) {
          const sDate = typeof order.scheduled_date === 'string' ? order.scheduled_date.split('T')[0] : order.scheduled_date.toISOString().split('T')[0];
          const scheduledDateTime = new Date(`${sDate}T${order.scheduled_time}`);
          
          if (scheduledDateTime <= twentyMinsFromNow && scheduledDateTime > now) {
            if (order.push_token) {
              sendExpoPushNotification(order.push_token, 'Scheduled Delivery Due Soon', `Order #${order.order_no || order.id} is scheduled for delivery at ${order.scheduled_time}!`);
            }
            await pool.query('UPDATE manual_orders SET scheduled_notified = true WHERE id = $1', [order.id]);
          }
        }

        if (order.mode_of_delivery === 'Bus' && !order.bus_notified && order.est_reach_time) {
          // est_reach_time could be just a time "14:30" or full datetime. Assuming it's time on the created_at date.
          const cDate = typeof order.created_at === 'string' ? order.created_at.split('T')[0] : order.created_at.toISOString().split('T')[0];
          const estReachDateTime = new Date(`${cDate}T${order.est_reach_time}`);
          
          if (estReachDateTime <= twentyMinsFromNow && estReachDateTime > now) {
            if (order.push_token) {
              sendExpoPushNotification(order.push_token, 'Bus Arrival Due Soon', `Bus for Order #${order.order_no || order.id} is arriving at ${order.est_reach_time}!`);
            }
            await pool.query('UPDATE manual_orders SET bus_notified = true WHERE id = $1', [order.id]);
          }
        }
      }
      
      const onlineQuery = `
        SELECT o.*, d.push_token 
        FROM online_orders o
        LEFT JOIN delivery_boys d ON o.delivery_boy_id = d.id
        WHERE o.is_scheduled = true 
          AND o.status != 'Delivered' 
          AND o.delivery_boy_id IS NOT NULL
          AND o.scheduled_notified = false
      `;
      
      const onlineRes = await pool.query(onlineQuery);
      
      for (let order of onlineRes.rows) {
        if (!order.scheduled_date || !order.scheduled_time) continue;
        const sDate = typeof order.scheduled_date === 'string' ? order.scheduled_date.split('T')[0] : order.scheduled_date.toISOString().split('T')[0];
        const scheduledDateTime = new Date(`${sDate}T${order.scheduled_time}`);
        
        if (scheduledDateTime <= twentyMinsFromNow && scheduledDateTime > now) {
          if (order.push_token) {
            sendExpoPushNotification(order.push_token, 'Scheduled Delivery Due Soon', `Order #${order.id} is scheduled for delivery at ${order.scheduled_time}!`);
          }
          await pool.query('UPDATE online_orders SET scheduled_notified = true WHERE id = $1', [order.id]);
        }
      }

      // Also need to check ecogreen_sales_orders and ecogreen_sales_invoices if they have bus_details.
      // But based on DB schema, they have bus_details JSON column.
      const ecoSalesOrdersQuery = `
        SELECT e.*, d.push_token 
        FROM ecogreen_sales_orders e
        LEFT JOIN delivery_boys d ON e.delivery_boy_id = d.id
        WHERE e.delivery_type = 'Bus'
          AND e.status != 'Delivered'
          AND e.delivery_boy_id IS NOT NULL
          AND (e.bus_details->>'bus_notified') IS NULL
          AND (e.bus_details->>'arrival_time') IS NOT NULL
      `;
      const ecoSalesOrdersRes = await pool.query(ecoSalesOrdersQuery);
      for (let order of ecoSalesOrdersRes.rows) {
        if (order.bus_details && order.bus_details.arrival_time) {
          const cDate = typeof order.created_at === 'string' ? order.created_at.split('T')[0] : order.created_at.toISOString().split('T')[0];
          const estReachDateTime = new Date(`${cDate}T${order.bus_details.arrival_time}`);
          if (estReachDateTime <= twentyMinsFromNow && estReachDateTime > now) {
            if (order.push_token) {
              sendExpoPushNotification(order.push_token, 'Bus Arrival Due Soon', `Bus for Sales Order #${order.id} is arriving at ${order.bus_details.arrival_time}!`);
            }
            order.bus_details.bus_notified = true;
            await pool.query('UPDATE ecogreen_sales_orders SET bus_details = $1 WHERE id = $2', [JSON.stringify(order.bus_details), order.id]);
          }
        }
      }

      const ecoSalesInvoicesQuery = `
        SELECT e.*, d.push_token 
        FROM ecogreen_sales_invoices e
        LEFT JOIN delivery_boys d ON e.delivery_boy_id = d.id
        WHERE e.delivery_type = 'Bus'
          AND e.status != 'Delivered'
          AND e.delivery_boy_id IS NOT NULL
          AND (e.bus_details->>'bus_notified') IS NULL
          AND (e.bus_details->>'arrival_time') IS NOT NULL
      `;
      const ecoSalesInvoicesRes = await pool.query(ecoSalesInvoicesQuery);
      for (let order of ecoSalesInvoicesRes.rows) {
        if (order.bus_details && order.bus_details.arrival_time) {
          const cDate = typeof order.created_at === 'string' ? order.created_at.split('T')[0] : order.created_at.toISOString().split('T')[0];
          const estReachDateTime = new Date(`${cDate}T${order.bus_details.arrival_time}`);
          if (estReachDateTime <= twentyMinsFromNow && estReachDateTime > now) {
            if (order.push_token) {
              sendExpoPushNotification(order.push_token, 'Bus Arrival Due Soon', `Bus for Sales Invoice #${order.id} is arriving at ${order.bus_details.arrival_time}!`);
            }
            order.bus_details.bus_notified = true;
            await pool.query('UPDATE ecogreen_sales_invoices SET bus_details = $1 WHERE id = $2', [JSON.stringify(order.bus_details), order.id]);
          }
        }
      }

    } catch (err) {
      console.error('Error in delivery cron:', err);
    }
  });
  console.log("Delivery Scheduler Cron Started.");
};

module.exports = { startDeliveryCron };
