const pool = require('../db');
const bcrypt = require('bcrypt');

// Create a patient booking
exports.createBooking = async (req, res) => {
  try {
    const { slot_id, patient_name, mobile, email, age, gender, booked_by, payment_mode, token_number, blood_group, city, pin_code, guardian_name, reason_for_visit } = req.body;
    
    await pool.query('BEGIN');

    // 1. Check if patient exists or create new
    let patient_id;
    const patRes = await pool.query('SELECT id, password FROM patients WHERE mobile = $1', [mobile]);
    if (patRes.rowCount > 0) {
      patient_id = patRes.rows[0].id;
      const existingPat = patRes.rows[0];
      
      // If the existing patient has no password set, set it to their mobile number
      let updateQuery = 'UPDATE patients SET name = $1, email = $2, age = $3, gender = $4, blood_group = $5, city = $6, pin_code = $7, guardian_name = $8';
      let updateParams = [patient_name, email || null, age || null, gender || null, blood_group || null, city || null, pin_code || null, guardian_name || null];
      
      if (!existingPat.password) {
        const hashedPassword = await bcrypt.hash(mobile, 10);
        updateQuery += ', password = $9';
        updateParams.push(hashedPassword);
      }
      
      updateQuery += ' WHERE id = $' + (updateParams.length + 1);
      updateParams.push(patient_id);
      
      await pool.query(updateQuery, updateParams);
    } else {
      const hashedPassword = await bcrypt.hash(mobile, 10);
      const newPat = await pool.query(
        'INSERT INTO patients (name, mobile, email, age, gender, blood_group, city, pin_code, guardian_name, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
        [patient_name, mobile, email || null, age || null, gender || null, blood_group || null, city || null, pin_code || null, guardian_name || null, hashedPassword]
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

    const existingToken = await pool.query('SELECT id, status FROM patient_bookings WHERE slot_id = $1 AND token_number = $2', [slot_id, token_number]);
    
    let isOverride = false;
    if (existingToken.rowCount > 0) {
      if (existingToken.rows[0].status === 'VIP Quota' && booked_by) {
        // Employee is overriding a VIP Quota token
        isOverride = true;
      } else {
        await pool.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'This token is already booked or blocked' });
      }
    }

    // 3. Create booking
    if (isOverride) {
      await pool.query(
        `UPDATE patient_bookings 
         SET patient_id = $1, booked_by = $2, payment_mode = $3, status = 'Booked', reason_for_visit = $4, created_at = NOW()
         WHERE id = $5`,
        [patient_id, booked_by, payment_mode, reason_for_visit || null, existingToken.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO patient_bookings (slot_id, patient_id, token_number, booked_by, payment_mode, status, reason_for_visit)
         VALUES ($1, $2, $3, $4, $5, 'Booked', $6)`,
        [slot_id, patient_id, token_number, booked_by, payment_mode, reason_for_visit || null]
      );
    }

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
    const { date, department, slot_id, booked_by, doctor_id, patient_name, patient_id } = req.query;
    
    let query = `
      SELECT pb.id as booking_id, pb.token_number, pb.status, pb.payment_mode, pb.reason_for_visit,
             p.id as patient_id, p.name as patient_name, p.mobile, p.blood_group, p.city, p.pin_code, p.guardian_name,
             ds.date, ds.start_time, ds.end_time, ds.fee,
             d.full_name as doctor_name, d.department,
             e.full_name as booked_by_name
      FROM patient_bookings pb
      LEFT JOIN patients p ON pb.patient_id = p.id
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
    if (doctor_id) {
      params.push(doctor_id);
      query += ` AND d.id = $${params.length}`;
    }
    if (patient_name) {
      params.push(`%${patient_name}%`);
      query += ` AND p.name ILIKE $${params.length}`;
    }
    if (patient_id) {
      params.push(patient_id);
      query += ` AND pb.patient_id = $${params.length}`;
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
    
    // Automatically create a blank consultation record if Completed and it doesn't exist
    if (status === 'Completed') {
      const bRes = await pool.query(`
        SELECT pb.patient_id, ds.doctor_id 
        FROM patient_bookings pb
        JOIN doctor_slots ds ON pb.slot_id = ds.id
        WHERE pb.id = $1
      `, [id]);
      
      if (bRes.rowCount > 0) {
        const { patient_id, doctor_id } = bRes.rows[0];
        const cRes = await pool.query('SELECT id FROM consultations WHERE booking_id = $1', [id]);
        if (cRes.rowCount === 0) {
          await pool.query(`
            INSERT INTO consultations (booking_id, doctor_id, patient_id, notes, next_consultation_date)
            VALUES ($1, $2, $3, '', NULL)
          `, [id, doctor_id, patient_id]);
        }
      }
    }

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

// Block or Unblock a token (Admin/Sub-Admin feature)
exports.blockToken = async (req, res) => {
  try {
    const { slot_id, token_number, action, booked_by } = req.body;
    
    if (!slot_id || !token_number || !action) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (action === 'block') {
      // Check if already booked
      const existingToken = await pool.query('SELECT id, status FROM patient_bookings WHERE slot_id = $1 AND token_number = $2', [slot_id, token_number]);
      
      if (existingToken.rowCount > 0) {
        return res.status(400).json({ success: false, message: 'Token is already booked or blocked' });
      }

      await pool.query(
        `INSERT INTO patient_bookings (slot_id, patient_id, token_number, booked_by, payment_mode, status, reason_for_visit)
         VALUES ($1, NULL, $2, $3, 'None', 'VIP Quota', NULL)`,
        [slot_id, token_number, booked_by || null]
      );
      
      return res.json({ success: true, message: 'Token blocked successfully' });
    } else if (action === 'unblock') {
      // Ensure it is actually blocked before deleting
      const existingToken = await pool.query('SELECT id, status FROM patient_bookings WHERE slot_id = $1 AND token_number = $2 AND status = $3', [slot_id, token_number, 'VIP Quota']);
      if (existingToken.rowCount === 0) {
        return res.status(400).json({ success: false, message: 'Token is not currently blocked' });
      }
      
      await pool.query('DELETE FROM patient_bookings WHERE slot_id = $1 AND token_number = $2 AND status = $3', [slot_id, token_number, 'VIP Quota']);
      return res.json({ success: true, message: 'Token unblocked successfully' });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    
  } catch (error) {
    console.error('Block Token Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
