const cron = require('node-cron');
const pool = require('../db');
const { sendExpoPushNotification } = require('../utils/pushNotification');

function parseTime(timeStr, dateStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return new Date(`${dateStr}T${timeStr}`);
  let [_, h, m, ampm] = match;
  h = parseInt(h, 10);
  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
    if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
  }
  const hStr = h.toString().padStart(2, '0');
  return new Date(`${dateStr}T${hStr}:${m}:00`);
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
          const scheduledDateTime = parseTime(order.scheduled_time, sDate);
          
          if (scheduledDateTime && scheduledDateTime <= twentyMinsFromNow && scheduledDateTime > now) {
            if (order.push_token) {
              sendExpoPushNotification(order.push_token, 'Scheduled Delivery Due Soon', `Order #${order.order_no || order.id} is scheduled for delivery at ${order.scheduled_time}!`);
            }
            await pool.query('UPDATE manual_orders SET scheduled_notified = true WHERE id = $1', [order.id]);
          }
        }

        if (order.mode_of_delivery === 'Bus' && !order.bus_notified && order.est_reach_time) {
          let cDate = getTodayString();
          if (order.bus_date) {
            cDate = typeof order.bus_date === 'string' ? order.bus_date.split('T')[0] : order.bus_date.toISOString().split('T')[0];
          }
          const estReachDateTime = parseTime(order.est_reach_time, cDate);
          
          if (estReachDateTime && estReachDateTime <= twentyMinsFromNow && estReachDateTime > now) {
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
        const scheduledDateTime = parseTime(order.scheduled_time, sDate);
        
        if (scheduledDateTime && scheduledDateTime <= twentyMinsFromNow && scheduledDateTime > now) {
          if (order.push_token) {
            sendExpoPushNotification(order.push_token, 'Scheduled Delivery Due Soon', `Order #${order.id} is scheduled for delivery at ${order.scheduled_time}!`);
          }
          await pool.query('UPDATE online_orders SET scheduled_notified = true WHERE id = $1', [order.id]);
        }
      }

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
          let cDate = getTodayString();
          if (order.bus_details.bus_date) {
            cDate = order.bus_details.bus_date.split('T')[0];
          }
          const estReachDateTime = parseTime(order.bus_details.arrival_time, cDate);
          if (estReachDateTime && estReachDateTime <= twentyMinsFromNow && estReachDateTime > now) {
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
          let cDate = getTodayString();
          if (order.bus_details.bus_date) {
            cDate = order.bus_details.bus_date.split('T')[0];
          }
          const estReachDateTime = parseTime(order.bus_details.arrival_time, cDate);
          if (estReachDateTime && estReachDateTime <= twentyMinsFromNow && estReachDateTime > now) {
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
