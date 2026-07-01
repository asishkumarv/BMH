import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { Search, UserCheck, Stethoscope, Activity } from 'lucide-react-native';

export default function CheckInPatientScreen() {
  const { isMobile } = useResponsive();
  const [user, setUser] = useState<any>(null);
  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [doctorsList, setDoctorsList] = useState<any[]>([]);

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
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/employee/doctor-slots-bookings/${empId}`);
      if (res.data.success) {
        setQueues(res.data.data);
        
        // Extract unique doctors for the filter dropdown
        const docs = Array.from(new Set(res.data.data.map((q: any) => q.slot.doctor_name)));
        setDoctorsList(docs);
      }
    } catch (err) {
      console.log("Error fetching queues:", err);
    } finally {
      setLoading(false);
    }
  };

  const markInHospital = async (bookingId: number) => {
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/${bookingId}/status`, { status: 'Waiting' });
      fetchQueues(user.id);
    } catch (err) {
      console.error(err);
      alert('Failed to mark patient as in-hospital');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  // Flatten all 'Booked' tokens from all queues
  let bookedTokens: any[] = [];
  queues.forEach(q => {
    const booked = q.bookings.filter((b: any) => b.status === 'Booked');
    bookedTokens = bookedTokens.concat(booked.map((b: any) => ({
      ...b,
      doctor_name: q.slot.doctor_name,
      doctor_department: q.slot.doctor_department
    })));
  });

  // Apply filters
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    bookedTokens = bookedTokens.filter(b => 
      b.patient_name?.toLowerCase().includes(q) || 
      b.token_number?.toString().includes(q) ||
      b.mobile?.includes(q)
    );
  }
  
  if (doctorFilter) {
    bookedTokens = bookedTokens.filter(b => b.doctor_name === doctorFilter);
  }

  return (
    <ScrollView style={[styles.container, isMobile && { padding: 16 }]}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>In-Hospital Check-In</Text>
        <Text style={styles.subtitle}>Mark arrived patients so they appear on the Live Queue</Text>
      </View>

      <View style={[styles.searchSection, isMobile && { flexDirection: 'column' }]}>
        <View style={styles.searchBox}>
          <Search color="#94a3b8" size={20} />
          <TextInput 
            style={[styles.searchInput, { outlineStyle: 'none' } as any]}
            placeholder="Search Token No. or Patient Name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterBox}>
          <Stethoscope color="#94a3b8" size={20} />
          <select 
            style={Object.assign({}, styles.selectInput, { border: 'none', outline: 'none' }) as any}
            value={doctorFilter}
            onChange={(e: any) => setDoctorFilter(e.target.value)}
          >
            <option value="">All Doctors</option>
            {doctorsList.map((doc: any) => (
              <option key={doc} value={doc}>Dr. {doc}</option>
            ))}
          </select>
        </View>
      </View>

      {bookedTokens.length > 0 ? (
        <View style={[styles.grid, isMobile && { flexDirection: 'column' }]}>
          {bookedTokens.map((token) => (
            <View key={token.booking_id} style={[styles.card, isMobile && { width: '100%' }]}>
              <View style={styles.cardTop}>
                <View style={styles.tokenBadge}>
                  <Text style={styles.tokenNumber}>#{token.token_number}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.patientName}>{token.patient_name}</Text>
                  <Text style={styles.mobile}>{token.mobile || 'No Mobile'}</Text>
                </View>
              </View>
              
              <View style={styles.cardMid}>
                <Stethoscope color="#64748b" size={16} />
                <Text style={styles.docName}>Dr. {token.doctor_name}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.checkInBtn}
                onPress={() => markInHospital(token.booking_id)}
              >
                <UserCheck color="white" size={18} />
                <Text style={styles.checkInBtnText}>In Hospital</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Activity color="#cbd5e1" size={48} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>No pending tokens found.</Text>
          <Text style={styles.emptySubText}>All booked tokens have checked in or none exist.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: '#f8fafc' },
  header: { marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 4 },
  
  searchSection: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  searchBox: { flex: 2, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', height: 50 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16 },
  
  filterBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', height: 50 },
  selectInput: { flex: 1, marginLeft: 12, fontSize: 16, backgroundColor: 'transparent' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 20, width: '31%', minWidth: 300, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#e2e8f0' },
  
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  tokenBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  tokenNumber: { fontSize: 24, fontWeight: 'bold', color: '#1d4ed8' },
  patientName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  mobile: { fontSize: 14, color: '#64748b', marginTop: 2 },
  
  cardMid: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 20 },
  docName: { marginLeft: 8, fontSize: 15, fontWeight: '600', color: '#334155' },
  
  checkInBtn: { flexDirection: 'row', backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
  checkInBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 20, fontWeight: '600', color: '#64748b' },
  emptySubText: { fontSize: 15, color: '#94a3b8', marginTop: 8 }
});
