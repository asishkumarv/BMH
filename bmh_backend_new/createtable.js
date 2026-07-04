const pool = require('./db');
const query = `CREATE TABLE IF NOT EXISTS recurring_tasks (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT, department VARCHAR(255), assigner_type VARCHAR(50) NOT NULL, assigner_id INTEGER NOT NULL, assignee_type VARCHAR(50) NOT NULL, assignee_id INTEGER NOT NULL, priority VARCHAR(50) DEFAULT 'Medium', frequency VARCHAR(50) NOT NULL, specific_days JSONB, status VARCHAR(50) DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_generated_at TIMESTAMP);`;

async function run() {
    let retries = 5;
    while(retries > 0) {
        try {
            await pool.query(query);
            console.log('Table created');
            process.exit();
        } catch(e) {
            console.error('Failed, retrying...', e.message);
            retries--;
            await new Promise(res => setTimeout(res, 2000));
        }
    }
    process.exit(1);
}
run();
