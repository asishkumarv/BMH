import os

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_backend_new\controllers\doctorController.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_func = """
exports.assignPeonToSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_peon_id } = req.body;
    
    await pool.query(
      `UPDATE doctor_slots SET assigned_peon_id = $1 WHERE id = $2`,
      [assigned_peon_id || null, id]
    );
    
    res.json({ success: true, message: 'Peon reassigned successfully' });
  } catch (error) {
    console.error('Assign Peon Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

"""
if 'exports.assignPeonToSlot' not in content:
    with open(filepath, 'a', encoding='utf-8') as f:
        f.write(new_func)

routepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_backend_new\routes\doctorRoutes.js'
with open(routepath, 'r', encoding='utf-8') as f:
    rcontent = f.read()

if "router.put('/slots/:id/peon'" not in rcontent:
    rcontent = rcontent.replace(
        "router.get('/peons', doctorController.getAvailablePeons);",
        "router.get('/peons', doctorController.getAvailablePeons);\nrouter.put('/slots/:id/peon', doctorController.assignPeonToSlot);"
    )
    with open(routepath, 'w', encoding='utf-8') as f:
        f.write(rcontent)

print('Updated successfully')
