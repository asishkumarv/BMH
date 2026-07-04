require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

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

// Custom routes for EcoGreen-style sales orders
app.use('/sales-order', ecogreenSalesOrderRoutes);
app.use('/sales-orders-list', ecogreenSalesOrderRoutes);

// Custom routes for EcoGreen-style sales invoices
app.use('/sales-invoice', ecogreenSalesInvoiceRoutes);
app.use('/sales-invoice-list', ecogreenSalesInvoiceRoutes);

// Online Orders (Medical eCommerce)
app.use('/online-orders', onlineOrderRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
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
    
    startMedicineCron();
    startPurchaseOrderCron();
  } catch (err) {
    console.error("Failed to start medicine cron:", err.message);
  }

  // Initialize Online Orders DB
  try {
    const { initOnlineOrdersDB } = require('./controllers/onlineOrderController');
    initOnlineOrdersDB();
  } catch (err) {
    console.error("Failed to initialize online orders db:", err.message);
  }
});
