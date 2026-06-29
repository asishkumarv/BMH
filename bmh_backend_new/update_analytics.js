const fs = require('fs');
let c = fs.readFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/attendanceAnalyticsController.js', 'utf8');

c = c.replace(/const \{ department, status, startDate, endDate, employeeId \} = req\.query;/, "const { department, status, startDate, endDate, employeeId, userType = 'employee' } = req.query;");
c = c.replace(/const \{ department \} = req\.query; \/\/ optional, for subadmin filtering/, "const { department, userType = 'employee' } = req.query; // optional, for subadmin filtering");

const summaryEmpQuery = "FROM ${userType === 'sub_admin' ? 'department_admins' : 'employees'} e";
c = c.replace(/FROM employees e/g, summaryEmpQuery);

const joinAttendance = "JOIN ${userType === 'sub_admin' ? 'department_admins' : 'employees'} e ON a.employee_id = e.id AND a.user_type = '${userType}'";
c = c.replace(/JOIN employees e ON a\.employee_id = e\.id/g, joinAttendance);

const joinBreak = "JOIN ${userType === 'sub_admin' ? 'department_admins' : 'employees'} e ON bl.employee_id = e.id AND bl.user_type = '${userType}'";
c = c.replace(/JOIN employees e ON bl\.employee_id = e\.id/g, joinBreak);

// Fix the select query in getAdvancedReports for department name if sub admin
const advancedSelect = `SELECT 
        a.id, a.employee_id, e.full_name, \${userType === 'sub_admin' ? '(SELECT name FROM departments WHERE id = e.department_id) as department' : 'e.department'}, e.email, e.mobile, e.profile_data, a.date, `;
c = c.replace(/SELECT \s*a\.id, a\.employee_id, e\.full_name, e\.department, e\.email, e\.mobile, e\.profile_data, a\.date, /g, advancedSelect);

// Fix department filter in summary (employees uses e.department, department_admins uses e.department_id)
const summaryDeptFilter = `\${department ? (userType === 'sub_admin' ? "AND e.department_id = (SELECT id FROM departments WHERE name = $1 LIMIT 1)" : "AND e.department = $1") : ""}`;
c = c.replace(/\$\{department \? "AND e\.department = \$1" : ""\}/g, summaryDeptFilter);

c = c.replace(/deptFilter = "WHERE e\.department = \$1";/, `deptFilter = userType === 'sub_admin' ? "WHERE e.department_id = (SELECT id FROM departments WHERE name = $1 LIMIT 1)" : "WHERE e.department = $1";`);

// Fix department filter in getAdvancedReports
c = c.replace(/query \+= \` AND e\.department = \$\d+ \`;/, `query += userType === 'sub_admin' ? \` AND e.department_id = (SELECT id FROM departments WHERE name = $\${paramIndex} LIMIT 1) \` : \` AND e.department = $\${paramIndex} \`;`);

// Fix getEmployeeAnalytics to handle userType
c = c.replace(/exports\.getEmployeeAnalytics = async \(req, res\) => \{[\s\S]*?const \{ employeeId, month, year \} = req\.query;/m, `exports.getEmployeeAnalytics = async (req, res) => {
  try {
    const { employeeId, month, year, userType = 'employee' } = req.query;`);

c = c.replace(/FROM attendance WHERE employee_id = \$1/g, "FROM attendance WHERE employee_id = $1 AND user_type = '${userType}'");
c = c.replace(/FROM break_logs WHERE employee_id = \$1/g, "FROM break_logs WHERE employee_id = $1 AND user_type = '${userType}'");


fs.writeFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/attendanceAnalyticsController.js', c);
