import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal, Platform } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { CalendarDays, Clock, UserCheck, Play, CheckCircle2, UserX, Plus, RefreshCw, X, ArrowLeft, Phone, ShieldAlert, Award, UserPlus, HeartHandshake, ShieldCheck, Flame, ShoppingBag } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function AppointmentsDashboard() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  
  // Date filter state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Data states from backend
  const [bookings, setBookings] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  
  // Stats details from collections API
  const [stats, setStats] = useState<any>({
    todayCollections: 0,
    appointmentsScheduledCount: 0,
    appointmentsScheduledAmount: 0,
    appointmentsBookedCount: 0,
    appointmentsBookedAmount: 0,
    manualOrdersGeneratedCount: 0,
    manualOrdersGeneratedAmount: 0,
    manualOrdersDeliveredCount: 0,
    manualOrdersDeliveredAmount: 0,
    salesInvoicesCount: 0,
    salesInvoicesAmount: 0,
    refundAmount: 0,
    pendingCredit: 0
  });

  const [lists, setLists] = useState<any>({
    todayCollectionsList: [],
    appointmentsList: [],
    appointmentsBookedList: [],
    manualOrdersGeneratedList: [],
    manualOrdersDeliveredList: [],
    salesInvoicesList: [],
    refundList: [],
    pendingCreditList: []
  });
  
  // Modals and form states
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [slotDropdownOpen, setSlotDropdownOpen] = useState(false);
  
  // New Booking form state
  const [formSlotId, setFormSlotId] = useState<string>('');
  const [patientName, setPatientName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [tokenNumber, setTokenNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch slot tokens dynamically
  const [tokensList, setTokensList] = useState<any[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Load initial data
  const loadDashboardData = async (dateStr: string) => {
    setLoading(true);
    try {
      const [bookingsRes, slotsRes, docRes, billingRes] = await Promise.all([
        axios.get(`https://napi.bharatmedicalhallplus.com/bookings?date=${dateStr}`),
        axios.get(`https://napi.bharatmedicalhallplus.com/doctors/slots`),
        axios.get(`https://napi.bharatmedicalhallplus.com/employees/all-users`),
        axios.get(`https://napi.bharatmedicalhallplus.com/bookings/billing-stats?date=${dateStr}`)
      ]);

      if (bookingsRes.data.success) {
        setBookings(bookingsRes.data.data || []);
      }
      
      const dateSlots = (slotsRes.data.data || []).filter((s: any) => {
        const sDate = new Date(s.date).toISOString().split('T')[0];
        return sDate === dateStr;
      });
      setSlots(dateSlots);
      
      if (docRes.data.success) {
        const list = docRes.data.data.filter((u: any) => u.role === 'Doctor' || u.id.startsWith('DOC'));
        setDoctors(list);
      }

      if (billingRes.data.success) {
        setStats(billingRes.data.stats);
        setLists(billingRes.data.lists);
      }
    } catch (error) {
      console.error('Error loading appointments dashboard:', error);
      Alert.alert('Error', 'Failed to fetch appointments data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(selectedDate);
  }, []);

  // Fetch slot tokens handler
  const handleSlotSelect = async (slotId: string) => {
    setFormSlotId(slotId);
    setTokenNumber('');
    if (!slotId) return;

    setLoadingTokens(true);
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings/slot-tokens/${slotId}?date=${selectedDate}`);
      if (res.data.success) {
        setTokensList(res.data.tokens || []);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load tokens for slot.');
    } finally {
      setLoadingTokens(false);
    }
  };

  // Update Status action
  const handleUpdateStatus = async (bookingId: number, status: string) => {
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/${bookingId}/status`, { status });
      if (res.data.success) {
        Alert.alert('Success', `Status updated to ${status}`);
        loadDashboardData(selectedDate);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update status.');
    }
  };

  // Submit Booking Form
  const handleCreateBooking = async () => {
    if (!formSlotId || !patientName || !mobile || !tokenNumber) {
      Alert.alert('Validation Error', 'Please select a shift, patient name, mobile, and token.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/bookings/create-admin-walkin', {
        slot_id: formSlotId,
        patient_name: patientName,
        mobile,
        email: email || undefined,
        age: age ? parseInt(age) : undefined,
        gender,
        reason_for_visit: reasonForVisit || undefined,
        payment_mode: paymentMode,
        token_number: parseInt(tokenNumber),
        booking_date: selectedDate
      });
      if (res.data.success) {
        Alert.alert('Success', 'Walk-in booking created successfully!');
        setBookModalVisible(false);
        // Clear fields
        setPatientName('');
        setMobile('');
        setEmail('');
        setAge('');
        setReasonForVisit('');
        setTokenNumber('');
        loadDashboardData(selectedDate);
      } else {
        Alert.alert('Error', res.data.message || 'Failed to create booking.');
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to submit booking.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculations for live queue
  const queueStats = {
    total: bookings.length,
    waiting: bookings.filter(b => b.status === 'Waiting').length,
    current: bookings.filter(b => b.status === 'Current').length,
    completed: bookings.filter(b => b.status === 'Completed').length,
    noShow: bookings.filter(b => b.status === 'Booked').length // Booked but not checked-in acts as no-show remaining
  };

  // Calculate Doctor performance dynamically
  const getDoctorPerformance = () => {
    const perf: Record<string, { count: number, revenue: number, rating: number }> = {};
    bookings.forEach(b => {
      const dName = b.doctor_name || 'Dr. General';
      const amt = parseFloat(b.amount || b.fee || 500);
      if (!perf[dName]) {
        perf[dName] = { count: 0, revenue: 0, rating: 4.8 };
      }
      perf[dName].count += 1;
      if (b.status === 'Completed') {
        perf[dName].revenue += amt;
      }
    });
    return Object.entries(perf).map(([name, val]) => ({ name, ...val }));
  };

  // Calculate Department performance dynamically
  const getDepartmentPerformance = () => {
    const perf: Record<string, { count: number, revenue: number }> = {};
    bookings.forEach(b => {
      const dept = b.department || 'OPD';
      const amt = parseFloat(b.amount || b.fee || 500);
      if (!perf[dept]) {
        perf[dept] = { count: 0, revenue: 0 };
      }
      perf[dept].count += 1;
      if (b.status === 'Completed') {
        perf[dept].revenue += amt;
      }
    });
    return Object.entries(perf).map(([name, val]) => ({ name, ...val }));
  };

  const totalFootfall = (stats.appointmentsBookedCount || 0) + (stats.salesInvoicesCount || 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* Header Row */}
      <View style={[styles.header, isDesktop && { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={styles.backButtonRound} onPress={() => router.replace('/admin/dashboard')}>
            <ArrowLeft size={18} color={Colors.light.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Clinic & OPD Command Center</Text>
            {isDesktop && (
              <Text style={styles.subtitle}>Live operations monitoring, doctor performance trackers, and queue control boards.</Text>
            )}
          </View>
        </View>

        {/* Date Filter Input */}
        <View style={styles.dateFilterContainer}>
          <Text style={styles.dateLabel}>Select Date:</Text>
          <TextInput 
            style={styles.dateInput}
            value={selectedDate}
            placeholder="YYYY-MM-DD"
            onChangeText={(text) => {
              setSelectedDate(text);
              if (text.match(/^\d{4}-\d{2}-\d{2}$/)) {
                loadDashboardData(text);
              }
            }}
          />
          <TouchableOpacity style={styles.goBtn} onPress={() => loadDashboardData(selectedDate)}>
            <Text style={styles.goBtnText}>Go</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => loadDashboardData(selectedDate)}>
            <RefreshCw size={16} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Reference top KPI Dashboard Cards row */}
          <View style={styles.gridContainer}>
            {/* Card 1: Total Footfall (Today) */}
            <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6' }]}>
              <View style={[styles.kpiIconContainer, { backgroundColor: '#eff6ff' }]}>
                <CalendarDays size={20} color="#3b82f6" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>{totalFootfall}</Text>
                <Text style={styles.kpiLabel}>Total Footfall (Today)</Text>
                <Text style={styles.kpiTrend}>↑ 12.4% vs Yesterday</Text>
              </View>
            </View>

            {/* Card 2: OPD Appointments */}
            <View style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}>
              <View style={[styles.kpiIconContainer, { backgroundColor: '#ecfdf5' }]}>
                <Receipt size={20} color="#10b981" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>{(stats.appointmentsScheduledCount || 0)}</Text>
                <Text style={styles.kpiLabel}>OPD Appointments</Text>
                <Text style={styles.kpiTrend}>↑ 14.5% vs Yesterday</Text>
              </View>
            </View>

            {/* Card 3: Consultations Done */}
            <View style={[styles.kpiCard, { borderLeftColor: '#059669' }]}>
              <View style={[styles.kpiIconContainer, { backgroundColor: '#d1fae5' }]}>
                <UserCheck size={20} color="#059669" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>{queueStats.completed + queueStats.current}</Text>
                <Text style={styles.kpiLabel}>Consultations Done</Text>
                <Text style={styles.kpiTrend}>↑ 10.3% vs Yesterday</Text>
              </View>
            </View>

            {/* Card 4: Total Collection (Today) */}
            <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b' }]}>
              <View style={[styles.kpiIconContainer, { backgroundColor: '#fffbeb' }]}>
                <DollarSign size={20} color="#f59e0b" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>₹{parseFloat(stats.todayCollections).toLocaleString('en-IN')}</Text>
                <Text style={styles.kpiLabel}>Total Collection (Today)</Text>
                <Text style={styles.kpiTrend}>↑ 18.5% vs Yesterday</Text>
              </View>
            </View>

            {/* Card 5: Lab Revenue */}
            <View style={[styles.kpiCard, { borderLeftColor: '#06b6d4' }]}>
              <View style={[styles.kpiIconContainer, { backgroundColor: '#ecfeff' }]}>
                <HeartHandshake size={20} color="#06b6d4" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>₹{parseFloat(stats.manualOrdersDeliveredAmount || 0).toLocaleString('en-IN')}</Text>
                <Text style={styles.kpiLabel}>Lab Revenue (Today)</Text>
                <Text style={styles.kpiTrend}>↑ 16.2% vs Yesterday</Text>
              </View>
            </View>

            {/* Card 6: Pharmacy Sales */}
            <View style={[styles.kpiCard, { borderLeftColor: '#8b5cf6' }]}>
              <View style={[styles.kpiIconContainer, { backgroundColor: '#f5f3ff' }]}>
                <ShoppingBag size={20} color="#8b5cf6" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>₹{parseFloat(stats.salesInvoicesAmount || 0).toLocaleString('en-IN')}</Text>
                <Text style={styles.kpiLabel}>Pharmacy Sales (Today)</Text>
                <Text style={styles.kpiTrend}>↑ 13.1% vs Yesterday</Text>
              </View>
            </View>

            {/* Card 7: Outstanding Dues */}
            <View style={[styles.kpiCard, { borderLeftColor: '#ef4444' }]}>
              <View style={[styles.kpiIconContainer, { backgroundColor: '#fee2e2' }]}>
                <RotateCcw size={20} color="#ef4444" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>₹{parseFloat(stats.pendingCredit).toLocaleString('en-IN')}</Text>
                <Text style={styles.kpiLabel}>Outstanding Dues</Text>
                <Text style={styles.kpiTrend} style={{ color: '#ef4444', fontSize: 10, marginTop: 4 }}>↓ 6.3% vs Yesterday</Text>
              </View>
            </View>
          </View>

          {/* Core Operations Dashboard row */}
          <View style={[styles.portalLayout, !isDesktop && styles.portalLayoutMobile]}>
            
            {/* COLUMN 1: Operations Overview & Live Snapshot */}
            <View style={[styles.portalColumn, { flex: 1.2 }]}>
              {/* Operations Overview grid */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Operations Overview (Live)</Text>
                <View style={styles.overviewGrid}>
                  {[
                    { title: 'Reception', status: '6 / 6 Online', statusColor: '#10b981' },
                    { title: 'Doctors', status: `${doctors.length} Online`, statusColor: '#10b981' },
                    { title: 'Lab', status: 'Busy', statusColor: '#f59e0b' },
                    { title: 'Pharmacy', status: 'Online', statusColor: '#10b981' },
                    { title: 'Cashier', status: 'Online', statusColor: '#10b981' },
                    { title: 'Radiology', status: 'Busy', statusColor: '#f59e0b' },
                    { title: 'Home Delivery', status: 'Online', statusColor: '#10b981' },
                    { title: 'Accounts', status: 'Online', statusColor: '#10b981' }
                  ].map((op, idx) => (
                    <View key={idx} style={styles.overviewMiniCard}>
                      <Text style={styles.overviewMiniTitle}>{op.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View style={[styles.statusDot, { backgroundColor: op.statusColor }]} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>{op.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Live Queue Snapshot */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Live Queue Snapshot</Text>
                <View style={styles.snapshotRow}>
                  {[
                    { label: 'Total Queue', val: queueStats.total, color: '#475569' },
                    { label: 'Waiting', val: queueStats.waiting, color: '#f59e0b' },
                    { label: 'Consulting', val: queueStats.current, color: '#3b82f6' },
                    { label: 'Completed', val: queueStats.completed, color: '#10b981' },
                    { label: 'No Show', val: queueStats.noShow, color: '#ef4444' }
                  ].map((s, idx) => (
                    <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={[styles.snapshotVal, { color: s.color }]}>{s.val}</Text>
                      <Text style={styles.snapshotLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* COLUMN 2: Critical Alerts & Target Tracking */}
            <View style={[styles.portalColumn, { flex: 1.8 }]}>
              {/* Critical Alerts panel */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Critical Alerts Today</Text>
                
                <View style={styles.alertItem}>
                  <ShieldAlert size={18} color="#ef4444" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.alertText}>Dr. Lipi Mohanty is running 15 mins delay</Text>
                    <Text style={styles.alertTime}>10:20 AM</Text>
                  </View>
                </View>

                <View style={styles.alertItem}>
                  <ShieldAlert size={18} color="#f59e0b" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.alertText}>Lab - 4 diagnostic reports pending verification &gt; 24 hrs</Text>
                    <Text style={styles.alertTime}>09:45 AM</Text>
                  </View>
                </View>

                <View style={styles.alertItem}>
                  <ShieldAlert size={18} color="#ef4444" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.alertText}>Pharmacy stock out reported: Telma 40mg</Text>
                    <Text style={styles.alertTime}>09:15 AM</Text>
                  </View>
                </View>
              </View>

              {/* Target tracking */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Today's Targets vs Achievement</Text>
                <View style={{ gap: 12 }}>
                  {[
                    { label: 'OPD Consultations', current: queueStats.completed, target: 20, color: '#3b82f6' },
                    { label: 'Lab Reports Generated', current: stats.manualOrdersDeliveredCount || 0, target: 15, color: '#06b6d4' },
                    { label: 'Pharmacy Bills Issued', current: stats.salesInvoicesCount || 0, target: 50, color: '#8b5cf6' }
                  ].map((t, idx) => {
                    const percent = Math.min(Math.round((t.current / t.target) * 100), 100);
                    return (
                      <View key={idx}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>{t.label}</Text>
                          <Text style={{ fontSize: 12, color: '#64748b' }}>{t.current} / {t.target} ({percent}%)</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: t.color }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* Performance row */}
          <View style={[styles.portalLayout, !isDesktop && styles.portalLayoutMobile]}>
            {/* COLUMN 1: Doctor performance */}
            <View style={[styles.portalColumn, { flex: 1.5 }]}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Doctor Performance (Today)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ minWidth: 400 }}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { flex: 2 }]}>Doctor</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Consults</Text>
                      <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>Revenue</Text>
                    </View>
                    {getDoctorPerformance().map((d, idx) => (
                      <View key={idx} style={styles.tableRow}>
                        <Text style={{ flex: 2, fontWeight: 'bold', fontSize: 13, color: '#334155' }}>{d.name}</Text>
                        <Text style={{ flex: 1, textAlign: 'center', fontSize: 13, color: '#334155' }}>{d.count}</Text>
                        <Text style={{ flex: 1.2, textAlign: 'right', fontWeight: 'bold', fontSize: 13, color: Colors.light.primary }}>₹{d.revenue.toLocaleString('en-IN')}</Text>
                      </View>
                    ))}
                    {getDoctorPerformance().length === 0 && (
                      <Text style={styles.emptyText}>No consultations today.</Text>
                    )}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* COLUMN 2: Department performance */}
            <View style={[styles.portalColumn, { flex: 1.5 }]}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Department Performance (Today)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ minWidth: 400 }}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { flex: 2 }]}>Department</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Volume</Text>
                      <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>Revenue</Text>
                    </View>
                    {getDepartmentPerformance().map((dept, idx) => (
                      <View key={idx} style={styles.tableRow}>
                        <Text style={{ flex: 2, fontWeight: 'bold', fontSize: 13, color: '#334155' }}>{dept.name}</Text>
                        <Text style={{ flex: 1, textAlign: 'center', fontSize: 13, color: '#334155' }}>{dept.count}</Text>
                        <Text style={{ flex: 1.2, textAlign: 'right', fontWeight: 'bold', fontSize: 13, color: '#10b981' }}>₹{dept.revenue.toLocaleString('en-IN')}</Text>
                      </View>
                    ))}
                    {getDepartmentPerformance().length === 0 && (
                      <Text style={styles.emptyText}>No department logs today.</Text>
                    )}
                  </View>
                </ScrollView>
              </View>
            </View>
          </View>

          {/* Interactive Live Queue Board */}
          <View style={{ marginTop: 24 }}>
            <View style={styles.card}>
              <View style={[styles.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }]}>
                <View>
                  <Text style={styles.cardTitle}>Interactive Live Queue Management</Text>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>Change status of booked slot admissions and check-in walk-in consultations.</Text>
                </View>

                {/* Quick Add Walkin trigger */}
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setBookModalVisible(true)}>
                  <Plus size={16} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>Book Walk-In Patient</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={{ minWidth: 850, marginTop: 10 }}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 1 }]}>Token</Text>
                    <Text style={[styles.th, { flex: 2 }]}>Patient Details</Text>
                    <Text style={[styles.th, { flex: 2 }]}>Doctor / Shift</Text>
                    <Text style={[styles.th, { flex: 1.2 }]}>Mode</Text>
                    <Text style={[styles.th, { flex: 1.2 }]}>Status</Text>
                    <Text style={[styles.th, { flex: 2 }]}>Quick Actions</Text>
                  </View>

                  {bookings.map((b) => (
                    <View key={b.booking_id} style={styles.tableRow}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.tokenBadgeBox}>
                          <Text style={styles.tokenBadgeText}>#{b.token_number}</Text>
                        </View>
                      </View>

                      <View style={{ flex: 2 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#334155' }}>{b.patient_name}</Text>
                        <Text style={{ fontSize: 10, color: '#64748b' }}>{b.mobile} • {b.age}Y • {b.gender}</Text>
                      </View>

                      <View style={{ flex: 2 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#1e293b' }}>Dr. {b.doctor_name}</Text>
                        <Text style={{ fontSize: 10, color: '#64748b' }}>{b.department} • Slot: {b.start_time} - {b.end_time}</Text>
                      </View>

                      <Text style={{ flex: 1.2, fontSize: 12, fontWeight: '700', color: '#475569' }}>{b.payment_mode || 'Cash'}</Text>

                      <View style={{ flex: 1.2 }}>
                        <View style={[
                          styles.statusTag,
                          b.status === 'Completed' && styles.statusTagCompleted,
                          b.status === 'Current' && styles.statusTagCurrent,
                          b.status === 'Waiting' && styles.statusTagWaiting,
                          b.status === 'Booked' && styles.statusTagBooked
                        ]}>
                          <Text style={[
                            styles.statusTagText,
                            b.status === 'Completed' && { color: '#065f46' },
                            b.status === 'Current' && { color: '#5b21b6' },
                            b.status === 'Waiting' && { color: '#92400e' },
                            b.status === 'Booked' && { color: '#475569' }
                          ]}>
                            {b.status === 'Booked' ? 'Scheduled' : b.status}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flex: 2, flexDirection: 'row', gap: 6 }}>
                        {b.status === 'Booked' && (
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fef3c7' }]} onPress={() => handleUpdateStatus(b.booking_id, 'Waiting')}>
                            <Clock size={12} color="#b45309" />
                            <Text style={[styles.actionBtnText, { color: '#b45309' }]}>Check-In</Text>
                          </TouchableOpacity>
                        )}
                        {b.status === 'Waiting' && (
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e0f2fe' }]} onPress={() => handleUpdateStatus(b.booking_id, 'Current')}>
                            <Play size={12} color="#0369a1" />
                            <Text style={[styles.actionBtnText, { color: '#0369a1' }]}>Call In</Text>
                          </TouchableOpacity>
                        )}
                        {b.status === 'Current' && (
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#d1fae5' }]} onPress={() => handleUpdateStatus(b.booking_id, 'Completed')}>
                            <CheckCircle2 size={12} color="#047857" />
                            <Text style={[styles.actionBtnText, { color: '#047857' }]}>Complete</Text>
                          </TouchableOpacity>
                        )}
                        {b.status !== 'Completed' && b.status !== 'Cancelled' && (
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]} onPress={() => handleUpdateStatus(b.booking_id, 'Cancelled')}>
                            <UserX size={12} color="#b91c1c" />
                            <Text style={[styles.actionBtnText, { color: '#b91c1c' }]}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}

                  {bookings.length === 0 && (
                    <Text style={styles.emptyText}>No appointments listed for this date filter.</Text>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </>
      )}

      {/* Book Walk-In Patient Modal */}
      <Modal visible={bookModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%', maxWidth: 500, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Walk-In Consultation</Text>
              <TouchableOpacity onPress={() => setBookModalVisible(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              {/* Slot selector */}
              <Text style={styles.label}>Select Doctor Shift Slot *</Text>
              <View style={styles.dropdownBox}>
                <select 
                  style={styles.htmlSelect}
                  value={formSlotId}
                  onChange={(e) => handleSlotSelect(e.target.value)}
                >
                  <option value="">-- Choose Active Shift Slot --</option>
                  {slots.map(s => (
                    <option key={s.id} value={s.id}>{`Dr. ${s.doctor_name} (${s.department}) - ${s.start_time} to ${s.end_time}`}</option>
                  ))}
                </select>
              </View>

              {/* Patient Name */}
              <Text style={[styles.label, { marginTop: 12 }]}>Patient Name *</Text>
              <TextInput style={styles.input} placeholder="Enter full name" value={patientName} onChangeText={setPatientName} />

              {/* Mobile */}
              <Text style={[styles.label, { marginTop: 12 }]}>Mobile No *</Text>
              <TextInput style={styles.input} keyboardType="phone-pad" maxLength={10} placeholder="10-digit phone number" value={mobile} onChangeText={setMobile} />

              {/* Email */}
              <Text style={[styles.label, { marginTop: 12 }]}>Email ID (Optional)</Text>
              <TextInput style={styles.input} keyboardType="email-address" placeholder="email@address.com" value={email} onChangeText={setEmail} />

              {/* Age & Gender */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Age (Years)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="Age" value={age} onChangeText={setAge} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.dropdownBox}>
                    <select style={styles.htmlSelect} value={gender} onChange={(e) => setGender(e.target.value)}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </View>
                </View>
              </View>

              {/* Token assigner */}
              <Text style={[styles.label, { marginTop: 12 }]}>Assign Token Number *</Text>
              {loadingTokens ? (
                <ActivityIndicator size="small" color={Colors.light.primary} />
              ) : (
                <View style={styles.dropdownBox}>
                  <select 
                    style={styles.htmlSelect} 
                    value={tokenNumber} 
                    onChange={(e) => setTokenNumber(e.target.value)}
                  >
                    <option value="">-- Choose Available Token --</option>
                    {tokensList.map((t: any) => (
                      <option key={t.token} value={t.token} disabled={!t.available}>
                        {`Token #${t.token} ${t.available ? '(Available)' : '(Booked)'}`}
                      </option>
                    ))}
                  </select>
                </View>
              )}

              {/* Reason for Visit */}
              <Text style={[styles.label, { marginTop: 12 }]}>Reason for Visit</Text>
              <TextInput style={styles.input} placeholder="Symptoms or description" value={reasonForVisit} onChangeText={setReasonForVisit} />

              {/* Payment Mode */}
              <Text style={[styles.label, { marginTop: 12 }]}>Payment Mode</Text>
              <View style={styles.dropdownBox}>
                <select style={styles.htmlSelect} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                </select>
              </View>

              <TouchableOpacity 
                style={[styles.confirmBtn, submitting && { opacity: 0.8 }, { marginTop: 24, marginBottom: 20 }]} 
                onPress={handleCreateBooking}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm Admission</Text>
                )}
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { marginBottom: 16 },
  backButtonRound: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', borderWidth: 1, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },

  dateFilterContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  dateLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
  dateInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'white', color: '#334155', width: 130, fontSize: 13 },
  goBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  goBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  refreshBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  
  kpiCard: { minWidth: 220, flex: 1, backgroundColor: 'white', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 5, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  kpiIconContainer: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  kpiValue: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  kpiLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 4, textTransform: 'uppercase' },
  kpiTrend: { fontSize: 10, fontWeight: '700', color: '#16a34a', marginTop: 4 },

  portalLayout: { flexDirection: 'row', gap: 16, marginTop: 16 },
  portalLayoutMobile: { flexDirection: 'column' },
  portalColumn: { gap: 16 },

  card: { backgroundColor: 'white', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardHeader: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10, marginBottom: 10 },

  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  overviewMiniCard: { width: '48%', backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  overviewMiniTitle: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  snapshotRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1' },
  snapshotVal: { fontSize: 20, fontWeight: '800' },
  snapshotLabel: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '600', textTransform: 'uppercase' },

  alertItem: { flexDirection: 'row', padding: 10, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', marginBottom: 8, alignItems: 'center' },
  alertText: { fontSize: 12, color: '#991b1b', fontWeight: '600' },
  alertTime: { fontSize: 10, color: '#b91c1c', marginTop: 2 },

  progressBarBg: { height: 6, borderRadius: 3, backgroundColor: '#e2e8f0', width: '100%', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center' },
  th: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  tokenBadgeBox: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  tokenBadgeText: { fontSize: 11, fontWeight: '800', color: '#0369a1' },
  emptyText: { padding: 20, fontStyle: 'italic', color: '#94a3b8', textAlign: 'center' },

  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, alignSelf: 'flex-start', backgroundColor: '#f3f4f6' },
  statusTagCompleted: { backgroundColor: '#d1fae5' },
  statusTagCurrent: { backgroundColor: '#ede9fe' },
  statusTagWaiting: { backgroundColor: '#fef3c7' },
  statusTagBooked: { backgroundColor: '#e2e8f0' },
  statusTagText: { fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },

  primaryBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  primaryBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  actionBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 11, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },

  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 13, backgroundColor: 'white', color: '#334155' },
  dropdownBox: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, overflow: 'hidden', backgroundColor: 'white' },
  htmlSelect: { width: '100%', padding: 10, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 13, color: '#334155', cursor: 'pointer' } as any,
  confirmBtn: { backgroundColor: Colors.light.primary, padding: 14, borderRadius: 8, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
