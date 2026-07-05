const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/manualOrderController.js';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  "payment_mode, payment_txn_id",
  "payment_mode, payment_txn_id, is_scheduled, scheduled_date, scheduled_time"
);

c = c.replace(
  "$16, $17, $18, $19)",
  "$16, $17, $18, $19, $20, $21, $22)"
);

c = c.replace(
  "payment_txn_id || null",
  "payment_txn_id || null,\n        req.body.is_scheduled || false,\n        req.body.scheduled_date || null,\n        req.body.scheduled_time || null"
);

fs.writeFileSync(file, c);
console.log('manualOrderController patched for scheduling');
