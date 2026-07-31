const pool = require('../db');

exports.getWallet = async (req, res) => {
  try {
    const { employee_id } = req.params;
    let result = await pool.query('SELECT * FROM employee_wallets WHERE employee_id = $1', [employee_id]);
    
    // If no wallet exists, create one with 0 balance
    if (result.rows.length === 0) {
      result = await pool.query(
        'INSERT INTO employee_wallets (employee_id, balance) VALUES ($1, 0) RETURNING *',
        [employee_id]
      );
    }
    
    const txResult = await pool.query(
      'SELECT * FROM wallet_transactions WHERE employee_id = $1 ORDER BY created_at DESC',
      [employee_id]
    );

    res.json({ 
      success: true, 
      data: {
        wallet: result.rows[0],
        transactions: txResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAllWallets = async (req, res) => {
  try {
    const { department, department_id } = req.query;

    let walletsQuery = `
      SELECT w.*, e.full_name, e.department, e.email, e.profile_data 
      FROM employee_wallets w
      JOIN employees e ON w.employee_id = e.id::text
    `;
    
    let txQuery = `
      SELECT wt.*, e.full_name, e.department
      FROM wallet_transactions wt
      JOIN employees e ON wt.employee_id = e.id::text
    `;

    const params = [];
    if (department_id) {
      const deptRes = await pool.query('SELECT name FROM departments WHERE id = $1', [department_id]);
      if (deptRes.rows.length > 0) {
        walletsQuery += ` WHERE e.department = $1`;
        txQuery += ` WHERE e.department = $1`;
        params.push(deptRes.rows[0].name);
      } else {
        return res.json({ success: true, data: { wallets: [], transactions: [] } });
      }
    } else if (department) {
      walletsQuery += ` WHERE e.department = $1`;
      txQuery += ` WHERE e.department = $1`;
      params.push(department);
    }
    
    txQuery += ` ORDER BY wt.created_at DESC`;

    // Admin gets all wallets + transactions (optionally filtered by dept)
    const result = await pool.query(walletsQuery, params);
    const txResult = await pool.query(txQuery, params);

    res.json({ 
      success: true, 
      data: {
        wallets: result.rows,
        transactions: txResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching all wallets:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.requestAllocation = async (req, res) => {
  try {
    const { employee_id, amount, note } = req.body;
    
    const result = await pool.query(
      'INSERT INTO wallet_transactions (employee_id, type, amount, note, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [employee_id, 'allocation_request', amount, note, 'pending']
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error requesting allocation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.allocateMoney = async (req, res) => {
  try {
    // Admin directly allocates money to employee
    const { employee_id, amount, note, payment_mode, payment_txn_id } = req.body;
    
    // Check if wallet exists
    const wResult = await pool.query('SELECT id FROM employee_wallets WHERE employee_id = $1', [employee_id]);
    if (wResult.rows.length === 0) {
      await pool.query('INSERT INTO employee_wallets (employee_id, balance) VALUES ($1, 0)', [employee_id]);
    }

    // Creates an allocation_granted record. Employee must ACCEPT it.
    const result = await pool.query(
      'INSERT INTO wallet_transactions (employee_id, type, amount, note, status, payment_mode, payment_txn_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [employee_id, 'allocation_granted', amount, note, 'pending', payment_mode || null, payment_txn_id || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error allocating money:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.approveTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_by, payment_mode, payment_txn_id } = req.body; // status: 'approved' or 'rejected'

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const tx = await client.query('SELECT * FROM wallet_transactions WHERE id = $1 FOR UPDATE', [id]);
      if (tx.rows.length === 0) throw new Error('Transaction not found');
      
      const transaction = tx.rows[0];

      // If it's an admin approving an employee's allocation_request
      if (transaction.type === 'allocation_request') {
        await client.query('UPDATE wallet_transactions SET status = $1, approved_by = $2, payment_mode = $4, payment_txn_id = $5 WHERE id = $3', 
          [status, approved_by || null, id, payment_mode || null, payment_txn_id || null]
        );
        
        if (status === 'approved') {
          // Add to balance immediately
          await client.query('UPDATE employee_wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2', [transaction.amount, transaction.employee_id]);
        }
      } 
      // If it's an employee accepting an admin's allocation_granted
      else if (transaction.type === 'allocation_granted' && status === 'completed') {
        await client.query('UPDATE wallet_transactions SET status = $1 WHERE id = $2', [status, id]);
        // Add to balance
        await client.query('UPDATE employee_wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2', [transaction.amount, transaction.employee_id]);
      } else {
        await client.query('UPDATE wallet_transactions SET status = $1, approved_by = $2 WHERE id = $3', [status, approved_by || null, id]);
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Transaction processed' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error approving transaction:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.logUsage = async (req, res) => {
  try {
    const { employee_id, amount, note } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const wResult = await client.query('SELECT balance FROM employee_wallets WHERE employee_id = $1 FOR UPDATE', [employee_id]);
      if (wResult.rows.length === 0) throw new Error('Wallet not found');
      
      if (Number(wResult.rows[0].balance) < Number(amount)) {
        throw new Error('Insufficient wallet balance');
      }

      await client.query('UPDATE employee_wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2', [amount, employee_id]);
      
      const result = await client.query(
        'INSERT INTO wallet_transactions (employee_id, type, amount, note, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [employee_id, 'usage', amount, note, 'completed']
      );

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error logging usage:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// --- CASH HANDOVERS ---

exports.requestHandover = async (req, res) => {
  try {
    const { 
      from_employee_id, to_employee_id, amount, note,
      order_no, invoice_no, customer_name, customer_phone, delivery_method,
      cash_amount, online_amount, credit_amount 
    } = req.body;
    
    // Check if sender has enough cash_in_hand
    const wCheck = await pool.query('SELECT cash_in_hand FROM employee_wallets WHERE employee_id = $1', [from_employee_id]);
    if (wCheck.rowCount === 0 || parseFloat(wCheck.rows[0].cash_in_hand) < parseFloat(amount)) {
      return res.status(400).json({ success: false, message: 'Insufficient cash in hand' });
    }

    // Deduct immediately so they can't double-handover
    const wUpdate = await pool.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand - $1 WHERE employee_id = $2 RETURNING cash_in_hand', [amount, from_employee_id]);
    const fromPostBalance = wUpdate.rows[0] ? parseFloat(wUpdate.rows[0].cash_in_hand) : 0;

    const result = await pool.query(
      `INSERT INTO cash_handovers (
        from_employee_id, to_employee_id, amount, note, status,
        order_no, invoice_no, customer_name, customer_phone, delivery_method,
        cash_amount, online_amount, credit_amount, from_post_balance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        from_employee_id, to_employee_id, amount, note || null, 'Pending',
        order_no || '', invoice_no || '', customer_name || '', customer_phone || '', delivery_method || '',
        parseFloat(cash_amount || 0), parseFloat(online_amount || 0), parseFloat(credit_amount || 0),
        fromPostBalance
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Request Handover Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.acceptHandover = async (req, res) => {
  try {
    const { id, action } = req.body; // action: 'Accepted' or 'Rejected'
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = await client.query('SELECT * FROM cash_handovers WHERE id = $1 FOR UPDATE', [id]);
      if (tx.rowCount === 0) throw new Error('Handover not found');
      const handover = tx.rows[0];

      if (handover.status !== 'Pending') throw new Error('Handover already processed');

      await client.query('UPDATE cash_handovers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [action, id]);

      if (action === 'Accepted') {
        // Add cash to receiver
        const wCheck = await client.query('SELECT id FROM employee_wallets WHERE employee_id = $1', [handover.to_employee_id]);
        let toPostBalance = 0;
        if (wCheck.rowCount === 0) {
          const wIns = await client.query('INSERT INTO employee_wallets (employee_id, cash_in_hand, balance) VALUES ($1, $2, 0) RETURNING cash_in_hand', [handover.to_employee_id, handover.amount]);
          toPostBalance = parseFloat(wIns.rows[0].cash_in_hand);
        } else {
          const wUp = await client.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand + $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2 RETURNING cash_in_hand', [handover.amount, handover.to_employee_id]);
          toPostBalance = parseFloat(wUp.rows[0].cash_in_hand);
        }
        await client.query('UPDATE cash_handovers SET to_post_balance = $1 WHERE id = $2', [toPostBalance, id]);
      } else {
        // Return cash to sender
        const wUp = await client.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand + $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2 RETURNING cash_in_hand', [handover.amount, handover.from_employee_id]);
        const fromPostBalance = parseFloat(wUp.rows[0].cash_in_hand);
        await client.query('UPDATE cash_handovers SET from_post_balance = $1 WHERE id = $2', [fromPostBalance, id]);
      }

      await client.query('COMMIT');
      res.json({ success: true, message: `Handover ${action}` });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Accept Handover Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getHandovers = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const result = await pool.query(`
      SELECT ch.*, 
               COALESCE(f.full_name, d_f.full_name, s_f.full_name, doc_f.full_name, 'Unknown') as from_name,
               CASE 
                 WHEN f.id IS NOT NULL THEN f.role
                 WHEN d_f.id IS NOT NULL THEN 'Sub Admin'
                 WHEN s_f.id IS NOT NULL THEN 'Super Admin'
                 WHEN doc_f.id IS NOT NULL THEN 'Doctor'
                 ELSE 'Unknown'
               END as from_role,
               CASE 
                 WHEN f.id IS NOT NULL THEN f.department
                 WHEN d_f.id IS NOT NULL THEN (SELECT name FROM departments WHERE id = d_f.department_id)
                 WHEN s_f.id IS NOT NULL THEN 'Admin'
                 WHEN doc_f.id IS NOT NULL THEN doc_f.department
                 ELSE 'Unknown'
               END as from_department,
               
               COALESCE(t.full_name, d_t.full_name, s_t.full_name, doc_t.full_name, 'Unknown') as to_name,
               CASE 
                 WHEN t.id IS NOT NULL THEN t.role
                 WHEN d_t.id IS NOT NULL THEN 'Sub Admin'
                 WHEN s_t.id IS NOT NULL THEN 'Super Admin'
                 WHEN doc_t.id IS NOT NULL THEN 'Doctor'
                 ELSE 'Unknown'
               END as to_role,
               CASE 
                 WHEN t.id IS NOT NULL THEN t.department
                 WHEN d_t.id IS NOT NULL THEN (SELECT name FROM departments WHERE id = d_t.department_id)
                 WHEN s_t.id IS NOT NULL THEN 'Admin'
                 WHEN doc_t.id IS NOT NULL THEN doc_t.department
                 ELSE 'Unknown'
               END as to_department
        FROM cash_handovers ch
      LEFT JOIN employees f ON ch.from_employee_id = f.id::text
      LEFT JOIN department_admins d_f ON ch.from_employee_id = 'SA-' || d_f.id::text
      LEFT JOIN super_admins s_f ON ch.from_employee_id = 'ADMIN-' || s_f.id::text
      LEFT JOIN doctors doc_f ON ch.from_employee_id = 'DOC-' || doc_f.id::text
      LEFT JOIN employees t ON ch.to_employee_id = t.id::text
      LEFT JOIN department_admins d_t ON ch.to_employee_id = 'SA-' || d_t.id::text
      LEFT JOIN super_admins s_t ON ch.to_employee_id = 'ADMIN-' || s_t.id::text
      LEFT JOIN doctors doc_t ON ch.to_employee_id = 'DOC-' || doc_t.id::text
      WHERE ch.from_employee_id = $1 OR ch.to_employee_id = $1
      ORDER BY ch.created_at DESC
    `, [employee_id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get Handovers Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAllHandovers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ch.*, 
               COALESCE(f.full_name, d_f.full_name, s_f.full_name, doc_f.full_name, 'Unknown') as from_name,
               CASE 
                 WHEN f.id IS NOT NULL THEN f.role
                 WHEN d_f.id IS NOT NULL THEN 'Sub Admin'
                 WHEN s_f.id IS NOT NULL THEN 'Super Admin'
                 WHEN doc_f.id IS NOT NULL THEN 'Doctor'
                 ELSE 'Unknown'
               END as from_role,
               CASE 
                 WHEN f.id IS NOT NULL THEN f.department
                 WHEN d_f.id IS NOT NULL THEN (SELECT name FROM departments WHERE id = d_f.department_id)
                 WHEN s_f.id IS NOT NULL THEN 'Admin'
                 WHEN doc_f.id IS NOT NULL THEN doc_f.department
                 ELSE 'Unknown'
               END as from_department,
               
               COALESCE(t.full_name, d_t.full_name, s_t.full_name, doc_t.full_name, 'Unknown') as to_name,
               CASE 
                 WHEN t.id IS NOT NULL THEN t.role
                 WHEN d_t.id IS NOT NULL THEN 'Sub Admin'
                 WHEN s_t.id IS NOT NULL THEN 'Super Admin'
                 WHEN doc_t.id IS NOT NULL THEN 'Doctor'
                 ELSE 'Unknown'
               END as to_role,
               CASE 
                 WHEN t.id IS NOT NULL THEN t.department
                 WHEN d_t.id IS NOT NULL THEN (SELECT name FROM departments WHERE id = d_t.department_id)
                 WHEN s_t.id IS NOT NULL THEN 'Admin'
                 WHEN doc_t.id IS NOT NULL THEN doc_t.department
                 ELSE 'Unknown'
               END as to_department
        FROM cash_handovers ch
      LEFT JOIN employees f ON ch.from_employee_id = f.id::text
      LEFT JOIN department_admins d_f ON ch.from_employee_id = 'SA-' || d_f.id::text
      LEFT JOIN super_admins s_f ON ch.from_employee_id = 'ADMIN-' || s_f.id::text
      LEFT JOIN doctors doc_f ON ch.from_employee_id = 'DOC-' || doc_f.id::text
      LEFT JOIN employees t ON ch.to_employee_id = t.id::text
      LEFT JOIN department_admins d_t ON ch.to_employee_id = 'SA-' || d_t.id::text
      LEFT JOIN super_admins s_t ON ch.to_employee_id = 'ADMIN-' || s_t.id::text
      LEFT JOIN doctors doc_t ON ch.to_employee_id = 'DOC-' || doc_t.id::text
      ORDER BY ch.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get All Handovers Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getWalletHistory = async (req, res) => {
  try {
    const { employee_id } = req.params; // e.g. "EMP-1" or "SA-20"
    const numericId = employee_id.replace('EMP-', '').replace('SA-', '');

    // 1. Handovers
    const handoversQuery = `
      SELECT ch.*, 
             COALESCE(f.full_name, d_f.full_name, s_f.full_name, 'Unknown') as from_name,
             COALESCE(t.full_name, d_t.full_name, s_t.full_name, 'Unknown') as to_name
      FROM cash_handovers ch
      LEFT JOIN employees f ON ch.from_employee_id = f.id::text OR ch.from_employee_id = 'EMP-' || f.id::text
      LEFT JOIN department_admins d_f ON ch.from_employee_id = 'SA-' || d_f.id::text OR ch.from_employee_id = d_f.id::text
      LEFT JOIN super_admins s_f ON ch.from_employee_id = 'ADMIN-' || s_f.id::text
      LEFT JOIN employees t ON ch.to_employee_id = t.id::text OR ch.to_employee_id = 'EMP-' || t.id::text
      LEFT JOIN department_admins d_t ON ch.to_employee_id = 'SA-' || d_t.id::text OR ch.to_employee_id = d_t.id::text
      LEFT JOIN super_admins s_t ON ch.to_employee_id = 'ADMIN-' || s_t.id::text
      WHERE ch.from_employee_id = $1 OR ch.to_employee_id = $1
         OR ch.from_employee_id = $2 OR ch.to_employee_id = $2
      ORDER BY ch.created_at DESC
    `;
    const handoversRes = await pool.query(handoversQuery, [employee_id, numericId]);

    // 2. Bookings
    const bookingsParams = [];
    let bookingsQueryStr = `
      SELECT pb.id, ds.date as booking_date, ds.start_time, ds.end_time, ds.fee as amount, 
             pb.status as payment_status, pb.payment_mode as payment_method, pb.created_at,
             p.name as patient_name, d.full_name as doctor_name
      FROM patient_bookings pb
      JOIN doctor_slots ds ON pb.slot_id = ds.id
      JOIN doctors d ON ds.doctor_id = d.id
      LEFT JOIN patients p ON pb.patient_id = p.id
      WHERE 1=1
    `;
    const num = parseInt(numericId);
    if (!isNaN(num)) {
      bookingsQueryStr += ` AND pb.booked_by = $1`;
      bookingsParams.push(num);
    } else {
      bookingsQueryStr += ` AND 1=0`;
    }
    bookingsQueryStr += ` ORDER BY pb.created_at DESC`;
    const bookingsRes = await pool.query(bookingsQueryStr, bookingsParams);

    // 3. Orders — includes manual_orders, online_orders, ecogreensales_orders
    //    Match by delivery_boy_id (delivery boy) OR created_by_id (order creator)
    const ordersQuery = `
      SELECT 
        mo.id::varchar as id, 
        mo.order_no::varchar as order_no, 
        mo.invoice_no::varchar as invoice_no, 
        mo.amount::numeric as amount, 
        mo.paid_amount::numeric as paid_amount,
        COALESCE(wt.payment_mode, mo.pod_payment_mode, mo.payment_mode)::varchar as payment_mode, 
        COALESCE(wt.payment_mode, mo.pod_payment_mode, mo.payment_mode)::varchar as pod_payment_mode,
        COALESCE(wt.cash_amount, mo.cash_amount, 0)::numeric as cash_amount,
        COALESCE(wt.online_amount, mo.online_amount, 0)::numeric as online_amount,
        COALESCE(wt.credit_amount, mo.credit_amount, 0)::numeric as credit_amount,
        mo.order_date::date as order_date, 
        mo.status::varchar as status, 
        COALESCE(wt.created_at, mo.delivered_at, mo.created_at)::timestamp as created_at, 
        mo.delivered_at::timestamp as delivered_at,
        mo.customer_name::varchar as customer_name, 
        mo.address::text as address,
        'manual_order'::varchar as order_source,
        mo.mode_of_delivery::varchar as delivery_method
      FROM manual_orders mo
      LEFT JOIN wallet_transactions wt ON 
        (wt.order_no = mo.order_no OR wt.order_no = mo.id::varchar) 
        AND (wt.employee_id = $1 OR wt.employee_id = $2)
        AND wt.type IN ('cash_collection', 'online_collection', 'split_collection')
      WHERE mo.delivery_boy_id = $1 OR mo.delivery_boy_id = $2
         OR mo.created_by_id = $1 OR mo.created_by_id = $2

      UNION ALL

      SELECT 
        oo.id::varchar as id,
        oo.id::varchar as order_no,
        NULL::varchar as invoice_no,
        oo.total_amount::numeric as amount,
        oo.total_amount::numeric as paid_amount,
        COALESCE(wt.payment_mode, oo.pod_payment_mode)::varchar as payment_mode,
        COALESCE(wt.payment_mode, oo.pod_payment_mode)::varchar as pod_payment_mode,
        COALESCE(wt.cash_amount, oo.cash_amount, 0)::numeric as cash_amount,
        COALESCE(wt.online_amount, oo.online_amount, 0)::numeric as online_amount,
        COALESCE(wt.credit_amount, oo.credit_amount, 0)::numeric as credit_amount,
        oo.created_at::date as order_date,
        oo.status::varchar as status, 
        COALESCE(wt.created_at, oo.delivered_at, oo.created_at)::timestamp as created_at, 
        oo.delivered_at::timestamp as delivered_at,
        oo.patient_name::varchar as customer_name,
        oo.manual_address::text as address,
        'online_order'::varchar as order_source,
        'Local'::varchar as delivery_method
      FROM online_orders oo
      LEFT JOIN wallet_transactions wt ON 
        (wt.order_no = oo.id::varchar) 
        AND (wt.employee_id = $1 OR wt.employee_id = $2)
        AND wt.type IN ('cash_collection', 'online_collection', 'split_collection')
      WHERE oo.delivery_boy_id::text = $1 OR oo.delivery_boy_id::text = $2

      UNION ALL

      SELECT 
        so.id::varchar as id,
        so.order_no::varchar as order_no,
        so.invoice_id::varchar as invoice_no,
        so.total_price::numeric as amount,
        so.total_price::numeric as paid_amount,
        COALESCE(wt.payment_mode, so.pod_payment_mode)::varchar as payment_mode,
        COALESCE(wt.payment_mode, so.pod_payment_mode)::varchar as pod_payment_mode,
        COALESCE(wt.cash_amount, so.cash_amount, 0)::numeric as cash_amount,
        COALESCE(wt.online_amount, so.online_amount, 0)::numeric as online_amount,
        COALESCE(wt.credit_amount, so.credit_amount, 0)::numeric as credit_amount,
        so.created_at::date as order_date,
        so.status::varchar as status, 
        COALESCE(wt.created_at, so.delivered_at, so.created_at)::timestamp as created_at, 
        so.delivered_at::timestamp as delivered_at,
        so.patient_name::varchar as customer_name,
        so.patient_address::text as address,
        'sales_order'::varchar as order_source,
        so.delivery_type::varchar as delivery_method
      FROM ecogreensales_orders so
      LEFT JOIN wallet_transactions wt ON 
        (wt.order_no = so.order_no OR wt.order_no = so.id::varchar) 
        AND (wt.employee_id = $1 OR wt.employee_id = $2)
        AND wt.type IN ('cash_collection', 'online_collection', 'split_collection')
      WHERE so.delivery_boy_id::text = $1 OR so.delivery_boy_id::text = $2

      ORDER BY created_at DESC
    `;
    const ordersRes = await pool.query(ordersQuery, [employee_id, numericId]);

    res.json({
      success: true,
      data: {
        handovers: handoversRes.rows,
        bookings: bookingsRes.rows,
        orders: ordersRes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching wallet history:', error);
    res.status(500).json({ success: false, message: 'Server error fetching wallet history' });
  }
};
