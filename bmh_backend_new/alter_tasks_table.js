require('dotenv').config();
const pool = require('./db');

async function migrateTasksAndNotifications() {
  try {
    // 1. Drop existing tasks table
    await pool.query('DROP TABLE IF EXISTS tasks CASCADE;');

    // 2. Re-create tasks table with advanced schema
    await pool.query(`
      CREATE TABLE tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assigner_type VARCHAR(50) NOT NULL,
        assigner_id INTEGER NOT NULL,
        assignee_type VARCHAR(50) NOT NULL,
        assignee_id INTEGER NOT NULL,
        department VARCHAR(255),
        status VARCHAR(50) DEFAULT 'assigned',
        due_date TIMESTAMP,
        rejection_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create notifications table
    await pool.query('DROP TABLE IF EXISTS notifications CASCADE;');
    await pool.query(`
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(50) NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Migration completed: tasks and notifications tables created successfully.');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    pool.end();
  }
}

migrateTasksAndNotifications();
