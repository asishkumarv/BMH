import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Platform } from 'react-native';
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

  // User details
  const [subAdmin, setSubAdmin] = useState<any>(null);

  // Data states
  const [staffList, setStaffList] = useState<any[]>([]);
  const [racks, setRacks] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  // Selection states
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedRacks, setSelectedRacks] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'assignments' | 'pending' | 'history' | 'verify'>('assignments');
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

      // 2. Fetch settings to find who has rack_checker_access
      const settingsRes = await axios.get('https://napi.bharatmedicalhallplus.com/settings');
      let rackAccess = settingsRes.data?.settings?.rack_checker_access || {};
      if (typeof rackAccess === 'string') rackAccess = JSON.parse(rackAccess);

      // 3. Fetch data
      const [empRes, rackRes, assignRes, discRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/employees'),
        axios.get('https://napi.bharatmedicalhallplus.com/rack-checker/racks'),
        axios.get('https://napi.bharatmedicalhallplus.com/rack-checker/assignments'),
        axios.get('https://napi.bharatmedicalhallplus.com/rack-checker/discrepancies')
      ]);

      const emps = empRes.data.data || [];
      
      // Filter employees to only those in the same department
      const filteredEmps = emps.filter((e: any) => {
        if (!deptName) return true;
        return String(e.department).toLowerCase() === deptName.toLowerCase();
      });

      const combinedUsers = filteredEmps.map((e: any) => ({
        ...e,
        uniqueId: e.id.toString(),
        displayName: `${e.full_name} (Employee)`
      }));

      // Filter to only users with rack checker access enabled
      const allowedStaff = combinedUsers.filter(u => rackAccess[u.uniqueId] === true);
      setStaffList(allowedStaff);
      
      setRacks(rackRes.data.racks || []);
      
      // Filter assignments & discrepancies to only show those for department staff
      const allowedStaffIds = new Set(allowedStaff.map(s => s.uniqueId));
      
      const allAssignments = assignRes.data.data || [];
      const deptAssignments = allAssignments.filter((a: any) => allowedStaffIds.has(String(a.assigned_to)));
      setAssignments(deptAssignments);

      const allDiscrepancies = discRes.data.data || [];
      const deptDiscrepancies = allDiscrepancies.filter((d: any) => allowedStaffIds.has(String(d.reported_by)));
      setDiscrepancies(deptDiscrepancies);

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

  const handleReviewDiscrepancy = async (id: number, status: 'approved' | 'rejected') => {
    setReviewing(id);
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/rack-checker/discrepancy/${id}/review`, { status });
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
        </View>
      </View>

      {activeTab === 'verify' ? (
        <View style={{ flex: 1 }}>
          <EmployeeRackChecker />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          {/* Assignment Section only on Active Assignments tab */}
          {activeTab === 'assignments' && (
            <View style={[styles.card, { zIndex: 50 }]}>
              <Text style={styles.cardTitle}>Assign Department Racks</Text>
              
              <Text style={styles.label}>Select Department Employee</Text>
              <View style={styles.selectContainer}>
                <select 
                  value={selectedStaffId} 
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="">-- Choose Employee --</option>
                  {staffList.map(s => (
                    <option key={s.uniqueId} value={s.uniqueId}>{s.displayName}</option>
                  ))}
                </select>
              </View>

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
                    <View key={item.id || idx} style={styles.tableRow}>
                      <Text style={[styles.td, { flex: 2, fontWeight: '700' }]}>{item.assigned_to_name}</Text>
                      <Text style={[styles.td, { flex: 1.5 }]}>{item.rack_number}</Text>
                      <Text style={[styles.td, { flex: 1.5, color: item.status === 'Checked' ? '#10b981' : '#f59e0b', fontWeight: 'bold' }]}>
                        {item.status}
                      </Text>
                      <Text style={[styles.td, { flex: 2 }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
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
                              onPress={() => handleReviewDiscrepancy(item.id, 'approved')}
                            >
                              <Check size={16} color="white" style={{ marginRight: 4 }} />
                              <Text style={styles.approveText}>Approve & Update DB</Text>
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
  selectInput: { width: '100%', padding: 12, fontSize: 14, color: '#334155', border: 'none', background: 'transparent', outline: 'none' as any },
  
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
  approveText: { color: 'white', fontSize: 13, fontWeight: '600' }
});
