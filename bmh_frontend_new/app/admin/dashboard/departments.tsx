import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, TextInput, Alert, Modal } from 'react-native';
import { Plus, Search, Building, User, Mail, ShieldCheck } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

type Department = { id: string; name: string; description: string; created_at: string };
type DeptAdmin = { id: string; full_name: string; email: string; department_id: string; status: string };

export default function DepartmentsScreen() {
  const { isDesktop } = useResponsive();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [admins, setAdmins] = useState<DeptAdmin[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, adminRes] = await Promise.all([
        axios.get('http://localhost:5000/department'),
        axios.get('http://localhost:5000/admin/department-admins')
      ]);
      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (adminRes.data.success) setAdmins(adminRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async () => {
    if (!newDeptName) {
      Alert.alert('Error', 'Department name is required');
      return;
    }
    setAdding(true);
    try {
      const response = await axios.post('http://localhost:5000/department', {
        name: newDeptName,
        description: newDeptDesc
      });
      if (response.data.success) {
        setDepartments([...departments, response.data.data]);
        setModalVisible(false);
        setNewDeptName('');
        setNewDeptDesc('');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add department');
    } finally {
      setAdding(false);
    }
  };

  const handleApproveAdmin = async (adminId: string) => {
    try {
      const response = await axios.put(`http://localhost:5000/admin/department-admins/${adminId}/status`, {
        status: 'approved'
      });
      if (response.data.success) {
        setAdmins(admins.map(a => a.id === adminId ? { ...a, status: 'approved' } : a));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to approve admin');
      console.error(error);
    }
  };

  const renderItem = ({ item }: { item: Department }) => {
    const deptAdmins = admins.filter(a => a.department_id === item.id);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.iconBox}>
              <Building color={Colors.light.primary} size={24} />
            </View>
            <View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardDesc}>{item.description || 'No description provided.'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.sectionLabel}>Department Admins ({deptAdmins.length})</Text>
          {deptAdmins.length === 0 ? (
            <Text style={styles.emptyText}>No admins registered yet.</Text>
          ) : (
            deptAdmins.map(admin => (
              <View key={admin.id} style={styles.adminRow}>
                <View style={styles.adminAvatar}>
                  <Text style={styles.adminInitials}>{admin.full_name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.adminName}>{admin.full_name}</Text>
                  <Text style={styles.adminEmail}>{admin.email}</Text>
                </View>
                {admin.status === 'pending' ? (
                  <Pressable 
                    style={[styles.statusBadge, { backgroundColor: Colors.light.primary, marginLeft: 'auto' }]}
                    onPress={() => handleApproveAdmin(admin.id)}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Approve</Text>
                  </Pressable>
                ) : (
                  <View style={[styles.statusBadge, styles.statusApproved]}>
                    <Text style={[styles.statusText, styles.textApproved]}>{admin.status}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Departments</Text>
          <Text style={styles.subtitle}>Manage hospital departments and their admins.</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Plus size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Add Department</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ padding: 40 }} />
      ) : (
        <FlatList
          data={departments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Building size={48} color={Colors.light.border} />
              <Text style={styles.emptyTitle}>No Departments</Text>
              <Text style={styles.emptyDesc}>Click "Add Department" to create one.</Text>
            </View>
          }
        />
      )}

      {/* Add Department Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 500 }]}>
            <Text style={styles.modalTitle}>Add New Department</Text>
            <Text style={styles.label}>Department Name</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Cardiology" 
              value={newDeptName} 
              onChangeText={setNewDeptName} 
            />
            
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput 
              style={[styles.input, { height: 100 }]} 
              placeholder="Brief description..." 
              multiline 
              value={newDeptDesc} 
              onChangeText={setNewDeptDesc} 
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.submitBtn} onPress={handleAddDepartment} disabled={adding}>
                <Text style={styles.submitBtnText}>{adding ? 'Adding...' : 'Add Department'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, padding: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  addBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 15 },
  
  listContent: { gap: 24, paddingBottom: 24 },
  card: { backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' } }) },
  cardHeader: { padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.light.border, backgroundColor: '#F8FAFC' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, backgroundColor: '#EFF6FF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  cardDesc: { fontSize: 14, color: Colors.light.icon, marginTop: 4 },
  
  cardBody: { padding: 24 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.light.icon, marginBottom: 16, letterSpacing: 0.5, textTransform: 'uppercase' },
  emptyText: { color: Colors.light.icon, fontSize: 14, fontStyle: 'italic' },
  
  adminRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 12 },
  adminAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  adminInitials: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  adminName: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  adminEmail: { fontSize: 13, color: Colors.light.icon, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, marginLeft: 'auto' },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  statusApproved: { backgroundColor: '#D1FAE5' },
  textApproved: { color: '#059669', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: Colors.light.icon, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 32, width: '100%', maxWidth: 500, ...Platform.select({ web: { boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' } }) },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, padding: 14, fontSize: 14, color: Colors.light.text, marginBottom: 20, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  cancelBtnText: { color: Colors.light.icon, fontWeight: '700', fontSize: 15 },
  submitBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
