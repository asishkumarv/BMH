const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://bmh_h120_user:r5OaC2zXgA0Y9B7Yt8KxJ3iR1L5V0Q6W@dpg-cq59j908fa8c73asdbb0-a.oregon-postgres.render.com/bmh_h120', ssl: { rejectUnauthorized: false } });
client.connect().then(() => 
  client.query("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE conrelid = 'payslips'::regclass;")
).then(res => {
  console.log(res.rows);
  return client.end();
}).catch(console.error);
