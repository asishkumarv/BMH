import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { API_URL } from '@/config';
import { Settings, Users, CalendarDays, CheckCircle2, XCircle, Clock, Save } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';

export default function SubAdminLeaveManagement() {
  const { isMobile, isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState<'requests' | 'settings' | 'holidays'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentId, setDepartmentId] = useState<string>('');
  const [deptNumId, setDeptNumId] = useState<string>('');

  // Settings State
  const [employeeSettings, setEmployeeSettings] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Settings Form State
  const [rEmployeeId, setREmployeeId] = useState('');
  const [rLeaves, setRLeaves] = useState('1');
  const [rExtraPen, setRExtraPen] = useState('0');
  const [rLateLim, setRLateLim] = useState('3');
  const [rLatePen, setRLatePen] = useState('0');
  const [rEarlyLim, setREarlyLim] = useState('3');
  const [rEarlyPen, setREarlyPen] = useState('0');

  // Holiday Form State
  const [hDate, setHDate] = useState('');
  const [hDesc, setHDesc] = useState('');

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
            const res = await fetch(`${API_URL}/department`);
            if (res.ok) {
               const data = await res.json();
               const match = (data.data || []).find((d: any) => String(d.id) === String(numId));
               if (match) {
                 deptName = match.name; 
                 setDepartmentId(deptName);
               }
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
      
      if (deptName) {
        fetchRequests(deptName);
        fetchSettings(deptName);
        fetchEmployees(deptName, numId);
        fetchHolidays(deptName);
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchEmployees = async (dept: string, numId: string) => {
    try {
      const [empRes, adminRes] = await Promise.all([
        axios.get(`${API_URL}/employees`),
        axios.get(`${API_URL}/admin/department-admins`).catch(() => ({ data: { data: [] } }))
      ]);
      let allUsers: any[] = [];
      if (empRes.data && empRes.data.success) {
        const emps = (empRes.data.data || []).map((e: any) => ({ ...e, user_type: 'employee' }));
        allUsers = [...allUsers, ...emps];
      }
      if (adminRes.data && adminRes.data.data) {
        const admins = (adminRes.data.data || []).map((a: any) => ({
          ...a,
          department: dept, // since they are in this dept
          role: 'Sub Admin',
          user_type: 'sub_admin'
        }));
        allUsers = [...allUsers, ...admins];
      }
      
      setEmployees(allUsers.filter((e: any) => 
        (e.department && e.department.toLowerCase() === dept.toLowerCase()) || 
        (e.department_id && String(e.department_id) === String(numId))
      ));
    } catch (e) { console.error("Dropdown fetch error:", e); }
  };

  useEffect(() => {
    if (employees.length > 0 && !rEmployeeId) {
      setREmployeeId(employees[0].id.toString());
    }
  }, [employees, rEmployeeId]);

  const fetchRequests = async (dept: string) => {
    try {
      const res = await fetch(`${API_URL}/leave/requests?department=${dept}`);
      if (res.ok) setRequests(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchHolidays = async (dept: string) => {
    try {
      const res = await fetch(`${API_URL}/holidays?department=${dept}`);
      if (res.ok) setHolidays(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchSettings = async (dept: string) => {
    try {
      const res = await fetch(`${API_URL}/leave/settings?department=${dept}`);
      if (res.ok) {
        const data = await res.json();
        setEmployeeSettings((data.employeeSettings || []).filter((r: any) => r.department && r.department.toLowerCase() === dept.toLowerCase()));
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

  const saveEmployeeSetting = async () => {
    try {
      if (!rEmployeeId) {
        Alert.alert('Error', 'Please select an employee');
        return;
      }
      const employee = employees.find(e => e.id.toString() === rEmployeeId);
      const userType = employee ? employee.user_type : 'employee';
      
      const res = await fetch(`${API_URL}/leave/settings/employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: parseInt(rEmployeeId),
          user_type: userType,
          leaves_per_month: parseInt(rLeaves), extra_leave_penalty: parseFloat(rExtraPen),
          late_checkin_limit: parseInt(rLateLim), late_checkin_penalty: parseInt(rLatePen),
          early_checkout_limit: parseInt(rEarlyLim), early_checkout_penalty: parseInt(rEarlyPen)
        })
      });
      if (res.ok) {
        Alert.alert('Success', 'Employee setting saved');
        fetchSettings(departmentId);
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
        body: JSON.stringify({ department: departmentId, date: hDate, description: hDesc })
      });
      if (res.ok) {
        Alert.alert('Success', 'Holiday saved');
        fetchHolidays(departmentId);
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
        fetchHolidays(departmentId);
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={{flexGrow: 1}}>
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
      </ScrollView>

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
                <Text style={styles.cardTitle}>Set Employee Allowances & Penalties</Text>
              </View>
              <Text style={styles.helperText}>Configure how many leaves are free per month, and set penalties for late check-ins or extra leaves.</Text>
              
              <Text style={styles.label}>Employee</Text>
              {Platform.OS === 'web' ? (
                <select 
                  value={rEmployeeId} 
                  onChange={(e: any) => { 
                    const empId = e.target.value;
                    setREmployeeId(empId);
                    const existing = employeeSettings.find(es => es.employee_id == empId);
                    if (existing) {
                      setRLeaves(existing.leaves_per_month.toString());
                      setRExtraPen(existing.extra_leave_penalty.toString());
                      setRLateLim(existing.late_checkin_limit.toString());
                      setRLatePen(existing.late_checkin_penalty.toString());
                      setREarlyLim(existing.early_checkout_limit.toString());
                      setREarlyPen(existing.early_checkout_penalty.toString());
                    } else {
                      setRLeaves('0'); setRExtraPen('0'); setRLateLim('0'); setRLatePen('0'); setREarlyLim('0'); setREarlyPen('0');
                    }
                  }} 
                  style={{...styles.input, backgroundColor: Colors.light.background, color: Colors.light.text, border: `1px solid ${Colors.light.border}`}}
                >
                  <option value="">Select an Employee...</option>
                  {employees.map(e => <option key={`employee-${e.id}`} value={e.id}>{e.full_name} ({e.department || 'Dept'})</option>)}
                </select>
              ) : (
                <View style={[styles.input, { paddingHorizontal: 0, justifyContent: 'center' }]}>
                  <Picker 
                    selectedValue={rEmployeeId} 
                    onValueChange={(val) => {
                      const empId = val;
                      setREmployeeId(empId);
                      const existing = employeeSettings.find(es => es.employee_id == empId);
                      if (existing) {
                        setRLeaves(existing.leaves_per_month.toString());
                        setRExtraPen(existing.extra_leave_penalty.toString());
                        setRLateLim(existing.late_checkin_limit.toString());
                        setRLatePen(existing.late_checkin_penalty.toString());
                        setREarlyLim(existing.early_checkout_limit.toString());
                        setREarlyPen(existing.early_checkout_penalty.toString());
                      } else {
                        setRLeaves('0'); setRExtraPen('0'); setRLateLim('0'); setRLatePen('0'); setREarlyLim('0'); setREarlyPen('0');
                      }
                    }}
                    style={{ width: '100%', height: 50 }}
                  >
                    <Picker.Item label="Select an Employee..." value="" />
                    {employees.map(e => <Picker.Item key={`employee-${e.id}`} label={`${e.full_name} (${e.department || 'Dept'})`} value={e.id.toString()} />)}
                  </Picker>
                </View>
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
              
              <Pressable style={styles.saveBtn} onPress={saveEmployeeSetting}>
                <Save size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Policy</Text>
              </Pressable>

              <View style={styles.existingRules}>
                <Text style={styles.rulesHeading}>Active Employee Policies</Text>
                {employeeSettings.map((es, i) => (
                  <View key={i} style={styles.ruleItem}>
                    <View>
                      <Text style={styles.ruleName}>{es.employee_name} ({es.department} - {es.role})</Text>
                      <Text style={[styles.ruleVal, { fontSize: 13, marginTop: 4 }]}>
                        {es.leaves_per_month} free | ₹{es.extra_leave_penalty} extra | {es.late_checkin_limit} late/₹{es.late_checkin_penalty} | {es.early_checkout_limit} early/₹{es.early_checkout_penalty}
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
              <Text style={styles.helperText}>Declare holidays for your department.</Text>
              
              <Text style={styles.label}>Department</Text>
              <View style={styles.pickerContainer}>
                <Text style={[styles.input, { backgroundColor: '#F8FAFC', marginBottom: 0 }]}>{departmentId}</Text>
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
                    {/* Only allow deleting if they created it for this dept (not "All") */}
                    {h.department === departmentId && (
                      <Pressable onPress={() => deleteHoliday(h.id)} style={{ padding: 8 }}>
                        <XCircle size={20} color="#EF4444" />
                      </Pressable>
                    )}
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
  webSelect: { width: '100%', padding: 14, fontSize: 15, backgroundColor: 'transparent', border: 'none' } as any,
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
