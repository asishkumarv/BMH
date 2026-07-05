const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/employeeController.js';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  "bus_driver_number, 'arrival_time', est_reach_time) as bus_details, delivery_otp, payment_mode",
  "bus_driver_number, 'arrival_time', est_reach_time) as bus_details, delivery_otp, payment_mode, is_scheduled, scheduled_date, scheduled_time"
);

fs.writeFileSync(file, c);
console.log('patched employeeController.js to return scheduling fields');
