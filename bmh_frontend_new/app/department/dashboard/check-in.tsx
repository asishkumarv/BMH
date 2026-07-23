import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { Search, UserCheck, Stethoscope, Activity, ChevronDown, ChevronUp, Clock, Calendar } from 'lucide-react-native';

export default function CheckInPatientScreen() {
  const { isMobile } = useResponsive();
  const [user, setUser] = useState<any>(null);
  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // Track which slot accordion cards are expanded (Set of slot IDs)
  const [expandedSlots, setExpandedSlots] = useState<Set<number>>(new Set());
  const [activeDelayInputId, setActiveDelayInputId] = useState<number | null>(null);
  const [delayTimeStr, setDelayTimeStr] = useState('');

  useEffect(() => {
    const init = async () => {
      let userDataStr = null;
      if (Platform.OS === 'web') {
        userDataStr = localStorage.getItem('employeeUser');
      } else {
        userDataStr = await AsyncStorage.getItem('employeeUser');
      }
      if (userDataStr) {
        const u = JSON.parse(userDataStr);
        setUser(u);
        fetchQueues(u.id);
      } else {
        setLoading(false);
      }
    };
    init();
    const interval = setInterval(() => {
      if (user) fetchQueues(user.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const fetchQueues = async (empId: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const resSlots = await axios.get(`https://napi.bharatmedicalhallplus.com/doctors/slots`);
      const mySlots = resSlots.data.data.filter((s: any) =>
        s.date.startsWith(today) &&
        String(s.assigned_peon_id) === String(empId)
      );
      const queueData = await Promise.all(mySlots.map(async (slot: any) => {
        const resBookings = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings?slot_id=${slot.id}`);
        return { slot, bookings: resBookings.data.data };
      }));
      setQueues(queueData);
      // Auto-expand all slots on first load
      setExpandedSlots(prev => {
        if (prev.size === 0 && queueData.length > 0)
          return new Set(queueData.map((q: any) => q.slot.id));
        return prev;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markInHospital = async (bookingId: number) => {
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/${bookingId}/status`, { status: 'Waiting' });
      if (user) fetchQueues(user.id);
    } catch (err) {
      console.error(err);
      alert('Failed to mark patient as in-hospital');
    }
  };

  const updateDoctorStatus = async (slotId: number, status: string, delayTime: string | null) => {
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/doctors/slots/${slotId}`, {
        doctor_status: status,
        doctor_available_time: status === 'Delayed' ? delayTime : null
      });
      if (res.data.success) {
        Alert.alert('Success', `Doctor status updated to: ${status}`);
        if (user) fetchQueues(user.id);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
    }
  };

  const toggleSlotExpand = (slotId: number) => {
    setExpandedSlots(prev => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  // Apply global search across all slots
  const sq = searchQuery.toLowerCase();

  // Total booked count across all slots (for empty state check)
  const totalBooked = queues.reduce((sum, q) => sum + q.bookings.filter((b: any) => b.status === 'Booked').length, 0);

  return (
    <ScrollView style={[styles.container, isMobile && { padding: 16 }]} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>In-Hospital Check-In</Text>
        <Text style={styles.subtitle}>Mark arrived patients so they appear on the Live Queue</Text>
      </View>

      {/* Global Search */}
      <View style={styles.searchBox}>
        <Search color="#94a3b8" size={20} />
        <TextInput
          style={[styles.searchInput, { outlineStyle: 'none' } as any]}
          placeholder="Search token no., patient name or mobile..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
            <Text style={{ color: '#94a3b8', fontSize: 18, lineHeight: 20 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* No slots */}
      {queues.length === 0 && (
        <View style={styles.emptyState}>
          <Activity color="#cbd5e1" size={48} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>No slots assigned to you today.</Text>
          <Text style={styles.emptySubText}>You have no doctor slots assigned for today.</Text>
        </View>
      )}

      {/* Slot Accordion Cards */}
      {queues.map(({ slot, bookings }) => {
        const isExpanded = expandedSlots.has(slot.id);

        // Filter booked tokens within this slot
        let bookedTokens = bookings.filter((b: any) => b.status === 'Booked');
        if (sq) {
          bookedTokens = bookedTokens.filter((b: any) =>
            b.patient_name?.toLowerCase().includes(sq) ||
            b.token_number?.toString().includes(sq) ||
            b.mobile?.includes(sq)
          );
        }

        const totalInSlot = bookings.filter((b: any) => b.status === 'Booked').length;
        const waitingCount = bookings.filter((b: any) => b.status === 'Waiting' || b.status === 'Current').length;

        return (
          <View key={slot.id} style={styles.slotAccordion}>
            {/* Slot Header — clickable */}
            <TouchableOpacity
              style={[styles.slotHeader, isExpanded && styles.slotHeaderExpanded]}
              onPress={() => toggleSlotExpand(slot.id)}
              activeOpacity={0.85}
            >
              {/* Left: Doctor info */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <View style={styles.docIconCircle}>
                    <Stethoscope color={Colors.light.primary} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slotDocName}>Dr. {slot.doctor_name}</Text>
                    <Text style={styles.slotDocDept}>{slot.doctor_department || 'General'} · {slot.doctor_role || 'Doctor'}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                  <View style={styles.slotMetaItem}>
                    <Calendar color="#64748b" size={13} />
                    <Text style={styles.slotMetaText}>{formatDate(slot.date)}</Text>
                  </View>
                  <View style={styles.slotMetaItem}>
                    <Clock color="#64748b" size={13} />
                    <Text style={styles.slotMetaText}>{formatTime(slot.start_time)} – {formatTime(slot.end_time)}</Text>
                  </View>
                </View>
              </View>

              {/* Right: Stats + chevron */}
              <View style={{ alignItems: 'flex-end', gap: 6, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {totalInSlot > 0 && (
                    <View style={[styles.statBadge, { backgroundColor: '#fef3c720' }]}>
                      <Text style={[styles.statBadgeText, { color: '#d97706' }]}>{totalInSlot} pending</Text>
                    </View>
                  )}
                  {waitingCount > 0 && (
                    <View style={[styles.statBadge, { backgroundColor: '#10b98115' }]}>
                      <Text style={[styles.statBadgeText, { color: '#10b981' }]}>{waitingCount} in queue</Text>
                    </View>
                  )}
                  {totalInSlot === 0 && waitingCount === 0 && (
                    <View style={[styles.statBadge, { backgroundColor: '#64748b15' }]}>
                      <Text style={[styles.statBadgeText, { color: '#64748b' }]}>All done</Text>
                    </View>
                  )}
                </View>
                {isExpanded
                  ? <ChevronUp color="#64748b" size={22} />
                  : <ChevronDown color="#64748b" size={22} />
                }
              </View>
            </TouchableOpacity>

             {/* Slot Body — tokens */}
            {isExpanded && (
              <View style={styles.slotBody}>
                {/* Doctor Attendance / Status Marking Layer */}
                <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: '#1e293b', marginBottom: 8 }}>Doctor Attendance Status:</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <TouchableOpacity 
                      style={{ backgroundColor: slot.doctor_status === 'Available' ? '#22c55e' : '#cbd5e1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                      onPress={() => updateDoctorStatus(slot.id, 'Available', null)}
                    >
                      <Text style={{ color: slot.doctor_status === 'Available' ? 'white' : '#475569', fontWeight: '600', fontSize: 12 }}>Doctor Arrived</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{ backgroundColor: slot.doctor_status === 'Delayed' ? '#eab308' : '#cbd5e1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                      onPress={() => {
                        setActiveDelayInputId(slot.id);
                        setDelayTimeStr(slot.doctor_available_time || '');
                      }}
                    >
                      <Text style={{ color: slot.doctor_status === 'Delayed' ? 'white' : '#475569', fontWeight: '600', fontSize: 12 }}>Delayed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{ backgroundColor: slot.doctor_status === 'Absent' ? '#ef4444' : '#cbd5e1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                      onPress={() => updateDoctorStatus(slot.id, 'Absent', null)}
                    >
                      <Text style={{ color: slot.doctor_status === 'Absent' ? 'white' : '#475569', fontWeight: '600', fontSize: 12 }}>Absent</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {activeDelayInputId === slot.id && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 8 }}>
                      <TextInput
                        style={{ borderWidth: 1, borderColor: '#cbd5e1', padding: 8, borderRadius: 6, flex: 1, fontSize: 13, backgroundColor: 'white' }}
                        placeholder="Enter expected time (e.g. 10:30 AM)"
                        value={delayTimeStr}
                        onChangeText={setDelayTimeStr}
                      />
                      <TouchableOpacity 
                        style={{ backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
                        onPress={() => {
                          updateDoctorStatus(slot.id, 'Delayed', delayTimeStr);
                          setActiveDelayInputId(null);
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={{ backgroundColor: '#cbd5e1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
                        onPress={() => setActiveDelayInputId(null)}
                      >
                        <Text style={{ color: '#334155', fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={{ fontSize: 12, color: '#64748b' }}>
                    Current status: <Text style={{ fontWeight: 'bold', color: slot.doctor_status === 'Available' ? '#16a34a' : slot.doctor_status === 'Delayed' ? '#ca8a04' : slot.doctor_status === 'Absent' ? '#dc2626' : '#64748b' }}>
                      {slot.doctor_status || 'Not Marked'} 
                      {slot.doctor_status === 'Delayed' && slot.doctor_available_time ? ` (Expected from: ${slot.doctor_available_time})` : ''}
                    </Text>
                  </Text>
                </View>

                {bookedTokens.length > 0 ? (
                  <View style={[styles.tokenGrid, isMobile && { flexDirection: 'column' }]}>
                    {bookedTokens.map((token: any) => (
                      <View key={token.booking_id} style={[styles.tokenCard, isMobile && { width: '100%' }]}>
                        <View style={styles.tokenCardTop}>
                          <View style={styles.tokenBadge}>
                            <Text style={styles.tokenNumber}>#{token.token_number}</Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.patientName} numberOfLines={1}>{token.patient_name}</Text>
                            <Text style={styles.mobile}>{token.mobile || 'No Mobile'}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.checkInBtn}
                          onPress={() => markInHospital(token.booking_id)}
                        >
                          <UserCheck color="white" size={16} />
                          <Text style={styles.checkInBtnText}>In Hospital</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.slotEmptyBox}>
                    {sq ? (
                      <>
                        <Text style={styles.slotEmptyText}>No tokens match your search.</Text>
                        <Text style={styles.slotEmptySubText}>Try a different name or token number.</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.slotEmptyText}>No pending check-ins.</Text>
                        <Text style={styles.slotEmptySubText}>All booked patients have been checked in.</Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* All clear state when slots exist but no booked tokens */}
      {queues.length > 0 && totalBooked === 0 && !sq && (
        <View style={styles.emptyState}>
          <Activity color="#10b981" size={48} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: '#10b981' }]}>All caught up!</Text>
          <Text style={styles.emptySubText}>All patients have been checked in for today.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  header: { marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', paddingHorizontal: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#e2e8f0', height: 52, marginBottom: 24,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } as any, default: { elevation: 2 } })
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#1e293b' },

  // Accordion slot card
  slotAccordion: {
    backgroundColor: 'white', borderRadius: 16, marginBottom: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0',
    ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } as any, default: { elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 } })
  },
  slotHeader: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 16,
    borderLeftWidth: 5, borderLeftColor: Colors.light.primary,
    backgroundColor: '#fff',
  },
  slotHeaderExpanded: {
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    backgroundColor: '#fafcff',
  },
  docIconCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.light.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  slotDocName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  slotDocDept: { fontSize: 12, color: '#64748b', marginTop: 1 },
  slotMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  slotMetaText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  statBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'transparent' },
  statBadgeText: { fontSize: 11, fontWeight: '700' },

  // Slot body
  slotBody: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  tokenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tokenCard: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14,
    width: '48%', minWidth: 220,
    borderWidth: 1, borderColor: '#e2e8f0',
    ...Platform.select({ web: {} as any, default: { elevation: 1 } })
  },
  tokenCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tokenBadge: {
    backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#bfdbfe',
  },
  tokenNumber: { fontSize: 20, fontWeight: '800', color: '#1d4ed8' },
  patientName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  mobile: { fontSize: 13, color: '#64748b', marginTop: 2 },

  checkInBtn: {
    flexDirection: 'row', backgroundColor: '#10b981',
    paddingVertical: 10, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', gap: 7,
  },
  checkInBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },

  // Empty states
  slotEmptyBox: { paddingVertical: 20, alignItems: 'center' },
  slotEmptyText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  slotEmptySubText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 20, fontWeight: '600', color: '#64748b' },
  emptySubText: { fontSize: 15, color: '#94a3b8', marginTop: 8 },
});
