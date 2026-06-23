require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const employeeRoutes = require('./routes/employeeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const roleRoutes = require('./routes/roleRoutes');

// Mount routes
app.use('/employees', employeeRoutes);
app.use('/admin', adminRoutes);
app.use('/department', departmentRoutes);
app.use('/roles', roleRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
