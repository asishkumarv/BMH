const fs = require('fs');

const filepath = 'c:\\Users\\Lohitha Asish\\Desktop\\BMH\\bmh_backend_new\\controllers\\bookingController.js';
let content = fs.readFileSync(filepath, 'utf8');

const oldCode = `exports.bulkRescheduleSlot = async (req, res) => {
  try {
    const { original_slot_id, new_slot_id } = req.body;

    // Find all active bookings in original slot
    const bookingsRes = await pool.query(
      \`SELECT id FROM patient_bookings WHERE slot_id = $1 AND status IN ('Booked', 'Waiting') ORDER BY token_number ASC\`,
      [original_slot_id]
    );

    if (bookingsRes.rowCount === 0) return res.json({ success: true, message: 'No bookings to reschedule' });

    // Check target slot capacity
    const targetSlotRes = await pool.query(
      \`SELECT total_tokens, (SELECT COUNT(*) FROM patient_bookings WHERE slot_id = $1 AND status != 'Cancelled') as booked_count FROM doctor_slots WHERE id = $1\`,
      [new_slot_id]
    );

    if (targetSlotRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Target slot not found' });

    const { total_tokens, booked_count } = targetSlotRes.rows[0];
    const available = total_tokens - booked_count;

    if (available < bookingsRes.rowCount) {
      return res.status(400).json({ 
        success: false, 
        message: \`Not enough available tokens in target slot. Need \${bookingsRes.rowCount}, but only \${available} available.\` 
      });
    }

    // Start transaction
    await pool.query('BEGIN');

    let current_token = parseInt(booked_count) + 1;
    for (const row of bookingsRes.rows) {
      await pool.query(
        \`UPDATE patient_bookings SET slot_id = $1, token_number = $2 WHERE id = $3\`,
        [new_slot_id, current_token, row.id]
      );
      current_token++;
    }

    await pool.query('COMMIT');

    res.json({ success: true, message: \`Successfully rescheduled \${bookingsRes.rowCount} bookings\` });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Bulk Reschedule Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};`;

const newCode = `exports.bulkRescheduleSlot = async (req, res) => {
  try {
    console.log("BULK RESCHEDULE CALLED", req.body);
    const { original_slot_id, new_slot_id } = req.body;

    // Find all active bookings in original slot
    const bookingsRes = await pool.query(
      \`SELECT id FROM patient_bookings WHERE slot_id = $1 AND status IN ('Booked', 'Waiting') ORDER BY token_number ASC\`,
      [original_slot_id]
    );
    console.log("ORIGINAL BOOKINGS FOUND:", bookingsRes.rowCount);

    if (bookingsRes.rowCount === 0) {
       console.log("NO BOOKINGS");
       return res.json({ success: true, message: 'No bookings to reschedule' });
    }

    // Check target slot capacity
    const targetSlotRes = await pool.query(
      \`SELECT total_tokens, (SELECT COUNT(*) FROM patient_bookings WHERE slot_id = $1 AND status != 'Cancelled') as booked_count FROM doctor_slots WHERE id = $1\`,
      [new_slot_id]
    );
    console.log("TARGET SLOT ROW COUNT:", targetSlotRes.rowCount);

    if (targetSlotRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Target slot not found' });

    const { total_tokens, booked_count } = targetSlotRes.rows[0];
    const available = total_tokens - booked_count;
    console.log("TARGET SLOT STATS:", { total_tokens, booked_count, available, needed: bookingsRes.rowCount });

    if (available < bookingsRes.rowCount) {
      return res.status(400).json({ 
        success: false, 
        message: \`Not enough available tokens in target slot. Need \${bookingsRes.rowCount}, but only \${available} available.\` 
      });
    }

    // Start transaction
    await pool.query('BEGIN');
    console.log("TRANSACTION STARTED");

    let current_token = parseInt(booked_count) + 1;
    for (const row of bookingsRes.rows) {
      await pool.query(
        \`UPDATE patient_bookings SET slot_id = $1, token_number = $2 WHERE id = $3\`,
        [new_slot_id, current_token, row.id]
      );
      current_token++;
    }

    await pool.query('COMMIT');
    console.log("TRANSACTION COMMITTED");

    res.json({ success: true, message: \`Successfully rescheduled \${bookingsRes.rowCount} bookings\` });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Bulk Reschedule Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(filepath, content, 'utf8');
console.log("Patched bookingController.js");
