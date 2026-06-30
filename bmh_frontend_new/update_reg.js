const fs = require('fs');
let c = fs.readFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/department/register.tsx', 'utf8');
c = c.replace(/EmployeeRegisterScreen/g, 'SubAdminRegisterScreen');
c = c.replace(/Employee Register/g, 'Sub Admin Register');
c = c.replace(/'\/employee\/login'/g, "'/department/login'");
c = c.replace(/'https:\/\/bmh-eitu.onrender.com\/employees'/g, "'https://napi.bharatmedicalhallplus.com/admin/department-admins'");
fs.writeFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/department/register.tsx', c);
