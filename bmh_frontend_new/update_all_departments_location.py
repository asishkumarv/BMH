import re

def update_department_controller():
    filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_backend_new\controllers\departmentController.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    old_code = """    await pool.query(
      'UPDATE departments SET allowed_latitude = $1, allowed_longitude = $2, allowed_radius = $3 WHERE name = $4',
      [lat, lng, radius, name]
    );"""
    
    new_code = """    if (name === 'All Departments') {
      await pool.query(
        'UPDATE departments SET allowed_latitude = $1, allowed_longitude = $2, allowed_radius = $3',
        [lat, lng, radius]
      );
    } else {
      await pool.query(
        'UPDATE departments SET allowed_latitude = $1, allowed_longitude = $2, allowed_radius = $3 WHERE name = $4',
        [lat, lng, radius, name]
      );
    }"""
    
    if old_code in content:
        content = content.replace(old_code, new_code)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated departmentController.js")
    else:
        print("Could not find update code in departmentController.js")

def update_admin_attendance():
    filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\attendance.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to prepend { id: 'all', name: 'All Departments' } to departments state
    # Right after `setDepartments(deptRes.data.data);`
    
    old_dept_set = "setDepartments(deptRes.data.data);"
    new_dept_set = "setDepartments([{ id: 'all_depts', name: 'All Departments' }, ...deptRes.data.data]);"
    
    if old_dept_set in content:
        content = content.replace(old_dept_set, new_dept_set)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated admin attendance.tsx")
    else:
        print("Could not find setDepartments in admin attendance.tsx")

update_department_controller()
update_admin_attendance()
