const pool = require('../db');

// Create a patient booking
exports.createBooking = async (req, res) => {
  try {
    const { slot_id, patient_name, mobile, email, age, gender, booked_by, payment_mode, token_number } = req.body;
    
    await pool.query('BEGIN');

    // 1. Check if patient exists or create new
    let patient_id;
    const patRes = await pool.query('SELECT id FROM patients WHERE mobile = $1', [mobile]);
    if (patRes.rowCount > 0) {
      patient_id = patRes.rows[0].id;
    } else {
      const newPat = await pool.query(
        'INSERT INTO patients (name, mobile, email, age, gender) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [patient_name, mobile, email, age, gender]
      );
      patient_id = newPat.rows[0].id;
    }

    // 2. Check slot token availability and explicitly validate token_number
    const slotRes = await pool.query('SELECT total_tokens, fee FROM doctor_slots WHERE id = $1', [slot_id]);
    if (slotRes.rowCount === 0) throw new Error('Slot not found');
    const total_tokens = slotRes.rows[0].total_tokens;
    const fee = slotRes.rows[0].fee;

    if (!token_number || token_number < 1 || token_number > total_tokens) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invalid token number selected' });
    }

    const existingToken = await pool.query('SELECT id FROM patient_bookings WHERE slot_id = $1 AND token_number = $2', [slot_id, token_number]);
    
    if (existingToken.rowCount > 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This token is already booked' });
    }

    // 3. Create booking
    await pool.query(
      `INSERT INTO patient_bookings (slot_id, patient_id, token_number, booked_by, payment_mode, status)
       VALUES ($1, $2, $3, $4, $5, 'Booked')`,
      [slot_id, patient_id, token_number, booked_by, payment_mode]
    );

    // 4. Update cash_in_hand if Cash payment
    if (payment_mode === 'Cash') {
      const wCheck = await pool.query('SELECT id FROM employee_wallets WHERE employee_id = $1', [booked_by]);
      if (wCheck.rowCount === 0) {
        await pool.query('INSERT INTO employee_wallets (employee_id, cash_in_hand, balance) VALUES ($1, $2, 0)', [booked_by, fee]);
      } else {
        await pool.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand + $1 WHERE employee_id = $2', [fee, booked_by]);
      }
    }

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Booking successful', token_number });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Create Booking Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get bookings (Sub-admin view - no revenue, or Employee view)
exports.getBookings = async (req, res) => {
  try {
    const { date, department, slot_id, booked_by } = req.query;
    
    let query = `
      SELECT pb.id as booking_id, pb.token_number, pb.status, pb.payment_mode,
             p.name as patient_name, p.mobile,
             ds.date, ds.start_time, ds.end_time, ds.fee,
             d.full_name as doctor_name, d.department,
             e.full_name as booked_by_name
      FROM patient_bookings pb
      JOIN patients p ON pb.patient_id = p.id
      JOIN doctor_slots ds ON pb.slot_id = ds.id
      JOIN doctors d ON ds.doctor_id = d.id
      LEFT JOIN employees e ON pb.booked_by = e.id
      WHERE 1=1
    `;
    let params = [];

    if (date) {
      params.push(date);
      query += ` AND ds.date = $${params.length}`;
    }
    if (department) {
      params.push(department);
      query += ` AND d.department = $${params.length}`;
    }
    if (slot_id) {
      params.push(slot_id);
      query += ` AND pb.slot_id = $${params.length}`;
    }
    if (booked_by) {
      params.push(booked_by);
      query += ` AND pb.booked_by = $${params.length}`;
    }

    query += ' ORDER BY ds.date DESC, ds.start_time ASC, pb.token_number ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get Bookings Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update booking status (Peon marking current/completed)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Current', 'Completed', 'Cancelled'
    await pool.query('UPDATE patient_bookings SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: `Booking status updated to ${status}` });
  } catch (error) {
    console.error('Update Booking Status Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get Revenue (Super Admin)
exports.getRevenue = async (req, res) => {
  try {
    const { date, department } = req.query;
    
    let query = `
      SELECT ds.date, d.department, pb.payment_mode, SUM(ds.fee) as total_amount, COUNT(pb.id) as total_bookings
      FROM patient_bookings pb
      JOIN doctor_slots ds ON pb.slot_id = ds.id
      JOIN doctors d ON ds.doctor_id = d.id
      WHERE pb.status != 'Cancelled'
    `;
    let params = [];

    if (date) {
      params.push(date);
      query += ` AND ds.date = $${params.length}`;
    }
    if (department) {
      params.push(department);
      query += ` AND d.department = $${params.length}`;
    }

    query += ' GROUP BY ds.date, d.department, pb.payment_mode ORDER BY ds.date DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get Revenue Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
