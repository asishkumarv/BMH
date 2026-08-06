import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Platform, Modal } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { ShieldCheck, Plus, Check, X, AlertTriangle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmployeeInventoryChecker from '../../employee/dashboard/inventory-checker';

export default function SubAdminInventoryChecker() {
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);

  // User details
  const [subAdmin, setSubAdmin] = useState<any>(null);

  // Data states
  const [staffList, setStaffList] = useState<any[]>([]);
  const [racks, setRacks] = useState<string[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [mismatches, setMismatches] = useState<any[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<number | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [allStaffList, setAllStaffList] = useState<any[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'High' | 'Moderate' | 'Low'>('High');

  // Selection states
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedRacks, setSelectedRacks] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'pending' | 'history' | 'verify'>('tasks');
  const [rackSearch, setRackSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current sub-admin details
      let userStr = null;
      if (Platform.OS === 'web') {
        userStr = localStorage.getItem('subAdminUser');
      } else {
        userStr = await AsyncStorage.getItem('subAdminUser');
      }
      
      let deptName = '';
      let subAdminObj: any = null;
      
      if (userStr) {
        subAdminObj = JSON.parse(userStr);
        setSubAdmin(subAdminObj);
        
        // Fetch sub-admin's department name
        const deptRes = await axios.get('https://napi.bharatmedicalhallplus.com/department');
        if (deptRes.data.success) {
          const dept = deptRes.data.data.find((d: any) => String(d.id) === String(subAdminObj.department_id));
          if (dept) deptName = dept.name;
        }
      }

      // 2. Fetch settings to find who has inventory_checker_access
      const settingsRes = await axios.get('https://napi.bharatmedicalhallplus.com/settings');
      let invAccess = settingsRes.data?.settings?.inventory_checker_access || {};
      if (typeof invAccess === 'string') invAccess = JSON.parse(invAccess);

      // 3. Fetch data
      const [allUsersRes, rackRes, taskRes, verRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/employees/all-users'),
        axios.get('https://napi.bharatmedicalhallplus.com/rack-checker/racks'),
        axios.get('https://napi.bharatmedicalhallplus.com/inventory-checker/tasks'),
        axios.get('https://napi.bharatmedicalhallplus.com/inventory-checker/verifications?is_mismatch=true')
      ]);

      const allUsers = allUsersRes.data.data || [];
      const combinedUsers = allUsers
        .filter((u: any) => u.type === 'employee' || u.type === 'department_admin')
        .map((u: any) => ({
          ...u,
          uniqueId: u.id,
          displayName: u.type === 'employee' 
            ? `${u.full_name} (Employee - ${u.department || 'N/A'})`
            : `${u.full_name} (Sub Admin - ${u.department || 'N/A'})`
        }));

      // Filter to only users with inventory checker access enabled
      const allowedStaff = combinedUsers.filter((u: any) => invAccess[u.uniqueId] === true);
      setStaffList(allowedStaff);
      setAllStaffList(combinedUsers);
      
      setRacks(rackRes.data.racks || []);

      const allowedStaffIds = new Set(allowedStaff.map((s: any) => s.uniqueId));

      const allTasks = taskRes.data.data || [];
      const deptTasks = allTasks.filter((t: any) => allowedStaffIds.has(String(t.assigned_to)));
      setTasks(deptTasks);

      const allVerifications = verRes.data.data || [];
      const deptMismatches = allVerifications.filter((v: any) => allowedStaffIds.has(String(v.assigned_to)));
      setMismatches(deptMismatches);

    } catch (error) {
      console.error('Failed to load inventory checker data:', error);
      Alert.alert('Error', 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedStaffId) {
      Alert.alert('Validation Error', 'Please select an employee.');
      return;
    }
    if (selectedRacks.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one rack for the task.');
      return;
    }

    const targetStaff = staffList.find(s => s.uniqueId === selectedStaffId);
    if (!targetStaff) return;

    setAssigning(true);
    try {
      await axios.post('https://napi.bharatmedicalhallplus.com/inventory-checker/assign', {
        assigned_by: subAdmin ? subAdmin.full_name : 'Sub Admin',
        assigned_to: selectedStaffId,
        assigned_to_name: targetStaff.full_name,
        assigned_to_role: 'Employee',
        rack_number: selectedRacks
      });

      Alert.alert('Success', 'Inventory task(s) assigned successfully!');
      setSelectedRacks([]);
      // Refresh tasks
      const taskRes = await axios.get('https://napi.bharatmedicalhallplus.com/inventory-checker/tasks');
      const allowedStaffIds = new Set(staffList.map(s => s.uniqueId));
      const allTasks = taskRes.data.data || [];
      setTasks(allTasks.filter((t: any) => allowedStaffIds.has(String(t.assigned_to))));
    } catch (error) {
      console.error('Failed to assign task:', error);
      Alert.alert('Error', 'Failed to assign inventory task');
    } finally {
      setAssigning(false);
    }
  };

  const handleReviewMismatch = async (id: number, status: 'approved' | 'rejected', assigneeId?: string, priority?: string) => {
    setReviewing(id);
    try {
      const reviewed_by = subAdmin ? `SA-${subAdmin.id}` : 'Sub Admin';
      const reviewed_by_name = subAdmin ? subAdmin.full_name : 'Sub Admin';
      await axios.put(`https://napi.bharatmedicalhallplus.com/inventory-checker/verification/${id}/review`, { 
        status,
        reviewed_by,
        reviewed_by_name,
        assign_task_to: assigneeId,
        priority
      });
      Alert.alert('Success', `Inventory mismatch verification ${status}`);
      // Refresh mismatches
      const verRes = await axios.get('https://napi.bharatmedicalhallplus.com/inventory-checker/verifications?is_mismatch=true');
      const allowedStaffIds = new Set(staffList.map(s => s.uniqueId));
      const allVerifications = verRes.data.data || [];
      setMismatches(allVerifications.filter((v: any) => allowedStaffIds.has(String(v.assigned_to))));
    } catch (error) {
      console.error('Failed to review verification:', error);
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setReviewing(null);
    }
  };

  const toggleRackSelection = (rack: string) => {
    if (selectedRacks.includes(rack)) {
      setSelectedRacks(selectedRacks.filter(r => r !== rack));
    } else {
      setSelectedRacks([...selectedRacks, rack]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Department Inventory Checker</Text>
          <Text style={styles.subtitle}>Assign inventory verification tasks to staff and review mismatch reports.</Text>
        </View>

        {/* Navigation tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
            onPress={() => setActiveTab('tasks')}
          >
            <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>Active Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Pending Mismatch Reports ({mismatches.filter((m: any) => m.status === 'pending').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              Mismatch History ({mismatches.filter((m: any) => m.status !== 'pending').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'verify' && styles.tabActive]}
            onPress={() => setActiveTab('verify')}
          >
            <Text style={[styles.tabText, activeTab === 'verify' && styles.tabTextActive]}>
              Verify Stock (Checker)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'verify' ? (
        <View style={{ flex: 1 }}>
          <EmployeeInventoryChecker />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          {/* Task Assignment Card only on tasks tab */}
          {activeTab === 'tasks' && (
            <View style={[styles.card, { zIndex: 50 }]}>
              <Text style={styles.cardTitle}>Assign Department Inventory Task</Text>
              
              <Text style={styles.label}>Select Department Employee</Text>
              <View style={styles.selectContainer}>
                <TouchableOpacity 
                  style={{ width: '100%', height: 42, paddingHorizontal: 12, justifyContent: 'center' }}
                  onPress={() => setStaffDropdownOpen(true)}
                >
                  <Text style={{ fontSize: 14, color: selectedStaffId ? '#334155' : '#94a3b8' }}>
                    {selectedStaffId 
                      ? (staffList.find(s => s.uniqueId === selectedStaffId)?.displayName || 'Select Checker') 
                      : '-- Choose Checker --'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Staff Selector Modal */}
              <Modal visible={staffDropdownOpen} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setStaffDropdownOpen(false)}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Employee</Text>
                      <TouchableOpacity onPress={() => setStaffDropdownOpen(false)}>
                        <X size={18} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 300, padding: 12 }}>
                      {staffList.map((s: any) => (
                        <TouchableOpacity 
                          key={s.uniqueId}
                          style={{ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                          onPress={() => {
                            setSelectedStaffId(s.uniqueId);
                            setStaffDropdownOpen(false);
                          }}
                        >
                          <Text style={{ fontSize: 14, color: '#334155', fontWeight: selectedStaffId === s.uniqueId ? '700' : '400' }}>
                            {s.displayName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>

              <Text style={styles.label}>Search & Select Racks</Text>
              <View style={{ position: 'relative', zIndex: 10, marginBottom: 16 }}>
                {selectedRacks.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {selectedRacks.map(r => (
                      <View key={r} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ fontSize: 13, color: '#334155', fontWeight: '600' }}>{r}</Text>
                        <TouchableOpacity style={{ marginLeft: 6 }} onPress={() => setSelectedRacks(selectedRacks.filter(item => item !== r))}>
                          <X size={14} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <TextInput 
                  style={[styles.textInput, isFocused && { borderColor: Colors.light.primary, borderWidth: 1.5 }]}
                  placeholder="Type to search and select racks..."
                  value={rackSearch}
                  onChangeText={(text) => {
                    setRackSearch(text);
                    setDropdownOpen(text.length > 0 || true);
                  }}
                  onFocus={() => {
                    setIsFocused(true);
                    setDropdownOpen(true);
                  }}
                  onBlur={() => {
                    setIsFocused(false);
                  }}
                />

                {dropdownOpen && (
                  <>
                    <TouchableOpacity 
                      style={{
                        position: Platform.OS === 'web' ? 'fixed' : 'absolute',
                        top: Platform.OS === 'web' ? 0 : -1000,
                        bottom: Platform.OS === 'web' ? 0 : -1000,
                        left: Platform.OS === 'web' ? 0 : -1000,
                        right: Platform.OS === 'web' ? 0 : -1000,
                        zIndex: 9999,
                        backgroundColor: 'transparent'
                      }}
                      activeOpacity={1}
                      onPress={() => setDropdownOpen(false)}
                    />
                    <View style={{ position: 'absolute', top: 45, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, maxHeight: 200, overflowY: 'auto' as any, zIndex: 10000, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 }}>
                      {racks
                        .filter(r => r.toLowerCase().includes(rackSearch.toLowerCase()) && !selectedRacks.includes(r))
                        .map(r => (
                          <TouchableOpacity 
                            key={r} 
                            style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                            onPress={() => {
                              toggleRackSelection(r);
                              setRackSearch('');
                              setDropdownOpen(false);
                            }}
                          >
                            <Text style={{ fontSize: 14, color: '#334155' }}>{r}</Text>
                          </TouchableOpacity>
                        ))}
                      {racks.filter(r => r.toLowerCase().includes(rackSearch.toLowerCase()) && !selectedRacks.includes(r)).length === 0 && (
                        <Text style={{ padding: 12, color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>No matching racks found</Text>
                      )}
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.assignBtn, assigning && { opacity: 0.7 }]} 
                onPress={handleAssign}
                disabled={assigning}
              >
                {assigning ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Plus size={18} color="white" style={{ marginRight: 6 }} />
                    <Text style={styles.assignBtnText}>Assign Task</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'tasks' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tasks Progress</Text>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                <View style={{ minWidth: isDesktop ? '100%' : 600 }}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 2 }]}>Assigned To</Text>
                    <Text style={[styles.th, { flex: 1.5 }]}>Rack No</Text>
                    <Text style={[styles.th, { flex: 1.5 }]}>Status</Text>
                    <Text style={[styles.th, { flex: 2 }]}>Assigned On</Text>
                  </View>
                  {tasks.map((item, idx) => (
                    <View key={item.id || idx} style={styles.tableRow}>
                      <Text style={[styles.td, { flex: 2, fontWeight: '700' }]}>{item.assigned_to_name}</Text>
                      <Text style={[styles.td, { flex: 1.5 }]}>{item.rack_number}</Text>
                      <Text style={[styles.td, { flex: 1.5, color: item.status === 'completed' ? '#10b981' : '#f59e0b', fontWeight: 'bold', textTransform: 'capitalize' }]}>
                        {item.status}
                      </Text>
                      <Text style={[styles.td, { flex: 2 }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                  ))}
                  {tasks.length === 0 && (
                    <Text style={styles.emptyText}>No tasks found.</Text>
                  )}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {activeTab === 'pending' ? 'Pending Mismatch Submissions' : 'Mismatch History'}
              </Text>

              {(() => {
                const list = mismatches.filter(m => activeTab === 'pending' ? m.status === 'pending' : m.status !== 'pending');
                return (
                  <>
                    {list.map((item) => {
                      let details = item.mismatch_details;
                      if (typeof details === 'string') {
                        try { details = JSON.parse(details); } catch(e) {}
                      }
                      return (
                        <View key={item.id} style={styles.discCard}>
                          <View style={styles.discCardHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.discItemName}>
                                {item.item_code ? `[Code: ${item.item_code}] ` : ''}{item.product_name}
                              </Text>
                              <Text style={styles.discSub}>
                                Rack {item.rack_number} • Verified by {item.assigned_to_name}
                              </Text>
                            </View>
                            <View style={styles.badgeWarning}>
                              <AlertTriangle size={12} color="#b45309" style={{ marginRight: 4 }} />
                              <Text style={styles.badgeTextWarning}>Mismatch</Text>
                            </View>
                          </View>
                          
                          <View style={styles.mismatchGrid}>
                            {details && Object.keys(details).map((key) => (
                              <View key={key} style={styles.mismatchRow}>
                                <Text style={styles.mismatchKey}>{key.replace(/_/g, ' ').toUpperCase()}:</Text>
                                <Text style={styles.mismatchValOld}>{details[key].current || '-'}</Text>
                                <Text style={{ color: '#94a3b8' }}>→</Text>
                                <Text style={styles.mismatchValNew}>{details[key].verified || '-'}</Text>
                              </View>
                            ))}
                          </View>

                          {activeTab === 'pending' ? (
                            <View style={styles.discFooter}>
                              <TouchableOpacity 
                                style={[styles.actionBtn, styles.rejectBtn, reviewing === item.id && { opacity: 0.5 }]}
                                disabled={reviewing === item.id}
                                onPress={() => handleReviewMismatch(item.id, 'rejected')}
                              >
                                <X size={16} color="#ef4444" style={{ marginRight: 4 }} />
                                <Text style={styles.rejectText}>Reject Mismatch</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.actionBtn, styles.approveBtn, reviewing === item.id && { opacity: 0.5 }]}
                                disabled={reviewing === item.id}
                                onPress={() => {
                                  setPendingItemId(item.id);
                                  setSelectedAssigneeId('');
                                  setStaffSearchQuery('');
                                  setSelectedPriority('High');
                                  setAssignModalVisible(true);
                                }}
                              >
                                <Check size={16} color="white" style={{ marginRight: 4 }} />
                                <Text style={styles.approveText}>Approve & Assign Task</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8, flexDirection: 'row', justifyContent: 'flex-end' }}>
                              <Text style={{ fontSize: 13, fontWeight: 'bold', color: item.status === 'approved' ? '#10b981' : '#ef4444', textTransform: 'capitalize' }}>
                                Status: {item.status}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                    {list.length === 0 && (
                      <Text style={styles.emptyText}>No {activeTab === 'pending' ? 'pending' : 'historical'} mismatch submissions found.</Text>
                    )}
                  </>
                );
              })()}
            </View>
          )}
        </ScrollView>
      )}

      {/* Assign Verification Task Modal */}
      <Modal visible={assignModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 20, maxWidth: 500 }]}>
            <View style={[styles.modalHeader, { padding: 0, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }]}>
              <Text style={styles.modalTitle}>Approve & Assign Task</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={{ marginVertical: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
                Select Employee / Sub Admin to assign verification:
              </Text>
              
              <TextInput
                style={[styles.textInput, { marginBottom: 8 }]}
                placeholder="🔍 Search staff by name..."
                value={staffSearchQuery}
                onChangeText={setStaffSearchQuery}
              />
              
              <ScrollView style={{ maxHeight: 150, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#f8fafc', marginBottom: 12 }}>
                {allStaffList
                  .filter(s => s.displayName.toLowerCase().includes(staffSearchQuery.toLowerCase()))
                  .map((s: any) => (
                    <TouchableOpacity
                      key={s.uniqueId}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: '#e2e8f0',
                        backgroundColor: selectedAssigneeId === s.uniqueId ? '#cbd5e1' : 'transparent'
                      }}
                      onPress={() => setSelectedAssigneeId(s.uniqueId)}
                    >
                      <Text style={{ fontSize: 14, fontWeight: selectedAssigneeId === s.uniqueId ? '700' : '400', color: '#334155' }}>
                        {s.displayName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                {allStaffList.filter(s => s.displayName.toLowerCase().includes(staffSearchQuery.toLowerCase())).length === 0 && (
                  <Text style={{ padding: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>No staff found</Text>
                )}
              </ScrollView>
            </View>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 }}>
                Select Task Priority:
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {['High', 'Moderate', 'Low'].map((prio) => (
                  <TouchableOpacity
                    key={prio}
                    onPress={() => setSelectedPriority(prio as any)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      alignItems: 'center',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: selectedPriority === prio ? Colors.light.primary : '#cbd5e1',
                      backgroundColor: selectedPriority === prio ? `${Colors.light.primary}10` : '#f8fafc',
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: selectedPriority === prio ? Colors.light.primary : '#475569',
                    }}>
                      {prio}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.rejectBtn, { paddingHorizontal: 16 }]} 
                onPress={() => setAssignModalVisible(false)}
              >
                <Text style={styles.rejectText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.approveBtn, { paddingHorizontal: 16, backgroundColor: Colors.light.primary, borderColor: Colors.light.primary }]} 
                onPress={() => {
                  if (!selectedAssigneeId) {
                    Alert.alert('Validation Error', 'Please select a staff member to assign the task.');
                    return;
                  }
                  setAssignModalVisible(false);
                  if (pendingItemId !== null) {
                    handleReviewMismatch(pendingItemId, 'approved', selectedAssigneeId, selectedPriority);
                  }
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Confirm & Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  
  card: { backgroundColor: 'white', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 24 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 12, marginBottom: 6 },
  selectContainer: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, overflow: 'hidden', backgroundColor: '#f8fafc', marginBottom: 16 },
  selectInput: { width: '100%', padding: 12, fontSize: 14, color: '#334155', borderWidth: 0, backgroundColor: 'transparent' } as any,
  textInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#334155', backgroundColor: '#f8fafc', outlineStyle: 'none' as any, marginBottom: 16 },
  
  rackGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  rackPill: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  rackPillActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  rackText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  rackTextActive: { color: 'white', fontWeight: 'bold' },
  
  assignBtn: { backgroundColor: Colors.light.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, marginTop: 12 },
  assignBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  
  tabContainer: { flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 20 },
  tab: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.light.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: Colors.light.primary },
  
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  th: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  td: { fontSize: 14, color: '#334155' },
  emptyText: { textAlign: 'center', color: '#94a3b8', padding: 20, fontStyle: 'italic' },

  discCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  discCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  discItemName: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  discSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badgeWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  badgeTextWarning: { fontSize: 11, color: '#b45309', fontWeight: 'bold', textTransform: 'uppercase' },
  
  mismatchGrid: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 12, gap: 8 },
  mismatchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mismatchKey: { fontSize: 12, fontWeight: 'bold', color: '#64748b', width: 120 },
  mismatchValOld: { fontSize: 13, color: '#94a3b8', textDecorationLine: 'line-through' },
  mismatchValNew: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },

  discFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1 },
  rejectBtn: { borderColor: '#ef4444', backgroundColor: 'white' },
  rejectText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  approveBtn: { backgroundColor: '#10b981', borderColor: '#10b981' },
  approveText: { color: 'white', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 450, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' }
});
