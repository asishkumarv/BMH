const pool = require('../db');
const sharp = require('sharp');

exports.getAllEmployees = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Server error fetching employees' });
  }
};

exports.getEmployeesByDepartment = async (req, res) => {
  try {
    const { dept_id } = req.params;
    const result = await pool.query('SELECT * FROM employees WHERE department = (SELECT name FROM departments WHERE id = $1) ORDER BY created_at DESC', [dept_id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employees by dept:', error);
    res.status(500).json({ success: false, message: 'Server error fetching employees' });
  }
};

exports.addEmployee = async (req, res) => {
  try {
    let { full_name, email, password, department, role, profile_data } = req.body;
    if (email) email = email.toLowerCase();

    const mobile = profile_data && profile_data.mobile ? profile_data.mobile : null;
    
    // Remove mobile from profile_data so it isn't stored twice (since it has its own column)
    const storedProfileData = profile_data ? { ...profile_data } : null;
    if (storedProfileData && storedProfileData.mobile) {
      delete storedProfileData.mobile;
    }

    // Generate Employee ID
    const deptCode = department ? department.substring(0, 4).toUpperCase() : 'GEN';
    const countResult = await pool.query("SELECT COUNT(*) FROM employees WHERE department = $1", [department]);
    const num = String(parseInt(countResult.rows[0].count) + 1).padStart(3, '0');
    const employee_id = `EMP-${deptCode}-${num}`;

    const insertResult = await pool.query(
      'INSERT INTO employees (full_name, email, password, department, role, status, profile_data, mobile, employee_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [full_name, email, password, department, role, 'pending', storedProfileData ? JSON.stringify(storedProfileData) : null, mobile, employee_id]
    );

    res.status(201).json({ success: true, data: insertResult.rows[0] });
  } catch (error) {
    console.error('Error creating employee:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error creating employee' });
  }
};

exports.loginEmployee = async (req, res) => {
  try {
    let { email, password, pushToken } = req.body;
    if (email) email = email.toLowerCase();
    
    const result = await pool.query('SELECT * FROM employees WHERE email = $1 AND password = $2', [email, password]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (user.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    // Compress image if it exists to prevent AsyncStorage crashes on frontend
    if (user.image) {
      try {
        let base64Data = user.image;
        let mimeType = 'image/jpeg';
        if (user.image.includes('base64,')) {
          const parts = user.image.split('base64,');
          mimeType = parts[0].replace('data:', '').replace(';', '');
          base64Data = parts[1];
        }
        const imgBuffer = Buffer.from(base64Data, 'base64');
        const compressedBuffer = await sharp(imgBuffer)
          .resize(100, 100, { fit: 'cover' })
          .jpeg({ quality: 60 })
          .toBuffer();
        
        user.image = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
      } catch (err) {
        console.error('Failed to compress image:', err);
        delete user.image;
      }
    }


    if (pushToken && pushToken !== user.push_token) {
      await pool.query('UPDATE employees SET push_token = $1 WHERE id = $2', [pushToken, user.id]);
      user.push_token = pushToken;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error logging in employee:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['approved', 'rejected', 'deactivated'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE employees SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, message: 'Employee status updated', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating employee status:', error);
    res.status(500).json({ success: false, message: 'Server error updating employee status' });
  }
};

exports.updateEmployeeLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;
    
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Missing lat or lng' });
    }

    const result = await pool.query(
      'UPDATE employees SET location_lat = $1, location_lng = $2, location_updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [lat, lng, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, message: 'Employee location updated' });
  } catch (error) {
    console.error('Error updating employee location:', error);
    res.status(500).json({ success: false, message: 'Server error updating employee location' });
  }
};

exports.getAssignedOrders = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch from online_orders
    const onlineOrdersRes = await pool.query(
      `SELECT id, 'online_order' as type, status, total_amount, patient_name, patient_mobile as mobile_no, manual_address as address, map_lat, map_lng, created_at, 'Local' as delivery_type, NULL as bus_details, NULL::varchar as order_no, NULL::varchar as invoice_no, NULL::varchar as location_link 
       FROM online_orders WHERE delivery_boy_id = $1 ORDER BY created_at DESC`, [id]
    );

    // Fetch from ecogreensales_orders
    const ecogreenSalesOrdersRes = await pool.query(
      `SELECT id, 'sales_order' as type, status, total_price as total_amount, patient_name, patient_contact_no as mobile_no, patient_address as address, NULL::numeric as map_lat, NULL::numeric as map_lng, created_at, delivery_type, bus_details, order_no, NULL::varchar as invoice_no, NULL::varchar as location_link
       FROM ecogreensales_orders WHERE delivery_boy_id = $1 ORDER BY created_at DESC`, [id]
    );

    // Fetch from ecogreensales_invoices
    const ecogreenSalesInvoicesRes = await pool.query(
      `SELECT id, 'sales_invoice' as type, status, total_price as total_amount, patient_name, patient_contact_no as mobile_no, patient_address as address, NULL::numeric as map_lat, NULL::numeric as map_lng, created_at, delivery_type, bus_details, NULL::varchar as order_no, invoice_id as invoice_no, NULL::varchar as location_link
       FROM ecogreensales_invoices WHERE delivered_by_id = $1 ORDER BY created_at DESC`, [id]
    );

    // Fetch from manual_orders
    const manualOrdersRes = await pool.query(
      `SELECT id, 'manual_order' as type, status, amount as total_amount, COALESCE(ship_to_name, customer_name) as patient_name, COALESCE(ship_to_phone, customer_phone) as mobile_no, address, NULL::numeric as map_lat, NULL::numeric as map_lng, location_link, created_at, mode_of_delivery as delivery_type, json_build_object('bus_number', bus_number, 'driver_name', bus_driver_name, 'driver_number', bus_driver_number, 'arrival_time', COALESCE(est_reach_time::text, scheduled_time::text), 'bus_date', bus_date, 'waybill_number', bus_travels_name) as bus_details, delivery_otp, payment_mode, is_scheduled, scheduled_date, scheduled_time, notes, ship_to_name, ship_to_phone, order_no, invoice_no
       FROM manual_orders WHERE delivery_boy_id = $1 ORDER BY created_at DESC`, [id]
    );

    const parseLocation = (row) => {
      let address = row.address;
      let map_lat = row.map_lat;
      let map_lng = row.map_lng;
      let location_link = row.location_link;

      if (address) {
        if (typeof address === 'object') {
          map_lat = address.latitude || address.lat || map_lat;
          map_lng = address.longitude || address.lng || map_lng;
          location_link = address.location_link || address.url || location_link;
          address = address.address || address.locality || JSON.stringify(address);
        } else {
          try {
            const parsed = JSON.parse(address);
            if (parsed && typeof parsed === 'object') {
              map_lat = parsed.latitude || parsed.lat || map_lat;
              map_lng = parsed.longitude || parsed.lng || map_lng;
              location_link = parsed.location_link || parsed.url || location_link;
              address = parsed.address || parsed.locality || address;
            }
          } catch (e) {}
        }
      }
      
      try {
        const parsed = JSON.parse(address);
        if (parsed && typeof parsed === 'object') {
          address = parsed.address || parsed.locality || address;
        }
      } catch (e) {}

      // If location_link has coordinate format or Google maps URL, extract coordinates
      if (location_link && typeof location_link === 'string' && (!map_lat || !map_lng)) {
        const trimmed = location_link.trim();
        const decMatch = trimmed.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
        if (decMatch) {
          map_lat = parseFloat(decMatch[1]);
          map_lng = parseFloat(decMatch[2]);
        } else {
          const urlMatch = trimmed.match(/query=([-\d.]+),([-\d.]+)/) || 
                           trimmed.match(/q=([-\d.]+),([-\d.]+)/) ||
                           trimmed.match(/place\/([-\d.]+),([-\d.]+)/) ||
                           trimmed.match(/@([-\d.]+),([-\d.]+)/);
          if (urlMatch) {
            map_lat = parseFloat(urlMatch[1]);
            map_lng = parseFloat(urlMatch[2]);
          }
        }
      }

      return {
        ...row,
        address,
        map_lat,
        map_lng,
        location_link
      };
    };

    const orders = [
      ...onlineOrdersRes.rows.map(parseLocation),
      ...ecogreenSalesOrdersRes.rows.map(parseLocation),
      ...ecogreenSalesInvoicesRes.rows.map(parseLocation),
      ...manualOrdersRes.rows.map(parseLocation)
    ];
    // Fetch from ecogreenpurchase_orders
    const purchaseOrdersRes = await pool.query(
      `SELECT id, 'purchase_order' as type, status, total as total_amount, custname as patient_name, NULL as mobile_no, address, NULL::numeric as map_lat, NULL::numeric as map_lng, gps_location as location_link, created_at, delivery_type, bus_details, COALESCE(prefix || year || srno, '') as order_no, NULL::varchar as invoice_no
       FROM ecogreenpurchase_orders WHERE delivery_boy_id = $1 ORDER BY created_at DESC`, [id]
    );
    orders.push(...purchaseOrdersRes.rows.map(parseLocation));
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('Error fetching assigned orders:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getDeliveryFleet = async (req, res) => {
  try {
    const targetLat = parseFloat(req.query.lat);
    const targetLng = parseFloat(req.query.lng);

    // Get all delivery boys who are approved
    const boysRes = await pool.query(`
      SELECT id, full_name, email, mobile AS phone, location_lat, location_lng, schedule_in, schedule_out, COALESCE(location_updated_at, created_at) AS updated_at,
      (id::text IN (SELECT employee_id::text FROM attendance WHERE date = CURRENT_DATE AND checkout_timestamp IS NULL)) as is_active
      FROM employees 
      WHERE department = 'Delivery' AND status = 'approved'
    `);
    const boys = boysRes.rows;

    let recommendedRiderId = null;
    let absoluteMinDistance = Infinity;

    for (let boy of boys) {
      boy.recommended = false;
      boy.min_distance = Infinity;

      // Get pending orders count for each boy
      const o1 = await pool.query(`SELECT COUNT(*) FROM online_orders WHERE delivery_boy_id = $1 AND status != 'DELIVERED'`, [boy.id]);
      const o2 = await pool.query(`SELECT COUNT(*) FROM ecogreensales_orders WHERE delivery_boy_id = $1 AND status != 'DELIVERED'`, [boy.id]);
      const o3 = await pool.query(`SELECT COUNT(*) FROM ecogreensales_invoices WHERE delivered_by_id = $1 AND status != 'DELIVERED'`, [boy.id]);
      const o4 = await pool.query(`SELECT COUNT(*) FROM ecogreenpurchase_orders WHERE delivery_boy_id = $1 AND status != 'DELIVERED'`, [boy.id]);
      const o5 = await pool.query(`SELECT COUNT(*) FROM manual_orders WHERE delivery_boy_id = $1 AND status NOT IN ('Delivered', 'Completed')`, [boy.id]);
      boy.pending_orders_count = parseInt(o1.rows[0].count) + parseInt(o2.rows[0].count) + parseInt(o3.rows[0].count) + parseInt(o4.rows[0].count) + parseInt(o5.rows[0].count);

      // Get pending tasks count for each boy
      const tasksRes = await pool.query(`
        SELECT COUNT(*) FROM tasks 
        WHERE 
          (
            assignee_id = $1 
            AND assignee_type = 'employee' 
            AND status IN ('pending', 'assigned', 'in_progress', 'accepted')
          ) OR (
            is_group_task = true 
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(group_assignees) AS ga
              WHERE (ga->>'assignee_id')::int = $1 
                AND ga->>'assignee_type' = 'employee' 
                AND ga->>'status' IN ('pending', 'assigned', 'in_progress', 'accepted')
            )
          )
      `, [boy.id]);
      boy.pending_tasks_count = parseInt(tasksRes.rows[0].count);

      // Get delivered today count
      const d1 = await pool.query(`SELECT COUNT(*) FROM online_orders WHERE delivery_boy_id = $1 AND status = 'DELIVERED' AND updated_at::date = CURRENT_DATE`, [boy.id]);
      const d2 = await pool.query(`SELECT COUNT(*) FROM ecogreensales_orders WHERE delivery_boy_id = $1 AND status = 'DELIVERED' AND created_at::date = CURRENT_DATE`, [boy.id]);
      const d3 = await pool.query(`SELECT COUNT(*) FROM ecogreensales_invoices WHERE delivered_by_id = $1 AND status = 'DELIVERED' AND created_at::date = CURRENT_DATE`, [boy.id]);
      const d4 = await pool.query(`SELECT COUNT(*) FROM ecogreenpurchase_orders WHERE delivery_boy_id = $1 AND status = 'DELIVERED' AND created_at::date = CURRENT_DATE`, [boy.id]);
      const d5 = await pool.query(`SELECT COUNT(*) FROM manual_orders WHERE delivery_boy_id = $1 AND status = 'Delivered' AND updated_at::date = CURRENT_DATE`, [boy.id]);
      boy.delivered_today_count = parseInt(d1.rows[0].count) + parseInt(d2.rows[0].count) + parseInt(d3.rows[0].count) + parseInt(d4.rows[0].count) + parseInt(d5.rows[0].count);

      // Get assigned today count
      const a1 = await pool.query(`SELECT COUNT(*) FROM online_orders WHERE delivery_boy_id = $1 AND updated_at::date = CURRENT_DATE`, [boy.id]);
      const a2 = await pool.query(`SELECT COUNT(*) FROM ecogreensales_orders WHERE delivery_boy_id = $1 AND created_at::date = CURRENT_DATE`, [boy.id]);
      const a3 = await pool.query(`SELECT COUNT(*) FROM ecogreensales_invoices WHERE delivered_by_id = $1 AND created_at::date = CURRENT_DATE`, [boy.id]);
      const a4 = await pool.query(`SELECT COUNT(*) FROM ecogreenpurchase_orders WHERE delivery_boy_id = $1 AND created_at::date = CURRENT_DATE`, [boy.id]);
      const a5 = await pool.query(`SELECT COUNT(*) FROM manual_orders WHERE delivery_boy_id = $1 AND updated_at::date = CURRENT_DATE`, [boy.id]);
      boy.assigned_today_count = parseInt(a1.rows[0].count) + parseInt(a2.rows[0].count) + parseInt(a3.rows[0].count) + parseInt(a4.rows[0].count) + parseInt(a5.rows[0].count);

      // Calculate nearest order recommendation if lat/lng are provided
      if (!isNaN(targetLat) && !isNaN(targetLng)) {
        const coordsList = [];
        const addCoords = (lat, lng, address, link) => {
          let map_lat = lat;
          let map_lng = lng;
          if (address && typeof address === 'string') {
            try {
              const parsed = JSON.parse(address);
              if (parsed && typeof parsed === 'object') {
                map_lat = parsed.latitude || parsed.lat || map_lat;
                map_lng = parsed.longitude || parsed.lng || map_lng;
              }
            } catch (e) {}
          }
          if (link && typeof link === 'string' && (!map_lat || !map_lng)) {
            const trimmed = link.trim();
            const decMatch = trimmed.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
            if (decMatch) {
              map_lat = parseFloat(decMatch[1]);
              map_lng = parseFloat(decMatch[2]);
            } else {
              const urlMatch = trimmed.match(/query=([-\d.]+),([-\d.]+)/) || 
                               trimmed.match(/q=([-\d.]+),([-\d.]+)/) ||
                               trimmed.match(/place\/([-\d.]+),([-\d.]+)/) ||
                               trimmed.match(/@([-\d.]+),([-\d.]+)/);
              if (urlMatch) {
                map_lat = parseFloat(urlMatch[1]);
                map_lng = parseFloat(urlMatch[2]);
              }
            }
          }
          const finalLat = parseFloat(map_lat);
          const finalLng = parseFloat(map_lng);
          if (!isNaN(finalLat) && !isNaN(finalLng)) {
            coordsList.push({ lat: finalLat, lng: finalLng });
          }
        };

        const onlineOrders = await pool.query(
          `SELECT map_lat, map_lng FROM online_orders WHERE delivery_boy_id = $1 AND status NOT IN ('DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED')`, [boy.id]
        );
        const manualOrders = await pool.query(
          `SELECT address, location_link FROM manual_orders WHERE delivery_boy_id = $1::varchar AND status NOT IN ('Delivered', 'Completed', 'Cancelled', 'Returned') AND COALESCE(mode_of_delivery, '') != 'Bus' AND is_scheduled = false`, [boy.id]
        );
        const salesOrders = await pool.query(
          `SELECT patient_address as address FROM ecogreensales_orders WHERE delivery_boy_id = $1 AND status NOT IN ('Delivered', 'Completed', 'Cancelled', 'Returned') AND COALESCE(delivery_type, '') != 'Bus'`, [boy.id]
        );
        const salesInvoices = await pool.query(
          `SELECT patient_address as address FROM ecogreensales_invoices WHERE delivered_by_id = $1 AND status NOT IN ('Delivered', 'Completed', 'Cancelled', 'Returned') AND COALESCE(delivery_type, '') != 'Bus'`, [boy.id]
        );
        const purchaseOrders = await pool.query(
          `SELECT address, gps_location FROM ecogreenpurchase_orders WHERE delivery_boy_id = $1 AND status NOT IN ('Delivered', 'Completed', 'Cancelled', 'Received', 'Returned') AND COALESCE(delivery_type, '') != 'Bus'`, [boy.id]
        );

        onlineOrders.rows.forEach(r => addCoords(r.map_lat, r.map_lng));
        manualOrders.rows.forEach(r => addCoords(null, null, r.address, r.location_link));
        salesOrders.rows.forEach(r => addCoords(null, null, r.address));
        salesInvoices.rows.forEach(r => addCoords(null, null, r.address));
        purchaseOrders.rows.forEach(r => addCoords(null, null, r.address, r.gps_location));

        coordsList.forEach(c => {
          const dy = targetLat - c.lat;
          const dx = targetLng - c.lng;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < boy.min_distance) {
            boy.min_distance = dist;
          }
        });

        if (boy.min_distance < absoluteMinDistance) {
          absoluteMinDistance = boy.min_distance;
          recommendedRiderId = boy.id;
        }
      }
    }

    if (recommendedRiderId !== null) {
      boys.forEach(b => {
        if (b.id === recommendedRiderId) {
          b.recommended = true;
        }
      });
      // Sort recommended boy to the top
      boys.sort((x, y) => (x.id === recommendedRiderId ? -1 : y.id === recommendedRiderId ? 1 : 0));
    }

    // Fetch delivery department ideal location coordinates
    const deptRes = await pool.query(`
      SELECT allowed_latitude, allowed_longitude 
      FROM departments 
      WHERE name = 'Delivery' LIMIT 1
    `);
    const departmentLocation = deptRes.rows[0] ? {
      latitude: parseFloat(deptRes.rows[0].allowed_latitude),
      longitude: parseFloat(deptRes.rows[0].allowed_longitude)
    } : null;

    res.json({ success: true, data: boys, departmentLocation });
  } catch (err) {
    console.error('Error fetching delivery fleet:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateEmployeePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    const currentResult = await pool.query('SELECT password FROM employees WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (currentResult.rows[0].password !== oldPassword) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    await pool.query('UPDATE employees SET password = $1 WHERE id = $2', [newPassword, id]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating employee password:', error);
    res.status(500).json({ success: false, message: 'Server error updating password' });
  }
};

exports.updateEmployeeProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { profile_data } = req.body;

    const result = await pool.query(
      'UPDATE employees SET profile_data = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(profile_data), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, message: 'Profile updated', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating employee profile:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

exports.getDepartmentPeers = async (req, res) => {
  try {
    const { id } = req.params; // The employee's ID
    let departmentName;
    
    if (id.startsWith('SA-')) {
      const numericId = id.replace('SA-', '');
      const dRes = await pool.query(
        'SELECT d.name FROM departments d JOIN department_admins da ON d.id = da.department_id WHERE da.id = $1', 
        [numericId]
      );
      if (dRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Sub-admin not found' });
      departmentName = dRes.rows[0].name;
    } else {
      const eRes = await pool.query('SELECT department FROM employees WHERE id = $1', [id]);
      if (eRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Employee not found' });
      departmentName = eRes.rows[0].department;
    }

    // 1. Fetch employees in this department (keep id as string)
    const empResult = await pool.query(
      "SELECT id::text, full_name, email, role, department FROM employees WHERE department = $1 AND id != $2 AND status = 'approved'",
      [departmentName, id]
    );

    // 2. Fetch department admins in this department (prefix id with SA-)
    const adminResult = await pool.query(
      `SELECT 'SA-' || da.id as id, da.full_name, da.email, 'subadmin' as role, d.name as department 
       FROM department_admins da
       JOIN departments d ON da.department_id = d.id
       WHERE d.name = $1 AND da.status = 'approved'`,
       [departmentName]
    );

    // Merge both
    const peers = [...empResult.rows, ...adminResult.rows];

    res.json({ success: true, data: peers });
  } catch (error) {
    console.error('Error fetching peers:', error);
    res.status(500).json({ success: false, message: 'Server error fetching peers' });
  }
};

exports.getAllUsers = async (req, res) => {
    try {
      const empResult = await pool.query(
        "SELECT id::text as id, full_name, email, role, department, 'employee' as type FROM employees WHERE status = 'approved'"
      );
  
      const adminResult = await pool.query(
        `SELECT 'SA-' || da.id as id, da.full_name, da.email, 'subadmin' as role, d.name as department, 'department_admin' as type
         FROM department_admins da
         JOIN departments d ON da.department_id = d.id
         WHERE da.status = 'approved'`
      );

      const doctorResult = await pool.query(
        `SELECT 'DOC-' || id as id, full_name, email, 'doctor' as role, department, 'doctor' as type
         FROM doctors
         WHERE status = 'Approved'`
      );

      const superAdminResult = await pool.query(
        `SELECT 'ADMIN-' || id as id, full_name, email, 'super_admin' as role, 'Management' as department, 'super_admin' as type
         FROM super_admins`
      );
  
      const users = [...empResult.rows, ...adminResult.rows, ...doctorResult.rows, ...superAdminResult.rows];
  
      res.json({ success: true, data: users });
    } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ success: false, message: 'Server error fetching all users' });
  }
};


exports.updatePOAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { has_po_access } = req.body;
    const result = await pool.query('UPDATE employees SET has_po_access = $1 WHERE id = $2 RETURNING *', [has_po_access, id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating PO access:', error);
    res.status(500).json({ success: false, message: 'Server error updating PO access' });
  }
};

exports.bulkSavePurchaseOrders = async (req, res) => {
  const { orders } = req.body;
  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({ success: false, message: 'Invalid orders array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let savedCount = 0;
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      
      const existsRes = await client.query(
        'SELECT id FROM ecogreenpurchase_orders WHERE br_code=$1 AND year=$2 AND prefix=$3 AND srno=$4', 
        [order.br_code, order.year, order.prefix, order.srno]
      );

      if (existsRes.rows.length === 0) {
        await client.query(`
          INSERT INTO ecogreenpurchase_orders 
            (br_code, year, prefix, srno, custcode, custname, refcode, refname, total, details, status, created_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', CURRENT_TIMESTAMP)`, 
        [
          order.br_code, order.year, order.prefix, order.srno, order.custcode, order.custname,
          order.refcode, order.refname, order.total, JSON.stringify(order.details)
        ]);
        savedCount++;
      } else {
        await client.query(`
          UPDATE ecogreenpurchase_orders 
          SET total = $1, details = $2 
          WHERE id = $3`, 
        [order.total, JSON.stringify(order.details), existsRes.rows[0].id]);
        savedCount++;
      }
    }
    
    await client.query('COMMIT');
    res.json({ success: true, message: `Successfully saved ${savedCount} purchase orders.` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulkSavePurchaseOrders:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk save purchase orders', error: error.message });
  } finally {
    client.release();
  }
};

exports.updatePushToken = async (req, res) => {
  const { employee_id, pushToken } = req.body;
  if (!employee_id) {
    return res.status(400).json({ success: false, message: 'employee_id is required' });
  }
  try {
    await pool.query('UPDATE employees SET push_token = $1 WHERE id = $2', [pushToken || null, employee_id]);
    res.json({ success: true, message: 'Push token updated successfully' });
  } catch (err) {
    console.error('Update push token error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getStoreDeliveryFleet = async (req, res) => {
  try {
    const settingsRes = await pool.query("SELECT value FROM settings WHERE key = 'store_delivery_access'");
    let access = {};
    if (settingsRes.rowCount > 0) {
      let val = settingsRes.rows[0].value;
      if (typeof val === 'string') {
        try { access = JSON.parse(val); } catch(e){}
      } else {
        access = val || {};
      }
    }

    const empResult = await pool.query(
      "SELECT id, full_name, email, mobile as phone, role, department, 'employee' as type FROM employees WHERE status = 'approved'"
    );

    const adminResult = await pool.query(
      `SELECT da.id, da.full_name, da.email, da.mobile as phone, 'Sub Admin' as role, d.name as department, 'sub_admin' as type
       FROM department_admins da
       LEFT JOIN departments d ON da.department_id = d.id
       WHERE da.status = 'approved'`
    );

    const fleet = [];

    empResult.rows.forEach(emp => {
      const stringId = emp.id.toString();
      if (access[stringId] === true) {
        fleet.push({
          id: stringId,
          full_name: emp.full_name,
          phone: emp.phone,
          role: emp.role,
          department: emp.department,
          type: 'employee'
        });
      }
    });

    adminResult.rows.forEach(sa => {
      const saStringId = `SA-${sa.id}`;
      if (access[saStringId] === true) {
        fleet.push({
          id: saStringId,
          full_name: sa.full_name,
          phone: sa.phone,
          role: sa.role,
          department: sa.department,
          type: 'sub_admin'
        });
      }
    });

    res.json({ success: true, data: fleet });
  } catch (error) {
    console.error('Error fetching store delivery fleet:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getStoreDeliveryAssignedOrders = async (req, res) => {
  try {
    let { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    let delivery_boy_id = userId;
    let delivery_assigned_user_type = 'employee';

    if (typeof userId === 'string' && userId.startsWith('SA-')) {
      delivery_boy_id = userId.replace('SA-', '');
      delivery_assigned_user_type = 'sub_admin';
    }

    const boyIdInt = parseInt(delivery_boy_id, 10);

    const onlineOrdersRes = await pool.query(
      `SELECT id, 'online_order' as type, status, total_amount, patient_name, patient_mobile as mobile_no, manual_address as address, map_lat, map_lng, created_at, delivery_type, NULL as bus_details, NULL::varchar as order_no, NULL::varchar as invoice_no, NULL::varchar as location_link, delivery_otp 
       FROM online_orders 
       WHERE delivery_boy_id = $1 
         AND delivery_assigned_user_type = $2 
         AND (delivery_type = 'Store' OR delivery_type = 'Counter')
       ORDER BY created_at DESC`, [boyIdInt, delivery_assigned_user_type]
    );

    const ecogreenSalesOrdersRes = await pool.query(
      `SELECT id, 'sales_order' as type, status, total_price as total_amount, patient_name, patient_contact_no as mobile_no, patient_address as address, NULL::numeric as map_lat, NULL::numeric as map_lng, created_at, delivery_type, bus_details, order_no, NULL::varchar as invoice_no, NULL::varchar as location_link, delivery_otp
       FROM ecogreensales_orders 
       WHERE delivery_boy_id = $1 
         AND delivery_assigned_user_type = $2
         AND (delivery_type = 'Store' OR delivery_type = 'Counter')
       ORDER BY created_at DESC`, [boyIdInt, delivery_assigned_user_type]
    );

    const ecogreenSalesInvoicesRes = await pool.query(
      `SELECT id, 'sales_invoice' as type, status, total_price as total_amount, patient_name, patient_contact_no as mobile_no, patient_address as address, NULL::numeric as map_lat, NULL::numeric as map_lng, created_at, delivery_type, bus_details, NULL::varchar as order_no, invoice_id as invoice_no, NULL::varchar as location_link, delivery_otp
       FROM ecogreensales_invoices 
       WHERE delivered_by_id = $1 
         AND delivery_assigned_user_type = $2
         AND (delivery_type = 'Store' OR delivery_type = 'Counter')
       ORDER BY created_at DESC`, [boyIdInt, delivery_assigned_user_type]
    );

    const manualOrdersRes = await pool.query(
      `SELECT id, 'manual_order' as type, status, amount as total_amount, COALESCE(ship_to_name, customer_name) as patient_name, COALESCE(ship_to_phone, customer_phone) as mobile_no, address, NULL::numeric as map_lat, NULL::numeric as map_lng, location_link, created_at, mode_of_delivery as delivery_type, json_build_object('bus_number', bus_number, 'driver_name', bus_driver_name, 'driver_number', bus_driver_number, 'arrival_time', est_reach_time::text) as bus_details, delivery_otp, payment_mode, order_no, invoice_no
       FROM manual_orders 
       WHERE delivery_boy_id = $1 
         AND delivery_assigned_user_type = $2
         AND (mode_of_delivery = 'Store' OR mode_of_delivery = 'Counter')
       ORDER BY created_at DESC`, [boyIdInt, delivery_assigned_user_type]
    );

    const purchaseOrdersRes = await pool.query(
      `SELECT id, 'purchase_order' as type, status, total as total_amount, custname as patient_name, NULL as mobile_no, address, NULL::numeric as map_lat, NULL::numeric as map_lng, gps_location as location_link, created_at, delivery_type, bus_details, COALESCE(prefix || year || srno, '') as order_no, NULL::varchar as invoice_no
       FROM ecogreenpurchase_orders 
       WHERE delivery_boy_id = $1 
         AND delivery_assigned_user_type = $2
         AND (delivery_type = 'Store' OR delivery_type = 'Counter')
       ORDER BY created_at DESC`, [boyIdInt, delivery_assigned_user_type]
    );

    const parseLocation = (row) => {
      let address = row.address;
      let map_lat = row.map_lat;
      let map_lng = row.map_lng;
      let location_link = row.location_link;

      if (address) {
        if (typeof address === 'object') {
          map_lat = address.latitude || address.lat || map_lat;
          map_lng = address.longitude || address.lng || map_lng;
          location_link = address.location_link || address.url || location_link;
          address = address.address || address.locality || JSON.stringify(address);
        } else {
          try {
            const parsed = JSON.parse(address);
            if (parsed && typeof parsed === 'object') {
              map_lat = parsed.latitude || parsed.lat || map_lat;
              map_lng = parsed.longitude || parsed.lng || map_lng;
              location_link = parsed.location_link || parsed.url || location_link;
              address = parsed.address || parsed.locality || address;
            }
          } catch (e) {}
        }
      }
      return {
        ...row,
        address,
        map_lat,
        map_lng,
        location_link
      };
    };

    const orders = [
      ...onlineOrdersRes.rows.map(parseLocation),
      ...ecogreenSalesOrdersRes.rows.map(parseLocation),
      ...ecogreenSalesInvoicesRes.rows.map(parseLocation),
      ...manualOrdersRes.rows.map(parseLocation),
      ...purchaseOrdersRes.rows.map(parseLocation)
    ];

    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('Error fetching store delivery orders:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};