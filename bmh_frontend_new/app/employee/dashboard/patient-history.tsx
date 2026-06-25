import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { Search, Filter, Calendar } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';

export default function PatientHistoryEmployee() {
  const { isMobile } = useResponsive();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('role', 'Employee');
      
      if (name) params.append('name', name);
      if (email) params.append('email', email);
      if (phone) params.append('phone', phone);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await axios.get(`https://bmh-eitu.onrender.com/doctors/patient-history?${params.toString()}`);
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching patient history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Patient Directory & Appointments</Text>
      
      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}><Filter size={18} color={Colors.light.text} /> Filter Records</Text>
        <View style={styles.filterGrid}>
          <TextInput style={styles.input} placeholder="Patient Name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} />
          <TextInput style={styles.input} placeholder="Start Date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
          <TextInput style={styles.input} placeholder="End Date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={fetchHistory}>
          <Search size={18} color="white" />
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : history.length === 0 ? (
        <Text style={styles.emptyText}>No records found matching your filters.</Text>
      ) : (
        history.map((record, index) => (
          <View key={index} style={styles.recordCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.patientName}>{record.name}</Text>
                <Text style={styles.patientInfo}>Age: {record.age} | Gender: {record.gender} | Phone: {record.mobile}</Text>
              </View>
              <View style={styles.dateBox}>
                <Text style={styles.dateText}>{new Date(record.consultation_date).toLocaleDateString()}</Text>
              </View>
            </View>

            <View style={styles.doctorInfo}>
              <Text style={styles.doctorText}>Consulted by: Dr. {record.doctor_name} ({record.doctor_department})</Text>
            </View>

            {record.next_consultation_date && (
              <View style={styles.nextDateBox}>
                <Calendar size={16} color="#059669" />
                <Text style={styles.nextDateText}>Next Visit Scheduled: {new Date(record.next_consultation_date).toLocaleDateString()}</Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: Colors.light.background },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20, color: Colors.light.text },
  filterCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: Colors.light.border },
  filterTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  input: { flex: 1, minWidth: 200, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12 },
  searchBtn: { backgroundColor: Colors.light.primary, padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  searchBtnText: { color: 'white', fontWeight: '600', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 40, fontSize: 16 },
  recordCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  patientName: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  patientInfo: { fontSize: 14, color: '#64748b', marginTop: 4, flexWrap: 'wrap' },
  dateBox: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  dateText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  doctorInfo: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, marginBottom: 16 },
  doctorText: { color: '#1d4ed8', fontWeight: '500' },
  nextDateBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ecfdf5', padding: 12, borderRadius: 8 },
  nextDateText: { color: '#059669', fontWeight: '600' }
});
