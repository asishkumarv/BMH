const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/delivery/dashboard/index.tsx';
let c = fs.readFileSync(file, 'utf8');

const alarmCode = `
import * as Notifications from 'expo-notifications';
const scheduleOrderAlarms = async (ordersList) => {
  if (Platform.OS === 'web') return;
  // Cancel old ones just to be safe if they changed, though might be overkill, let's just schedule
  ordersList.forEach(order => {
    if (order.is_scheduled && order.scheduled_date && order.scheduled_time && order.status !== 'Delivered') {
      const scheduledDateTime = new Date(\`\$\{order.scheduled_date.split('T')[0]\}T\$\{order.scheduled_time\}\`);
      const alarmTime = new Date(scheduledDateTime.getTime() - 20 * 60000);
      if (alarmTime > new Date()) {
         Notifications.scheduleNotificationAsync({
           content: {
             title: 'Scheduled Delivery Alert',
             body: \`You have a scheduled delivery for \$\{order.patient_name\} at \$\{order.scheduled_time\}! (Order #\$\{order.id\})\`,
             sound: true,
           },
           trigger: { date: alarmTime } as any,
         });
      }
    }
  });
};
`;

c = c.replace(
  "import { MapPin",
  "import * as Notifications from 'expo-notifications';\nimport { MapPin"
);

c = c.replace(
  "setOrders(res.data.data);",
  "setOrders(res.data.data);\n          if (Platform.OS !== 'web') {\n            res.data.data.forEach(order => {\n              if (order.is_scheduled && order.scheduled_date && order.scheduled_time && order.status !== 'Delivered') {\n                const scheduledDateTime = new Date(`${order.scheduled_date.split('T')[0]}T${order.scheduled_time}`);\n                const alarmTime = new Date(scheduledDateTime.getTime() - 20 * 60000);\n                if (alarmTime > new Date()) {\n                  Notifications.scheduleNotificationAsync({\n                    content: {\n                      title: 'Scheduled Delivery Alert',\n                      body: `You have a scheduled delivery for ${order.patient_name} at ${order.scheduled_time}! (Order #${order.id})`,\n                      sound: true,\n                    },\n                    trigger: { date: alarmTime } as any,\n                  });\n                }\n              }\n            });\n          }"
);

fs.writeFileSync(file, c);
console.log('patched delivery dashboard for scheduled alarms');
