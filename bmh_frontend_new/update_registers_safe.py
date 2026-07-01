import re
import os

def update_register(filepath, is_employee):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Imports
    if 'TouchableOpacity' not in content:
        content = content.replace("import {  View, Text, StyleSheet, Pressable, Platform, TextInput, KeyboardAvoidingView, ScrollView, ActivityIndicator, Alert , Image } from 'react-native';",
                                  "import {  View, Text, StyleSheet, Pressable, TouchableOpacity, Platform, TextInput, KeyboardAvoidingView, ScrollView, ActivityIndicator, Alert , Image } from 'react-native';")

    # 2. Add errors state
    if 'const [errors, setErrors]' not in content:
        content = content.replace("const [successMessage, setSuccessMessage] = useState('');",
                                  "const [successMessage, setSuccessMessage] = useState('');\n  const [errors, setErrors] = useState<{[key: string]: string}>({});")

    # 3. Update handleRegister
    if is_employee:
        old_handle_register_start = """  const handleRegister = async () => {
    setErrorMessage('');
    setPasswordError('');
    setSuccessMessage('');
    
    const requiredFields = [fullName, email, password, confirmPassword, mobile, emergencyContact, age, bloodGroup, aadhaar, pan, esi, manager, salary, empType, jobDesc, shiftIn, shiftOut, breakStart, breakEnd, tempAddr1, tempCity, tempState, permAddr1, permCity, permState, ifsc, bankName, branch, accountNo, photo];
    if (requiredFields.some(field => !field) || !selectedDept || !selectedRole) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }"""
        new_handle_register_start = """  const handleRegister = async () => {
    setErrorMessage('');
    setPasswordError('');
    setSuccessMessage('');
    setErrors({});
    
    const newErrors: {[key: string]: string} = {};
    if (!fullName) newErrors.fullName = 'Full Name is required';
    if (!email) newErrors.email = 'Email is required';
    if (!mobile) newErrors.mobile = 'Mobile Number is required';
    if (!password) newErrors.password = 'Password is required';
    if (!confirmPassword) newErrors.confirmPassword = 'Confirm Password is required';
    if (!age) newErrors.age = 'Age is required';
    if (!aadhaar) newErrors.aadhaar = 'Aadhaar ID is required';
    if (!selectedDept) newErrors.selectedDept = 'Department is required';
    if (!selectedRole) newErrors.selectedRole = 'Role is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorMessage('Please fill in all required fields.');
      return;
    }"""
    else:
        old_handle_register_start = """  const handleRegister = async () => {
    setErrorMessage('');
    setPasswordError('');
    setSuccessMessage('');

    const requiredFields = [fullName, email, password, confirmPassword, mobile, emergencyContact, age, bloodGroup, aadhaar, pan, esi, manager, salary, empType, jobDesc, shiftIn, shiftOut, breakStart, breakEnd, tempAddr1, tempCity, tempState, permAddr1, permCity, permState, ifsc, bankName, branch, accountNo, photo];
    if (requiredFields.some(field => !field) || !selectedDept) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }"""
        new_handle_register_start = """  const handleRegister = async () => {
    setErrorMessage('');
    setPasswordError('');
    setSuccessMessage('');
    setErrors({});
    
    const newErrors: {[key: string]: string} = {};
    if (!fullName) newErrors.fullName = 'Full Name is required';
    if (!email) newErrors.email = 'Email is required';
    if (!mobile) newErrors.mobile = 'Mobile Number is required';
    if (!password) newErrors.password = 'Password is required';
    if (!confirmPassword) newErrors.confirmPassword = 'Confirm Password is required';
    if (!age) newErrors.age = 'Age is required';
    if (!aadhaar) newErrors.aadhaar = 'Aadhaar ID is required';
    if (!selectedDept) newErrors.selectedDept = 'Department is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorMessage('Please fill in all required fields.');
      return;
    }"""

    if old_handle_register_start in content:
        content = content.replace(old_handle_register_start, new_handle_register_start)

    # 4. Remove generic errorMessage block from the middle (after section 2)
    error_block = """              {errorMessage ? (
                <View style={{ padding: 12, backgroundColor: '#FEE2E2', borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ color: '#DC2626', fontWeight: '500', textAlign: 'center' }}>{errorMessage}</Text>
                </View>
              ) : null}
              {successMessage ? (
                <View style={{ padding: 12, backgroundColor: '#D1FAE5', borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ color: '#059669', fontWeight: '500', textAlign: 'center' }}>{successMessage}</Text>
                </View>
              ) : null}"""
    
    content = content.replace(error_block, "")

    # 5. Add inline errors and remove * from optional fields
    fields_to_update = {
        'fullName': ('Full Name *', 'Full Name *'),
        'email': ('Email Address *', 'Email Address *'),
        'mobile': ('Mobile Number *', 'Mobile Number *'),
        'emergencyContact': ('Emergency Contact *', 'Emergency Contact'),
        'age': ('Age *', 'Age *'),
        'bloodGroup': ('Blood Group *', 'Blood Group'),
        'aadhaar': ('Aadhaar ID Card *', 'Aadhaar ID Card *'),
        'pan': ('PAN Card *', 'PAN Card'),
        'esi': ('ESI Insurance ID *', 'ESI Insurance ID'),
        'manager': ('Reporting Manager *', 'Reporting Manager'),
        'salary': ('Salary / Compensation *', 'Salary / Compensation'),
        'empType': ('Employment Type *', 'Employment Type'),
        'jobDesc': ('Job Description / Title *', 'Job Description / Title'),
        'shiftIn': ('Shift In Time *', 'Shift In Time'),
        'shiftOut': ('Shift Out Time *', 'Shift Out Time'),
        'breakStart': ('Break Start *', 'Break Start'),
        'breakEnd': ('Break End *', 'Break End'),
        'tempAddr1': ('Address Line 1 *', 'Address Line 1'),
        'tempCity': ('City *', 'City'),
        'tempState': ('State / Province *', 'State / Province'),
        'permAddr1': ('Address Line 1 *', 'Address Line 1'),
        'permCity': ('City *', 'City'),
        'permState': ('State / Province *', 'State / Province'),
        'ifsc': ('Bank IFSC Code *', 'Bank IFSC Code'),
        'bankName': ('Bank Name *', 'Bank Name'),
        'branch': ('Branch Name *', 'Branch Name'),
        'accountNo': ('Account Number *', 'Account Number'),
    }

    for varName, (oldLabel, newLabel) in fields_to_update.items():
        content = content.replace(f">{oldLabel}<", f">{newLabel}<")
        if varName in ['fullName', 'email', 'mobile', 'age', 'aadhaar']:
            regex = r'(onChangeText=\{set' + varName[0].upper() + varName[1:] + r'\}.*?/>)'
            replacement = r'\1\n                    {errors.' + varName + r' ? <Text style={{ color: "#DC2626", fontSize: 12, marginTop: 4 }}>{errors.' + varName + r'}</Text> : null}'
            content = re.sub(regex, replacement, content, count=1)
            
    # For Department 
    if is_employee:
        dept_regex = r'(onChange=\{\(val\) => \{ setSelectedDept\(val\); setSelectedRole\(\'\'\); \}\}\s*placeholder="Select Department"\s*/>\s*\)})'
        dept_rep = r'\1\n                    {errors.selectedDept ? <Text style={{ color: "#DC2626", fontSize: 12, marginTop: 4 }}>{errors.selectedDept}</Text> : null}'
        content = re.sub(dept_regex, dept_rep, content, count=1)

        role_regex = r'(onChange=\{\(val\) => setSelectedRole\(val\)\}\s*placeholder="Select Role"\s*/>\s*\)})'
        role_rep = r'\1\n                    {errors.selectedRole ? <Text style={{ color: "#DC2626", fontSize: 12, marginTop: 4 }}>{errors.selectedRole}</Text> : null}'
        content = re.sub(role_regex, role_rep, content, count=1)
    else:
        dept_regex = r'(onChange=\{\(val\) => \{? setSelectedDept\(val\);[^\}]*\}?\}\s*placeholder="Select Department"\s*/>\s*\})'
        dept_rep = r'\1\n                    {errors.selectedDept ? <Text style={{ color: "#DC2626", fontSize: 12, marginTop: 4 }}>{errors.selectedDept}</Text> : null}'
        content = re.sub(dept_regex, dept_rep, content, count=1)

    pass_regex = r'(value=\{password\} onChangeText=\{setPassword\} />.*?</View>)'
    pass_rep = r'\1\n                    {errors.password ? <Text style={{ color: "#DC2626", fontSize: 12, marginTop: 4 }}>{errors.password}</Text> : null}'
    content = re.sub(pass_regex, pass_rep, content, flags=re.DOTALL, count=1)

    cpass_regex = r'(value=\{confirmPassword\} onChangeText=\{setConfirmPassword\} />.*?</View>)'
    cpass_rep = r'\1\n                    {errors.confirmPassword ? <Text style={{ color: "#DC2626", fontSize: 12, marginTop: 4 }}>{errors.confirmPassword}</Text> : null}'
    content = re.sub(cpass_regex, cpass_rep, content, flags=re.DOTALL, count=1)

    # 6. Change submit button to TouchableOpacity and add error block right before it
    submit_block_old = """              <Pressable style={styles.submitBtn} onPress={handleRegister} disabled={registering}>
                {registering ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Register Account</Text>}
              </Pressable>"""
    
    submit_block_new = error_block + """
              <TouchableOpacity style={styles.submitBtn} activeOpacity={0.7} onPress={handleRegister} disabled={registering}>
                {registering ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Register Account</Text>}
              </TouchableOpacity>"""
              
    content = content.replace(submit_block_old, submit_block_new)

    # 7. Update bottom login links to use TouchableOpacity (we find Pressable around the Link text)
    content = re.sub(r'<Pressable (onPress=\{[^\}]+\})>', r'<TouchableOpacity activeOpacity={0.7} \1>', content)
    # However we ONLY want to change it for loginRow links, wait!
    # If we do that, we might hit the backBtn or eyeIcons again.
    # So let's restore and only do the bottom login link specifically
    pass # we will do this via a safer script block

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

update_register(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\register.tsx', True)
update_register(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\register.tsx', False)
