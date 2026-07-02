import os

def insert_modal(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    target = "const styles = StyleSheet.create({"
    modal_content = """      {/* Edit Doctor Modal */}
      <Modal visible={!!editDoctor} animationType="slide" transparent={true} onRequestClose={() => setEditDoctor(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderContainer}>
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

"""
    styles_content = """  modalHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  modalForm: { marginTop: 10 },
  formGroup: { marginBottom: 16, flex: 1 },
  submitBtn: { backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
"""

    if "Edit Doctor Modal" not in content:
        content = content.replace(target, modal_content + target)
        
        # Add styles inside StyleSheet
        style_target = "modalHeader: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },"
        if style_target in content:
            content = content.replace(style_target, style_target + "\n" + styles_content)
        else:
            content = content.replace("});", styles_content + "\n});")

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Inserted modal into", filepath)
    else:
        print("Modal already exists in", filepath)

admin_path = r"c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\doctors\index.tsx"
dept_path = r"c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\doctors\index.tsx"

insert_modal(admin_path)
insert_modal(dept_path)
