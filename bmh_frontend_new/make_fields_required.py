import re

files = [
    r"c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\register.tsx",
    r"c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\register.tsx"
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    employee_old = "if (!fullName || !email || !selectedDept || !selectedRole || !password) {"
    employee_new = """const requiredFields = [fullName, email, password, confirmPassword, mobile, emergencyContact, age, bloodGroup, aadhaar, pan, esi, manager, salary, empType, jobDesc, shiftIn, shiftOut, breakStart, breakEnd, tempAddr1, tempCity, tempState, permAddr1, permCity, permState, ifsc, bankName, branch, accountNo, photo];
    if (requiredFields.some(field => !field) || !selectedDept || !selectedRole) {"""
    
    dept_old = "if (!fullName || !email || !selectedDept || !password) {"
    dept_new = """const requiredFields = [fullName, email, password, confirmPassword, mobile, emergencyContact, age, bloodGroup, aadhaar, pan, esi, manager, salary, empType, jobDesc, shiftIn, shiftOut, breakStart, breakEnd, tempAddr1, tempCity, tempState, permAddr1, permCity, permState, ifsc, bankName, branch, accountNo, photo];
    if (requiredFields.some(field => !field) || !selectedDept) {"""
    
    if "employee" in f:
        content = content.replace(employee_old, employee_new)
    else:
        content = content.replace(dept_old, dept_new)

    def repl_label(m):
        tag = m.group(1)
        label = m.group(2).strip()
        if not label.endswith('*'):
            label += ' *'
        return f'{tag}>{label}</Text>'
        
    content = re.sub(r'(<Text[^>]*?style=\{[^>]*?label[^>]*?\}[^>]*?)>([^<]+)</Text>', repl_label, content)

    content = content.replace("setErrorMessage('Please fill in required fields, select a department, and a role.');", "setErrorMessage('Please fill in all required fields.');")
    content = content.replace("setErrorMessage('Please fill in required fields and select a department.');", "setErrorMessage('Please fill in all required fields.');")

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
    print(f"Updated {f}")
