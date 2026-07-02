import os

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add Action Buttons
    action_target = """                      <View style={[styles.tableCell, {flexDirection: 'row', gap: 10}]}>
                        {d.status === 'Pending' && (
                          <>
                            <TouchableOpacity onPress={() => approveDoctor(d.id, 'Approved')}>
                              <CheckCircle color="#10b981" size={20} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => approveDoctor(d.id, 'Rejected')}>
                              <XCircle color="#ef4444" size={20} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>"""
    action_replacement = """                      <View style={[styles.tableCell, {flexDirection: 'row', gap: 10, flexWrap: 'wrap'}]}>
                        {d.status === 'Pending' && (
                          <>
                            <TouchableOpacity onPress={() => approveDoctor(d.id, 'Approved')}>
                              <CheckCircle color="#10b981" size={20} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => approveDoctor(d.id, 'Rejected')}>
                              <XCircle color="#ef4444" size={20} />
                            </TouchableOpacity>
                          </>
                        )}
                        <TouchableOpacity style={{backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4}} onPress={() => setEditDoctor(d)}>
                          <Text style={{fontSize: 12, color: '#334155'}}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{backgroundColor: d.status === 'Inactive' ? '#dcfce7' : '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4}} onPress={() => handleToggleStatus(d)}>
                          <Text style={{fontSize: 12, color: d.status === 'Inactive' ? '#166534' : '#991b1b'}}>{d.status === 'Inactive' ? 'Activate' : 'Deactivate'}</Text>
                        </TouchableOpacity>
                      </View>"""
    if action_target in content:
        content = content.replace(action_target, action_replacement)
        print("Patched actions in", filepath)
    else:
        print("action_target not found in", filepath)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

admin_path = r"c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\doctors\index.tsx"
dept_path = r"c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\doctors\index.tsx"

patch_file(admin_path)
patch_file(dept_path)
