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

module.exports = pool;
