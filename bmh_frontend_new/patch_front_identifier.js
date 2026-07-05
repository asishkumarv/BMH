const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/delivery/dashboard/index.tsx';
let c = fs.readFileSync(file, 'utf8');

const target = `                    Notifications.scheduleNotificationAsync({
                      content: {
                        title: 'Scheduled Delivery Alert',
                        body: \`You have a scheduled delivery for \${order.patient_name} at \${order.scheduled_time}! (Order #\${order.id})\`,
                        sound: true,
                      },
                      trigger: { date: alarmTime } as any,
                    });`;

const replacement = `                    Notifications.scheduleNotificationAsync({
                      identifier: \`scheduled_order_\${order.type}_\${order.id}\`,
                      content: {
                        title: 'Scheduled Delivery Alert',
                        body: \`You have a scheduled delivery for \${order.customer_name || order.patient_name || 'Customer'} at \${order.scheduled_time}! (Order #\${order.id})\`,
                        sound: true,
                      },
                      trigger: { date: alarmTime } as any,
                    });`;

c = c.replace(target, replacement);

const target2 = `const sDate = typeof newO.scheduled_date === 'string' ? newO.scheduled_date.split('T')[0] : newO.scheduled_date;`;
const replacement2 = `const sDate = typeof newO.scheduled_date === 'string' ? newO.scheduled_date.split('T')[0] : newO.scheduled_date.toISOString().split('T')[0];`;
c = c.replace(target2, replacement2);

fs.writeFileSync(file, c);
console.log('Frontend index.tsx patched for notification identifiers');
