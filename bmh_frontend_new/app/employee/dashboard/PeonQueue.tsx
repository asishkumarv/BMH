import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { ArrowRight, CheckCircle } from 'lucide-react-native';

export default function PeonQueue({ user }: { user: any }) {
  const { isMobile } = useResponsive();
  const [slot, setSlot] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      // Find today's slot for this peon
      const today = new Date().toISOString().split('T')[0];
      const resSlots = await axios.get(`https://bmh-eitu.onrender.com/doctors/slots`);
      const mySlot = resSlots.data.data.find((s: any) => 
        s.assigned_peon_id === user.id && s.date.startsWith(today)
      );

      if (mySlot) {
        setSlot(mySlot);
        const resBookings = await axios.get(`https://bmh-eitu.onrender.com/bookings?slot_id=${mySlot.id}`);
        setBookings(resBookings.data.data);
        startScrolling();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startScrolling = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scrollAnim, {
          toValue: -1000,
          duration: 20000,
          useNativeDriver: true,
        }),
        Animated.timing(scrollAnim, {
          toValue: 300,
          duration: 0,
          useNativeDriver: true,
        })
      ])
    ).start();
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await axios.put(`https://bmh-eitu.onrender.com/bookings/${id}/status`, { status });
      fetchQueue();
    } catch (err) {
      alert('Error updating status');
    }
  };

  if (loading) return <ActivityIndicator color={Colors.light.primary} />;

  if (!slot) return (
    <View style={styles.noSlotBox}>
      <Text style={styles.noSlotText}>You are not assigned to any doctor slot today.</Text>
    </View>
  );

  const waiting = bookings.filter(b => b.status === 'Booked' || b.status === 'Waiting');
  const current = bookings.find(b => b.status === 'Current');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Live Patient Queue - Dr. {slot.doctor_name}</Text>

      {/* Railway scrolling banner */}
      <View style={styles.scrollContainer}>
        <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: scrollAnim }] }}>
           <Text style={styles.scrollText}>
             {current ? `CURRENT PATIENT: ${current.patient_name} (Token #${current.token_number})` : 'WAITING FOR NEXT PATIENT...'}
             {'   ||   '}
             NEXT IN LINE: {waiting.length > 0 ? `${waiting[0].patient_name} (Token #${waiting[0].token_number})` : 'NO PATIENTS WAITING'}
           </Text>
        </Animated.View>
      </View>

      <View style={[styles.queueContainer, isMobile && { flexDirection: 'column' }]}>
        <View style={styles.queueColumn}>
          <Text style={styles.columnTitle}>Waiting Queue ({waiting.length})</Text>
          <ScrollView style={styles.list}>
            {waiting.map(b => (
              <View key={b.booking_id} style={styles.patientCard}>
                <View>
                  <Text style={styles.tokenText}>#{b.token_number}</Text>
                  <Text style={styles.patientName}>{b.patient_name}</Text>
                </View>
                {!current && (
                  <TouchableOpacity style={styles.callBtn} onPress={() => updateStatus(b.booking_id, 'Current')}>
                    <Text style={styles.callBtnText}>Call Next</Text>
                    <ArrowRight size={16} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {waiting.length === 0 && <Text style={{color: '#64748b'}}>No patients waiting.</Text>}
          </ScrollView>
        </View>

        <View style={styles.currentColumn}>
          <Text style={styles.columnTitle}>Currently with Doctor</Text>
          {current ? (
            <View style={styles.currentCard}>
              <Text style={styles.currentToken}>#{current.token_number}</Text>
              <Text style={styles.currentName}>{current.patient_name}</Text>
              <TouchableOpacity style={styles.completeBtn} onPress={() => updateStatus(current.booking_id, 'Completed')}>
                <CheckCircle size={20} color="white" />
                <Text style={styles.completeBtnText}>Mark Completed</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.currentCard, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
              <Text style={{color: '#64748b', fontSize: 16}}>Doctor is free.</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 30, backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#cbd5e1', shadowOpacity: 0.4, shadowRadius: 15, elevation: 5 },
  header: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  noSlotBox: { marginTop: 30, backgroundColor: '#fffbeb', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a' },
  noSlotText: { color: '#d97706', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  scrollContainer: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
  scrollText: { color: '#facc15', fontSize: 24, fontWeight: 'bold', letterSpacing: 2 },
  queueContainer: { flexDirection: 'row', gap: 24 },
  queueColumn: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 16 },
  currentColumn: { flex: 1, backgroundColor: '#eff6ff', borderRadius: 12, padding: 16 },
  columnTitle: { fontSize: 16, fontWeight: 'bold', color: '#475569', marginBottom: 16 },
  list: { maxHeight: 300 },
  patientCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  tokenText: { fontSize: 16, fontWeight: 'bold', color: Colors.light.primary },
  patientName: { fontSize: 14, color: '#334155' },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  callBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  currentCard: { backgroundColor: 'white', padding: 32, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#bfdbfe' },
  currentToken: { fontSize: 48, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 8 },
  currentName: { fontSize: 24, fontWeight: 'bold', color: '#1e40af', marginBottom: 24 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  completeBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
