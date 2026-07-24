const cron = require('node-cron');
const pool = require('../db');
const { sendExpoPushNotification, notifyAssignee } = require('../utils/pushNotification');

// Run everyday at 7:00 AM IST (1:30 AM UTC)
cron.schedule('30 1 * * *', async () => {
    console.log('Running daily recurring task scheduler...');
    try {
        const today = new Date();
        const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1-7 for Mon-Sun
        const currentDateOfMonth = today.getDate(); // 1-31

        const activeTasksQuery = `SELECT * FROM recurring_tasks WHERE status = 'active'`;
        const activeTasks = await pool.query(activeTasksQuery);

        for (let rTask of activeTasks.rows) {
            let shouldGenerate = false;

            if (rTask.frequency === 'daily') {
                shouldGenerate = true;
            } else if (rTask.frequency === 'weekly') {
                let days = rTask.specific_days || [];
                if (typeof days === 'string') {
                    try { days = JSON.parse(days); } catch(e) { days = []; }
                }
                // Expecting array of [1, 2, 3...] where 1=Mon, 7=Sun
                if (days.includes(currentDayOfWeek) || days.includes(currentDayOfWeek.toString())) {
                    shouldGenerate = true;
                }
            } else if (rTask.frequency === 'monthly') {
                let dates = rTask.specific_days || [];
                if (typeof dates === 'string') {
                    try { dates = JSON.parse(dates); } catch(e) { dates = []; }
                }
                
                // Allow specific dates (e.g., "1", "15") and ranges (e.g., "1-5")
                for (let d of dates) {
                    if (typeof d === 'string' && d.includes('-')) {
                        const parts = d.split('-');
                        if (parts.length === 2) {
                            const start = parseInt(parts[0]);
                            const end = parseInt(parts[1]);
                            if (currentDateOfMonth >= start && currentDateOfMonth <= end) {
                                shouldGenerate = true;
                                break;
                            }
                        }
                    } else {
                        if (d == currentDateOfMonth) {
                            shouldGenerate = true;
                            break;
                        }
                    }
                }
            }

            if (shouldGenerate) {
                // Check if already generated today to prevent duplicates
                let alreadyGenerated = false;
                if (rTask.last_generated_at) {
                    const lastGen = new Date(rTask.last_generated_at);
                    if (lastGen.toDateString() === today.toDateString()) {
                        alreadyGenerated = true;
                    }
                }

function calculateDueDate(today, rTask) {
    const dueAt = new Date(today);
    const type = rTask.due_time_type || 'default';
    const hours = parseInt(rTask.due_time_hours) || 0;
    const days = parseInt(rTask.due_time_days) || 0;

    if (type === 'hours') {
        dueAt.setHours(dueAt.getHours() + hours);
    } else if (type === 'days') {
        dueAt.setDate(dueAt.getDate() + days);
        dueAt.setHours(23, 59, 59, 999);
    } else if (type === 'days_hours') {
        dueAt.setDate(dueAt.getDate() + days);
        dueAt.setHours(dueAt.getHours() + hours);
    } else { // default: today (same day) evening 5:30pm IST
        dueAt.setUTCHours(12, 0, 0, 0);
    }
    return dueAt;
}

                if (!alreadyGenerated) {
                    const dueAt = calculateDueDate(today, rTask);

                    const insertTask = `
                        INSERT INTO tasks (
                            title, description, department, assigner_type, assigner_id, 
                            assignee_type, assignee_id, priority, due_date, status, is_recurring
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', true)
                        RETURNING id
                    `;
                    const values = [
                        rTask.title,
                        rTask.description,
                        rTask.department,
                        rTask.assigner_type,
                        rTask.assigner_id,
                        rTask.assignee_type,
                        rTask.assignee_id,
                        rTask.priority,
                        dueAt.toISOString()
                    ];
                    
                    const insertRes = await pool.query(insertTask, values);
                    const generatedTaskId = insertRes.rows[0].id;

                    // Send push notification to assignee
                    await notifyAssignee(rTask.assignee_type, rTask.assignee_id, rTask.title, rTask.assigner_type, rTask.assigner_id, generatedTaskId);

                    // Update last generated timestamp
                    await pool.query(`UPDATE recurring_tasks SET last_generated_at = CURRENT_TIMESTAMP WHERE id = $1`, [rTask.id]);
                    console.log(`Generated recurring task ID ${rTask.id} and sent push notification to employee ID ${rTask.assignee_id}`);
                }
            }
        }
    } catch (error) {
        console.error('Error running recurring task scheduler:', error);
    }
});

// Run every minute to check for tasks due in 30 minutes (Hard Alarm)
cron.schedule('* * * * *', async () => {
    try {
        // Query tasks that are active (not completed/rejected/terminated),
        // have a due date, the due date is within the next 30 minutes,
        // and the reminder hasn't been sent.
        const result = await pool.query(`
            SELECT t.*, 
              (CASE 
                WHEN t.assignee_type = 'department_admin' THEN (SELECT push_token FROM department_admins WHERE id = t.assignee_id)
                WHEN t.assignee_type = 'employee' THEN (SELECT push_token FROM employees WHERE id = t.assignee_id)
              END) as push_token
            FROM tasks t
            WHERE t.status NOT IN ('completed', 'rejected', 'terminated')
              AND t.due_date IS NOT NULL
              AND t.due_date <= CURRENT_TIMESTAMP + INTERVAL '30 minutes'
              AND t.due_reminder_sent = false
        `);

        for (const task of result.rows) {
            if (task.push_token) {
                const title = '🚨 HARD ALARM: Task Due Soon!';
                const dueTimeStr = new Date(task.due_date).toLocaleTimeString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                const body = `Your task "${task.title}" is due in less than 30 minutes (at ${dueTimeStr})!`;
                await sendExpoPushNotification(task.push_token, title, body, {
                    type: 'task_due_reminder',
                    taskId: task.id
                });
            }
            // Mark as sent
            await pool.query('UPDATE tasks SET due_reminder_sent = true WHERE id = $1', [task.id]);
        }
    } catch (error) {
        console.error('Error running task due reminder cron:', error);
    }
});

module.exports = cron;
