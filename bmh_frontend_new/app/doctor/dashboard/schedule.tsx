import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { Calendar, Users, Clock } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';

export default function DoctorSchedule() {
  const { isMobile } = useResponsive();
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        // Get all upcoming and recent slots
        const resSlots = await axios.get(`https://bmh-eitu.onrender.com/doctors/slots?doctor_id=${user.id}`);
        if (resSlots.data.success) {
          const slotsData = resSlots.data.data;
          
          // Fetch bookings for each slot
          const slotsWithBookings = await Promise.all(slotsData.map(async (slot: any) => {
            try {
              const resBookings = await axios.get(`https://bmh-eitu.onrender.com/bookings?slot_id=${slot.id}`);
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
              <View style={styles.slotTimeBox}>
                <Clock color="#64748b" size={16} />
                <Text style={styles.slotTime}>{slot.start_time} - {slot.end_time}</Text>
              </View>
            </View>
            
            <View style={styles.slotStats}>
              <Text style={styles.statText}><Users size={14} color="#64748b" /> Max Tokens: {slot.total_tokens}</Text>
              <Text style={styles.statText}>Booked: {slot.bookings.length}</Text>
            </View>

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
  slotStats: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statText: { fontSize: 13, color: '#64748b', flexDirection: 'row', alignItems: 'center' },
  bookingsContainer: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12 },
  bookingsTitle: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 10 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  tokenCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tokenText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
  patientName: { fontWeight: '500', color: Colors.light.text, fontSize: 14 },
  bookingStatus: { fontSize: 12, color: '#64748b', marginTop: 2 }
});
