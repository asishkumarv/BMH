import re

def update_employee_profile(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Create availableRoles logic.
    # Find a good place to inject this. Inside openEditModal or handleRequestProfileUpdate?
    # No, it should be just before the return statement inside the EmployeeProfileScreen component.
    # Let's find: const handleRequestProfileUpdate = async () => { ... }
    # Or just inject it right before `<Modal visible={editModalVisible}`
    
    # Actually, we can just inject it right before `return (` which is inside EmployeeProfileScreen
    
    available_roles_logic = """
  const selectedDeptObj = departments.find(d => d.name === editForm.department);
  const selectedDeptId = selectedDeptObj ? String(selectedDeptObj.id) : null;
  const availableRoles = roles.filter((r: any) => r.departmentId === 'all' || r.departmentId === selectedDeptId);
  """
    
    # We will just put it before the return
    if 'const availableRoles' not in content:
        content = content.replace("  return (\n    <View", available_roles_logic + "\n  return (\n    <View")
        content = content.replace("  return (\r\n    <View", available_roles_logic + "\n  return (\n    <View")

    # Fix the Roles map loop
    # Currently it is:
    # {roles.map((r: any) => <option key={r.title} value={r.title}>{r.title}</option>)}
    # Change it to use availableRoles and r.name
    
    old_role_select = """{roles.map((r: any) => <option key={r.title} value={r.title}>{r.title}</option>)}"""
    new_role_select = """{availableRoles.map((r: any) => <option key={r.name} value={r.name}>{r.name}</option>)}"""
    content = content.replace(old_role_select, new_role_select)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

update_employee_profile(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\profile.tsx')
