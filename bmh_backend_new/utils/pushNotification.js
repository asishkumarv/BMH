const axios = require('axios');

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

module.exports = {
  sendExpoPushNotification
};
