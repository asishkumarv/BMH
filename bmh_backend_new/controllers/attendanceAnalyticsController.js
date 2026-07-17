const pool = require('../db');

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { department, userType = 'employee' } = req.query; // optional, for subadmin filtering

    let deptFilter = "";
    const queryParams = [];

    if (department) {
      deptFilter = userType === 'sub_admin' ? "WHERE e.department_id = (SELECT id FROM departments WHERE name = $1 LIMIT 1)" : "WHERE e.department = $1";
      queryParams.push(department);
    }

    const deptJoinFilter = department ? (userType === 'sub_admin' ? "AND e.department_id = (SELECT id FROM departments WHERE name = $1 LIMIT 1)" : "AND e.department = $1") : "";
    const deptSelect = userType === 'sub_admin' ? '(SELECT name FROM departments d WHERE d.id = e.department_id) as department' : 'e.department';
    const roleSelect = userType === 'sub_admin' ? "'Sub Admin' as role" : 'e.role';
    const empIdSelect = userType === 'sub_admin' ? "'-' as employee_id" : 'e.employee_id';

    // 1. Total employees
    const empResult = await pool.query(`
      SELECT e.id, e.full_name as name, e.email, e.mobile, ${deptSelect}, ${roleSelect}, ${empIdSelect}, e.profile_data
      FROM ${userType === 'sub_admin' ? 'department_admins' : 'employees'} e
      ${deptFilter}
    `, queryParams);

    // 2. Present (On Duty today)
    const presentResult = await pool.query(`
      SELECT DISTINCT ON (e.id) e.id, e.full_name as name, e.email, e.mobile, ${deptSelect}, ${roleSelect}, ${empIdSelect}, e.profile_data, a.timestamp as check_in, a.checkout_timestamp as check_out
      FROM attendance a
      JOIN ${userType === 'sub_admin' ? 'department_admins' : 'employees'} e ON a.employee_id = e.id AND a.user_type = '${userType}'
      WHERE a.date = CURRENT_DATE AND a.status = 'On Duty'
      ${deptJoinFilter}
    `, queryParams);

    // 3. On Leave today (assuming a leaves table exists or treating 'Leave' status)
    const leaveResult = await pool.query(`
      SELECT DISTINCT ON (e.id) e.id, e.full_name as name, e.email, e.mobile, ${deptSelect}, ${roleSelect}, ${empIdSelect}, e.profile_data
      FROM attendance a
      JOIN ${userType === 'sub_admin' ? 'department_admins' : 'employees'} e ON a.employee_id = e.id AND a.user_type = '${userType}'
      WHERE a.date = CURRENT_DATE AND a.status = 'Leave'
      ${deptJoinFilter}
    `, queryParams);

    // 4. On Break
    const breakResult = await pool.query(`
      SELECT DISTINCT ON (e.id) e.id, e.full_name as name, e.email, e.mobile, ${deptSelect}, ${roleSelect}, ${empIdSelect}, e.profile_data
      FROM break_logs bl
      JOIN ${userType === 'sub_admin' ? 'department_admins' : 'employees'} e ON bl.employee_id = e.id AND bl.user_type = '${userType}'
      WHERE bl.break_type = 'Break In'
        AND bl.status = 'On Break'
        AND DATE(bl.timestamp) = CURRENT_DATE
        ${deptJoinFilter}
        AND NOT EXISTS (
          SELECT 1 FROM break_logs bo
          WHERE bo.employee_id = bl.employee_id
            AND bo.break_type = 'Break Out'
            AND DATE(bo.timestamp) = CURRENT_DATE
            AND bo.timestamp > bl.timestamp
        )
    `, queryParams);

    // 5. Late Check-ins
    const lateResult = await pool.query(`
      SELECT DISTINCT ON (e.id) e.id, e.full_name as name, e.email, e.mobile, ${deptSelect}, ${roleSelect}, ${empIdSelect}, e.profile_data, a.timestamp as check_in, a.late_duration as deviation
      FROM attendance a
      JOIN ${userType === 'sub_admin' ? 'department_admins' : 'employees'} e ON a.employee_id = e.id AND a.user_type = '${userType}'
      WHERE a.date = CURRENT_DATE 
        AND a.late_duration IS NOT NULL AND a.late_duration != '' AND a.late_duration != '0h 0m'
      ${deptJoinFilter}
    `, queryParams);

    // 6. Early Check-outs
    const earlyResult = await pool.query(`
      SELECT DISTINCT ON (e.id) e.id, e.full_name as name, e.email, e.mobile, ${deptSelect}, ${roleSelect}, ${empIdSelect}, e.profile_data, a.checkout_timestamp as check_out, a.early_checkout_duration as deviation
      FROM attendance a
      JOIN ${userType === 'sub_admin' ? 'department_admins' : 'employees'} e ON a.employee_id = e.id AND a.user_type = '${userType}'
      WHERE a.date = CURRENT_DATE 
        AND a.early_checkout_duration IS NOT NULL AND a.early_checkout_duration != '' AND a.early_checkout_duration != '0h 0m'
      ${deptJoinFilter}
    `, queryParams);

    // Calculate Absent Employees
    const presentIds = new Set(presentResult.rows.map(r => r.id));
    const leaveIds = new Set(leaveResult.rows.map(r => r.id));
    const absent_list = empResult.rows.filter(e => !presentIds.has(e.id) && !leaveIds.has(e.id));

    const cleanRows = (rows, uType) => {
      return rows.map(r => {
        if (r.profile_data) {
          try {
            const pd = typeof r.profile_data === 'string' ? JSON.parse(r.profile_data) : r.profile_data;
            if (pd.image) pd.image = `https://napi.bharatmedicalhallplus.com/attendance/profile-image/${r.id}/${uType}`;
            if (pd.photo) pd.photo = `https://napi.bharatmedicalhallplus.com/attendance/profile-image/${r.id}/${uType}`;
            r.profile_data = pd;
          } catch (e) {}
        }
        return r;
      });
    };

    return res.json({
      success: true,
      summary: {
        total_employees: empResult.rowCount,
        total_employees_list: cleanRows(empResult.rows, userType),
        total_present: presentResult.rowCount,
        present_list: cleanRows(presentResult.rows, userType),
        total_absent: absent_list.length,
        absent_list: cleanRows(absent_list, userType),
        total_on_leave: leaveResult.rowCount,
        on_leave_list: cleanRows(leaveResult.rows, userType),
        employees_on_break: breakResult.rowCount,
        break_list: cleanRows(breakResult.rows, userType),
        late_checkins_count: lateResult.rowCount,
        late_checkins_list: cleanRows(lateResult.rows, userType),
        early_checkouts_count: earlyResult.rowCount,
        early_checkouts_list: cleanRows(earlyResult.rows, userType)
      }
    });
  } catch (error) {
    console.error("Attendance summary error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAdvancedReports = async (req, res) => {
  try {
    const { department, status, startDate, endDate, employeeId, userType = 'employee', limit, offset } = req.query;
    const parsedLimit = parseInt(limit, 10) || 50;
    const parsedOffset = parseInt(offset, 10) || 0;

    const extraFields = userType === 'sub_admin' 
      ? 'e.schedule_in, e.schedule_out, e.break_in, e.break_out'
      : 'NULL as schedule_in, NULL as schedule_out, NULL as break_in, NULL as break_out';

    let query = `
      SELECT 
        a.id, a.employee_id, e.full_name, ${userType === 'sub_admin' ? '(SELECT name FROM departments WHERE id = e.department_id) as department' : 'e.department'}, e.email, e.mobile, e.profile_data, a.date, 
        a.timestamp as check_in, a.checkout_timestamp as check_out, 
        CASE WHEN a.image_url IS NOT NULL AND a.image_url != '' THEN CONCAT('https://napi.bharatmedicalhallplus.com/attendance/image/', a.id, '/check_in') ELSE NULL END as check_in_image,
        CASE WHEN a.checkout_image_url IS NOT NULL AND a.checkout_image_url != '' THEN CONCAT('https://napi.bharatmedicalhallplus.com/attendance/image/', a.id, '/check_out') ELSE NULL END as check_out_image,
        a.status, a.late_duration,
        ${extraFields},
        (
          SELECT json_agg(json_build_object('break_type', bl.break_type, 'timestamp', bl.timestamp AT TIME ZONE 'UTC', 'status', bl.status))
          FROM break_logs bl
          WHERE bl.employee_id = a.employee_id AND bl.user_type = a.user_type AND DATE(bl.timestamp) = a.date
        ) as breaks
      FROM attendance a
      JOIN ${userType === 'sub_admin' ? 'department_admins' : 'employees'} e ON a.employee_id = e.id AND a.user_type = '${userType}'
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

    query += ` ORDER BY a.date DESC, a.timestamp DESC`;

    const result = await pool.query(query, params);
    
    // Slice for pagination in memory, since we might need total counts or advanced mapping
    const paginatedRows = result.rows.slice(parsedOffset, parsedOffset + parsedLimit);
    const hasMore = parsedOffset + parsedLimit < result.rows.length;

    const processedData = paginatedRows.map(row => {
      let late_checkin_mins = 0, early_checkin_mins = 0;
      let late_checkout_mins = 0, early_checkout_mins = 0;
      let extra_break_mins = 0;

      let shiftIn = null, shiftOut = null, breakStart = null, breakEnd = null;
      if (userType === 'sub_admin') {
        shiftIn = row.schedule_in;
        shiftOut = row.schedule_out;
        breakStart = row.break_in;
        breakEnd = row.break_out;
      } else if (row.profile_data) {
        let pdata = typeof row.profile_data === 'string' ? JSON.parse(row.profile_data) : row.profile_data;
        shiftIn = pdata.shiftIn;
        shiftOut = pdata.shiftOut;
        breakStart = pdata.breakStart;
        breakEnd = pdata.breakEnd;
      }

      const parseTime = (timeStr, rowDate) => {
        if (!timeStr || !rowDate) return null;
        const d = new Date(rowDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return new Date(`${yyyy}-${mm}-${dd}T${timeStr}:00+05:30`).getTime();
      };

      if (row.check_in && shiftIn) {
        const inTime = new Date(row.check_in).getTime();
        const schedTime = parseTime(shiftIn, row.date);
        const diffMins = (inTime - schedTime) / 60000;
        if (diffMins > 0) late_checkin_mins = Math.round(diffMins);
        else if (diffMins < 0) early_checkin_mins = Math.round(Math.abs(diffMins));
      }

      if (row.check_out && shiftOut) {
        const outTime = new Date(row.check_out).getTime();
        const schedTime = parseTime(shiftOut, row.date);
        const diffMins = (outTime - schedTime) / 60000;
        if (diffMins > 0) late_checkout_mins = Math.round(diffMins);
        else if (diffMins < 0) early_checkout_mins = Math.round(Math.abs(diffMins));
      }

      let totalBreakMins = 0;
      if (row.breaks && row.breaks.length > 0) {
        row.breaks.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        let currentBreakIn = null;
        row.breaks.forEach(b => {
          if (b.break_type === 'Break In') {
            currentBreakIn = new Date(b.timestamp);
          } else if (b.break_type === 'Break Out' && currentBreakIn) {
            const breakDuration = new Date(b.timestamp).getTime() - currentBreakIn.getTime();
            totalBreakMins += breakDuration / 60000;
            currentBreakIn = null;
          }
        });
        
        // If currently on break and there's no check_out, we can add ongoing break time?
        // But since reports are usually for past days or current day, we might not need live updates here.
        // The dashboard handles live timer.
      }

      // Calculate break overstay
      if (breakStart && breakEnd) {
        const schedBreakMins = (parseTime(breakEnd, row.date) - parseTime(breakStart, row.date)) / 60000;
        if (totalBreakMins > schedBreakMins && schedBreakMins > 0) {
          extra_break_mins = Math.round(totalBreakMins - schedBreakMins);
        }
      }

      let dynamic_status = row.status;
      const rowDateStr = new Date(row.date).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      let worked_mins = 0;

      if (row.check_out || rowDateStr < todayStr) {
        dynamic_status = 'Checked Out';
        if (row.check_in && row.check_out) {
            worked_mins = Math.max(0, (new Date(row.check_out).getTime() - new Date(row.check_in).getTime()) / 60000 - totalBreakMins);
        }
      } else if (row.breaks && row.breaks.length > 0) {
        const lastBreak = row.breaks[row.breaks.length - 1];
        if (lastBreak.break_type === 'Break In') {
          dynamic_status = 'On Break';
        }
      }
      
      // Calculate live worked_mins if still on duty today
      if (!row.check_out && row.check_in && rowDateStr === todayStr) {
          let ongoingBreakMins = 0;
          if (dynamic_status === 'On Break') {
             const lastBreak = row.breaks[row.breaks.length - 1];
             ongoingBreakMins = (new Date().getTime() - new Date(lastBreak.timestamp).getTime()) / 60000;
          }
          worked_mins = Math.max(0, (new Date().getTime() - new Date(row.check_in).getTime()) / 60000 - totalBreakMins - ongoingBreakMins);
      }

      const { profile_data, ...rest } = row; // remove raw profile data
      return { ...rest, status: dynamic_status, late_checkin_mins, early_checkin_mins, late_checkout_mins, early_checkout_mins, extra_break_mins, shiftIn, shiftOut, worked_mins: Math.round(worked_mins) };
    });

    res.json({ success: true, data: processedData, hasMore });
  } catch (error) {
    console.error("Advanced reports error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getEmployeeAnalytics = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, userType = 'employee', limit, offset } = req.query;
    const parsedLimit = parseInt(limit, 10) || 30;
    const parsedOffset = parseInt(offset, 10) || 0;
    if (!employeeId) return res.status(400).json({ success: false, message: "Missing employeeId" });

    // Fetch employee details
    const tableName = userType === 'sub_admin' ? 'department_admins' : 'employees';
    const deptCol = userType === 'sub_admin' ? '(SELECT name FROM departments WHERE id = department_admins.department_id) as department' : 'department';
    const extraCols = userType === 'sub_admin' ? ', schedule_in, schedule_out, break_in, break_out' : '';
    const empResult = await pool.query(`SELECT full_name, email, mobile, ${deptCol}, profile_data${extraCols} FROM ${tableName} WHERE id = $1`, [employeeId]);
    if (empResult.rowCount === 0) return res.status(404).json({ success: false, message: "Employee not found" });
    const emp = empResult.rows[0];

    if (emp.profile_data) {
      try {
        const pd = typeof emp.profile_data === 'string' ? JSON.parse(emp.profile_data) : emp.profile_data;
        if (pd.image) pd.image = `https://napi.bharatmedicalhallplus.com/attendance/profile-image/${employeeId}/${userType}`;
        if (pd.photo) pd.photo = `https://napi.bharatmedicalhallplus.com/attendance/profile-image/${employeeId}/${userType}`;
        emp.profile_data = pd;
      } catch (e) {}
    }
    
    let shiftIn = null, shiftOut = null, breakStart = null, breakEnd = null;
    if (userType === 'sub_admin') {
      shiftIn = emp.schedule_in;
      shiftOut = emp.schedule_out;
      breakStart = emp.break_in;
      breakEnd = emp.break_out;
    } else if (emp.profile_data) {
      let pdata = emp.profile_data;
      shiftIn = pdata.shiftIn;
      shiftOut = pdata.shiftOut;
      breakStart = pdata.breakStart;
      breakEnd = pdata.breakEnd;
    }

    // Fetch all attendance records with breaks
    let attendanceQuery = `
      SELECT 
        a.id, a.date, a.timestamp as check_in, a.checkout_timestamp as check_out, a.status,
        CASE WHEN a.image_url IS NOT NULL AND a.image_url != '' THEN CONCAT('https://napi.bharatmedicalhallplus.com/attendance/image/', a.id, '/check_in') ELSE NULL END as check_in_image,
        CASE WHEN a.checkout_image_url IS NOT NULL AND a.checkout_image_url != '' THEN CONCAT('https://napi.bharatmedicalhallplus.com/attendance/image/', a.id, '/check_out') ELSE NULL END as check_out_image,
        (
          SELECT json_agg(json_build_object('break_type', bl.break_type, 'timestamp', bl.timestamp AT TIME ZONE 'UTC'))
          FROM break_logs bl
          WHERE bl.employee_id = a.employee_id AND DATE(bl.timestamp) = a.date
        ) as breaks
      FROM attendance a
      WHERE a.employee_id = $1 AND a.user_type = $2
    `;
    
    const params = [employeeId, userType];
    let paramIndex = 3;

    if (startDate && endDate) {
      attendanceQuery += ` AND a.date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params.push(startDate, endDate);
    }

    attendanceQuery += ` ORDER BY a.date DESC`;
    
    const attResult = await pool.query(attendanceQuery, params);
    const history = attResult.rows;

    let totalWorkMs = 0;
    let totalBreakMs = 0;
    let validWorkDays = 0;
    let earlyCheckInCount = 0;
    let lateCheckInCount = 0;

    const processedHistory = history.map(row => {
      let late_checkin_mins = 0, early_checkin_mins = 0;
      let late_checkout_mins = 0, early_checkout_mins = 0;
      let extra_break_mins = 0;

      const parseTime = (timeStr, rowDate) => {
        if (!timeStr || !rowDate) return null;
        const d = new Date(rowDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return new Date(`${yyyy}-${mm}-${dd}T${timeStr}:00+05:30`).getTime();
      };

      if (row.check_in && shiftIn) {
        const inTime = new Date(row.check_in).getTime();
        const schedTime = parseTime(shiftIn, row.date);
        const diffMins = (inTime - schedTime) / 60000;
        if (diffMins > 0) late_checkin_mins = Math.round(diffMins);
        else if (diffMins < 0) early_checkin_mins = Math.round(Math.abs(diffMins));
        
        if (diffMins > 15) lateCheckInCount++;
        else if (diffMins < 0) earlyCheckInCount++;
      }

      if (row.check_out && shiftOut) {
        const outTime = new Date(row.check_out).getTime();
        const schedTime = parseTime(shiftOut, row.date);
        const diffMins = (outTime - schedTime) / 60000;
        if (diffMins > 0) late_checkout_mins = Math.round(diffMins);
        else if (diffMins < 0) early_checkout_mins = Math.round(Math.abs(diffMins));
      }

      let rowTotalBreakMins = 0;
      if (row.breaks && row.breaks.length > 0) {
        row.breaks.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        let currentBreakIn = null;
        row.breaks.forEach(b => {
          if (b.break_type === 'Break In') {
            currentBreakIn = new Date(b.timestamp);
          } else if (b.break_type === 'Break Out' && currentBreakIn) {
            const breakDuration = new Date(b.timestamp).getTime() - currentBreakIn.getTime();
            rowTotalBreakMins += breakDuration / 60000;
            currentBreakIn = null;
          }
        });
      }

      // Calculate break overstay
      if (breakStart && breakEnd) {
        const schedBreakMins = (parseTime(breakEnd, row.date) - parseTime(breakStart, row.date)) / 60000;
        if (rowTotalBreakMins > schedBreakMins && schedBreakMins > 0) {
          extra_break_mins = Math.round(rowTotalBreakMins - schedBreakMins);
        }
      }

      let worked_mins = null;
      if (row.check_in && row.check_out) {
        const inDate = new Date(row.check_in);
        const outDate = new Date(row.check_out);
        let workMs = outDate.getTime() - inDate.getTime();
        
        workMs -= (rowTotalBreakMins * 60000);
        totalBreakMs += (rowTotalBreakMins * 60000);
        totalWorkMs += workMs;
        validWorkDays++;
        worked_mins = Math.floor(workMs / 60000);
      }
      let dynamic_status = row.status;
      const rowDateStr = new Date(row.date).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      if (row.check_out || rowDateStr < todayStr) {
        dynamic_status = 'Checked Out';
      } else if (row.breaks && row.breaks.length > 0) {
        row.breaks.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const lastBreak = row.breaks[row.breaks.length - 1];
        if (lastBreak.break_type === 'Break In') {
          dynamic_status = 'On Break';
        }
      }
      
      return { ...row, status: dynamic_status, worked_mins, late_checkin_mins, early_checkin_mins, late_checkout_mins, early_checkout_mins, extra_break_mins, shiftIn, shiftOut };
    });

    const avgWorkMs = validWorkDays > 0 ? (totalWorkMs / validWorkDays) : 0;
    const avgWorkHours = avgWorkMs / (1000 * 60 * 60);

    const avgBreakMs = validWorkDays > 0 ? (totalBreakMs / validWorkDays) : 0;
    const avgBreakMins = avgBreakMs / (1000 * 60);

    const earlyPercent = history.length > 0 ? ((earlyCheckInCount / history.length) * 100).toFixed(1) : 0;
    const latePercent = history.length > 0 ? ((lateCheckInCount / history.length) * 100).toFixed(1) : 0;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let currentMonthDaysPresent = 0;
    let currentMonthWorkMs = 0;

    processedHistory.forEach(row => {
      const rowDate = new Date(row.date);
      if (rowDate.getMonth() === currentMonth && rowDate.getFullYear() === currentYear) {
        currentMonthDaysPresent++;
        if (row.worked_mins != null) {
          currentMonthWorkMs += row.worked_mins * 60000;
        }
      }
    });
    const currentMonthWorkHours = currentMonthWorkMs / (1000 * 60 * 60);

    const paginatedHistory = processedHistory.slice(parsedOffset, parsedOffset + parsedLimit);
    const hasMore = parsedOffset + parsedLimit < processedHistory.length;

    res.json({
      success: true,
      employee: {
        ...emp,
        shiftIn,
        shiftOut,
        breakStart,
        breakEnd
      },
      analytics: {
        avgWorkHours: avgWorkHours.toFixed(1),
        avgBreakMins: Math.round(avgBreakMins),
        earlyCheckInPercent: earlyPercent,
        lateCheckInPercent: latePercent,
        totalDaysPresent: history.length,
        currentMonthDaysPresent,
        currentMonthWorkHours: currentMonthWorkHours.toFixed(1)
      },
      history: paginatedHistory,
      hasMore
    });
  } catch (error) {
    console.error("Employee analytics error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
