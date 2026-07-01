import re

def update_employee_profile(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Rewrite setEditForm
    old_set_edit_form = re.search(r'setEditForm\(\{[^}]+\}\);', content)
    if old_set_edit_form:
        new_set = """setEditForm({
      full_name: user.full_name || '',
      email: user.email || '',
      department: user.department || '',
      role: user.role || '',
      mobile: user.mobile || pd.mobile || '',
      emergencyContact: pd.emergencyContact || '',
      age: pd.age || '',
      bloodGroup: pd.bloodGroup || '',
      aadhaar: pd.aadhaar || '',
      pan: pd.pan || '',
      esi: pd.esi || '',
      manager: pd.manager || '',
      salary: pd.salary || '',
      empType: pd.empType || '',
      jobDesc: pd.jobDesc || '',
      shiftIn: pd.shiftIn || '',
      shiftOut: pd.shiftOut || '',
      breakStart: pd.breakStart || '',
      breakEnd: pd.breakEnd || '',
      tempAddr1: pd.tempAddr1 || '',
      tempCity: pd.tempCity || '',
      tempState: pd.tempState || '',
      permAddr1: pd.permAddr1 || pd.address || '',
      permCity: pd.permCity || '',
      permState: pd.permState || '',
      bankName: pd.bankName || '',
      accountNo: pd.accountNo || '',
      ifsc: pd.ifsc || '',
      branch: pd.branch || ''
    });"""
        content = content.replace(old_set_edit_form.group(0), new_set)

    # Replace the ScrollView inputs entirely
    inputs_block_match = re.search(r'<ScrollView showsVerticalScrollIndicator=\{false\} contentContainerStyle=\{\{ gap: 16 \}\}>.*?</ScrollView>', content, re.DOTALL)
    
    if inputs_block_match:
        new_inputs = """<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 10, color: '#334155' }}>Basic Details</Text>
              <View><Text style={styles.label}>Full Name</Text><TextInput style={styles.modalInput} value={editForm.full_name} onChangeText={(t) => setEditForm({...editForm, full_name: t})} /></View>
              <View><Text style={styles.label}>Email</Text><TextInput style={styles.modalInput} value={editForm.email} onChangeText={(t) => setEditForm({...editForm, email: t})} /></View>
              <View><Text style={styles.label}>Mobile Number</Text><TextInput style={styles.modalInput} value={editForm.mobile} onChangeText={(t) => setEditForm({...editForm, mobile: t})} /></View>
              <View><Text style={styles.label}>Emergency Contact</Text><TextInput style={styles.modalInput} value={editForm.emergencyContact} onChangeText={(t) => setEditForm({...editForm, emergencyContact: t})} /></View>
              <View><Text style={styles.label}>Age</Text><TextInput style={styles.modalInput} value={editForm.age} onChangeText={(t) => setEditForm({...editForm, age: t})} /></View>
              <View><Text style={styles.label}>Blood Group</Text><TextInput style={styles.modalInput} value={editForm.bloodGroup} onChangeText={(t) => setEditForm({...editForm, bloodGroup: t})} /></View>
              
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 10, color: '#334155' }}>Job Details</Text>
              <View><Text style={styles.label}>Department</Text>
                {Platform.OS === 'web' ? (
                  <select style={{ padding: 14, borderRadius: 8, borderColor: '#e2e8f0', borderWidth: 1, backgroundColor: 'white', width: '100%', outline: 'none' }} value={editForm.department} onChange={(e) => setEditForm({...editForm, department: e.target.value})}>
                    <option value="">Select Department</option>
                    {departments.map((d: any) => <option key={d.name} value={d.name}>{d.name}</option>)}
                  </select>
                ) : <TextInput style={styles.modalInput} value={editForm.department} onChangeText={(t) => setEditForm({...editForm, department: t})} />}
              </View>
              <View><Text style={styles.label}>Role</Text>
                {Platform.OS === 'web' ? (
                  <select style={{ padding: 14, borderRadius: 8, borderColor: '#e2e8f0', borderWidth: 1, backgroundColor: 'white', width: '100%', outline: 'none' }} value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})}>
                    <option value="">Select Role</option>
                    {roles.map((r: any) => <option key={r.title} value={r.title}>{r.title}</option>)}
                  </select>
                ) : <TextInput style={styles.modalInput} value={editForm.role} onChangeText={(t) => setEditForm({...editForm, role: t})} />}
              </View>
              <View><Text style={styles.label}>Manager Name</Text><TextInput style={styles.modalInput} value={editForm.manager} onChangeText={(t) => setEditForm({...editForm, manager: t})} /></View>
              <View><Text style={styles.label}>Salary</Text><TextInput style={styles.modalInput} value={editForm.salary} onChangeText={(t) => setEditForm({...editForm, salary: t})} /></View>
              <View><Text style={styles.label}>Employment Type</Text><TextInput style={styles.modalInput} value={editForm.empType} onChangeText={(t) => setEditForm({...editForm, empType: t})} /></View>
              <View><Text style={styles.label}>Job Description</Text><TextInput style={styles.modalInput} value={editForm.jobDesc} onChangeText={(t) => setEditForm({...editForm, jobDesc: t})} /></View>
              <View><Text style={styles.label}>Shift In</Text><TextInput style={styles.modalInput} value={editForm.shiftIn} onChangeText={(t) => setEditForm({...editForm, shiftIn: t})} /></View>
              <View><Text style={styles.label}>Shift Out</Text><TextInput style={styles.modalInput} value={editForm.shiftOut} onChangeText={(t) => setEditForm({...editForm, shiftOut: t})} /></View>
              <View><Text style={styles.label}>Break Start</Text><TextInput style={styles.modalInput} value={editForm.breakStart} onChangeText={(t) => setEditForm({...editForm, breakStart: t})} /></View>
              <View><Text style={styles.label}>Break End</Text><TextInput style={styles.modalInput} value={editForm.breakEnd} onChangeText={(t) => setEditForm({...editForm, breakEnd: t})} /></View>

              <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 10, color: '#334155' }}>Identification & Bank</Text>
              <View><Text style={styles.label}>Aadhaar ID</Text><TextInput style={styles.modalInput} value={editForm.aadhaar} onChangeText={(t) => setEditForm({...editForm, aadhaar: t})} /></View>
              <View><Text style={styles.label}>PAN Number</Text><TextInput style={styles.modalInput} value={editForm.pan} onChangeText={(t) => setEditForm({...editForm, pan: t})} /></View>
              <View><Text style={styles.label}>ESI Number</Text><TextInput style={styles.modalInput} value={editForm.esi} onChangeText={(t) => setEditForm({...editForm, esi: t})} /></View>
              <View><Text style={styles.label}>Bank Name</Text><TextInput style={styles.modalInput} value={editForm.bankName} onChangeText={(t) => setEditForm({...editForm, bankName: t})} /></View>
              <View><Text style={styles.label}>Account No</Text><TextInput style={styles.modalInput} value={editForm.accountNo} onChangeText={(t) => setEditForm({...editForm, accountNo: t})} /></View>
              <View><Text style={styles.label}>IFSC Code</Text><TextInput style={styles.modalInput} value={editForm.ifsc} onChangeText={(t) => setEditForm({...editForm, ifsc: t})} /></View>
              <View><Text style={styles.label}>Branch</Text><TextInput style={styles.modalInput} value={editForm.branch} onChangeText={(t) => setEditForm({...editForm, branch: t})} /></View>

              <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 10, color: '#334155' }}>Address Details</Text>
              <View><Text style={styles.label}>Permanent Address Line 1</Text><TextInput style={styles.modalInput} value={editForm.permAddr1} onChangeText={(t) => setEditForm({...editForm, permAddr1: t})} /></View>
              <View><Text style={styles.label}>Permanent City</Text><TextInput style={styles.modalInput} value={editForm.permCity} onChangeText={(t) => setEditForm({...editForm, permCity: t})} /></View>
              <View><Text style={styles.label}>Permanent State</Text><TextInput style={styles.modalInput} value={editForm.permState} onChangeText={(t) => setEditForm({...editForm, permState: t})} /></View>
              <View><Text style={styles.label}>Temporary Address Line 1</Text><TextInput style={styles.modalInput} value={editForm.tempAddr1} onChangeText={(t) => setEditForm({...editForm, tempAddr1: t})} /></View>
              <View><Text style={styles.label}>Temporary City</Text><TextInput style={styles.modalInput} value={editForm.tempCity} onChangeText={(t) => setEditForm({...editForm, tempCity: t})} /></View>
              <View><Text style={styles.label}>Temporary State</Text><TextInput style={styles.modalInput} value={editForm.tempState} onChangeText={(t) => setEditForm({...editForm, tempState: t})} /></View>
            </ScrollView>"""
        content = content.replace(inputs_block_match.group(0), new_inputs)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def update_subadmin_profile(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Rewrite setEditForm
    old_set_edit_form = re.search(r'setEditForm\(\{[^}]+\}\);', content)
    if old_set_edit_form:
        new_set = """setEditForm({
      full_name: user.full_name || '',
      email: user.email || '',
      department_id: user.department_id || '',
      mobile: user.mobile || pd.mobile || '',
      emergencyContact: pd.emergencyContact || '',
      age: pd.age || '',
      bloodGroup: pd.bloodGroup || '',
      aadhaar: pd.aadhaar || '',
      pan: pd.pan || '',
      esi: pd.esi || '',
      manager: pd.manager || '',
      salary: pd.salary || '',
      empType: pd.empType || '',
      jobDesc: pd.jobDesc || '',
      tempAddr1: pd.tempAddr1 || '',
      tempCity: pd.tempCity || '',
      tempState: pd.tempState || '',
      permAddr1: pd.permAddr1 || pd.address || '',
      permCity: pd.permCity || '',
      permState: pd.permState || '',
      bankName: pd.bankName || '',
      accountNo: pd.accountNo || '',
      ifsc: pd.ifsc || '',
      branch: pd.branch || ''
    });"""
        content = content.replace(old_set_edit_form.group(0), new_set)

    # Replace the ScrollView inputs entirely
    inputs_block_match = re.search(r'<ScrollView showsVerticalScrollIndicator=\{false\} contentContainerStyle=\{\{ gap: 16 \}\}>.*?</ScrollView>', content, re.DOTALL)
    
    if inputs_block_match:
        new_inputs = """<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 10, color: '#334155' }}>Basic Details</Text>
              <View><Text style={styles.label}>Full Name</Text><TextInput style={styles.modalInput} value={editForm.full_name} onChangeText={(t) => setEditForm({...editForm, full_name: t})} /></View>
              <View><Text style={styles.label}>Email</Text><TextInput style={styles.modalInput} value={editForm.email} onChangeText={(t) => setEditForm({...editForm, email: t})} /></View>
              <View><Text style={styles.label}>Mobile Number</Text><TextInput style={styles.modalInput} value={editForm.mobile} onChangeText={(t) => setEditForm({...editForm, mobile: t})} /></View>
              <View><Text style={styles.label}>Emergency Contact</Text><TextInput style={styles.modalInput} value={editForm.emergencyContact} onChangeText={(t) => setEditForm({...editForm, emergencyContact: t})} /></View>
              <View><Text style={styles.label}>Age</Text><TextInput style={styles.modalInput} value={editForm.age} onChangeText={(t) => setEditForm({...editForm, age: t})} /></View>
              <View><Text style={styles.label}>Blood Group</Text><TextInput style={styles.modalInput} value={editForm.bloodGroup} onChangeText={(t) => setEditForm({...editForm, bloodGroup: t})} /></View>
              
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 10, color: '#334155' }}>Job Details</Text>
              <View><Text style={styles.label}>Department</Text>
                {Platform.OS === 'web' ? (
                  <select style={{ padding: 14, borderRadius: 8, borderColor: '#e2e8f0', borderWidth: 1, backgroundColor: 'white', width: '100%', outline: 'none' }} value={editForm.department_id} onChange={(e) => setEditForm({...editForm, department_id: e.target.value})}>
                    <option value="">Select Department</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                ) : <TextInput style={styles.modalInput} value={editForm.department_id} onChangeText={(t) => setEditForm({...editForm, department_id: t})} />}
              </View>
              <View><Text style={styles.label}>Manager Name</Text><TextInput style={styles.modalInput} value={editForm.manager} onChangeText={(t) => setEditForm({...editForm, manager: t})} /></View>
              <View><Text style={styles.label}>Salary</Text><TextInput style={styles.modalInput} value={editForm.salary} onChangeText={(t) => setEditForm({...editForm, salary: t})} /></View>
              <View><Text style={styles.label}>Employment Type</Text><TextInput style={styles.modalInput} value={editForm.empType} onChangeText={(t) => setEditForm({...editForm, empType: t})} /></View>
              <View><Text style={styles.label}>Job Description</Text><TextInput style={styles.modalInput} value={editForm.jobDesc} onChangeText={(t) => setEditForm({...editForm, jobDesc: t})} /></View>

              <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 10, color: '#334155' }}>Identification & Bank</Text>
              <View><Text style={styles.label}>Aadhaar ID</Text><TextInput style={styles.modalInput} value={editForm.aadhaar} onChangeText={(t) => setEditForm({...editForm, aadhaar: t})} /></View>
              <View><Text style={styles.label}>PAN Number</Text><TextInput style={styles.modalInput} value={editForm.pan} onChangeText={(t) => setEditForm({...editForm, pan: t})} /></View>
              <View><Text style={styles.label}>ESI Number</Text><TextInput style={styles.modalInput} value={editForm.esi} onChangeText={(t) => setEditForm({...editForm, esi: t})} /></View>
              <View><Text style={styles.label}>Bank Name</Text><TextInput style={styles.modalInput} value={editForm.bankName} onChangeText={(t) => setEditForm({...editForm, bankName: t})} /></View>
              <View><Text style={styles.label}>Account No</Text><TextInput style={styles.modalInput} value={editForm.accountNo} onChangeText={(t) => setEditForm({...editForm, accountNo: t})} /></View>
              <View><Text style={styles.label}>IFSC Code</Text><TextInput style={styles.modalInput} value={editForm.ifsc} onChangeText={(t) => setEditForm({...editForm, ifsc: t})} /></View>
              <View><Text style={styles.label}>Branch</Text><TextInput style={styles.modalInput} value={editForm.branch} onChangeText={(t) => setEditForm({...editForm, branch: t})} /></View>

              <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 10, color: '#334155' }}>Address Details</Text>
              <View><Text style={styles.label}>Permanent Address Line 1</Text><TextInput style={styles.modalInput} value={editForm.permAddr1} onChangeText={(t) => setEditForm({...editForm, permAddr1: t})} /></View>
              <View><Text style={styles.label}>Permanent City</Text><TextInput style={styles.modalInput} value={editForm.permCity} onChangeText={(t) => setEditForm({...editForm, permCity: t})} /></View>
              <View><Text style={styles.label}>Permanent State</Text><TextInput style={styles.modalInput} value={editForm.permState} onChangeText={(t) => setEditForm({...editForm, permState: t})} /></View>
              <View><Text style={styles.label}>Temporary Address Line 1</Text><TextInput style={styles.modalInput} value={editForm.tempAddr1} onChangeText={(t) => setEditForm({...editForm, tempAddr1: t})} /></View>
              <View><Text style={styles.label}>Temporary City</Text><TextInput style={styles.modalInput} value={editForm.tempCity} onChangeText={(t) => setEditForm({...editForm, tempCity: t})} /></View>
              <View><Text style={styles.label}>Temporary State</Text><TextInput style={styles.modalInput} value={editForm.tempState} onChangeText={(t) => setEditForm({...editForm, tempState: t})} /></View>
            </ScrollView>"""
        content = content.replace(inputs_block_match.group(0), new_inputs)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

update_employee_profile(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\profile.tsx')
update_subadmin_profile(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\profile.tsx')
