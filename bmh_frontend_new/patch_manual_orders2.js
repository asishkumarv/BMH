const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/order-assign/ManualOrders.jsx';
let c = fs.readFileSync(file, 'utf8');

const target = `      const payload = {
        ...formData,
        created_by_id: createdById,
        created_by_type: createdByType
      };`;

const replacement = `      const payload = {
        ...formData,
        is_scheduled: formData.mode_of_delivery === 'Schedule Delivery',
        created_by_id: createdById,
        created_by_type: createdByType
      };`;

c = c.replace(target, replacement);

fs.writeFileSync(file, c);
console.log('handleCreateSubmit patched successfully');
