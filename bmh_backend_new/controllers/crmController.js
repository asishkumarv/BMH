const pool = require('../db');
const axios = require('axios');

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

exports.getPatients = async (req, res) => {
  try {
    const { search, city, gender, bloodGroup, doctorId, visitYear, visitMonth, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const params = [];
    const conditions = [];
    let isBookingJoined = false;

    if (doctorId && doctorId !== 'all') {
      isBookingJoined = true;
      params.push(doctorId);
      conditions.push(`ds.doctor_id = $${params.length}`);
      
      const vYear = visitYear || 'all';
      const vMonth = visitMonth || 'all';

      if (vYear !== 'all') {
        const yr = parseInt(vYear);
        if (!isNaN(yr)) {
          if (vMonth !== 'all') {
            const mth = parseInt(vMonth); // 1-indexed: 1 = Jan, 12 = Dec
            if (!isNaN(mth)) {
              const startOfRange = new Date(yr, mth - 1, 1);
              const endOfRange = new Date(yr, mth, 0, 23, 59, 59, 999);
              
              const startStr = `${startOfRange.getFullYear()}-${String(startOfRange.getMonth() + 1).padStart(2, '0')}-${String(startOfRange.getDate()).padStart(2, '0')}`;
              const endStr = `${endOfRange.getFullYear()}-${String(endOfRange.getMonth() + 1).padStart(2, '0')}-${String(endOfRange.getDate()).padStart(2, '0')}`;
              
              params.push(startStr, endStr);
              conditions.push(`ds.date >= $${params.length - 1}::date AND ds.date <= $${params.length}::date`);
            }
          } else {
            const startStr = `${yr}-01-01`;
            const endStr = `${yr}-12-31`;
            params.push(startStr, endStr);
            conditions.push(`ds.date >= $${params.length - 1}::date AND ds.date <= $${params.length}::date`);
          }
        }
      }
    }

    let query = 'SELECT ';
    let countQuery = 'SELECT ';

    if (isBookingJoined) {
      query += 'DISTINCT p.id, p.name, p.mobile, p.email, p.age, p.gender, p.blood_group, p.city, p.pin_code, p.created_at FROM patients p ';
      query += 'JOIN patient_bookings pb ON p.id = pb.patient_id JOIN doctor_slots ds ON pb.slot_id = ds.id';
      countQuery += 'COUNT(DISTINCT p.id) FROM patients p ';
      countQuery += 'JOIN patient_bookings pb ON p.id = pb.patient_id JOIN doctor_slots ds ON pb.slot_id = ds.id';
    } else {
      query += 'p.id, p.name, p.mobile, p.email, p.age, p.gender, p.blood_group, p.city, p.pin_code, p.created_at FROM patients p';
      countQuery += 'COUNT(*) FROM patients p';
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.mobile ILIKE $${params.length} OR p.email ILIKE $${params.length})`);
    }
    if (city) {
      params.push(city);
      conditions.push(`p.city = $${params.length}`);
    }
    if (gender) {
      params.push(gender);
      conditions.push(`p.gender = $${params.length}`);
    }
    if (bloodGroup) {
      params.push(bloodGroup);
      conditions.push(`p.blood_group = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    // Fetch total count
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count);

    // Fetch paginated results
    query += ` ORDER BY p.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);
    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    console.error('CRM Get Patients Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getFilterOptions = async (req, res) => {
  try {
    const citiesRes = await pool.query("SELECT DISTINCT city FROM patients WHERE city IS NOT NULL AND city != '' ORDER BY city ASC");
    const bloodRes = await pool.query("SELECT DISTINCT blood_group FROM patients WHERE blood_group IS NOT NULL AND blood_group != '' ORDER BY blood_group ASC");
    const gendersRes = await pool.query("SELECT DISTINCT gender FROM patients WHERE gender IS NOT NULL AND gender != '' ORDER BY gender ASC");
    const doctorsRes = await pool.query("SELECT id, full_name, department FROM doctors WHERE status = 'Approved' OR status = 'active' OR status IS NULL ORDER BY full_name ASC");

    res.json({
      success: true,
      cities: citiesRes.rows.map(r => r.city),
      bloodGroups: bloodRes.rows.map(r => r.blood_group),
      genders: gendersRes.rows.map(r => r.gender),
      doctors: doctorsRes.rows
    });
  } catch (error) {
    console.error('CRM Get Filter Options Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { messageType, recipients, messageText, templateName, templateData, senderId, senderName, senderRole } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients provided' });
    }

    const config = await getDoubleTickConfig();
    if (!config || !config.apiKey || !config.wabaNumber) {
      return res.status(400).json({ success: false, message: 'DoubleTick WhatsApp API is not configured in Settings' });
    }

    const apiKey = config.apiKey;
    const wabaNumber = config.wabaNumber;

    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    if (messageType === 'template') {
      const messagesArray = recipients.map(phone => {
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) {
          cleanPhone = '91' + cleanPhone;
        }

        const lang = config.defaultLanguage || 'en';
        
        let formattedData = {};
        if (typeof templateData === 'object' && templateData !== null && !Array.isArray(templateData)) {
          const placeholders = Object.entries(templateData).map(([key, val]) => ({
            [key]: String(val)
          }));
          formattedData = {
            body: {
              placeholders
            }
          };
        } else if (Array.isArray(templateData)) {
          formattedData = {
            body: {
              placeholders: templateData
            }
          };
        }

        return {
          to: cleanPhone,
          from: wabaNumber,
          content: {
            templateName: templateName,
            language: lang,
            templateData: formattedData
          }
        };
      });

      try {
        const doubleTickRes = await axios.post(
          'https://public.doubletick.io/v2/whatsapp/message/template',
          { messages: messagesArray, byPassMediaUrlValidation: false },
          {
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'Authorization': apiKey
            }
          }
        );
        successCount = recipients.length;
      } catch (err) {
        console.error('DoubleTick V2 Template Send Error:', err.response?.data || err.message);
        failureCount = recipients.length;
        errors.push(err.response?.data?.message || err.message);
      }
    } else {
      const promises = recipients.map(async (phone) => {
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) {
          cleanPhone = '91' + cleanPhone;
        }

        try {
          await axios.post(
            'https://public.doubletick.io/whatsapp/message/text',
            {
              to: cleanPhone,
              from: wabaNumber,
              content: {
                text: messageText
              }
            },
            {
              headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'Authorization': apiKey
              }
            }
          );
          successCount++;
        } catch (err) {
          console.error(`DoubleTick Text Send Error to ${cleanPhone}:`, err.response?.data || err.message);
          failureCount++;
          errors.push(`Failed for ${cleanPhone}: ` + (err.response?.data?.message || err.message));
        }
      });

      await Promise.all(promises);
    }

    const overallStatus = failureCount === 0 ? 'Sent' : successCount === 0 ? 'Failed' : 'Partial';
    
    const contentLogged = messageType === 'template' 
      ? `Template: ${templateName} | Data: ${JSON.stringify(templateData)}` 
      : messageText;

    // Resolve phone numbers to patient names for log auditing
    let resolvedRecipients = [];
    try {
      const cleanPhoneList = recipients.map(r => {
        let num = r.replace(/\D/g, '');
        if (num.length === 12 && num.startsWith('91')) {
          num = num.substring(2);
        }
        return num;
      });

      const resolveRes = await pool.query(
        'SELECT name, mobile FROM patients WHERE mobile IN (SELECT unnest($1::text[])) OR RIGHT(mobile, 10) IN (SELECT RIGHT(unnest($1::text[]), 10))',
        [cleanPhoneList]
      );
      
      const phoneToName = {};
      resolveRes.rows.forEach(row => {
        const cleanMobile = row.mobile.replace(/\D/g, '');
        phoneToName[cleanMobile.slice(-10)] = row.name;
      });

      resolvedRecipients = recipients.map(r => {
        const cleanVal = r.replace(/\D/g, '');
        const name = phoneToName[cleanVal.slice(-10)];
        return name ? `${name} (${r})` : r;
      });
    } catch (resolveErr) {
      console.error('Error resolving recipient names:', resolveErr);
      resolvedRecipients = recipients;
    }

    await pool.query(
      `INSERT INTO crm_messages (sender_id, sender_name, sender_role, message_type, content, recipients_count, status, recipients)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        senderId || 'admin',
        senderName || 'Super Admin',
        senderRole || 'super_admin',
        messageType,
        contentLogged,
        recipients.length,
        overallStatus,
        JSON.stringify(resolvedRecipients)
      ]
    );

    res.json({
      success: failureCount === 0,
      successCount,
      failureCount,
      errors,
      status: overallStatus
    });

  } catch (error) {
    console.error('CRM Send Message Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const config = await getDoubleTickConfig();
    if (!config || !config.apiKey) {
      return res.json({ success: false, message: 'DoubleTick API is not configured in Settings', templates: [] });
    }

    const response = await axios.get('https://public.doubletick.io/v2/templates', {
      headers: {
        'accept': 'application/json',
        'Authorization': config.apiKey
      },
      params: {
        status: 'ALL'
      }
    });

    const templates = response.data.templates || response.data || [];
    res.json({ success: true, templates });
  } catch (error) {
    console.error('CRM Get Templates Error:', error.response?.data || error.message);
    res.json({ success: false, templates: [], message: error.response?.data?.message || error.message });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const config = await getDoubleTickConfig();
    if (!config || !config.apiKey || !config.wabaNumber) {
      return res.status(400).json({ success: false, message: 'DoubleTick API is not configured in Settings' });
    }

    const { name, category, language, allowCategoryUpdate, components } = req.body;

    // Automatically detect template body placeholders and append example values required by Meta
    if (components && components.body && typeof components.body.text === 'string') {
      const matches = components.body.text.match(/\{\{(\d+)\}\}/g) || [];
      if (matches.length > 0) {
        const samples = matches.map((_, idx) => `sample_value_${idx + 1}`);
        components.body.example = samples; // 1D array of strings directly expected by DoubleTick
      }
    }

    console.log('Template creation components payload:', JSON.stringify(components, null, 2));

    const response = await axios.post(
      'https://public.doubletick.io/template',
      {
        name,
        category: category || 'UTILITY',
        language: language || 'en',
        allowCategoryUpdate: allowCategoryUpdate !== false,
        wabaNumbers: [config.wabaNumber],
        components
      },
      {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'Authorization': config.apiKey
        }
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('CRM Create Template Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.response?.data?.message || error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM crm_messages ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('CRM Get History Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const config = await getDoubleTickConfig();
    if (!config || !config.apiKey || !config.wabaNumber) {
      return res.status(400).json({ success: false, message: 'DoubleTick API is not configured in Settings' });
    }

    const { name } = req.params;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Template name is required' });
    }

    await axios.delete(
      'https://public.doubletick.io/template',
      {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'Authorization': config.apiKey
        },
        data: {
          name: name,
          wabaPhoneNumber: config.wabaNumber
        }
      }
    );

    res.json({ success: true, message: 'Template deleted successfully from DoubleTick and Meta' });
  } catch (error) {
    console.error('CRM Delete Template Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.response?.data?.message || error.message });
  }
};

exports.initiateVoiceCall = async (req, res) => {
  try {
    const config = await getDoubleTickConfig();
    if (!config || !config.apiKey || !config.wabaNumber) {
      return res.status(400).json({ success: false, message: 'DoubleTick API is not configured in Settings' });
    }

    const { to, channel = 'PSTN', aiAgentName } = req.body;
    if (!to || !aiAgentName) {
      return res.status(400).json({ success: false, message: 'Recipient number and AI Agent template name are required' });
    }

    // Clean phone number and ensure E.164 format with + prefix
    let cleanPhone = to.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }

    // DoubleTick WABA or PSTN caller number in E.164 format
    let callerNumber = config.wabaNumber.replace(/[^0-9]/g, '');
    if (!callerNumber.startsWith('+')) {
      callerNumber = '+' + callerNumber;
    }

    const response = await axios.post(
      'https://public.doubletick.io/v1/call/ai-bot',
      {
        from: callerNumber,
        to: cleanPhone,
        channel: channel.toUpperCase(),
        aiAgentName: aiAgentName
      },
      {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'Authorization': config.apiKey
        }
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('CRM Voice Call Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.response?.data?.message || error.message });
  }
};

exports.handleDoubleTickWebhook = async (req, res) => {
  try {
    console.log('Received DoubleTick webhook payload:', JSON.stringify(req.body));
    
    const event = req.body.event;
    const data = req.body.data;
    
    if (event === 'incoming_message' && data && data.message) {
      const fromPhone = data.from; // e.g. "919439085126"
      const textBody = data.message.text?.body?.trim();
      
      if (fromPhone && textBody) {
        // Clean phone number to get 10-digit mobile
        let cleanPhone = fromPhone.replace(/\D/g, '');
        if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
          cleanPhone = cleanPhone.substring(2);
        }
        
        console.log(`[DoubleTick Webhook] Processing incoming reply "${textBody}" from phone: ${cleanPhone}`);
        
        // Find if this customer has a reminder sent
        const reminderRes = await pool.query(
          `SELECT id, patient_name, order_total, delivery_type, patient_address, invoice_id, reminder_date, patient_address_details, pharmacy_details, mobile_no, user_id, act_code, act_name, dr_code, dr_name, dr_address, dr_reg_no, dr_office_code, dman_code, order_disc_per, ref_no, order_id, remark, urgent_flag, ord_conversion_flag, dc_conversion_flag, ord_ref_no, sys_name, sys_ip, sys_user, payment_mode
           FROM ecogreen_sales_invoices 
           WHERE (mobile_no = $1 OR mobile_no = $2)
             AND refill_reminder_sent = TRUE
           ORDER BY refill_reminder_sent_at DESC
           LIMIT 1`,
          [cleanPhone, '91' + cleanPhone]
        );
        
        if (reminderRes.rowCount > 0) {
          const invoice = reminderRes.rows[0];
          const replyUpper = textBody.toUpperCase();
          
          let responseMessage = '';
          let statusUpdate = null;
          
          if (replyUpper === 'YES' || replyUpper.includes('YES') || replyUpper.includes('REORDER')) {
            statusUpdate = 'Reordered';
            
            // Fetch items from the original invoice
            const itemsRes = await pool.query(
              `SELECT item_seq, itemcode, item_name, total_loose_qty, total_loose_sch_qty, service_qty, sale_rate, disc_per, sch_disc_per 
               FROM ecogreen_sales_invoice_items 
               WHERE sales_invoice_id = $1`,
              [invoice.id]
            );
            
            // Create sales order with same details and same items/quantity
            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              
              const ordDate = new Date().toISOString().split('T')[0];
              const ordTime = new Date().toTimeString().split(' ')[0];
              
              const insertHeader = `
                INSERT INTO ecogreen_sales_orders (
                  ip_no, mobile_no, patient_name, patient_address, patient_email, counter_sale,
                  ord_date, ord_time, user_id, act_code, act_name, dr_code, dr_name, dr_address,
                  dr_reg_no, dr_office_code, dman_code, order_total, order_disc_per, ref_no,
                  order_id, remark, urgent_flag, ord_conversion_flag, dc_conversion_flag,
                  ord_ref_no, sys_name, sys_ip, sys_user, status, delivery_type, payment_mode
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                  $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
                ) RETURNING id;
              `;
              
              const headerValues = [
                invoice.invoice_id ? (invoice.invoice_id + '-REORDER') : ('REORDER-' + invoice.id),
                cleanPhone,
                invoice.patient_name || 'Walk-in Patient',
                invoice.patient_address || '',
                null, // patient_email
                invoice.counter_sale || null,
                ordDate,
                ordTime,
                invoice.user_id || 'system',
                invoice.act_code || null,
                invoice.act_name || null,
                invoice.dr_code || null,
                invoice.dr_name || null,
                invoice.dr_address || null,
                invoice.dr_reg_no || null,
                invoice.dr_office_code || null,
                invoice.dman_code || null,
                invoice.order_total ? parseFloat(invoice.order_total) : 0,
                invoice.order_disc_per ? parseFloat(invoice.order_disc_per) : 0,
                invoice.ref_no || null,
                invoice.order_id || null,
                'Auto Reordered from Refill Reminder (Invoice: ' + (invoice.invoice_id || invoice.id) + ')',
                invoice.urgent_flag || null,
                invoice.ord_conversion_flag || null,
                invoice.dc_conversion_flag || null,
                invoice.ord_ref_no || null,
                invoice.sys_name || null,
                invoice.sys_ip || null,
                invoice.sys_user || null,
                'Pending', // status
                invoice.delivery_type || 'Local',
                invoice.payment_mode || 'POD'
              ];
              
              const headerRes = await client.query(insertHeader, headerValues);
              const savedOrderId = headerRes.rows[0].id;
              
              // Insert Items
              for (const item of itemsRes.rows) {
                const insertItem = `
                  INSERT INTO ecogreen_sales_order_items (
                    sales_order_id, item_seq, itemcode, item_name, total_loose_qty, total_loose_sch_qty,
                    service_qty, sale_rate, disc_per, sch_disc_per
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `;
                const itemValues = [
                  savedOrderId,
                  item.item_seq || 1,
                  item.itemcode || null,
                  item.item_name || null,
                  item.total_loose_qty || 0,
                  item.total_loose_sch_qty || 0,
                  item.service_qty || 0,
                  item.sale_rate || 0,
                  item.disc_per || '0.00',
                  item.sch_disc_per || '0.00'
                ];
                await client.query(insertItem, itemValues);
              }
              
              await client.query('COMMIT');
              console.log(`[DoubleTick Webhook] Successfully created reorder sales order ID: ${savedOrderId}`);
              responseMessage = 'Order created successfully! Our home delivery team will contact you soon.';
            } catch (err) {
              await client.query('ROLLBACK');
              console.error('[DoubleTick Webhook] Transaction error creating reorder:', err.stack);
              responseMessage = 'Sorry, there was an error processing your reorder request. Please contact us directly.';
            } finally {
              client.release();
            }
            
          } else if (replyUpper.includes('ALREADY') || replyUpper.includes('PURCHASED')) {
            statusUpdate = 'Completed Elsewhere';
            responseMessage = 'Thank you. We have marked this refill reminder as completed.';
          } else if (replyUpper.includes('DOCTOR') || replyUpper.includes('CHANGED') || replyUpper.includes('TREATMENT')) {
            statusUpdate = 'Treatment Changed';
            responseMessage = 'Thank you for updating us. We have paused future reminders for this prescription.';
          } else if (replyUpper.includes('LATER') || replyUpper.includes('REMIND')) {
            statusUpdate = 'Remind Later';
            
            // Reschedule reminder to 3 days from now
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 3);
            const futureDateStr = futureDate.toISOString().split('T')[0];
            
            await pool.query(
              `UPDATE ecogreen_sales_invoices 
               SET reminder_date = $1, refill_reminder_sent = FALSE, refill_reminder_sent_at = NULL, refill_reminder_status = NULL 
               WHERE id = $2`,
              [futureDateStr, invoice.id]
            );
            
            responseMessage = 'Sure, we will remind you again in 3 days.';
          } else if (replyUpper === 'STOP' || replyUpper.includes('STOP') || replyUpper.includes('UNSUBSCRIBE')) {
            statusUpdate = 'Opted Out';
            responseMessage = 'You have successfully opted out of refill reminders. We will not send you any more reminders.';
          } else {
            // Fallback response showing options
            responseMessage = `Please reply with one of the options below:
1. YES - to reorder the medicine
2. Already Purchased - if you bought it elsewhere
3. Doctor Changed Medicine - if your treatment has changed
4. Remind Me Later - to get a reminder in 3 days
5. STOP - to unsubscribe from refill reminders`;
          }
          
          if (statusUpdate) {
            await pool.query(
              `UPDATE ecogreen_sales_invoices 
               SET refill_reminder_status = $1 
               WHERE id = $2`,
              [statusUpdate, invoice.id]
            );
          }
          
          // Send back the auto-response message via DoubleTick
          const resultDT = await pool.query("SELECT value FROM settings WHERE key = 'doubletick_config'");
          if (resultDT.rowCount > 0) {
            let val = resultDT.rows[0].value;
            if (typeof val === 'string') val = JSON.parse(val);
            
            if (val && val.apiKey && val.wabaNumber) {
              await axios.post(
                'https://public.doubletick.io/whatsapp/message/text',
                {
                  to: fromPhone,
                  from: val.wabaNumber,
                  content: {
                    text: responseMessage
                  }
                },
                {
                  headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'Authorization': val.apiKey
                  }
                }
              );
              console.log(`[DoubleTick Webhook] Auto-response message sent to ${fromPhone}`);
            }
          }
        } else {
          console.log(`[DoubleTick Webhook] No active reminder found for phone: ${cleanPhone}`);
        }
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[DoubleTick Webhook] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.triggerRefillReminders = async (req, res) => {
  try {
    const { checkAndSendRefillReminders } = require('../cron/refillReminderScheduler');
    await checkAndSendRefillReminders();
    res.json({ success: true, message: 'Refill reminders cron triggered and executed successfully.' });
  } catch (error) {
    console.error('Error triggering refill reminders:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
