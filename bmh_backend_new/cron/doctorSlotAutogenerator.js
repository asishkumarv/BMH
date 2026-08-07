const cron = require('node-cron');
const pool = require('../db');

/**
 * Helper to add days to a date
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format Date to YYYY-MM-DD
 */
function formatDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate slots for a doctor on a target date
 */
async function generateSlotsForDate(template, targetDateStr) {
  try {
    const doctorId = template.doctor_id;
    let slotsConfig = [];
    
    if (Array.isArray(template.timing_config)) {
      slotsConfig = template.timing_config;
    } else if (template.timing_config && Array.isArray(template.timing_config.slots)) {
      slotsConfig = template.timing_config.slots;
    }
    
    if (slotsConfig.length === 0) return;

    // Check if slots already exist for this doctor and date
    const checkRes = await pool.query(
      'SELECT id FROM doctor_slots WHERE doctor_id = $1 AND date = $2 LIMIT 1',
      [doctorId, targetDateStr]
    );

    if (checkRes.rowCount > 0) {
      // Slots already exist, skip auto-creation to avoid overlap
      return;
    }

    console.log(`Autogenerating ${slotsConfig.length} slots for Doctor ${template.name} (${doctorId}) on ${targetDateStr}`);

    for (const config of slotsConfig) {
      const { start_time, end_time, total_tokens, fee, assigned_peon_id } = config;
      if (!start_time || !end_time || !total_tokens || !fee) continue;

      await pool.query(
        `INSERT INTO doctor_slots (doctor_id, date, start_time, end_time, total_tokens, fee, assigned_peon_id, published, is_autocreated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          doctorId,
          targetDateStr,
          start_time,
          end_time,
          parseInt(total_tokens),
          parseFloat(fee),
          assigned_peon_id || null,
          false, // Auto-created slots are unpublished by default
          true  // marked as system-generated
        ]
      );
    }
  } catch (err) {
    console.error(`Error generating slots for template ID ${template.id} on date ${targetDateStr}:`, err.message);
  }
}

/**
 * Master generation function
 */
async function generateAllDoctorSlots() {
  console.log('Starting Doctor Slots Autogeneration check...');
  try {
    const resTemplates = await pool.query(
      `SELECT * FROM doctor_schedules 
       WHERE doctor_id IS NOT NULL 
         AND status = 'Active' 
         AND timing_config IS NOT NULL`
    );
    const templates = resTemplates.rows;
    if (templates.length === 0) {
      console.log('No active doctor slot templates found.');
      return;
    }

    const today = new Date();

    for (const template of templates) {
      let recurrenceRule = {};
      try {
        recurrenceRule = typeof template.recurrence_rule === 'string' 
          ? JSON.parse(template.recurrence_rule) 
          : (template.recurrence_rule || {});
      } catch (e) {
        console.error('Failed to parse recurrence rule for template ID:', template.id);
        continue;
      }

      const scheduleType = template.schedule_type;

      if (scheduleType === 'Daily') {
        // Daily: generate for T + 1 day
        const targetDate = addDays(today, 1);
        const targetDateStr = formatDateString(targetDate);
        await generateSlotsForDate(template, targetDateStr);

      } else if (scheduleType === 'Weekly') {
        // Weekly: generate for T + 7 days
        const targetDate = addDays(today, 7);
        const targetDayOfWeek = targetDate.getDay(); // 0 is Sun, 1 is Mon...
        
        // Days array: e.g. [1, 3, 5]
        const allowedDays = recurrenceRule.days || [];
        if (allowedDays.map(Number).includes(targetDayOfWeek)) {
          const targetDateStr = formatDateString(targetDate);
          await generateSlotsForDate(template, targetDateStr);
        }

      } else if (scheduleType === 'Monthly') {
        // Monthly: generate for T + 30 days
        const targetDate = addDays(today, 30);
        const targetDateStr = formatDateString(targetDate);
        
        const type = recurrenceRule.type; // 'dates' | 'pattern'
        let matches = false;

        if (type === 'dates') {
          const allowedDates = recurrenceRule.dates || [];
          const dayOfMonth = targetDate.getDate();
          if (allowedDates.map(Number).includes(dayOfMonth)) {
            matches = true;
          }
        } else if (type === 'pattern') {
          const patterns = recurrenceRule.patterns || []; // list of { week, day } e.g. { week: 2, day: 6 }
          const targetDayOfWeek = targetDate.getDay();
          const targetWeekIndex = Math.ceil(targetDate.getDate() / 7); // 1 to 5

          const matchedPattern = patterns.find(p => 
            Number(p.week) === targetWeekIndex && Number(p.day) === targetDayOfWeek
          );
          if (matchedPattern) {
            matches = true;
          }
        }

        if (matches) {
          await generateSlotsForDate(template, targetDateStr);
        }
      }
    }
    console.log('Doctor Slots Autogeneration check completed.');
  } catch (err) {
    console.error('Error running doctor slots autogeneration cron job:', err.message);
  }
}

/**
 * Starts node-cron at 6:00 AM daily in India Time (Asia/Kolkata)
 */
function startDoctorSlotAutogeneratorCron() {
  // Cron schedule: "0 6 * * *" triggers daily at 6:00 AM
  cron.schedule('0 6 * * *', () => {
    generateAllDoctorSlots();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });
  console.log('Doctor Slot Autogeneration Cron Schedule mounted (Daily at 6:00 AM Asia/Kolkata).');
}

module.exports = {
  startDoctorSlotAutogeneratorCron,
  generateAllDoctorSlots
};
