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
    const empResult = await pool.query(\`
      SELECT COUNT(*) AS total_employees
      FROM employees e
      \${deptFilter}
    \`, queryParams);

    // 2. Present (On Duty today)
    const presentResult = await pool.query(\`
      SELECT COUNT(DISTINCT a.employee_id) AS total_present
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date = CURRENT_DATE AND a.status = 'On Duty'
      \${department ? "AND e.department = $1" : ""}
    \`, queryParams);

    // 3. On Leave today (assuming a leaves table exists or treating 'Leave' status)
    const leaveResult = await pool.query(\`
      SELECT COUNT(DISTINCT a.employee_id) AS total_on_leave
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date = CURRENT_DATE AND a.status = 'Leave'
      \${department ? "AND e.department = $1" : ""}
    \`, queryParams);

    // 4. On Break
    const breakResult = await pool.query(\`
      SELECT COUNT(DISTINCT bl.employee_id) AS employees_on_break
      FROM break_logs bl
      JOIN employees e ON bl.employee_id = e.id
      WHERE bl.break_type = 'Break In'
        AND bl.status = 'On Break'
        AND DATE(bl.timestamp) = CURRENT_DATE
        \${department ? "AND e.department = $1" : ""}
        AND NOT EXISTS (
          SELECT 1 FROM break_logs bo
          WHERE bo.employee_id = bl.employee_id
            AND bo.break_type = 'Break Out'
            AND DATE(bo.timestamp) = CURRENT_DATE
            AND bo.timestamp > bl.timestamp
        )
    \`, queryParams);

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

    let query = \`
      SELECT a.id, a.employee_id, e.full_name, e.department, a.date, a.timestamp as check_in, a.checkout_timestamp as check_out, a.status, a.late_duration
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE 1=1
    \`;
    const params = [];
    let paramIndex = 1;

    if (department) {
      query += \` AND e.department = $\${paramIndex++}\`;
      params.push(department);
    }
    if (status) {
      query += \` AND a.status = $\${paramIndex++}\`;
      params.push(status);
    }
    if (employeeId) {
      query += \` AND a.employee_id = $\${paramIndex++}\`;
      params.push(employeeId);
    }
    if (startDate && endDate) {
      query += \` AND a.date BETWEEN $\${paramIndex++} AND $\${paramIndex++}\`;
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
