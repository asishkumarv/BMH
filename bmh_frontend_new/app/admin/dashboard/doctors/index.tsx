import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { Users, Calendar, DollarSign, ListOrdered, CheckCircle, XCircle } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../../constants/Colors';

const TABS = ['Doctors', 'Slots', 'Bookings', 'Revenue'];

export default function DoctorManagement() {
  const [activeTab, setActiveTab] = useState('Doctors');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'Doctors') {
        const res = await axios.get('https://bmh-eitu.onrender.com/doctors');
        setDoctors(res.data.data);
      } else if (activeTab === 'Slots') {
        const res = await axios.get('https://bmh-eitu.onrender.com/doctors/slots');
        setSlots(res.data.data);
      } else if (activeTab === 'Bookings') {
        const res = await axios.get('https://bmh-eitu.onrender.com/bookings');
        setBookings(res.data.data);
      } else if (activeTab === 'Revenue') {
        const res = await axios.get('https://bmh-eitu.onrender.com/bookings/revenue');
        setRevenue(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approveDoctor = async (id: string, status: string) => {
    try {
      await axios.put(`https://bmh-eitu.onrender.com/doctors/${id}/approve`, { status });
      fetchData();
    } catch (err) {
      alert('Error updating status');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Doctor Management</Text>
      
      <View style={styles.tabContainer}>
        {TABS.map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 50 }} />
        ) : (
          <View>
            {activeTab === 'Doctors' && (
              <View style={styles.card}>
                <View style={styles.tableRowHeader}>
                  <Text style={[styles.tableCellHeader, {flex: 0.5}]}>ID</Text>
                  <Text style={styles.tableCellHeader}>Name</Text>
                  <Text style={styles.tableCellHeader}>Department</Text>
                  <Text style={styles.tableCellHeader}>Role/Exp</Text>
                  <Text style={styles.tableCellHeader}>Status</Text>
                  <Text style={styles.tableCellHeader}>Actions</Text>
                </View>
                {doctors.map((d, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>{d.id}</Text>
                    <View style={styles.tableCell}>
                      <Text style={{fontWeight: '500'}}>{d.full_name}</Text>
                      <Text style={{fontSize: 12, color: '#64748b'}}>{d.email}</Text>
                    </View>
                    <Text style={styles.tableCell}>{d.department}</Text>
                    <View style={styles.tableCell}>
                      <Text>{d.role}</Text>
                      <Text style={{fontSize: 12, color: '#64748b'}}>{d.experience} Yrs</Text>
                    </View>
                    <Text style={[styles.tableCell, {color: d.status === 'Approved' ? '#10b981' : '#f59e0b', fontWeight: 'bold'}]}>
                      {d.status}
                    </Text>
                    <View style={[styles.tableCell, {flexDirection: 'row', gap: 10}]}>
                      {d.status === 'Pending' && (
                        <>
                          <TouchableOpacity onPress={() => approveDoctor(d.id, 'Approved')}>
                            <CheckCircle color="#10b981" size={20} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => approveDoctor(d.id, 'Rejected')}>
                            <XCircle color="#ef4444" size={20} />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                ))}
                {doctors.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No doctors found.</Text>}
              </View>
            )}

            {activeTab === 'Slots' && (
              <View style={styles.card}>
                <View style={styles.tableRowHeader}>
                  <Text style={styles.tableCellHeader}>Date</Text>
                  <Text style={styles.tableCellHeader}>Doctor</Text>
                  <Text style={styles.tableCellHeader}>Time</Text>
                  <Text style={styles.tableCellHeader}>Tokens/Fee</Text>
                  <Text style={styles.tableCellHeader}>Assigned Peon</Text>
                </View>
                {slots.map((s, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{new Date(s.date).toLocaleDateString()}</Text>
                    <Text style={styles.tableCell}>{s.doctor_name}</Text>
                    <Text style={styles.tableCell}>{s.start_time} - {s.end_time}</Text>
                    <Text style={styles.tableCell}>{s.total_tokens} tokens / ₹{s.fee}</Text>
                    <Text style={styles.tableCell}>{s.peon_name || 'Unassigned'}</Text>
                  </View>
                ))}
                {slots.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No slots found.</Text>}
              </View>
            )}

            {activeTab === 'Bookings' && (
              <View style={styles.card}>
                <View style={styles.tableRowHeader}>
                  <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Token</Text>
                  <Text style={styles.tableCellHeader}>Patient</Text>
                  <Text style={styles.tableCellHeader}>Doctor & Slot</Text>
                  <Text style={styles.tableCellHeader}>Payment</Text>
                  <Text style={styles.tableCellHeader}>Booked By</Text>
                  <Text style={styles.tableCellHeader}>Status</Text>
                </View>
                {bookings.map((b, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>#{b.token_number}</Text>
                    <View style={styles.tableCell}>
                      <Text style={{fontWeight: '500'}}>{b.patient_name}</Text>
                      <Text style={{fontSize: 12, color: '#64748b'}}>{b.mobile}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text>{b.doctor_name}</Text>
                      <Text style={{fontSize: 12, color: '#64748b'}}>{new Date(b.date).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.tableCell}>{b.payment_mode}</Text>
                    <Text style={styles.tableCell}>{b.booked_by_name || 'Self'}</Text>
                    <Text style={styles.tableCell}>{b.status}</Text>
                  </View>
                ))}
                {bookings.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No bookings found.</Text>}
              </View>
            )}

            {activeTab === 'Revenue' && (
              <View style={styles.card}>
                <View style={styles.tableRowHeader}>
                  <Text style={styles.tableCellHeader}>Date</Text>
                  <Text style={styles.tableCellHeader}>Department</Text>
                  <Text style={styles.tableCellHeader}>Payment Mode</Text>
                  <Text style={styles.tableCellHeader}>Total Bookings</Text>
                  <Text style={styles.tableCellHeader}>Total Amount</Text>
                </View>
                {revenue.map((r, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{new Date(r.date).toLocaleDateString()}</Text>
                    <Text style={styles.tableCell}>{r.department}</Text>
                    <Text style={styles.tableCell}>{r.payment_mode}</Text>
                    <Text style={styles.tableCell}>{r.total_bookings}</Text>
                    <Text style={[styles.tableCell, {fontWeight: 'bold', color: '#10b981'}]}>₹{r.total_amount}</Text>
                  </View>
                ))}
                {revenue.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No revenue data found.</Text>}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 24 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#e2e8f0', padding: 4, borderRadius: 12, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: Colors.light.primary },
  content: { flex: 1 },
  card: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 16, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tableRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  tableCellHeader: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#475569' },
  tableCell: { flex: 1, fontSize: 14, color: '#334155' },
});
