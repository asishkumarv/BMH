const pool = require('c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/db');

async function simulate() {
  try {
    const department = undefined;
    const status = undefined;
    const startDate = undefined;
    const endDate = undefined;
    const date = undefined;
    const employeeId = undefined;
    const userType = 'employee';
    const limit = 50;
    const offset = 0;
    const search = 'Dipti';

    const extraFields = 'NULL as schedule_in, NULL as schedule_out, NULL as break_in, NULL as break_out';

    let query = `
      SELECT 
        a.id, a.employee_id, e.full_name, e.department, e.email, e.mobile, e.profile_data, a.date, 
        a.timestamp as check_in, a.checkout_timestamp as check_out, 
        NULL as check_in_image,
        NULL as check_out_image,
        a.status, a.late_duration,
        ${extraFields},
        (
          SELECT json_agg(json_build_object('break_type', bl.break_type, 'timestamp', bl.timestamp AT TIME ZONE 'UTC', 'status', bl.status))
          FROM break_logs bl
          WHERE bl.employee_id = a.employee_id AND bl.user_type = a.user_type AND DATE(bl.timestamp) = a.date
        ) as breaks
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id AND a.user_type = 'employee'
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search && search.trim() !== '') {
      query += ` AND (e.full_name ILIKE $${paramIndex++} OR e.email ILIKE $${paramIndex++} OR e.mobile ILIKE $${paramIndex++})`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ` ORDER BY a.date DESC, a.timestamp DESC`;

    const result = await pool.query(query, params);
    console.log("Success SQL query! Count:", result.rows.length);

    let paginatedRows = result.rows;

    const processedData = paginatedRows.map(row => {
      let late_checkin_mins = 0, early_checkin_mins = 0;
      let late_checkout_mins = 0, early_checkout_mins = 0;
      let extra_break_mins = 0;

      let shiftIn = null, shiftOut = null, breakStart = null, breakEnd = null;
      if (row.profile_data) {
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
      }

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

      return {
        ...row,
        status: dynamic_status,
        worked_mins,
        late_checkin_mins,
        early_checkin_mins,
        late_checkout_mins,
        early_checkout_mins,
        extra_break_mins
      };
    });

    console.log("Processing success! Sample processed data:");
    console.log(JSON.stringify(processedData[0], null, 2));

  } catch (err) {
    console.error("SIMULATION ERROR:", err);
  } finally {
    pool.end();
  }
}

simulate();
