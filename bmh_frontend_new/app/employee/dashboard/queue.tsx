import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { User, Stethoscope, ArrowRight, CheckCircle } from 'lucide-react-native';

export default function PeonLiveQueue() {
  const { isMobile } = useResponsive();
  const [user, setUser] = useState<any>(null);
  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const u = JSON.parse(userData);
        setUser(u);
        fetchQueues(u.id);
      } else {
        setLoading(false);
      }
    };
    init();

    const interval = setInterval(async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) fetchQueues(JSON.parse(userData).id);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueues = async (peonId: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const resSlots = await axios.get(`https://bmh-eitu.onrender.com/doctors/slots`);
      const mySlots = resSlots.data.data.filter((s: any) => 
        s.assigned_peon_id === peonId && s.date.startsWith(today)
      );

      const queueData = await Promise.all(mySlots.map(async (slot: any) => {
        const resBookings = await axios.get(`https://bmh-eitu.onrender.com/bookings?slot_id=${slot.id}`);
        return {
          slot,
          bookings: resBookings.data.data
        };
      }));

      setQueues(queueData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await axios.put(`https://bmh-eitu.onrender.com/bookings/${id}/status`, { status });
      if (user) fetchQueues(user.id);
    } catch (err) {
      alert('Error updating status');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (queues.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.noSlotBox}>
          <Text style={styles.noSlotText}>You are not assigned to any doctor slots today.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Assigned Doctors Live Queue</Text>
      
      <View style={[styles.grid, isMobile && { flexDirection: 'column' }]}>
        {queues.map(({ slot, bookings }, index) => {
          const waiting = bookings.filter((b: any) => b.status === 'Booked' || b.status === 'Waiting');
          const current = bookings.find((b: any) => b.status === 'Current');

          return (
            <View key={slot.id || index} style={[styles.card, isMobile && { width: '100%' }]}>
              {/* Doctor Details Header */}
              <View style={styles.cardHeader}>
                <View style={styles.docInfoRow}>
                  <Stethoscope color={Colors.light.primary} size={24} />
                  <Text style={styles.docName}>Dr. {slot.doctor_name}</Text>
                </View>
                <View style={styles.badgeRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.badgeText}>{slot.doctor_role || 'Doctor'}</Text>
                  </View>
                  <View style={styles.deptBadge}>
                    <Text style={styles.badgeTextDept}>{slot.doctor_department || 'General'}</Text>
                  </View>
                </View>
              </View>

              {/* Present Consulting */}
              <View style={styles.currentSection}>
                <Text style={styles.sectionLabel}>PRESENT CONSULTING PATIENT</Text>
                {current ? (
                  <View style={styles.currentPatientBox}>
                    <View style={{flex: 1}}>
                      <Text style={styles.currentToken}>#{current.token_number}</Text>
                      <Text style={styles.currentName}>{current.patient_name}</Text>
                    </View>
                    <TouchableOpacity style={styles.completeBtn} onPress={() => updateStatus(current.booking_id, 'Completed')}>
                      <Text style={styles.completeBtnText}>Complete</Text>
                      <CheckCircle color="white" size={16} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No patient in cabin</Text>
                  </View>
                )}
              </View>

              {/* Next in Queue */}
              <View style={styles.queueSection}>
                <Text style={styles.sectionLabel}>NEXT IN QUEUE ({waiting.length})</Text>
                <ScrollView style={styles.scrollList} nestedScrollEnabled={true}>
                  {waiting.length > 0 ? (
                    waiting.map((w: any) => (
                      <View key={w.booking_id} style={styles.waitingItem}>
                        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                          <View style={styles.waitingTokenBadge}>
                            <Text style={styles.waitingTokenText}>#{w.token_number}</Text>
                          </View>
                          <Text style={styles.waitingName}>{w.patient_name}</Text>
                        </View>
                        <TouchableOpacity style={styles.callNextBtn} onPress={() => updateStatus(w.booking_id, 'Current')}>
                          <Text style={styles.callNextBtnText}>Call Next</Text>
                          <ArrowRight color="white" size={16} />
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyQueueText}>Queue is empty</Text>
                  )}
                </ScrollView>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 24 },
  noSlotBox: { backgroundColor: 'white', padding: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  noSlotText: { fontSize: 18, color: '#64748b' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  card: { backgroundColor: 'white', borderRadius: 16, width: 350, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  
  cardHeader: { padding: 20, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  docInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  docName: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginLeft: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  roleBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#4338ca', fontSize: 12, fontWeight: 'bold' },
  deptBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTextDept: { color: '#15803d', fontSize: 12, fontWeight: 'bold' },

  currentSection: { padding: 20, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748b', marginBottom: 12 },
  currentPatientBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  currentToken: { fontSize: 24, fontWeight: 'bold', color: Colors.light.primary, marginRight: 16 },
  currentName: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  emptyBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  emptyText: { color: '#94a3b8', fontStyle: 'italic' },

  queueSection: { padding: 20 },
  scrollList: { maxHeight: 180 },
  waitingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  waitingTokenBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 12 },
  waitingTokenText: { color: '#d97706', fontWeight: 'bold', fontSize: 14 },
  waitingName: { fontSize: 15, color: '#334155', fontWeight: '500' },
  emptyQueueText: { color: '#94a3b8', textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
  
  completeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8 },
  completeBtnText: { color: 'white', fontWeight: 'bold' },
  callNextBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  callNextBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
});
