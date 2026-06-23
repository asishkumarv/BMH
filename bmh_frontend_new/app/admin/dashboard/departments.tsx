import React, { useState, useEffect } from 'react';
import {  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, TextInput, Alert, Modal, ScrollView , Image } from 'react-native';
import { Plus, Search, Building, User, Mail, ShieldCheck } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

type Department = { id: string; name: string; description: string; created_at: string };
type DeptAdmin = { id: string; full_name: string; email: string; department_id: string; status: string; profile_data: string };
type Employee = { id: string; full_name: string; email: string; department: string; role: string; status: string; profile_data: string };

export default function DepartmentsScreen() {
  const { isDesktop } = useResponsive();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [admins, setAdmins] = useState<DeptAdmin[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<{data: any, type: 'admin' | 'employee'} | null>(null);
  
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
      const [deptRes, adminRes, empRes] = await Promise.all([
        axios.get('https://bmh-eitu.onrender.com/department'),
        axios.get('https://bmh-eitu.onrender.com/admin/department-admins'),
        axios.get('https://bmh-eitu.onrender.com/employees')
      ]);
      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (adminRes.data.success) setAdmins(adminRes.data.data);
      if (empRes.data.success) setEmployees(empRes.data.data);
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
      const response = await axios.post('https://bmh-eitu.onrender.com/department', {
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
      const response = await axios.put(`https://bmh-eitu.onrender.com/admin/department-admins/${adminId}/status`, {
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

  const DetailField = ({ label, value }: { label: string, value: any }) => {
    if (!value) return null;
    return (
      <View style={{ width: '45%', marginBottom: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.light.icon, textTransform: 'uppercase', marginBottom: 4 }}>{label}</Text>
        <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.light.text }}>{value}</Text>
      </View>
    );
  };

  const renderUserDetails = () => {
    if (!selectedUser) return null;
    const { data, type } = selectedUser;
    
    let pd: any = {};
    try {
      if (data.profile_data) pd = JSON.parse(data.profile_data);
    } catch (e) {}

    // Resolve department name
    let resolvedDeptName = '';
    if (type === 'admin') {
      resolvedDeptName = departments.find(d => String(d.id) === String(data.department_id))?.name || data.department_id;
    } else {
      // For employee, department might be the name or ID depending on how it was saved,
      // fallback to looking it up just in case it's an ID.
      resolvedDeptName = departments.find(d => String(d.id) === String(data.department))?.name || data.department;
    }

    return (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          {pd.photo ? (
            <Image source={{ uri: pd.photo }} style={{ width: 80, height: 80, borderRadius: 40, marginRight: 16}} resizeMode="cover" />
          ) : (
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
              <Text style={{ fontSize: 32, fontWeight: '700', color: '#FFF' }}>{data.full_name.charAt(0)}</Text>
            </View>
          )}
          <View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: Colors.light.text }}>{data.full_name}</Text>
            <Text style={{ fontSize: 16, color: Colors.light.icon }}>{data.email}</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.primary, marginTop: 4, textTransform: 'capitalize' }}>Status: {data.status}</Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: Colors.light.border, marginVertical: 8 }} />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {type === 'employee' && (
            <>
              <DetailField label="Department" value={resolvedDeptName} />
              <DetailField label="Role" value={data.role} />
              <DetailField label="Mobile" value={pd.mobile} />
              <DetailField label="Emergency Contact" value={pd.emergencyContact} />
              <DetailField label="Age" value={pd.age} />
              <DetailField label="Blood Group" value={pd.bloodGroup} />
              <DetailField label="Aadhaar" value={pd.aadhaar} />
              <DetailField label="PAN" value={pd.pan} />
              <DetailField label="ESI" value={pd.esi} />
              <DetailField label="Manager" value={pd.manager} />
              <DetailField label="Salary" value={pd.salary ? `₹${pd.salary}` : ''} />
              <DetailField label="Emp Type" value={pd.empType} />
              <DetailField label="Shift In/Out" value={(pd.shiftIn || pd.shiftOut) ? `${pd.shiftIn || '-'} to ${pd.shiftOut || '-'}` : ''} />
              <DetailField label="Temp Address" value={[pd.tempAddr1, pd.tempCity, pd.tempState].filter(Boolean).join(', ')} />
              <DetailField label="Perm Address" value={[pd.permAddr1, pd.permCity, pd.permState].filter(Boolean).join(', ')} />
              <DetailField label="Bank Details" value={pd.accountNo ? `${pd.bankName} - ${pd.accountNo}` : ''} />
            </>
          )}

          {type === 'admin' && (
            <>
              <DetailField label="Department" value={resolvedDeptName} />
              <DetailField label="Phone" value={pd.phone} />
              <DetailField label="Joined" value={pd.joiningDate || pd.joinDate} />
            </>
          )}
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Department }) => {
    const deptAdmins = admins.filter(a => a.department_id === item.id);
    const deptEmployees = employees.filter(e => e.department === item.name);
    const isExpanded = expandedDeptId === item.id;
    
    return (
      <View style={styles.card}>
        <Pressable 
          style={styles.cardHeader} 
          onPress={() => setExpandedDeptId(isExpanded ? null : item.id)}
        >
          <View style={styles.cardTitleRow}>
            <View style={styles.iconBox}>
              <Building color={Colors.light.primary} size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardDesc}>{item.description || 'No description provided.'}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <Text style={{ fontSize: 13, color: Colors.light.primary, fontWeight: '600' }}>Admins: {deptAdmins.length}</Text>
                <Text style={{ fontSize: 13, color: Colors.light.primary, fontWeight: '600' }}>Employees: {deptEmployees.length}</Text>
              </View>
            </View>
            <Text style={{ color: Colors.light.icon, fontSize: 24 }}>{isExpanded ? '-' : '+'}</Text>
          </View>
        </Pressable>

        {isExpanded && (
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
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.adminName} numberOfLines={1}>{admin.full_name}</Text>
                    <Text style={styles.adminEmail} numberOfLines={1}>{admin.email}</Text>
                  </View>
                  <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <Pressable onPress={() => setSelectedUser({ data: admin, type: 'admin' })}>
                      <Text style={{ color: Colors.light.primary, fontSize: 13, fontWeight: '700' }}>Details</Text>
                    </Pressable>
                    {admin.status === 'pending' ? (
                      <Pressable 
                        style={[styles.statusBadge, { backgroundColor: Colors.light.primary }]}
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
                </View>
              ))
            )}

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Employees ({deptEmployees.length})</Text>
            {deptEmployees.length === 0 ? (
              <Text style={styles.emptyText}>No employees registered yet.</Text>
            ) : (
              deptEmployees.map(emp => (
                <View key={emp.id} style={styles.adminRow}>
                  <View style={[styles.adminAvatar, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.adminInitials}>{emp.full_name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.adminName} numberOfLines={1}>{emp.full_name}</Text>
                    <Text style={styles.adminEmail} numberOfLines={1}>{emp.email} • {emp.role}</Text>
                  </View>
                  <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <Pressable onPress={() => setSelectedUser({ data: emp, type: 'employee' })}>
                      <Text style={{ color: Colors.light.primary, fontSize: 13, fontWeight: '700' }}>Details</Text>
                    </Pressable>
                    <View style={[styles.statusBadge, emp.status === 'approved' ? styles.statusApproved : {backgroundColor: '#FEF3C7'}]}>
                      <Text style={[styles.statusText, emp.status === 'approved' ? styles.textApproved : {color: '#D97706'}]}>{emp.status}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
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

      {/* Details Modal */}
      <Modal visible={!!selectedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 600 }, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>{selectedUser?.type === 'admin' ? 'Sub-Admin Details' : 'Employee Details'}</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderUserDetails()}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={[styles.cancelBtn, { backgroundColor: '#F1F5F9' }]} onPress={() => setSelectedUser(null)}>
                <Text style={styles.cancelBtnText}>Close</Text>
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
  containerMobile: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
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
  
  adminRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 12 },
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
