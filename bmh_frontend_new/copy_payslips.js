const fs = require('fs');
let content = fs.readFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/payslips.tsx', 'utf8');

// Replace localStorage/AsyncStorage user key
content = content.replace(/employeeUser/g, 'subAdminUser');

// Replace the GET fetch call
content = content.replace(
  /\/leave\/payslips\?employee_id=\$\{emp\.id\}/g, 
  '/leave/payslips?employee_id=${emp.id}&user_type=sub_admin'
);

// Replace the POST generate call body
content = content.replace(
  /body: JSON\.stringify\(\{/g, 
  'body: JSON.stringify({ user_type: "sub_admin",'
);

fs.writeFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/department/dashboard/payslips.tsx', content);
console.log('Done!');
