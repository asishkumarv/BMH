import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Download, MapPin } from 'lucide-react-native';

const MapPicker = ({ lat, lng }: any) => {
  if (Platform.OS === 'web') {
    return (
      <iframe 
        srcDoc={`
          <!DOCTYPE html>
          <html>
            <head>
              <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
              <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
              <style>body, html, #map { height: 100%; margin: 0; padding: 0; }</style>
            </head>
            <body>
              <div id="map"></div>
              <script>
                var map = L.map('map').setView([${lat || 20.5937}, ${lng || 78.9629}], ${lat ? 15 : 5});
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                var marker = ${lat ? `L.marker([${lat}, ${lng}]).addTo(map)` : 'null'};
                map.on('click', function(e) {
                  if(marker) map.removeLayer(marker);
                  marker = L.marker(e.latlng).addTo(map);
                  window.parent.postMessage(JSON.stringify({ type: 'map-click', lat: e.latlng.lat, lng: e.latlng.lng }), '*');
                });
              </script>
            </body>
          </html>
        `}
        style={{ width: '100%', height: 300, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, marginTop: 15 }}
      />
    );
  }
  return <Text style={{marginTop: 10, color: '#6b7280'}}>Map selection not supported on native without extra packages. Please enter coordinates manually.</Text>;
};

export default function SubAdminAttendanceDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  
  // Config state
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('2000');
  const [userDept, setUserDept] = useState('');

  useEffect(() => {
    fetchData();

    if (Platform.OS === 'web') {
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'map-click') {
            setLat(data.lat.toString());
            setLng(data.lng.toString());
          }
        } catch (e) {}
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) return;
      
      setUserDept(user.department);

      const sumRes = await axios.get(`https://bmh-eitu.onrender.com/attendance/summary?department=${user.department}`);
      if (sumRes.data.success) {
        setSummary(sumRes.data.summary);
      }
      
      const repRes = await axios.get(`https://bmh-eitu.onrender.com/attendance/reports?department=${user.department}`);
      if (repRes.data.success) {
        setReports(repRes.data.data);
      }

      const deptRes = await axios.get('https://bmh-eitu.onrender.com/department');
      if (deptRes.data.success) {
        const dept = deptRes.data.data.find((d: any) => d.name === user.department);
        if (dept) {
           setLat(dept.allowed_latitude ? dept.allowed_latitude.toString() : '');
           setLng(dept.allowed_longitude ? dept.allowed_longitude.toString() : '');
           setRadius(dept.allowed_radius ? dept.allowed_radius.toString() : '2000');
        }
      }
    } catch (err) {
      console.log('Error fetching subadmin attendance data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!userDept || !lat || !lng || !radius) {
      Alert.alert("Error", "Please fill all fields and select a location on the map.");
      return;
    }
    try {
      const res = await axios.post('https://bmh-eitu.onrender.com/department/location', {
        name: userDept,
        lat,
        lng,
        radius
      });
      if (res.data.success) {
        Alert.alert("Success", `Department ${userDept} location updated to Lat: ${lat}, Lng: ${lng}, Radius: ${radius}m`);
      } else {
        Alert.alert("Error", "Failed to update location.");
      }
    } catch (err) {
      Alert.alert("Error", "Server error while updating location.");
    }
  };

  const handleExportCSV = () => {
    if (reports.length === 0) return;
    const headers = ["ID", "Employee ID", "Name", "Date", "Check In", "Check Out", "Status", "Late Duration"];
    const csvRows = [headers.join(',')];
    reports.forEach(r => {
      csvRows.push([r.id, r.employee_id, r.full_name, r.date, r.check_in, r.check_out, r.status, r.late_duration].join(','));
    });
    const csvString = csvRows.join('\\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `attendance_${userDept}.csv`);
    a.click();
  };

  if (loading) {
    return <View style={{flex: 1, justifyContent: 'center', alignItems:'center'}}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{userDept} Attendance</Text>
      
      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.card, {backgroundColor: '#E3F2FD'}]}>
          <Text style={styles.cardValue}>{summary?.total_employees || 0}</Text>
          <Text style={styles.cardLabel}>Dept Employees</Text>
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
      <View style={[styles.section, {zIndex: 1000}]}>
        <Text style={styles.sectionTitle}>Configure {userDept} Location</Text>
        <Text style={{color: '#6b7280', marginBottom: 15}}>Tap on the map to set the geofence boundaries for your department.</Text>

        <View style={styles.inputRow}>
          <View style={[styles.input, {flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 150}]}>
            <TextInput 
              style={[{flex: 1}, Platform.OS === 'web' && {outlineStyle: 'none'} as any]}
              placeholder="Radius" 
              value={radius} 
              onChangeText={setRadius} 
              keyboardType="numeric" 
            />
            <Text style={{color: '#6b7280', marginLeft: 8, fontWeight: '500'}}>meters</Text>
          </View>
        </View>
        
        <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
          <View style={[styles.input, {backgroundColor: '#f3f4f6', flex: 1, flexDirection: 'row', alignItems: 'center'}]}>
             <MapPin size={16} color="#6b7280" style={{marginRight: 8}} />
             <Text style={{color: '#6b7280'}}>{lat ? `Lat: ${Number(lat).toFixed(6)}` : 'Latitude'}</Text>
          </View>
          <View style={[styles.input, {backgroundColor: '#f3f4f6', flex: 1, flexDirection: 'row', alignItems: 'center'}]}>
             <MapPin size={16} color="#6b7280" style={{marginRight: 8}} />
             <Text style={{color: '#6b7280'}}>{lng ? `Lng: ${Number(lng).toFixed(6)}` : 'Longitude'}</Text>
          </View>
        </View>

        <MapPicker lat={lat} lng={lng} />

        <TouchableOpacity style={styles.button} onPress={handleUpdateConfig}>
          <Text style={styles.buttonText}>Save Configuration</Text>
        </TouchableOpacity>
      </View>

      {/* Reports Section */}
      <View style={[styles.section, {zIndex: 1}]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Department Reports</Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
            <Download size={20} color="white" />
            <Text style={styles.buttonText}> Export CSV</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.table}>
          <View style={styles.tableRowHeader}>
            <Text style={styles.tableCellHeader}>Name</Text>
            <Text style={styles.tableCellHeader}>Check In</Text>
            <Text style={styles.tableCellHeader}>Status</Text>
          </View>
          {reports.slice(0, 10).map((r, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableCell}>{r.full_name}</Text>
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
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#111827', textTransform: 'capitalize' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 30 },
  card: { flex: 1, minWidth: 150, padding: 20, borderRadius: 12, alignItems: 'center' },
  cardValue: { fontSize: 32, fontWeight: 'bold', color: '#1f2937' },
  cardLabel: { fontSize: 14, color: '#4b5563', marginTop: 5 },
  section: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  inputRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  input: { flex: 1, minWidth: 120, borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 6, backgroundColor: 'white' },
  button: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  exportButton: { flexDirection: 'row', backgroundColor: '#10b981', padding: 10, borderRadius: 6, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  tableCellHeader: { flex: 1, fontWeight: 'bold', color: '#374151' },
  tableCell: { flex: 1, color: '#4b5563' }
});
