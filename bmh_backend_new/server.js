require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('./cron/taskScheduler');
require('./cron/attendanceScheduler');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
const employeeRoutes = require('./routes/employeeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const roleRoutes = require('./routes/roleRoutes');
const taskRoutes = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const stationaryRoutes = require('./routes/stationaryRoutes');
const walletRoutes = require('./routes/walletRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const patientRoutes = require('./routes/patientRoutes');
const ecogreenRoutes = require('./routes/ecogreenRoutes');
const purchaseOrdersRoutes = require('./routes/purchaseOrdersRoutes');
const ecogreenPurchaseRoutes = require('./routes/ecogreenPurchaseRoutes');
const salesOrdersRoutes = require('./routes/salesOrdersRoutes');
const normalSalesOrderRoutes = require('./routes/normalSalesOrderRoutes');
const deliveryBoyRoutes = require('./routes/deliveryBoyRoutes');
const deliveryAddressRoutes = require('./routes/deliveryAddressRoutes');
const profileRoutes = require('./routes/profileRoutes');
const ecogreenSalesOrderRoutes = require('./routes/ecogreenSalesOrderRoutes');
const ecogreenSalesInvoiceRoutes = require('./routes/ecogreenSalesInvoiceRoutes');
const onlineOrderRoutes = require('./routes/onlineOrderRoutes');
const manualOrderRoutes = require('./routes/manualOrderRoutes');
const busRoutes = require('./routes/busRoutes');
const crmRoutes = require('./routes/crmRoutes');

// Mount routes
app.use('/employees', employeeRoutes);
app.use('/admin', adminRoutes);
app.use('/department', departmentRoutes);
app.use('/roles', roleRoutes);
app.use('/tasks', taskRoutes);
app.use('/notifications', notificationRoutes);
app.use('/stationary', stationaryRoutes);
app.use('/wallet', walletRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/leave', require('./routes/leaveRoutes'));
app.use('/holidays', holidayRoutes);
app.use('/doctors', doctorRoutes);
app.use('/bookings', bookingRoutes);
app.use('/settings', settingsRoutes);
app.use('/pharmacy', pharmacyRoutes);
app.use('/patient', patientRoutes);
app.use('/ecogreen', ecogreenRoutes);
app.use('/ecogreen-purchase-orders', ecogreenPurchaseRoutes);
app.use('/purchase-orders', purchaseOrdersRoutes);
app.use('/sales-orders', salesOrdersRoutes);
app.use('/normal-sales', normalSalesOrderRoutes);
app.use('/delivery-boy', deliveryBoyRoutes);
app.use('/delivery-address', deliveryAddressRoutes);
app.use('/profile', profileRoutes);
app.use('/performance', require('./routes/performanceRoutes'));

// Custom routes for EcoGreen-style sales orders
app.use('/sales-order', ecogreenSalesOrderRoutes);
app.use('/sales-orders-list', ecogreenSalesOrderRoutes);

// Custom routes for EcoGreen-style sales invoices
app.use('/sales-invoice', ecogreenSalesInvoiceRoutes);
app.use('/sales-invoice-list', ecogreenSalesInvoiceRoutes);

// Online Orders (Medical eCommerce)
app.use('/online-orders', onlineOrderRoutes);

// Manual Orders
app.use('/manual-orders', manualOrderRoutes);

// Buses
app.use('/buses', busRoutes);

// CRM Routing
app.use('/crm', crmRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Run DB Patches / Migrations
  // CRM Messages Table Creation
  pool.query(`
    CREATE TABLE IF NOT EXISTS crm_messages (
      id SERIAL PRIMARY KEY,
      sender_id VARCHAR(50),
      sender_name VARCHAR(255),
      sender_role VARCHAR(100),
      message_type VARCHAR(50),
      content TEXT,
      recipients_count INTEGER DEFAULT 0,
      status VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
    .then(() => {
      return pool.query('ALTER TABLE crm_messages ADD COLUMN IF NOT EXISTS recipients TEXT');
    })
    .then(() => console.log('Successfully checked/patched crm_messages table.'))
    .catch(err => console.error('Error creating crm_messages table:', err.message));

  pool.query('ALTER TABLE ecogreenpurchase_orders ADD COLUMN IF NOT EXISTS submitted_to_id VARCHAR(50)')
    .then(() => console.log('Successfully checked/patched submitted_to_id in ecogreenpurchase_orders.'))
    .catch(err => console.error('Error patching ecogreenpurchase_orders (submitted_to_id):', err.message));

  pool.query('ALTER TABLE ecogreenpurchase_orders ADD COLUMN IF NOT EXISTS submitted_to_name VARCHAR(255)')
    .then(() => console.log('Successfully checked/patched submitted_to_name in ecogreenpurchase_orders.'))
    .catch(err => console.error('Error patching ecogreenpurchase_orders (submitted_to_name):', err.message));

  pool.query('ALTER TABLE ecogreenpurchase_orders ADD COLUMN IF NOT EXISTS submitted_to_role VARCHAR(100)')
    .then(() => console.log('Successfully checked/patched submitted_to_role in ecogreenpurchase_orders.'))
    .catch(err => console.error('Error patching ecogreenpurchase_orders (submitted_to_role):', err.message));

  pool.query('ALTER TABLE ecogreenpurchase_orders ADD COLUMN IF NOT EXISTS submitted_to_dept VARCHAR(100)')
    .then(() => console.log('Successfully checked/patched submitted_to_dept in ecogreenpurchase_orders.'))
    .catch(err => console.error('Error patching ecogreenpurchase_orders (submitted_to_dept):', err.message));

  pool.query('ALTER TABLE ecogreenpurchase_orders ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP')
    .then(() => console.log('Successfully checked/patched submitted_at in ecogreenpurchase_orders.'))
    .catch(err => console.error('Error patching ecogreenpurchase_orders (submitted_at):', err.message));

  pool.query('ALTER TABLE ecogreenpurchase_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP')
    .then(() => console.log('Successfully checked/patched delivered_at in ecogreenpurchase_orders.'))
    .catch(err => console.error('Error patching ecogreenpurchase_orders (delivered_at):', err.message));

  pool.query('ALTER TABLE ecogreenpurchase_orders ADD COLUMN IF NOT EXISTS modified_by_id VARCHAR(50)')
    .then(() => console.log('Successfully checked/patched modified_by_id in ecogreenpurchase_orders.'))
    .catch(err => console.error('Error patching ecogreenpurchase_orders (modified_by_id):', err.message));

  pool.query('ALTER TABLE ecogreenpurchase_orders ADD COLUMN IF NOT EXISTS modified_by_type VARCHAR(50)')
    .then(() => console.log('Successfully checked/patched modified_by_type in ecogreenpurchase_orders.'))
    .catch(err => console.error('Error patching ecogreenpurchase_orders (modified_by_type):', err.message));

  pool.query('ALTER TABLE ecogreenpurchase_orders ADD COLUMN IF NOT EXISTS modified_by_name VARCHAR(255)')
    .then(() => console.log('Successfully checked/patched modified_by_name in ecogreenpurchase_orders.'))
    .catch(err => console.error('Error patching ecogreenpurchase_orders (modified_by_name):', err.message));

  // online_orders modifications
  pool.query('ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP')
    .then(() => console.log('Successfully checked/patched delivered_at in online_orders.'))
    .catch(err => console.error('Error patching online_orders (delivered_at):', err.message));

  pool.query('ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS assigned_by INTEGER')
    .then(() => console.log('Successfully checked/patched assigned_by in online_orders.'))
    .catch(err => console.error('Error patching online_orders (assigned_by):', err.message));

  pool.query('ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS modified_by_id VARCHAR(50)')
    .then(() => console.log('Successfully checked/patched modified_by_id in online_orders.'))
    .catch(err => console.error('Error patching online_orders (modified_by_id):', err.message));

  pool.query('ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS modified_by_type VARCHAR(50)')
    .then(() => console.log('Successfully checked/patched modified_by_type in online_orders.'))
    .catch(err => console.error('Error patching online_orders (modified_by_type):', err.message));

  pool.query('ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS modified_by_name VARCHAR(255)')
    .then(() => console.log('Successfully checked/patched modified_by_name in online_orders.'))
    .catch(err => console.error('Error patching online_orders (modified_by_name):', err.message));

  pool.query('ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT \'[]\'::jsonb')
    .then(() => console.log('Successfully checked/patched notes in online_orders.'))
    .catch(err => console.error('Error patching online_orders (notes):', err.message));

  // ecogreen_sales_orders modifications
  pool.query('ALTER TABLE ecogreen_sales_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP')
    .then(() => console.log('Successfully checked/patched delivered_at in ecogreen_sales_orders.'))
    .catch(err => console.error('Error patching ecogreen_sales_orders (delivered_at):', err.message));

  pool.query('ALTER TABLE ecogreen_sales_orders ADD COLUMN IF NOT EXISTS assigned_by INTEGER')
    .then(() => console.log('Successfully checked/patched assigned_by in ecogreen_sales_orders.'))
    .catch(err => console.error('Error patching ecogreen_sales_orders (assigned_by):', err.message));

  pool.query('ALTER TABLE ecogreen_sales_orders ADD COLUMN IF NOT EXISTS modified_by_id VARCHAR(50)')
    .then(() => console.log('Successfully checked/patched modified_by_id in ecogreen_sales_orders.'))
    .catch(err => console.error('Error patching ecogreen_sales_orders (modified_by_id):', err.message));

  pool.query('ALTER TABLE ecogreen_sales_orders ADD COLUMN IF NOT EXISTS modified_by_type VARCHAR(50)')
    .then(() => console.log('Successfully checked/patched modified_by_type in ecogreen_sales_orders.'))
    .catch(err => console.error('Error patching ecogreen_sales_orders (modified_by_type):', err.message));

  pool.query('ALTER TABLE ecogreen_sales_orders ADD COLUMN IF NOT EXISTS modified_by_name VARCHAR(255)')
    .then(() => console.log('Successfully checked/patched modified_by_name in ecogreen_sales_orders.'))
    .catch(err => console.error('Error patching ecogreen_sales_orders (modified_by_name):', err.message));

  pool.query('ALTER TABLE ecogreen_sales_orders ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT \'[]\'::jsonb')
    .then(() => console.log('Successfully checked/patched notes in ecogreen_sales_orders.'))
    .catch(err => console.error('Error patching ecogreen_sales_orders (notes):', err.message));

  pool.query('ALTER TABLE cash_handovers ADD COLUMN IF NOT EXISTS note TEXT')
    .then(() => console.log('Successfully checked/patched note column in cash_handovers table.'))
    .catch(err => console.error('Error patching cash_handovers table:', err.message));

  pool.query('ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50)')
    .then(() => console.log('Successfully checked/patched payment_mode column in wallet_transactions table.'))
    .catch(err => console.error('Error patching wallet_transactions table (payment_mode):', err.message));

  pool.query('ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS payment_txn_id VARCHAR(255)')
    .then(() => console.log('Successfully checked/patched payment_txn_id column in wallet_transactions table.'))
    .catch(err => console.error('Error patching wallet_transactions table (payment_txn_id):', err.message));

  // ecogreensales_orders modifications
  pool.query('ALTER TABLE ecogreensales_orders ALTER COLUMN pharmacy TYPE TEXT').catch(e => console.error(e.message));
  pool.query('ALTER TABLE ecogreensales_orders ALTER COLUMN patient_address TYPE TEXT').catch(e => console.error(e.message));
  pool.query('ALTER TABLE ecogreensales_orders ALTER COLUMN order_items TYPE TEXT').catch(e => console.error(e.message));

  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending'").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS delivery_boy_id INTEGER").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50) DEFAULT 'Local'").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS bus_details JSONB").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(20)").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS assigned_by INTEGER").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS modified_by_id VARCHAR(50)").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS modified_by_name VARCHAR(255)").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS modified_by_type VARCHAR(50)").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS location_lat VARCHAR(50)").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS location_lng VARCHAR(50)").catch(e => console.error(e.message));

  // pod_payment_mode and payment_txn_id for sales orders / invoices / online orders
  pool.query("ALTER TABLE ecogreen_sales_orders ADD COLUMN IF NOT EXISTS pod_payment_mode VARCHAR(50) DEFAULT NULL").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreen_sales_orders ADD COLUMN IF NOT EXISTS payment_txn_id VARCHAR(255) DEFAULT NULL").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS pod_payment_mode VARCHAR(50) DEFAULT NULL").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_orders ADD COLUMN IF NOT EXISTS payment_txn_id VARCHAR(255) DEFAULT NULL").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_invoices ADD COLUMN IF NOT EXISTS pod_payment_mode VARCHAR(50) DEFAULT NULL").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_invoices ADD COLUMN IF NOT EXISTS payment_txn_id VARCHAR(255) DEFAULT NULL").catch(e => console.error(e.message));

  // ecogreensales_invoices modifications
  pool.query("ALTER TABLE ecogreensales_invoices ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending'").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_invoices ADD COLUMN IF NOT EXISTS delivered_by_id INTEGER").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_invoices ADD COLUMN IF NOT EXISTS delivered_by VARCHAR(255)").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_invoices ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_invoices ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50) DEFAULT 'Local'").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_invoices ADD COLUMN IF NOT EXISTS bus_details JSONB").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_invoices ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(20)").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_invoices ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_invoices ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_invoices ADD COLUMN IF NOT EXISTS location_lat VARCHAR(50)").catch(e => console.error(e.message));
  pool.query("ALTER TABLE ecogreensales_invoices ADD COLUMN IF NOT EXISTS location_lng VARCHAR(50)").catch(e => console.error(e.message));

  // Add appraisal columns to employees
  const empAppraisalCols = [
    'quality_score INTEGER DEFAULT 85',
    'manager_rating NUMERIC(3,1) DEFAULT 4.0',
    'manager_feedback TEXT DEFAULT \'\''
  ];
  empAppraisalCols.forEach(col => {
    pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS ${col}`)
      .catch(err => console.error(`Error adding column ${col} to employees:`, err.message));
  });

  // Add order/customer metadata columns to wallet_transactions
  const walletTxCols = [
    'order_no VARCHAR(100)',
    'invoice_no VARCHAR(100)',
    'customer_name VARCHAR(255)',
    'customer_phone VARCHAR(50)',
    'delivery_method VARCHAR(100)',
    'cash_amount NUMERIC(10, 2) DEFAULT 0',
    'online_amount NUMERIC(10, 2) DEFAULT 0'
  ];
  walletTxCols.forEach(col => {
    pool.query(`ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS ${col}`)
      .catch(err => console.error(`Error adding column ${col} to wallet_transactions:`, err.message));
  });

  // Add Store Delivery & Store Pickup columns to tables
  const storeDeliveryCols = [
    { table: 'online_orders', col: 'delivery_type VARCHAR(50) DEFAULT \'Local\'' },
    { table: 'online_orders', col: 'delivery_assigned_user_type VARCHAR(50) DEFAULT \'employee\'' },
    { table: 'ecogreensales_orders', col: 'delivery_assigned_user_type VARCHAR(50) DEFAULT \'employee\'' },
    { table: 'ecogreen_sales_orders', col: 'delivery_assigned_user_type VARCHAR(50) DEFAULT \'employee\'' },
    { table: 'ecogreensales_invoices', col: 'delivery_assigned_user_type VARCHAR(50) DEFAULT \'employee\'' },
    { table: 'ecogreen_sales_invoices', col: 'delivery_assigned_user_type VARCHAR(50) DEFAULT \'employee\'' },
    { table: 'ecogreensales_invoices', col: 'delivery_otp VARCHAR(20)' },
    { table: 'ecogreen_sales_invoices', col: 'delivery_otp VARCHAR(20)' },
    { table: 'ecogreenpurchase_orders', col: 'delivery_otp VARCHAR(20)' },
    { table: 'ecogreenpurchase_orders', col: 'delivery_assigned_user_type VARCHAR(50) DEFAULT \'employee\'' },
    { table: 'manual_orders', col: 'delivery_assigned_user_type VARCHAR(50) DEFAULT \'employee\'' }
  ];
  storeDeliveryCols.forEach(item => {
    pool.query(`ALTER TABLE ${item.table} ADD COLUMN IF NOT EXISTS ${item.col}`)
      .catch(err => console.error(`Error adding column ${item.col} to ${item.table}:`, err.message));
  });

  // Add order/customer metadata columns to cash_handovers
  const handoverCols = [
    'order_no VARCHAR(100)',
    'invoice_no VARCHAR(100)',
    'customer_name VARCHAR(255)',
    'customer_phone VARCHAR(50)',
    'delivery_method VARCHAR(100)',
    'cash_amount NUMERIC(10, 2) DEFAULT 0',
    'online_amount NUMERIC(10, 2) DEFAULT 0'
  ];
  handoverCols.forEach(col => {
    pool.query(`ALTER TABLE cash_handovers ADD COLUMN IF NOT EXISTS ${col}`)
      .catch(err => console.error(`Error adding column ${col} to cash_handovers:`, err.message));
  });

  // Backfill existing records from manual_orders
  setTimeout(async () => {
    try {
      console.log('Running backfill migration for wallet_transactions and cash_handovers...');
      await pool.query(`
        UPDATE wallet_transactions wt
        SET 
          order_no = COALESCE(mo.order_no, mo.id::text),
          invoice_no = COALESCE(mo.invoice_no, ''),
          customer_name = COALESCE(mo.customer_name, ''),
          customer_phone = COALESCE(mo.customer_phone, ''),
          delivery_method = COALESCE(mo.mode_of_delivery, ''),
          cash_amount = CASE WHEN wt.payment_mode = 'Cash' THEN wt.amount ELSE 0 END,
          online_amount = CASE WHEN wt.payment_mode = 'Online' THEN wt.amount ELSE 0 END
        FROM manual_orders mo
        WHERE (wt.order_no IS NULL OR wt.order_no = '')
          AND (
            wt.note LIKE '%' || mo.id::text || '%' 
            OR wt.note LIKE '%' || mo.order_no || '%'
          )
      `);
      console.log('Backfill migration completed successfully.');
      
      console.log('Cleaning up invalid push tokens from database tables...');
      await pool.query("UPDATE employees SET push_token = NULL WHERE push_token IS NOT NULL AND push_token NOT LIKE 'ExponentPushToken%'");
      await pool.query("UPDATE delivery_boys SET push_token = NULL WHERE push_token IS NOT NULL AND push_token NOT LIKE 'ExponentPushToken%'");
      await pool.query("UPDATE department_admins SET push_token = NULL WHERE push_token IS NOT NULL AND push_token NOT LIKE 'ExponentPushToken%'");
      console.log('Invalid push tokens cleanup completed.');
    } catch (e) {
      console.error('Error during startup database migrations/cleanup:', e.message);
    }
  }, 5000);
  
  // Initialize Pharmacy Background Sync
  try {
    const { initPharmacySync } = require('./controllers/pharmacyController');
    initPharmacySync();
  } catch (err) {
    console.error("Failed to initialize pharmacy sync:", err.message);
  }

  // Initialize Medicine DB and background sync
  try {
    const { startMedicineCron } = require('./cron/medicineSync');
    const { startPurchaseOrderCron } = require('./cron/purchaseOrderSync');
    
    if (typeof startMedicineCron === 'function') {
      startMedicineCron().catch(e => console.error("startMedicineCron async error:", e.message));
    }
    if (typeof startPurchaseOrderCron === 'function') {
      startPurchaseOrderCron().catch(e => console.error("startPurchaseOrderCron async error:", e.message));
    }
  } catch (err) {
    console.error("Failed to start medicine cron:", err.message);
  }

  // Initialize Online Orders DB
  try {
    const { initOnlineOrdersDB } = require('./controllers/onlineOrderController');
    if (typeof initOnlineOrdersDB === 'function') {
      initOnlineOrdersDB().catch(e => console.error("initOnlineOrdersDB async error:", e.message));
    } else {
      initOnlineOrdersDB();
    }
  } catch (err) {
    console.error("Failed to initialize online orders db:", err.message);
  }

  // Initialize Buses DB
  try {
    const { initBusesDB } = require('./controllers/busController');
    if (typeof initBusesDB === 'function') {
      initBusesDB().catch(e => console.error("initBusesDB async error:", e.message));
    }
  } catch (err) {
    console.error("Failed to initialize buses db:", err.message);
  }

  // Initialize Sales Orders Background Sync
  try {
    const { startSalesOrderCron } = require('./cron/salesOrderSync');
    startSalesOrderCron();
  } catch (err) {
    console.error("Failed to start sales order sync cron:", err.message);
  }
});
