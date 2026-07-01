import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform, Image, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import { Download, MapPin, ChevronDown, ChevronUp, Edit2, X, Target } from 'lucide-react-native';
import * as Location from 'expo-location';
import EmployeeAnalyticsModal from '../../../components/EmployeeAnalyticsModal';
import { useResponsive } from '../../../hooks/useResponsive';
import { Colors } from '../../../constants/Colors';

const Dropdown = ({ options, value, onChange }: any) => {
  const [open, setOpen] = useState(false);
  
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.input, { padding: 0, justifyContent: 'center', minWidth: 200, flex: 2 }]}>
        {React.createElement(
          'select',
          {
            value: value,
            onChange: (e: any) => onChange(e.target.value),
            style: { width: '100%', height: '100%', border: 'none', backgroundColor: 'transparent', padding: '12px', fontSize: '16px', color: value ? '#111827' : '#9ca3af' }
          },
          React.createElement('option', { value: '', disabled: true }, 'Select Department'),
          ...options.map((o: any) => React.createElement('option', { key: o.name, value: o.name }, o.name))
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 2, minWidth: 200 }}>
      <TouchableOpacity onPress={() => setOpen(true)} style={[styles.input, {justifyContent: 'center'}]}>
        <Text style={{color: value ? '#111827' : '#9ca3af'}}>{value || "Select Department"}</Text>
      </TouchableOpacity>
      
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }} 
          onPress={() => setOpen(false)}
          activeOpacity={1}
        >
          <View style={{ backgroundColor: 'white', width: '100%', maxWidth: 400, maxHeight: '60%', borderRadius: 12, overflow: 'hidden' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#f8fafc' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Select Department</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((o: any) => (
                <TouchableOpacity 
                  key={o.name} 
                  style={{ padding: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' }} 
                  onPress={() => { onChange(o.name); setOpen(false); }}
                >
                  <Text style={{ fontSize: 16, color: value === o.name ? '#0284c7' : '#334155', fontWeight: value === o.name ? '600' : '400' }}>
                    {o.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const MapPicker = ({ lat, lng, onSelect }: any) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
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
            var msg = JSON.stringify({ type: 'map-click', lat: e.latlng.lat, lng: e.latlng.lng });
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(msg);
            } else {
              window.parent.postMessage(msg, '*');
            }
          });
        </script>
      </body>
    </html>
  `;

  if (Platform.OS === 'web') {
    return (
      <iframe 
        srcDoc={htmlContent}
        style={{ width: '100%', height: 300, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, marginTop: 15 }}
      />
    );
  }
  return (
    <WebView
      source={{ html: htmlContent }}
      style={{ width: '100%', height: 300, borderRadius: 8, marginTop: 15 }}
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'map-click' && onSelect) {
            onSelect(data.lat, data.lng);
          }
        } catch(e) {}
      }}
    />
  );
};

export default function AdminAttendanceScreen() {
  const { isDesktop, isMobile } = useResponsive();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const formatMins = (mins: number) => {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const [summary, setSummary] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  // Config state
  const [deptName, setDeptName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('2000');
  const [showConfig, setShowConfig] = useState(false);
  const [mapPickerMode, setMapPickerMode] = useState<'pick'|'fetching'>('pick');

  // New states for Reports
  const [selectedReportDept, setSelectedReportDept] = useState('All');
  const [selectedUserType, setSelectedUserType] = useState('employee');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Edit State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [updating, setUpdating] = useState(false);

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

  const fetchReports = async (dept: string, userTypeStr = selectedUserType, forceClear = false, isLoadMore = false) => {
    try {
      const currentOffset = isLoadMore ? offset : 0;
      let url = dept === 'All' 
        ? `https://napi.bharatmedicalhallplus.com/attendance/reports?userType=${userTypeStr}&limit=50&offset=${currentOffset}`
        : `https://napi.bharatmedicalhallplus.com/attendance/reports?department=${dept}&userType=${userTypeStr}&limit=50&offset=${currentOffset}`;
      
      if (!forceClear && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      } else {
        url += `&date=${new Date().toISOString().split('T')[0]}`;
      }
      const res = await axios.get(url);
      if (res.data.success) {
        if (isLoadMore) {
          setReports(prev => [...prev, ...res.data.data]);
        } else {
          setReports(res.data.data);
        }
        setOffset(currentOffset + 50);
        setHasMore(res.data.hasMore);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async (userTypeStr = selectedUserType) => {
    try {
      setLoading(true);
      const sumRes = await axios.get(`https://napi.bharatmedicalhallplus.com/attendance/summary?userType=${userTypeStr}`);
      if (sumRes.data.success) {
        setSummary(sumRes.data.summary);
      }

      await fetchReports(selectedReportDept, userTypeStr);

      const deptRes = await axios.get('https://napi.bharatmedicalhallplus.com/department');
      if (deptRes.data.success) {
        setDepartments([{ id: 'all_depts', name: 'All Departments' }, ...deptRes.data.data]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(selectedReportDept, selectedUserType);
  }, [selectedReportDept, selectedUserType]);

  const handleUpdateConfig = async () => {
    if (!deptName || !lat || !lng || !radius) {
      Alert.alert("Error", "Please fill all fields and select a location on the map.");
      return;
    }
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/department/location', {
        name: deptName,
        lat,
        lng,
        radius
      });
      if (res.data.success) {
        Alert.alert("Success", `Department ${deptName} location updated to Lat: ${lat}, Lng: ${lng}, Radius: ${radius}m`);
        // Refresh departments list so the new coordinates are stored in state
        const deptRes = await axios.get('https://napi.bharatmedicalhallplus.com/department');
        if (deptRes.data.success) {
          setDepartments([{ id: 'all_depts', name: 'All Departments' }, ...deptRes.data.data]);
        }
      } else {
        Alert.alert("Error", "Failed to update location.");
      }
    } catch (err) {
      Alert.alert("Error", "Server error while updating location.");
    }
  };

  const openEditModal = (r: any) => {
    setEditRecord(r);
    const formatTimeForInput = (isoStr: string) => {
      if (!isoStr) return '';
      const d = new Date(isoStr);
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    };
    setEditCheckIn(formatTimeForInput(r.check_in));
    setEditCheckOut(formatTimeForInput(r.check_out));
    setEditStatus(r.status || 'On Duty');
    setEditModalVisible(true);
  };
  const handleSaveEdit = async () => {
    setUpdating(true);
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/attendance/admin-update/${editRecord.id}`, {
        check_in: editCheckIn || null,
        check_out: editCheckOut || null,
        status: editStatus
      });
      Alert.alert('Success', 'Attendance updated');
      setEditModalVisible(false);
      fetchReports(selectedReportDept, selectedUserType);
      fetchData(selectedUserType);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleExportCSV = () => {
    if (!reports || reports.length === 0) return;
    
    let csvContent = "Name,Department,Check In,Check Out,Status,Breaks\n";
    reports.forEach((r) => {
      const checkIn = r.check_in ? new Date(r.check_in).toLocaleTimeString() : 'N/A';
      const checkOut = r.check_out ? new Date(r.check_out).toLocaleTimeString() : 'N/A';
      const breaksStr = r.breaks ? r.breaks.map((b: any) => `${b.break_type} at ${new Date(b.timestamp).toLocaleTimeString()}`).join('; ') : 'No breaks';
      
      csvContent += `${r.full_name},${r.department},${checkIn},${checkOut},${r.status},"${breaksStr}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'attendance_report.csv');
    a.click();
  };

  if (loading) {
    return <View style={{flex: 1, justifyContent: 'center', alignItems:'center'}}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  const filteredReports = reports.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.full_name && r.full_name.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.mobile && r.mobile.toLowerCase().includes(q))
    );
  });

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.sectionHeader, !isDesktop && { flexDirection: 'column', alignItems: 'flex-start', gap: 15 }]}>
        <View>
          <Text style={styles.header}>Attendance Dashboard</Text>
          <Text style={styles.subtitle}>Overview of today's presence</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <View style={styles.userTypeToggle}>
            <TouchableOpacity 
              style={[styles.toggleBtn, selectedUserType === 'employee' && styles.toggleBtnActive]}
              onPress={() => { setSelectedUserType('employee'); fetchData('employee'); }}
            >
              <Text style={[styles.toggleText, selectedUserType === 'employee' && styles.toggleTextActive]}>Employees</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, selectedUserType === 'sub_admin' && styles.toggleBtnActive]}
              onPress={() => { setSelectedUserType('sub_admin'); fetchData('sub_admin'); }}
            >
              <Text style={[styles.toggleText, selectedUserType === 'sub_admin' && styles.toggleTextActive]}>Sub Admins</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => setShowConfig(!showConfig)}>
            <MapPin color={Colors.light.primary} size={20} />
            {isDesktop && <Text style={styles.settingsBtnText}>Location Config</Text>}
          </TouchableOpacity>
        </View>
      </View>
      
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
      {showConfig && (
        <View style={[styles.section, {zIndex: 1000}]}>
          <Text style={[styles.sectionTitle, { marginBottom: 15 }]}>Configure Department Location</Text>
          <Text style={{color: '#6b7280', marginBottom: 15}}>Select a department and tap on the map to set its geofence boundaries.</Text>
          
          <View style={styles.inputRow}>
            <Dropdown 
              options={departments} 
              value={deptName} 
              onChange={(name: string) => {
                setDeptName(name);
                const dept = departments.find(d => d.name === name);
                if (dept) {
                  setLat(dept.allowed_latitude ? dept.allowed_latitude.toString() : '');
                  setLng(dept.allowed_longitude ? dept.allowed_longitude.toString() : '');
                  setRadius(dept.allowed_radius ? dept.allowed_radius.toString() : '200');
                }
              }} 
            />
            
            <View style={[styles.input, {flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 150}]}>
              <TextInput 
                style={[{flex: 1}, Platform.OS === 'web' && {outlineWidth: 0} as any]}
                placeholder="Radius" 
                value={radius} 
                onChangeText={setRadius} 
                keyboardType="numeric" 
              />
              <Text style={{color: '#6b7280', marginLeft: 8, fontWeight: '500'}}>meters</Text>
            </View>
          </View>
          
          <View style={{flexDirection: isMobile ? 'column' : 'row', gap: 10, marginTop: 10}}>
            <View style={[styles.input, {backgroundColor: '#f3f4f6', flex: 1, flexDirection: 'row', alignItems: 'center'}]}>
                <MapPin size={16} color="#6b7280" style={{marginRight: 8}} />
                <Text style={{color: '#6b7280'}}>{lat ? `Lat: ${Number(lat).toFixed(6)}` : 'Latitude'}</Text>
            </View>
            <View style={[styles.input, {backgroundColor: '#f3f4f6', flex: 1, flexDirection: 'row', alignItems: 'center'}]}>
                <MapPin size={16} color="#6b7280" style={{marginRight: 8}} />
                <Text style={{color: '#6b7280'}}>{lng ? `Lng: ${Number(lng).toFixed(6)}` : 'Longitude'}</Text>
            </View>
            <TouchableOpacity 
              style={{backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: isMobile ? 12 : undefined, borderRadius: 8, justifyContent: 'center', alignItems: 'center'}}
              onPress={async () => {
                setMapPickerMode('fetching');
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== 'granted') {
                    alert('Permission to access location was denied');
                    return;
                  }
                  const location = await Location.getCurrentPositionAsync({});
                  setLat(location.coords.latitude.toString());
                  setLng(location.coords.longitude.toString());
                } catch (error) {
                  alert('Failed to fetch location');
                } finally {
                  setMapPickerMode('pick');
                }
              }}
            >
              {mapPickerMode === 'fetching' ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={{color: 'white', fontWeight: 'bold'}}>Fetch Current Location</Text>
              )}
            </TouchableOpacity>
          </View>

          <MapPicker lat={lat} lng={lng} onSelect={(newLat: any, newLng: any) => { setLat(newLat.toString()); setLng(newLng.toString()); }} />

          <TouchableOpacity style={styles.button} onPress={handleUpdateConfig}>
            <Text style={styles.buttonText}>Save Configuration</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reports Section */}
      <View style={[styles.section, {zIndex: 1}]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Advanced Reports</Text>
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
                style={{padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', width: '100%', minHeight: '40px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#000'}}
              />
              <Text style={{color: '#6b7280', fontWeight: '500', textAlign: 'center'}}>to</Text>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                style={{padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', width: '100%', minHeight: '40px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#000'}}
              />
              <View style={{flexDirection: 'row', gap: 8, marginTop: isDesktop ? 0 : 8, width: '100%'}}>
                <TouchableOpacity style={{backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, flex: 1, alignItems: 'center'}} onPress={() => fetchReports(selectedReportDept)}>
                  <Text style={{color: 'white', fontWeight: 'bold'}}>Apply</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{backgroundColor: '#6b7280', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, flex: 1, alignItems: 'center'}} onPress={() => { setStartDate(''); setEndDate(''); fetchReports(selectedReportDept, selectedUserType, true); }}>
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
                <TouchableOpacity style={{backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, flex: 1, alignItems: 'center'}} onPress={() => fetchReports(selectedReportDept)}>
                  <Text style={{color: 'white', fontWeight: 'bold'}}>Apply</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{backgroundColor: '#6b7280', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, flex: 1, alignItems: 'center'}} onPress={() => { setStartDate(''); setEndDate(''); fetchReports(selectedReportDept, selectedUserType, true); }}>
                  <Text style={{color: 'white', fontWeight: 'bold'}}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 10}}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flex: 1, marginRight: 15, minWidth: 200}}>
            {['All', ...departments.map(d => d.name)].map((dept) => (
              <TouchableOpacity 
                key={dept} 
                style={[styles.tab, selectedReportDept === dept && styles.activeTab]}
                onPress={() => setSelectedReportDept(dept)}
              >
                <Text style={[styles.tabText, selectedReportDept === dept && styles.activeTabText]}>{dept}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={[styles.input, { flex: 0.5, minWidth: 200, margin: 0, padding: 8 }]}>
             <TextInput 
               style={[{flex: 1}, Platform.OS === 'web' && {outlineWidth: 0} as any]}
               placeholder="Search Name, Email, Phone..." 
               value={searchQuery} 
               onChangeText={setSearchQuery} 
             />
          </View>
        </View>

        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
          <View style={[styles.table, { minWidth: 1200 }]}>
          <View style={styles.tableRowHeader}>
            <Text style={[styles.tableCellHeader, { width: 60 }]}>In</Text>
            <Text style={[styles.tableCellHeader, { width: 250 }]}>Name</Text>
            <Text style={[styles.tableCellHeader, { width: 150 }]}>Dept</Text>
            <Text style={[styles.tableCellHeader, { width: 120 }]}>Date</Text>
            <Text style={[styles.tableCellHeader, { width: 120 }]}>Check In</Text>
            <Text style={[styles.tableCellHeader, { width: 120 }]}>Check Out</Text>
            <Text style={[styles.tableCellHeader, { width: 120 }]}>Deviation</Text>
            <Text style={[styles.tableCellHeader, { width: 200 }]}>Breaks</Text>
            <Text style={[styles.tableCellHeader, { width: 120 }]}>Status</Text>
            <Text style={[styles.tableCellHeader, { width: 100 }]}>Action</Text>
          </View>
          {filteredReports.map((r, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={[styles.tableCellView, { width: 60, flexDirection: 'row' }]}>
                 {r.check_in_image ? <Image source={{uri: r.check_in_image}} style={styles.thumb} /> : <View style={styles.thumbPlaceholder} />}
                 {r.check_out_image ? <Image source={{uri: r.check_out_image}} style={[styles.thumb, {marginLeft: -10}]} /> : null}
              </View>
              <View style={[styles.tableCellView, { width: 250 }]}>
                <Text style={{fontWeight: '700', color: Colors.light.text}}>{r.full_name}</Text>
                <Text style={{fontSize: 12, color: Colors.light.icon}}>{r.email}</Text>
                <Text style={{fontSize: 12, color: Colors.light.icon}}>{r.mobile}</Text>
              </View>
              <Text style={[styles.tableCell, { width: 150 }]}>{r.department}</Text>
              <Text style={[styles.tableCell, { width: 120 }]}>{new Date(r.date).toLocaleDateString()}</Text>
              <Text style={[styles.tableCell, { width: 120 }]}>{r.check_in ? new Date(r.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</Text>
              <Text style={[styles.tableCell, { width: 120 }]}>{r.check_out ? new Date(r.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</Text>
              <View style={[styles.tableCellView, { width: 120 }]}>
                {r.late_checkin_mins > 0 ? <Text style={{fontSize: 12, color: '#ef4444'}}>Late In: {formatMins(r.late_checkin_mins)}</Text> : null}
                {r.early_checkout_mins > 0 ? <Text style={{fontSize: 12, color: '#f59e0b'}}>Early Out: {formatMins(r.early_checkout_mins)}</Text> : null}
                {r.extra_break_mins > 0 ? <Text style={{fontSize: 12, color: '#ef4444'}}>Extra Break: {formatMins(r.extra_break_mins)}</Text> : null}
                {(!r.late_checkin_mins && !r.early_checkout_mins && !r.extra_break_mins) ? <Text style={{fontSize: 12, color: '#10b981'}}>On Time</Text> : null}
              </View>
              <View style={[styles.tableCellView, { width: 200 }]}>
                {r.breaks && r.breaks.length > 0 ? (
                  r.breaks.map((b: any, bi: number) => (
                    <Text key={bi} style={{fontSize: 11, color: Colors.light.icon}}>
                      {b.break_type}: {new Date(b.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  ))
                ) : <Text style={{fontSize: 11, color: Colors.light.icon}}>-</Text>}
              </View>
              <Text style={[styles.tableCell, { width: 120 }]}>{r.status}</Text>
              <View style={[styles.tableCellView, { width: 100, alignItems: 'center', gap: 5 }]}>
                <TouchableOpacity style={styles.actionBtnText} onPress={() => openEditModal(r)}>
                  <Edit2 size={16} color={Colors.light.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtnText} onPress={() => {setSelectedEmployeeId(r.employee_id); setModalVisible(true);}}>
                  <Text style={{color: Colors.light.primary, fontWeight: '600', fontSize: 12}}>Analytics</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          </View>
          
          {hasMore && (
            <TouchableOpacity 
              style={{ padding: 12, backgroundColor: Colors.light.primary, borderRadius: 8, alignItems: 'center', marginTop: 15 }} 
              onPress={() => fetchReports(selectedReportDept, selectedUserType, false, true)}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Load More</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <EmployeeAnalyticsModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        employeeId={selectedEmployeeId} 
      />

      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Attendance</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={{ marginBottom: 15 }}>
              <Text style={styles.label}>Check In Time (HH:mm)</Text>
              {Platform.OS === 'web' ? (
                <input 
                  type="time" 
                  value={editCheckIn} 
                  onChange={(e) => setEditCheckIn(e.target.value)} 
                  style={webInputStyle}
                />
              ) : (
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="HH:mm" 
                  value={editCheckIn} 
                  onChangeText={setEditCheckIn} 
                />
              )}
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={styles.label}>Check Out Time (HH:mm)</Text>
              {Platform.OS === 'web' ? (
                <input 
                  type="time" 
                  value={editCheckOut} 
                  onChange={(e) => setEditCheckOut(e.target.value)} 
                  style={webInputStyle}
                />
              ) : (
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="HH:mm" 
                  value={editCheckOut} 
                  onChangeText={setEditCheckOut} 
                />
              )}
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={styles.label}>Status</Text>
              {Platform.OS === 'web' ? (
                <select 
                  value={editStatus} 
                  onChange={(e) => setEditStatus(e.target.value)} 
                  style={webInputStyle}
                >
                  <option value="On Duty">On Duty</option>
                  <option value="Checked Out">Checked Out</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                  <option value="On Break">On Break</option>
                  <option value="Half Day">Half Day</option>
                </select>
              ) : (
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="Status" 
                  value={editStatus} 
                  onChangeText={setEditStatus} 
                />
              )}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSaveEdit} disabled={updating}>
              <Text style={styles.buttonText}>{updating ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9fafb' },
  header: { fontSize: 26, fontWeight: 'bold', color: '#111827' },
  subtitle: { color: '#6b7280', marginTop: 4 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginVertical: 30 },
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
  settingsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: '#eff6ff' },
  settingsBtnText: { color: Colors.light.primary, fontWeight: '600' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableCellHeader: { padding: 16, fontSize: 13, fontWeight: '700', color: Colors.light.icon, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  tableCell: { padding: 16, fontSize: 14, color: Colors.light.text, fontWeight: '500' },
  tableCellView: { padding: 16, justifyContent: 'center' },
  actionBtnText: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eff6ff', borderRadius: 8 },
  userTypeToggle: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: Colors.light.primary },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 10 },
  activeTab: { backgroundColor: '#3b82f6' },
  tabText: { color: '#4b5563', fontWeight: '500' },
  activeTabText: { color: 'white' },
  thumb: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'white' },
  thumbPlaceholder: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e5e7eb', borderWidth: 2, borderColor: 'white' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: 'white', borderRadius: 12, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  modalInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 }
});

const webInputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  fontSize: '16px',
  outlineWidth: 0,
  backgroundColor: '#fff',
  boxSizing: 'border-box' as 'border-box'
};
