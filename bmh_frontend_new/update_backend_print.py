import os
import re

# 1. Update Booking Controller backend
controller_path = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_backend_new\controllers\bookingController.js'
with open(controller_path, 'r') as f:
    content = f.read()

if 'incrementPrintCount' not in content:
    content += """
exports.incrementPrintCount = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE patient_bookings SET print_count = print_count + 1 WHERE id = $1 RETURNING print_count',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.json({ success: true, print_count: result.rows[0].print_count });
  } catch (error) {
    console.error('Error incrementing print count:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
"""
    with open(controller_path, 'w') as f:
        f.write(content)

# 2. Update Booking Routes backend
routes_path = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_backend_new\routes\bookingRoutes.js'
with open(routes_path, 'r') as f:
    r_content = f.read()

if 'incrementPrintCount' not in r_content:
    r_content = r_content.replace('module.exports = router;', "router.put('/:id/print-count', bookingController.incrementPrintCount);\n\nmodule.exports = router;")
    with open(routes_path, 'w') as f:
        f.write(r_content)
