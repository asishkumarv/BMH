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
    const { from_employee_id, to_employee_id, amount } = req.body;
    
    // Check if sender has enough cash_in_hand
    const wCheck = await pool.query('SELECT cash_in_hand FROM employee_wallets WHERE employee_id = $1', [from_employee_id]);
    if (wCheck.rowCount === 0 || parseFloat(wCheck.rows[0].cash_in_hand) < parseFloat(amount)) {
      return res.status(400).json({ success: false, message: 'Insufficient cash in hand' });
    }

    const result = await pool.query(
      'INSERT INTO cash_handovers (from_employee_id, to_employee_id, amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [from_employee_id, to_employee_id, amount, 'Pending']
    );

    // Deduct immediately so they can't double-handover
    await pool.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand - $1 WHERE employee_id = $2', [amount, from_employee_id]);

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
        if (wCheck.rowCount === 0) {
          await client.query('INSERT INTO employee_wallets (employee_id, cash_in_hand, balance) VALUES ($1, $2, 0)', [handover.to_employee_id, handover.amount]);
        } else {
          await client.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand + $1 WHERE employee_id = $2', [handover.amount, handover.to_employee_id]);
        }
      } else {
        // Return cash to sender
        await client.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand + $1 WHERE employee_id = $2', [handover.amount, handover.from_employee_id]);
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
             COALESCE(f.full_name, d_f.full_name, s_f.full_name, 'Unknown') as from_name, 
             COALESCE(t.full_name, d_t.full_name, s_t.full_name, 'Unknown') as to_name
      FROM cash_handovers ch
      LEFT JOIN employees f ON ch.from_employee_id = f.id::text
      LEFT JOIN department_admins d_f ON ch.from_employee_id = 'SA-' || d_f.id::text
      LEFT JOIN super_admins s_f ON ch.from_employee_id = 'ADMIN-' || s_f.id::text
      LEFT JOIN employees t ON ch.to_employee_id = t.id::text
      LEFT JOIN department_admins d_t ON ch.to_employee_id = 'SA-' || d_t.id::text
      LEFT JOIN super_admins s_t ON ch.to_employee_id = 'ADMIN-' || s_t.id::text
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
             COALESCE(f.full_name, d_f.full_name, s_f.full_name, 'Unknown') as from_name, 
             COALESCE(t.full_name, d_t.full_name, s_t.full_name, 'Unknown') as to_name
      FROM cash_handovers ch
      LEFT JOIN employees f ON ch.from_employee_id = f.id::text
      LEFT JOIN department_admins d_f ON ch.from_employee_id = 'SA-' || d_f.id::text
      LEFT JOIN super_admins s_f ON ch.from_employee_id = 'ADMIN-' || s_f.id::text
      LEFT JOIN employees t ON ch.to_employee_id = t.id::text
      LEFT JOIN department_admins d_t ON ch.to_employee_id = 'SA-' || d_t.id::text
      LEFT JOIN super_admins s_t ON ch.to_employee_id = 'ADMIN-' || s_t.id::text
      ORDER BY ch.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get All Handovers Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
