import React, { useState, useEffect } from 'react';
import {  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, Modal, TextInput, Alert, ScrollView , Image } from 'react-native';
import { Plus, Search, MoreVertical, Shield, Building, User } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

type Employee = {
  id: string;
  full_name: string;
  email: string;
  department: string;
  role: string;
  status: string;
  profile_data?: string;
};

type Role = { id: string; name: string; departmentId: string; };

export default function SubAdminEmployeesScreen() {
  const { isDesktop } = useResponsive();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  
  const [rolesModalVisible, setRolesModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [newRoleName, setNewRoleName] = useState('');
  const [addingRole, setAddingRole] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        let deptId = null;
        if (Platform.OS === 'web') {
          const userStr = localStorage.getItem('subAdminUser');
          if (userStr) {
            const user = JSON.parse(userStr);
            deptId = user.department_id;
            setDepartmentId(deptId);
          }
        }

        if (deptId) {
          const [empRes, roleRes] = await Promise.all([
            axios.get(`https://bmh-eitu.onrender.com/employees/by-department-id/${deptId}`),
            axios.get('https://bmh-eitu.onrender.com/roles')
          ]);
          
          if (empRes.data.success) setEmployees(empRes.data.data);
          
          if (roleRes.data.success) {
            // Filter roles to only show ones for this department
            const deptRoles = roleRes.data.data.filter((r: Role) => r.departmentId === deptId.toString() || r.departmentId === 'all');
            setRoles(deptRoles);
          }
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmployees();
  }, []);

  const handleAddRole = async () => {
    if (!newRoleName) {
      Alert.alert('Error', 'Role name is required');
      return;
    }
    if (!departmentId) {
      Alert.alert('Error', 'Missing department context');
      return;
    }
    
    setAddingRole(true);
    try {
      const response = await axios.post('https://bmh-eitu.onrender.com/roles', {
        name: newRoleName,
        departmentId: departmentId.toString()
      });
      if (response.data.success) {
        setRoles([...roles, response.data.data]);
        setNewRoleName('');
        Alert.alert('Success', 'Role added successfully to your department');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add role');
    } finally {
      setAddingRole(false);
    }
  };

  const handleApproveEmployee = async (employeeId: string) => {
    try {
      const response = await axios.put(`https://bmh-eitu.onrender.com/employees/${employeeId}/status`, {
        status: 'approved'
      });
      if (response.data.success) {
        setEmployees(employees.map(e => e.id === employeeId ? { ...e, status: 'approved' } : e));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to approve employee');
      console.error(error);
    }
  };

  const renderHeader = () => {
    if (!isDesktop) return null;
    return (
      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.cell, { flex: 2, fontWeight: '700', color: Colors.light.icon }]}>Name</Text>
        {isDesktop && <Text style={[styles.cell, { flex: 2, fontWeight: '700', color: Colors.light.icon }]}>Email</Text>}
        <Text style={[styles.cell, { flex: 1.5, fontWeight: '700', color: Colors.light.icon }]}>Department</Text>
        <Text style={[styles.cell, { flex: 1, fontWeight: '700', color: Colors.light.icon }]}>Role</Text>
        <Text style={[styles.cell, { flex: 1, fontWeight: '700', color: Colors.light.icon }]}>Status</Text>
        <View style={{ width: 40 }} />
      </View>
    );
  };

  const renderItem = ({ item }: { item: Employee }) => {
    if (!isDesktop) {
      return (
        <View style={styles.adminRow}>
          <View style={[styles.adminAvatar, { backgroundColor: '#10B981' }]}>
            <Text style={styles.adminInitials}>{item.full_name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.adminName} numberOfLines={1}>{item.full_name}</Text>
            <Text style={styles.adminEmail} numberOfLines={1}>{item.email} • {item.role}</Text>
          </View>
          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.statusBadge, item.status === 'approved' ? styles.statusApproved : styles.statusPending]}>
              <Text style={[styles.statusText, item.status === 'approved' ? styles.textApproved : styles.textPending]}>
                {item.status}
              </Text>
            </View>
            <Pressable 
              style={styles.actionBtnMobile} 
              onPress={() => { setSelectedEmployee(item); setProfileModalVisible(true); }}
            >
              <MoreVertical size={20} color={Colors.light.icon} />
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tableRow}>
        <Text style={[styles.cell, { flex: 2, fontWeight: '600' }]}>{item.full_name}</Text>
        {isDesktop && <Text style={[styles.cell, { flex: 2, color: Colors.light.icon }]}>{item.email}</Text>}
        <Text style={[styles.cell, { flex: 1.5 }]}>{item.department}</Text>
        <Text style={[styles.cell, { flex: 1 }]}>{item.role}</Text>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {item.status === 'pending' ? (
            <Pressable 
              style={[styles.statusBadge, { backgroundColor: Colors.light.primary }]}
              onPress={() => handleApproveEmployee(item.id)}
            >
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Approve</Text>
            </Pressable>
          ) : (
            <View style={[styles.statusBadge, item.status === 'approved' ? styles.statusApproved : styles.statusPending]}>
              <Text style={[styles.statusText, item.status === 'approved' ? styles.textApproved : styles.textPending]}>
                {item.status}
              </Text>
            </View>
          )}
        </View>
        <Pressable 
          style={styles.actionBtn} 
          onPress={() => { setSelectedEmployee(item); setProfileModalVisible(true); }}
        >
          <MoreVertical size={20} color={Colors.light.icon} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, !isDesktop && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
        <View>
          <Text style={styles.title}>Department Employees</Text>
          <Text style={styles.subtitle}>Manage staff in your department.</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable style={styles.manageRolesBtn} onPress={() => setRolesModalVisible(true)}>
            <Shield size={20} color={Colors.light.primary} />
            <Text style={styles.manageRolesText}>Manage Roles</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.toolbar}>
           <View style={[styles.searchBox, !isDesktop && { width: '100%' }]}>
              <Search size={20} color={Colors.light.icon} style={styles.searchIcon} />
              <Text style={styles.searchPlaceholder}>Search employees...</Text>
           </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={{ padding: 40 }} />
        ) : (
          <FlatList
            data={employees}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Roles Management Modal */}
      <Modal visible={rolesModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 600 }]}>
            <Text style={styles.modalTitle}>Manage Department Roles</Text>
            
            <View style={styles.addRoleSection}>
              <Text style={styles.sectionLabel}>Add New Role</Text>
              <View style={styles.addRoleRow}>
                <TextInput 
                  style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                  placeholder="e.g. Senior Surgeon" 
                  value={newRoleName} 
                  onChangeText={setNewRoleName} 
                />
                <Pressable 
                  style={[styles.submitBtn, { paddingVertical: 14 }]} 
                  onPress={handleAddRole} 
                  disabled={addingRole}
                >
                  <Text style={styles.submitBtnText}>{addingRole ? 'Adding...' : 'Add'}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.existingRolesSection}>
              <Text style={styles.sectionLabel}>Department Roles ({roles.length})</Text>
              <FlatList
                data={roles}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <View style={styles.roleItem}>
                    <Shield size={16} color={Colors.light.primary} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roleNameText}>{item.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Building size={12} color={Colors.light.icon} style={{ marginRight: 4 }} />
                        <Text style={styles.roleDeptText}>
                          {item.departmentId === 'all' ? 'All Departments (Global)' : 'Your Department'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No roles available.</Text>
                }
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setRolesModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Viewer Modal */}
      <Modal visible={profileModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }, isDesktop && { width: 600 }]}>
            <Text style={styles.modalTitle}>Employee Profile</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {selectedEmployee && (() => {
                let pd: any = {};
                if (selectedEmployee.profile_data) {
                  try { pd = JSON.parse(selectedEmployee.profile_data); } catch(e){}
                }
                return (
                  <View style={{ gap: 12 }}>
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      {pd.photo && pd.photo.length > 5 && pd.photo !== 'null' ? (
                        <Image source={{ uri: pd.photo }} style={{ width: 100, height: 100, borderRadius: 50}} resizeMode="cover" />
                      ) : (
                        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
                          <User size={48} color="#1E40AF" />
                        </View>
                      )}
                      <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text, marginTop: 12 }}>{selectedEmployee.full_name}</Text>
                      <Text style={{ fontSize: 14, color: Colors.light.primary, fontWeight: '600' }}>{selectedEmployee.role}</Text>
                    </View>

                    <Text style={styles.sectionLabel}>Personal & Identification</Text>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Email:</Text><Text style={styles.profileVal}>{selectedEmployee.email}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Mobile:</Text><Text style={styles.profileVal}>{pd.mobile || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Age/Blood:</Text><Text style={styles.profileVal}>{pd.age || 'N/A'} yrs / {pd.bloodGroup || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Emergency Contact:</Text><Text style={styles.profileVal}>{pd.emergencyContact || 'N/A'}</Text></View>
                    
                    <Text style={[styles.sectionLabel, {marginTop: 16}]}>Statutory & Compliance</Text>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Aadhaar ID:</Text><Text style={styles.profileVal}>{pd.aadhaar || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>PAN Card:</Text><Text style={styles.profileVal}>{pd.pan || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>ESI ID:</Text><Text style={styles.profileVal}>{pd.esi || 'N/A'}</Text></View>

                    <Text style={[styles.sectionLabel, {marginTop: 16}]}>Payroll & Banking</Text>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Base Salary:</Text><Text style={styles.profileVal}>{pd.salary ? `₹${pd.salary}` : 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Bank Name:</Text><Text style={styles.profileVal}>{pd.bankName || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Account No:</Text><Text style={styles.profileVal}>{pd.accountNo || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>IFSC / Branch:</Text><Text style={styles.profileVal}>{pd.ifsc || 'N/A'} / {pd.branch || 'N/A'}</Text></View>

                    <Text style={[styles.sectionLabel, {marginTop: 16}]}>Operations & Shifts</Text>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Manager:</Text><Text style={styles.profileVal}>{pd.manager || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Shift Clock:</Text><Text style={styles.profileVal}>{pd.shiftIn || 'N/A'} to {pd.shiftOut || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Break Window:</Text><Text style={styles.profileVal}>{pd.breakStart || 'N/A'} to {pd.breakEnd || 'N/A'}</Text></View>
                  </View>
                );
              })()}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setProfileModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Close Profile</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    marginTop: 8,
  },
  headerButtons: { flexDirection: 'row', gap: 16 },
  manageRolesBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  manageRolesText: { color: Colors.light.primary, fontWeight: '700', marginLeft: 8, fontSize: 15 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  addBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 15 },
  card: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
      }
    })
  },
  toolbar: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: 400,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchPlaceholder: {
    color: Colors.light.icon,
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 24,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tableHeader: {
    backgroundColor: Colors.light.background,
    borderBottomWidth: 2,
  },
  cell: {
    fontSize: 15,
    color: Colors.light.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  textApproved: {
    color: '#059669',
  },
  textPending: {
    color: '#D97706',
  },
  actionBtn: { width: 40, alignItems: 'flex-end' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 32, width: '100%', maxWidth: 500, ...Platform.select({ web: { boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' } }) },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.light.icon, marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  addRoleSection: { marginBottom: 32, backgroundColor: '#F8FAFC', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border },
  addRoleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, padding: 14, fontSize: 14, color: Colors.light.text, marginBottom: 20, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  
  existingRolesSection: { flex: 1 },
  roleItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  roleNameText: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  roleDeptText: { fontSize: 12, color: Colors.light.icon, fontWeight: '500' },
  emptyText: { color: Colors.light.icon, fontSize: 14, fontStyle: 'italic', marginTop: 12 },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: Colors.light.text, fontWeight: '700', fontSize: 15 },
  submitBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  profileKey: { fontSize: 14, color: Colors.light.icon, fontWeight: '500' },
  profileVal: { fontSize: 14, color: Colors.light.text, fontWeight: '600' },

  adminRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 12, marginHorizontal: 16 },
  adminAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  adminInitials: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  adminName: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  adminEmail: { fontSize: 13, color: Colors.light.icon, marginTop: 2 },
  actionBtnMobile: { padding: 4 }
});
