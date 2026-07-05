const fs = require('fs');

const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/employeeController.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = "WHERE department = 'Delivery' AND status = 'approved'";
const replacementStr = "WHERE department = 'Delivery' AND status = 'approved' AND id::varchar IN (SELECT employee_id FROM attendance WHERE date = CURRENT_DATE AND checkout_timestamp IS NULL)";

content = content.replace(targetStr, replacementStr);

fs.writeFileSync(file, content, 'utf8');
console.log('employeeController.js patched for attendance filtering.');
