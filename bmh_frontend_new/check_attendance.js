const fs = require('fs');
let c = fs.readFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/attendanceAnalyticsController.js', 'utf8');

c = c.replace(/const \{ department \} = req\.query; \/\/ optional, for subadmin filtering/g, "const { department, userType = 'employee' } = req.query;");

c = c.replace(/FROM employees e\n\s*\$\{deptFilter\}/g, "FROM ${userType === 'sub_admin' ? 'department_admins' : 'employees'} e\n      ${deptFilter}");

c = c.replace(/JOIN employees e ON a\.employee_id = e\.id/g, "JOIN ${userType === 'sub_admin' ? 'department_admins' : 'employees'} e ON a.employee_id = e.id AND a.user_type = '${userType === 'sub_admin' ? 'sub_admin' : 'employee'}'");
// Wait, is there a user_type column in attendance? Yes, I added it earlier! Wait, did I? 
// Let me double check if `user_type` is actually in `attendance` table. If not, I can't filter by `a.user_type`.
