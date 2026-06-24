const pool = require('../db');

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { department } = req.query; // optional, for subadmin filtering

    let deptFilter = "";
    const queryParams = [];

    if (department) {
      deptFilter = "WHERE e.department = $1";
      queryParams.push(department);
    }

    // 1. Total employees
    const empResult = await pool.query(`
      SELECT COUNT(*) AS total_employees
      FROM employees e
      ${deptFilter}
    `, queryParams);

    // 2. Present (On Duty today)
    const presentResult = await pool.query(`
      SELECT COUNT(DISTINCT a.employee_id) AS total_present
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date = CURRENT_DATE AND a.status = 'On Duty'
      ${department ? "AND e.department = $1" : ""}
    `, queryParams);

    // 3. On Leave today (assuming a leaves table exists or treating 'Leave' status)
    const leaveResult = await pool.query(`
      SELECT COUNT(DISTINCT a.employee_id) AS total_on_leave
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date = CURRENT_DATE AND a.status = 'Leave'
      ${department ? "AND e.department = $1" : ""}
    `, queryParams);

    // 4. On Break
    const breakResult = await pool.query(`
      SELECT COUNT(DISTINCT bl.employee_id) AS employees_on_break
      FROM break_logs bl
      JOIN employees e ON bl.employee_id = e.id
      WHERE bl.break_type = 'Break In'
        AND bl.status = 'On Break'
        AND DATE(bl.timestamp) = CURRENT_DATE
        ${department ? "AND e.department = $1" : ""}
        AND NOT EXISTS (
          SELECT 1 FROM break_logs bo
          WHERE bo.employee_id = bl.employee_id
            AND bo.break_type = 'Break Out'
            AND DATE(bo.timestamp) = CURRENT_DATE
            AND bo.timestamp > bl.timestamp
        )
    `, queryParams);

    const total_employees = Number(empResult.rows[0].total_employees);
    const total_present = Number(presentResult.rows[0].total_present);
    const total_on_leave = Number(leaveResult.rows[0].total_on_leave);
    const total_absent = total_employees - total_present - total_on_leave;

    return res.json({
      success: true,
      summary: {
        total_employees,
        total_present,
        total_absent,
        total_on_leave,
        employees_on_break: Number(breakResult.rows[0].employees_on_break)
      }
    });
  } catch (error) {
    console.error("Attendance summary error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAdvancedReports = async (req, res) => {
  try {
    const { department, status, startDate, endDate, employeeId } = req.query;

    let query = `
      SELECT 
        a.id, a.employee_id, e.full_name, e.department, a.date, 
        a.timestamp as check_in, a.checkout_timestamp as check_out, 
        a.image_url as check_in_image, a.checkout_image_url as check_out_image,
        a.status, a.late_duration,
        (
          SELECT json_agg(json_build_object('break_type', bl.break_type, 'timestamp', bl.timestamp AT TIME ZONE 'UTC', 'status', bl.status))
          FROM break_logs bl
          WHERE bl.employee_id = a.employee_id AND DATE(bl.timestamp) = a.date
        ) as breaks
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (department) {
      query += ` AND e.department = $${paramIndex++}`;
      params.push(department);
    }
    if (status) {
      query += ` AND a.status = $${paramIndex++}`;
      params.push(status);
    }
    if (employeeId) {
      query += ` AND a.employee_id = $${paramIndex++}`;
      params.push(employeeId);
    }
    if (startDate && endDate) {
      query += ` AND a.date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params.push(startDate, endDate);
    }

    query += " ORDER BY a.date DESC, a.timestamp DESC";

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Advanced reports error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getEmployeeAnalytics = async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) return res.status(400).json({ success: false, message: "Missing employeeId" });

    // Fetch employee details
    const empResult = await pool.query('SELECT full_name, department, schedule_in, schedule_out FROM employees WHERE id = $1', [employeeId]);
    if (empResult.rowCount === 0) return res.status(404).json({ success: false, message: "Employee not found" });
    const emp = empResult.rows[0];

    // Fetch all attendance records with breaks
    const attendanceQuery = `
      SELECT 
        a.date, a.timestamp as check_in, a.checkout_timestamp as check_out, a.status,
        a.image_url as check_in_image, a.checkout_image_url as check_out_image,
        (
          SELECT json_agg(json_build_object('break_type', bl.break_type, 'timestamp', bl.timestamp AT TIME ZONE 'UTC'))
          FROM break_logs bl
          WHERE bl.employee_id = a.employee_id AND DATE(bl.timestamp) = a.date
        ) as breaks
      FROM attendance a
      WHERE a.employee_id = $1
      ORDER BY a.date DESC
    `;
    const attResult = await pool.query(attendanceQuery, [employeeId]);
    const history = attResult.rows;

    let totalWorkMs = 0;
    let validWorkDays = 0;
    let earlyCheckInCount = 0;
    let lateCheckInCount = 0;

    history.forEach(row => {
      // Calculate work hours
      if (row.check_in && row.check_out) {
        const inDate = new Date(row.check_in);
        const outDate = new Date(row.check_out);
        let workMs = outDate.getTime() - inDate.getTime();
        
        // Subtract break times
        if (row.breaks && row.breaks.length > 0) {
          // Sort breaks chronologically
          row.breaks.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          let currentBreakIn = null;
          row.breaks.forEach(b => {
            if (b.break_type === 'Break In') {
              currentBreakIn = new Date(b.timestamp);
            } else if (b.break_type === 'Break Out' && currentBreakIn) {
              const breakDuration = new Date(b.timestamp).getTime() - currentBreakIn.getTime();
              workMs -= breakDuration;
              currentBreakIn = null;
            }
          });
        }
        totalWorkMs += workMs;
        validWorkDays++;
      }

      // Early / Late check in
      if (row.check_in && emp.schedule_in) {
        // Parse schedule_in (e.g. "09:00" or "09:00:00")
        const [schedHour, schedMin] = emp.schedule_in.split(':').map(Number);
        const inDate = new Date(row.check_in);
        const schedTime = new Date(inDate);
        schedTime.setHours(schedHour, schedMin, 0, 0);

        if (inDate.getTime() < schedTime.getTime()) {
          earlyCheckInCount++;
        } else if (inDate.getTime() > schedTime.getTime() + (15 * 60 * 1000)) { // 15 min grace period
          lateCheckInCount++;
        }
      }
    });

    const avgWorkMs = validWorkDays > 0 ? (totalWorkMs / validWorkDays) : 0;
    const avgWorkHours = avgWorkMs / (1000 * 60 * 60);

    const earlyPercent = history.length > 0 ? ((earlyCheckInCount / history.length) * 100).toFixed(1) : 0;
    const latePercent = history.length > 0 ? ((lateCheckInCount / history.length) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      employee: emp,
      analytics: {
        avgWorkHours: avgWorkHours.toFixed(1),
        earlyCheckInPercent: earlyPercent,
        lateCheckInPercent: latePercent,
        totalDaysPresent: history.length
      },
      history
    });
  } catch (error) {
    console.error("Employee analytics error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
