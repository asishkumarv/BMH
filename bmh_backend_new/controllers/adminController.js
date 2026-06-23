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

exports.addAdmin = async (req, res) => {
  try {
    const { full_name, email, password, department_id, profile_data } = req.body;
    
    // In a real app we would hash the password with bcrypt, but storing as plain text for this demo based on previous setup
    const insertResult = await pool.query(
      'INSERT INTO department_admins (full_name, email, password, department_id, status, profile_data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [full_name, email, password, department_id, 'pending', profile_data ? JSON.stringify(profile_data) : null]
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
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM department_admins WHERE email = $1 AND password = $2', [email, password]);
    
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
    const { email, password } = req.body;
    
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
    const tasksResult = await pool.query('SELECT status, COUNT(*) FROM tasks WHERE department_id = $1 GROUP BY status', [department_id]);
    let pendingTasks = 0;
    let completedTasks = 0;
    tasksResult.rows.forEach(row => {
      if (row.status === 'pending') pendingTasks = parseInt(row.count, 10);
      if (row.status === 'completed') completedTasks = parseInt(row.count, 10);
    });

    // 3. Get attendance count for today
    const attendanceResult = await pool.query(`
      SELECT status, COUNT(*) 
      FROM attendance 
      WHERE department_id = $1 AND date = CURRENT_DATE 
      GROUP BY status
    `, [department_id]);
    
    let presentCount = 0;
    let absentCount = 0;
    attendanceResult.rows.forEach(row => {
      if (row.status === 'present') presentCount = parseInt(row.count, 10);
      if (row.status === 'absent') absentCount = parseInt(row.count, 10);
    });

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
