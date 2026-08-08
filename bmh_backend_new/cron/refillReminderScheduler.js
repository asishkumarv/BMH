const cron = require('node-cron');
const pool = require('../db');
const axios = require('axios');

// Helper to check if automatic reminder crons are enabled
const isAutoReminderEnabled = async () => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'auto_reminder_cron_enabled'");
    if (result.rowCount === 0) return true;
    let val = result.rows[0].value;
    if (typeof val === 'string') {
      try { val = JSON.parse(val); } catch (e) {}
    }
    return val !== false && val !== 'false';
  } catch (e) {
    console.error('Error loading auto reminder setting:', e.message);
    return true;
  }
};

let isProcessing = false;

// Helper to retrieve DoubleTick Configuration
const getDoubleTickConfig = async () => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'doubletick_config'");
    if (result.rowCount === 0) return null;
    let val = result.rows[0].value;
    if (typeof val === 'string') {
      try { val = JSON.parse(val); } catch (e) { return null; }
    }
    return val;
  } catch (e) {
    console.error('Error loading DoubleTick configuration:', e.message);
    return null;
  }
};

// Helper to get today's date string in YYYY-MM-DD format (IST Timezone)
const getISTTodayDateString = () => {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(d);
  let year = '', month = '', day = '';
  for (let p of parts) {
    if (p.type === 'year') year = p.value;
    if (p.type === 'month') month = p.value;
    if (p.type === 'day') day = p.value;
  }
  return `${year}-${month}-${day}`;
};

// Main function to check and send due refill reminders
async function checkAndSendRefillReminders() {
  try {
    const todayStr = getISTTodayDateString();
    console.log(`[Refill Reminder Scheduler] Scanning for reminders due today (${todayStr})...`);

    // Retrieve DoubleTick config
    const config = await getDoubleTickConfig();
    if (!config || !config.apiKey || !config.wabaNumber) {
      console.log('[Refill Reminder Scheduler] DoubleTick config is missing or incomplete. Skipping scan.');
      return;
    }

    // Query invoices where reminder_date matches today and reminder has not been sent yet
    const query = `
      SELECT id, patient_name, mobile_no, invoice_id, order_no, reminder_date 
      FROM ecogreen_sales_invoices 
      WHERE reminder_date = $1 
        AND (refill_reminder_sent IS NOT TRUE)
      LIMIT 50
    `;
    const res = await pool.query(query, [todayStr]);

    if (res.rowCount === 0) {
      console.log('[Refill Reminder Scheduler] No due refill reminders found for today.');
      return;
    }

    console.log(`[Refill Reminder Scheduler] Found ${res.rowCount} reminders to send.`);

    for (const invoice of res.rows) {
      const phone = invoice.mobile_no || '';
      const orderNo = invoice.invoice_id || invoice.order_no || `ID: ${invoice.id}`;
      
      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      }

      if (!cleanPhone || cleanPhone.length < 10) {
        console.log(`[Refill Reminder Scheduler] Skipping invoice ${orderNo} due to invalid phone: "${phone}"`);
        await pool.query(
          'UPDATE ecogreen_sales_invoices SET refill_reminder_sent = TRUE, refill_reminder_status = $1, refill_reminder_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['Invalid Phone', invoice.id]
        );
        continue;
      }

      // Fetch items from the invoice to display medicine names
      let medicineName = 'prescribed medicines';
      try {
        const itemsRes = await pool.query(
          'SELECT item_name FROM ecogreen_sales_invoice_items WHERE sales_invoice_id = $1 LIMIT 3',
          [invoice.id]
        );
        if (itemsRes.rowCount > 0) {
          medicineName = itemsRes.rows.map(r => r.item_name).join(', ');
        }
      } catch (err) {
        console.error(`[Refill Reminder Scheduler] Error fetching items for invoice ${invoice.id}:`, err.message);
      }

      // Send via DoubleTick V2 template endpoint using refill_reminder_v2 template
      try {
        await axios.post(
          'https://public.doubletick.io/v2/whatsapp/message/template',
          {
            messages: [
              {
                to: cleanPhone,
                from: config.wabaNumber,
                content: {
                  templateName: 'refill_reminder_v2',
                  language: config.defaultLanguage || 'en',
                  templateData: {
                    body: {
                      placeholders: [
                        { "1": invoice.patient_name || 'Customer' },
                        { "2": medicineName }
                      ]
                    }
                  }
                }
              }
            ],
            byPassMediaUrlValidation: false
          },
          {
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'Authorization': config.apiKey
            }
          }
        );

        // Mark as sent in DB
        await pool.query(
          'UPDATE ecogreen_sales_invoices SET refill_reminder_sent = TRUE, refill_reminder_sent_at = CURRENT_TIMESTAMP, refill_reminder_status = \'Sent\' WHERE id = $1',
          [invoice.id]
        );
        console.log(`[Refill Reminder Scheduler] Sent WABA refill reminder template successfully to ${cleanPhone} for invoice ${orderNo}`);

      } catch (err) {
        console.error(`[Refill Reminder Scheduler] Failed to send refill reminder template to ${cleanPhone}:`, err.response?.data || err.message);
        await pool.query(
          'UPDATE ecogreen_sales_invoices SET refill_reminder_sent = TRUE, refill_reminder_status = $1, refill_reminder_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['Failed to Send', invoice.id]
        );
      }
    }

  } catch (err) {
    console.error('[Refill Reminder Scheduler] Error running scan:', err.message);
  }
}

// Function to check and send follow-up reminders if the user hasn't replied to the first message after 24 hours
async function checkAndSendRefillFollowups() {
  try {
    console.log('[Refill Reminder Scheduler] Scanning for due follow-up reminders (sent > 24 hours ago, no reply)...');

    // Retrieve DoubleTick config
    const config = await getDoubleTickConfig();
    if (!config || !config.apiKey || !config.wabaNumber) {
      console.log('[Refill Reminder Scheduler] DoubleTick config is missing. Skipping follow-up scan.');
      return;
    }

    // Query invoices where reminder was sent, status is 'Sent' (meaning no user reply action yet), follow-up is not sent, and sent_at was more than 24 hours ago
    const query = `
      SELECT id, patient_name, mobile_no, invoice_id, order_no, reminder_date 
      FROM ecogreen_sales_invoices 
      WHERE refill_reminder_sent = TRUE 
        AND refill_reminder_status = 'Sent'
        AND (refill_followup_sent IS NOT TRUE)
        AND refill_reminder_sent_at < NOW() - INTERVAL '24 hours'
      LIMIT 50
    `;
    const res = await pool.query(query);

    if (res.rowCount === 0) {
      console.log('[Refill Reminder Scheduler] No due follow-up reminders found.');
      return;
    }

    console.log(`[Refill Reminder Scheduler] Found ${res.rowCount} follow-up reminders to send.`);

    for (const invoice of res.rows) {
      const phone = invoice.mobile_no || '';
      const orderNo = invoice.invoice_id || invoice.order_no || `ID: ${invoice.id}`;
      
      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      }

      if (!cleanPhone || cleanPhone.length < 10) {
        continue;
      }

      // Fetch items from the invoice to display medicine names
      let medicineName = 'prescribed medicines';
      try {
        const itemsRes = await pool.query(
          'SELECT item_name FROM ecogreen_sales_invoice_items WHERE sales_invoice_id = $1 LIMIT 3',
          [invoice.id]
        );
        if (itemsRes.rowCount > 0) {
          medicineName = itemsRes.rows.map(r => r.item_name).join(', ');
        }
      } catch (err) {
        console.error(`[Refill Reminder Scheduler] Error fetching items for invoice ${invoice.id}:`, err.message);
      }

      // Send via DoubleTick V2 template endpoint using refill_followup_v2 template
      try {
        await axios.post(
          'https://public.doubletick.io/v2/whatsapp/message/template',
          {
            messages: [
              {
                to: cleanPhone,
                from: config.wabaNumber,
                content: {
                  templateName: 'refill_followup_v2',
                  language: config.defaultLanguage || 'en',
                  templateData: {
                    body: {
                      placeholders: [
                        { "1": invoice.patient_name || 'Customer' },
                        { "2": medicineName }
                      ]
                    }
                  }
                }
              }
            ],
            byPassMediaUrlValidation: false
          },
          {
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'Authorization': config.apiKey
            }
          }
        );

        // Mark follow-up as sent in DB
        await pool.query(
          'UPDATE ecogreen_sales_invoices SET refill_followup_sent = TRUE, refill_followup_sent_at = CURRENT_TIMESTAMP, refill_reminder_status = \'Follow-up Sent\' WHERE id = $1',
          [invoice.id]
        );
        console.log(`[Refill Reminder Scheduler] Sent WABA follow-up template successfully to ${cleanPhone} for invoice ${orderNo}`);

      } catch (err) {
        console.error(`[Refill Reminder Scheduler] Failed to send WABA follow-up template to ${cleanPhone}:`, err.response?.data || err.message);
        await pool.query(
          'UPDATE ecogreen_sales_invoices SET refill_followup_sent = TRUE, refill_reminder_status = $1, refill_followup_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['Follow-up Failed', invoice.id]
        );
      }
    }

  } catch (err) {
    console.error('[Refill Reminder Scheduler] Error running follow-up scan:', err.message);
  }
}

// Composite execution function to process both check types
async function runRefillCronSequence() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    await checkAndSendRefillReminders();
    await checkAndSendRefillFollowups();
  } catch (err) {
    console.error('[Refill Reminder Scheduler] Error in sequence:', err.message);
  } finally {
    isProcessing = false;
  }
}

// Start Refill Reminder Scheduler
function startRefillReminderCron() {
  console.log('⏰ Starting Medicine Refill Reminder scanning cron (scheduled daily at 10:30 AM Asia/Kolkata)...');
  
  // Daily at 10:30 AM
  cron.schedule('30 10 * * *', async () => {
    const isEnabled = await isAutoReminderEnabled();
    if (!isEnabled) {
      console.log('[Refill Reminder Scheduler] Scheduled run skipped: Automatic reminders are disabled.');
      return;
    }
    runRefillCronSequence();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
}

module.exports = {
  startRefillReminderCron,
  checkAndSendRefillReminders: runRefillCronSequence
};
