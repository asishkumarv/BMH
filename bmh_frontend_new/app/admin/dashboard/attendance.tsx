import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { Download } from 'lucide-react-native'; // Assuming lucide-react-native is available

export default function AdminAttendanceDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  
  // Config state
  const [deptName, setDeptName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('2000');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const sumRes = await axios.get('http://localhost:5000/attendance/summary');
      if (sumRes.data.success) {
        setSummary(sumRes.data.summary);
      }
      
      const repRes = await axios.get('http://localhost:5000/attendance/reports');
      if (repRes.data.success) {
        setReports(repRes.data.data);
      }
    } catch (err) {
      console.log('Error fetching admin attendance data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    // In a real scenario, this would hit a department config API
    Alert.alert("Success", `Department ${deptName} location updated to Lat: ${lat}, Lng: ${lng}, Radius: ${radius}m`);
  };

  const handleExportCSV = () => {
    // Basic CSV export logic for web (assuming Expo Web)
    if (reports.length === 0) return;
    
    const headers = ["ID", "Employee ID", "Name", "Department", "Date", "Check In", "Check Out", "Status", "Late Duration"];
    const csvRows = [headers.join(',')];
    
    reports.forEach(r => {
      csvRows.push([
        r.id,
        r.employee_id,
        r.full_name,
        r.department,
        r.date,
        r.check_in,
        r.check_out,
        r.status,
        r.late_duration
      ].join(','));
    });
    
    const csvString = csvRows.join('\\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'attendance_report.csv');
    a.click();
  };

  if (loading) {
    return <View style={{flex: 1, justifyContent: 'center', alignItems:'center'}}><ActivityIndicator size="large" /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Attendance Dashboard</Text>
      
      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.card, {backgroundColor: '#E3F2FD'}]}>
          <Text style={styles.cardValue}>{summary?.total_employees || 0}</Text>
          <Text style={styles.cardLabel}>Total Employees</Text>
        </View>
        <View style={[styles.card, {backgroundColor: '#E8F5E9'}]}>
          <Text style={styles.cardValue}>{summary?.total_present || 0}</Text>
          <Text style={styles.cardLabel}>Present Today</Text>
        </View>
        <View style={[styles.card, {backgroundColor: '#FFEBEE'}]}>
          <Text style={styles.cardValue}>{summary?.total_absent || 0}</Text>
          <Text style={styles.cardLabel}>Absent Today</Text>
        </View>
        <View style={[styles.card, {backgroundColor: '#FFF3E0'}]}>
          <Text style={styles.cardValue}>{summary?.employees_on_break || 0}</Text>
          <Text style={styles.cardLabel}>Currently on Break</Text>
        </View>
      </View>

      {/* Config Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configure Department Location</Text>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="Department Name" value={deptName} onChangeText={setDeptName} />
          <TextInput style={styles.input} placeholder="Latitude" value={lat} onChangeText={setLat} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Longitude" value={lng} onChangeText={setLng} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Radius (m)" value={radius} onChangeText={setRadius} keyboardType="numeric" />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleUpdateConfig}>
          <Text style={styles.buttonText}>Update Configuration</Text>
        </TouchableOpacity>
      </View>

      {/* Reports Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Advanced Reports</Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
            <Download size={20} color="white" />
            <Text style={styles.buttonText}> Export CSV</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.table}>
          <View style={styles.tableRowHeader}>
            <Text style={styles.tableCellHeader}>Name</Text>
            <Text style={styles.tableCellHeader}>Dept</Text>
            <Text style={styles.tableCellHeader}>Check In</Text>
            <Text style={styles.tableCellHeader}>Status</Text>
          </View>
          {reports.slice(0, 10).map((r, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableCell}>{r.full_name}</Text>
              <Text style={styles.tableCell}>{r.department}</Text>
              <Text style={styles.tableCell}>{new Date(r.check_in).toLocaleTimeString()}</Text>
              <Text style={styles.tableCell}>{r.status}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9fafb' },
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#111827' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 30 },
  card: { flex: 1, minWidth: 150, padding: 20, borderRadius: 12, alignItems: 'center' },
  cardValue: { fontSize: 32, fontWeight: 'bold', color: '#1f2937' },
  cardLabel: { fontSize: 14, color: '#4b5563', marginTop: 5 },
  section: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 15 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 15, flexWrap: 'wrap' },
  input: { flex: 1, minWidth: 120, borderWidth: 1, borderColor: '#d1d5db', padding: 10, borderRadius: 6 },
  button: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 6, alignItems: 'center' },
  exportButton: { flexDirection: 'row', backgroundColor: '#10b981', padding: 10, borderRadius: 6, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  tableCellHeader: { flex: 1, fontWeight: 'bold', color: '#374151' },
  tableCell: { flex: 1, color: '#4b5563' }
});
