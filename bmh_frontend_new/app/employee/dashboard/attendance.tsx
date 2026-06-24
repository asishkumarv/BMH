import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../constants/Colors';

export default function EmployeeAttendanceHistory() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) return;

      const res = await axios.get(`http://localhost:5000/attendance/reports?employeeId=${user.id}`);
      if (res.data.success) {
        setReports(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching history', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={{flex: 1, justifyContent: 'center', alignItems:'center'}}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>My Attendance History</Text>

      <View style={styles.section}>
        <View style={styles.table}>
          <View style={styles.tableRowHeader}>
            <Text style={styles.tableCellHeader}>Date</Text>
            <Text style={styles.tableCellHeader}>Check In</Text>
            <Text style={styles.tableCellHeader}>Check Out</Text>
            <Text style={styles.tableCellHeader}>Status</Text>
          </View>
          {reports.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: Colors.light.icon }}>No attendance records found.</Text>
            </View>
          ) : reports.map((r, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableCell}>{new Date(r.date).toLocaleDateString()}</Text>
              <Text style={styles.tableCell}>{new Date(r.check_in).toLocaleTimeString()}</Text>
              <Text style={styles.tableCell}>{r.check_out ? new Date(r.check_out).toLocaleTimeString() : '-'}</Text>
              <Text style={styles.tableCell}>{r.status}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: Colors.light.background },
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: Colors.light.text },
  section: { backgroundColor: 'white', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, overflow: 'hidden' },
  table: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, overflow: 'hidden' },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 16, borderBottomWidth: 1, borderColor: Colors.light.border },
  tableRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: Colors.light.border },
  tableCellHeader: { flex: 1, fontWeight: 'bold', color: Colors.light.text },
  tableCell: { flex: 1, color: Colors.light.icon }
});
