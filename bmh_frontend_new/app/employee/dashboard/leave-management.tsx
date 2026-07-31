import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { CalendarDays, Send, Clock, CheckCircle2, XCircle, Info, X } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_URL } from '../../../config';
import { useResponsive } from '../../../hooks/useResponsive';

const formatDateToDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateStr;
  }
};

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [selectedStatsCard, setSelectedStatsCard] = useState<'leaves' | 'late' | 'early' | null>(null);

  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySession, setHalfDaySession] = useState<'first_half' | 'second_half'>('first_half');
  const [requestType, setRequestType] = useState<'leave' | 'late_checkin' | 'early_checkout'>('leave');
  const [permissionDuration, setPermissionDuration] = useState<'30m' | '1h' | '1.5h'>('30m');

  useEffect(() => {
    if (isHalfDay && startDate) {
      setEndDate(startDate);
    }
  }, [isHalfDay, startDate]);

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
        ? localStorage.getItem('employeeUser')
        : await AsyncStorage.getItem('employeeUser');

      if (!empData) return;
      const emp = JSON.parse(empData);
      setEmployee(emp);

      const [reqRes, sumRes, holRes] = await Promise.all([
        fetch(`${API_URL}/leave/requests?employee_id=${emp.id}`),
        fetch(`${API_URL}/leave/summary/${emp.id}`),
        fetch(`${API_URL}/holidays?department=${emp.department}`)
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
      
      const analyticsRes = await fetch(`${API_URL}/attendance/employee-analytics?employeeId=${emp.id}&userType=employee`);
      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAttendanceHistory(aData.history || []);
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
        const res = await fetch(`${API_URL}/leave/summary/${employee.id}?month=${m}`);
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

  const getAbsentDaysList = () => {
    if (!employee) return [];
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const attendedDays = new Set(attendanceHistory.map(r => new Date(r.date).getDate()));
    const holidaySet = new Set(holidays.map(h => new Date(h.date).getDate()));
    const list = [];
    const limitDay = now.getDate();
    for (let day = 1; day <= limitDay; day++) {
      const dateObj = new Date(year, monthIndex, day);
      const dayOfWeek = dateObj.getDay();
      const isSunday = (dayOfWeek === 0);
      const isHoliday = holidaySet.has(day);
      if (!isSunday && !isHoliday && !attendedDays.has(day)) {
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isAuthorized = requests.some(req => {
          const start = req.start_date.split('T')[0];
          const end = req.end_date.split('T')[0];
          return req.status === 'approved' && req.request_type === 'leave' && dateStr >= start && dateStr <= end;
        });
        list.push({
          date: dateStr,
          status: isAuthorized ? 'Approved Leave' : 'Unauthorized'
        });
      }
    }
    return list;
  };

  const getLateCheckinsList = () => {
    return attendanceHistory.filter(r => r.late_checkin_mins > 0);
  };

  const getEarlyCheckoutsList = () => {
    return attendanceHistory.filter(r => r.early_checkout_mins > 0);
  };

  // Multi-month aware cost projection
  useEffect(() => {
    if (requestType !== 'leave') {
      setProjection(null);
      return;
    }
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
      if (isHalfDay) {
        const dStr = start.toISOString().split('T')[0];
        if (!holidayDates.has(dStr)) {
          const monthStr = dStr.substring(0, 7);
          daysByMonth[monthStr] = (daysByMonth[monthStr] || 0) + 0.5;
        }
      } else {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
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
      const salaryPerDay = baseSalary / 27;

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
  }, [startDate, endDate, isHalfDay, summary, monthlySummaries, holidays, employee]);

  const handlePreSubmit = () => {
    const targetEndDate = requestType === 'leave' ? endDate : startDate;
    if (!startDate || !targetEndDate || !reason) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (startDate < minDateStr || targetEndDate < minDateStr) {
      Alert.alert('Error', 'Requests can only be applied from tomorrow onwards');
      if (Platform.OS === 'web') window.alert('Requests can only be applied from tomorrow onwards');
      return;
    }

    if (requestType === 'leave' && targetEndDate < startDate) {
      Alert.alert('Error', 'End date must be after or equal to start date');
      if (Platform.OS === 'web') window.alert('End date must be after or equal to start date');
      return;
    }

    setShowConfirmModal(true);
  };

  const executeSubmitRequest = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    const targetEndDate = requestType === 'leave' ? endDate : startDate;
    try {
      const res = await fetch(`${API_URL}/leave/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          start_date: startDate,
          end_date: targetEndDate,
          reason: requestType === 'leave' ? reason : `[${permissionDuration === '30m' ? '30 Mins' : permissionDuration === '1h' ? '1 Hour' : '1.5 Hours'} Permission] ${reason}`,
          is_half_day: isHalfDay,
          half_day_session: isHalfDay ? halfDaySession : null,
          request_type: requestType
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

  const handleRevokeRequest = (id: number) => {
    const revokeAction = async () => {
      try {
        const res = await fetch(`${API_URL}/leave/request/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'revoked',
            approved_by_id: employee?.id,
            approved_by_type: 'employee',
            approved_by_name: employee?.full_name,
            approved_by_dept: employee?.department,
            rejection_reason: 'Revoked by employee'
          })
        });
        if (res.ok) {
          if (Platform.OS === 'web') {
            alert('Leave request revoked successfully.');
          } else {
            Alert.alert('Success', 'Leave request revoked successfully.');
          }
          fetchEmployeeAndRequests();
        } else {
          const err = await res.json();
          if (Platform.OS === 'web') {
            alert(err.message || 'Failed to revoke request.');
          } else {
            Alert.alert('Error', err.message || 'Failed to revoke request.');
          }
        }
      } catch (error) {
        console.error('Error revoking leave request:', error);
        if (Platform.OS === 'web') {
          alert('Network error. Failed to revoke request.');
        } else {
          Alert.alert('Error', 'Network error. Failed to revoke request.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to revoke this leave request?')) {
        revokeAction();
      }
    } else {
      Alert.alert(
        'Confirm Revoke',
        'Are you sure you want to revoke this leave request?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Revoke', style: 'destructive', onPress: revokeAction }
        ]
      );
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
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Request Submission</Text>
            
            <View style={{ marginVertical: 16, gap: 8 }}>
              <Text style={{ fontSize: 15, color: '#334155', fontWeight: '500' }}>
                Type: <Text style={{ fontWeight: '700' }}>{requestType === 'leave' ? 'Leave' : requestType === 'late_checkin' ? 'Late Check-in' : 'Early Checkout'}</Text>
              </Text>
              <Text style={{ fontSize: 15, color: '#334155', fontWeight: '500' }}>
                Dates: <Text style={{ fontWeight: '700' }}>{formatDateToDDMMYYYY(startDate)} {requestType === 'leave' && !isHalfDay && `to ${formatDateToDDMMYYYY(endDate)}`}</Text>
              </Text>
              {isHalfDay && (
                <Text style={{ fontSize: 15, color: '#334155', fontWeight: '500' }}>
                  Session: <Text style={{ fontWeight: '700' }}>{halfDaySession === 'first_half' ? 'First Half' : 'Second Half'}</Text>
                </Text>
              )}
              {requestType !== 'leave' && (
                <Text style={{ fontSize: 15, color: '#334155', fontWeight: '500' }}>
                  Duration: <Text style={{ fontWeight: '700' }}>{permissionDuration === '30m' ? '30 Mins' : permissionDuration === '1h' ? '1 Hour' : '1.5 Hours'}</Text>
                </Text>
              )}
            </View>

            {requestType === 'leave' && projection ? (
              <View style={{ backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 }}>Salary Cut Calculation</Text>
                <Text style={{ fontSize: 14, color: '#475569', marginBottom: 4 }}>Total Requested Days: {projection.days}</Text>
                {projection.penalizedDays > 0 ? (
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 14, color: '#475569' }}>Unpaid Days: {projection.penalizedDays}</Text>
                    {projection.salaryPerDay > 0 && (
                      <Text style={{ fontSize: 14, color: '#475569' }}>
                        Salary Deduction: {projection.penalizedDays} × ₹{projection.salaryPerDay.toFixed(2)} = ₹{projection.salaryDeduction.toFixed(2)}
                      </Text>
                    )}
                    {projection.penaltyRate > 0 && (
                      <Text style={{ fontSize: 14, color: '#475569' }}>
                        Extra Penalty: {projection.penalizedDays} × ₹{projection.penaltyRate.toFixed(2)} = ₹{projection.penaltyDeduction.toFixed(2)}
                      </Text>
                    )}
                    <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.light.error, marginTop: 8 }}>
                      Total Deduction: ₹{projection.totalDeduction.toFixed(2)}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.primary, marginTop: 4 }}>
                    Within free limit. No salary cut! 🎉
                  </Text>
                )}
              </View>
            ) : requestType !== 'leave' ? (
              <View style={{ backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.primary }}>
                  Permission Request: Within limits, no direct deduction.
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <Pressable 
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f1f5f9' }} 
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={{ color: '#475569', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: Colors.light.primary }} 
                onPress={executeSubmitRequest}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Proceed & Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <CalendarDays size={28} color={Colors.light.primary} />
        </View>
        <View>
          <Text style={styles.title}>Leave Management</Text>
          <Text style={styles.subtitle}>Apply for leaves and track your requests</Text>
        </View>
      </View>

      {/* Stats Details Popup Modal */}
      <Modal visible={selectedStatsCard !== null} transparent animationType="fade" onRequestClose={() => setSelectedStatsCard(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.modalTitle}>
                {selectedStatsCard === 'leaves' ? 'Absent Days Breakdown' : selectedStatsCard === 'late' ? 'Late Check-ins Breakdown' : 'Early Check-outs Breakdown'}
              </Text>
              <Pressable onPress={() => setSelectedStatsCard(null)}>
                <X color="#6b7280" size={24} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {selectedStatsCard === 'leaves' && (
                <View style={{ gap: 10 }}>
                  {getAbsentDaysList().length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#64748b', marginVertical: 20 }}>No absent days this month.</Text>
                  ) : (
                    getAbsentDaysList().map((item, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                        <Text style={{ fontWeight: '600', color: Colors.light.text }}>{formatDateToDDMMYYYY(item.date)}</Text>
                        <Text style={{ 
                          fontWeight: '700', 
                          color: item.status === 'Approved Leave' ? '#059669' : '#EF4444',
                          backgroundColor: item.status === 'Approved Leave' ? '#D1FAE5' : '#FEE2E2',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 4,
                          fontSize: 12
                        }}>
                          {item.status}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}

              {selectedStatsCard === 'late' && (
                <View style={{ gap: 10 }}>
                  {getLateCheckinsList().length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#64748b', marginVertical: 20 }}>No late check-ins this month.</Text>
                  ) : (
                    getLateCheckinsList().map((item, idx) => (
                      <View key={idx} style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 }}>
                        <Text style={{ fontWeight: '600', color: Colors.light.text }}>{formatDateToDDMMYYYY(item.date)}</Text>
                        <Text style={{ fontSize: 13, color: '#475569' }}>
                          Check In: {item.check_in ? new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#475569' }}>
                          Shift In: {item.shiftIn || '--'}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444' }}>
                          Late by: {item.late_checkin_mins} mins
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}

              {selectedStatsCard === 'early' && (
                <View style={{ gap: 10 }}>
                  {getEarlyCheckoutsList().length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#64748b', marginVertical: 20 }}>No early check-outs this month.</Text>
                  ) : (
                    getEarlyCheckoutsList().map((item, idx) => (
                      <View key={idx} style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 }}>
                        <Text style={{ fontWeight: '600', color: Colors.light.text }}>{formatDateToDDMMYYYY(item.date)}</Text>
                        <Text style={{ fontSize: 13, color: '#475569' }}>
                          Check Out: {item.check_out ? new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#475569' }}>
                          Shift Out: {item.shiftOut || '--'}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#f59e0b' }}>
                          Early by: {item.early_checkout_mins} mins
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {summary && (
        <View style={[styles.summaryRow, !isDesktop && { flexDirection: 'column' }]}>
          <Pressable style={styles.summaryCard} onPress={() => setSelectedStatsCard('leaves')}>
             <Text style={styles.summaryVal}>{summary.usage.leaves} <Text style={styles.summaryLimit}>/ {summary.limits.leaves}</Text></Text>
             <Text style={styles.summaryLabel}>Leaves This Month</Text>
          </Pressable>
          <Pressable style={styles.summaryCard} onPress={() => setSelectedStatsCard('late')}>
             <Text style={styles.summaryVal}>{summary.usage.late_checkins} <Text style={styles.summaryLimit}>/ {summary.limits.late_checkins}</Text></Text>
             <Text style={styles.summaryLabel}>Late Check-ins</Text>
          </Pressable>
          <Pressable style={styles.summaryCard} onPress={() => setSelectedStatsCard('early')}>
             <Text style={styles.summaryVal}>{summary.usage.early_checkouts} <Text style={styles.summaryLimit}>/ {summary.limits.early_checkouts}</Text></Text>
             <Text style={styles.summaryLabel}>Early Check-outs</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.layout, isDesktop && { flexDirection: 'row', gap: 24 }]}>
        {/* Form Section */}
        <View style={[styles.section, isDesktop && { flex: 1 }]}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New Request Application</Text>
            <View style={styles.alertBox}>
               <Info size={20} color={Colors.light.primary} style={{marginRight: 8}}/>
               <Text style={styles.alertText}>Apply for leaves or permissions. Permissions are capped at 1.5 hours max.</Text>
            </View>

            {/* Application Type Selector */}
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Application Type</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {(['leave', 'late_checkin', 'early_checkout'] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => {
                      setRequestType(t);
                      if (t !== 'leave') {
                        setIsHalfDay(false);
                      }
                    }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderWidth: 1,
                      borderColor: requestType === t ? Colors.light.primary : Colors.light.border,
                      borderRadius: 8,
                      backgroundColor: requestType === t ? 'rgba(37, 99, 235, 0.1)' : 'white',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Text style={{ fontSize: 13, color: requestType === t ? Colors.light.primary : Colors.light.text, fontWeight: '600' }}>
                      {t === 'leave' ? 'Leave' : t === 'late_checkin' ? 'Late Check-in' : 'Early Checkout'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Duration Selector for Permissions */}
            {requestType !== 'leave' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.label}>Permission Duration (Max 1.5 Hours)</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  {(['30m', '1h', '1.5h'] as const).map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => setPermissionDuration(d)}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: permissionDuration === d ? Colors.light.primary : Colors.light.border,
                        borderRadius: 8,
                        backgroundColor: permissionDuration === d ? 'rgba(37, 99, 235, 0.1)' : 'white',
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ fontSize: 13, color: permissionDuration === d ? Colors.light.primary : Colors.light.text, fontWeight: '600' }}>
                        {d === '30m' ? '30 Mins' : d === '1h' ? '1 Hour' : '1.5 Hours'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.formRow, !isDesktop && { flexDirection: 'column', gap: 16 }]}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{requestType === 'leave' ? 'Start Date' : 'Date'}</Text>
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
              {requestType === 'leave' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>End Date</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      min={startDate || minDateStr}
                      value={isHalfDay ? startDate : endDate}
                      disabled={isHalfDay}
                      onChange={(e: any) => setEndDate(e.target.value)}
                      style={{...styles.input, backgroundColor: isHalfDay ? '#F1F5F9' : Colors.light.background, color: Colors.light.text, border: `1px solid ${Colors.light.border}`, boxSizing: 'border-box', width: '100%', fontFamily: 'inherit'}}
                    />
                  ) : (
                    <>
                      <Pressable onPress={() => { if (!isHalfDay) setShowEndPicker(true); }}>
                        <View pointerEvents="none">
                          <TextInput
                            style={[styles.input, isHalfDay && { backgroundColor: '#F1F5F9' }]}
                            value={isHalfDay ? startDate : endDate}
                            editable={false}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={Colors.light.icon}
                          />
                        </View>
                      </Pressable>
                      {showEndPicker && !isHalfDay && (
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
              )}
            </View>

            {/* Half Day Selection */}
            {requestType === 'leave' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <Pressable 
                  onPress={() => {
                    setIsHalfDay(!isHalfDay);
                  }} 
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderWidth: 2,
                    borderColor: Colors.light.primary,
                    borderRadius: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                    backgroundColor: isHalfDay ? Colors.light.primary : 'transparent'
                  }}>
                    {isHalfDay && <View style={{ width: 10, height: 10, backgroundColor: 'white', borderRadius: 2 }} />}
                  </View>
                  <Text style={{ fontSize: 15, color: Colors.light.text, fontWeight: '500' }}>Apply for Half Day</Text>
                </Pressable>

                {isHalfDay && (
                  <View style={{ flex: 1, flexDirection: 'row', gap: 8, minWidth: 200 }}>
                    <Pressable 
                      onPress={() => setHalfDaySession('first_half')}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: halfDaySession === 'first_half' ? Colors.light.primary : Colors.light.border,
                        borderRadius: 8,
                        backgroundColor: halfDaySession === 'first_half' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ fontSize: 13, color: halfDaySession === 'first_half' ? Colors.light.primary : Colors.light.text, fontWeight: '600' }}>First Half</Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => setHalfDaySession('second_half')}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: halfDaySession === 'second_half' ? Colors.light.primary : Colors.light.border,
                        borderRadius: 8,
                        backgroundColor: halfDaySession === 'second_half' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ fontSize: 13, color: halfDaySession === 'second_half' ? Colors.light.primary : Colors.light.text, fontWeight: '600' }}>Second Half</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Reason for Request</Text>
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
              onPress={handlePreSubmit}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <CalendarDays size={16} color={Colors.light.icon} style={{ marginRight: 2 }} />
                    <Text style={styles.reqDates}>
                      {formatDateToDDMMYYYY(req.start_date)} {req.is_half_day ? `(Half Day - ${req.half_day_session === 'first_half' ? 'First Half' : 'Second Half'})` : (req.request_type && req.request_type !== 'leave' ? '' : `to ${formatDateToDDMMYYYY(req.end_date)}`)}
                    </Text>
                    <View style={{
                      backgroundColor: req.request_type === 'late_checkin' ? '#e0e7ff' : req.request_type === 'early_checkout' ? '#f5f3ff' : '#f1f5f9',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}>
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: req.request_type === 'late_checkin' ? '#4338ca' : req.request_type === 'early_checkout' ? '#6d28d9' : '#475569',
                        textTransform: 'uppercase'
                      }}>
                        {req.request_type === 'late_checkin' ? 'Late Check-in' : req.request_type === 'early_checkout' ? 'Early Checkout' : 'Leave'}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    req.status === 'approved' ? styles.statusApproved : 
                    req.status === 'rejected' ? styles.statusRejected : 
                    req.status === 'revoked' ? styles.statusRevoked :
                    styles.statusPending
                  ]}>
                    {req.status === 'approved' && <CheckCircle2 size={14} color="#059669" style={{ marginRight: 4 }} />}
                    {req.status === 'rejected' && <XCircle size={14} color="#DC2626" style={{ marginRight: 4 }} />}
                    {req.status === 'revoked' && <XCircle size={14} color="#475569" style={{ marginRight: 4 }} />}
                    {req.status === 'pending' && <Clock size={14} color="#D97706" style={{ marginRight: 4 }} />}
                    <Text style={[
                      styles.statusText,
                      req.status === 'approved' ? { color: '#059669' } : 
                      req.status === 'rejected' ? { color: '#DC2626' } : 
                      req.status === 'revoked' ? { color: '#475569' } :
                      { color: '#D97706' }
                    ]}>{req.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.reqReason}>
                  {typeof req.reason === 'object' ? (req.reason?.text || JSON.stringify(req.reason)) : req.reason}
                </Text>
                {req.status === 'rejected' && req.rejection_reason && (
                  <Text style={{ fontSize: 14, color: Colors.light.error, fontWeight: '600', marginTop: 8 }}>
                    Reason for Rejection: {req.rejection_reason}
                  </Text>
                )}
                {(req.status === 'pending' || req.status === 'approved') && (() => {
                  const d = new Date();
                  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  const reqStart = req.start_date ? req.start_date.split('T')[0] : '';
                  if (reqStart < todayStr) return null;
                  
                  return (
                    <Pressable 
                      style={{ 
                        marginTop: 12, 
                        paddingVertical: 8, 
                        paddingHorizontal: 16, 
                        borderRadius: 8, 
                        backgroundColor: '#EF4444', 
                        alignSelf: 'flex-start'
                      }}
                      onPress={() => handleRevokeRequest(req.id)}
                    >
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Revoke Request</Text>
                    </Pressable>
                  );
                })()}
              </View>
            ))
          )}
        </View>
      </View>
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
  statusRevoked: { backgroundColor: '#E2E8F0' },
  statusText: { fontSize: 12, fontWeight: '700' },
  projectionBox: { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  projectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.primary, marginBottom: 8 },
  projectionText: { fontSize: 14, color: Colors.light.text, marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '90%', maxWidth: 500, backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.light.text, marginBottom: 12 },
});
