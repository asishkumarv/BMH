const pool = require('../db');

// Request a profile update (for employees and sub-admins)
exports.requestProfileUpdate = async (req, res) => {
  try {
    // Determine user type from token or request body. Let's assume frontend sends it.
    const { user_type, user_id, requested_data, department_name } = req.body;

    if (!user_type || !user_id || !requested_data) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check if there is already a pending request
    const pendingRes = await pool.query(
      'SELECT id FROM profile_update_requests WHERE user_type = $1 AND user_id = $2 AND status = $3',
      [user_type, user_id, 'pending']
    );

    if (pendingRes.rows.length > 0) {
      // Update existing pending request
      await pool.query(
        'UPDATE profile_update_requests SET requested_data = $1 WHERE id = $2',
        [JSON.stringify(requested_data), pendingRes.rows[0].id]
      );
    } else {
      // Insert new request
      await pool.query(
        'INSERT INTO profile_update_requests (user_type, user_id, department_name, requested_data, status) VALUES ($1, $2, $3, $4, $5)',
        [user_type, user_id, department_name, JSON.stringify(requested_data), 'pending']
      );
    }

    res.status(201).json({ success: true, message: 'Profile update requested successfully. Pending approval.' });
  } catch (error) {
    console.error('Error requesting profile update:', error);
    res.status(500).json({ success: false, message: 'Server error requesting profile update' });
  }
};

// Get all pending requests for Super Admin or Sub Admin
exports.getPendingRequests = async (req, res) => {
  try {
    const { department_name } = req.query; // If provided, filter by department (for Sub Admins)
    let query = 'SELECT * FROM profile_update_requests WHERE status = $1';
    let params = ['pending'];

    if (department_name) {
      query += ' AND department_name = $2 AND user_type = $3';
      params.push(department_name, 'employee');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    
    // Enrich the data with user name, email, and current profile_data
    const enrichedData = await Promise.all(result.rows.map(async (request) => {
      let tableName = request.user_type === 'sub_admin' ? 'department_admins' : 'employees';
      let userQuery = `SELECT full_name, email, profile_data FROM ${tableName} WHERE id = $1`;
      
      try {
        const userResult = await pool.query(userQuery, [request.user_id]);
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          let currentProfileData = {};
          if (user.profile_data) {
             currentProfileData = typeof user.profile_data === 'string' ? JSON.parse(user.profile_data) : user.profile_data;
          }
          return {
            ...request,
            user_name: user.full_name,
            user_email: user.email,
            current_data: currentProfileData
          };
        }
      } catch(e) {
        console.error("Error fetching user data for request", request.id);
      }
      return request;
    }));

    res.json({ success: true, data: enrichedData });
  } catch (error) {
    console.error('Error fetching pending profile requests:', error);
    res.status(500).json({ success: false, message: 'Server error fetching requests' });
  }
};

// Approve or Reject a profile update request
exports.reviewProfileUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Get the request
    const reqRes = await pool.query('SELECT * FROM profile_update_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const updateRequest = reqRes.rows[0];

    if (status === 'approved') {
      // Apply the updates to the respective table
      const tableName = updateRequest.user_type === 'sub_admin' ? 'department_admins' : 'employees';
      const updates = updateRequest.requested_data;
      
      // Update basic columns if they exist in the payload
      const basicColumns = ['mobile', 'image', 'schedule_in', 'schedule_out', 'break_in', 'break_out', 'weekly_off_days', 'full_name', 'email', 'department', 'department_id', 'role'];
      let setClauses = [];
      let params = [];
      let paramIndex = 1;

      for (const col of basicColumns) {
        if (updates[col] !== undefined) {
          setClauses.push(`${col} = $${paramIndex++}`);
          params.push(updates[col]);
          delete updates[col]; // Remove from JSON so we can merge the rest into profile_data
        }
      }

      // If there are leftover keys, they belong in profile_data JSON
      if (Object.keys(updates).length > 0) {
        // Fetch current profile_data
        const currentUser = await pool.query(`SELECT profile_data FROM ${tableName} WHERE id = $1`, [updateRequest.user_id]);
        let currentProfileData = {};
        if (currentUser.rows.length > 0 && currentUser.rows[0].profile_data) {
          currentProfileData = typeof currentUser.rows[0].profile_data === 'string' 
            ? JSON.parse(currentUser.rows[0].profile_data) 
            : currentUser.rows[0].profile_data;
        }

        // Merge
        const newProfileData = { ...currentProfileData, ...updates };
        setClauses.push(`profile_data = $${paramIndex++}`);
        params.push(JSON.stringify(newProfileData));
      }

      if (setClauses.length > 0) {
        params.push(updateRequest.user_id);
        await pool.query(
          `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
          params
        );
      }
    }

    // Mark request as processed
    await pool.query('UPDATE profile_update_requests SET status = $1 WHERE id = $2', [status, id]);

    res.json({ success: true, message: `Profile update ${status} successfully` });
  } catch (error) {
    console.error('Error reviewing profile request:', error);
    res.status(500).json({ success: false, message: 'Server error reviewing request' });
  }
};

// Get personal requests for an employee or sub_admin
exports.getMyRequests = async (req, res) => {
  try {
    const { user_type, user_id } = req.params;
    const result = await pool.query(
      'SELECT * FROM profile_update_requests WHERE user_type = $1 AND user_id = $2 ORDER BY created_at DESC',
      [user_type, user_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching personal profile requests:', error);
    res.status(500).json({ success: false, message: 'Server error fetching personal requests' });
  }
};
