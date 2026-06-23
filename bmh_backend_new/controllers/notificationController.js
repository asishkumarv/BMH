const pool = require('../db');

exports.getNotifications = async (req, res) => {
  try {
    const { user_type, user_id } = req.query;

    if (!user_type || !user_id) {
      return res.status(400).json({ success: false, message: 'user_type and user_id are required' });
    }

    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_type = $1 AND user_id = $2 ORDER BY created_at DESC',
      [user_type, user_id]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification marked as read', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ success: false, message: 'Server error updating notification' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const { user_type, user_id } = req.body;

    if (!user_type || !user_id) {
      return res.status(400).json({ success: false, message: 'user_type and user_id are required' });
    }

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_type = $1 AND user_id = $2',
      [user_type, user_id]
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ success: false, message: 'Server error updating notifications' });
  }
};
