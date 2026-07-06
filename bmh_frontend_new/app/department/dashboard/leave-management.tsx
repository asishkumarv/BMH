import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { CalendarDays, Send, Clock, CheckCircle2, XCircle, Info, User } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_URL } from '../../../config';
import { useResponsive } from '../../../hooks/useResponsive';

export default function LeaveManagement() {
  const { isMobile, isDesktop } = useResponsive();
  const [employee, setEmployee] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [projection, setProjection] = useState<{
    days: number,
    salaryPerDay: number,
    penaltyRate: number,
    penalizedDays: number,
    salaryDeduction: number,
    penaltyDeduction: number,
    totalDeduction: number
  } | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [empRequests, setEmpRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'apply' | 'approvals'>('apply');

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Cache for monthly summaries
  const [monthlySummaries, setMonthlySummaries] = useState<{[key: string]: any}>({});
  const loadedMonthsRef = React.useRef<Set<string>>(new Set());

  // Reset cache when employee changes
  useEffect(() => {
    setMonthlySummaries({});
    loadedMonthsRef.current = new Set();
  }, [employee?.id]);

  useEffect(() => {
    fetchEmployeeAndRequests();
  }, []);

  const fetchEmployeeAndRequests = async () => {
    try {
      const empData = Platform.OS === 'web' 
        ? localStorage.getItem('subAdminUser')
        : await AsyncStorage.getItem('subAdminUser');

      if (!empData) return;
      const emp = JSON.parse(empData);
      setEmployee(emp);

      const [reqRes, sumRes, holRes, empReqRes] = await Promise.all([
        fetch(`${API_URL}/leave/requests?employee_id=${emp.id}&user_type=sub_admin`),
        fetch(`${API_URL}/leave/summary/${emp.id}?user_type=sub_admin`),
        fetch(`${API_URL}/holidays?department=${emp.department || (emp.department_id ? 'Department ID: ' + emp.department_id : '')}`),
        fetch(`${API_URL}/leave/requests?department=${emp.department || (emp.department_id ? 'Department ID: ' + emp.department_id : '')}`)
      ]);
      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(data);
      }
      if (sumRes.ok) {
        const data = await sumRes.json();
        setSummary(data);
      }
      if (holRes.ok) {
        const data = await holRes.json();
        setHolidays(data);
      }
      if (empReqRes.ok) {
        const data = await empReqRes.json();
        setEmpRequests(data.filter((r: any) => r.user_type === 'employee'));
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch summaries for months involved in the date range
  useEffect(() => {
    if (!employee || !startDate || !endDate) return;
    
    const startMonth = startDate.substring(0, 7);
    const endMonth = endDate.substring(0, 7);
    const months = Array.from(new Set([startMonth, endMonth].filter(m => m.length === 7)));
    
    months.forEach(async (m) => {
      if (loadedMonthsRef.current.has(m)) return;
      
      try {
        const res = await fetch(`${API_URL}/leave/summary/${employee.id}?month=${m}&user_type=sub_admin`);
        if (res.ok) {
          const data = await res.json();
          loadedMonthsRef.current.add(m);
          setMonthlySummaries(prev => ({ ...prev, [m]: data }));
        }
      } catch (err) {
        console.error(`Error fetching summary for month ${m}:`, err);
      }
    });
  }, [startDate, endDate, employee?.id]);

  const getTomorrowString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };
  const minDateStr = getTomorrowString();

  // Multi-month aware cost projection
  useEffect(() => {
    if (startDate && endDate && employee && summary) {
      if (startDate > endDate) {
         setProjection(null);
         return;
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      const holidayDates = new Set(holidays.map(h => new Date(h.date).toISOString().split('T')[0]));
      
      // Group requested working days by month
      const daysByMonth: { [key: string]: number } = {};
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) { // Not Sunday
          const dStr = d.toISOString().split('T')[0];
          if (!holidayDates.has(dStr)) {
            const monthStr = dStr.substring(0, 7);
            daysByMonth[monthStr] = (daysByMonth[monthStr] || 0) + 1;
          }
        }
      }

      const monthsInvolved = Object.keys(daysByMonth);
      
      // Helper to get summary for a month (fallback to main summary if current month)
      const getSummaryForMonth = (m: string) => {
        return monthlySummaries[m] || (m === new Date().toISOString().substring(0, 7) ? summary : null);
      };

      let totalDays = 0;
      let totalPenalizedDays = 0;
      let totalSalaryDeduction = 0;
      let totalPenaltyDeduction = 0;
      let penaltyRate = 0;

      let baseSalary = 0;
      try {
        let pd = employee.profile_data;
        if (typeof pd === 'string') pd = JSON.parse(pd);
        if (pd && pd.salary) {
          baseSalary = parseFloat(pd.salary);
        }
      } catch (e) {}
      const salaryPerDay = baseSalary / 30;

      for (const m of monthsInvolved) {
        const mSummary = getSummaryForMonth(m);
        if (!mSummary) return; // Wait for summaries to load
        
        const N = daysByMonth[m];
        totalDays += N;
        
        const used = mSummary.usage.leaves;
        const limit = mSummary.limits.leaves;
        const extraPen = parseFloat(mSummary.penalties?.extra_leave || 0);
        penaltyRate = extraPen;
        
        const penalized = Math.max(0, used + N - limit) - Math.max(0, used - limit);
        totalPenalizedDays += penalized;
        totalSalaryDeduction += penalized * salaryPerDay;
        totalPenaltyDeduction += penalized * extraPen;
      }

      setProjection({
        days: totalDays,
        salaryPerDay,
        penaltyRate,
        penalizedDays: totalPenalizedDays,
        salaryDeduction: totalSalaryDeduction,
        penaltyDeduction: totalPenaltyDeduction,
        totalDeduction: totalSalaryDeduction + totalPenaltyDeduction
      });
    } else {
      setProjection(null);
    }
  }, [startDate, endDate, summary, monthlySummaries, holidays, employee]);

  const submitRequest = async () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (startDate < minDateStr || endDate < minDateStr) {
      Alert.alert('Error', 'Leaves can only be applied from tomorrow onwards');
      if (Platform.OS === 'web') window.alert('Leaves can only be applied from tomorrow onwards');
      return;
    }

    if (endDate < startDate) {
      Alert.alert('Error', 'End date must be after or equal to start date');
      if (Platform.OS === 'web') window.alert('End date must be after or equal to start date');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/leave/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          user_type: 'sub_admin',
          start_date: startDate,
          end_date: endDate,
          reason,
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        Alert.alert('Error', data.message || 'Failed to submit request');
        if (Platform.OS === 'web') window.alert(data.message || 'Failed to submit request');
      } else {
        Alert.alert('Success', 'Leave request submitted successfully');
        if (Platform.OS === 'web') window.alert('Leave request submitted successfully');
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchEmployeeAndRequests();
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      Alert.alert('Error', 'An error occurred');
    } finally {
      setSubmitting(false);
    }
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
        fetchEmployeeAndRequests();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.message || 'Failed to update status');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'An error occurred');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, !isDesktop && { padding: 16 }]}>
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <CalendarDays size={28} color={Colors.light.primary} />
        </View>
        <View>
          <Text style={styles.title}>Leave Management</Text>
          <Text style={styles.subtitle}>Apply for leaves and track your requests</Text>
        </View>
      </View>

      {summary && (
        <View style={[styles.summaryRow, !isDesktop && { flexDirection: 'column' }]}>
          <View style={styles.summaryCard}>
             <Text style={styles.summaryVal}>{summary.usage.leaves} <Text style={styles.summaryLimit}>/ {summary.limits.leaves}</Text></Text>
             <Text style={styles.summaryLabel}>Leaves This Month</Text>
          </View>
          <View style={styles.summaryCard}>
             <Text style={styles.summaryVal}>{summary.usage.late_checkins} <Text style={styles.summaryLimit}>/ {summary.limits.late_checkins}</Text></Text>
             <Text style={styles.summaryLabel}>Late Check-ins</Text>
          </View>
          <View style={styles.summaryCard}>
             <Text style={styles.summaryVal}>{summary.usage.early_checkouts} <Text style={styles.summaryLimit}>/ {summary.limits.early_checkouts}</Text></Text>
             <Text style={styles.summaryLabel}>Early Check-outs</Text>
          </View>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={{flexGrow: 1}}>
        <Pressable style={[styles.tab, activeTab === 'apply' && styles.activeTab]} onPress={() => setActiveTab('apply')}>
          <CalendarDays size={18} color={activeTab === 'apply' ? Colors.light.primary : Colors.light.icon} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'apply' && styles.activeTabText]}>My Leaves</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'approvals' && styles.activeTab]} onPress={() => setActiveTab('approvals')}>
          <User size={18} color={activeTab === 'approvals' ? Colors.light.primary : Colors.light.icon} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'approvals' && styles.activeTabText]}>Team Requests</Text>
        </Pressable>
      </ScrollView>

      {activeTab === 'apply' && (
      <View style={[styles.layout, isDesktop && { flexDirection: 'row', gap: 24 }]}>
        {/* Form Section */}
        <View style={[styles.section, isDesktop && { flex: 1 }]}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New Leave Application</Text>
            <View style={styles.alertBox}>
               <Info size={20} color={Colors.light.primary} style={{marginRight: 8}}/>
               <Text style={styles.alertText}>Your department limits concurrent leaves. Apply early to secure your dates.</Text>
            </View>

            <View style={[styles.formRow, !isDesktop && { flexDirection: 'column', gap: 16 }]}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Start Date</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    min={minDateStr}
                    value={startDate}
                    onChange={(e: any) => setStartDate(e.target.value)}
                    style={{...styles.input, backgroundColor: Colors.light.background, color: Colors.light.text, border: `1px solid ${Colors.light.border}`, boxSizing: 'border-box', width: '100%', fontFamily: 'inherit'}}
                  />
                ) : (
                  <>
                    <Pressable onPress={() => setShowStartPicker(true)}>
                      <View pointerEvents="none">
                        <TextInput
                          style={styles.input}
                          value={startDate}
                          editable={false}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={Colors.light.icon}
                        />
                      </View>
                    </Pressable>
                    {showStartPicker && (
                      <DateTimePicker
                        value={startDate ? new Date(startDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event: any, date?: Date) => {
                          setShowStartPicker(Platform.OS === 'ios');
                          if (date) {
                            const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                            setStartDate(offsetDate.toISOString().split('T')[0]);
                          }
                        }}
                      />
                    )}
                  </>
                )}
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>End Date</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    min={startDate || minDateStr}
                    value={endDate}
                    onChange={(e: any) => setEndDate(e.target.value)}
                    style={{...styles.input, backgroundColor: Colors.light.background, color: Colors.light.text, border: `1px solid ${Colors.light.border}`, boxSizing: 'border-box', width: '100%', fontFamily: 'inherit'}}
                  />
                ) : (
                  <>
                    <Pressable onPress={() => setShowEndPicker(true)}>
                      <View pointerEvents="none">
                        <TextInput
                          style={styles.input}
                          value={endDate}
                          editable={false}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={Colors.light.icon}
                        />
                      </View>
                    </Pressable>
                    {showEndPicker && (
                      <DateTimePicker
                        value={endDate ? new Date(endDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event: any, date?: Date) => {
                          setShowEndPicker(Platform.OS === 'ios');
                          if (date) {
                            const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                            setEndDate(offsetDate.toISOString().split('T')[0]);
                          }
                        }}
                      />
                    )}
                  </>
                )}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Reason for Leave</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={reason}
                onChangeText={setReason}
                placeholder="Please describe why you need this leave..."
                placeholderTextColor={Colors.light.icon}
                multiline
              />
            </View>

            {projection && (
              <View style={styles.projectionBox}>
                <Text style={styles.projectionTitle}>Cost Projection</Text>
                <Text style={styles.projectionText}>Total Working Days Requested: {projection.days}</Text>
                
                {projection.penalizedDays > 0 ? (
                  <>
                    <View style={{ marginTop: 8, marginBottom: 8, padding: 8, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 8 }}>
                      <Text style={[styles.projectionText, { marginBottom: 2 }]}>
                        Unpaid Days: {projection.penalizedDays}
                      </Text>
                      {projection.salaryPerDay > 0 && (
                        <Text style={[styles.projectionText, { marginBottom: 2 }]}>
                          Salary Deduction: {projection.penalizedDays} × ₹{(projection.salaryPerDay || 0).toFixed(2)} = ₹{(projection.salaryDeduction || 0).toFixed(2)}
                        </Text>
                      )}
                      {projection.penaltyRate > 0 && (
                        <Text style={[styles.projectionText, { marginBottom: 2 }]}>
                          Extra Penalty: {projection.penalizedDays} × ₹{(projection.penaltyRate || 0).toFixed(2)} = ₹{(projection.penaltyDeduction || 0).toFixed(2)}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.projectionText, { color: Colors.light.error, fontWeight: '700', fontSize: 16 }]}>
                      Total Deduction: ₹{(projection.totalDeduction || 0).toFixed(2)}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.projectionText, { color: Colors.light.primary, fontWeight: '700', marginTop: 4 }]}>
                    Within free limit. No deduction.
                  </Text>
                )}
              </View>
            )}
            <Pressable 
              style={[styles.submitButton, submitting && { opacity: 0.7 }]} 
              onPress={submitRequest}
              disabled={submitting}
            >
              <Send size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Request'}</Text>
            </Pressable>
          </View>
        </View>

        {/* List Section */}
        <View style={[styles.section, isDesktop && { flex: 1.5 }]}>
          <Text style={styles.sectionHeading}>History</Text>
          {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarDays size={48} color={Colors.light.border} />
              <Text style={styles.emptyStateText}>No leave requests found.</Text>
            </View>
          ) : (
            requests.map((req) => (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.reqHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <CalendarDays size={16} color={Colors.light.icon} style={{ marginRight: 8 }} />
                    <Text style={styles.reqDates}>
                      {new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    req.status === 'approved' ? styles.statusApproved : 
                    req.status === 'rejected' ? styles.statusRejected : 
                    styles.statusPending
                  ]}>
                    {req.status === 'approved' && <CheckCircle2 size={14} color="#059669" style={{ marginRight: 4 }} />}
                    {req.status === 'rejected' && <XCircle size={14} color="#DC2626" style={{ marginRight: 4 }} />}
                    {req.status === 'pending' && <Clock size={14} color="#D97706" style={{ marginRight: 4 }} />}
                    <Text style={[
                      styles.statusText,
                      req.status === 'approved' ? { color: '#059669' } : 
                      req.status === 'rejected' ? { color: '#DC2626' } : 
                      { color: '#D97706' }
                    ]}>{req.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.reqReason}>
                  {typeof req.reason === 'object' ? (req.reason?.text || JSON.stringify(req.reason)) : req.reason}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
      )}

      {activeTab === 'approvals' && (
        <View>
          {empRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarDays size={48} color={Colors.light.border} />
              <Text style={styles.emptyStateText}>No pending employee leave requests.</Text>
            </View>
          ) : null}
          <View style={[styles.grid, !isDesktop && { flexDirection: 'column' }]}>
            {empRequests.map(req => (
              <View key={req.id} style={[styles.empCard, !isDesktop ? { width: '100%' } : { width: '48%' }]}>
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
                <Text style={styles.reqReason}>
                  "{typeof req.reason === 'object' ? (req.reason?.text || JSON.stringify(req.reason)) : req.reason}"
                </Text>
                
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: Colors.light.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.light.icon, marginTop: 4 },
  layout: { gap: 24 },
  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: Colors.light.card, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, alignItems: 'center' },
  summaryVal: { fontSize: 32, fontWeight: '800', color: Colors.light.primary },
  summaryLimit: { fontSize: 18, color: Colors.light.icon, fontWeight: '600' },
  summaryLabel: { fontSize: 14, color: Colors.light.textMuted, fontWeight: '600', marginTop: 4 },
  section: { flex: 1 },
  sectionHeading: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },
  card: { backgroundColor: Colors.light.card, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },
  alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, marginBottom: 20 },
  alertText: { flex: 1, fontSize: 13, color: Colors.light.primary, fontWeight: '500' },
  formRow: { flexDirection: 'row', gap: 16 },
  formGroup: { flex: 1, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, padding: 16, fontSize: 15, backgroundColor: Colors.light.background, color: Colors.light.text },
  textArea: { height: 120, textAlignVertical: 'top' },
  submitButton: { flexDirection: 'row', backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitText: { color: 'white', fontWeight: '700', fontSize: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 48, backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, borderStyle: 'dashed' },
  emptyStateText: { color: Colors.light.icon, marginTop: 12, fontSize: 15, fontWeight: '500' },
  requestCard: { backgroundColor: Colors.light.card, padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.border },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reqDates: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  reqReason: { fontSize: 15, color: Colors.light.textMuted, lineHeight: 22 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  statusApproved: { backgroundColor: '#D1FAE5' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 12, fontWeight: '700' },
  projectionBox: { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  projectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.primary, marginBottom: 8 },
  projectionText: { fontSize: 14, color: Colors.light.text, marginBottom: 4 },
  tabs: { flexDirection: 'row', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: Colors.light.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: Colors.light.icon },
  activeTabText: { color: Colors.light.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  empCard: { backgroundColor: Colors.light.card, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, marginBottom: 16 },
  reqName: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  reqRole: { fontSize: 14, color: Colors.light.icon, marginTop: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.light.border, paddingTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  actionBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
