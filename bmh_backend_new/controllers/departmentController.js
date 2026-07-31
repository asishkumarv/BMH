const pool = require('../db');

exports.getDepartments = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.addDepartment = async (req, res) => {
  try {
    const { name, description, type, required_employees, required_sub_admins } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    const checkResult = await pool.query('SELECT * FROM departments WHERE name ILIKE $1', [name]);
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Department already exists' });
    }

    const insertResult = await pool.query(
      'INSERT INTO departments (name, description, type, required_employees, required_sub_admins) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description || '', type || 'employee', parseInt(required_employees) || 0, parseInt(required_sub_admins) || 0]
    );

    res.status(201).json({ success: true, data: insertResult.rows[0] });
  } catch (error) {
    console.error('Error adding department:', error);
    res.status(500).json({ success: false, message: 'Server error adding department' });
  }
};

exports.updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, description, type, required_employees, required_sub_admins } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Department name is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current department details
    const currentDeptResult = await pool.query('SELECT * FROM departments WHERE id = $1', [id]);
    if (currentDeptResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const currentDeptName = currentDeptResult.rows[0].name;

    // Check if new name already exists for another department
    if (name.toLowerCase() !== currentDeptName.toLowerCase()) {
      const checkResult = await pool.query('SELECT * FROM departments WHERE name ILIKE $1 AND id <> $2', [name, id]);
      if (checkResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Department with this name already exists' });
      }
    }

    // Update the department
    const updateResult = await client.query(
      'UPDATE departments SET name = $1, description = $2, type = $3, required_employees = $4, required_sub_admins = $5 WHERE id = $6 RETURNING *',
      [name, description || '', type || 'employee', parseInt(required_employees) || 0, parseInt(required_sub_admins) || 0, id]
    );

    // If name changed, cascade update to other tables
    if (name !== currentDeptName) {
      await client.query('UPDATE employees SET department = $1 WHERE department = $2', [name, currentDeptName]);
      await client.query('UPDATE attendance SET department = $1 WHERE department = $2', [name, currentDeptName]);
      await client.query('UPDATE tasks SET department = $1 WHERE department = $2', [name, currentDeptName]);
      
      try {
        await client.query('UPDATE recurring_tasks SET department = $1 WHERE department = $2', [name, currentDeptName]);
      } catch (e) {
        console.error('recurring_tasks table update skipped:', e.message);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: updateResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating department:', error);
    res.status(500).json({ success: false, message: 'Server error updating department' });
  } finally {
    client.release();
  }
};

exports.deleteDepartment = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Get department details
    const deptResult = await pool.query('SELECT * FROM departments WHERE id = $1', [id]);
    if (deptResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    const deptName = deptResult.rows[0].name;

    // 2. Check if sub-admins exist
    const adminCheck = await pool.query('SELECT count(*) FROM department_admins WHERE department_id = $1', [id]);
    const adminCount = parseInt(adminCheck.rows[0].count, 10);

    // 3. Check if employees exist
    const employeeCheck = await pool.query('SELECT count(*) FROM employees WHERE department = $1', [deptName]);
    const employeeCount = parseInt(employeeCheck.rows[0].count, 10);

    // 4. Check if doctors exist
    const doctorCheck = await pool.query('SELECT count(*) FROM doctors WHERE department = $1', [deptName]);
    const doctorCount = parseInt(doctorCheck.rows[0].count, 10);

    if (adminCount > 0 || employeeCount > 0 || doctorCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. There are still ${adminCount} sub admins, ${employeeCount} employees, and ${doctorCount} doctors assigned to it.`
      });
    }

    // 5. Delete the department
    await pool.query('DELETE FROM departments WHERE id = $1', [id]);

    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ success: false, message: 'Server error deleting department' });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { name, lat, lng, radius } = req.body;
    if (!name || !lat || !lng || !radius) return res.status(400).json({ success: false, message: 'Missing fields' });
    if (name === 'All Departments') {
      await pool.query(
        'UPDATE departments SET allowed_latitude = $1, allowed_longitude = $2, allowed_radius = $3',
        [lat, lng, radius]
      );
    } else {
      await pool.query(
        'UPDATE departments SET allowed_latitude = $1, allowed_longitude = $2, allowed_radius = $3 WHERE name = $4',
        [lat, lng, radius, name]
      );
    }
    res.json({ success: true, message: 'Updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
};