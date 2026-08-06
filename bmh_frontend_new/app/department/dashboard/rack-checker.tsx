import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Platform, Modal } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { ShieldCheck, Plus, Check, X, AlertTriangle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmployeeRackChecker from '../../employee/dashboard/rack-checker';

export default function SubAdminRackChecker() {
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [reviewing, setReviewing] = useState<number | null>(null);

  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<number | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [allStaffList, setAllStaffList] = useState<any[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'High' | 'Moderate' | 'Low'>('High');
  const [selectedDueDate, setSelectedDueDate] = useState<string>(new Date(Date.now() + 86400000).toISOString());

  const handleReviewAssignment = async (id: number, status: 'Verified' | 'Rejected', remarks?: string) => {
    setReviewing(id);
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/rack-checker/assignment/${id}/status`, { 
        status,
        remarks: remarks || null
      });
      Alert.alert('Success', `Rack assignment marked as ${status}`);
      setRejectingId(null);
      setRejectRemarks('');
      // Refresh assignments
      const assignRes = await axios.get('https://napi.bharatmedicalhallplus.com/rack-checker/assignments');
      setAssignments(assignRes.data.data || []);
    } catch (error) {
      console.error('Failed to review assignment:', error);
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setReviewing(null);
    }
  };

  // User details
  const [subAdmin, setSubAdmin] = useState<any>(null);

  // Data states
  const [staffList, setStaffList] = useState<any[]>([]);
  const [racks, setRacks] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  // Selection states
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedRacks, setSelectedRacks] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'assignments' | 'pending' | 'history' | 'verify' | 'daily'>('assignments');
  const [rackSearch, setRackSearch] = useState('');
  const [dailyAutoAssignments, setDailyAutoAssignments] = useState<any[]>([]);
  const [assignDaily, setAssignDaily] = useState(false);
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

      // 2. Fetch settings to find who has rack_checker_access
      const settingsRes = await axios.get('https://napi.bharatmedicalhallplus.com/settings');
      let rackAccess = settingsRes.data?.settings?.rack_checker_access || {};
      if (typeof rackAccess === 'string') rackAccess = JSON.parse(rackAccess);

      // 3. Fetch data
      const [allUsersRes, rackRes, assignRes, discRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/employees/all-users'),
        axios.get('https://napi.bharatmedicalhallplus.com/rack-checker/racks?include_counts=true'),
        axios.get('https://napi.bharatmedicalhallplus.com/rack-checker/assignments'),
        axios.get('https://napi.bharatmedicalhallplus.com/rack-checker/discrepancies')
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

      // Filter to only users with rack checker access enabled
      const allowedStaff = combinedUsers.filter((u: any) => rackAccess[u.uniqueId] === true);
      setStaffList(allowedStaff);
      setAllStaffList(combinedUsers);
      setRacks(rackRes.data.racks || []);
      
      // Filter assignments & discrepancies to only show those for department staff
      const allowedStaffIds = new Set(allowedStaff.map((s: any) => s.uniqueId));
      
      const allAssignments = assignRes.data.data || [];
      const deptAssignments = allAssignments.filter((a: any) => allowedStaffIds.has(String(a.assigned_to)));
      setAssignments(deptAssignments);

      const allDiscrepancies = discRes.data.data || [];
      const deptDiscrepancies = allDiscrepancies.filter((d: any) => allowedStaffIds.has(String(d.reported_by)));
      setDiscrepancies(deptDiscrepancies);

      let dailyAssign = settingsRes.data?.settings?.rack_auto_assignments || [];
      if (typeof dailyAssign === 'string') dailyAssign = JSON.parse(dailyAssign);
      setDailyAutoAssignments(dailyAssign);

    } catch (error) {
      console.error('Failed to load rack checker data:', error);
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
      Alert.alert('Validation Error', 'Please select at least one rack.');
      return;
    }

    const targetStaff = staffList.find(s => s.uniqueId === selectedStaffId);
    if (!targetStaff) return;

    setAssigning(true);
    try {
      await axios.post('https://napi.bharatmedicalhallplus.com/rack-checker/assign', {
        assigned_by: subAdmin ? subAdmin.full_name : 'Sub Admin',
        assigned_to: selectedStaffId,
        assigned_to_name: targetStaff.full_name,
        assigned_to_role: 'Employee',
        rack_number: selectedRacks
      });

      if (assignDaily) {
        const newConfig = {
          id: Date.now().toString(),
          userId: selectedStaffId,
          userName: targetStaff.full_name,
          userRole: 'Employee',
          racks: selectedRacks
        };
        const updatedList = [...dailyAutoAssignments, newConfig];
        await axios.post('https://napi.bharatmedicalhallplus.com/settings', {
          key: 'rack_auto_assignments',
          value: updatedList
        });
        setDailyAutoAssignments(updatedList);
        setAssignDaily(false);
      }

      Alert.alert('Success', 'Rack(s) assigned successfully!');
      setSelectedRacks([]);
      // Refresh assignments
      const assignRes = await axios.get('https://napi.bharatmedicalhallplus.com/rack-checker/assignments');
      const allowedStaffIds = new Set(staffList.map(s => s.uniqueId));
      const allAssignments = assignRes.data.data || [];
      setAssignments(allAssignments.filter((a: any) => allowedStaffIds.has(String(a.assigned_to))));
    } catch (error) {
      console.error('Failed to assign rack:', error);
      Alert.alert('Error', 'Failed to complete rack assignment');
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteDailyAssignment = async (id: string) => {
    const updatedList = dailyAutoAssignments.filter(item => item.id !== id);
    try {
      await axios.post('https://napi.bharatmedicalhallplus.com/settings', {
        key: 'rack_auto_assignments',
        value: updatedList
      });
      setDailyAutoAssignments(updatedList);
      Alert.alert('Success', 'Daily auto-assignment configuration removed.');
    } catch (error) {
      console.error('Failed to delete daily assignment:', error);
      Alert.alert('Error', 'Failed to update auto-assignments settings.');
    }
  };

  const handleReviewDiscrepancy = async (id: number, status: 'approved' | 'rejected', assigneeId?: string, priority?: string, dueDate?: string) => {
    setReviewing(id);
    try {
      const reviewed_by = subAdmin ? `SA-${subAdmin.id}` : 'Sub Admin';
      const reviewed_by_name = subAdmin ? subAdmin.full_name : 'Sub Admin';
      await axios.put(`https://napi.bharatmedicalhallplus.com/rack-checker/discrepancy/${id}/review`, { 
        status,
        reviewed_by,
        reviewed_by_name,
        assign_task_to: assigneeId,
        priority,
        due_date: dueDate
      });
      Alert.alert('Success', `Discrepancy correction request ${status}`);
      // Refresh discrepancies
      const discRes = await axios.get('https://napi.bharatmedicalhallplus.com/rack-checker/discrepancies');
      const allowedStaffIds = new Set(staffList.map(s => s.uniqueId));
      const allDiscrepancies = discRes.data.data || [];
      setDiscrepancies(allDiscrepancies.filter((d: any) => allowedStaffIds.has(String(d.reported_by))));
    } catch (error) {
      console.error('Failed to review discrepancy:', error);
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
          <Text style={styles.title}>Department Rack Checker</Text>
          <Text style={styles.subtitle}>Assign department racks to staff and review submitted stock discrepancies.</Text>
        </View>

        {/* Navigation tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'assignments' && styles.tabActive]}
            onPress={() => setActiveTab('assignments')}
          >
            <Text style={[styles.tabText, activeTab === 'assignments' && styles.tabTextActive]}>Active Assignments</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Pending Discrepancies ({discrepancies.filter((d: any) => d.status === 'pending').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              Discrepancy History ({discrepancies.filter((d: any) => d.status !== 'pending').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'verify' && styles.tabActive]}
            onPress={() => setActiveTab('verify')}
          >
            <Text style={[styles.tabText, activeTab === 'verify' && styles.tabTextActive]}>
              Verify Racks (Checker)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'daily' && styles.tabActive]}
            onPress={() => setActiveTab('daily')}
          >
            <Text style={[styles.tabText, activeTab === 'daily' && styles.tabTextActive]}>
              Daily Auto-Assignments
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'verify' ? (
        <View style={{ flex: 1 }}>
          <EmployeeRackChecker />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          {/* Assignment Section only on Active Assignments tab */}
          {activeTab === 'daily' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Configured Daily Auto-Assignments</Text>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                <View style={{ minWidth: isDesktop ? '100%' : 600 }}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 2 }]}>Checker Staff</Text>
                    <Text style={[styles.th, { flex: 1 }]}>Role</Text>
                    <Text style={[styles.th, { flex: 3 }]}>Assigned Racks</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Actions</Text>
                  </View>
                  {dailyAutoAssignments.map((item, idx) => (
                    <View key={item.id || idx} style={{ borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.td, { flex: 2, fontWeight: '700' }]}>{item.userName}</Text>
                      <Text style={[styles.td, { flex: 1 }]}>{item.userRole}</Text>
                      <Text style={[styles.td, { flex: 3 }]}>{item.racks.join(', ')}</Text>
                      <View style={{ flex: 1, alignItems: 'flex-end', paddingRight: 8 }}>
                        <TouchableOpacity 
                          style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#ef4444', borderRadius: 6 }}
                          onPress={() => handleDeleteDailyAssignment(item.id)}
                        >
                          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {dailyAutoAssignments.length === 0 && (
                    <Text style={[styles.emptyText, { padding: 24 }]}>No daily auto-assignments configured.</Text>
                  )}
                </View>
              </ScrollView>
            </View>
          )}

          {activeTab === 'assignments' && (
            <View style={[styles.card, { zIndex: 50 }]}>
              <Text style={styles.cardTitle}>Assign Department Racks</Text>
              
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
                        .filter(r => r.rack.toLowerCase().includes(rackSearch.toLowerCase()) && !selectedRacks.includes(r.rack))
                        .map(r => (
                          <TouchableOpacity 
                            key={r.rack} 
                            style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                            onPress={() => {
                              toggleRackSelection(r.rack);
                              setRackSearch('');
                              setDropdownOpen(false);
                            }}
                          >
                            <Text style={{ fontSize: 14, color: '#334155' }}>{r.rack} ({r.product_count} Products, {r.batch_count} Batches)</Text>
                          </TouchableOpacity>
                        ))}
                      {racks.filter(r => r.rack.toLowerCase().includes(rackSearch.toLowerCase()) && !selectedRacks.includes(r.rack)).length === 0 && (
                        <Text style={{ padding: 12, color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>No matching racks found</Text>
                      )}
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 8 }}
                onPress={() => setAssignDaily(!assignDaily)}
              >
                <View style={{
                  width: 18,
                  height: 18,
                  borderWidth: 1.5,
                  borderColor: Colors.light.primary,
                  borderRadius: 4,
                  backgroundColor: assignDaily ? Colors.light.primary : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8
                }}>
                  {assignDaily && <Check size={12} color="white" />}
                </View>
                <Text style={{ fontSize: 14, color: '#334155', fontWeight: '500' }}>
                  Assign Daily (Auto-Assignment Schedule)
                </Text>
              </TouchableOpacity>

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
                    <Text style={styles.assignBtnText}>Assign Racks</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'assignments' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Assignments List</Text>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                <View style={{ minWidth: isDesktop ? '100%' : 600 }}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 2 }]}>Staff Checker</Text>
                    <Text style={[styles.th, { flex: 1.5 }]}>Rack No</Text>
                    <Text style={[styles.th, { flex: 1.5 }]}>Status</Text>
                    <Text style={[styles.th, { flex: 2 }]}>Assigned On</Text>
                  </View>
                  {assignments.map((item, idx) => (
                    <View key={item.id || idx} style={{ borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.td, { flex: 2, fontWeight: '700' }]}>{item.assigned_to_name}</Text>
                        <Text style={[styles.td, { flex: 1.5 }]}>{item.rack_number} {item.assignment_type === 'reorganization' && <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: 'bold' }}>(Reorg)</Text>}</Text>
                        <Text style={[styles.td, { flex: 1.5, color: item.status === 'Verified' ? '#10b981' : item.status === 'Completed' ? '#3b82f6' : item.status === 'Rejected' ? '#ef4444' : '#f59e0b', fontWeight: 'bold' }]}>
                          {item.status}
                        </Text>
                        <Text style={[styles.td, { flex: 2 }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
                      </View>

                      {/* Detailed metrics for completed/verified/rejected rack organization */}
                      {(item.status === 'Completed' || item.status === 'Verified' || item.status === 'Rejected') && (
                        <View style={{ marginTop: 8, padding: 10, backgroundColor: '#f8fafc', borderRadius: 8, gap: 4 }}>
                          <Text style={{ fontSize: 12, color: '#64748b' }}>
                            Duration: {item.duration ? Math.round(item.duration / 60) + 'm ' + (item.duration % 60) + 's' : 'N/A'} | 
                            SKUs: {item.sku_count || 0} | Batches: {item.batch_count || 0} | Total Qty: {item.total_qty || 0}
                          </Text>
                          {item.remarks && (
                            <Text style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                              Remarks: {item.remarks}
                            </Text>
                          )}
                          
                          {item.status === 'Completed' && (
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                              {rejectingId === item.id ? (
                                <View style={{ flex: 1, gap: 6 }}>
                                  <TextInput 
                                    style={[styles.textInput, { marginBottom: 0, height: 35, fontSize: 12 }]} 
                                    placeholder="Enter rejection reason..."
                                    value={rejectRemarks}
                                    onChangeText={setRejectRemarks}
                                  />
                                  <View style={{ flexDirection: 'row', gap: 6 }}>
                                    <TouchableOpacity 
                                      style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#ef4444', borderRadius: 4 }}
                                      onPress={() => handleReviewAssignment(item.id, 'Rejected', rejectRemarks)}
                                    >
                                      <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>Confirm Reject</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                      style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#64748b', borderRadius: 4 }}
                                      onPress={() => setRejectingId(null)}
                                    >
                                      <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>Cancel</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              ) : (
                                <>
                                  <TouchableOpacity 
                                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#10b981', borderRadius: 6 }}
                                    onPress={() => handleReviewAssignment(item.id, 'Verified')}
                                  >
                                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Approve & Store</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'white', borderWidth: 1, borderColor: '#ef4444', borderRadius: 6 }}
                                    onPress={() => setRejectingId(item.id)}
                                  >
                                    <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: 'bold' }}>Reject / Reopen</Text>
                                  </TouchableOpacity>
                                </>
                              )}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                  {assignments.length === 0 && (
                    <Text style={styles.emptyText}>No assignments found.</Text>
                  )}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {activeTab === 'pending' ? 'Pending Correction Requests' : 'Discrepancy History'}
              </Text>

              {(() => {
                const list = discrepancies.filter(d => activeTab === 'pending' ? d.status === 'pending' : d.status !== 'pending');
                return (
                  <>
                    {list.map((item) => (
                      <View key={item.id} style={styles.discCard}>
                        <View style={styles.discCardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.discItemName}>
                              {item.item_code ? `[Code: ${item.item_code}] ` : ''}{item.product_name}
                            </Text>
                            <Text style={styles.discSub}>
                              Rack {item.rack_number} • Batch: {item.batch_no || 'N/A'} • Reported by {item.reported_by_name}
                            </Text>
                          </View>
                          <View style={styles.badgeWarning}>
                            <AlertTriangle size={12} color="#b45309" style={{ marginRight: 4 }} />
                            <Text style={styles.badgeTextWarning}>{item.discrepancy_type}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.discBody}>
                          {(() => {
                            let descText = item.description || 'No comments';
                            let isWrongItem = item.discrepancy_type === 'wrong item';
                            if (isWrongItem) {
                              try {
                                const parsed = JSON.parse(item.description);
                                descText = `Actual Observed Item: ${parsed.actual_item_name} | Stock: ${parsed.actual_item_stock}`;
                              } catch (e) {
                                descText = item.description;
                              }
                            }
                            return (
                              <Text style={styles.discDesc}>
                                <Text style={{ fontWeight: '700' }}>{isWrongItem ? 'Wrong Item Details:' : 'Note:'}</Text> {descText}
                              </Text>
                            );
                          })()}
                          
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
                            {item.reported_qty !== null && (
                              <Text style={styles.discQty}><Text style={{ fontWeight: '700' }}>Reported Qty:</Text> {item.reported_qty}</Text>
                            )}
                            {item.reported_mrp !== undefined && item.reported_mrp !== null && (
                              <Text style={styles.discQty}><Text style={{ fontWeight: '700' }}>Reported MRP:</Text> {item.reported_mrp}</Text>
                            )}
                          </View>
                        </View>

                        {activeTab === 'pending' ? (
                          <View style={styles.discFooter}>
                            <TouchableOpacity 
                              style={[styles.actionBtn, styles.rejectBtn, reviewing === item.id && { opacity: 0.5 }]}
                              disabled={reviewing === item.id}
                              onPress={() => handleReviewDiscrepancy(item.id, 'rejected')}
                            >
                              <X size={16} color="#ef4444" style={{ marginRight: 4 }} />
                              <Text style={styles.rejectText}>Reject Changes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.actionBtn, styles.approveBtn, reviewing === item.id && { opacity: 0.5 }]}
                              disabled={reviewing === item.id}
                              onPress={() => {
                                 setPendingItemId(item.id);
                                 setSelectedAssigneeId('');
                                 setStaffSearchQuery('');
                                 setSelectedPriority('High');
                                 setSelectedDueDate(new Date(Date.now() + 86400000).toISOString());
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
                    ))}
                    {list.length === 0 && (
                      <Text style={styles.emptyText}>No {activeTab === 'pending' ? 'pending' : 'historical'} requests found.</Text>
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

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 }}>
                Select Due Date & Time:
              </Text>
              {Platform.OS === 'web' ? (
                <input 
                  type="datetime-local" 
                  style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc', fontSize: 14, color: '#334155', width: '100%' }}
                  value={selectedDueDate ? new Date(new Date(selectedDueDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setSelectedDueDate(new Date(e.target.value).toISOString())}
                />
              ) : (
                <TextInput 
                  style={[styles.textInput, { backgroundColor: '#f8fafc' }]}
                  placeholder="YYYY-MM-DD HH:MM"
                  value={selectedDueDate}
                  onChangeText={setSelectedDueDate}
                />
              )}
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
                    handleReviewDiscrepancy(pendingItemId, 'approved', selectedAssigneeId, selectedPriority, selectedDueDate);
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
  textInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#334155', backgroundColor: '#f8fafc', marginBottom: 16 },
  
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
  discBody: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 12 },
  discDesc: { fontSize: 13, color: '#475569' },
  discQty: { fontSize: 13, color: '#475569', marginTop: 4 },
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
