import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { API_URL } from '@/config';
import { Settings, Users, CalendarDays, CheckCircle2, XCircle, Clock, Save, Building } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';

export default function AdminLeaveManagement() {
  const { isMobile, isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState<'requests' | 'settings' | 'holidays'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Settings State
  const [deptSettings, setDeptSettings] = useState<any[]>([]);
  const [roleSettings, setRoleSettings] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  
  // Forms State
  const [dDept, setDDept] = useState('');
  const [dLimit, setDLimit] = useState('2');
  
  // Holiday Form State
  const [hDept, setHDept] = useState('All');
  const [hDate, setHDate] = useState('');
  const [hDesc, setHDesc] = useState('');
  
  const [rDept, setRDept] = useState('');
  const [rRole, setRRole] = useState('');
  const [rLeaves, setRLeaves] = useState('1');
  const [rExtraPen, setRExtraPen] = useState('0');
  const [rLateLim, setRLateLim] = useState('3');
  const [rLatePen, setRLatePen] = useState('0');
  const [rEarlyLim, setREarlyLim] = useState('3');
  const [rEarlyPen, setREarlyPen] = useState('0');

  useEffect(() => {
    fetchRequests();
    fetchSettings();
    fetchDropdownData();
    fetchHolidays();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [deptRes, roleRes] = await Promise.all([
        axios.get(`https://bmh-eitu.onrender.com/department`),
        axios.get(`https://bmh-eitu.onrender.com/roles`)
      ]);
      if (deptRes.data && deptRes.data.success) {
        const depts = deptRes.data.data;
        setDepartments(depts);
        if (depts.length > 0) {
          setDDept(depts[0].name);
          setRDept(depts[0].name);
        }
      }
      if (roleRes.data && roleRes.data.success) {
        const rls = roleRes.data.data;
        setRoles(rls);
      }
    } catch (error) {
      console.error("Dropdown fetch error:", error);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/leave/requests`);
      if (res.ok) setRequests(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchHolidays = async () => {
    try {
      const res = await fetch(`${API_URL}/holidays`);
      if (res.ok) setHolidays(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/leave/settings`);
      if (res.ok) {
        const data = await res.json();
        setDeptSettings(data.departmentSettings);
        setRoleSettings(data.roleSettings);
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
        fetchRequests();
      }
    } catch (e) { console.error(e); }
  };

  const saveDeptSetting = async () => {
    try {
      const res = await fetch(`${API_URL}/leave/settings/department`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: dDept, max_employees_leave_per_day: parseInt(dLimit) })
      });
      if (res.ok) {
        Alert.alert('Success', 'Department setting saved');
        fetchSettings();
      }
    } catch (e) { console.error(e); }
  };

  const saveRoleSetting = async () => {
    try {
      const res = await fetch(`${API_URL}/leave/settings/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: rDept, role: rRole,
          leaves_per_month: parseInt(rLeaves), extra_leave_penalty: parseFloat(rExtraPen),
          late_checkin_limit: parseInt(rLateLim), late_checkin_penalty: parseInt(rLatePen),
          early_checkout_limit: parseInt(rEarlyLim), early_checkout_penalty: parseInt(rEarlyPen)
        })
      });
      if (res.ok) {
        Alert.alert('Success', 'Role setting saved');
        fetchSettings();
      }
    } catch (e) { console.error(e); }
  };

  const saveHoliday = async () => {
    try {
      if (!hDate || !hDesc) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }
      const res = await fetch(`${API_URL}/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: hDept, date: hDate, description: hDesc })
      });
      if (res.ok) {
        Alert.alert('Success', 'Holiday saved');
        fetchHolidays();
        setHDate('');
        setHDesc('');
      } else {
        const data = await res.json();
        Alert.alert('Error', data.message || 'Failed to save holiday');
      }
    } catch (e) { console.error(e); }
  };

  const deleteHoliday = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/holidays/${id}`, { method: 'DELETE' });
      if (res.ok) {
        Alert.alert('Success', 'Holiday deleted');
        fetchHolidays();
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
          <Text style={styles.title}>Global Leave Settings</Text>
          <Text style={styles.subtitle}>Configure rules and manage requests across all departments</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, activeTab === 'requests' && styles.activeTab]} onPress={() => setActiveTab('requests')}>
          <Users size={18} color={activeTab === 'requests' ? Colors.light.primary : Colors.light.icon} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Leave Requests</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'settings' && styles.activeTab]} onPress={() => setActiveTab('settings')}>
          <Settings size={18} color={activeTab === 'settings' ? Colors.light.primary : Colors.light.icon} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>Rule Configuration</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'holidays' && styles.activeTab]} onPress={() => setActiveTab('holidays')}>
          <CalendarDays size={18} color={activeTab === 'holidays' ? Colors.light.primary : Colors.light.icon} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'holidays' && styles.activeTabText]}>Holidays</Text>
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
                    <Text style={styles.reqRole}>{req.role} • {req.department}</Text>
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
          {/* Department Concurrency Settings */}
          <View style={[styles.section, !isMobile && { flex: 1 }]}>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Building size={20} color={Colors.light.primary} style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Daily Concurrency Limit</Text>
              </View>
              <Text style={styles.helperText}>Maximum number of employees allowed to take leave on the same day in a department.</Text>
              
              <Text style={styles.label}>Department</Text>
              {Platform.OS === 'web' ? (
                <select 
                  value={dDept} 
                  onChange={(e: any) => setDDept(e.target.value)} 
                  style={{...styles.input, backgroundColor: Colors.light.background, color: Colors.light.text, outline: 'none', border: `1px solid ${Colors.light.border}`}}
                >
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              ) : (
                <TextInput style={styles.input} value={dDept} onChangeText={setDDept} placeholder="e.g. Cardiology" />
              )}
              
              <Text style={styles.label}>Max Concurrent Leaves</Text>
              <TextInput style={styles.input} value={dLimit} onChangeText={setDLimit} keyboardType="numeric" />
              
              <Pressable style={styles.saveBtn} onPress={saveDeptSetting}>
                <Save size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Rule</Text>
              </Pressable>

              <View style={styles.existingRules}>
                <Text style={styles.rulesHeading}>Active Department Rules</Text>
                {deptSettings.filter(ds => ds.department !== 'All').map((ds, i) => (
                  <View key={i} style={styles.ruleItem}>
                    <Text style={styles.ruleName}>{ds.department}</Text>
                    <Text style={styles.ruleVal}>{ds.max_employees_leave_per_day} leaves/day</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Role Deductions Settings */}
          <View style={[styles.section, !isMobile && { flex: 1.5 }]}>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Clock size={20} color={Colors.light.primary} style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Monthly Allowances & Penalties</Text>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Department</Text>
                  {Platform.OS === 'web' ? (
                    <select 
                      value={rDept} 
                      onChange={(e: any) => { 
                        setRDept(e.target.value); 
                        const deptId = departments.find(d => d.name === e.target.value)?.id;
                        const deptRoles = roles.filter(r => r.departmentId == deptId);
                        setRRole(deptRoles.length > 0 ? deptRoles[0].name : '');
                      }} 
                      style={{...styles.input, backgroundColor: Colors.light.background, color: Colors.light.text, outline: 'none', border: `1px solid ${Colors.light.border}`}}
                    >
                      {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  ) : (
                    <TextInput style={styles.input} value={rDept} onChangeText={setRDept} placeholder="e.g. Cardiology" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Role</Text>
                  {Platform.OS === 'web' ? (
                    <select 
                      value={rRole} 
                      onChange={(e: any) => setRRole(e.target.value)} 
                      style={{...styles.input, backgroundColor: Colors.light.background, color: Colors.light.text, outline: 'none', border: `1px solid ${Colors.light.border}`}}
                    >
                      {roles.filter(r => r.departmentId == departments.find(d => d.name === rDept)?.id).map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  ) : (
                    <TextInput style={styles.input} value={rRole} onChangeText={setRRole} placeholder="e.g. Senior Surgeon" />
                  )}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
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

              <View style={styles.existingRules}>
                <Text style={styles.rulesHeading}>Active Role Policies</Text>
                {roleSettings.filter(rs => rs.role !== 'All' && rs.department !== 'All').map((rs, i) => (
                  <View key={i} style={styles.ruleItem}>
                    <View>
                      <Text style={styles.ruleName}>{rs.role} ({rs.department})</Text>
                      <Text style={[styles.ruleVal, { fontSize: 13, marginTop: 4 }]}>
                        {rs.leaves_per_month} free | ₹{rs.extra_leave_penalty} extra | {rs.late_checkin_limit} late/₹{rs.late_checkin_penalty} | {rs.early_checkout_limit} early/₹{rs.early_checkout_penalty}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      {activeTab === 'holidays' && (
        <View style={[styles.layout, isDesktop && { flexDirection: 'row' }]}>
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add Holiday</Text>
              <Text style={styles.helperText}>Declare holidays. Use "All" to apply to all departments.</Text>
              
              <Text style={styles.label}>Department</Text>
              <View style={styles.pickerContainer}>
                <select style={styles.webSelect} value={hDept} onChange={(e) => setHDept(e.target.value)}>
                  <option value="All">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </View>

              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} value={hDate} onChangeText={setHDate} placeholder="e.g. 2026-12-25" />

              <Text style={styles.label}>Description</Text>
              <TextInput style={styles.input} value={hDesc} onChangeText={setHDesc} placeholder="e.g. Christmas Day" />

              <Pressable style={styles.saveBtn} onPress={saveHoliday}>
                <Save size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Holiday</Text>
              </Pressable>
            </View>
          </View>
          
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Declared Holidays</Text>
              <Text style={styles.helperText}>List of all upcoming holidays</Text>
              
              <View style={styles.existingRules}>
                {holidays.map((h, i) => (
                  <View key={i} style={styles.ruleItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ruleName}>{new Date(h.date).toLocaleDateString()} - {h.description}</Text>
                      <Text style={[styles.ruleVal, { fontSize: 13, marginTop: 4 }]}>Department: {h.department}</Text>
                    </View>
                    <Pressable onPress={() => deleteHoliday(h.id)} style={{ padding: 8 }}>
                      <XCircle size={20} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
                {holidays.length === 0 && (
                  <Text style={styles.emptyStateText}>No holidays declared.</Text>
                )}
              </View>
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
  pickerContainer: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10, backgroundColor: Colors.light.background, marginBottom: 16, overflow: 'hidden' },
  webSelect: { width: '100%', padding: 14, fontSize: 15, backgroundColor: 'transparent', border: 'none', outline: 'none' } as any,
  saveBtn: { flexDirection: 'row', backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 48, backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, borderStyle: 'dashed' },
  emptyStateText: { color: Colors.light.icon, marginTop: 12, fontSize: 15, fontWeight: '500' },
  existingRules: { marginTop: 32, borderTopWidth: 1, borderTopColor: Colors.light.border, paddingTop: 20 },
  rulesHeading: { fontSize: 15, fontWeight: '700', color: Colors.light.text, marginBottom: 12 },
  ruleItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  ruleName: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  ruleVal: { fontSize: 14, color: Colors.light.icon, fontWeight: '500' }
});
