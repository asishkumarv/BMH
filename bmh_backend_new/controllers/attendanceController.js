const pool = require('../db');
const rekognition = require('../utils/awsConfig');
const axios = require('axios');

// Haversine formula
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

exports.verifyLocation = async (req, res) => {
  try {
    const { employeeId, userType = 'employee', latitude, longitude } = req.body;

    if (!employeeId || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const tableName = userType === 'sub_admin' ? 'department_admins' : 'employees';
    const deptQuery = userType === 'sub_admin' 
      ? 'SELECT (SELECT name FROM departments WHERE id = department_admins.department_id) as department, status FROM department_admins WHERE id = $1'
      : 'SELECT department, status FROM employees WHERE id = $1';

    const empRes = await pool.query(deptQuery, [employeeId]);
    if (empRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    
    if (empRes.rows[0].status !== 'approved') {
      return res.status(403).json({ success: false, message: "Account is not active. Please contact administrator." });
    }
    const departmentName = empRes.rows[0].department;

    const deptRes = await pool.query('SELECT allowed_latitude, allowed_longitude, allowed_radius FROM departments WHERE name = $1', [departmentName]);
    if (deptRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    const { allowed_latitude, allowed_longitude, allowed_radius } = deptRes.rows[0];

    if (allowed_latitude == null || allowed_longitude == null) {
      return res.status(400).json({ success: false, message: "Location not configured for this department" });
    }

    const distance = getDistanceFromLatLonInMeters(latitude, longitude, allowed_latitude, allowed_longitude);
    const radius = allowed_radius || 2000;
    const isVerified = distance <= radius;

    // Log the attempt
    if (!isVerified) {
      await pool.query(
        'INSERT INTO attendance_audit_logs (employee_id, action_type, location_lat, location_lng, details) VALUES ($1, $2, $3, $4, $5)',
        [employeeId, 'FAILED_LOCATION_VALIDATION', latitude, longitude, `Distance ${distance.toFixed(2)}m exceeds allowed ${radius}m`]
      );
    }

    return res.json({
      success: true,
      locationVerified: isVerified,
      distance: distance.toFixed(2),
      message: isVerified ? "Location verified" : `You are outside the allowed location bounds. Distance: ${distance.toFixed(0)}m (Radius: ${radius}m)`
    });
  } catch (error) {
    console.error("Verify location error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.verifyFaceAndMarkAttendance = async (req, res) => {
  try {
    const { employeeId, userType = 'employee', action = "login", locationVerified, base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ success: false, message: "Image base64 required" });
    }

    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Employee ID required" });
    }

    const tableName = userType === 'sub_admin' ? 'department_admins' : 'employees';
    const deptQuery = userType === 'sub_admin' 
      ? '(SELECT name FROM departments WHERE id = department_admins.department_id) as department' 
      : 'department';

    const empRes = await pool.query(`SELECT id, profile_data, schedule_in, schedule_out, ${deptQuery}, image, status FROM ${tableName} WHERE id = $1`, [employeeId]);
    if (!empRes.rowCount) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    
    if (empRes.rows[0].status !== 'approved') {
      return res.status(403).json({ success: false, message: "Account is not active. Please contact administrator." });
    }
    const profileDataStr = empRes.rows[0].profile_data;
    let registeredImgBase64 = null;
    
    if (profileDataStr) {
      try {
        const profileData = JSON.parse(profileDataStr);
        // Assuming the profile image base64 is stored in profileData.image or profileData.photo
        registeredImgBase64 = profileData.image || profileData.photo;
      } catch (e) {
        console.error("Failed to parse profile data");
      }
    }

    if (!registeredImgBase64) {
      if (empRes.rows[0].image) {
         registeredImgBase64 = empRes.rows[0].image;
      } else {
         return res.status(400).json({ success: false, message: "No registered profile photo found for employee" });
      }
    }

    const { schedule_in, schedule_out } = empRes.rows[0];

    // Prepare buffer for comparison
    const cleanCapturedBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const capturedImgBuffer = Buffer.from(cleanCapturedBase64, 'base64');
    
    // Check if registered image has a data:image prefix and strip it
    const cleanRegisteredBase64 = registeredImgBase64.replace(/^data:image\/\w+;base64,/, "");
    const registeredImgBuffer = Buffer.from(cleanRegisteredBase64, 'base64');

    // FACE COMPARE
    let faceVerified = false;
    try {
      const params = {
        SourceImage: { Bytes: registeredImgBuffer },
        TargetImage: { Bytes: capturedImgBuffer },
        SimilarityThreshold: 80,
      };

      const result = await rekognition.compareFaces(params).promise();
      faceVerified = result.FaceMatches && result.FaceMatches.length > 0;
    } catch (err) {
      console.error("AWS Rekognition Error:", err);
      // Fallback or just false
    }

    if (!faceVerified) {
      await pool.query(
        'INSERT INTO attendance_audit_logs (employee_id, action_type, details) VALUES ($1, $2, $3)',
        [employeeId, 'FAILED_FACE_RECOGNITION', 'Face did not match registered profile photo']
      );
      return res.json({ success: false, faceVerified: false, message: "Face verification failed. Please try again." });
    }

    // Determine status
    let status = locationVerified === 'true' || locationVerified === true ? "On Duty" : "Absent";
    
    // For storing in DB, we prefix it so it is directly usable in img tags
    const storedCapturedUrl = base64Image.startsWith('data:image') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    
    // Check if already marked
    if (action === "login") {
      const alreadyMarked = await pool.query(
        `SELECT id FROM attendance WHERE employee_id = $1 AND user_type = $2 AND date = CURRENT_DATE LIMIT 1`,
        [employeeId, userType]
      );

      if (alreadyMarked.rowCount > 0) {
        return res.json({
          success: true,
          faceVerified: true,
          attendanceMarked: false,
          alreadyMarked: true,
          message: "Attendance already marked today"
        });
      }

      // Compute late duration based on shiftIn
      let late_duration = '0h 0m';
      if (profileDataStr) {
        try {
          const profileData = JSON.parse(profileDataStr);
          if (profileData.shiftIn) {
            const [shiftHour, shiftMin] = profileData.shiftIn.split(':').map(Number);
            const now = new Date();
            const shiftTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), shiftHour, shiftMin, 0);
            const diffMs = now - shiftTime;
            if (diffMs > 0) {
              const diffMins = Math.floor(diffMs / 60000);
              const h = Math.floor(diffMins / 60);
              const m = diffMins % 60;
              late_duration = `${h}h ${m}m`;
            }
          }
        } catch (e) { console.error('Error parsing profile_data for late checkin', e); }
      }

      const insertResult = await pool.query(
        `INSERT INTO attendance (employee_id, user_type, department, timestamp, image_url, status, late_duration)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6)
         RETURNING id, timestamp, status`,
        [employeeId, userType, empRes.rows[0].department, storedCapturedUrl, status, late_duration]
      );

      return res.json({
        success: true,
        faceVerified: true,
        attendanceMarked: true,
        message: "Login successful (attendance marked)",
        timestamp: insertResult.rows[0].timestamp,
        status: insertResult.rows[0].status
      });
    } else if (action === "logout") {
      // Find the today's record
      const todayRecord = await pool.query(
        `SELECT id, timestamp FROM attendance WHERE employee_id = $1 AND user_type = $2 AND date = CURRENT_DATE LIMIT 1`,
        [employeeId, userType]
      );

      if (todayRecord.rowCount === 0) {
        return res.json({
          success: false,
          message: "No Check-In record found for today.",
        });
      }

      let early_checkout_duration = '0h 0m';
      if (profileDataStr) {
        try {
          const profileData = JSON.parse(profileDataStr);
          if (profileData.shiftOut) {
            const [shiftHour, shiftMin] = profileData.shiftOut.split(':').map(Number);
            const now = new Date();
            const shiftTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), shiftHour, shiftMin, 0);
            const diffMs = shiftTime - now; // time left early
            if (diffMs > 0) {
              const diffMins = Math.floor(diffMs / 60000);
              const h = Math.floor(diffMins / 60);
              const m = diffMins % 60;
              early_checkout_duration = `${h}h ${m}m`;
            }
          }
        } catch (e) { console.error('Error parsing profile_data for early checkout', e); }
      }

      const updateResult = await pool.query(
        `UPDATE attendance 
         SET checkout_timestamp = CURRENT_TIMESTAMP, checkout_image_url = $3, early_checkout_duration = $4
         WHERE employee_id = $1 AND user_type = $2 AND date = CURRENT_DATE
         RETURNING id, checkout_timestamp`,
        [employeeId, userType, storedCapturedUrl, early_checkout_duration]
      );

      return res.json({
        success: true,
        faceVerified: true,
        logout: true,
        message: "Employee logout marked successfully",
        timestamp: updateResult.rows[0].checkout_timestamp
      });
    }

  } catch (error) {
    console.error("Face verification error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.markBreak = async (req, res) => {
  try {
    const { employeeId, userType = 'employee', breakType, locationVerified, faceVerified, base64Image } = req.body;

    if (!employeeId || !breakType) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    let status = "Rejected";

    if (breakType === "Break In") {
      if (locationVerified) status = "On Break";
    }

    if (breakType === "Break Out") {
      if (locationVerified && faceVerified) status = "Returned";
    }

    // For storing in DB, we prefix it so it is directly usable in img tags
    const storedCapturedUrl = base64Image ? (base64Image.startsWith('data:image') ? base64Image : `data:image/jpeg;base64,${base64Image}`) : null;

    await pool.query(
      `INSERT INTO break_logs (employee_id, user_type, break_type, timestamp, image_url, status)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)`,
      [employeeId, userType, breakType, storedCapturedUrl, status]
    );

    return res.json({
      success: true,
      message: `${breakType} logged successfully`,
      status
    });
  } catch (error) {
    console.error("Break log error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getEmployeeDashboardStatus = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { userType = 'employee' } = req.query;

    // 1. Get today's attendance
    const attResult = await pool.query(
      `SELECT id, timestamp as check_in, checkout_timestamp as check_out, status, late_duration 
       FROM attendance WHERE employee_id = $1 AND user_type = $2 AND date = CURRENT_DATE LIMIT 1`,
      [employeeId, userType]
    );

    // 2. Get all break logs today for calculating total break time
    const breakResult = await pool.query(
      `SELECT break_type, timestamp FROM break_logs 
       WHERE employee_id = $1 AND user_type = $2 AND DATE(timestamp) = CURRENT_DATE 
       ORDER BY timestamp ASC`,
      [employeeId, userType]
    );

    // 3. Get pending task counts
    const taskResult = await pool.query(
      `SELECT 
         COUNT(*) as total_tasks,
         SUM(CASE WHEN status IN ('pending', 'in_progress') THEN 1 ELSE 0 END) as pending_tasks,
         SUM(CASE WHEN status IN ('completed', 'resolved') THEN 1 ELSE 0 END) as completed_tasks
       FROM tasks WHERE assignee_id = $1 AND assignee_type = $2`,
      [employeeId, userType === 'sub_admin' ? 'department_admin' : userType]
    );

    let att = attResult.rowCount > 0 ? attResult.rows[0] : null;
    let breaks = breakResult.rows;
    let lastBreak = breaks.length > 0 ? breaks[breaks.length - 1] : null;
    
    // Calculate total break duration in seconds
    let total_break_seconds = 0;
    let current_break_start = null;
    for (let b of breaks) {
      if (b.break_type === 'Break In') current_break_start = new Date(b.timestamp).getTime();
      else if (b.break_type === 'Break Out' && current_break_start) {
        total_break_seconds += Math.floor((new Date(b.timestamp).getTime() - current_break_start) / 1000);
        current_break_start = null;
      }
    }
    // If currently on break, add ongoing break time to total
    if (current_break_start && (!att || !att.check_out)) {
       total_break_seconds += Math.floor((new Date().getTime() - current_break_start) / 1000);
    }
    
    let state = {
      status_string: "Off Duty",
      can_check_in: false,
      can_break_in: false,
      can_break_out: false,
      can_check_out: false,
      check_in_time: null,
      check_out_time: null,
      total_break_seconds: total_break_seconds,
      total_tasks: parseInt(taskResult.rows[0].total_tasks, 10) || 0,
      pending_tasks: parseInt(taskResult.rows[0].pending_tasks, 10) || 0,
      completed_tasks: parseInt(taskResult.rows[0].completed_tasks, 10) || 0
    };

    if (!att) {
      state.status_string = "Off Duty";
      state.can_check_in = true;
    } else if (att.check_out) {
      state.status_string = "Off Duty";
      state.check_in_time = att.check_in;
      state.check_out_time = att.check_out;
    } else {
      state.check_in_time = att.check_in;
      if (lastBreak && lastBreak.break_type === "Break In") {
        state.status_string = "On Break";
        state.can_break_out = true;
      } else {
        if (att.late_duration && att.late_duration !== '0h 0m') {
          state.status_string = "Late Check In";
        } else {
          state.status_string = "On Time";
        }
        state.can_break_in = true;
        state.can_check_out = true;
      }
    }

    res.json({ success: true, data: state });
  } catch (error) {
    console.error("Dashboard status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.checkTodayAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { userType = 'employee' } = req.query;
    const result = await pool.query(
      `SELECT status, late_duration FROM attendance WHERE employee_id = $1 AND user_type = $2 AND date = CURRENT_DATE LIMIT 1`,
      [employeeId, userType]
    );

    if (result.rowCount === 0) {
      return res.json({ success: true, data: { status: 'Not Checked In', color: 'red' } });
    }

    const { status, late_duration } = result.rows[0];
    let color = 'green';
    
    if (status === 'Absent') {
      color = 'red';
    } else if (late_duration && late_duration !== '0h 0m') {
      color = 'yellow';
    }

    res.json({ success: true, data: { status, color, late_duration } });
  } catch (error) {
    console.error("Check today attendance error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.adminUpdateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { check_in, check_out, status } = req.body;
    
    const attRes = await pool.query("SELECT TO_CHAR(date, 'YYYY-MM-DD') as date_str FROM attendance WHERE id = $1", [id]);
    if (attRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    
    const dateStr = attRes.rows[0].date_str;
    
    let checkInTimestamp = null;
    if (check_in) {
      checkInTimestamp = new Date(`${dateStr}T${check_in}:00+05:30`).toISOString();
    }
    
    let checkOutTimestamp = null;
    if (check_out) {
      checkOutTimestamp = new Date(`${dateStr}T${check_out}:00+05:30`).toISOString();
    }

    await pool.query(
      `UPDATE attendance 
       SET timestamp = $1, checkout_timestamp = $2, status = $3 
       WHERE id = $4`,
      [checkInTimestamp, checkOutTimestamp, status, id]
    );

    await pool.query(
      `INSERT INTO attendance_audit_logs (employee_id, action_type, details) 
       VALUES ((SELECT employee_id FROM attendance WHERE id = $1), 'ADMIN_UPDATE', 'Attendance manually updated by Super Admin')`,
      [id]
    );

    res.json({ success: true, message: 'Attendance updated successfully' });
  } catch (error) {
    console.error('Error updating attendance by admin:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


exports.quickAttendance = async (req, res) => {
  try {
    const { employeeId, action } = req.body;
    if (!employeeId || !action) return res.status(400).json({ success: false, message: 'Missing fields' });

    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const checkAttQuery = `SELECT * FROM attendance WHERE employee_id = $1 AND TO_CHAR(date, 'YYYY-MM-DD') = $2`;
    const checkRes = await pool.query(checkAttQuery, [employeeId, todayDate]);

    if (action === 'login') {
      if (checkRes.rowCount > 0) return res.status(400).json({ success: false, message: 'Already checked in today' });
      await pool.query(
        `INSERT INTO attendance (employee_id, date, status, timestamp) VALUES ($1, $2, $3, $4)`,
        [employeeId, now, 'Present', now]
      );
      return res.json({ success: true, message: 'Duty On recorded successfully!' });
    } else if (action === 'logout') {
      if (checkRes.rowCount === 0) return res.status(400).json({ success: false, message: 'No check-in record found for today' });
      if (checkRes.rows[0].checkout_timestamp) return res.status(400).json({ success: false, message: 'Already checked out today' });
      await pool.query(
        `UPDATE attendance SET checkout_timestamp = $1 WHERE employee_id = $2 AND TO_CHAR(date, 'YYYY-MM-DD') = $3`,
        [now, employeeId, todayDate]
      );
      return res.json({ success: true, message: 'Duty Off recorded successfully!' });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Quick attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
