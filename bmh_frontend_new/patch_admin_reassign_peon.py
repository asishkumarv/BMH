import os

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\doctors\index.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add states
if 'const [reassignSlot' not in content:
    content = content.replace(
        'const [newSlot, setNewSlot] = useState({',
        'const [reassignSlot, setReassignSlot] = useState<any>(null);\n  const [reassignPeonId, setReassignPeonId] = useState(\'\');\n  const [updatingPeon, setUpdatingPeon] = useState(false);\n\n  const [newSlot, setNewSlot] = useState({'
    )

# Add handleReassignPeon
if 'const handleReassignPeon = async ()' not in content:
    func = '''
  const handleReassignPeon = async () => {
    setUpdatingPeon(true);
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/doctors/slots/${reassignSlot.id}/peon`, { assigned_peon_id: reassignPeonId });
      if (res.data.success) {
        Alert.alert('Success', res.data.message);
        setReassignSlot(null);
        fetchData();
      }
    } catch(e) {
      Alert.alert('Error', 'Failed to reassign peon');
    } finally {
      setUpdatingPeon(false);
    }
  };
'''
    content = content.replace('const handleUpdateDoctor = async () => {', func + '\n  const handleUpdateDoctor = async () => {')

# Add button
if 'Reassign Peon' not in content:
    btn_html = '''<TouchableOpacity style={{backgroundColor: '#3b82f6', padding: 6, borderRadius: 6, alignItems: 'center'}} onPress={() => handleManageTokens(s)}>
                          <Text style={{color: 'white', fontSize: 12}}>Tokens</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{backgroundColor: '#10b981', padding: 6, borderRadius: 6, alignItems: 'center', marginTop: 4}} onPress={() => { setReassignSlot(s); setReassignPeonId(s.assigned_peon_id || ''); }}>
                          <Text style={{color: 'white', fontSize: 12}}>Reassign</Text>
                        </TouchableOpacity>'''
    content = content.replace(
        '''<TouchableOpacity style={{backgroundColor: '#3b82f6', padding: 6, borderRadius: 6, alignItems: 'center'}} onPress={() => handleManageTokens(s)}>
                          <Text style={{color: 'white', fontSize: 12}}>Tokens</Text>
                        </TouchableOpacity>''',
        btn_html
    )

# Add modal
if 'Reassign Peon Modal' not in content:
    modal_html = '''
      {/* Reassign Peon Modal */}
      <Modal visible={!!reassignSlot} animationType="slide" transparent={true} onRequestClose={() => setReassignSlot(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalTitle}>Reassign Peon</Text>
              <TouchableOpacity onPress={() => setReassignSlot(null)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Peon (Optional)</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={reassignPeonId}
                    onValueChange={(val) => setReassignPeonId(val)}
                    style={styles.picker}
                  >
                    <Picker.Item label="None" value="" />
                    {peons.map((p: any) => (
                      <Picker.Item key={p.id} label={p.full_name} value={p.id} />
                    ))}
                  </Picker>
                </View>
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleReassignPeon} disabled={updatingPeon}>
                {updatingPeon ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Confirm Reassign</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
'''
    content = content.replace('    </View>\n  );\n}', modal_html + '  );\n}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Frontend updated successfully')
