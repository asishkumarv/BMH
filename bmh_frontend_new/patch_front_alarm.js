const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/delivery/dashboard/index.tsx';
let c = fs.readFileSync(file, 'utf8');

const fetchTarget = `        // If we have more orders now than before, it means a new order was assigned
        if (orders.length > 0 && res.data.data.length > orders.length) {
           try {
             const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
                { isLooping: true, shouldPlay: true }
             );
             setAlarmSound(sound);
             alert("🔔 New Delivery Assigned!");
           } catch (e) { console.log("Audio play failed:", e); }
        }`;

const fetchReplacement = `        // If we have more orders now than before, it means a new order was assigned
        if (orders.length > 0 && res.data.data.length > orders.length) {
           const newOrders = res.data.data.filter((newO: any) => !orders.find((oldO: any) => oldO.id === newO.id && oldO.type === newO.type));
           let shouldRing = false;
           newOrders.forEach((newO: any) => {
              if (!newO.is_scheduled) {
                shouldRing = true;
              } else if (newO.scheduled_date && newO.scheduled_time) {
                const sDate = typeof newO.scheduled_date === 'string' ? newO.scheduled_date.split('T')[0] : newO.scheduled_date;
                const scheduledDateTime = new Date(\`\${sDate}T\${newO.scheduled_time}\`);
                const alarmTime = new Date(scheduledDateTime.getTime() - 20 * 60000);
                if (alarmTime <= new Date()) {
                  shouldRing = true;
                }
              } else {
                shouldRing = true;
              }
           });

           if (shouldRing) {
             try {
               const { sound } = await Audio.Sound.createAsync(
                  { uri: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
                  { isLooping: true, shouldPlay: true }
               );
               setAlarmSound(sound);
               alert("🔔 New Delivery Assigned!");
             } catch (e) { console.log("Audio play failed:", e); }
           }
        }`;

c = c.replace(fetchTarget, fetchReplacement);
fs.writeFileSync(file, c);
console.log('Frontend dashboard alarm patched');
