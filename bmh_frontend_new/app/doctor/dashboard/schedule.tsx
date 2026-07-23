import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { Calendar, Users, Clock, Edit2 } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';

export default function DoctorSchedule() {
  const { isMobile } = useResponsive();
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
                <Text style={styles.slotDate}>{new Date(slot.date).toLocaleDateString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.slotTimeBox}>
                  <Clock color="#64748b" size={16} />
                  <Text style={styles.slotTime}>{slot.start_time} - {slot.end_time}</Text>
                </View>
                <TouchableOpacity 
                  style={{ backgroundColor: '#eff6ff', padding: 6, borderRadius: 6 }} 
                  onPress={() => openEditModal(slot)}
                >
                  <Edit2 size={16} color="#3b82f6" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.slotStats}>
              <Text style={styles.statText}><Users size={14} color="#64748b" /> Max Tokens: {slot.total_tokens}</Text>
              <Text style={styles.statText}>Booked: {slot.bookings.length}</Text>
              <Text style={styles.statText}>Fee: ₹{slot.fee}</Text>
            </View>

            {slot.doctor_status && slot.doctor_status !== 'Not Marked' && (
              <View style={{ backgroundColor: slot.doctor_status === 'Available' ? '#dcfce7' : slot.doctor_status === 'Delayed' ? '#fef9c3' : '#fee2e2', padding: 10, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: slot.doctor_status === 'Available' ? '#bbf7d0' : slot.doctor_status === 'Delayed' ? '#fef08a' : '#fecaca' }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: slot.doctor_status === 'Available' ? '#15803d' : slot.doctor_status === 'Delayed' ? '#a16207' : '#b91c1c' }}>
                  Attendance Status: {slot.doctor_status === 'Available' ? 'Doctor Present / Arrived' : slot.doctor_status === 'Delayed' ? `Delayed (Expected at ${slot.doctor_available_time})` : 'Doctor Absent'}
                </Text>
              </View>
            )}

            <View style={styles.bookingsContainer}>
              <Text style={styles.bookingsTitle}>Patient Bookings</Text>
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
