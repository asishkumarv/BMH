require('dotenv').config();
const { Pool, types } = require('pg');

// Parse timestamp without time zone (1114) as UTC
types.setTypeParser(1114, function(stringValue) {
  return new Date(stringValue + 'Z');
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err.message);
});

module.exports = pool;
