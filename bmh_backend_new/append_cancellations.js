const fs = require('fs');

const bookingContent = `

// Edit Booking (Patient Details & Metadata)
exports.editBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      patient_name, age, gender, mobile, blood_group, city, pin_code, guardian_name,
      reason_for_visit, reference, pr, modified_by_id, modified_by_name, modified_by_role, modified_by_dept
    } = req.body;

    await pool.query('BEGIN');

    // 1. Get booking and patient id
    const bookingRes = await pool.query('SELECT patient_id FROM patient_bookings WHERE id = $1', [id]);
    if (bookingRes.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const patient_id = bookingRes.rows[0].patient_id;

    // 2. Update patient details
    if (patient_id) {
      await pool.query(
        \`UPDATE patients 
         SET name = $1, age = $2, gender = $3, mobile = $4, blood_group = $5, city = $6, pin_code = $7, guardian_name = $8
         WHERE id = $9\`,
        [patient_name, age || null, gender || null, mobile, blood_group || null, city || null, pin_code || null, guardian_name || null, patient_id]
      );
    }

    // 3. Update booking details and metadata
    await pool.query(
      \`UPDATE patient_bookings 
       SET reason_for_visit = $1, reference = $2, pr = $3, 
           modified_date = NOW(), modified_by_id = $4, modified_by_name = $5, modified_by_role = $6, modified_by_dept = $7
       WHERE id = $8\`,
      [reason_for_visit || null, reference || null, pr || null, modified_by_id, modified_by_name, modified_by_role, modified_by_dept, id]
    );

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Booking modified successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Edit Booking Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Cancel Booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelled_by_id, cancelled_by_name, cancelled_by_role, cancelled_by_dept } = req.body;

    await pool.query('BEGIN');

    const bookingRes = await pool.query(\`
      SELECT pb.*, ds.fee 
      FROM patient_bookings pb 
      JOIN doctor_slots ds ON pb.slot_id = ds.id 
      WHERE pb.id = $1\`, [id]);
    
    if (bookingRes.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];

    // Insert into cancelled table
    await pool.query(\`
      INSERT INTO cancelled_patient_bookings 
      (original_booking_id, slot_id, patient_id, token_number, booked_by, payment_mode, fee, reason_for_visit, reference, pr, booked_at, cancelled_by_id, cancelled_by_name, cancelled_by_role, cancelled_by_dept)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    \`, [
      booking.id, booking.slot_id, booking.patient_id, booking.token_number, booking.booked_by, booking.payment_mode, booking.fee,
      booking.reason_for_visit, booking.reference, booking.pr, booking.created_at,
      cancelled_by_id, cancelled_by_name, cancelled_by_role, cancelled_by_dept
    ]);

    // Delete from active bookings to free up token
    await pool.query('DELETE FROM patient_bookings WHERE id = $1', [id]);

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Cancel Booking Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Process Refund
exports.processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { refund_type, refund_tnx, processed_by_id } = req.body; // processed_by_id should be employee's ID (e.g. '1' or 'EMP-1')

    await pool.query('BEGIN');

    const cancelRes = await pool.query('SELECT * FROM cancelled_patient_bookings WHERE id = $1', [id]);
    if (cancelRes.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Cancelled booking not found' });
    }
    const cancelRecord = cancelRes.rows[0];

    if (cancelRecord.refund_status === 'Refunded') {
      await pool.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Already refunded' });
    }

    if (refund_type === 'Cash') {
      // Find employee wallet
      // processed_by_id might be something like "1" or "EMP-1". We should query both or standardize.
      // Wait, booked_by is usually employee ID. processed_by_id is also employee ID.
      let empWalletRes = await pool.query('SELECT cash_in_hand FROM employee_wallets WHERE employee_id = $1 OR employee_id = $2', [processed_by_id, \`EMP-\${processed_by_id}\`]);
      
      if (empWalletRes.rowCount === 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Employee wallet not found' });
      }
      
      const currentCash = parseFloat(empWalletRes.rows[0].cash_in_hand);
      const refundAmount = parseFloat(cancelRecord.fee);

      if (currentCash < refundAmount) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Insufficient cash in hand to process refund. Request cash from admin.' });
      }

      await pool.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand - $1 WHERE employee_id = $2 OR employee_id = $3', [refundAmount, processed_by_id, \`EMP-\${processed_by_id}\`]);
    }

    await pool.query(\`
      UPDATE cancelled_patient_bookings 
      SET refund_status = 'Refunded', refund_type = $1, refund_tnx = $2 
      WHERE id = $3
    \`, [refund_type, refund_tnx || null, id]);

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Refund processed successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Process Refund Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get Cancelled Bookings
exports.getCancelledBookings = async (req, res) => {
  try {
    const { date, department, booked_by, doctor_id, patient_name, patient_id } = req.query;
    
    let query = \`
      SELECT cb.*, 
             p.id as patient_id, p.name as patient_name, p.mobile, p.blood_group, p.city, p.pin_code, p.guardian_name, p.age, p.gender,
             ds.date, ds.start_time, ds.end_time,
             d.id as doctor_id, d.full_name as doctor_name, d.department as doctor_department,
             e.full_name as booked_by_name
      FROM cancelled_patient_bookings cb
      LEFT JOIN patients p ON cb.patient_id = p.id
      JOIN doctor_slots ds ON cb.slot_id = ds.id
      JOIN doctors d ON ds.doctor_id = d.id
      LEFT JOIN employees e ON cb.booked_by = e.id
      WHERE 1=1
    \`;
    let params = [];

    if (date) {
      params.push(date);
      query += \` AND ds.date = $\${params.length}\`;
    }
    if (department) {
      params.push(department);
      query += \` AND d.department = $\${params.length}\`;
    }
    if (booked_by) {
      params.push(booked_by);
      query += \` AND cb.booked_by = $\${params.length}\`;
    }
    if (doctor_id) {
      params.push(doctor_id);
      query += \` AND d.id = $\${params.length}\`;
    }
    if (patient_name) {
      params.push(\`%\${patient_name}%\`);
      query += \` AND (p.name ILIKE $\${params.length} OR p.mobile ILIKE $\${params.length})\`;
    }
    if (patient_id) {
      params.push(patient_id);
      query += \` AND cb.patient_id = $\${params.length}\`;
    }

    query += ' ORDER BY cb.cancelled_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get Cancelled Bookings Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
`;

fs.appendFileSync('controllers/bookingController.js', bookingContent);
console.log('Appended cancellation endpoints to bookingController.js');
