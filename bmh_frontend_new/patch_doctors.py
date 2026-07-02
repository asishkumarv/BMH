import os

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add Edit Doctor state
    state_target = "const [newDoctor, setNewDoctor] = useState({"
    state_replacement = """const [editDoctor, setEditDoctor] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [newDoctor, setNewDoctor] = useState({"""
    if state_target in content:
        content = content.replace(state_target, state_replacement)
        print("Patched state in", filepath)
    else:
        print("state_target not found in", filepath)
        
    # 2. Add handlers
    handler_target = "const handleAddDoctor = async () => {"
    handler_replacement = """const handleUpdateDoctor = async () => {
    if (!editDoctor.full_name || !editDoctor.phone_number) return Alert.alert('Error', 'Name and Phone required');
    setUpdating(true);
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/doctors/${editDoctor.id}`, editDoctor);
      if (res.data.success) {
        Alert.alert('Success', res.data.message);
        setEditDoctor(null);
        fetchData();
      }
    } catch(e) {
      Alert.alert('Error', 'Failed to update doctor');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async (doc: any) => {
    const newStatus = doc.status === 'Inactive' ? 'Approved' : 'Inactive';
    Alert.alert('Confirm', `Are you sure you want to ${newStatus === 'Inactive' ? 'deactivate' : 'activate'} Dr. ${doc.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: async () => {
          try {
            await axios.put(`https://napi.bharatmedicalhallplus.com/doctors/${doc.id}/status`, { status: newStatus });
            fetchData();
          } catch(e) {
            Alert.alert('Error', 'Failed to update status');
          }
      }}
    ]);
  };

  const handleAddDoctor = async () => {"""
    if handler_target in content:
        content = content.replace(handler_target, handler_replacement)
        print("Patched handlers in", filepath)
    else:
        print("handler_target not found in", filepath)
        
    # 3. Update Doctor Card
    card_target = """<View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12}}>
                  <Text style={{fontSize: 13, color: '#3b82f6', fontWeight: '500'}}>Exp: {d.experience || 0} years</Text>
                  <View style={[styles.statusBadge, {backgroundColor: d.status === 'Approved' ? '#dcfce7' : '#fef9c3'}]}>
                    <Text style={{fontSize: 12, color: d.status === 'Approved' ? '#166534' : '#854d0e'}}>{d.status}</Text>
                  </View>
                </View>"""
    card_replacement = """<View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12}}>
                  <Text style={{fontSize: 13, color: '#3b82f6', fontWeight: '500'}}>Exp: {d.experience || 0} years</Text>
                  <View style={[styles.statusBadge, {backgroundColor: d.status === 'Approved' ? '#dcfce7' : (d.status === 'Inactive' ? '#fee2e2' : '#fef9c3')}]}>
                    <Text style={{fontSize: 12, color: d.status === 'Approved' ? '#166534' : (d.status === 'Inactive' ? '#991b1b' : '#854d0e')}}>{d.status}</Text>
                  </View>
                </View>
                <View style={{flexDirection: 'row', gap: 8, marginTop: 16}}>
                  <TouchableOpacity style={{flex: 1, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 6, alignItems: 'center'}} onPress={() => setEditDoctor(d)}>
                    <Text style={{color: '#334155', fontWeight: '500'}}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{flex: 1, padding: 8, backgroundColor: d.status === 'Inactive' ? '#dcfce7' : '#fee2e2', borderRadius: 6, alignItems: 'center'}} onPress={() => handleToggleStatus(d)}>
                    <Text style={{color: d.status === 'Inactive' ? '#166534' : '#991b1b', fontWeight: '500'}}>{d.status === 'Inactive' ? 'Activate' : 'Deactivate'}</Text>
                  </TouchableOpacity>
                </View>"""
    if card_target in content:
        content = content.replace(card_target, card_replacement)
        print("Patched card in", filepath)
    else:
        print("card_target not found in", filepath)
        
    # 4. Add Edit Modal
    modal_target = """{/* Add Doctor Modal */}</View>"""
    if modal_target not in content:
       modal_target = """{/* Add Doctor Modal */}"""
    
    modal_replacement = """{/* Edit Doctor Modal */}
      <Modal visible={!!editDoctor} animationType="slide" transparent={true} onRequestClose={() => setEditDoctor(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Doctor</Text>
              <TouchableOpacity onPress={() => setEditDoctor(null)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            {editDoctor && (
              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput style={styles.input} value={editDoctor.full_name} onChangeText={(t) => setEditDoctor({...editDoctor, full_name: t})} />
                </View>
                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput style={styles.input} value={editDoctor.email} onChangeText={(t) => setEditDoctor({...editDoctor, email: t})} keyboardType="email-address" />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Phone *</Text>
                    <TextInput style={styles.input} value={editDoctor.phone_number} onChangeText={(t) => setEditDoctor({...editDoctor, phone_number: t})} keyboardType="phone-pad" />
                  </View>
                </View>
                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Department</Text>
                    <TextInput style={styles.input} value={editDoctor.department} onChangeText={(t) => setEditDoctor({...editDoctor, department: t})} />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Experience (Years)</Text>
                    <TextInput style={styles.input} value={String(editDoctor.experience || '')} onChangeText={(t) => setEditDoctor({...editDoctor, experience: parseInt(t) || 0})} keyboardType="numeric" />
                  </View>
                </View>
                <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateDoctor} disabled={updating}>
                  {updating ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Update Doctor</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Doctor Modal */}"""
    if modal_target in content:
        content = content.replace(modal_target, modal_replacement)
        print("Patched modal in", filepath)
    else:
        print("modal_target not found in", filepath)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

admin_path = r"c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\doctors\index.tsx"
dept_path = r"c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\doctors\index.tsx"

patch_file(admin_path)
patch_file(dept_path)
