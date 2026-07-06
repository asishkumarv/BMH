const cron = require('node-cron');
const pool = require('../db');
const { sendExpoPushNotification } = require('../utils/pushNotification');

function parseTimeStringToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3];
  
  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  
  return (hours * 60) + minutes;
}

function getISTMinutesSinceMidnight(offsetMinutes = 0) {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23'
  });
  const parts = formatter.formatToParts(d);
  let h = 0, m = 0;
  for(let p of parts) {
    if(p.type === 'hour') h = parseInt(p.value, 10);
    if(p.type === 'minute') m = parseInt(p.value, 10);
  }
  return (((h * 60) + m + offsetMinutes) % 1440 + 1440) % 1440;
}

const checkAttendanceSchedules = async () => {
  try {
    const shiftTarget = getISTMinutesSinceMidnight(15); // Target time is 15 mins from now
    const breakTarget = getISTMinutesSinceMidnight(5);  // Target time is 5 mins from now

    // Get all users with push tokens and schedules
    const [empRes, adminRes, delRes] = await Promise.all([
      pool.query(`SELECT push_token, schedule_in, schedule_out, break_in, break_out, full_name as name FROM employees WHERE push_token IS NOT NULL`),
      pool.query(`SELECT push_token, schedule_in, schedule_out, break_in, break_out, full_name as name FROM department_admins WHERE push_token IS NOT NULL`),
      pool.query(`SELECT push_token, schedule_in, schedule_out, break_in, break_out, name FROM delivery_boys WHERE push_token IS NOT NULL`)
    ]);

    const allUsers = [...empRes.rows, ...adminRes.rows, ...delRes.rows];

    for (const user of allUsers) {
      if (!user.push_token) continue;
      
      const sIn = parseTimeStringToMinutes(user.schedule_in);
      const sOut = parseTimeStringToMinutes(user.schedule_out);
      const bIn = parseTimeStringToMinutes(user.break_in);
      const bOut = parseTimeStringToMinutes(user.break_out);

      // 15 mins prior to shift in
      if (sIn !== null && sIn === shiftTarget) {
        sendExpoPushNotification(user.push_token, 'Upcoming Shift', `Hello ${user.name}, your shift starts in 15 minutes. Please check-in on time.`);
      }
      
      // 15 mins prior to shift out
      if (sOut !== null && sOut === shiftTarget) {
        sendExpoPushNotification(user.push_token, 'Shift Ending', `Hello ${user.name}, your shift ends in 15 minutes. Don't forget to check out.`);
      }
      
      // 5 mins prior to break in
      if (bIn !== null && bIn === breakTarget) {
        sendExpoPushNotification(user.push_token, 'Break Time', `Hello ${user.name}, your scheduled break starts in 5 minutes.`);
      }
      
      // 5 mins prior to break out
      if (bOut !== null && bOut === breakTarget) {
        sendExpoPushNotification(user.push_token, 'Break Ending', `Hello ${user.name}, your break ends in 5 minutes. Please be ready.`);
      }
    }
  } catch (error) {
    console.error('Error running attendance scheduler:', error);
  }
};

// Run exactly every minute
cron.schedule('* * * * *', () => {
  checkAttendanceSchedules();
});

module.exports = { checkAttendanceSchedules };
