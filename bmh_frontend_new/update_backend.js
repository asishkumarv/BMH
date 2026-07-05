const fs = require('fs');
const filePath = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/bookingController.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update cancelBooking
const oldCancelRegex = /exports\.cancelBooking = async \(req, res\) => \{[\s\S]*?console\.error\('Cancel Booking Error:', error\);\s*res\.status\(500\)\.json\(\{ success: false, message: 'Server Error' \}\);\s*\}\s*\};/;

const newCancelCode = `exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelled_by_id, cancelled_by_name, cancelled_by_role, cancelled_by_dept, refund_type, refund_tnx } = req.body;

    await pool.query('BEGIN');

    const bookingRes = await pool.query(\`
      SELECT pb.*, ds.fee, p.name as patient_name
      FROM patient_bookings pb 
      JOIN doctor_slots ds ON pb.slot_id = ds.id 
      LEFT JOIN patients p ON pb.patient_id = p.id
      WHERE pb.id = $1\`, [id]);
    
    if (bookingRes.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];

    // Process Refund immediately if requested (Cash or Online)
    if (refund_type === 'Cash') {
      let empWalletRes = await pool.query('SELECT cash_in_hand FROM employee_wallets WHERE employee_id = $1 OR employee_id = $2', [cancelled_by_id, \`EMP-\${cancelled_by_id}\`]);
      if (empWalletRes.rowCount === 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Employee wallet not found for the cancelling employee' });
      }
      if (parseFloat(empWalletRes.rows[0].cash_in_hand) < parseFloat(booking.fee)) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Insufficient cash in hand to process refund.' });
      }
      await pool.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand - $1 WHERE employee_id = $2 OR employee_id = $3', [booking.fee, cancelled_by_id, \`EMP-\${cancelled_by_id}\`]);
      await pool.query('INSERT INTO wallet_transactions (employee_id, type, amount, note, status) VALUES ($1, $2, $3, $4, $5)', [cancelled_by_id, 'usage', booking.fee, \`Refund to token cancel to patient \${booking.patient_name || booking.patient_id} and token id \${booking.id}\`, 'completed']);
    } else if (refund_type === 'Online' && !refund_tnx) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Transaction ID is required for online refunds' });
    }

    // Insert into cancelled table
    await pool.query(\`
      INSERT INTO cancelled_patient_bookings 
      (original_booking_id, slot_id, patient_id, token_number, booked_by, payment_mode, fee, reason_for_visit, reference, pr, booked_at, cancelled_by_id, cancelled_by_name, cancelled_by_role, cancelled_by_dept, refund_status, refund_type, refund_tnx)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    \`, [
      booking.id, booking.slot_id, booking.patient_id, booking.token_number, booking.booked_by, booking.payment_mode, booking.fee,
      booking.reason_for_visit, booking.reference, booking.pr, booking.created_at,
      cancelled_by_id, cancelled_by_name, cancelled_by_role, cancelled_by_dept,
      (refund_type ? 'Refunded' : 'Pending'), refund_type || null, refund_tnx || null
    ]);

    // Delete from active bookings to free up token
    await pool.query('DELETE FROM patient_bookings WHERE id = $1', [id]);

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Booking cancelled and refunded successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Cancel Booking Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};`;

content = content.replace(oldCancelRegex, newCancelCode);

// 2. Update getBookings
const oldGetRegex = /exports\.getBookings = async \(req, res\) => \{[\s\S]*?console\.error\('Get Bookings Error:', error\);\s*res\.status\(500\)\.json\(\{ success: false, message: 'Server Error' \}\);\s*\}\s*\};/;

const newGetCode = `exports.getBookings = async (req, res) => {
  try {
    const { date, department, slot_id, booked_by, doctor_id, patient_name, patient_id, exclude_blocked, status } = req.query;
    
    let query = \`
      SELECT * FROM (
        SELECT pb.id as booking_id, pb.token_number, pb.status, pb.payment_mode, pb.reason_for_visit, pb.pr, pb.reference,
               pb.modified_date, pb.modified_by_name, pb.modified_by_role, pb.modified_by_dept, pb.created_at,
               p.id as patient_id, p.name as patient_name, p.mobile, p.blood_group, p.city, p.pin_code, p.guardian_name, p.age, p.gender, pb.print_count,
               ds.date, ds.start_time, ds.end_time, ds.fee,
               d.id as doctor_id, d.full_name as doctor_name, d.department,
               e.full_name as booked_by_name, pb.booked_by as booked_by_id
        FROM patient_bookings pb
        LEFT JOIN patients p ON pb.patient_id = p.id
        JOIN doctor_slots ds ON pb.slot_id = ds.id
        JOIN doctors d ON ds.doctor_id = d.id
        LEFT JOIN employees e ON pb.booked_by::varchar = e.id::varchar

        UNION ALL

        SELECT cpb.original_booking_id as booking_id, cpb.token_number, 'Cancelled' as status, cpb.payment_mode, cpb.reason_for_visit, cpb.pr, cpb.reference,
               NULL as modified_date, NULL as modified_by_name, NULL as modified_by_role, NULL as modified_by_dept, cpb.cancelled_at as created_at,
               p.id as patient_id, p.name as patient_name, p.mobile, p.blood_group, p.city, p.pin_code, p.guardian_name, p.age, p.gender, 0 as print_count,
               ds.date, ds.start_time, ds.end_time, ds.fee,
               d.id as doctor_id, d.full_name as doctor_name, d.department,
               e.full_name as booked_by_name, cpb.booked_by as booked_by_id
        FROM cancelled_patient_bookings cpb
        LEFT JOIN patients p ON cpb.patient_id = p.id
        JOIN doctor_slots ds ON cpb.slot_id = ds.id
        JOIN doctors d ON ds.doctor_id = d.id
        LEFT JOIN employees e ON cpb.booked_by::varchar = e.id::varchar
      ) as combined_bookings
      WHERE 1=1
    \`;
    let params = [];

    if (exclude_blocked === 'true') {
      query += \` AND status != 'VIP Quota'\`;
    }

    if (date) {
      params.push(date);
      query += \` AND date = $\${params.length}\`;
    }
    if (department) {
      params.push(department);
      query += \` AND department = $\${params.length}\`;
    }
    if (slot_id) {
      // Slot filter is tricky because we didn't include slot_id in combined view, wait! Let's just add slot_id to UNION!
      // I will just use string replacement on query before running it if needed, wait, I'll just change the query string in JS
    }
    // Let me rewrite newGetCode safely.
\`;
    // We will just do a simpler query that includes slot_id.
`;

const getCodeProper = `exports.getBookings = async (req, res) => {
  try {
    const { date, department, slot_id, booked_by, doctor_id, patient_name, patient_id, exclude_blocked, status, booking_id } = req.query;
    
    let query = \`
      SELECT * FROM (
        SELECT pb.id as booking_id, pb.token_number, pb.status, pb.payment_mode, pb.reason_for_visit, pb.pr, pb.reference,
               pb.modified_date, pb.modified_by_name, pb.modified_by_role, pb.modified_by_dept, pb.created_at, pb.slot_id,
               p.id as patient_id, p.name as patient_name, p.mobile, p.blood_group, p.city, p.pin_code, p.guardian_name, p.age, p.gender, pb.print_count,
               ds.date, ds.start_time, ds.end_time, ds.fee,
               d.id as doctor_id, d.full_name as doctor_name, d.department,
               e.full_name as booked_by_name, pb.booked_by as booked_by_id
        FROM patient_bookings pb
        LEFT JOIN patients p ON pb.patient_id = p.id
        JOIN doctor_slots ds ON pb.slot_id = ds.id
        JOIN doctors d ON ds.doctor_id = d.id
        LEFT JOIN employees e ON pb.booked_by::varchar = e.id::varchar

        UNION ALL

        SELECT cpb.original_booking_id as booking_id, cpb.token_number, 'Cancelled' as status, cpb.payment_mode, cpb.reason_for_visit, cpb.pr, cpb.reference,
               NULL as modified_date, NULL as modified_by_name, NULL as modified_by_role, NULL as modified_by_dept, cpb.cancelled_at as created_at, cpb.slot_id,
               p.id as patient_id, p.name as patient_name, p.mobile, p.blood_group, p.city, p.pin_code, p.guardian_name, p.age, p.gender, 0 as print_count,
               ds.date, ds.start_time, ds.end_time, ds.fee,
               d.id as doctor_id, d.full_name as doctor_name, d.department,
               e.full_name as booked_by_name, cpb.booked_by as booked_by_id
        FROM cancelled_patient_bookings cpb
        LEFT JOIN patients p ON cpb.patient_id = p.id
        JOIN doctor_slots ds ON cpb.slot_id = ds.id
        JOIN doctors d ON ds.doctor_id = d.id
        LEFT JOIN employees e ON cpb.booked_by::varchar = e.id::varchar
      ) as combined_bookings
      WHERE 1=1
    \`;
    let params = [];

    if (exclude_blocked === 'true') {
      query += \` AND status != 'VIP Quota'\`;
    }

    if (date) {
      params.push(date);
      query += \` AND date = $\${params.length}\`;
    }
    if (department) {
      params.push(department);
      query += \` AND department = $\${params.length}\`;
    }
    if (slot_id) {
      params.push(slot_id);
      query += \` AND slot_id = $\${params.length}\`;
    }
    if (booked_by) {
      params.push(booked_by);
      query += \` AND booked_by_id = $\${params.length}\`;
    }
    if (doctor_id) {
      params.push(doctor_id);
      query += \` AND doctor_id = $\${params.length}\`;
    }
    if (patient_name) {
      params.push(\`%\${patient_name}%\`);
      query += \` AND (patient_name ILIKE $\${params.length} OR mobile ILIKE $\${params.length} OR booking_id::text ILIKE $\${params.length})\`;
    }
    if (patient_id) {
      params.push(patient_id);
      query += \` AND patient_id = $\${params.length}\`;
    }
    if (status) {
      params.push(status);
      query += \` AND status = $\${params.length}\`;
    }
    if (booking_id) {
      params.push(booking_id);
      query += \` AND booking_id::text ILIKE '%' || $\${params.length} || '%'\`;
    }

    query += ' ORDER BY date DESC, start_time ASC, token_number ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get Bookings Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};`;

content = content.replace(oldGetRegex, getCodeProper);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Backend APIs successfully updated!');
