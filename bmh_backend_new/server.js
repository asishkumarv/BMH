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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
