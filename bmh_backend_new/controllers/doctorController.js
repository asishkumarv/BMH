const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Register Doctor (Pending Approval)
exports.registerDoctor = async (req, res) => {
  try {
    let { full_name, email, password, phone_number, department, role, experience, gender, description, profile_photo } = req.body;
    if (email) email = email.toLowerCase();
    
    // Check if email exists
    const existing = await pool.query('SELECT id FROM doctors WHERE email = $1', [email]);
    if (existing.rowCount > 0) return res.status(400).json({ success: false, message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Auto generate ID: e.g. CARDIOD101
    const deptPrefix = department ? department.substring(0, 3).toUpperCase() : 'DOC';
    const countRes = await pool.query("SELECT COUNT(*) FROM doctors WHERE id LIKE $1", [`${deptPrefix}D%`]);
    const nextNum = parseInt(countRes.rows[0].count) + 1;
    const newId = `${deptPrefix}D${nextNum.toString().padStart(3, '0')}`;

    await pool.query(
      `INSERT INTO doctors (id, full_name, email, password, phone_number, department, role, experience, gender, description, profile_photo, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Pending')`,
      [newId, full_name, email, hashedPassword, phone_number, department, role || 'Doctor', experience, gender, description, profile_photo]
    );

    res.json({ success: true, message: 'Registration successful. Waiting for Admin approval.', id: newId });
  } catch (error) {
    console.error('Register Doctor Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Login Doctor
exports.loginDoctor = async (req, res) => {
  try {
    let { emailOrId, password } = req.body;
    if (emailOrId && emailOrId.includes('@')) emailOrId = emailOrId.toLowerCase();

    const result = await pool.query('SELECT * FROM doctors WHERE email = $1 OR id = $1', [emailOrId]);
    if (result.rowCount === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const doctor = result.rows[0];
    if (doctor.status !== 'Approved') return res.status(403).json({ success: false, message: `Account is ${doctor.status}` });

    const match = await bcrypt.compare(password, doctor.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: doctor.id, role: 'Doctor', department: doctor.department }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

    const { password: _, ...doctorData } = doctor;
    res.json({ success: true, token, doctor: doctorData });
  } catch (error) {
    console.error('Login Doctor Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Admin/Subadmin Create Doctor directly
exports.createDoctor = async (req, res) => {
  try {
    let { full_name, email, password, phone_number, department, experience, gender, description, profile_photo, fee_percent } = req.body;
    if (email) email = email.toLowerCase();
    
    // Auto generate ID: e.g. CARDIOD101
    const deptPrefix = department ? department.substring(0, 3).toUpperCase() : 'DOC';
    const countRes = await pool.query("SELECT COUNT(*) FROM doctors WHERE id LIKE $1", [`${deptPrefix}D%`]);
    const nextNum = parseInt(countRes.rows[0].count) + 1;
    const newId = `${deptPrefix}D${nextNum.toString().padStart(3, '0')}`;

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.query(
      `INSERT INTO doctors (id, full_name, email, password, phone_number, department, experience, gender, description, profile_photo, status, fee_percent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Approved', $11)`,
      [newId, full_name, email, hashedPassword, phone_number, department, experience, gender, description, profile_photo, parseFloat(fee_percent || 0)]
    );

    res.json({ success: true, message: 'Doctor created successfully', id: newId });
  } catch (error) {
    console.error('Create Doctor Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update Doctor Details
exports.updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone_number, department, experience, gender, description, fee_percent } = req.body;
    
    await pool.query(
      `UPDATE doctors 
       SET full_name = $1, email = $2, phone_number = $3, department = $4, experience = $5, gender = $6, description = $7, fee_percent = $8
       WHERE id = $9`,
      [full_name, email, phone_number, department, experience, gender, description, parseFloat(fee_percent || 0), id]
    );

    res.json({ success: true, message: 'Doctor updated successfully' });
  } catch (error) {
    console.error('Update Doctor Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Toggle Doctor Status
exports.updateDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Approved' or 'Inactive'
    
    await pool.query(
      `UPDATE doctors SET status = $1 WHERE id = $2`,
      [status, id]
    );

    res.json({ success: true, message: `Doctor status updated to ${status}` });
  } catch (error) {
    console.error('Update Doctor Status Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get list of doctors
exports.getDoctors = async (req, res) => {
  try {
    const { department, status } = req.query;
    let query = 'SELECT id, full_name, email, phone_number, department, role, experience, gender, status, profile_photo, fee_percent FROM doctors WHERE 1=1';
    let params = [];
    
    if (department) {
      params.push(department);
      query += ` AND department = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get Doctors Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Approve Doctor
exports.approveDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Approved or Rejected
    await pool.query('UPDATE doctors SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: `Doctor ${status}` });
  } catch (error) {
    console.error('Approve Doctor Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Slot Management
exports.createSlot = async (req, res) => {
  try {
    const { doctor_id, date, start_time, end_time, total_tokens, fee, assigned_peon_id } = req.body;
    
    // Check doctor status
    const docRes = await pool.query('SELECT status FROM doctors WHERE id = $1', [doctor_id]);
    if (docRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Doctor not found' });
    if (docRes.rows[0].status === 'Inactive') return res.status(403).json({ success: false, message: 'Cannot create slots for deactivated doctors' });

    await pool.query(
      `INSERT INTO doctor_slots (doctor_id, date, start_time, end_time, total_tokens, fee, assigned_peon_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [doctor_id, date, start_time, end_time, total_tokens, fee, assigned_peon_id || null]
    );
    res.json({ success: true, message: 'Slot created successfully' });
  } catch (error) {
    console.error('Create Slot Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getSlots = async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    let query = `
      SELECT ds.*, 
             (SELECT COUNT(*) FROM patient_bookings pb WHERE pb.slot_id = ds.id AND pb.status != 'Cancelled') as booked_count,
             d.full_name as doctor_name, d.department as doctor_department, d.role as doctor_role, d.profile_photo as doctor_photo, e.full_name as peon_name
      FROM doctor_slots ds
      JOIN doctors d ON ds.doctor_id = d.id
      LEFT JOIN employees e ON ds.assigned_peon_id = e.id
      WHERE 1=1
    `;
    let params = [];
    
    if (doctor_id) {
      params.push(doctor_id);
      query += ` AND ds.doctor_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND ds.date = $${params.length}`;
    }

    query += ' ORDER BY ds.date DESC, ds.start_time ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get Slots Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Available Peons
exports.getAvailablePeons = async (req, res) => {
  try {
    const { date } = req.query;
    
    let query = `
      SELECT e.id, e.full_name, e.department
      FROM employees e
      WHERE LOWER(e.role) IN ('peon', 'poen', 'nurse staff', 'staff nurse')
    `;
    let params = [];

    if (date) {
      params.push(date);
      query += `
        AND e.id NOT IN (
          SELECT employee_id FROM leave_requests
          WHERE status = 'Approved' 
          AND $${params.length} BETWEEN start_date AND end_date
        )
      `;
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get Available Peons Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Save Consultation
exports.saveConsultation = async (req, res) => {
  try {
    const { booking_id, doctor_id, patient_id, notes, next_consultation_date } = req.body;
    
    await pool.query(
      `INSERT INTO consultations (booking_id, doctor_id, patient_id, notes, next_consultation_date)
       VALUES ($1, $2, $3, $4, $5)`,
      [booking_id, doctor_id, patient_id, notes, next_consultation_date || null]
    );

    // Optionally mark booking as Completed if not already
    await pool.query('UPDATE patient_bookings SET status = $1 WHERE id = $2 AND status != $1', ['Completed', booking_id]);

    // Auto-advance queue: find the next 'Waiting' token and make it 'Current'
    const bRes = await pool.query('SELECT slot_id FROM patient_bookings WHERE id = $1', [booking_id]);
    if (bRes.rowCount > 0) {
      const slot_id = bRes.rows[0].slot_id;
      
      const nextWaiting = await pool.query(`
        SELECT id FROM patient_bookings 
        WHERE slot_id = $1 AND status = 'Waiting'
        ORDER BY token_number ASC LIMIT 1
      `, [slot_id]);

      if (nextWaiting.rowCount > 0) {
        await pool.query('UPDATE patient_bookings SET status = $1 WHERE id = $2', ['Current', nextWaiting.rows[0].id]);
      }
    }

    res.json({ success: true, message: 'Consultation notes saved successfully' });
  } catch (error) {
    console.error('Save Consultation Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update Consultation
exports.updateConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, next_consultation_date } = req.body;
    await pool.query(
      `UPDATE consultations SET notes = $1, next_consultation_date = $2 WHERE id = $3`,
      [notes, next_consultation_date || null, id]
    );
    res.json({ success: true, message: 'Consultation updated successfully' });
  } catch (error) {
    console.error('Update Consultation Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get Doctor Patients
exports.getDoctorPatients = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.id, p.name, p.mobile, p.email, p.age, p.gender, c.id as consultation_id, c.notes, c.next_consultation_date, c.created_at as consultation_date
      FROM consultations c
      JOIN patients p ON c.patient_id = p.id
      WHERE c.doctor_id = $1
      ORDER BY c.created_at DESC
    `;
    const result = await pool.query(query, [id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get Doctor Patients Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get All Patient History
exports.getAllPatientHistory = async (req, res) => {
  try {
    const { role, name, email, phone, start_date, end_date, department } = req.query;
    
    let query = `
      SELECT p.id, p.name, p.mobile, p.email, p.age, p.gender, 
             c.id as consultation_id, c.next_consultation_date, COALESCE(c.created_at, pb.created_at) as consultation_date, pb.token_number, ds.fee, pb.payment_mode, p.city, pb.id as booking_id, pb.print_count, ds.start_time,
             d.full_name as doctor_name, d.department as doctor_department
             ${role !== 'Employee' ? ', c.notes' : ''}
      FROM patient_bookings pb
      LEFT JOIN consultations c ON c.booking_id = pb.id
      JOIN patients p ON pb.patient_id = p.id
      JOIN doctor_slots ds ON pb.slot_id = ds.id
      JOIN doctors d ON ds.doctor_id = d.id
      WHERE pb.status = 'Completed'
    `;
    let params = [];

    if (name) {
      params.push(`%${name}%`);
      query += ` AND p.name ILIKE $${params.length}`;
    }
    if (email) {
      params.push(`%${email}%`);
      query += ` AND p.email ILIKE $${params.length}`;
    }
    if (phone) {
      params.push(`%${phone}%`);
      query += ` AND p.mobile ILIKE $${params.length}`;
    }
    if (department) {
      params.push(department);
      query += ` AND d.department = $${params.length}`;
    }
    if (start_date && end_date) {
      params.push(start_date, end_date);
      query += ` AND DATE(COALESCE(c.created_at, pb.created_at)) BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    query += ' ORDER BY consultation_date DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get All Patient History Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.assignPeonToSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_peon_id } = req.body;
    
    await pool.query(
      `UPDATE doctor_slots SET assigned_peon_id = $1 WHERE id = $2`,
      [assigned_peon_id || null, id]
    );
    
    res.json({ success: true, message: 'Peon reassigned successfully' });
  } catch (error) {
    console.error('Assign Peon Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

