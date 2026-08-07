const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bmh',
});

async function main() {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'doubletick_config'");
    if (result.rowCount === 0) {
      console.log('No doubletick_config found in settings table.');
      return;
    }
    let val = result.rows[0].value;
    if (typeof val === 'string') {
      val = JSON.parse(val);
    }
    console.log('DoubleTick Config in DB:', val);
    
    if (val && val.apiKey) {
      console.log('Fetching templates from DoubleTick API...');
      const response = await axios.get('https://public.doubletick.io/v2/templates', {
        headers: {
          'accept': 'application/json',
          'Authorization': val.apiKey
        }
      });
      console.log('Templates found:');
      const templates = response.data.results || response.data || [];
      if (Array.isArray(templates)) {
         templates.forEach(t => {
            console.log(`- Name: ${t.name}, Status: ${t.status}, Category: ${t.category}`);
            if (t.components) {
               console.log('  Components:', JSON.stringify(t.components));
            }
         });
      } else {
         console.log(JSON.stringify(templates, null, 2));
      }
    }
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  } finally {
    pool.end();
  }
}

main();
