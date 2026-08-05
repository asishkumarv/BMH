import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Platform, Modal } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { CalendarDays, Clock, UserCheck, Play, CheckCircle2, UserX, Plus, RefreshCw, X, ArrowLeft, Phone, ShieldAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function AppointmentsDashboard() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  
  // Date filter state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Data states
  const [bookings, setBookings] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  
  // Active slot filter (null means all slots)
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  
  // Modals and form states
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [slotDropdownOpen, setSlotDropdownOpen] = useState(false);
  const [tokenDropdownOpen, setTokenDropdownOpen] = useState(false);
  
  // Stats details modal state
  const [viewingStatsType, setViewingStatsType] = useState<'new' | 'returning' | 'cancelled' | 'noshow' | 'checkedin' | 'waiting' | 'consultation' | 'completed' | null>(null);

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

  // Load initial data
  const loadDashboardData = async (dateStr: string) => {
    setLoading(true);
    try {
      const [bookingsRes, slotsRes, docRes] = await Promise.all([
        axios.get(`https://napi.bharatmedicalhallplus.com/bookings?date=${dateStr}`),
        axios.get(`https://napi.bharatmedicalhallplus.com/doctors/slots`),
        axios.get(`https://napi.bharatmedicalhallplus.com/employees/all-users`)
      ]);

      if (bookingsRes.data.success) {
        setBookings(bookingsRes.data.data || []);
      }
      
      // Filter slots for that date
      const dateSlots = (slotsRes.data.data || []).filter((s: any) => {
        const sDate = new Date(s.date).toISOString().split('T')[0];
        return sDate === dateStr;
      });
      setSlots(dateSlots);
      
      // Get all doctors list
      if (docRes.data.success) {
        const list = docRes.data.data.filter((u: any) => u.role === 'Doctor' || u.id.startsWith('DOC'));
        setDoctors(list);
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
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/bookings/create', {
        slot_id: parseInt(formSlotId),
        patient_name: patientName,
        mobile,
        email,
        age: parseInt(age || '0'),
        gender,
        reason_for_visit: reasonForVisit,
        payment_mode: paymentMode,
        token_number: parseInt(tokenNumber),
        booked_by: 1 // Default Admin
      });
      if (res.data.success) {
        Alert.alert('Success', 'Booking created successfully!');
        setBookModalVisible(false);
        // Reset form
        setPatientName('');
        setMobile('');
        setEmail('');
        setAge('');
        setGender('Male');
        setReasonForVisit('');
        setTokenNumber('');
        setFormSlotId('');
        loadDashboardData(selectedDate);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Booking Error', err.response?.data?.message || 'Failed to book appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Stats Calculations
  const activeBookings = bookings.filter(b => b.status !== 'Cancelled');
  
  // New Patient count: booked exactly once in entire DB (patient_total_bookings <= 1) and status is not cancelled
  const newPatientsList = activeBookings.filter(b => (b.patient_total_bookings || 0) <= 1);
  const newPatientsCount = newPatientsList.length;

  // Returning Patient count: booked more than once (patient_total_bookings > 1) and status is not cancelled
  const returningPatientsList = activeBookings.filter(b => (b.patient_total_bookings || 0) > 1);
  const returningPatientsCount = returningPatientsList.length;

  // Cancelled count
  const cancelledList = bookings.filter(b => b.status === 'Cancelled');
  const cancelledCount = cancelledList.length;

  // No Show count (remaining active bookings that did not check in)
  const noShowList = bookings.filter(b => b.status === 'Booked' || b.status === 'No Show');
  const noShowCount = noShowList.length;

  // Checked-in count (waiting + current + completed)
  const checkedInList = activeBookings.filter(b => b.status === 'Waiting' || b.status === 'Current' || b.status === 'Completed');
  const checkedInCount = checkedInList.length;

  // Waiting count
  const waitingList = activeBookings.filter(b => b.status === 'Waiting');
  const waitingCount = waitingList.length;

  // In Consultation count
  const consultationList = activeBookings.filter(b => b.status === 'Current');
  const consultationCount = consultationList.length;

  // Completed count
  const completedList = activeBookings.filter(b => b.status === 'Completed');
  const completedCount = completedList.length;

  // Next Token to call logic
  const nextWaitingPatient = (() => {
    let list = bookings.filter(b => b.status === 'Waiting');
    if (selectedSlotId) {
      list = list.filter(b => b.slot_id === selectedSlotId);
    }
    list.sort((a, b) => a.token_number - b.token_number);
    return list.length > 0 ? list[0] : null;
  })();

  // Filter listings based on active slot selection
  const filteredBookings = selectedSlotId 
    ? bookings.filter(b => b.slot_id === selectedSlotId)
    : bookings;

  const selectedSlotInfo = slots.find(s => s.id === selectedSlotId);

  // Available tokens generation
  const availableTokens = (() => {
    if (!formSlotId) return [];
    const slot = slots.find(s => s.id.toString() === formSlotId);
    if (!slot) return [];
    const maxTokens = slot.total_tokens || 30;
    const booked = new Set(
      bookings
        .filter(b => b.slot_id.toString() === formSlotId && b.status !== 'Cancelled')
        .map(b => b.token_number)
    );
    const tokens = [];
    for (let i = 1; i <= maxTokens; i++) {
      if (!booked.has(i)) {
        tokens.push(i);
      }
    }
    return tokens;
  })();

  // Dynamic alerts for Doctor Arrived, Delayed, and Not Coming notifications
  const dynamicAlerts = (() => {
    const alertsList: any[] = [];
    const now = new Date();
    const isToday = selectedDate === now.toISOString().split('T')[0];

    slots.forEach(s => {
      const slotBookings = bookings.filter(b => b.slot_id === s.id && b.status !== 'Cancelled');
      const hasArrived = slotBookings.some(b => b.status === 'Current' || b.status === 'Completed');

      // 1. Arrived notification
      if (hasArrived) {
        alertsList.push({
          type: 'arrived',
          text: `Dr. ${s.doctor_name} has arrived and is currently conducting consultations.`,
          color: '#10b981'
        });
      }

      // 2. Delayed notification
      if (isToday && !hasArrived && slotBookings.length > 0) {
        const [shrs, smins] = s.start_time.split(':').map(Number);
        const shiftStart = new Date();
        shiftStart.setHours(shrs, smins, 0, 0);
        const diffMins = Math.floor((now.getTime() - shiftStart.getTime()) / (60 * 1000));
        
        if (diffMins > 15) {
          alertsList.push({
            type: 'delayed',
            text: `Dr. ${s.doctor_name} is delayed for the shift starting at ${s.start_time.substring(0, 5)} (delayed by ${diffMins} mins).`,
            color: '#f59e0b'
          });
        }
      }

      // 3. Not Coming notification (e.g. slot total_tokens is 0)
      if (s.total_tokens === 0) {
        alertsList.push({
          type: 'not_coming',
          text: `Dr. ${s.doctor_name}'s shift starting at ${s.start_time.substring(0, 5)} has been cancelled.`,
          color: '#ef4444'
        });
      }
    });

    return alertsList;
  })();

  const getStatsModalList = () => {
    switch (viewingStatsType) {
      case 'new': return newPatientsList;
      case 'returning': return returningPatientsList;
      case 'cancelled': return cancelledList;
      case 'noshow': return noShowList;
      case 'checkedin': return checkedInList;
      case 'waiting': return waitingList;
      case 'consultation': return consultationList;
      case 'completed': return completedList;
      default: return [];
    }
  };

  const getStatsModalTitle = () => {
    switch (viewingStatsType) {
      case 'new': return 'New Patients';
      case 'returning': return 'Returning Patients';
      case 'cancelled': return 'Cancelled Appointments';
      case 'noshow': return 'No Show Patients';
      case 'checkedin': return 'Checked-in Patients';
      case 'waiting': return 'Waiting Patients';
      case 'consultation': return 'In Consultation';
      case 'completed': return 'Completed Consultations';
      default: return '';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Title Header */}
      <View style={[styles.header, isDesktop && { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={styles.backButtonRound} onPress={() => router.replace('/employee/dashboard')}>
            <ArrowLeft size={18} color={Colors.light.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Appointment & Queue Manager</Text>
            {isDesktop && (
              <Text style={styles.subtitle}>Track live patient queues, doctor slots, and daily metrics</Text>
            )}
          </View>
        </View>

        {/* Date Filter Input inline */}
        <View style={[styles.dateFilterContainer, { marginTop: 0 }]}>
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
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Section: Queue Metrics */}
          <Text style={styles.rowTitle}>Patient Demographics & Status (Total: {bookings.length})</Text>

          {/* Row 1 Stats Grid */}
          <View style={[styles.statsRow, !isDesktop && styles.statsRowMobile]}>
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#3b82f6' }]}
              onPress={() => setViewingStatsType('new')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#eff6ff' }]}>
                <CalendarDays size={20} color="#3b82f6" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.kpiValue}>{newPatientsCount}</Text>
                <Text style={styles.kpiLabel}>New Patients</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}
              onPress={() => setViewingStatsType('returning')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#ecfdf5' }]}>
                <UserCheck size={20} color="#10b981" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.kpiValue}>{returningPatientsCount}</Text>
                <Text style={styles.kpiLabel}>Returning Patients</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#ef4444' }]}
              onPress={() => setViewingStatsType('cancelled')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#fee2e2' }]}>
                <UserX size={20} color="#ef4444" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.kpiValue}>{cancelledCount}</Text>
                <Text style={styles.kpiLabel}>Cancelled</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#f59e0b' }]}
              onPress={() => setViewingStatsType('noshow')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#fffbeb' }]}>
                <Clock size={20} color="#f59e0b" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.kpiValue}>{noShowCount}</Text>
                <Text style={styles.kpiLabel}>No Show</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Row 2 Stats Grid (Checked-in / Consultation Metrics) */}
          <View style={[styles.statsRow, { marginTop: 12 }, !isDesktop && styles.statsRowMobile]}>
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#059669' }]}
              onPress={() => setViewingStatsType('checkedin')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#e6fffa' }]}>
                <UserCheck size={20} color="#059669" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.kpiValue}>{checkedInCount}</Text>
                <Text style={styles.kpiLabel}>Checked-in</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#d97706' }]}
              onPress={() => setViewingStatsType('waiting')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#fffaf0' }]}>
                <Clock size={20} color="#d97706" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.kpiValue}>{waitingCount}</Text>
                <Text style={styles.kpiLabel}>Waiting</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#7c3aed' }]}
              onPress={() => setViewingStatsType('consultation')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#f5f3ff' }]}>
                <Play size={20} color="#7c3aed" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.kpiValue}>{consultationCount}</Text>
                <Text style={styles.kpiLabel}>In Consultation</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#0891b2' }]}
              onPress={() => setViewingStatsType('completed')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#ecfeff' }]}>
                <CheckCircle2 size={20} color="#0891b2" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.kpiValue}>{completedCount}</Text>
                <Text style={styles.kpiLabel}>Completed</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Quick Action Navigation Buttons */}
          <View style={styles.actionsBar}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setBookModalVisible(true)}>
              <Plus size={16} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Book Appointment</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => router.push('/employee/dashboard/doctors' as any)}>
              <Text style={styles.actionBtnSecondaryText}>Doctor Availability</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => router.push('/employee/dashboard/patient-history' as any)}>
              <Text style={styles.actionBtnSecondaryText}>Patient History Directory</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.refreshBtn} onPress={() => loadDashboardData(selectedDate)}>
              <RefreshCw size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Main Content Layout Grid */}
          <View style={[styles.mainLayout, !isDesktop && styles.mainLayoutMobile]}>
            
            {/* LEFT / CENTER PANEL: Doctor Slots & Live Queue Listing */}
            <View style={[styles.leftContent, isDesktop && { flex: 7 }]}>
              
              {/* Doctor Slots (Availability grid) */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Doctor Shifts & Slots Today</Text>
                  {selectedSlotId && (
                    <TouchableOpacity style={styles.clearFilterBtn} onPress={() => setSelectedSlotId(null)}>
                      <Text style={styles.clearFilterText}>Show All Today</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 12, paddingBottom: 6 }}>
                    {slots.map((s) => {
                      const isActive = selectedSlotId === s.id;
                      const slotBookings = bookings.filter(b => b.slot_id === s.id && b.status !== 'Cancelled');
                      return (
                        <TouchableOpacity 
                          key={s.id}
                          style={[styles.slotCard, isActive && styles.slotCardActive]}
                          onPress={() => setSelectedSlotId(s.id)}
                        >
                          <Text style={[styles.slotDocName, isActive && { color: 'white' }]}>Dr. {s.doctor_name}</Text>
                          <Text style={[styles.slotDept, isActive && { color: 'rgba(255,255,255,0.8)' }]}>{s.department}</Text>
                          <Text style={[styles.slotTime, isActive && { color: 'white' }]}>⏱️ {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}</Text>
                          <View style={styles.slotPillRow}>
                            <View style={[styles.slotBadge, isActive && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                              <Text style={[styles.slotBadgeText, isActive && { color: 'white' }]}>
                                {slotBookings.length} Booked
                              </Text>
                            </View>
                            {s.assigned_peon_id && (
                              <View style={[styles.slotBadge, { backgroundColor: '#f1f5f9' }, isActive && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                <Text style={[styles.slotBadgeText, isActive && { color: 'white' }]}>
                                  Peon Assigned
                                </Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {slots.length === 0 && (
                      <Text style={styles.emptyText}>No doctor slots defined for today.</Text>
                    )}
                  </View>
                </ScrollView>
              </View>

              {/* Patient Live Queue Table */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {selectedSlotId ? `Live Queue List - Dr. ${selectedSlotInfo?.doctor_name} (${selectedSlotInfo?.department})` : "Live Queue & All Bookings Today"}
                </Text>
                
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                  <View style={{ minWidth: isDesktop ? '100%' : 800, marginTop: 12 }}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { flex: 1 }]}>Token</Text>
                      <Text style={[styles.th, { flex: 2.5 }]}>Patient Name / Details</Text>
                      <Text style={[styles.th, { flex: 2 }]}>Doctor / Dept</Text>
                      <Text style={[styles.th, { flex: 1.5 }]}>Reason</Text>
                      <Text style={[styles.th, { flex: 1.5 }]}>Status</Text>
                      <Text style={[styles.th, { flex: 2.5, textAlign: 'right' }]}>Actions</Text>
                    </View>

                    {filteredBookings.map((b) => (
                      <View key={b.booking_id} style={styles.tableRow}>
                        <View style={[styles.tokenBadgeBox, { flex: 1 }]}>
                          <Text style={styles.tokenBadgeText}>#{b.token_number}</Text>
                        </View>

                        <View style={{ flex: 2.5 }}>
                          <Text style={styles.patientName}>{b.patient_name}</Text>
                          <Text style={styles.patientMeta}>{b.age} Yrs • {b.gender} • {b.mobile}</Text>
                        </View>

                        <View style={{ flex: 2 }}>
                          <Text style={styles.docName}>Dr. {b.doctor_name}</Text>
                          <Text style={styles.docDept}>{b.department}</Text>
                        </View>

                        <Text style={[styles.tdText, { flex: 1.5 }]} numberOfLines={1}>
                          {b.reason_for_visit || 'Routine checkup'}
                        </Text>

                        <View style={{ flex: 1.5 }}>
                          <View style={[
                            styles.statusTag,
                            b.status === 'Completed' && styles.statusTagCompleted,
                            b.status === 'Current' && styles.statusTagCurrent,
                            b.status === 'Waiting' && styles.statusTagWaiting,
                            b.status === 'Cancelled' && styles.statusTagCancelled
                          ]}>
                            <Text style={[
                              styles.statusTagText,
                              b.status === 'Completed' && { color: '#065f46' },
                              b.status === 'Current' && { color: '#5b21b6' },
                              b.status === 'Waiting' && { color: '#92400e' },
                              b.status === 'Cancelled' && { color: '#991b1b' }
                            ]}>
                              {b.status === 'Booked' ? 'Scheduled' : b.status}
                            </Text>
                          </View>
                        </View>

                        <View style={[styles.actionsCol, { flex: 2.5 }]}>
                          {b.status === 'Booked' && (
                            <TouchableOpacity 
                              style={[styles.smallBtn, { backgroundColor: '#f59e0b' }]}
                              onPress={() => handleUpdateStatus(b.booking_id, 'Waiting')}
                            >
                              <Text style={styles.smallBtnText}>Check In</Text>
                            </TouchableOpacity>
                          )}
                          
                          {b.status === 'Waiting' && (
                            <TouchableOpacity 
                              style={[styles.smallBtn, { backgroundColor: '#8b5cf6' }]}
                              onPress={() => handleUpdateStatus(b.booking_id, 'Current')}
                            >
                              <Text style={styles.smallBtnText}>Call Doctor</Text>
                            </TouchableOpacity>
                          )}

                          {b.status === 'Current' && (
                            <TouchableOpacity 
                              style={[styles.smallBtn, { backgroundColor: '#10b981' }]}
                              onPress={() => handleUpdateStatus(b.booking_id, 'Completed')}
                            >
                              <Text style={styles.smallBtnText}>Complete</Text>
                            </TouchableOpacity>
                          )}

                          {b.status !== 'Cancelled' && b.status !== 'Completed' && (
                            <TouchableOpacity 
                              style={[styles.smallBtnSecondary]}
                              onPress={() => {
                                Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
                                  { text: 'No' },
                                  { 
                                    text: 'Yes, Cancel', 
                                    onPress: async () => {
                                      try {
                                        await axios.post(`https://napi.bharatmedicalhallplus.com/bookings/${b.booking_id}/cancel`);
                                        Alert.alert('Cancelled', 'Booking has been cancelled successfully');
                                        loadDashboardData(selectedDate);
                                      } catch (err) {
                                        Alert.alert('Error', 'Failed to cancel booking.');
                                      }
                                    }
                                  }
                                ]);
                              }}
                            >
                              <Text style={[styles.smallBtnSecondaryText, { color: '#ef4444' }]}>Cancel</Text>
                            </TouchableOpacity>
                          )}
                          
                          {(b.status === 'Cancelled' || b.status === 'Completed') && (
                            <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Closed</Text>
                          )}
                        </View>
                      </View>
                    ))}

                    {filteredBookings.length === 0 && (
                      <Text style={styles.emptyText}>No appointments booked for this query.</Text>
                    )}
                  </View>
                </ScrollView>
              </View>

            </View>

            {/* RIGHT PANEL: Live caller and alerts card */}
            <View style={[styles.rightContent, isDesktop && { flex: 3 }]}>
              
              {/* Next Token Call Panel */}
              <View style={[styles.card, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1 }]}>
                <Text style={[styles.cardTitle, { color: '#1e40af' }]}>Next Token to be Called</Text>
                
                {nextWaitingPatient ? (
                  <View style={{ alignItems: 'center', marginTop: 16 }}>
                    <View style={styles.bigTokenCircle}>
                      <Text style={styles.bigTokenText}>#{nextWaitingPatient.token_number}</Text>
                    </View>
                    
                    <Text style={styles.nextPatientName}>{nextWaitingPatient.patient_name}</Text>
                    <Text style={styles.nextPatientDoctor}>Doctor: Dr. {nextWaitingPatient.doctor_name}</Text>
                    <Text style={styles.nextPatientMeta}>{nextWaitingPatient.department} • Time: {nextWaitingPatient.start_time.substring(0, 5)}</Text>

                    <TouchableOpacity 
                      style={styles.callPatientBtn}
                      onPress={() => handleUpdateStatus(nextWaitingPatient.booking_id, 'Current')}
                    >
                      <Play size={18} color="white" style={{ marginRight: 6 }} />
                      <Text style={styles.callPatientBtnText}>Call Next Token</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <Text style={{ fontSize: 32, marginTop: 10 }}>🎉</Text>
                    <Text style={{ fontSize: 14, color: '#4b5563', fontWeight: 'bold', marginTop: 12, textAlign: 'center' }}>
                      All checked-in patients have been called!
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>
                      Waiting for more patients to check in.
                    </Text>
                  </View>
                )}
              </View>

              {/* Alerts & Notifications */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Alerts & Notifications</Text>
                
                <View style={{ marginTop: 12, gap: 10 }}>
                  {dynamicAlerts.map((alert, idx) => (
                    <View key={idx} style={[styles.alertItem, { borderLeftColor: alert.color, backgroundColor: alert.color + '0C' }]}>
                      <ShieldAlert size={18} color={alert.color} style={{ marginRight: 8, marginTop: 2 }} />
                      <Text style={[styles.alertText, { color: alert.color }]}>
                        {alert.text}
                      </Text>
                    </View>
                  ))}
                  {dynamicAlerts.length === 0 && (
                    <Text style={styles.emptyText}>No alerts at this moment.</Text>
                  )}
                </View>
              </View>

            </View>
          </View>
        </>
      )}

      {/* Book Appointment Dialog */}
      <Modal visible={bookModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setBookModalVisible(false)}>
          <View style={[styles.modalContent, { maxWidth: 550 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book New Walk-in Appointment</Text>
              <TouchableOpacity onPress={() => setBookModalVisible(false)}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500, padding: 20 }}>
              <Text style={styles.modalLabel}>Select Shift / Doctor Slot *</Text>
              <TouchableOpacity 
                style={styles.selectContainer}
                onPress={() => setSlotDropdownOpen(true)}
              >
                <Text style={{ fontSize: 14, color: formSlotId ? '#334155' : '#94a3b8' }}>
                  {formSlotId 
                    ? `Dr. ${slots.find(s => s.id.toString() === formSlotId)?.doctor_name} (${slots.find(s => s.id.toString() === formSlotId)?.start_time.substring(0, 5)})` 
                    : 'Choose slot...'}
                </Text>
              </TouchableOpacity>

              {/* Slot Selector Dropdown Modal */}
              <Modal visible={slotDropdownOpen} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setSlotDropdownOpen(false)}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Choose Slot</Text>
                      <TouchableOpacity onPress={() => setSlotDropdownOpen(false)}>
                        <X size={18} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 300, padding: 12 }}>
                      {slots.map((s: any) => (
                        <TouchableOpacity 
                          key={s.id}
                          style={{ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                          onPress={() => {
                            setFormSlotId(s.id.toString());
                            setTokenNumber(''); // Reset token
                            setSlotDropdownOpen(false);
                          }}
                        >
                          <Text style={{ fontSize: 14, color: '#334155', fontWeight: formSlotId === s.id.toString() ? '700' : '400' }}>
                            Dr. {s.doctor_name} ({s.department}) - {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>

              <Text style={styles.modalLabel}>Patient Name *</Text>
              <TextInput style={styles.textInput} placeholder="Enter full name" value={patientName} onChangeText={setPatientName} />

              <Text style={styles.modalLabel}>Mobile Number *</Text>
              <TextInput style={styles.textInput} placeholder="10-digit mobile" keyboardType="numeric" value={mobile} onChangeText={setMobile} />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Age</Text>
                  <TextInput style={styles.textInput} placeholder="Age" keyboardType="numeric" value={age} onChangeText={setAge} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Gender</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {['Male', 'Female'].map(g => (
                      <TouchableOpacity 
                        key={g} 
                        style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                        onPress={() => setGender(g)}
                      >
                        <Text style={[styles.genderText, gender === g && { color: 'white' }]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Observed Token Selection Dropdown */}
              <Text style={styles.modalLabel}>Observed Token Number *</Text>
              <TouchableOpacity 
                style={[styles.selectContainer, !formSlotId && { opacity: 0.5 }]}
                disabled={!formSlotId}
                onPress={() => setTokenDropdownOpen(true)}
              >
                <Text style={{ fontSize: 14, color: tokenNumber ? '#334155' : '#94a3b8' }}>
                  {tokenNumber ? `Token #${tokenNumber}` : formSlotId ? 'Select available token...' : 'Select shift first'}
                </Text>
              </TouchableOpacity>

              {/* Available Token Selection Modal */}
              <Modal visible={tokenDropdownOpen} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setTokenDropdownOpen(false)}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Token</Text>
                      <TouchableOpacity onPress={() => setTokenDropdownOpen(false)}>
                        <X size={18} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 300, padding: 12 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 8 }}>
                        {availableTokens.map((t) => (
                          <TouchableOpacity 
                            key={t}
                            style={[styles.tokenGridBtn, tokenNumber === t.toString() && styles.tokenGridBtnActive]}
                            onPress={() => {
                              setTokenNumber(t.toString());
                              setTokenDropdownOpen(false);
                            }}
                          >
                            <Text style={[styles.tokenGridText, tokenNumber === t.toString() && { color: 'white' }]}>
                              {t}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        {availableTokens.length === 0 && (
                          <Text style={styles.emptyText}>No available tokens for this shift.</Text>
                        )}
                      </View>
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>

              <Text style={styles.modalLabel}>Reason for Visit</Text>
              <TextInput style={styles.textInput} placeholder="Symptoms / Checkup notes" value={reasonForVisit} onChangeText={setReasonForVisit} />

              <Text style={styles.modalLabel}>Payment Mode</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {['Cash', 'Online'].map(mode => (
                  <TouchableOpacity 
                    key={mode} 
                    style={[styles.genderBtn, paymentMode === mode && styles.genderBtnActive]}
                    onPress={() => setPaymentMode(mode)}
                  >
                    <Text style={[styles.genderText, paymentMode === mode && { color: 'white' }]}>{mode}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleCreateBooking}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitBtnText}>Book Appointment</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* KPI Details Modal overlay */}
      <Modal visible={viewingStatsType !== null} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setViewingStatsType(null)}>
          <View style={[styles.modalContent, { width: '80%', maxWidth: 750, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{getStatsModalTitle()} - Total: {getStatsModalList().length}</Text>
              <TouchableOpacity onPress={() => setViewingStatsType(null)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 1 }]}>Token</Text>
                <Text style={[styles.th, { flex: 2.5 }]}>Patient / Mobile</Text>
                <Text style={[styles.th, { flex: 2 }]}>Doctor / Dept</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>Total Visits</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>Status</Text>
              </View>

              {getStatsModalList().map((b, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <View style={[styles.tokenBadgeBox, { flex: 1 }]}>
                    <Text style={styles.tokenBadgeText}>#{b.token_number}</Text>
                  </View>
                  <View style={{ flex: 2.5 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#334155' }}>{b.patient_name}</Text>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>{b.age} Yrs • {b.gender} • {b.mobile}</Text>
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={{ fontWeight: '600', fontSize: 12, color: '#334155' }}>Dr. {b.doctor_name}</Text>
                    <Text style={{ fontSize: 10, color: '#64748b' }}>{b.department}</Text>
                  </View>
                  <Text style={{ flex: 1.5, fontSize: 13, color: '#475569', fontWeight: 'bold' }}>
                    {b.patient_total_bookings || 1} Booking(s)
                  </Text>
                  <View style={{ flex: 1.5 }}>
                    <View style={[
                      styles.statusTag,
                      b.status === 'Completed' && styles.statusTagCompleted,
                      b.status === 'Current' && styles.statusTagCurrent,
                      b.status === 'Waiting' && styles.statusTagWaiting,
                      b.status === 'Cancelled' && styles.statusTagCancelled
                    ]}>
                      <Text style={[
                        styles.statusTagText,
                        b.status === 'Completed' && { color: '#065f46' },
                        b.status === 'Current' && { color: '#5b21b6' },
                        b.status === 'Waiting' && { color: '#92400e' },
                        b.status === 'Cancelled' && { color: '#991b1b' }
                      ]}>
                        {b.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {getStatsModalList().length === 0 && (
                <Text style={[styles.emptyText, { padding: 40 }]}>No patient records match this status.</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { marginBottom: 12 },
  backButtonRound: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', borderWidth: 1, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  backLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backLinkText: { fontSize: 13, fontWeight: '700', color: Colors.light.primary },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },

  dateFilterContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
  dateInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'white', color: '#334155', width: 130, fontSize: 13 },
  goBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  goBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  rowTitle: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginTop: 12, marginBottom: 8, textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statsRowMobile: { flexDirection: 'column' },
  kpiCard: { minWidth: 200, flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 5, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  kpiIconContainer: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  kpiValue: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  kpiLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 2, textTransform: 'uppercase' },

  actionsBar: { flexDirection: 'row', gap: 12, alignItems: 'center', marginVertical: 24, flexWrap: 'wrap' },
  actionBtn: { backgroundColor: Colors.light.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  actionBtnSecondary: { backgroundColor: 'white', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  actionBtnSecondaryText: { color: '#475569', fontWeight: 'bold', fontSize: 14 },
  refreshBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },

  mainLayout: { flexDirection: 'row', gap: 20 },
  mainLayoutMobile: { flexDirection: 'column' },
  leftContent: { gap: 20 },
  rightContent: { gap: 20 },

  card: { backgroundColor: 'white', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  clearFilterBtn: { padding: 4 },
  clearFilterText: { fontSize: 12, color: Colors.light.primary, fontWeight: '700' },

  slotCard: { width: 180, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1' },
  slotCardActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  slotDocName: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  slotDept: { fontSize: 11, color: '#64748b', marginTop: 2 },
  slotTime: { fontSize: 11, color: '#475569', marginTop: 6, fontWeight: '600' },
  slotPillRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  slotBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, backgroundColor: '#e2e8f0' },
  slotBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#475569' },

  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center' },
  th: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  tokenBadgeBox: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  tokenBadgeText: { fontSize: 12, fontWeight: '800', color: '#0369a1' },
  patientName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  patientMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  docName: { fontSize: 13, fontWeight: '600', color: '#334155' },
  docDept: { fontSize: 11, color: '#64748b' },
  tdText: { fontSize: 13, color: '#475569' },

  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, alignSelf: 'flex-start', backgroundColor: '#f3f4f6' },
  statusTagCompleted: { backgroundColor: '#d1fae5' },
  statusTagCurrent: { backgroundColor: '#ede9fe' },
  statusTagWaiting: { backgroundColor: '#fef3c7' },
  statusTagCancelled: { backgroundColor: '#fee2e2' },
  statusTagText: { fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },

  actionsCol: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end', alignItems: 'center' },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  smallBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  smallBtnSecondary: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  smallBtnSecondaryText: { fontSize: 11, fontWeight: 'bold' },

  bigTokenCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4, marginBottom: 12 },
  bigTokenText: { color: 'white', fontSize: 24, fontWeight: '900' },
  nextPatientName: { fontSize: 18, fontWeight: 'bold', color: '#1e3a8a' },
  nextPatientDoctor: { fontSize: 13, fontWeight: '700', color: '#3b82f6', marginTop: 4 },
  nextPatientMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  callPatientBtn: { backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16, flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  callPatientBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  alertItem: { flexDirection: 'row', borderLeftWidth: 4, padding: 12, borderRadius: 6 },
  alertText: { fontSize: 12, flex: 1, lineHeight: 16, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 450, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 14, marginBottom: 6 },
  selectContainer: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, backgroundColor: '#f8fafc', marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  textInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#334155', backgroundColor: '#f8fafc', marginBottom: 12 },
  genderBtn: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#f8fafc' },
  genderBtnActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  genderText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  submitBtn: { backgroundColor: Colors.light.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  submitBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  emptyText: { padding: 20, fontStyle: 'italic', color: '#94a3b8', textAlign: 'center' },
  
  tokenGridBtn: { width: 50, height: 50, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  tokenGridBtnActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  tokenGridText: { fontSize: 14, fontWeight: 'bold', color: '#475569' }
});
