const axios = require('axios');
const pool = require('../db');

/**
 * Sends an Expo Push Notification to a given push token.
 * @param {string} pushToken The Expo Push Token
 * @param {string} title The title of the notification
 * @param {string} body The body/message of the notification
 * @param {object} data Any additional data to send
 */
async function sendExpoPushNotification(pushToken, title, body, data = {}) {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
    console.error('Invalid push token for Expo:', pushToken);
    return;
  }

  const message = {
    to: pushToken,
    sound: 'alarm.wav',
    title: title,
    body: body,
    data: data,
    priority: 'high',
    channelId: 'alarm-channel-v4',
  };

  try {
    const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });
    console.log('Push notification sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending push notification:', error?.response?.data || error.message);
  }
}

// Helper to send instant push notification to task assignee
const notifyAssignee = async (assigneeType, assigneeId, taskTitle, assignerType, assignerId, taskId) => {
  const isSelf = String(assigneeId) === String(assignerId) && 
                 (assigneeType === assignerType || 
                  (assigneeType === 'employee' && assignerType === 'employee') || 
                  ((assigneeType === 'department_admin' || assigneeType === 'sub_admin') && 
                   (assignerType === 'department_admin' || assignerType === 'sub_admin')));
                   
  if (isSelf) return;

  try {
    let tokenQuery = '';
    if (assigneeType === 'department_admin' || assigneeType === 'sub_admin') {
      tokenQuery = 'SELECT push_token FROM department_admins WHERE id = $1';
    } else if (assigneeType === 'employee') {
      tokenQuery = 'SELECT push_token FROM employees WHERE id = $1';
    } else {
      return;
    }

    const userRes = await pool.query(tokenQuery, [assigneeId]);
    if (userRes.rowCount > 0 && userRes.rows[0].push_token) {
      const pushToken = userRes.rows[0].push_token;
      const title = 'New Task Assigned';
      const body = `You have been assigned a new task: "${taskTitle}"`;
      
      await sendExpoPushNotification(pushToken, title, body, {
        type: 'task',
        taskId: taskId
      });
    }
  } catch (err) {
    console.error('Failed to send push notification to assignee:', err);
  }
};

module.exports = {
  sendExpoPushNotification,
  notifyAssignee
};
