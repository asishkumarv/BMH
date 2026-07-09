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

    // Employee and Global settings
    let empQuery = `
      SELECT els.*,
             (CASE 
               WHEN els.employee_id = 0 THEN 
                 (CASE 
                   WHEN els.user_type = 'employee' THEN 'All Employees'
                   WHEN els.user_type = 'sub_admin' THEN 'All Sub Admins'
                   WHEN els.user_type = 'delivery_boy' THEN 'All Delivery Boys'
                   ELSE 'All Users'
                 END)
               ELSE COALESCE(u.full_name, 'N/A')
              END) as employee_name,
             (CASE 
               WHEN els.employee_id = 0 THEN 'All'
               ELSE COALESCE(u.department, 'All')
              END) as department,
             (CASE 
               WHEN els.employee_id = 0 THEN 
                 (CASE 
                   WHEN els.user_type = 'employee' THEN 'Employee'
                   WHEN els.user_type = 'sub_admin' THEN 'Sub Admin'
                   WHEN els.user_type = 'delivery_boy' THEN 'Delivery Boy'
                   ELSE 'User'
                 END)
               ELSE COALESCE(u.role, 'N/A')
             END) as role
      FROM employee_leave_settings els
      LEFT JOIN (
        SELECT id, full_name, department, role, 
               (CASE WHEN role = 'Delivery Boy' OR department = 'Delivery' THEN 'delivery_boy' ELSE 'employee' END) as user_type 
        FROM employees
        UNION ALL
        SELECT id, full_name, (SELECT name FROM departments WHERE id = department_admins.department_id) as department, 'Sub Admin' as role, 'sub_admin' as user_type 
        FROM department_admins
      ) u ON els.employee_id = u.id AND els.user_type = u.user_type
    `;
    let empValues = [];
    if (department && department !== 'All') {
      empQuery += ' WHERE (u.department = $1 OR els.employee_id = 0)';
      empValues.push(department);
    }
    
    empQuery += ' ORDER BY els.employee_id ASC, els.id DESC';
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

    let finalUserType = user_type;
    if (user_type === 'employee') {
      const roleCheck = await pool.query('SELECT role, department FROM employees WHERE id = $1', [employee_id]);
      if (roleCheck.rows.length > 0) {
        const emp = roleCheck.rows[0];
        if (emp.role === 'Delivery Boy' || emp.department === 'Delivery') {
          finalUserType = 'delivery_boy';
        }
      }
    }

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
      employee_id, finalUserType, leaves_per_month, extra_leave_penalty,
      late_checkin_limit, late_checkin_penalty, early_checkout_limit, early_checkout_penalty
    ];
    const result = await pool.query(query, values);

    // If employee_id is 0 (global settings), propagate the changes to existing individual settings of that user_type
    if (parseInt(employee_id) === 0) {
      const propagateQuery = `
        UPDATE employee_leave_settings
        SET leaves_per_month = $1,
            extra_leave_penalty = $2,
            late_checkin_limit = $3,
            late_checkin_penalty = $4,
            early_checkout_limit = $5,
            early_checkout_penalty = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_type = $7 AND employee_id != 0;
      `;
      await pool.query(propagateQuery, [
        leaves_per_month, extra_leave_penalty,
        late_checkin_limit, late_checkin_penalty,
        early_checkout_limit, early_checkout_penalty,
        finalUserType
      ]);
    }

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
    const { employee_id, user_type = 'employee', start_date, end_date, reason, is_half_day = false, half_day_session = null } = req.body;

    let finalUserType = user_type;
    if (user_type === 'employee') {
      const roleCheck = await pool.query('SELECT role, department FROM employees WHERE id = $1', [employee_id]);
      if (roleCheck.rows.length > 0) {
        const emp = roleCheck.rows[0];
        if (emp.role === 'Delivery Boy' || emp.department === 'Delivery') {
          finalUserType = 'delivery_boy';
        }
      }
    }

    // Get employee department
    const tableName = finalUserType === 'sub_admin' ? 'department_admins' : 'employees';
    const deptCol = finalUserType === 'sub_admin' 
      ? '(SELECT name FROM departments WHERE id = department_admins.department_id) as department' 
      : 'department';
    const empRes = await pool.query(`SELECT ${deptCol} FROM ${tableName} WHERE id = $1`, [employee_id]);
    if (empRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const department = empRes.rows[0].department;

    // Check max employees limit for the requested dates
    const depSetRes = await pool.query('SELECT max_employees_leave_per_day FROM department_leave_settings WHERE department = $1', [department]);
    const maxLeaves = depSetRes.rows.length > 0 ? depSetRes.rows[0].max_employees_leave_per_day : 9999; // Default large if not set

    // Check active approved leaves overlapping with these dates
    const overlapRes = await pool.query(`
      SELECT lr.*, u.department
      FROM leave_requests lr
      JOIN (
        SELECT id, department, 
               (CASE WHEN role = 'Delivery Boy' OR department = 'Delivery' THEN 'delivery_boy' ELSE 'employee' END) as user_type 
        FROM employees
        UNION ALL
        SELECT id, (SELECT name FROM departments WHERE id = department_admins.department_id) as department, 'sub_admin' as user_type FROM department_admins
      ) u ON lr.employee_id = u.id AND lr.user_type = u.user_type
      WHERE u.department = $1 AND lr.status = 'approved'
        AND (lr.start_date <= $3 AND lr.end_date >= $2)
    `, [department, start_date, end_date]);

    let overlapCount = 0;
    overlapRes.rows.forEach(r => {
      if (r.is_half_day) {
        overlapCount += 0.5;
      } else {
        overlapCount += 1.0;
      }
    });

    if (overlapCount >= maxLeaves) {
      return res.status(400).json({ message: 'Leave limit for that date exceeded' });
    }

    const query = `
      INSERT INTO leave_requests (employee_id, user_type, start_date, end_date, reason, is_half_day, half_day_session)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `;
    const result = await pool.query(query, [employee_id, finalUserType, start_date, end_date, reason, is_half_day, half_day_session]);
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
      SELECT lr.*, u.full_name, u.department, u.role
      FROM leave_requests lr
      JOIN (
        SELECT id, full_name, department, role, 
               (CASE WHEN role = 'Delivery Boy' OR department = 'Delivery' THEN 'delivery_boy' ELSE 'employee' END) as user_type 
        FROM employees
        UNION ALL
        SELECT id, full_name, (SELECT name FROM departments WHERE id = department_admins.department_id) as department, 'Sub Admin' as role, 'sub_admin' as user_type 
        FROM department_admins
      ) u ON lr.employee_id = u.id AND lr.user_type = u.user_type
      WHERE 1=1
    `;
    let values = [];
    let idx = 1;

    if (employee_id && user_type) {
      let finalUserType = user_type;
      if (user_type === 'employee') {
        const roleCheck = await pool.query('SELECT role, department FROM employees WHERE id = $1', [employee_id]);
        if (roleCheck.rows.length > 0) {
          const emp = roleCheck.rows[0];
          if (emp.role === 'Delivery Boy' || emp.department === 'Delivery') {
            finalUserType = 'delivery_boy';
          }
        }
      }
      query += ` AND lr.employee_id = $${idx++} AND lr.user_type = $${idx++}`;
      values.push(employee_id, finalUserType);
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
    
    let finalUserType = user_type;
    if (user_type === 'employee') {
      const roleCheck = await pool.query('SELECT role, department FROM employees WHERE id = $1', [employee_id]);
      if (roleCheck.rows.length > 0) {
        const emp = roleCheck.rows[0];
        if (emp.role === 'Delivery Boy' || emp.department === 'Delivery') {
          finalUserType = 'delivery_boy';
        }
      }
    }

    // 1. Get employee data
    const tableName = finalUserType === 'sub_admin' ? 'department_admins' : 'employees';
    const deptCol = finalUserType === 'sub_admin' 
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
    const empSetRes = await pool.query(empSetQuery, [employee_id, finalUserType]);
    
    let settings = {
      leaves_per_month: null, extra_leave_penalty: 0,
      late_checkin_limit: 0, late_checkin_penalty: 0,
      early_checkout_limit: 0, early_checkout_penalty: 0
    };
    if (empSetRes.rows.length > 0) {
      settings = {
        ...empSetRes.rows[0],
        leaves_per_month: empSetRes.rows[0].leaves_per_month !== null ? parseInt(empSetRes.rows[0].leaves_per_month) : null
      };
    } else {
      // Fallback to global setting (where employee_id = 0)
      const globalSetRes = await pool.query(`SELECT * FROM employee_leave_settings WHERE employee_id = 0 AND user_type = $1`, [finalUserType]);
      if (globalSetRes.rows.length > 0) {
        settings = {
          ...globalSetRes.rows[0],
          leaves_per_month: globalSetRes.rows[0].leaves_per_month !== null ? parseInt(globalSetRes.rows[0].leaves_per_month) : null
        };
      }
    }

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
    `, [employee_id, month, finalUserType]);

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
      SELECT start_date, end_date, is_half_day FROM leave_requests
      WHERE employee_id = $1 AND user_type = $3 AND status = 'approved'
      AND (TO_CHAR(start_date, 'YYYY-MM') = $2 OR TO_CHAR(end_date, 'YYYY-MM') = $2)
    `, [employee_id, month, finalUserType]);

    // Map leave fractions per day of month (including Sundays!)
    const approvedLeavesMap = new Map();
    let approved_leaves_count = 0;
    leavesListRes.rows.forEach(lr => {
        const start = new Date(lr.start_date);
        const end = new Date(lr.end_date);
        if (lr.is_half_day) {
            if (start.getMonth() === m && start.getFullYear() === year) {
                approvedLeavesMap.set(start.getDate(), 0.5);
                approved_leaves_count += 0.5;
            }
        } else {
            for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (d.getMonth() === m && d.getFullYear() === year) {
                    approvedLeavesMap.set(d.getDate(), 1.0);
                    approved_leaves_count += 1.0;
                }
            }
        }
    });

    // Calculate missing days (absents) - including Sundays!
    let missingDays = 0;
    
    // If it is the current month, only calculate missing days up to yesterday (to avoid premature absent flags)
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const [tDay, tMonth, tYear] = todayStr.split('/').map(Number);
    const currentMonthStr = `${tYear}-${String(tMonth).padStart(2, '0')}`;
    const limitDay = (month === currentMonthStr) ? tDay : daysInMonth + 1;

    for (let day = 1; day < limitDay; day++) {
        const dateObj = new Date(year, m, day);
        if (!holidaySet.has(day)) {
            const leaveFraction = approvedLeavesMap.get(day) || 0;
            if (leaveFraction === 1.0) {
                // Full day approved leave, no absent counted
            } else if (leaveFraction === 0.5) {
                if (!attendedDays.has(day)) {
                    missingDays += 0.5; // Missed the other half of the day
                }
            } else {
                if (!attendedDays.has(day)) {
                    missingDays += 1.0; // Missed the whole day
                }
            }
        }
    }

    const actual_leaves = approved_leaves_count + missingDays;

    // Determine free leaves limit (custom settings vs dynamic month days default)
    const required_working_days = (settings.leaves_per_month !== null && settings.leaves_per_month !== undefined)
      ? settings.leaves_per_month 
      : 27;
    const leaves_limit = Math.max(0, daysInMonth - required_working_days);

    // Calculate extra leaves and deductions (using 27 required working days divisor!)
    const extra_leaves = Math.max(0, actual_leaves - leaves_limit);
    const salary_per_day = base_salary / 27; 
    const extra_leave_deduction = extra_leaves * (salary_per_day + parseFloat(settings.extra_leave_penalty || 0));

    const extra_late = Math.max(0, late_count - settings.late_checkin_limit);
    const late_checkin_deduction = extra_late * settings.late_checkin_penalty;

    const extra_early = Math.max(0, early_count - settings.early_checkout_limit);
    const early_checkout_deduction = extra_early * settings.early_checkout_penalty;

    let net_salary = base_salary - (extra_leave_deduction + late_checkin_deduction + early_checkout_deduction) + parseFloat(appreciation_amount) + parseFloat(extra_working_amount);
    if (net_salary < 0) net_salary = 0;

    // Compute total hours worked
    let totalWorkedSeconds = 0;
    attendanceRes.rows.forEach(att => {
        if (att.timestamp && att.checkout_timestamp) {
            const diffMs = new Date(att.checkout_timestamp) - new Date(att.timestamp);
            if (diffMs > 0) {
                totalWorkedSeconds += Math.floor(diffMs / 1000);
            }
        }
    });
    const totalWorkedHours = parseFloat((totalWorkedSeconds / 3600).toFixed(1));

    // Detailed breakdown
    const details = {
      base_salary,
      per_day_salary: salary_per_day.toFixed(2),
      total_worked_hours: totalWorkedHours,
      required_working_hours: 270,
      leaves: {
        total_taken: actual_leaves,
        free_limit: leaves_limit,
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
    const psResult = await pool.query(psQuery, [employee_id, finalUserType, month, base_salary, extra_leave_deduction, late_checkin_deduction, early_checkout_deduction, appreciation_amount, extra_working_amount, net_salary, JSON.stringify(details)]);
    
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
    
    let finalUserType = user_type;
    if (user_type === 'employee') {
      const roleCheck = await pool.query('SELECT role, department FROM employees WHERE id = $1', [employee_id]);
      if (roleCheck.rows.length > 0) {
        const emp = roleCheck.rows[0];
        if (emp.role === 'Delivery Boy' || emp.department === 'Delivery') {
          finalUserType = 'delivery_boy';
        }
      }
    }

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
    const tableName = finalUserType === 'sub_admin' ? 'department_admins' : 'employees';
    const deptCol = finalUserType === 'sub_admin' 
      ? '(SELECT name FROM departments WHERE id = department_admins.department_id) as department' 
      : 'department';
    const empRes = await pool.query(`SELECT *, ${deptCol} FROM ${tableName} WHERE id = $1`, [employee_id]);
    if (empRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const emp = empRes.rows[0];

    // 2. Get employee settings
    let empSetQuery = `SELECT * FROM employee_leave_settings WHERE employee_id = $1 AND user_type = $2`;
    const empSetRes = await pool.query(empSetQuery, [employee_id, finalUserType]);
    
    let settings = {
      leaves_per_month: null,
      late_checkin_limit: 0,
      early_checkout_limit: 0,
      extra_leave_penalty: 0,
      late_checkin_penalty: 0,
      early_checkout_penalty: 0,
    };
    if (empSetRes.rows.length > 0) {
      settings = {
        ...empSetRes.rows[0],
        leaves_per_month: empSetRes.rows[0].leaves_per_month !== null ? parseInt(empSetRes.rows[0].leaves_per_month) : null
      };
    } else {
      // Fallback to global setting (where employee_id = 0)
      const globalSetRes = await pool.query(`SELECT * FROM employee_leave_settings WHERE employee_id = 0 AND user_type = $1`, [finalUserType]);
      if (globalSetRes.rows.length > 0) {
        settings = {
          ...globalSetRes.rows[0],
          leaves_per_month: globalSetRes.rows[0].leaves_per_month !== null ? parseInt(globalSetRes.rows[0].leaves_per_month) : null
        };
      }
    }

    // 3. Fetch approved leaves for this month
    const leavesListRes = await pool.query(`
      SELECT start_date, end_date, is_half_day FROM leave_requests
      WHERE employee_id = $1 AND user_type = $3 AND status = 'approved'
      AND (TO_CHAR(start_date, 'YYYY-MM') = $2 OR TO_CHAR(end_date, 'YYYY-MM') = $2)
    `, [employee_id, month, finalUserType]);

    // Map leave fractions per day of month (including Sundays!)
    const approvedLeavesMap = new Map();
    let approved_leaves_count = 0;
    leavesListRes.rows.forEach(lr => {
        const start = new Date(lr.start_date);
        const end = new Date(lr.end_date);
        if (lr.is_half_day) {
            if (start.getMonth() === m && start.getFullYear() === year) {
                approvedLeavesMap.set(start.getDate(), 0.5);
                approved_leaves_count += 0.5;
            }
        } else {
            for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (d.getMonth() === m && d.getFullYear() === year) {
                    approvedLeavesMap.set(d.getDate(), 1.0);
                    approved_leaves_count += 1.0;
                }
            }
        }
    });

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
      `, [employee_id, month, finalUserType]);

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

      // Calculate missing days (absents) - including Sundays!
      const limitDay = (month === currentMonthStr) ? tDay : daysInMonth + 1;
      for (let day = 1; day < limitDay; day++) {
          const dateObj = new Date(year, m, day);
          if (!holidaySet.has(day)) {
              const leaveFraction = approvedLeavesMap.get(day) || 0;
              if (leaveFraction === 1.0) {
                  // Full day approved leave
              } else if (leaveFraction === 0.5) {
                  if (!attendedDays.has(day)) {
                      missingDays += 0.5; // Missed the other half of the day
                  }
              } else {
                  if (!attendedDays.has(day)) {
                      missingDays += 1.0; // Missed the whole day
                  }
              }
          }
      }
    }

    const actual_leaves = approved_leaves_count + missingDays;

    const required_working_days = (settings.leaves_per_month !== null && settings.leaves_per_month !== undefined)
      ? settings.leaves_per_month 
      : 27;
    const leaves_limit = Math.max(0, daysInMonth - required_working_days);

    res.status(200).json({
      limits: {
        leaves: leaves_limit,
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
