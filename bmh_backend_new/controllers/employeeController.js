const pool = require('../db');

exports.getAllEmployees = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Server error fetching employees' });
  }
};

exports.getEmployeesByDepartment = async (req, res) => {
  try {
    const { dept_id } = req.params;
    const result = await pool.query('SELECT * FROM employees WHERE department = (SELECT name FROM departments WHERE id = $1) ORDER BY created_at DESC', [dept_id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employees by dept:', error);
    res.status(500).json({ success: false, message: 'Server error fetching employees' });
  }
};

exports.addEmployee = async (req, res) => {
  try {
    const { full_name, email, password, department, role, profile_data } = req.body;

    const mobile = profile_data && profile_data.mobile ? profile_data.mobile : null;
    
    // Remove mobile from profile_data so it isn't stored twice (since it has its own column)
    const storedProfileData = profile_data ? { ...profile_data } : null;
    if (storedProfileData && storedProfileData.mobile) {
      delete storedProfileData.mobile;
    }

    const insertResult = await pool.query(
      'INSERT INTO employees (full_name, email, password, department, role, status, profile_data, mobile) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [full_name, email, password, department, role, 'pending', storedProfileData ? JSON.stringify(storedProfileData) : null, mobile]
    );

    res.status(201).json({ success: true, data: insertResult.rows[0] });
  } catch (error) {
    console.error('Error creating employee:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error creating employee' });
  }
};

exports.loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM employees WHERE email = $1 AND password = $2', [email, password]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (user.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error logging in employee:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE employees SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, message: 'Employee status updated', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating employee status:', error);
    res.status(500).json({ success: false, message: 'Server error updating employee status' });
  }
};

exports.updateEmployeePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    const currentResult = await pool.query('SELECT password FROM employees WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (currentResult.rows[0].password !== oldPassword) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    await pool.query('UPDATE employees SET password = $1 WHERE id = $2', [newPassword, id]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating employee password:', error);
    res.status(500).json({ success: false, message: 'Server error updating password' });
  }
};

exports.updateEmployeeProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { profile_data } = req.body;

    const result = await pool.query(
      'UPDATE employees SET profile_data = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(profile_data), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, message: 'Profile updated', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating employee profile:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

exports.getDepartmentPeers = async (req, res) => {
  try {
    const { id } = req.params; // The employee's ID
    let departmentName;
    
    if (id.startsWith('SA-')) {
      const numericId = id.replace('SA-', '');
      const dRes = await pool.query(
        'SELECT d.name FROM departments d JOIN department_admins da ON d.id = da.department_id WHERE da.id = $1', 
        [numericId]
      );
      if (dRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Sub-admin not found' });
      departmentName = dRes.rows[0].name;
    } else {
      const eRes = await pool.query('SELECT department FROM employees WHERE id = $1', [id]);
      if (eRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Employee not found' });
      departmentName = eRes.rows[0].department;
    }

    // 1. Fetch employees in this department (keep id as string)
    const empResult = await pool.query(
      "SELECT id::text, full_name, email, role, department FROM employees WHERE department = $1 AND id != $2 AND status = 'approved'",
      [departmentName, id]
    );

    // 2. Fetch department admins in this department (prefix id with SA-)
    const adminResult = await pool.query(
      `SELECT 'SA-' || da.id as id, da.full_name, da.email, 'subadmin' as role, d.name as department 
       FROM department_admins da
       JOIN departments d ON da.department_id = d.id
       WHERE d.name = $1 AND da.status = 'approved'`,
       [departmentName]
    );

    // Merge both
    const peers = [...empResult.rows, ...adminResult.rows];

    res.json({ success: true, data: peers });
  } catch (error) {
    console.error('Error fetching peers:', error);
    res.status(500).json({ success: false, message: 'Server error fetching peers' });
  }
};
