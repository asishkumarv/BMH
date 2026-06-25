const pool = require('../db');

// Create a patient booking
exports.createBooking = async (req, res) => {
  try {
    const { slot_id, patient_name, mobile, email, age, gender, booked_by, payment_mode } = req.body;
    
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

    // 2. Check slot token availability and get next token number
    const slotRes = await pool.query('SELECT total_tokens FROM doctor_slots WHERE id = $1', [slot_id]);
    if (slotRes.rowCount === 0) throw new Error('Slot not found');
    const total_tokens = slotRes.rows[0].total_tokens;

    const bookRes = await pool.query('SELECT COUNT(*) FROM patient_bookings WHERE slot_id = $1', [slot_id]);
    const current_bookings = parseInt(bookRes.rows[0].count);

    if (current_bookings >= total_tokens) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Slot is fully booked' });
    }

    const token_number = current_bookings + 1;

    // 3. Create booking
    await pool.query(
      `INSERT INTO patient_bookings (slot_id, patient_id, token_number, booked_by, payment_mode, status)
       VALUES ($1, $2, $3, $4, $5, 'Booked')`,
      [slot_id, patient_id, token_number, booked_by, payment_mode]
    );

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
    const { date, department, slot_id } = req.query;
    
    let query = `
      SELECT pb.id as booking_id, pb.token_number, pb.status, pb.payment_mode,
             p.name as patient_name, p.mobile,
             ds.date, ds.start_time, ds.end_time,
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
