import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Download, MapPin, ChevronDown, ChevronUp } from 'lucide-react-native';
import EmployeeAnalyticsModal from '../../../components/EmployeeAnalyticsModal';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

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
  const { isDesktop } = useResponsive();
  const formatMins = (mins: number) => {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Config state
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('2000');
  const [showConfig, setShowConfig] = useState(false);
  const [userDept, setUserDept] = useState('');
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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

  const fetchData = async (forceClear = false) => {
    setLoading(true);
    try {
      const userStr = Platform.OS === 'web' ? localStorage.getItem('subAdminUser') : await AsyncStorage.getItem('subAdminUser');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) return;
      
      let deptName = user.department;
      
      const deptRes = await axios.get('https://bmh-eitu.onrender.com/department');
      if (deptRes.data.success) {
        const dept = deptRes.data.data.find((d: any) => d.id === user.department_id || d.name === user.department);
        if (dept) {
           deptName = dept.name;
           setUserDept(dept.name);
           setLat(dept.allowed_latitude ? dept.allowed_latitude.toString() : '');
           setLng(dept.allowed_longitude ? dept.allowed_longitude.toString() : '');
           setRadius(dept.allowed_radius ? dept.allowed_radius.toString() : '2000');
        }
      }

      if (deptName) {
        const sumRes = await axios.get(`https://bmh-eitu.onrender.com/attendance/summary?department=${deptName}`);
        if (sumRes.data.success) {
          setSummary(sumRes.data.summary);
        }
        
        let url = `https://bmh-eitu.onrender.com/attendance/reports?department=${deptName}`;
        if (!forceClear && startDate && endDate) {
          url += `&startDate=${startDate}&endDate=${endDate}`;
        } else {
          url += `&date=${new Date().toISOString().split('T')[0]}`;
        }
        
        const repRes = await axios.get(url);
        if (repRes.data.success) {
          setReports(repRes.data.data);
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
    if (!reports || reports.length === 0) return;
    
    let csvContent = "Name,Check In,Check Out,Status,Breaks\n";
    reports.forEach((r) => {
      const checkIn = r.check_in ? new Date(r.check_in).toLocaleTimeString() : 'N/A';
      const checkOut = r.check_out ? new Date(r.check_out).toLocaleTimeString() : 'N/A';
      const breaksStr = r.breaks ? r.breaks.map((b: any) => `${b.break_type} at ${new Date(b.timestamp).toLocaleTimeString()}`).join('; ') : 'No breaks';
      
      csvContent += `${r.full_name},${checkIn},${checkOut},${r.status},"${breaksStr}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv' });
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
        <TouchableOpacity 
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} 
          onPress={() => setShowConfig(!showConfig)}
        >
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Configure {userDept} Location</Text>
          {showConfig ? <ChevronUp size={24} color="#374151" /> : <ChevronDown size={24} color="#374151" />}
        </TouchableOpacity>

        {showConfig && (
          <View style={{ marginTop: 15 }}>
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
        )}
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

        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 10}}>
          {Platform.OS === 'web' ? (
            <View style={{flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'center' : 'stretch', gap: 8, backgroundColor: '#f3f4f6', padding: 8, borderRadius: 8, width: isDesktop ? 'auto' : '100%'}}>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                style={{padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', outline: 'none', width: '100%', minHeight: '40px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#000'}}
              />
              <Text style={{color: '#6b7280', fontWeight: '500', textAlign: 'center'}}>to</Text>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                style={{padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', outline: 'none', width: '100%', minHeight: '40px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#000'}}
              />
              <View style={{flexDirection: 'row', gap: 8, marginTop: isDesktop ? 0 : 8, width: '100%'}}>
                <TouchableOpacity style={{backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, flex: 1, alignItems: 'center'}} onPress={() => fetchData(false)}>
                  <Text style={{color: 'white', fontWeight: 'bold'}}>Apply</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{backgroundColor: '#6b7280', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, flex: 1, alignItems: 'center'}} onPress={() => { setStartDate(''); setEndDate(''); fetchData(true); }}>
                  <Text style={{color: 'white', fontWeight: 'bold'}}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'center' : 'stretch', gap: 8, width: isDesktop ? 'auto' : '100%'}}>
              <TextInput style={[styles.input, {minWidth: 110, margin: 0, padding: 8, width: '100%'}]} placeholder="YYYY-MM-DD" value={startDate} onChangeText={setStartDate} />
              <Text style={{color: '#6b7280', textAlign: 'center'}}>to</Text>
              <TextInput style={[styles.input, {minWidth: 110, margin: 0, padding: 8, width: '100%'}]} placeholder="YYYY-MM-DD" value={endDate} onChangeText={setEndDate} />
              <View style={{flexDirection: 'row', gap: 8, marginTop: isDesktop ? 0 : 8, width: '100%'}}>
                <TouchableOpacity style={{backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, flex: 1, alignItems: 'center'}} onPress={() => fetchData(false)}>
                  <Text style={{color: 'white', fontWeight: 'bold'}}>Apply</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{backgroundColor: '#6b7280', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, flex: 1, alignItems: 'center'}} onPress={() => { setStartDate(''); setEndDate(''); fetchData(true); }}>
                  <Text style={{color: 'white', fontWeight: 'bold'}}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
          <View style={[styles.table, { minWidth: 800 }]}>
            <View style={styles.tableRowHeader}>
            <Text style={[styles.tableCellHeader, {flex: 0.5}]}>In</Text>
            <Text style={styles.tableCellHeader}>Name</Text>
            <Text style={styles.tableCellHeader}>Check In</Text>
            <Text style={styles.tableCellHeader}>Check Out</Text>
            <Text style={styles.tableCellHeader}>Deviation</Text>
            <Text style={[styles.tableCellHeader, {flex: 1.5}]}>Breaks</Text>
            <Text style={styles.tableCellHeader}>Status</Text>
          </View>
          {reports.map((r, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.tableRow}
              onPress={() => {
                setSelectedEmployeeId(r.employee_id);
                setModalVisible(true);
              }}
            >
              <View style={[styles.tableCell, {flex: 0.5, flexDirection: 'row'}]}>
                 {r.check_in_image ? <Image source={{uri: r.check_in_image}} style={styles.thumb} /> : <View style={styles.thumbPlaceholder} />}
                 {r.check_out_image ? <Image source={{uri: r.check_out_image}} style={[styles.thumb, {marginLeft: -10}]} /> : null}
              </View>
              <View style={[styles.tableCell, { justifyContent: 'center' }]}>
                <Text style={{fontWeight: '500', color: '#1f2937'}}>{r.full_name}</Text>
                <Text style={{fontSize: 12, color: '#6b7280'}}>{r.email || 'N/A'}</Text>
                <Text style={{fontSize: 12, color: '#6b7280'}}>{r.mobile || 'N/A'}</Text>
              </View>
              <Text style={styles.tableCell}>{r.check_in ? new Date(r.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</Text>
              <Text style={styles.tableCell}>{r.check_out ? new Date(r.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</Text>
              <View style={[styles.tableCell, { justifyContent: 'center' }]}>
                {r.late_checkin_mins > 0 ? <Text style={{fontSize: 12, color: '#ef4444'}}>Late In: {formatMins(r.late_checkin_mins)}</Text> : null}
                {r.early_checkout_mins > 0 ? <Text style={{fontSize: 12, color: '#f59e0b'}}>Early Out: {formatMins(r.early_checkout_mins)}</Text> : null}
                {r.extra_break_mins > 0 ? <Text style={{fontSize: 12, color: '#ef4444'}}>Extra Break: {formatMins(r.extra_break_mins)}</Text> : null}
                {(!r.late_checkin_mins && !r.early_checkout_mins && !r.extra_break_mins) ? <Text style={{fontSize: 12, color: '#10b981'}}>On Time</Text> : null}
              </View>
              <View style={[styles.tableCell, {flex: 1.5}]}>
                {r.breaks && r.breaks.length > 0 ? (
                  r.breaks.map((b: any, bi: number) => (
                    <Text key={bi} style={{fontSize: 11, color: '#6b7280'}}>
                      {b.break_type}: {new Date(b.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  ))
                ) : <Text style={{fontSize: 11, color: '#9ca3af'}}>-</Text>}
              </View>
              <Text style={styles.tableCell}>{r.status}</Text>
            </TouchableOpacity>
          ))}
          </View>
        </ScrollView>
      </View>

      <EmployeeAnalyticsModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        employeeId={selectedEmployeeId} 
      />
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
  tableCell: { flex: 1, color: '#4b5563', justifyContent: 'center' },
  thumb: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'white' },
  thumbPlaceholder: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e5e7eb', borderWidth: 2, borderColor: 'white' }
});
