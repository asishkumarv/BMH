import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../constants/Colors';
import axios from 'axios';
import { useResponsive } from '../../../hooks/useResponsive';
import { Calendar, User, Users, Stethoscope, Save } from 'lucide-react-native';

export default function DoctorDashboard() {
  const { isMobile } = useResponsive();
  const [user, setUser] = useState<any>(null);
  const [currentPatient, setCurrentPatient] = useState<any>(null);
  const [waitingPatients, setWaitingPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState<any>(null);

  // Consultation form state
  const [notes, setNotes] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUserAndQueue = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const u = JSON.parse(userData);
        setUser(u);
        fetchQueue(u.id);
        const interval = setInterval(() => fetchQueue(u.id), 10000);
        return () => clearInterval(interval);
      }
    };
    loadUserAndQueue();
  }, []);

  const fetchQueue = async (doctorId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const resSlots = await axios.get(`https://napi.bharatmedicalhallplus.com/doctors/slots?doctor_id=${doctorId}&date=${today}`);
      
      if (resSlots.data.success && resSlots.data.data.length > 0) {
        const mySlot = resSlots.data.data[0];
        setSlot(mySlot);

        const resBookings = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings?slot_id=${mySlot.id}`);
        const bookings = resBookings.data.data;
        
        const current = bookings.find((b: any) => b.status === 'Current');
        const waiting = bookings.filter((b: any) => b.status === 'Booked' || b.status === 'Waiting');
        
        if (current?.booking_id !== currentPatient?.booking_id) {
          // New patient, reset form
          setCurrentPatient(current || null);
          setNotes('');
          setNextDate('');
        }
        
        setWaitingPatients(waiting);
      } else {
        setSlot(null);
        setCurrentPatient(null);
        setWaitingPatients([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConsultation = async () => {
    if (!notes) {
      alert('Please enter consultation notes');
      return;
    }
    
    setSaving(true);
    try {
      await axios.post('https://napi.bharatmedicalhallplus.com/doctors/consultation', {
        booking_id: currentPatient.booking_id,
        doctor_id: user.id,
        patient_id: currentPatient.patient_id || null, // Might need patient_id in bookings response if foreign key requires it
        notes,
        next_consultation_date: nextDate || null
      });
      
      alert('Consultation saved successfully. The Peon can call the next patient.');
      fetchQueue(user.id);
    } catch (err) {
      alert('Error saving consultation');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back, Dr. {user?.full_name?.split(' ')[0]}</Text>
        <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
      </View>

      <View style={[styles.grid, isMobile && { flexDirection: 'column' }]}>
        <View style={[styles.mainColumn, isMobile && { minWidth: '100%' }]}>
          {currentPatient ? (
            <View style={styles.consultationCard}>
              <View style={[styles.cardHeader, isMobile && { flexDirection: 'column', gap: 16 }]}>
                <View>
                  <Text style={styles.sectionTitle}>Current Consultation</Text>
                  <Text style={styles.patientToken}>Token #{currentPatient.token_number}</Text>
                </View>
                <View style={styles.patientInfoBadge}>
                  <User size={24} color={Colors.light.primary} />
                  <Text style={styles.patientNameBig}>{currentPatient.patient_name}</Text>
                </View>
              </View>

              <View style={styles.detailsBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Blood Group:</Text>
                  <Text style={styles.detailValue}>{currentPatient.blood_group || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reason for Visit:</Text>
                  <Text style={styles.detailValue}>{currentPatient.reason_for_visit || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>City / Pin Code:</Text>
                  <Text style={styles.detailValue}>{(currentPatient.city || 'N/A')} / {(currentPatient.pin_code || 'N/A')}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Guardian:</Text>
                  <Text style={styles.detailValue}>{currentPatient.guardian_name || 'N/A'}</Text>
                </View>
              </View>

              <Text style={styles.label}>Medical Notes & Prescription *</Text>
              <TextInput 
                style={styles.textArea} 
                multiline 
                numberOfLines={8} 
                value={notes} 
                onChangeText={setNotes} 
                placeholder="Type observations, diagnosis, and prescription details here..." 
              />

              <Text style={styles.label}>Next Visit Date (Optional)</Text>
              <TextInput 
                style={styles.input} 
                value={nextDate} 
                onChangeText={setNextDate} 
                placeholder="YYYY-MM-DD" 
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveConsultation} disabled={saving}>
                {saving ? <ActivityIndicator color="white" /> : (
                  <>
                    <Save color="white" size={20} />
                    <Text style={styles.saveBtnText}>Save & Complete Consultation</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.idleCard}>
              <Stethoscope size={64} color="#94a3b8" />
              <Text style={styles.idleTitle}>No Patient Currently In Cabin</Text>
              <Text style={styles.idleDesc}>Your assigned Peon will mark the next patient as 'Current' when they enter your cabin.</Text>
            </View>
          )}
        </View>

        <View style={[styles.sideColumn, isMobile && { minWidth: '100%' }]}>
          <View style={styles.queueCard}>
            <View style={styles.queueHeader}>
              <Text style={styles.queueTitle}>Up Next</Text>
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>{waitingPatients.length}</Text>
              </View>
            </View>
            
            {waitingPatients.length > 0 ? (
              waitingPatients.slice(0, 5).map((p, i) => (
                <View key={i} style={styles.queueItem}>
                  <Text style={styles.queueToken}>#{p.token_number}</Text>
                  <View style={{flex: 1}}>
                    <Text style={styles.queueName} numberOfLines={1}>{p.patient_name}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{color: '#64748b', textAlign: 'center', marginVertical: 20}}>Queue is empty</Text>
            )}
            
            {waitingPatients.length > 5 && (
              <Text style={{color: '#94a3b8', textAlign: 'center', marginTop: 10}}>+{waitingPatients.length - 5} more waiting</Text>
            )}
          </View>

          {slot && (
            <View style={styles.slotInfoCard}>
              <Text style={styles.slotInfoTitle}>Today's Slot Info</Text>
              <View style={styles.slotInfoRow}>
                <Calendar size={16} color="#64748b" />
                <Text style={styles.slotInfoText}>{slot.start_time} - {slot.end_time}</Text>
              </View>
              <View style={styles.slotInfoRow}>
                <Users size={16} color="#64748b" />
                <Text style={styles.slotInfoText}>{slot.total_tokens} Max Tokens</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  header: { marginBottom: 32 },
  welcomeText: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  dateText: { fontSize: 16, color: '#64748b', marginTop: 4 },
  grid: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
  mainColumn: { flex: 2, minWidth: 400 },
  sideColumn: { flex: 1, minWidth: 250 },
  
  idleCard: { backgroundColor: 'white', padding: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  idleTitle: { fontSize: 24, fontWeight: 'bold', color: '#475569', marginTop: 24, marginBottom: 8 },
  idleDesc: { fontSize: 16, color: '#64748b', textAlign: 'center' },
  
  consultationCard: { backgroundColor: 'white', padding: 32, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 5, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 24, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  sectionTitle: { fontSize: 18, color: '#64748b', fontWeight: '600' },
  patientToken: { fontSize: 32, fontWeight: 'bold', color: '#0f172a', marginTop: 4 },
  patientInfoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  patientNameBig: { fontSize: 20, fontWeight: 'bold', color: Colors.light.primary, marginLeft: 12 },
  
  detailsBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  detailRow: { flexDirection: 'row', marginBottom: 8 },
  detailLabel: { width: 130, fontSize: 14, fontWeight: '600', color: '#64748b' },
  detailValue: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '500' },

  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 16 },
  textArea: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 16, color: '#1e293b', minHeight: 200, textAlignVertical: 'top' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 16, color: '#1e293b' },
  
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.primary, padding: 18, borderRadius: 12, marginTop: 32, gap: 12 },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  queueCard: { backgroundColor: 'white', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  queueTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  queueBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  queueBadgeText: { color: '#d97706', fontWeight: 'bold' },
  queueItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  queueToken: { fontSize: 16, fontWeight: 'bold', color: Colors.light.primary, width: 50 },
  queueName: { fontSize: 15, color: '#334155', fontWeight: '500' },
  
  slotInfoCard: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  slotInfoTitle: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 12, textTransform: 'uppercase' },
  slotInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  slotInfoText: { color: '#64748b', fontSize: 14, fontWeight: '500' }
});
