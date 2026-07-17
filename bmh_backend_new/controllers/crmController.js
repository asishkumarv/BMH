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
    const { search, city, gender, bloodGroup, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT id, name, mobile, email, age, gender, blood_group, city, pin_code, created_at FROM patients';
    let countQuery = 'SELECT COUNT(*) FROM patients';

    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR mobile ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (city) {
      params.push(city);
      conditions.push(`city = $${params.length}`);
    }
    if (gender) {
      params.push(gender);
      conditions.push(`gender = $${params.length}`);
    }
    if (bloodGroup) {
      params.push(bloodGroup);
      conditions.push(`blood_group = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    // Fetch total count
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count);

    // Fetch paginated results
    query += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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

    res.json({
      success: true,
      cities: citiesRes.rows.map(r => r.city),
      bloodGroups: bloodRes.rows.map(r => r.blood_group),
      genders: gendersRes.rows.map(r => r.gender)
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
