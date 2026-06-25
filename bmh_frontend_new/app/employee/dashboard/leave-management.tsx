import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { CalendarDays, Send, Clock, CheckCircle2, XCircle, Info } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import { API_URL } from '../../../config';
import { useResponsive } from '../../../hooks/useResponsive';

export default function LeaveManagement() {
  const { isMobile, isDesktop } = useResponsive();
  const [employee, setEmployee] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployeeAndRequests();
  }, []);

  const fetchEmployeeAndRequests = async () => {
    try {
      const empData = Platform.OS === 'web' 
        ? localStorage.getItem('employeeUser')
        : null;

      if (!empData) return;
      const emp = JSON.parse(empData);
      setEmployee(emp);

      const res = await fetch(`${API_URL}/leave/requests?employee_id=${emp.id}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/leave/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isMobile && { padding: 16 }]}>
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <CalendarDays size={28} color={Colors.light.primary} />
        </View>
        <View>
          <Text style={styles.title}>Leave Management</Text>
          <Text style={styles.subtitle}>Apply for leaves and track your requests</Text>
        </View>
      </View>

      <View style={[styles.layout, !isMobile && { flexDirection: 'row', gap: 24 }]}>
        {/* Form Section */}
        <View style={[styles.section, !isMobile && { flex: 1 }]}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New Leave Application</Text>
            <View style={styles.alertBox}>
               <Info size={20} color={Colors.light.primary} style={{marginRight: 8}}/>
               <Text style={styles.alertText}>Your department limits concurrent leaves. Apply early to secure your dates.</Text>
            </View>

            <View style={[styles.formRow, isMobile && { flexDirection: 'column', gap: 16 }]}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Start Date</Text>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.light.icon}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>End Date</Text>
                <TextInput
                  style={styles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.light.icon}
                />
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
        <View style={[styles.section, !isMobile && { flex: 1.5 }]}>
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
                <Text style={styles.reqReason}>{req.reason}</Text>
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
});
