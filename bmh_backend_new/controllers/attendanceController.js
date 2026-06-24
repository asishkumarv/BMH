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
    const { employeeId, latitude, longitude } = req.body;

    if (!employeeId || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const empRes = await pool.query('SELECT department FROM employees WHERE id = $1', [employeeId]);
    if (empRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Employee not found" });
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
    const { employeeId, action = "login", locationVerified, base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ success: false, message: "Image base64 required" });
    }

    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Employee ID required" });
    }

    const empRes = await pool.query("SELECT id, profile_data, schedule_in, schedule_out FROM employees WHERE id = $1", [employeeId]);
    if (!empRes.rowCount) {
      return res.status(404).json({ success: false, message: "Employee not found" });
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
      // If we don't have it in profile_data, check if it's in the image column we added
      const empImageRes = await pool.query("SELECT image FROM employees WHERE id = $1", [employeeId]);
      if (empImageRes.rowCount && empImageRes.rows[0].image) {
         registeredImgBase64 = empImageRes.rows[0].image;
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
    const storedCapturedUrl = `data:image/jpeg;base64,${base64Image}`;
    
    // Check if already marked
    if (action === "login") {
      const alreadyMarked = await pool.query(
        `SELECT id FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE LIMIT 1`,
        [employeeId]
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

      const insertResult = await pool.query(
        `INSERT INTO attendance (employee_id, department, timestamp, image_url, status)
         VALUES ($1, (SELECT department FROM employees WHERE id = $1), CURRENT_TIMESTAMP, $2, $3)
         RETURNING id, timestamp, status`,
        [employeeId, storedCapturedUrl, status]
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
        `SELECT id, timestamp FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE LIMIT 1`,
        [employeeId]
      );

      if (todayRecord.rowCount === 0) {
        return res.json({
          success: false,
          message: "No Check-In record found for today.",
        });
      }

      const updateResult = await pool.query(
        `UPDATE attendance 
         SET checkout_timestamp = CURRENT_TIMESTAMP
         WHERE employee_id = $1 AND date = CURRENT_DATE
         RETURNING id, checkout_timestamp`,
        [employeeId]
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
    const { employeeId, breakType, locationVerified, faceVerified, base64Image } = req.body;

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
    const storedCapturedUrl = base64Image ? `data:image/jpeg;base64,${base64Image}` : null;

    await pool.query(
      `INSERT INTO break_logs (employee_id, break_type, timestamp, image_url, status)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)`,
      [employeeId, breakType, storedCapturedUrl, status]
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
