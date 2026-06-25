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

    // Role settings
    let roleQuery = 'SELECT * FROM role_leave_settings';
    let roleValues = [];
    if (department && department !== 'All') {
      roleQuery += ' WHERE department = $1 OR department = $2';
      roleValues.push(department, 'All');
    }
    const roleRes = await pool.query(roleQuery, roleValues);

    res.status(200).json({
      departmentSettings: depRes.rows,
      roleSettings: roleRes.rows,
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

// Update role settings
exports.updateRoleSettings = async (req, res) => {
  try {
    const {
      department, role, leaves_per_month, extra_leave_penalty,
      late_checkin_limit, late_checkin_penalty,
      early_checkout_limit, early_checkout_penalty
    } = req.body;

    const query = `
      INSERT INTO role_leave_settings 
      (department, role, leaves_per_month, extra_leave_penalty, late_checkin_limit, late_checkin_penalty, early_checkout_limit, early_checkout_penalty)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (department, role) DO UPDATE
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
      department, role, leaves_per_month, extra_leave_penalty,
      late_checkin_limit, late_checkin_penalty, early_checkout_limit, early_checkout_penalty
    ];
    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating role settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// --- Requests ---

// Apply for leave (Employee)
exports.applyLeave = async (req, res) => {
  try {
    const { employee_id, start_date, end_date, reason } = req.body;

    // Get employee department
    const empRes = await pool.query('SELECT department FROM employees WHERE id = $1', [employee_id]);
    if (empRes.rows.length === 0) return res.status(404).json({ message: 'Employee not found' });
    const department = empRes.rows[0].department;

    // Check max employees limit for the requested dates
    // For simplicity, we check if ANY of the days in the range exceed the limit.
    const depSetRes = await pool.query('SELECT max_employees_leave_per_day FROM department_leave_settings WHERE department = $1', [department]);
    const maxLeaves = depSetRes.rows.length > 0 ? depSetRes.rows[0].max_employees_leave_per_day : 9999; // Default large if not set

    // Check active approved leaves overlapping with these dates
    const overlapRes = await pool.query(`
      SELECT lr.*, e.department 
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE e.department = $1 AND lr.status = 'approved'
        AND (lr.start_date <= $3 AND lr.end_date >= $2)
    `, [department, start_date, end_date]);

    if (overlapRes.rows.length >= maxLeaves) {
      return res.status(400).json({ message: 'Leave limit for that date exceeded' });
    }

    const query = `
      INSERT INTO leave_requests (employee_id, start_date, end_date, reason)
      VALUES ($1, $2, $3, $4) RETURNING *;
    `;
    const result = await pool.query(query, [employee_id, start_date, end_date, reason]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error applying for leave:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get requests (Admin/Sub-admin or Employee)
exports.getRequests = async (req, res) => {
  try {
    const { employee_id, department, month } = req.query; // If employee_id is passed, get for that employee. If department, for department.
    
    let query = `
      SELECT lr.*, e.full_name, e.department, e.role 
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE 1=1
    `;
    let values = [];
    let idx = 1;

    if (employee_id) {
      query += ` AND lr.employee_id = $${idx++}`;
      values.push(employee_id);
    }
    if (department && department !== 'All') {
      query += ` AND e.department = $${idx++}`;
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
    const { employee_id, month } = req.body; // Month format 'YYYY-MM'
    
    // 1. Get employee data
    const empRes = await pool.query('SELECT * FROM employees WHERE id = $1', [employee_id]);
    if (empRes.rows.length === 0) return res.status(404).json({ message: 'Employee not found' });
    const emp = empRes.rows[0];
    
    // Extract base_salary from profile_data
    let base_salary = 0;
    try {
      if (emp.profile_data) {
        const pd = JSON.parse(emp.profile_data);
        if (pd.salary) base_salary = parseFloat(pd.salary) || 0;
      }
    } catch (e) {}

    // 2. Get role settings
    // Check specific role first, then 'All' roles for department, then 'All' departments
    let roleQuery = `SELECT * FROM role_leave_settings WHERE (department = $1 OR department = 'All') AND (role = $2 OR role = 'All') ORDER BY department DESC, role DESC LIMIT 1`;
    const roleSetRes = await pool.query(roleQuery, [emp.department, emp.role]);
    
    let settings = {
      leaves_per_month: 0, extra_leave_penalty: 0,
      late_checkin_limit: 0, late_checkin_penalty: 0,
      early_checkout_limit: 0, early_checkout_penalty: 0
    };
    if (roleSetRes.rows.length > 0) settings = roleSetRes.rows[0];

    // 3. Calculate actual leaves taken in this month
    const leavesRes = await pool.query(`
      SELECT SUM(end_date - start_date + 1) as total_leave_days
      FROM leave_requests 
      WHERE employee_id = $1 AND status = 'approved' 
      AND TO_CHAR(start_date, 'YYYY-MM') = $2
    `, [employee_id, month]);
    const actual_leaves = parseInt(leavesRes.rows[0].total_leave_days || 0);

    // 4. Calculate extra leaves
    const extra_leaves = Math.max(0, actual_leaves - settings.leaves_per_month);
    const salary_per_day = base_salary / 30; // Approximating month as 30 days
    const extra_leave_deduction = extra_leaves * (salary_per_day + parseFloat(settings.extra_leave_penalty || 0));

    // 5. Calculate late checkins & early checkouts from attendance
    const attendanceRes = await pool.query(`
      SELECT late_duration, early_checkout_duration 
      FROM attendance 
      WHERE employee_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
    `, [employee_id, month]);

    let late_count = 0;
    let early_count = 0;
    attendanceRes.rows.forEach(att => {
      // If late_duration exists and > 0, count as late
      if (att.late_duration && att.late_duration !== '0h 0m' && att.late_duration !== '') {
         // Could parse further, but if it has a non-zero string, it's late.
         late_count++;
      }
      if (att.early_checkout_duration && att.early_checkout_duration !== '0h 0m' && att.early_checkout_duration !== '') {
         early_count++;
      }
    });

    const extra_late = Math.max(0, late_count - settings.late_checkin_limit);
    const late_checkin_deduction = extra_late * settings.late_checkin_penalty;

    const extra_early = Math.max(0, early_count - settings.early_checkout_limit);
    const early_checkout_deduction = extra_early * settings.early_checkout_penalty;

    const net_salary = base_salary - extra_leave_deduction - late_checkin_deduction - early_checkout_deduction;

    // 6. Save or update payslip
    const psQuery = `
      INSERT INTO payslips (employee_id, month, base_salary, extra_leave_deduction, late_checkin_deduction, early_checkout_deduction, net_salary)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (employee_id, month) DO UPDATE
      SET base_salary = EXCLUDED.base_salary,
          extra_leave_deduction = EXCLUDED.extra_leave_deduction,
          late_checkin_deduction = EXCLUDED.late_checkin_deduction,
          early_checkout_deduction = EXCLUDED.early_checkout_deduction,
          net_salary = EXCLUDED.net_salary
      RETURNING *;
    `;
    const psResult = await pool.query(psQuery, [employee_id, month, base_salary, extra_leave_deduction, late_checkin_deduction, early_checkout_deduction, net_salary]);
    
    res.status(200).json(psResult.rows[0]);
  } catch (error) {
    console.error('Error generating payslip:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getPayslips = async (req, res) => {
  try {
    const { employee_id, month } = req.query;
    let query = 'SELECT p.*, e.full_name, e.department, e.role FROM payslips p JOIN employees e ON p.employee_id = e.id WHERE 1=1';
    let values = [];
    let idx = 1;
    if (employee_id) {
      query += ` AND p.employee_id = $${idx++}`;
      values.push(employee_id);
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
