const cron = require('node-cron');
const pool = require('../db');

// Run daily at 6:00 AM IST (12:30 AM UTC) to auto-assign configured tasks
cron.schedule('30 0 * * *', async () => {
  console.log('Running daily automatic checker auto-assignment from configurations...');
  try {
    // 1. Process Rack Checker Auto-Assignments
    const rackSettingsRes = await pool.query("SELECT value FROM settings WHERE key = 'rack_auto_assignments'");
    if (rackSettingsRes.rows.length > 0) {
      let rackAssignments = rackSettingsRes.rows[0].value;
      if (typeof rackAssignments === 'string') rackAssignments = JSON.parse(rackAssignments);
      
      if (Array.isArray(rackAssignments)) {
        for (const config of rackAssignments) {
          const { userId, userName, userRole, racks } = config;
          if (!userId || !Array.isArray(racks)) continue;

          for (const rack of racks) {
            // Check if active pending assignment already exists for this user and rack
            const check = await pool.query(
              "SELECT id FROM rack_assignments WHERE assigned_to = $1 AND rack_number = $2 AND status = 'pending'",
              [userId, rack]
            );
            if (check.rowCount === 0) {
              await pool.query(
                `INSERT INTO rack_assignments (assigned_by, assigned_to, assigned_to_name, assigned_to_role, rack_number, status)
                 VALUES ($1, $2, $3, $4, $5, 'pending')`,
                ['System', userId, userName, userRole, rack]
              );
              console.log(`[Auto-Assign] Assigned Rack Checker rack ${rack} to ${userName}`);
            }
          }
        }
      }
    }

    // 2. Process Inventory Checker Auto-Assignments
    const invSettingsRes = await pool.query("SELECT value FROM settings WHERE key = 'inventory_auto_assignments'");
    if (invSettingsRes.rows.length > 0) {
      let invAssignments = invSettingsRes.rows[0].value;
      if (typeof invAssignments === 'string') invAssignments = JSON.parse(invAssignments);
      
      if (Array.isArray(invAssignments)) {
        for (const config of invAssignments) {
          const { userId, userName, userRole, racks } = config;
          if (!userId || !Array.isArray(racks)) continue;

          for (const rack of racks) {
            // Check if active pending task already exists for this user and rack
            const check = await pool.query(
              "SELECT id FROM inventory_tasks WHERE assigned_to = $1 AND rack_number = $2 AND status = 'pending'",
              [userId, rack]
            );
            if (check.rowCount === 0) {
              await pool.query(
                `INSERT INTO inventory_tasks (assigned_by, assigned_to, assigned_to_name, assigned_to_role, rack_number, status)
                 VALUES ($1, $2, $3, $4, $5, 'pending')`,
                ['System', userId, userName, userRole, rack]
              );
              console.log(`[Auto-Assign] Assigned Inventory Checker rack ${rack} to ${userName}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in daily checker auto-assignment:', error);
  }
});

module.exports = cron;
