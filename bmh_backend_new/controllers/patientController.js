const pool = require('../db');
const bcrypt = require('bcrypt');

// Register a new patient or update/claim existing account
exports.register = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      name,
      mobile,
      phone_number,
      email,
      password,
      confirm_password,
      age,
      gender,
      blood_group,
      bloodGroup,
      city,
      pin_code,
      pinCode,
      guardian_name,
      guardianName
    } = req.body;
    let finalEmail = email ? email.toLowerCase() : email;

    const resolvedName = name || [first_name, last_name].filter(Boolean).join(' ') || 'Patient';
    const resolvedMobile = mobile || phone_number;
    const resolvedBloodGroup = blood_group || bloodGroup;
    const resolvedPinCode = pin_code || pinCode;
    const resolvedGuardianName = guardian_name || guardianName;

    if (!resolvedMobile || !password) {
      return res.status(400).json({ success: false, message: 'Mobile number and password are required' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if patient with this mobile already exists
    const checkRes = await pool.query('SELECT * FROM patients WHERE mobile = $1', [resolvedMobile]);

    let patient;
    if (checkRes.rowCount > 0) {
      const pId = checkRes.rows[0].id;
      const updateRes = await pool.query(
        `UPDATE patients 
         SET name = $1, email = $2, age = $3, gender = $4, blood_group = $5, city = $6, pin_code = $7, guardian_name = $8, password = $9
         WHERE id = $10
         RETURNING id, name, mobile, email, age, gender, blood_group, city, pin_code, guardian_name`,
        [
          resolvedName,
          email || checkRes.rows[0].email,
          age ? parseInt(age) : checkRes.rows[0].age,
          gender || checkRes.rows[0].gender,
          resolvedBloodGroup || checkRes.rows[0].blood_group,
          city || checkRes.rows[0].city,
          resolvedPinCode || checkRes.rows[0].pin_code,
          resolvedGuardianName || checkRes.rows[0].guardian_name,
          hashedPassword,
          pId
        ]
      );
      patient = updateRes.rows[0];
    } else {
      const insertRes = await pool.query(
        `INSERT INTO patients (name, mobile, email, age, gender, blood_group, city, pin_code, guardian_name, password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, name, mobile, email, age, gender, blood_group, city, pin_code, guardian_name`,
        [
          resolvedName,
          resolvedMobile,
          finalEmail,
          age ? parseInt(age) : null,
          gender || null,
          resolvedBloodGroup || null,
          city || null,
          resolvedPinCode || null,
          resolvedGuardianName || null,
          hashedPassword
        ]
      );
      patient = insertRes.rows[0];
    }

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      patient
    });
  } catch (error) {
    console.error('Patient Register Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Login patient (supports both email and phone number as identifier)
exports.login = async (req, res) => {
  try {
    let { email, mobile, username, password } = req.body;
    if (email) email = email.toLowerCase();
    const identifier = email || mobile || username;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }

    // Lookup patient by email or mobile
    const query = `SELECT * FROM patients WHERE email = $1 OR mobile = $1`;
    const result = await pool.query(query, [identifier]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const patient = result.rows[0];
    
    if (!patient.password) {
      // If patient exists but has no password set (legacy or created by employee without login attempt)
      // Check if they are trying to log in with their phone number as password (the default auto-created password)
      if (password === patient.mobile) {
        // Automatically set password so they can log in
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('UPDATE patients SET password = $1 WHERE id = $2', [hashedPassword, patient.id]);
        return res.json({
          success: true,
          message: 'Login successful',
          patient: {
            id: patient.id,
            name: patient.name,
            email: patient.email,
            mobile: patient.mobile,
            age: patient.age,
            gender: patient.gender,
            blood_group: patient.blood_group,
            city: patient.city,
            pin_code: patient.pin_code,
            guardian_name: patient.guardian_name
          }
        });
      } else {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }
    }

    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        mobile: patient.mobile,
        age: patient.age,
        gender: patient.gender,
        blood_group: patient.blood_group,
        city: patient.city,
        pin_code: patient.pin_code,
        guardian_name: patient.guardian_name
      }
    });
  } catch (error) {
    console.error('Patient Login Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    let { email, mobile, newPassword, confirmPassword } = req.body;
    if (email) email = email.toLowerCase();
    const identifier = email || mobile;

    if (!identifier || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const query = `
      UPDATE patients 
      SET password = $1 
      WHERE email = $2 OR mobile = $2 
      RETURNING id;
    `;
    const result = await pool.query(query, [hashedPassword, identifier]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Patient Forgot Password Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get Patient Profile by ID
exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT id, name, mobile, email, age, gender, blood_group, city, pin_code, guardian_name, created_at 
      FROM patients 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({ success: true, patient: result.rows[0] });
  } catch (error) {
    console.error('Get Patient Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update Patient Profile
exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      age,
      gender,
      blood_group,
      bloodGroup,
      city,
      pin_code,
      pinCode,
      guardian_name,
      guardianName,
      password,
      confirm_password,
      addresses
    } = req.body;

    const resolvedBloodGroup = blood_group || bloodGroup;
    const resolvedPinCode = pin_code || pinCode;
    const resolvedGuardianName = guardian_name || guardianName;
    const resolvedEmail = email ? email.toLowerCase() : email;

    // Fetch existing
    const existing = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    let hashedPassword = existing.rows[0].password;

    if (password) {
      if (password !== confirm_password) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
      }
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const query = `
      UPDATE patients
      SET name = $1,
          email = $2,
          age = $3,
          gender = $4,
          blood_group = $5,
          city = $6,
          pin_code = $7,
          guardian_name = $8,
          password = $9,
          addresses = $10::jsonb
      WHERE id = $11
      RETURNING id, name, mobile, email, age, gender, blood_group, city, pin_code, guardian_name, addresses;
    `;

    const values = [
      name || existing.rows[0].name,
      resolvedEmail !== undefined ? resolvedEmail : existing.rows[0].email,
      age !== undefined ? (age ? parseInt(age) : null) : existing.rows[0].age,
      gender !== undefined ? gender : existing.rows[0].gender,
      resolvedBloodGroup !== undefined ? resolvedBloodGroup : existing.rows[0].blood_group,
      city !== undefined ? city : existing.rows[0].city,
      resolvedPinCode !== undefined ? resolvedPinCode : existing.rows[0].pin_code,
      resolvedGuardianName !== undefined ? resolvedGuardianName : existing.rows[0].guardian_name,
      hashedPassword,
      addresses !== undefined ? JSON.stringify(addresses) : existing.rows[0].addresses,
      id
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      patient: result.rows[0]
    });
  } catch (error) {
    console.error('Update Patient Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get Patient details by Mobile number (for Employee Portal autofill)
exports.getPatientByMobile = async (req, res) => {
  try {
    const { mobile } = req.params;
    const query = `
      SELECT id, name, mobile, email, age, gender, blood_group, city, pin_code, guardian_name, addresses 
      FROM patients 
      WHERE mobile = $1
    `;
    const result = await pool.query(query, [mobile]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({ success: true, patient: result.rows[0] });
  } catch (error) {
    console.error('Get Patient By Mobile Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get patient mobile to fetch sales orders which might only be linked by mobile
    const patientRes = await pool.query('SELECT mobile FROM patients WHERE id = $1', [id]);
    if (patientRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    const mobile = patientRes.rows[0].mobile;

    // Fetch from online_orders
    const onlineOrdersRes = await pool.query(
      `SELECT id, 'online_order' as type, status, total_amount, created_at, 'Local' as delivery_type, delivery_otp 
       FROM online_orders WHERE patient_id = $1 ORDER BY created_at DESC`, [id]
    );

    // Fetch from ecogreen_sales_orders
    const ecogreenSalesOrdersRes = await pool.query(
      `SELECT id, 'sales_order' as type, status, order_total as total_amount, created_at, delivery_type, delivery_otp
       FROM ecogreen_sales_orders WHERE mobile_no = $1 ORDER BY created_at DESC`, [mobile]
    );

    // Fetch from ecogreen_sales_invoices
    const ecogreenSalesInvoicesRes = await pool.query(
      `SELECT id, 'sales_invoice' as type, status, order_total as total_amount, created_at, delivery_type, delivery_otp
       FROM ecogreen_sales_invoices WHERE mobile_no = $1 ORDER BY created_at DESC`, [mobile]
    );

    // Fetch appointments
    const bookingsRes = await pool.query(
      `SELECT id, 'appointment' as type, status, NULL as total_amount, created_at, 'In-Person' as delivery_type, NULL as delivery_otp
       FROM patient_bookings WHERE patient_id = $1 ORDER BY created_at DESC`, [id]
    );

    // Fetch from manual_orders
    const manualOrdersRes = await pool.query(
      `SELECT id, 'manual_order' as type, status, amount as total_amount, created_at, mode_of_delivery as delivery_type, delivery_otp, 
              json_build_object('bus_number', bus_number, 'driver_name', bus_driver_name, 'driver_number', bus_driver_number, 'arrival_time', est_reach_time, 'travels_name', bus_travels_name) as bus_details, 
              notes
       FROM manual_orders WHERE customer_phone = $1 ORDER BY created_at DESC`, [mobile]
    );

    let allOrders = [
      ...onlineOrdersRes.rows, 
      ...ecogreenSalesOrdersRes.rows, 
      ...ecogreenSalesInvoicesRes.rows,
      ...bookingsRes.rows,
      ...manualOrdersRes.rows
    ];

    allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, data: allOrders });
  } catch (error) {
    console.error('Get Patient Orders Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

