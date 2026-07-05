const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/server.js';
let c = fs.readFileSync(file, 'utf8');

const target = `    const { startPurchaseOrderCron } = require('./cron/purchaseOrderSync');
    startMedicineCron();
    startPurchaseOrderCron();`;

const replacement = `    const { startPurchaseOrderCron } = require('./cron/purchaseOrderSync');
    const { startDeliveryCron } = require('./cron/deliveryScheduler');
    startMedicineCron();
    startPurchaseOrderCron();
    startDeliveryCron();`;

c = c.replace(target, replacement);

fs.writeFileSync(file, c);
console.log('server.js patched for deliveryScheduler');
