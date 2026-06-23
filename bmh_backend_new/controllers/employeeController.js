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

    const insertResult = await pool.query(
      'INSERT INTO employees (full_name, email, password, department, role, status, profile_data) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [full_name, email, password, department, role, 'pending', profile_data ? JSON.stringify(profile_data) : null]
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
