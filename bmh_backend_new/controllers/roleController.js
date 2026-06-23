const pool = require('../db');

exports.getRoles = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles ORDER BY created_at DESC');
    const mappedRoles = result.rows.map(r => ({
      id: r.id.toString(),
      name: r.name,
      departmentId: r.department_id === null ? 'all' : r.department_id.toString(),
      created_at: r.created_at
    }));
    res.json({ success: true, data: mappedRoles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.addRole = async (req, res) => {
  try {
    const { name, departmentId } = req.body;
    if (!name || !departmentId) {
      return res.status(400).json({ success: false, message: 'Role name and departmentId are required' });
    }

    const deptIdVal = departmentId === 'all' ? null : parseInt(departmentId, 10);

    let checkResult;
    if (deptIdVal === null) {
      checkResult = await pool.query('SELECT * FROM roles WHERE name ILIKE $1 AND department_id IS NULL', [name]);
    } else {
      checkResult = await pool.query('SELECT * FROM roles WHERE name ILIKE $1 AND department_id = $2', [name, deptIdVal]);
    }

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Role already exists in this department' });
    }

    const insertResult = await pool.query(
      'INSERT INTO roles (name, department_id) VALUES ($1, $2) RETURNING *',
      [name, deptIdVal]
    );

    const newRole = insertResult.rows[0];
    res.status(201).json({ 
      success: true, 
      data: {
        id: newRole.id.toString(),
        name: newRole.name,
        departmentId: newRole.department_id === null ? 'all' : newRole.department_id.toString(),
        created_at: newRole.created_at
      }
    });
  } catch (error) {
    console.error('Error adding role:', error);
    res.status(500).json({ success: false, message: 'Server error adding role' });
  }
};
