const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/order-assign/index.jsx';
let c = fs.readFileSync(file, 'utf8');
c = c.replace(/o\.status === 'DELIVERED'/g, "o.status?.toUpperCase() === 'DELIVERED'");
c = c.replace(/o\.status !== 'DELIVERED'/g, "o.status?.toUpperCase() !== 'DELIVERED'");
fs.writeFileSync(file, c);
console.log('Fixed case sensitivity');
