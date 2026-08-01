import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Platform } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { ShieldCheck, Plus, Check, X, AlertTriangle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SubAdminInventoryChecker() {
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [reviewing, setReviewing] = useState<number | null>(null);

  // User details
  const [subAdmin, setSubAdmin] = useState<any>(null);

  // Data states
  const [staffList, setStaffList] = useState<any[]>([]);
  const [racks, setRacks] = useState<string[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [mismatches, setMismatches] = useState<any[]>([]);

  // Selection states
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedRacks, setSelectedRacks] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'mismatches'>('tasks');

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
      const [empRes, rackRes, taskRes, verRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/employees'),
        axios.get('https://napi.bharatmedicalhallplus.com/rack-checker/racks'),
        axios.get('https://napi.bharatmedicalhallplus.com/inventory-checker/tasks'),
        axios.get('https://napi.bharatmedicalhallplus.com/inventory-checker/verifications?is_mismatch=true&status=pending')
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

      // Filter to only users with inventory checker access enabled
      const allowedStaff = combinedUsers.filter(u => invAccess[u.uniqueId] === true);
      setStaffList(allowedStaff);
      
      setRacks(rackRes.data.racks || []);

      const allowedStaffIds = new Set(allowedStaff.map(s => s.uniqueId));

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

  const handleReviewMismatch = async (id: number, status: 'approved' | 'rejected') => {
    setReviewing(id);
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/inventory-checker/verification/${id}/review`, { status });
      Alert.alert('Success', `Inventory mismatch verification ${status}`);
      // Refresh mismatches
      const verRes = await axios.get('https://napi.bharatmedicalhallplus.com/inventory-checker/verifications?is_mismatch=true&status=pending');
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Department Inventory Checker</Text>
        <Text style={styles.subtitle}>Assign inventory verification tasks to staff and review mismatch reports.</Text>
      </View>

      {/* Task Assignment Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assign Department Inventory Task</Text>
        
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

        <Text style={styles.label}>Select Racks (Multiple allowed)</Text>
        <View style={styles.rackGrid}>
          {racks.map(r => {
            const isSel = selectedRacks.includes(r);
            return (
              <TouchableOpacity 
                key={r} 
                style={[styles.rackPill, isSel && styles.rackPillActive]} 
                onPress={() => toggleRackSelection(r)}
              >
                <Text style={[styles.rackText, isSel && styles.rackTextActive]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
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

      {/* Navigation tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>Active Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'mismatches' && styles.tabActive]}
          onPress={() => setActiveTab('mismatches')}
        >
          <Text style={[styles.tabText, activeTab === 'mismatches' && styles.tabTextActive]}>
            Pending Mismatch Reports ({mismatches.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'tasks' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tasks Progress</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: 180 }]}>Assigned To</Text>
            <Text style={[styles.th, { width: 100 }]}>Rack No</Text>
            <Text style={[styles.th, { width: 120 }]}>Status</Text>
            <Text style={[styles.th, { width: 150 }]}>Assigned On</Text>
          </View>
          {tasks.map((item, idx) => (
            <View key={item.id || idx} style={styles.tableRow}>
              <Text style={[styles.td, { width: 180, fontWeight: '700' }]}>{item.assigned_to_name}</Text>
              <Text style={[styles.td, { width: 100 }]}>{item.rack_number}</Text>
              <Text style={[styles.td, { width: 120, color: item.status === 'completed' ? '#10b981' : '#f59e0b', fontWeight: 'bold', textTransform: 'capitalize' }]}>
                {item.status}
              </Text>
              <Text style={[styles.td, { width: 150 }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          ))}
          {tasks.length === 0 && (
            <Text style={styles.emptyText}>No tasks found.</Text>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pending Mismatch Submissions</Text>
          {mismatches.map((item) => {
            let details = item.mismatch_details;
            if (typeof details === 'string') {
              try { details = JSON.parse(details); } catch(e) {}
            }
            return (
              <View key={item.id} style={styles.discCard}>
                <View style={styles.discCardHeader}>
                  <View>
                    <Text style={styles.discItemName}>{item.product_name}</Text>
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
                    onPress={() => handleReviewMismatch(item.id, 'approved')}
                  >
                    <Check size={16} color="white" style={{ marginRight: 4 }} />
                    <Text style={styles.approveText}>Approve & Update DB</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {mismatches.length === 0 && (
            <Text style={styles.emptyText}>No pending mismatch reports found.</Text>
          )}
        </View>
      )}
    </ScrollView>
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
  approveText: { color: 'white', fontSize: 13, fontWeight: '600' }
});
