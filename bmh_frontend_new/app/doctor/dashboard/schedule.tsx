import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { Calendar, Users, Clock, Edit2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DoctorSchedule() {
  const { isMobile } = useResponsive();
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Attendance self-marking states
  const [activeDelaySlotId, setActiveDelaySlotId] = useState<number | null>(null);
  const [delayTimeInput, setDelayTimeInput] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Booking list collapse state (Set of slot IDs)
  const [expandedBookingsSlots, setExpandedBookingsSlots] = useState<Set<number>>(new Set());

  // Edit Slot Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [totalTokens, setTotalTokens] = useState('');
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        // Get all upcoming and recent slots
        const resSlots = await axios.get(`https://napi.bharatmedicalhallplus.com/doctors/slots?doctor_id=${user.id}`);
        if (resSlots.data.success) {
          const slotsData = resSlots.data.data;
          
          // Fetch bookings for each slot
          const slotsWithBookings = await Promise.all(slotsData.map(async (slot: any) => {
            try {
              const resBookings = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings?slot_id=${slot.id}`);
              return { ...slot, bookings: resBookings.data.data || [] };
            } catch (err) {
              return { ...slot, bookings: [] };
            }
          }));
          
          setSlots(slotsWithBookings);
        }
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const isSlotPast = (slotDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slotDate = new Date(slotDateStr);
    slotDate.setHours(0, 0, 0, 0);
    return slotDate < today;
  };

  const isSlotToday = (slotDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slotDate = new Date(slotDateStr);
    slotDate.setHours(0, 0, 0, 0);
    return slotDate.getTime() === today.getTime();
  };

  const formatDateDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const updateAttendanceStatus = async (slotId: number, status: string, delayTime: string | null) => {
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/doctors/slots/${slotId}`, {
        doctor_status: status,
        doctor_available_time: status === 'Delayed' ? delayTime : null
      });
      if (res.data.success) {
        Alert.alert('Success', `Attendance updated successfully!`);
        fetchSchedule();
      } else {
        Alert.alert('Error', res.data.message || 'Failed to update attendance');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update attendance');
    }
  };

  const toggleBookingsExpand = (slotId: number) => {
    setExpandedBookingsSlots(prev => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  };

  const openEditModal = (slot: any) => {
    setSelectedSlot(slot);
    setStartTime(slot.start_time || '');
    setEndTime(slot.end_time || '');
    setTotalTokens(String(slot.total_tokens || ''));
    setFee(String(slot.fee || ''));
    setEditModalVisible(true);
  };

  const handleSaveSlot = async () => {
    if (!startTime || !endTime || !totalTokens || !fee) {
      Alert.alert('Error', 'Please fill in all slot fields.');
      return;
    }
    setSaving(true);
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/doctors/slots/${selectedSlot.id}`, {
        start_time: startTime,
        end_time: endTime,
        total_tokens: parseInt(totalTokens),
        fee: parseFloat(fee)
      });
      if (res.data.success) {
        Alert.alert('Success', 'Slot timings updated successfully!');
        setEditModalVisible(false);
        fetchSchedule();
      } else {
        Alert.alert('Error', res.data.message || 'Failed to update slot');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update slot');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} color={Colors.light.primary} />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Schedule & Bookings</Text>
      
      {slots.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#64748b' }}>No schedule slots found.</Text>
      ) : (
        slots.map((slot, index) => (
          <View key={index} style={styles.slotCard}>
            <View style={styles.slotHeader}>
              <View style={styles.slotDateBox}>
                <Calendar color="#3b82f6" size={20} />
                <Text style={styles.slotDate}>{formatDateDDMMYYYY(slot.date)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.slotTimeBox}>
                  <Clock color="#64748b" size={16} />
                  <Text style={styles.slotTime}>{slot.start_time} - {slot.end_time}</Text>
                </View>
                {!isSlotPast(slot.date) && (
                  <TouchableOpacity 
                    style={{ backgroundColor: '#eff6ff', padding: 6, borderRadius: 6 }} 
                    onPress={() => openEditModal(slot)}
                  >
                    <Edit2 size={16} color="#3b82f6" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <View style={styles.slotStats}>
              <Text style={styles.statText}><Users size={14} color="#64748b" /> Max Tokens: {slot.total_tokens}</Text>
              <Text style={styles.statText}>Booked: {slot.bookings.length}</Text>
              <Text style={styles.statText}>Fee: ₹{slot.fee}</Text>
            </View>

            {/* Attendance Self-Marking controls for Today's slot */}
            {isSlotToday(slot.date) ? (
              <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: '#1e293b', marginBottom: 8 }}>My Attendance Status today:</Text>
                
                <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  Current Status: <Text style={{ fontWeight: 'bold', color: slot.doctor_status === 'Available' ? '#16a34a' : slot.doctor_status === 'Delayed' ? '#ca8a04' : slot.doctor_status === 'Absent' ? '#dc2626' : '#64748b' }}>
                    {slot.doctor_status === 'Available' ? 'Arrived / Present' : (slot.doctor_status || 'Not Marked')}
                    {slot.doctor_status === 'Delayed' && slot.doctor_available_time ? ` (Expected: ${slot.doctor_available_time})` : ''}
                  </Text>
                </Text>

                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <TouchableOpacity 
                    style={{ backgroundColor: slot.doctor_status === 'Available' ? '#22c55e' : '#cbd5e1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
                    onPress={() => updateAttendanceStatus(slot.id, 'Available', null)}
                  >
                    <Text style={{ color: slot.doctor_status === 'Available' ? 'white' : '#475569', fontWeight: '600', fontSize: 11 }}>Mark Arrived</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={{ backgroundColor: slot.doctor_status === 'Delayed' ? '#eab308' : '#cbd5e1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
                    onPress={() => {
                      setActiveDelaySlotId(slot.id);
                      setDelayTimeInput(slot.doctor_available_time || '');
                    }}
                  >
                    <Text style={{ color: slot.doctor_status === 'Delayed' ? 'white' : '#475569', fontWeight: '600', fontSize: 11 }}>Mark Delayed</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{ backgroundColor: slot.doctor_status === 'Absent' ? '#ef4444' : '#cbd5e1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
                    onPress={() => updateAttendanceStatus(slot.id, 'Absent', null)}
                  >
                    <Text style={{ color: slot.doctor_status === 'Absent' ? 'white' : '#475569', fontWeight: '600', fontSize: 11 }}>Mark Absent</Text>
                  </TouchableOpacity>

                  {slot.doctor_status && slot.doctor_status !== 'Not Marked' && slot.doctor_status !== 'None' && (
                    <TouchableOpacity 
                      style={{ backgroundColor: '#64748b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
                      onPress={() => updateAttendanceStatus(slot.id, 'Not Marked', null)}
                    >
                      <Text style={{ color: 'white', fontWeight: '600', fontSize: 11 }}>Revoke / Reset</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {activeDelaySlotId === slot.id && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    {Platform.OS === 'web' ? (
                      <input 
                        type="time" 
                        value={delayTimeInput} 
                        onChange={(e) => setDelayTimeInput(e.target.value)} 
                        style={{
                          borderWidth: 1, 
                          borderColor: '#cbd5e1', 
                          padding: 8, 
                          borderRadius: 6, 
                          flex: 1, 
                          fontSize: 13, 
                          backgroundColor: 'white'
                        } as any}
                      />
                    ) : (
                      <>
                        <TouchableOpacity 
                          onPress={() => setShowTimePicker(true)} 
                          style={{ 
                            flex: 1, 
                            borderWidth: 1, 
                            borderColor: '#cbd5e1', 
                            padding: 10, 
                            borderRadius: 6, 
                            backgroundColor: 'white',
                            justifyContent: 'center'
                          }}
                        >
                          <Text style={{ fontSize: 13, color: delayTimeInput ? '#000' : '#64748b' }}>
                            {delayTimeInput || 'Select Expected Time'}
                          </Text>
                        </TouchableOpacity>
                        {showTimePicker && (
                          <DateTimePicker
                            mode="time"
                            value={(() => {
                              const d = new Date();
                              if (delayTimeInput && delayTimeInput.includes(':')) {
                                const [h, m] = delayTimeInput.split(':');
                                d.setHours(parseInt(h) || 0);
                                d.setMinutes(parseInt(m) || 0);
                              }
                              return d;
                            })()}
                            display="default"
                            onChange={(event, date) => {
                              setShowTimePicker(false);
                              if (date) {
                                const hours = date.getHours().toString().padStart(2, '0');
                                const minutes = date.getMinutes().toString().padStart(2, '0');
                                setDelayTimeInput(`${hours}:${minutes}`);
                              }
                            }}
                          />
                        )}
                      </>
                    )}
                    <TouchableOpacity 
                      style={{ backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
                      onPress={() => {
                        updateAttendanceStatus(slot.id, 'Delayed', delayTimeInput);
                        setActiveDelaySlotId(null);
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{ backgroundColor: '#cbd5e1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
                      onPress={() => setActiveDelaySlotId(null)}
                    >
                      <Text style={{ color: '#334155', fontWeight: 'bold', fontSize: 12 }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              // Display simple status read-only banner for non-today slots
              slot.doctor_status && slot.doctor_status !== 'Not Marked' && (
                <View style={{ backgroundColor: slot.doctor_status === 'Available' ? '#dcfce7' : slot.doctor_status === 'Delayed' ? '#fef9c3' : '#fee2e2', padding: 10, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: slot.doctor_status === 'Available' ? '#bbf7d0' : slot.doctor_status === 'Delayed' ? '#fef08a' : '#fecaca' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: slot.doctor_status === 'Available' ? '#15803d' : slot.doctor_status === 'Delayed' ? '#a16207' : '#b91c1c' }}>
                    Attendance Status: {slot.doctor_status === 'Available' ? 'Doctor Present / Arrived' : slot.doctor_status === 'Delayed' ? `Delayed (Expected at ${slot.doctor_available_time})` : 'Doctor Absent'}
                  </Text>
                </View>
              )
            )}

            <View style={styles.bookingsContainer}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                onPress={() => toggleBookingsExpand(slot.id)}
              >
                <Text style={styles.bookingsTitle}>Patient Bookings ({slot.bookings.length})</Text>
                {expandedBookingsSlots.has(slot.id) ? (
                  <ChevronUp size={18} color="#64748b" />
                ) : (
                  <ChevronDown size={18} color="#64748b" />
                )}
              </TouchableOpacity>
              
              {expandedBookingsSlots.has(slot.id) && (
                <View style={{ marginTop: 10 }}>
                  {slot.bookings.length === 0 ? (
                    <Text style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>No patients booked yet.</Text>
                  ) : (
                    slot.bookings.map((b: any, bIdx: number) => (
                      <View key={bIdx} style={styles.bookingRow}>
                        <View style={styles.tokenCircle}>
                          <Text style={styles.tokenText}>{b.token_number}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.patientName}>{b.patient_name}</Text>
                          <Text style={styles.bookingStatus}>{b.status}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          </View>
        ))
      )}

      {/* Edit Slot Modal */}
      {selectedSlot && (
        <Modal transparent animationType="fade" visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Slot Timings</Text>
              
              <Text style={styles.label}>Start Time (e.g. 09:00:00)</Text>
              <TextInput 
                style={styles.input} 
                value={startTime} 
                onChangeText={setStartTime} 
                placeholder="HH:MM:SS" 
              />

              <Text style={styles.label}>End Time (e.g. 13:00:00)</Text>
              <TextInput 
                style={styles.input} 
                value={endTime} 
                onChangeText={setEndTime} 
                placeholder="HH:MM:SS" 
              />

              <Text style={styles.label}>Total Tokens</Text>
              <TextInput 
                style={styles.input} 
                value={totalTokens} 
                onChangeText={setTotalTokens} 
                keyboardType="numeric" 
                placeholder="e.g. 30" 
              />

              <Text style={styles.label}>Consultation Fee (₹)</Text>
              <TextInput 
                style={styles.input} 
                value={fee} 
                onChangeText={setFee} 
                keyboardType="numeric" 
                placeholder="e.g. 300" 
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: '#cbd5e1' }]} 
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={{ color: '#334155', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: '#3b82f6', flex: 1.5 }]} 
                  onPress={handleSaveSlot}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Save Changes</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: Colors.light.background },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20, color: Colors.light.text },
  slotCard: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.light.border },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12, flexWrap: 'wrap', gap: 8 },
  slotDateBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotDate: { fontSize: 18, fontWeight: '600', color: Colors.light.text },
  slotTimeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  slotTime: { fontSize: 14, color: '#475569', fontWeight: '500' },
  slotStats: { flexDirection: 'row', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  statText: { fontSize: 13, color: '#64748b', flexDirection: 'row', alignItems: 'center' },
  bookingsContainer: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12 },
  bookingsTitle: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 10 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  tokenCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tokenText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
  patientName: { fontWeight: '500', color: Colors.light.text, fontSize: 14 },
  bookingStatus: { fontSize: 12, color: '#64748b', marginTop: 2 },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: Platform.OS === 'web' ? 400 : '90%', padding: 24, borderRadius: 12, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#1e293b' },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', padding: 10, borderRadius: 6, fontSize: 14, outlineStyle: 'none' } as any,
  modalBtn: { padding: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center', flex: 1 }
});
