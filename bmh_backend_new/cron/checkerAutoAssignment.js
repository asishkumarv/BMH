const cron = require('node-cron');
const pool = require('../db');

// Run daily at 6:00 AM IST (12:30 AM UTC) to auto-assign 2 inventory tasks per checker
cron.schedule('30 0 * * *', async () => {
  console.log('Running daily automatic checker auto-assignment...');
  try {
    // 1. Fetch settings to find who has inventory_checker_access
    const settingsRes = await pool.query("SELECT settings FROM settings ORDER BY id DESC LIMIT 1");
    if (settingsRes.rows.length === 0) return;
    let settings = settingsRes.rows[0].settings;
    if (typeof settings === 'string') settings = JSON.parse(settings);
    const invAccess = settings.inventory_checker_access || {};

    // Get employee and sub-admin lists
    const empRes = await pool.query("SELECT id, full_name, department FROM employees WHERE status = 'approved'");
    const saRes = await pool.query("SELECT id, full_name, department_name FROM department_admins WHERE status = 'approved'");

    const checkers = [];
    empRes.rows.forEach(e => {
      const uid = e.id.toString();
      if (invAccess[uid] === true) {
        checkers.push({ uniqueId: uid, full_name: e.full_name, role: 'Employee' });
      }
    });
    saRes.rows.forEach(sa => {
      const uid = `SA-${sa.id}`;
      if (invAccess[uid] === true) {
        checkers.push({ uniqueId: uid, full_name: sa.full_name, role: 'Sub Admin' });
      }
    });

    if (checkers.length === 0) {
      console.log('No staff has inventory checker access enabled.');
      return;
    }

    // Get list of racks
    const rackRes = await pool.query("SELECT DISTINCT rack FROM ecogreen_medicines WHERE rack IS NOT NULL AND rack != '' AND rack != '-' ORDER BY rack ASC");
    const racks = rackRes.rows.map(r => r.rack);
    if (racks.length === 0) return;

    for (const checker of checkers) {
      // Check if they already have active (pending) assignments today
      const assignRes = await pool.query(
        "SELECT id FROM inventory_tasks WHERE assigned_to = $1 AND created_at >= CURRENT_DATE",
        [checker.uniqueId]
      );
      if (assignRes.rows.length >= 2) {
        console.log(`Checker ${checker.full_name} already has ${assignRes.rows.length} tasks today.`);
        continue;
      }

      const needed = 2 - assignRes.rows.length;
      // Filter out racks already assigned to them today
      const assignedRacksRes = await pool.query(
        "SELECT rack_number FROM inventory_tasks WHERE assigned_to = $1 AND created_at >= CURRENT_DATE",
        [checker.uniqueId]
      );
      const assignedRacks = new Set(assignedRacksRes.rows.map(r => r.rack_number));
      const availableRacks = racks.filter(r => !assignedRacks.has(r));

      if (availableRacks.length === 0) continue;

      // Pick random
      const shuffled = availableRacks.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, needed);

      for (const rack of selected) {
        await pool.query(
          `INSERT INTO inventory_tasks (assigned_by, assigned_to, assigned_to_name, assigned_to_role, rack_number, status)
           VALUES ($1, $2, $3, $4, $5, 'pending')`,
          ['System', checker.uniqueId, checker.full_name, checker.role, rack]
        );
        console.log(`Auto-assigned rack ${rack} to checker ${checker.full_name}`);
      }
    }
  } catch (error) {
    console.error('Error in daily checker auto-assignment:', error);
  }
});

module.exports = cron;
