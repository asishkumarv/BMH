const pool = require('../db');

exports.getAdmins = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM department_admins ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getSuperAdmins = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, full_name, email FROM super_admins ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching super admins:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.addAdmin = async (req, res) => {
  try {
    let { 
      full_name, email, password, department_id, 
      mobile, image, schedule_in, schedule_out, break_in, break_out, weekly_off_days,
      bank_account, blood_group, address, profile_data 
    } = req.body;
    if (email) email = email.toLowerCase();
    
    let finalProfileData = typeof profile_data === 'string' ? JSON.parse(profile_data) : (profile_data || {});
    if (bank_account) finalProfileData.bank_account = bank_account;
    if (blood_group) finalProfileData.blood_group = blood_group;
    if (address) finalProfileData.address = address;

    const insertResult = await pool.query(
      `INSERT INTO department_admins (
        full_name, email, password, department_id, status, 
        mobile, image, schedule_in, schedule_out, break_in, break_out, weekly_off_days, profile_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        full_name, email, password, department_id, 'pending',
        mobile, image, schedule_in, schedule_out, break_in, break_out, weekly_off_days,
        Object.keys(finalProfileData).length > 0 ? JSON.stringify(finalProfileData) : null
      ]
    );

    res.status(201).json({ success: true, data: insertResult.rows[0] });
  } catch (error) {
    console.error('Error creating admin:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error creating admin' });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (email) email = email.toLowerCase();
    
    const result = await pool.query(`
      SELECT a.*, d.name as department 
      FROM department_admins a 
      LEFT JOIN departments d ON a.department_id = d.id 
      WHERE a.email = $1 AND a.password = $2
    `, [email, password]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (user.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error logging in admin:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

exports.loginSuperAdmin = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (email) email = email.toLowerCase();
    
    const result = await pool.query('SELECT * FROM super_admins WHERE email = $1 AND password = $2', [email, password]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error logging in super admin:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

exports.getDepartmentMetrics = async (req, res) => {
  try {
    const { department_id } = req.params;

    // 1. Get employees count
    const empResult = await pool.query('SELECT COUNT(*) FROM employees WHERE department = (SELECT name FROM departments WHERE id = $1)', [department_id]);
    const totalEmployees = parseInt(empResult.rows[0].count, 10);

    // 2. Get tasks count
    const tasksResult = await pool.query('SELECT status, COUNT(*) FROM tasks WHERE department = (SELECT name FROM departments WHERE id = $1) GROUP BY status', [department_id]);
    let pendingTasks = 0;
    let completedTasks = 0;
    tasksResult.rows.forEach(row => {
      const statusLower = (row.status || '').toLowerCase();
      if (['pending', 'assigned', 'in_progress', 'accepted'].includes(statusLower)) pendingTasks += parseInt(row.count, 10);
      if (statusLower === 'completed') completedTasks += parseInt(row.count, 10);
    });

    // 3. Get attendance count for today
    const attendanceResult = await pool.query(`
      SELECT a.status, COUNT(*) 
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE e.department = (SELECT name FROM departments WHERE id = $1) 
        AND a.date = CURRENT_DATE 
        AND a.user_type = 'employee'
      GROUP BY a.status
    `, [department_id]);
    
    let presentCount = 0;
    attendanceResult.rows.forEach(row => {
      const s = (row.status || '').toLowerCase();
      if (['on duty', 'checked out', 'on break', 'half day', 'present', 'early_checkout', 'late_checkin'].includes(s)) {
        presentCount += parseInt(row.count, 10);
      }
    });

    let absentCount = totalEmployees - presentCount;
    if (absentCount < 0) absentCount = 0;

    res.json({
      success: true,
      data: {
        totalEmployees,
        pendingTasks,
        completedTasks,
        presentCount,
        absentCount
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ success: false, message: 'Server error fetching metrics' });
  }
};

exports.updateAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE department_admins SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({ success: true, message: 'Admin status updated', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating admin status:', error);
    res.status(500).json({ success: false, message: 'Server error updating admin status' });
  }
};

exports.updateSuperAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    const currentResult = await pool.query('SELECT password FROM super_admins WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Super admin not found' });
    }

    if (currentResult.rows[0].password !== oldPassword) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    await pool.query('UPDATE super_admins SET password = $1 WHERE id = $2', [newPassword, id]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating super admin password:', error);
    res.status(500).json({ success: false, message: 'Server error updating password' });
  }
};

exports.updateDepartmentAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    const currentResult = await pool.query('SELECT password FROM department_admins WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department admin not found' });
    }

    if (currentResult.rows[0].password !== oldPassword) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    await pool.query('UPDATE department_admins SET password = $1 WHERE id = $2', [newPassword, id]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating department admin password:', error);
    res.status(500).json({ success: false, message: 'Server error updating password' });
  }
};

exports.registerSuperAdmin = async (req, res) => {
  try {
    const { full_name, email, password, profile_data } = req.body;

    const insertResult = await pool.query(
      'INSERT INTO super_admins (full_name, email, password, profile_data) VALUES ($1, $2, $3, $4) RETURNING *',
      [full_name, email, password, profile_data ? JSON.stringify(profile_data) : null]
    );

    res.status(201).json({ success: true, data: insertResult.rows[0] });
  } catch (error) {
    console.error('Error creating super admin:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error creating super admin' });
  }
};

exports.updateSuperAdminProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { profile_data } = req.body;

    const result = await pool.query(
      'UPDATE super_admins SET profile_data = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(profile_data), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({ success: true, message: 'Profile updated', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

exports.updateDepartmentAdminProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { profile_data } = req.body;

    const result = await pool.query(
      'UPDATE department_admins SET profile_data = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(profile_data), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({ success: true, message: 'Profile updated', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

exports.getRevenueStats = async (req, res) => {
  try {
    // 1. Total Online Revenue
    const onlineRes = await pool.query("SELECT SUM(ds.fee) as total FROM patient_bookings pb JOIN doctor_slots ds ON pb.slot_id = ds.id WHERE pb.payment_mode = 'Online'");
    const totalOnline = onlineRes.rows[0].total || 0;

    // 2. Total Cash Revenue
    const cashRes = await pool.query("SELECT SUM(ds.fee) as total FROM patient_bookings pb JOIN doctor_slots ds ON pb.slot_id = ds.id WHERE pb.payment_mode = 'Cash'");
    const totalCash = cashRes.rows[0].total || 0;

    // 3. Employee Wallet Cash Balances (Excluding Admins)
    const wRes = await pool.query("SELECT SUM(cash_in_hand) as total FROM employee_wallets WHERE employee_id NOT LIKE 'ADMIN-%'");
    const totalCashInWallets = wRes.rows[0].total || 0;

    // 4. Admin Vault Cash (Only Admins)
    const adminVaultRes = await pool.query("SELECT SUM(cash_in_hand) as total FROM employee_wallets WHERE employee_id LIKE 'ADMIN-%'");
    const adminVaultAmount = adminVaultRes.rows[0].total || 0;

    // 5. Pending Cash Handovers
    const pRes = await pool.query("SELECT SUM(amount) as total FROM cash_handovers WHERE status = 'Pending'");
    const totalPendingHandovers = pRes.rows[0].total || 0;

    res.json({
      success: true,
      data: {
        totalOnline,
        totalCash,
        totalCashInWallets,
        adminVaultAmount,
        totalPendingHandovers
      }
    });
  } catch (error) {
    console.error('Error getting revenue stats:', error);
    res.status(500).json({ success: false, message: 'Server error fetching revenue stats' });
  }
};

exports.getAllWalletBalances = async (req, res) => {
  try {
    const query = `
      SELECT 
        CASE WHEN ew.employee_id = e.id::text THEN 'EMP-' || e.id ELSE ew.employee_id END as employee_id,
        ew.balance, ew.cash_in_hand,
        COALESCE(e.full_name, sa.full_name, a.full_name) as full_name,
        COALESCE(e.role, 'Sub Admin') as role,
        COALESCE(e.department, d.name) as department
      FROM employee_wallets ew
      LEFT JOIN employees e ON ew.employee_id = 'EMP-' || e.id OR ew.employee_id = e.id::text
      LEFT JOIN department_admins sa ON ew.employee_id = 'SA-' || sa.id
      LEFT JOIN departments d ON sa.department_id = d.id
      LEFT JOIN super_admins a ON ew.employee_id = 'ADMIN-' || a.id
      WHERE ew.employee_id NOT LIKE 'ADMIN-%'
      ORDER BY ew.cash_in_hand DESC
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching wallet balances' });
  }
};

exports.getDepartmentWalletBalances = async (req, res) => {
  try {
    const { department_id } = req.params;
    
    // First, get the department name based on ID
    const deptResult = await pool.query('SELECT name FROM departments WHERE id = $1', [department_id]);
    if (deptResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    const departmentName = deptResult.rows[0].name;

    const query = `
      SELECT 
        CASE WHEN ew.employee_id = e.id::text THEN 'EMP-' || e.id ELSE ew.employee_id END as employee_id,
        ew.balance, ew.cash_in_hand,
        e.full_name, e.role
      FROM employee_wallets ew
      JOIN employees e ON ew.employee_id = 'EMP-' || e.id OR ew.employee_id = e.id::text
      WHERE e.department = $1
      ORDER BY ew.cash_in_hand DESC
    `;
    const result = await pool.query(query, [departmentName]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getting department wallet balances:', error);
    res.status(500).json({ success: false, message: 'Server error fetching department wallet balances' });
  }
};

exports.getAllOrdersForAssignment = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        let dateFilter = '';
        let queryParams = [];
        
        if (fromDate && toDate) {
            dateFilter = 'WHERE DATE(created_at) >= $1 AND DATE(created_at) <= $2';
            queryParams = [fromDate, toDate];
        }

        const onlineOrders = await pool.query(
            `SELECT id, 'online_order' as type, status, total_amount, patient_name, patient_mobile as mobile_no, manual_address as address, map_lat, map_lng, delivery_boy_id, created_at, 'Local' as delivery_type FROM online_orders ${dateFilter} ORDER BY created_at DESC`,
            queryParams
        );
        const salesOrders = await pool.query(
            `SELECT id, 'sales_order' as type, status, order_total as total_amount, patient_name, mobile_no, patient_address as address, NULL as map_lat, NULL as map_lng, delivery_boy_id, created_at, delivery_type FROM ecogreen_sales_orders ${dateFilter} ORDER BY created_at DESC`,
            queryParams
        );
        const purchaseOrders = await pool.query(
            `SELECT id, 'purchase_order' as type, status, total as total_amount, custname as patient_name, NULL as mobile_no, address, NULL as map_lat, gps_location as map_lng, delivery_boy_id, created_at, delivery_type FROM ecogreenpurchase_orders ${dateFilter} ORDER BY created_at DESC`,
            queryParams
        );
        const allOrders = [...onlineOrders.rows, ...salesOrders.rows, ...purchaseOrders.rows];
        allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        res.json({ success: true, data: allOrders });
    } catch (error) {
        console.error('Error fetching all orders for assignment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

