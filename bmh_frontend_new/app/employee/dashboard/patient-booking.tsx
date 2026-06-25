import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Users, Calendar, Clock, HeartPulse, CreditCard } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

export default function PatientBooking() {
  const { isMobile } = useResponsive();
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Booking Form State
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [patientName, setPatientName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [successToken, setSuccessToken] = useState<number | null>(null);

  useEffect(() => {
    const loadUserAndSlots = async () => {
      const userData = await AsyncStorage.getItem('employeeUser');
      if (userData) {
        setUser(JSON.parse(userData));
      }
      
      try {
        const res = await axios.get('https://bmh-eitu.onrender.com/doctors/slots');
        // Only show slots for today or future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const validSlots = res.data.data.filter((s: any) => {
          const slotDate = new Date(s.date);
          return slotDate >= today;
        });
        
        setSlots(validSlots);
      } catch (err) {
        console.error('Failed to load slots', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserAndSlots();
  }, []);

  const handleBooking = async () => {
    if (!patientName || !mobile || !age) {
      alert('Please fill all required fields');
      return;
    }
    
    setBookingLoading(true);
    try {
      const res = await axios.post('https://bmh-eitu.onrender.com/bookings/create', {
        slot_id: selectedSlot.id,
        patient_name: patientName,
        mobile,
        email,
        age: parseInt(age),
        gender,
        booked_by: user.id,
        payment_mode: paymentMode
      });
      
      if (res.data.success) {
        setSuccessToken(res.data.token_number);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSlot(null);
    setPatientName('');
    setMobile('');
    setEmail('');
    setAge('');
    setSuccessToken(null);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (successToken) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={[styles.successCard, isMobile && { width: '100%' }]}>
          <View style={styles.successIconWrapper}>
            <CheckCircle size={48} color="#10b981" />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>Patient Token Number</Text>
          <Text style={styles.tokenNumber}>#{successToken}</Text>
          
          <View style={styles.detailsBox}>
            <Text style={styles.detailText}>Doctor: {selectedSlot.doctor_name}</Text>
            <Text style={styles.detailText}>Time: {selectedSlot.start_time}</Text>
            <Text style={styles.detailText}>Patient: {patientName}</Text>
          </View>
          
          <TouchableOpacity style={styles.btn} onPress={resetForm}>
            <Text style={styles.btnText}>Book Another Patient</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Patient Booking</Text>
      
      {!selectedSlot ? (
        <View>
          <Text style={styles.sectionTitle}>Select an Available Slot</Text>
          <View style={styles.grid}>
            {slots.map((s, i) => (
              <TouchableOpacity key={i} style={[styles.slotCard, isMobile && { width: '100%' }]} onPress={() => setSelectedSlot(s)}>
                <View style={styles.slotHeader}>
                  <Text style={styles.doctorName}>{s.doctor_name}</Text>
                  <Text style={styles.feeText}>₹{s.fee}</Text>
                </View>
                <View style={styles.slotDetails}>
                  <View style={styles.slotDetailRow}>
                    <Calendar size={16} color="#64748b" />
                    <Text style={styles.slotDetailText}>{new Date(s.date).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.slotDetailRow}>
                    <Clock size={16} color="#64748b" />
                    <Text style={styles.slotDetailText}>{s.start_time} - {s.end_time}</Text>
                  </View>
                  <View style={styles.slotDetailRow}>
                    <Users size={16} color="#64748b" />
                    <Text style={styles.slotDetailText}>Max Tokens: {s.total_tokens}</Text>
                  </View>
                </View>
                <View style={styles.selectBtn}>
                  <Text style={styles.selectBtnText}>Select Slot</Text>
                </View>
              </TouchableOpacity>
            ))}
            {slots.length === 0 && <Text style={{color: '#64748b'}}>No slots available for booking.</Text>}
          </View>
        </View>
      ) : (
        <View style={styles.formCard}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedSlot(null)}>
            <Text style={styles.backBtnText}>← Back to Slots</Text>
          </TouchableOpacity>
          
          <View style={styles.selectedSlotBanner}>
            <Text style={styles.bannerTitle}>Booking Appointment With</Text>
            <Text style={styles.bannerDoctor}>Dr. {selectedSlot.doctor_name}</Text>
            <Text style={styles.bannerTime}>{new Date(selectedSlot.date).toLocaleDateString()} at {selectedSlot.start_time}</Text>
          </View>
          
          <Text style={styles.formLabel}>Patient Full Name *</Text>
          <TextInput style={styles.input} value={patientName} onChangeText={setPatientName} placeholder="Enter patient name" />
          
          <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
            <View style={{flex: 1, marginRight: isMobile ? 0 : 10, marginBottom: isMobile ? 16 : 0}}>
              <Text style={styles.formLabel}>Mobile Number *</Text>
              <TextInput style={styles.input} value={mobile} onChangeText={setMobile} placeholder="Enter mobile" keyboardType="phone-pad" />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.formLabel}>Age *</Text>
              <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="Age" keyboardType="numeric" />
            </View>
          </View>
          
          <Text style={styles.formLabel}>Email Address (Optional)</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter email" keyboardType="email-address" />
          
          <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
            <View style={{flex: 1, marginRight: isMobile ? 0 : 10, marginBottom: isMobile ? 16 : 0}}>
              <Text style={styles.formLabel}>Gender</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, gender === 'Male' && styles.toggleBtnActive]} onPress={() => setGender('Male')}>
                  <Text style={[styles.toggleText, gender === 'Male' && styles.toggleTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, gender === 'Female' && styles.toggleBtnActive]} onPress={() => setGender('Female')}>
                  <Text style={[styles.toggleText, gender === 'Female' && styles.toggleTextActive]}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.formLabel}>Payment Mode</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, paymentMode === 'Cash' && styles.toggleBtnActive]} onPress={() => setPaymentMode('Cash')}>
                  <Text style={[styles.toggleText, paymentMode === 'Cash' && styles.toggleTextActive]}>Cash</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, paymentMode === 'Online' && styles.toggleBtnActive]} onPress={() => setPaymentMode('Online')}>
                  <Text style={[styles.toggleText, paymentMode === 'Online' && styles.toggleTextActive]}>Online</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Payment Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Consultation Fee</Text>
              <Text style={styles.summaryValue}>₹{selectedSlot.fee}</Text>
            </View>
            <View style={[styles.summaryRow, {borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 10, marginTop: 10}]}>
              <Text style={[styles.summaryLabel, {fontWeight: 'bold'}]}>Total Payable</Text>
              <Text style={[styles.summaryValue, {fontWeight: 'bold', color: '#10b981'}]}>₹{selectedSlot.fee}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.confirmBtn} onPress={handleBooking} disabled={bookingLoading}>
            {bookingLoading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>Confirm Booking & Collect ₹{selectedSlot.fee}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#334155', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  slotCard: { width: 300, backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#e2e8f0' },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  doctorName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  feeText: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
  slotDetails: { gap: 8, marginBottom: 16 },
  slotDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotDetailText: { fontSize: 14, color: '#64748b' },
  selectBtn: { backgroundColor: '#eff6ff', padding: 10, borderRadius: 8, alignItems: 'center' },
  selectBtnText: { color: Colors.light.primary, fontWeight: '600' },
  
  formCard: { backgroundColor: 'white', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  backBtn: { marginBottom: 16 },
  backBtnText: { color: Colors.light.primary, fontWeight: '600' },
  selectedSlotBanner: { backgroundColor: '#eff6ff', padding: 16, borderRadius: 12, marginBottom: 24 },
  bannerTitle: { fontSize: 12, color: '#3b82f6', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 4 },
  bannerDoctor: { fontSize: 20, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 4 },
  bannerTime: { fontSize: 14, color: '#2563eb' },
  
  formLabel: { fontSize: 14, fontWeight: '500', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 16, color: '#1e293b', marginBottom: 16 },
  row: { flexDirection: 'row', marginBottom: 16 },
  
  toggleRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 8, padding: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  toggleTextActive: { color: '#0f172a', fontWeight: 'bold' },
  
  summaryBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginTop: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#64748b' },
  summaryValue: { fontSize: 14, color: '#0f172a' },
  
  confirmBtn: { backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  successCard: { backgroundColor: 'white', padding: 40, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, width: 400 },
  successIconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  tokenNumber: { fontSize: 48, fontWeight: 'bold', color: '#10b981', marginBottom: 24 },
  detailsBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, width: '100%', marginBottom: 24 },
  detailText: { fontSize: 15, color: '#334155', marginBottom: 8 },
  btn: { backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
