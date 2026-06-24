import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, Image } from 'react-native';
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
      let userStr = null;
      if (Platform.OS === 'web') {
        userStr = localStorage.getItem('employeeUser');
      } else {
        userStr = await AsyncStorage.getItem('employeeUser');
      }
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user || !user.id) return;

      const res = await axios.get(`https://bmh-eitu.onrender.com/attendance/reports?employeeId=${user.id}`);
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
            <Text style={[styles.tableCellHeader, { flex: 0.5 }]}>In</Text>
            <Text style={styles.tableCellHeader}>Date</Text>
            <Text style={styles.tableCellHeader}>Check In</Text>
            <Text style={styles.tableCellHeader}>Check Out</Text>
            <Text style={[styles.tableCellHeader, { flex: 2 }]}>Breaks</Text>
            <Text style={styles.tableCellHeader}>Status</Text>
          </View>
          {reports.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: Colors.light.icon }}>No attendance records found.</Text>
            </View>
          ) : reports.map((r, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={[styles.tableCell, {flex: 0.5, flexDirection: 'row'}]}>
                 {r.check_in_image ? <Image source={{uri: r.check_in_image}} style={styles.thumb} /> : <View style={styles.thumbPlaceholder} />}
                 {r.check_out_image ? <Image source={{uri: r.check_out_image}} style={[styles.thumb, {marginLeft: -10}]} /> : null}
              </View>
              <Text style={styles.tableCell}>{new Date(r.date).toLocaleDateString()}</Text>
              <Text style={styles.tableCell}>{r.check_in ? new Date(r.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</Text>
              <Text style={styles.tableCell}>{r.check_out ? new Date(r.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</Text>
              <View style={[styles.tableCell, { flex: 2 }]}>
                {r.breaks && r.breaks.length > 0 ? (
                  r.breaks.map((b: any, bi: number) => (
                    <Text key={bi} style={{ fontSize: 12, color: Colors.light.icon }}>
                      {b.break_type}: {new Date(b.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  ))
                ) : (
                  <Text style={{ fontSize: 12, color: Colors.light.icon }}>-</Text>
                )}
              </View>
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
  tableRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: Colors.light.border, alignItems: 'center' },
  tableCellHeader: { flex: 1, fontWeight: 'bold', color: Colors.light.text },
  tableCell: { flex: 1, color: Colors.light.icon, justifyContent: 'center' },
  thumb: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'white' },
  thumbPlaceholder: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e5e7eb', borderWidth: 2, borderColor: 'white' }
});
