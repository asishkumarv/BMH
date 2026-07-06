const pool = require('../db');

// --- Settings ---

// Get leave settings
exports.getSettings = async (req, res) => {
  try {
    const { department } = req.query; // If department is provided, filter by it. Or "All" for super admin.
    
    // Department settings
    let depQuery = 'SELECT * FROM department_leave_settings';
    let depValues = [];
    if (department && department !== 'All') {
      depQuery += ' WHERE department = $1';
      depValues.push(department);
    }
    const depRes = await pool.query(depQuery, depValues);

    // Employee settings
    let empQuery = `
      SELECT els.*, e.full_name as employee_name, e.department, e.role
      FROM employee_leave_settings els
      JOIN employees e ON els.employee_id = e.id AND els.user_type = 'employee'
    `;
    let empValues = [];
    if (department && department !== 'All') {
      empQuery += ' WHERE e.department = $1';
      empValues.push(department);
    }
    
    empQuery += `
      UNION ALL
      SELECT els.*, da.full_name as employee_name, (SELECT name FROM departments WHERE id = da.department_id) as department, 'Sub Admin' as role
      FROM employee_leave_settings els
      JOIN department_admins da ON els.employee_id = da.id AND els.user_type = 'sub_admin'
    `;
    if (department && department !== 'All') {
      empQuery += ' WHERE (SELECT name FROM departments WHERE id = da.department_id) = $1';
    }
    const empRes = await pool.query(empQuery, empValues);

    res.status(200).json({
      departmentSettings: depRes.rows,
      employeeSettings: empRes.rows,
    });
  } catch (error) {
    console.error('Error fetching leave settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update department settings
exports.updateDepartmentSettings = async (req, res) => {
  try {
    const { department, max_employees_leave_per_day } = req.body;
    const query = `
      INSERT INTO department_leave_settings (department, max_employees_leave_per_day)
      VALUES ($1, $2)
      ON CONFLICT (department) DO UPDATE
      SET max_employees_leave_per_day = EXCLUDED.max_employees_leave_per_day,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const result = await pool.query(query, [department, max_employees_leave_per_day]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating department settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update employee settings
exports.updateEmployeeSettings = async (req, res) => {
  try {
    const {
      employee_id, user_type = 'employee', leaves_per_month, extra_leave_penalty,
      late_checkin_limit, late_checkin_penalty,
      early_checkout_limit, early_checkout_penalty
    } = req.body;

    const query = `
      INSERT INTO employee_leave_settings 
      (employee_id, user_type, leaves_per_month, extra_leave_penalty, late_checkin_limit, late_checkin_penalty, early_checkout_limit, early_checkout_penalty)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (employee_id, user_type) DO UPDATE
      SET leaves_per_month = EXCLUDED.leaves_per_month,
          extra_leave_penalty = EXCLUDED.extra_leave_penalty,
          late_checkin_limit = EXCLUDED.late_checkin_limit,
          late_checkin_penalty = EXCLUDED.late_checkin_penalty,
          early_checkout_limit = EXCLUDED.early_checkout_limit,
          early_checkout_penalty = EXCLUDED.early_checkout_penalty,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const values = [
      employee_id, user_type, leaves_per_month, extra_leave_penalty,
      late_checkin_limit, late_checkin_penalty, early_checkout_limit, early_checkout_penalty
    ];
    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating employee settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// --- Requests ---

// Apply for leave (Employee)
exports.applyLeave = async (req, res) => {
  try {
    const { employee_id, user_type = 'employee', start_date, end_date, reason } = req.body;

    // Get employee department
    const tableName = user_type === 'sub_admin' ? 'department_admins' : 'employees';
    const deptCol = user_type === 'sub_admin' 
      ? '(SELECT name FROM departments WHERE id = department_admins.department_id) as department' 
      : 'department';
    const empRes = await pool.query(`SELECT ${deptCol} FROM ${tableName} WHERE id = $1`, [employee_id]);
    if (empRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const department = empRes.rows[0].department;

    // Check max employees limit for the requested dates
    // For simplicity, we check if ANY of the days in the range exceed the limit.
    const depSetRes = await pool.query('SELECT max_employees_leave_per_day FROM department_leave_settings WHERE department = $1', [department]);
    const maxLeaves = depSetRes.rows.length > 0 ? depSetRes.rows[0].max_employees_leave_per_day : 9999; // Default large if not set

    // Check active approved leaves overlapping with these dates
    const overlapRes = await pool.query(`
      SELECT lr.*, u.department
      FROM leave_requests lr
      JOIN (
        SELECT id, department, 'employee' as user_type FROM employees
        UNION ALL
        SELECT id, (SELECT name FROM departments WHERE id = department_admins.department_id) as department, 'sub_admin' as user_type FROM department_admins
      ) u ON lr.employee_id = u.id AND lr.user_type = u.user_type
      WHERE u.department = $1 AND lr.status = 'approved'
        AND (lr.start_date <= $3 AND lr.end_date >= $2)
    `, [department, start_date, end_date]);

    if (overlapRes.rows.length >= maxLeaves) {
      return res.status(400).json({ message: 'Leave limit for that date exceeded' });
    }

    const query = `
      INSERT INTO leave_requests (employee_id, user_type, start_date, end_date, reason)
      VALUES ($1, $2, $3, $4, $5) RETURNING *;
    `;
    const result = await pool.query(query, [employee_id, user_type, start_date, end_date, reason]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error applying for leave:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get requests (Admin/Sub-admin or Employee)
exports.getRequests = async (req, res) => {
  try {
    const { employee_id, user_type, department, month } = req.query; // If employee_id is passed, get for that employee. If department, for department.
    
    let query = `
      SELECT lr.*, e.full_name, e.department, e.role 
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id AND lr.user_type = 'employee'
      WHERE 1=1
    `;
    let values = [];
    let idx = 1;

    // We can also union with sub_admins if needed, for simplicity let's just use union all if not specific
    // Actually, to fully support it:
    query = `
      SELECT lr.*, u.full_name, u.department, u.role
      FROM leave_requests lr
      JOIN (
        SELECT id, full_name, department, role, 'employee' as user_type FROM employees
        UNION ALL
        SELECT id, full_name, (SELECT name FROM departments WHERE id = department_admins.department_id) as department, 'Sub Admin' as role, 'sub_admin' as user_type FROM department_admins
      ) u ON lr.employee_id = u.id AND lr.user_type = u.user_type
      WHERE 1=1
    `;

    if (employee_id && user_type) {
      query += ` AND lr.employee_id = $${idx++} AND lr.user_type = $${idx++}`;
      values.push(employee_id, user_type);
    } else if (employee_id) {
      query += ` AND lr.employee_id = $${idx++}`;
      values.push(employee_id);
    }
    if (department && department !== 'All') {
      query += ` AND u.department = $${idx++}`;
      values.push(department);
    }
    if (month) {
      // Month format expected 'YYYY-MM'
      query += ` AND TO_CHAR(lr.start_date, 'YYYY-MM') = $${idx++}`;
      values.push(month);
    }

    query += ' ORDER BY lr.created_at DESC';
    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update request status (Approve/Reject)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const query = `
      UPDATE leave_requests SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 RETURNING *;
    `;
    const result = await pool.query(query, [status, id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Request not found' });
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// --- Payslips ---

exports.generatePayslip = async (req, res) => {
  try {
    const { employee_id, user_type = 'employee', month, appreciation_amount = 0, extra_working_amount = 0 } = req.body; // Month format 'YYYY-MM'
    
    // 1. Get employee data
    const tableName = user_type === 'sub_admin' ? 'department_admins' : 'employees';
    const deptCol = user_type === 'sub_admin' 
      ? '(SELECT name FROM departments WHERE id = department_admins.department_id) as department' 
      : 'department';
    const empRes = await pool.query(`SELECT *, ${deptCol} FROM ${tableName} WHERE id = $1`, [employee_id]);
    if (empRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const emp = empRes.rows[0];
    
    // Extract base_salary from profile_data
    let base_salary = 0;
    try {
      if (emp.profile_data) {
        const pd = JSON.parse(emp.profile_data);
        if (pd.salary) base_salary = parseFloat(pd.salary) || 0;
      }
    } catch (e) {}

    // 2. Get employee settings
    let empSetQuery = `SELECT * FROM employee_leave_settings WHERE employee_id = $1 AND user_type = $2`;
    const empSetRes = await pool.query(empSetQuery, [employee_id, user_type]);
    
    let settings = {
      leaves_per_month: 0, extra_leave_penalty: 0,
      late_checkin_limit: 0, late_checkin_penalty: 0,
      early_checkout_limit: 0, early_checkout_penalty: 0
    };
    if (empSetRes.rows.length > 0) settings = empSetRes.rows[0];

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const m = parseInt(monthStr) - 1;
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    // Fetch holidays
    const holidaysRes = await pool.query(
      `SELECT date FROM holidays WHERE (department = $1 OR department = 'All') AND TO_CHAR(date, 'YYYY-MM') = $2`,
      [emp.department, month]
    );
    const holidaySet = new Set(holidaysRes.rows.map(r => new Date(r.date).getDate()));

    // Fetch attendance
    const attendanceRes = await pool.query(`
      SELECT date, timestamp, checkout_timestamp, late_duration, early_checkout_duration 
      FROM attendance 
      WHERE employee_id = $1 AND user_type = $3 AND TO_CHAR(date, 'YYYY-MM') = $2
    `, [employee_id, month, user_type]);

    const attendedDays = new Set(attendanceRes.rows.map(att => new Date(att.date).getDate()));

    // Parse shift times
    let shiftInMin = null;
    let shiftOutMin = null;
    try {
      if (emp.profile_data) {
        const pd = JSON.parse(emp.profile_data);
        if (pd.shiftIn) {
          const [h, m] = pd.shiftIn.split(':').map(Number);
          shiftInMin = h * 60 + m;
        }
        if (pd.shiftOut) {
          const [h, m] = pd.shiftOut.split(':').map(Number);
          shiftOutMin = h * 60 + m;
        }
      }
    } catch(e) {}

    // Calculate late checkins & early checkouts
    let late_count = 0;
    let early_count = 0;
    attendanceRes.rows.forEach(att => {
      let isLate = false;
      let isEarly = false;
      
      if (att.late_duration && att.late_duration !== '0h 0m' && att.late_duration !== '') {
         isLate = true;
      } else if (shiftInMin !== null && att.timestamp) {
         const t = new Date(att.timestamp);
         const tStr = t.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
         const [h, m] = tStr.split(':').map(Number);
         if ((h * 60 + m) > shiftInMin) isLate = true;
      }
      
      if (att.early_checkout_duration && att.early_checkout_duration !== '0h 0m' && att.early_checkout_duration !== '') {
         isEarly = true;
      } else if (shiftOutMin !== null && att.checkout_timestamp) {
         const t = new Date(att.checkout_timestamp);
         const tStr = t.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
         const [h, m] = tStr.split(':').map(Number);
         if ((h * 60 + m) < shiftOutMin) isEarly = true;
      }
      
      if (isLate) late_count++;
      if (isEarly) early_count++;
    });

    // Fetch approved leaves
    const leavesListRes = await pool.query(`
      SELECT start_date, end_date FROM leave_requests
      WHERE employee_id = $1 AND user_type = $3 AND status = 'approved'
      AND (TO_CHAR(start_date, 'YYYY-MM') = $2 OR TO_CHAR(end_date, 'YYYY-MM') = $2)
    `, [employee_id, month, user_type]);

    const approvedLeaveDays = new Set();
    leavesListRes.rows.forEach(lr => {
        const start = new Date(lr.start_date);
        const end = new Date(lr.end_date);
        for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (d.getMonth() === m && d.getFullYear() === year) {
                if (d.getDay() !== 0) { // Exclude Sundays from approved leaves
                    approvedLeaveDays.add(d.getDate());
                }
            }
        }
    });

    // Calculate missing days (absents)
    let missingDays = 0;
    
    // If it is the current month, only calculate missing days up to yesterday (to avoid premature absent flags)
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const [tDay, tMonth, tYear] = todayStr.split('/').map(Number);
    const currentMonthStr = `${tYear}-${String(tMonth).padStart(2, '0')}`;
    const limitDay = (month === currentMonthStr) ? tDay : daysInMonth + 1;

    for (let day = 1; day < limitDay; day++) {
        const dateObj = new Date(year, m, day);
        const isSunday = dateObj.getDay() === 0;
        if (!isSunday && !holidaySet.has(day)) {
            if (!attendedDays.has(day) && !approvedLeaveDays.has(day)) {
                missingDays++;
            }
        }
    }

    const actual_leaves = approvedLeaveDays.size + missingDays;

    // 4. Calculate extra leaves
    const extra_leaves = Math.max(0, actual_leaves - settings.leaves_per_month);
    const salary_per_day = base_salary / 30; // Approximating month as 30 days
    const extra_leave_deduction = extra_leaves * (salary_per_day + parseFloat(settings.extra_leave_penalty || 0));

    const extra_late = Math.max(0, late_count - settings.late_checkin_limit);
    const late_checkin_deduction = extra_late * settings.late_checkin_penalty;

    const extra_early = Math.max(0, early_count - settings.early_checkout_limit);
    const early_checkout_deduction = extra_early * settings.early_checkout_penalty;

    let net_salary = base_salary - (extra_leave_deduction + late_checkin_deduction + early_checkout_deduction) + parseFloat(appreciation_amount) + parseFloat(extra_working_amount);
    if (net_salary < 0) net_salary = 0;

    // Detailed breakdown
    const details = {
      base_salary,
      per_day_salary: salary_per_day.toFixed(2),
      leaves: {
        total_taken: actual_leaves,
        free_limit: settings.leaves_per_month,
        penalized: extra_leaves,
        penalty_per_day: settings.extra_leave_penalty,
        total_deduction: extra_leave_deduction
      },
      late_checkins: {
        total_occurrences: late_count,
        free_limit: settings.late_checkin_limit,
        penalized: Math.max(0, late_count - settings.late_checkin_limit),
        penalty_per_instance: settings.late_checkin_penalty,
        total_deduction: late_checkin_deduction
      },
      early_checkouts: {
        total_occurrences: early_count,
        free_limit: settings.early_checkout_limit,
        penalized: Math.max(0, early_count - settings.early_checkout_limit),
        penalty_per_instance: settings.early_checkout_penalty,
        total_deduction: early_checkout_deduction
      }
    };

    // 6. Save or update payslip
    const psQuery = `
      INSERT INTO payslips (employee_id, user_type, month, base_salary, extra_leave_deduction, late_checkin_deduction, early_checkout_deduction, appreciation_amount, extra_working_amount, net_salary, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (employee_id, month) DO UPDATE
      SET base_salary = EXCLUDED.base_salary,
          extra_leave_deduction = EXCLUDED.extra_leave_deduction,
          late_checkin_deduction = EXCLUDED.late_checkin_deduction,
          early_checkout_deduction = EXCLUDED.early_checkout_deduction,
          appreciation_amount = EXCLUDED.appreciation_amount,
          extra_working_amount = EXCLUDED.extra_working_amount,
          net_salary = EXCLUDED.net_salary,
          details = EXCLUDED.details
      RETURNING *;
    `;
    const psResult = await pool.query(psQuery, [employee_id, user_type, month, base_salary, extra_leave_deduction, late_checkin_deduction, early_checkout_deduction, appreciation_amount, extra_working_amount, net_salary, JSON.stringify(details)]);
    
    res.status(200).json(psResult.rows[0]);
  } catch (error) {
    console.error('Error generating payslip:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getPayslips = async (req, res) => {
  try {
    const { employee_id, user_type, month, department } = req.query;
    
    let query = `
      SELECT p.*, u.full_name, u.department, u.role 
      FROM payslips p
      JOIN (
        SELECT id, full_name, department, role, 'employee' as user_type FROM employees
        UNION ALL
        SELECT id, full_name, (SELECT name FROM departments WHERE id = department_admins.department_id) as department, 'Sub Admin' as role, 'sub_admin' as user_type FROM department_admins
      ) u ON p.employee_id = u.id AND p.user_type = u.user_type
      WHERE 1=1
    `;
    let values = [];
    let idx = 1;
    if (employee_id && user_type) {
      query += ` AND p.employee_id = $${idx++} AND p.user_type = $${idx++}`;
      values.push(employee_id, user_type);
    } else if (employee_id) {
      query += ` AND p.employee_id = $${idx++}`;
      values.push(employee_id);
    }
    if (department && department !== 'All') {
      query += ` AND u.department = $${idx++}`;
      values.push(department);
    }
    if (month) {
      query += ` AND p.month = $${idx++}`;
      values.push(month);
    }
    query += ' ORDER BY p.month DESC';
    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getEmployeeLeaveSummary = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { month: queryMonth, user_type = 'employee' } = req.query;
    const now = new Date();
    
    // Calculate current month using Indian timezone (GMT+5:30)
    const todayStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const [tDay, tMonth, tYear] = todayStr.split('/').map(Number);
    const currentMonthStr = `${tYear}-${String(tMonth).padStart(2, '0')}`;
    
    const month = queryMonth || currentMonthStr;
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const m = parseInt(monthStr) - 1;
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    // 1. Get employee data
    const tableName = user_type === 'sub_admin' ? 'department_admins' : 'employees';
    const deptCol = user_type === 'sub_admin' 
      ? '(SELECT name FROM departments WHERE id = department_admins.department_id) as department' 
      : 'department';
    const empRes = await pool.query(`SELECT *, ${deptCol} FROM ${tableName} WHERE id = $1`, [employee_id]);
    if (empRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const emp = empRes.rows[0];

    // 2. Get employee settings
    let empSetQuery = `SELECT * FROM employee_leave_settings WHERE employee_id = $1 AND user_type = $2`;
    const empSetRes = await pool.query(empSetQuery, [employee_id, user_type]);
    
    let settings = {
      leaves_per_month: 0,
      late_checkin_limit: 0,
      early_checkout_limit: 0,
      extra_leave_penalty: 0,
      late_checkin_penalty: 0,
      early_checkout_penalty: 0,
    };
    if (empSetRes.rows.length > 0) settings = empSetRes.rows[0];

    // 3. Fetch approved leaves for this month
    const leavesListRes = await pool.query(`
      SELECT start_date, end_date FROM leave_requests
      WHERE employee_id = $1 AND user_type = $3 AND status = 'approved'
      AND (TO_CHAR(start_date, 'YYYY-MM') = $2 OR TO_CHAR(end_date, 'YYYY-MM') = $2)
    `, [employee_id, month, user_type]);

    const approvedLeaveDays = new Set();
    leavesListRes.rows.forEach(lr => {
        const start = new Date(lr.start_date);
        const end = new Date(lr.end_date);
        for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (d.getMonth() === m && d.getFullYear() === year) {
                if (d.getDay() !== 0) { // Exclude Sundays from approved leaves
                    approvedLeaveDays.add(d.getDate());
                }
            }
        }
    });
    const approved_leaves_count = approvedLeaveDays.size;

    // 4. Calculate attendance and missing days (absents)
    let late_count = 0;
    let early_count = 0;
    let missingDays = 0;

    if (month <= currentMonthStr) {
      // Fetch holidays for the department
      const holidaysRes = await pool.query(
        `SELECT date FROM holidays WHERE (department = $1 OR department = 'All') AND TO_CHAR(date, 'YYYY-MM') = $2`,
        [emp.department, month]
      );
      const holidaySet = new Set(holidaysRes.rows.map(r => new Date(r.date).getDate()));

      // Fetch attendance
      const attendanceRes = await pool.query(`
        SELECT date, timestamp, checkout_timestamp, late_duration, early_checkout_duration 
        FROM attendance 
        WHERE employee_id = $1 AND user_type = $3 AND TO_CHAR(date, 'YYYY-MM') = $2
      `, [employee_id, month, user_type]);

      const attendedDays = new Set(attendanceRes.rows.map(att => new Date(att.date).getDate()));

      // Parse shift times
      let shiftInMin = null;
      let shiftOutMin = null;
      try {
        if (emp.profile_data) {
          const pd = JSON.parse(emp.profile_data);
          if (pd.shiftIn) {
            const [h, m] = pd.shiftIn.split(':').map(Number);
            shiftInMin = h * 60 + m;
          }
          if (pd.shiftOut) {
            const [h, m] = pd.shiftOut.split(':').map(Number);
            shiftOutMin = h * 60 + m;
          }
        }
      } catch(e) {}

      // Calculate late checkins & early checkouts
      attendanceRes.rows.forEach(att => {
        let isLate = false;
        let isEarly = false;
        
        if (att.late_duration && att.late_duration !== '0h 0m' && att.late_duration !== '') {
           isLate = true;
        } else if (shiftInMin !== null && att.timestamp) {
           const t = new Date(att.timestamp);
           const tStr = t.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
           const [h, m] = tStr.split(':').map(Number);
           if ((h * 60 + m) > shiftInMin) isLate = true;
        }
        
        if (att.early_checkout_duration && att.early_checkout_duration !== '0h 0m' && att.early_checkout_duration !== '') {
           isEarly = true;
        } else if (shiftOutMin !== null && att.checkout_timestamp) {
           const t = new Date(att.checkout_timestamp);
           const tStr = t.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
           const [h, m] = tStr.split(':').map(Number);
           if ((h * 60 + m) < shiftOutMin) isEarly = true;
        }
        
        if (isLate) late_count++;
        if (isEarly) early_count++;
      });

      // Calculate missing days (absents)
      // If it is the current month, only calculate up to yesterday
      const limitDay = (month === currentMonthStr) ? tDay : daysInMonth + 1;
      for (let day = 1; day < limitDay; day++) {
          const dateObj = new Date(year, m, day);
          const isSunday = dateObj.getDay() === 0;
          if (!isSunday && !holidaySet.has(day)) {
              if (!attendedDays.has(day) && !approvedLeaveDays.has(day)) {
                  missingDays++;
              }
          }
      }
    }

    const actual_leaves = approved_leaves_count + missingDays;

    res.status(200).json({
      limits: {
        leaves: settings.leaves_per_month,
        late_checkins: settings.late_checkin_limit,
        early_checkouts: settings.early_checkout_limit
      },
      penalties: {
        extra_leave: settings.extra_leave_penalty,
        late_checkin: settings.late_checkin_penalty,
        early_checkout: settings.early_checkout_penalty
      },
      usage: {
        leaves: actual_leaves,
        late_checkins: late_count,
        early_checkouts: early_count
      }
    });
  } catch (error) {
    console.error('Error getting leave summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
