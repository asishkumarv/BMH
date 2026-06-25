const pool = require('../db');

exports.getSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(r => {
      settings[r.key] = r.value;
    });
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP',
      [key, JSON.stringify(value)]
    );
    res.json({ success: true, message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Update Setting Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
