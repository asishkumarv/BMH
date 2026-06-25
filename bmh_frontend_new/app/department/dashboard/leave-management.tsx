import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { API_URL } from '@/config';
import { Settings, Users, CalendarDays, CheckCircle2, XCircle, Clock, Save } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';

export default function SubAdminLeaveManagement() {
  const { isMobile, isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState<'requests' | 'settings'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentId, setDepartmentId] = useState<string>('');
  const [deptNumId, setDeptNumId] = useState<string>('');

  // Settings State
  const [roleSettings, setRoleSettings] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  
  // Settings Form State
  const [rRole, setRRole] = useState('All');
  const [rLeaves, setRLeaves] = useState('1');
  const [rExtraPen, setRExtraPen] = useState('0');
  const [rLateLim, setRLateLim] = useState('3');
  const [rLatePen, setRLatePen] = useState('0');
  const [rEarlyLim, setREarlyLim] = useState('3');
  const [rEarlyPen, setREarlyPen] = useState('0');

  useEffect(() => {
    const init = async () => {
      let deptName = '';
      let numId = '';
      if (Platform.OS === 'web') {
        const userStr = localStorage.getItem('subAdminUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          numId = user.department_id;
          setDeptNumId(numId);
          try {
            const res = await fetch(`${API_URL}/department/${numId}`);
            if (res.ok) {
               const data = await res.json();
               deptName = data.data.name; 
               setDepartmentId(deptName);
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
      
      if (deptName) {
        fetchRequests(deptName);
        fetchSettings(deptName);
        fetchRoles();
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`https://bmh-eitu.onrender.com/roles`);
      if (res.data && res.data.success) {
        setRoles(res.data.data);
      }
    } catch (e) { console.error("Dropdown fetch error:", e); }
  };

  const fetchRequests = async (dept: string) => {
    try {
      const res = await fetch(`${API_URL}/leave/requests?department=${dept}`);
      if (res.ok) setRequests(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchSettings = async (dept: string) => {
    try {
      const res = await fetch(`${API_URL}/leave/settings?department=${dept}`);
      if (res.ok) {
        const data = await res.json();
        setRoleSettings(data.roleSettings.filter((r: any) => r.department === dept));
      }
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`${API_URL}/leave/request/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        Alert.alert('Success', `Leave request ${status}`);
        fetchRequests(departmentId);
      }
    } catch (e) { console.error(e); }
  };

  const saveRoleSetting = async () => {
    if (!departmentId) return;
    try {
      const res = await fetch(`${API_URL}/leave/settings/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: departmentId, role: rRole,
          leaves_per_month: parseInt(rLeaves), extra_leave_penalty: parseFloat(rExtraPen),
          late_checkin_limit: parseInt(rLateLim), late_checkin_penalty: parseFloat(rLatePen),
          early_checkout_limit: parseInt(rEarlyLim), early_checkout_penalty: parseFloat(rEarlyPen)
        })
      });
      if (res.ok) {
        Alert.alert('Success', 'Role setting saved');
        fetchSettings(departmentId);
      }
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.light.primary} />
    </View>
  );

  return (
    <ScrollView style={[styles.container, isMobile && { padding: 16 }]}>
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Settings size={28} color={Colors.light.primary} />
        </View>
        <View>
          <Text style={styles.title}>Department Leave Management</Text>
          <Text style={styles.subtitle}>Rules & requests for {departmentId || 'your department'}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, activeTab === 'requests' && styles.activeTab]} onPress={() => setActiveTab('requests')}>
          <Users size={18} color={activeTab === 'requests' ? Colors.light.primary : Colors.light.icon} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Leave Requests</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'settings' && styles.activeTab]} onPress={() => setActiveTab('settings')}>
          <Settings size={18} color={activeTab === 'settings' ? Colors.light.primary : Colors.light.icon} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>Role Policies</Text>
        </Pressable>
      </View>

      {activeTab === 'requests' && (
        <View>
          {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarDays size={48} color={Colors.light.border} />
              <Text style={styles.emptyStateText}>No pending leave requests.</Text>
            </View>
          ) : null}
          <View style={[styles.grid, isMobile && { flexDirection: 'column' }]}>
            {requests.map(req => (
              <View key={req.id} style={[styles.card, isMobile ? { width: '100%' } : { width: '48%' }]}>
                <View style={styles.reqHeader}>
                  <View>
                    <Text style={styles.reqName}>{req.full_name}</Text>
                    <Text style={styles.reqRole}>{req.role}</Text>
                  </View>
                  <View style={[styles.statusBadge, req.status === 'approved' ? styles.statusApproved : req.status === 'rejected' ? styles.statusRejected : styles.statusPending]}>
                    <Text style={styles.statusText}>{req.status.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.dateRow}>
                  <CalendarDays size={16} color={Colors.light.icon} style={{ marginRight: 8 }} />
                  <Text style={styles.reqDates}>{new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.reqReason}>"{req.reason}"</Text>
                
                {req.status === 'pending' && (
                  <View style={styles.actionRow}>
                    <Pressable style={[styles.actionBtn, { backgroundColor: '#10B981', flex: 1 }]} onPress={() => updateStatus(req.id, 'approved')}>
                      <CheckCircle2 size={16} color="white" style={{ marginRight: 6 }} />
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, { backgroundColor: '#EF4444', flex: 1 }]} onPress={() => updateStatus(req.id, 'rejected')}>
                      <XCircle size={16} color="white" style={{ marginRight: 6 }} />
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {activeTab === 'settings' && (
        <View style={[styles.layout, !isMobile && { flexDirection: 'row', gap: 24 }]}>
          <View style={[styles.section, !isMobile && { flex: 1 }]}>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Clock size={20} color={Colors.light.primary} style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Set Role Allowances & Penalties</Text>
              </View>
              <Text style={styles.helperText}>Configure how many leaves are free per month, and set penalties for late check-ins or extra leaves.</Text>
              
              <Text style={styles.label}>Role (Use 'All' for all roles in dept)</Text>
              {Platform.OS === 'web' ? (
                <select 
                  value={rRole} 
                  onChange={(e: any) => setRRole(e.target.value)} 
                  style={{...styles.input, backgroundColor: Colors.light.background, color: Colors.light.text, outline: 'none', border: `1px solid ${Colors.light.border}`}}
                >
                  <option value="All">All Roles</option>
                  {roles.filter(r => !deptNumId || r.departmentId == deptNumId).map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              ) : (
                <TextInput style={styles.input} value={rRole} onChangeText={setRRole} placeholder="e.g. All or Senior Surgeon" />
              )}
              
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Free Leaves / Month</Text>
                  <TextInput style={styles.input} value={rLeaves} onChangeText={setRLeaves} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Extra Leave Penalty (₹)</Text>
                  <TextInput style={styles.input} value={rExtraPen} onChangeText={setRExtraPen} keyboardType="numeric" />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Late Limits / Month</Text>
                  <TextInput style={styles.input} value={rLateLim} onChangeText={setRLateLim} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Late Penalty (₹)</Text>
                  <TextInput style={styles.input} value={rLatePen} onChangeText={setRLatePen} keyboardType="numeric" />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Early Check-out Limits</Text>
                  <TextInput style={styles.input} value={rEarlyLim} onChangeText={setREarlyLim} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Early Penalty (₹)</Text>
                  <TextInput style={styles.input} value={rEarlyPen} onChangeText={setREarlyPen} keyboardType="numeric" />
                </View>
              </View>
              
              <Pressable style={styles.saveBtn} onPress={saveRoleSetting}>
                <Save size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Policy</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: Colors.light.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.light.icon, marginTop: 4 },
  tabs: { flexDirection: 'row', marginBottom: 32, borderBottomWidth: 2, borderBottomColor: Colors.light.border },
  tab: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent', marginBottom: -2 },
  activeTab: { borderBottomColor: Colors.light.primary },
  tabText: { fontSize: 16, color: Colors.light.icon, fontWeight: '600' },
  activeTabText: { color: Colors.light.primary, fontWeight: '700' },
  layout: { gap: 24 },
  section: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { backgroundColor: Colors.light.card, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: Colors.light.text },
  helperText: { fontSize: 14, color: Colors.light.icon, marginBottom: 20, lineHeight: 20 },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  reqName: { fontSize: 18, fontWeight: '800', color: Colors.light.text },
  reqRole: { fontSize: 14, color: Colors.light.primary, fontWeight: '600', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  statusApproved: { backgroundColor: '#D1FAE5' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 12, fontWeight: '800' },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 },
  reqDates: { fontSize: 14, color: Colors.light.text, fontWeight: '600' },
  reqReason: { fontSize: 15, color: Colors.light.icon, fontStyle: 'italic', marginBottom: 20 },
  actionRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: Colors.light.border, paddingTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  actionBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10, padding: 14, backgroundColor: Colors.light.background, fontSize: 15, marginBottom: 16 },
  saveBtn: { flexDirection: 'row', backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 48, backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, borderStyle: 'dashed' },
  emptyStateText: { color: Colors.light.icon, marginTop: 12, fontSize: 15, fontWeight: '500' }
});
