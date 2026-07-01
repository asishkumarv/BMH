import re

def update_employee_controller():
    filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_backend_new\controllers\employeeController.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Update updateEmployeeStatus to allow 'approved', 'rejected', 'deactivated'
    old_status_check = "if (status !== 'approved') {"
    new_status_check = "if (!['approved', 'rejected', 'deactivated'].includes(status)) {"
    
    if old_status_check in content:
        content = content.replace(old_status_check, new_status_check)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated employeeController.js")
    else:
        print("Could not find status check in employeeController.js")

def update_attendance_controller():
    filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_backend_new\controllers\attendanceController.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update verifyLocation query
    # old: 'SELECT (SELECT name FROM departments WHERE id = department_admins.department_id) as department FROM department_admins WHERE id = $1'
    # old: 'SELECT department FROM employees WHERE id = $1'
    content = content.replace("SELECT (SELECT name FROM departments WHERE id = department_admins.department_id) as department FROM department_admins WHERE id = $1",
                              "SELECT (SELECT name FROM departments WHERE id = department_admins.department_id) as department, status FROM department_admins WHERE id = $1")
    content = content.replace("SELECT department FROM employees WHERE id = $1",
                              "SELECT department, status FROM employees WHERE id = $1")

    # Add status check in verifyLocation after empRes check
    status_check_code = """
    if (empRes.rows[0].status !== 'approved') {
      return res.status(403).json({ success: false, message: "Account is not active. Please contact administrator." });
    }
"""
    if "const departmentName = empRes.rows[0].department;" in content and "Account is not active" not in content:
        content = content.replace("const departmentName = empRes.rows[0].department;",
                                  status_check_code + "    const departmentName = empRes.rows[0].department;")

    # 2. Update verifyFaceAndMarkAttendance
    content = content.replace("SELECT id, profile_data, schedule_in, schedule_out, ${deptQuery}, image FROM",
                              "SELECT id, profile_data, schedule_in, schedule_out, ${deptQuery}, image, status FROM")
                              
    if "const profileDataStr = empRes.rows[0].profile_data;" in content and "Account is not active" not in content.split("verifyFaceAndMarkAttendance")[1]:
        content = content.replace("const profileDataStr = empRes.rows[0].profile_data;",
                                  status_check_code + "    const profileDataStr = empRes.rows[0].profile_data;")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated attendanceController.js")

update_employee_controller()
update_attendance_controller()
