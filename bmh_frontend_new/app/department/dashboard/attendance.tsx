import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform, Image, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Download, MapPin, ChevronDown, ChevronUp, Clock, Coffee, CheckCircle, AlertTriangle, Edit2, X, Printer } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import EmployeeAnalyticsModal from '../../../components/EmployeeAnalyticsModal';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

const formatDateToDDMMYYYY = (dateStr: any) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatMins = (mins: number) => {
  if (!mins) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const getWorkedHours = (r: any) => {
  if (r.worked_mins != null) return formatMins(r.worked_mins);
  if (r.check_in && r.check_out) {
    const duration = Math.floor((new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 60000);
    return formatMins(duration);
  }
  return '-';
};

const getBreakDuration = (r: any) => {
  if (!r.breaks || r.breaks.length === 0) return '-';
  let breakMs = 0;
  const sortedBreaks = [...r.breaks].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let currentBreakIn: Date | null = null;
  sortedBreaks.forEach((b: any) => {
    if (b.break_type === 'Break In') {
      currentBreakIn = new Date(b.timestamp);
    } else if (b.break_type === 'Break Out' && currentBreakIn) {
      breakMs += new Date(b.timestamp).getTime() - currentBreakIn.getTime();
      currentBreakIn = null;
    }
  });
  if (breakMs === 0) return '-';
  return formatMins(Math.floor(breakMs / 60000));
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

const Dropdown = ({ options, value, onChange }: any) => {
  if (Platform.OS === 'web') {
    return (
      <View style={{ padding: 0, justifyContent: 'center', minWidth: 140, backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
        {React.createElement(
          'select',
          {
            value: value,
            onChange: (e: any) => onChange(e.target.value),
            style: { width: '100%', height: '40px', border: 'none', backgroundColor: 'transparent', padding: '0 12px', fontSize: '14px', color: '#374151', cursor: 'pointer' }
          },
          ...options.map((o: any) => React.createElement('option', { key: o, value: o }, o))
        )}
      </View>
    );
  }
  return (
    <View style={{ padding: 0, justifyContent: 'center', minWidth: 140, backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
      <Picker
        selectedValue={value}
        onValueChange={(itemValue) => onChange(itemValue)}
      >
        {options.map((o: any) => (
          <Picker.Item key={o} label={o} value={o} />
        ))}
      </Picker>
    </View>
  );
};

const SearchableDropdown = ({ options, value, onChange, placeholder, searchPlaceholder }: any) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter((o: any) => {
    if (typeof o === 'string') {
      return o.toLowerCase().includes(search.toLowerCase());
    }
    const label = o.label || o.name || o.full_name || '';
    const email = o.email || '';
    const mobile = o.mobile || '';
    const searchLower = search.toLowerCase();
    return (
      label.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      mobile.toLowerCase().includes(searchLower)
    );
  });

  if (Platform.OS === 'web') {
    return (
      <View style={{ position: 'relative', zIndex: 9999, minWidth: 200, flex: 2 }}>
        <TouchableOpacity 
          onPress={() => setOpen(!open)} 
          style={[
            {
              borderWidth: 1,
              borderColor: '#cbd5e1',
              borderRadius: 8,
              padding: 12,
              backgroundColor: 'white',
              justifyContent: 'space-between',
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 40
            }
          ]}
        >
          <Text style={{ color: value ? '#111827' : '#9ca3af', fontSize: 14 }}>
            {(() => {
              if (!value) return placeholder;
              const matched = options.find((o: any) => typeof o === 'string' ? o === value : o.value === value);
              return matched ? (typeof matched === 'string' ? matched : matched.label) : value;
            })()}
          </Text>
          <ChevronDown size={16} color="#9ca3af" />
        </TouchableOpacity>

        {open && (
          <View style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 8,
            marginTop: 4,
            maxHeight: 250,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
            zIndex: 99999
          }}>
            <TextInput
              style={{
                padding: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
                backgroundColor: '#f8fafc',
                fontSize: 14,
              }}
              placeholder={searchPlaceholder || "Search..."}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
              {filteredOptions.length === 0 ? (
                <Text style={{ padding: 12, color: '#9ca3af', textAlign: 'center', fontSize: 14 }}>No matches found</Text>
              ) : (
                filteredOptions.map((o: any) => {
                  const label = typeof o === 'string' ? o : (o.label || o.name || o.full_name || '');
                  const val = typeof o === 'string' ? o : (o.value !== undefined ? o.value : o.name || o.full_name || '');
                  return (
                    <TouchableOpacity 
                      key={val} 
                      style={{ 
                        padding: 12, 
                        borderBottomWidth: 1, 
                        borderBottomColor: '#f1f5f9', 
                        backgroundColor: value === val ? '#eff6ff' : 'white' 
                      }} 
                      onPress={() => { 
                        onChange(val); 
                        setOpen(false); 
                        setSearch(''); 
                      }}
                    >
                      <Text style={{ fontSize: 14, color: value === val ? '#0284c7' : '#334155', fontWeight: value === val ? '600' : '400' }}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 2, minWidth: 200 }}>
      <TouchableOpacity 
        onPress={() => setOpen(true)} 
        style={[
          {
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 8,
            padding: 12,
            backgroundColor: 'white',
            justifyContent: 'space-between',
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 40
          }
        ]}
      >
        <Text style={{ color: value ? '#111827' : '#9ca3af', fontSize: 14 }}>
          {(() => {
            if (!value) return placeholder;
            const matched = options.find((o: any) => typeof o === 'string' ? o === value : o.value === value);
            return matched ? (typeof matched === 'string' ? matched : matched.label) : value;
          })()}
        </Text>
        <ChevronDown size={16} color="#9ca3af" />
      </TouchableOpacity>
      
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }} 
          onPress={() => { setOpen(false); setSearch(''); }}
          activeOpacity={1}
        >
          <View style={{ backgroundColor: 'white', width: '100%', maxWidth: 400, maxHeight: '60%', borderRadius: 12, overflow: 'hidden' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#f8fafc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>{placeholder}</Text>
              <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }}>
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={{
                padding: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
                backgroundColor: '#fff',
                fontSize: 15,
                margin: 10,
                borderWidth: 1,
                borderColor: '#cbd5e1',
                borderRadius: 8
              }}
              placeholder={searchPlaceholder || "Search..."}
              value={search}
              onChangeText={setSearch}
            />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {filteredOptions.length === 0 ? (
                <Text style={{ padding: 20, color: '#9ca3af', textAlign: 'center' }}>No matches found</Text>
              ) : (
                filteredOptions.map((o: any) => {
                  const label = typeof o === 'string' ? o : (o.label || o.name || o.full_name || '');
                  const val = typeof o === 'string' ? o : (o.value !== undefined ? o.value : o.name || o.full_name || '');
                  return (
                    <TouchableOpacity 
                      key={val} 
                      style={{ padding: 16, borderBottomWidth: 1, borderColor: '#f1f5f9', backgroundColor: value === val ? '#eff6ff' : 'white' }} 
                      onPress={() => { 
                        onChange(val); 
                        setOpen(false); 
                        setSearch(''); 
                      }}
                    >
                      <Text style={{ fontSize: 16, color: value === val ? '#0284c7' : '#334155', fontWeight: value === val ? '600' : '400' }}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

function MyAttendanceHistory() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (forceClear = false, isLoadMore = false) => {
    setLoading(!isLoadMore);
    try {
      let userStr = null;
      if (Platform.OS === 'web') {
        userStr = localStorage.getItem('subAdminUser');
      } else {
        userStr = await AsyncStorage.getItem('subAdminUser');
      }
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user || !user.id) return;

      const currentOffset = isLoadMore ? offset : 0;
      let url = `https://napi.bharatmedicalhallplus.com/attendance/employee-analytics?employeeId=${user.id}&userType=sub_admin&limit=30&offset=${currentOffset}`;
      const hasDateFilter = !forceClear && startDate && endDate;
      if (hasDateFilter) {
        url += `&startDate=${startDate}&endDate=${endDate}&bypassPagination=true`;
      }

      const res = await axios.get(url);
      if (res.data.success) {
        if (isLoadMore) {
          setReports(prev => [...prev, ...(res.data.history || [])]);
        } else {
          setReports(res.data.history || []);
        }
        setAnalytics(res.data.analytics);
        setOffset(currentOffset + 30);
        
        if (hasDateFilter) {
          setHasMore(false);
        } else {
          setHasMore(res.data.hasMore);
        }
      }
    } catch (err) {
      console.log('Error fetching history', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(r => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Late In') return r.late_checkin_mins > 0;
    if (statusFilter === 'Early Out') return r.early_checkout_mins > 0;
    return true;
  });

  const handleExportCSV = async () => {
    if (!filteredReports || filteredReports.length === 0) return;
    
    const hasDateFilter = startDate && endDate;
    const dateStr = hasDateFilter ? `${startDate} to ${endDate}` : (filteredReports[0]?.date ? formatDateToDDMMYYYY(filteredReports[0].date) : new Date().toISOString().split('T')[0]);

    const headerRows = [
      `"Bharat Medical Hall"`,
      `"Report Type:","My Attendance History Report"`,
      `"Date/Range:","${dateStr}"`,
      `"Status Filter:","${statusFilter}"`,
      ``,
      `"Date","Check In","Check Out","Worked Hours","Status","Breaks"`
    ];

    const dataRows = filteredReports.map((r) => {
      const checkIn = r.check_in ? new Date(r.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
      const checkOut = r.check_out ? new Date(r.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
      const workedHrs = getWorkedHours(r);
      const breaksStr = r.breaks ? r.breaks.map((b: any) => `${b.break_type} at ${new Date(b.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`).join('; ') : 'No breaks';
      return `"${formatDateToDDMMYYYY(r.date)}","${checkIn}","${checkOut}","${workedHrs}","${r.status}","${breaksStr.replace(/"/g, '""')}"`;
    });

    const csvContent = [...headerRows, ...dataRows].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `my_attendance.csv`);
      a.click();
    } else {
      try {
        const path = `${FileSystem.documentDirectory}my_attendance.csv`;
        await FileSystem.writeAsStringAsync(path, csvContent, { encoding: 'utf8' });
        await Sharing.shareAsync(path);
      } catch (e: any) {
        Alert.alert("Error", "Failed to export CSV: " + e.message);
      }
    }
  };

  const handlePrint = async () => {
    if (!filteredReports || filteredReports.length === 0) return;

    const hasDateFilter = startDate && endDate;
    const dateStr = hasDateFilter ? `${startDate} to ${endDate}` : (filteredReports[0]?.date ? formatDateToDDMMYYYY(filteredReports[0].date) : new Date().toISOString().split('T')[0]);

    const tableHeadersHtml = `
      <tr>
        <th>Date</th>
        <th>Check In</th>
        <th>Check Out</th>
        <th>Worked Hrs</th>
        <th>Deviation</th>
        <th>Breaks</th>
        <th>Status</th>
      </tr>
    `;

    const tableRowsHtml = filteredReports.map(r => {
      const checkIn = r.check_in ? new Date(r.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
      const checkOut = r.check_out ? new Date(r.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
      const workedHrs = getWorkedHours(r);
      const breaksHtml = r.breaks && r.breaks.length > 0 
        ? r.breaks.map((b: any) => `<div>${b.break_type}: ${new Date(b.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`).join('')
        : '-';
      return `
        <tr>
          <td>${formatDateToDDMMYYYY(r.date)}</td>
          <td>${checkIn}</td>
          <td>${checkOut}</td>
          <td>${workedHrs}</td>
          <td>
            ${r.late_checkin_mins > 0 ? `<div>Late In: ${formatMins(r.late_checkin_mins)}</div>` : ''}
            ${r.early_checkout_mins > 0 ? `<div>Early Out: ${formatMins(r.early_checkout_mins)}</div>` : ''}
            ${r.extra_break_mins > 0 ? `<div>Extra Break: ${formatMins(r.extra_break_mins)}</div>` : ''}
            ${(!r.late_checkin_mins && !r.early_checkout_mins && !r.extra_break_mins) ? 'On Time' : ''}
          </td>
          <td>${breaksHtml}</td>
          <td>${r.status}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <style>
            @page { size: portrait; margin: 8mm; }
            body { font-family: sans-serif; padding: 10px; color: #334155; }
            h1 { color: #0f172a; margin-bottom: 4px; text-align: center; font-size: 18px; }
            .meta-section { margin-top: 10px; margin-bottom: 12px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 10px; }
            .meta-row { display: flex; margin-bottom: 4px; font-size: 11px; }
            .meta-label { font-weight: bold; width: 130px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9px; }
            th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: top; }
            th { background-color: #f8fafc; font-weight: bold; color: #1e293b; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Bharat Medical Hall</h1>
          <div class="meta-section">
            <div class="meta-row"><span class="meta-label">Report Type:</span><span>My Attendance History</span></div>
            <div class="meta-row"><span class="meta-label">Date/Range:</span><span>${dateStr}</span></div>
            <div class="meta-row"><span class="meta-label">Status Filter:</span><span>${statusFilter}</span></div>
          </div>
          <table>
            <thead>${tableHeadersHtml}</thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(htmlContent);
          doc.close();
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            document.body.removeChild(iframe);
          }, 500);
        }
      } else {
        await Print.printAsync({ html: htmlContent });
      }
    } catch (e: any) {
      Alert.alert("Error", "Failed to print: " + e.message);
    }
  };

  if (loading) {
    return <View style={{flex: 1, justifyContent: 'center', alignItems:'center', padding: 40}}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      {analytics && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Clock size={24} color="#3b82f6" />
            <Text style={styles.statValue}>{analytics.avgWorkHours}h</Text>
            <Text style={styles.statLabel}>Avg Work Time</Text>
          </View>
          <View style={styles.statCard}>
            <Coffee size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>{analytics.avgBreakMins || 0}m</Text>
            <Text style={styles.statLabel}>Avg Break Time</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle size={24} color="#10b981" />
            <Text style={styles.statValue}>{analytics.earlyCheckInPercent}%</Text>
            <Text style={styles.statLabel}>Early Check In</Text>
          </View>
          <View style={styles.statCard}>
            <AlertTriangle size={24} color="#f59e0b" />
            <Text style={styles.statValue}>{analytics.lateCheckInPercent}%</Text>
            <Text style={styles.statLabel}>Late Check In</Text>
          </View>
          <View style={styles.statCard}>
            <Clock size={24} color="#0284c7" />
            <Text style={styles.statValue}>{analytics.currentMonthWorkHours || '0m'}</Text>
            <Text style={styles.statLabel}>Month Work Hours</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle size={24} color="#059669" />
            <Text style={styles.statValue}>{analytics.currentMonthDaysPresent || 0}d</Text>
            <Text style={styles.statLabel}>Month Days Present</Text>
          </View>
        </View>
      )}

      <View style={[styles.section, {marginBottom: 20}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#f3f4f6', flexWrap: 'wrap', gap: 12}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap'}}>
            {Platform.OS === 'web' ? (
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap'}}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    style={{padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', width: '140px', boxSizing: 'border-box', backgroundColor: '#f9fafb', color: '#374151', fontSize: '14px'}}
                  />
                  <Text style={{color: '#9ca3af', fontWeight: '500'}}>-</Text>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    style={{padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', width: '140px', boxSizing: 'border-box', backgroundColor: '#f9fafb', color: '#374151', fontSize: '14px'}}
                  />
                </View>
                
                <Dropdown 
                  options={['All', 'Late In', 'Early Out']} 
                  value={statusFilter} 
                  onChange={setStatusFilter} 
                />

                <View style={{flexDirection: 'row', gap: 8}}>
                  <TouchableOpacity style={{backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center'}} onPress={() => fetchHistory(false)}>
                    <Text style={{color: 'white', fontWeight: '600', fontSize: 14}}>Apply</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center'}} onPress={() => { setStartDate(''); setEndDate(''); fetchHistory(true); }}>
                    <Text style={{color: '#4b5563', fontWeight: '600', fontSize: 14}}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>

          <View style={{flexDirection: 'row', gap: 8}}>
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8}} onPress={handleExportCSV}>
              <Download size={18} color="white" style={{marginRight: 8}} />
              <Text style={{color: 'white', fontWeight: 'bold'}}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8}} onPress={handlePrint}>
              <Printer size={18} color="white" style={{marginRight: 8}} />
              <Text style={{color: 'white', fontWeight: 'bold'}}>Print</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
          <View style={[styles.table, { minWidth: 1040, width: '100%' }]}>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableCellHeader, { width: 120 }]}>Date</Text>
              <Text style={[styles.tableCellHeader, { width: 120 }]}>Check In</Text>
              <Text style={[styles.tableCellHeader, { width: 120 }]}>Check Out</Text>
              <Text style={[styles.tableCellHeader, { width: 120 }]}>Worked Hrs</Text>
              <Text style={[styles.tableCellHeader, { width: 120 }]}>Deviation</Text>
              <Text style={[styles.tableCellHeader, { width: 200 }]}>Breaks</Text>
              <Text style={[styles.tableCellHeader, { width: 120 }]}>Status</Text>
            </View>
          {filteredReports.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: Colors.light.icon }}>No attendance records found.</Text>
            </View>
          ) : filteredReports.map((r, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: 120 }]}>{formatDateToDDMMYYYY(r.date)}</Text>
              <Text style={[styles.tableCell, { width: 120 }]}>{r.check_in ? new Date(r.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</Text>
              <Text style={[styles.tableCell, { width: 120 }]}>{r.check_out ? new Date(r.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</Text>
              <Text style={[styles.tableCell, { width: 120, fontWeight: '600' }]}>
                {getWorkedHours(r)}
              </Text>
              <View style={[styles.tableCellView, { width: 120 }]}>
                {r.late_checkin_mins > 0 ? <Text style={{fontSize: 12, color: '#ef4444'}}>Late In: {formatMins(r.late_checkin_mins)}</Text> : null}
                {r.early_checkout_mins > 0 ? <Text style={{fontSize: 12, color: '#f59e0b'}}>Early Out: {formatMins(r.early_checkout_mins)}</Text> : null}
                {r.extra_break_mins > 0 ? <Text style={{fontSize: 12, color: '#ef4444'}}>Extra Break: {formatMins(r.extra_break_mins)}</Text> : null}
                {(!r.late_checkin_mins && !r.early_checkout_mins && !r.extra_break_mins) ? <Text style={{fontSize: 12, color: '#10b981'}}>On Time</Text> : null}
              </View>
              <View style={[styles.tableCellView, { width: 200 }]}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.light.text, marginBottom: 4 }}>Total: {getBreakDuration(r)}</Text>
                {r.breaks && r.breaks.length > 0 ? (
                  r.breaks.map((b: any, bi: number) => (
                    <Text key={bi} style={{ fontSize: 12, color: Colors.light.icon }}>
                      {b.break_type}: {new Date(b.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  ))
                ) : null}
              </View>
              <Text style={[styles.tableCell, { width: 120 }]}>{r.status}</Text>
            </View>
          ))}
        </View>
        </ScrollView>
        {hasMore && (
          <TouchableOpacity 
            style={{ paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 10 }} 
            onPress={() => fetchHistory(false, true)}
          >
            <Text style={{ color: Colors.light.primary, fontWeight: '600', fontSize: 14, textDecorationLine: 'underline' }}>
              Load More
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function SubAdminAttendanceDashboard() {
  const { isDesktop, isMobile } = useResponsive();
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
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  // Config state
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('2000');
  const [showConfig, setShowConfig] = useState(false);
  const [mapPickerMode, setMapPickerMode] = useState<'pick'|'fetching'>('pick');
  const [userDept, setUserDept] = useState('');
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [activeTab, setActiveTab] = useState<'department' | 'personal'>('department');

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Edit State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (activeTab === 'department') {
      fetchData();
    }
  }, [debouncedSearchQuery]);

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
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

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

  const fetchData = async (forceClear = false, isLoadMore = false) => {
    setLoading(!isLoadMore);
    try {
      const userStr = Platform.OS === 'web' ? localStorage.getItem('subAdminUser') : await AsyncStorage.getItem('subAdminUser');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) return;
      
      let deptName = user.department;
      
      const [deptRes, usersRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/department'),
        axios.get('https://napi.bharatmedicalhallplus.com/employees/all-users').catch(() => null)
      ]);

      if (usersRes && usersRes.data && usersRes.data.success) {
        setAllUsers(usersRes.data.data);
      }

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
        const sumRes = await axios.get(`https://napi.bharatmedicalhallplus.com/attendance/summary?department=${deptName}`);
        if (sumRes.data.success) {
          setSummary(sumRes.data.summary);
        }
        
        const currentOffset = isLoadMore ? offset : 0;
        let url = `https://napi.bharatmedicalhallplus.com/attendance/reports?department=${deptName}&limit=50&offset=${currentOffset}`;
        const hasDateFilter = !forceClear && startDate && endDate;
        if (hasDateFilter) {
          url += `&startDate=${startDate}&endDate=${endDate}&bypassPagination=true`;
        } else {
          url += `&date=${new Date().toISOString().split('T')[0]}`;
        }

        const currentSearch = forceClear ? '' : searchQuery;
        if (currentSearch.trim() !== '') {
          url += `&search=${encodeURIComponent(currentSearch.trim())}`;
        }
        
        const repRes = await axios.get(url);
        if (repRes.data.success) {
          if (isLoadMore) {
            setReports(prev => [...prev, ...repRes.data.data]);
          } else {
            setReports(repRes.data.data);
          }
          setOffset(currentOffset + 50);
          
          if (hasDateFilter) {
            setHasMore(false);
          } else {
            setHasMore(repRes.data.hasMore);
          }
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
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/department/location', {
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

  const handleExportCSV = async () => {
    if (!reports || reports.length === 0) return;
    
    const hasDateFilter = startDate && endDate;
    const dateStr = hasDateFilter ? `${startDate} to ${endDate}` : (reports[0]?.date ? formatDateToDDMMYYYY(reports[0].date) : new Date().toISOString().split('T')[0]);

    const headerRows = [
      `"Bharat Medical Hall"`,
      `"Report Type:","Department Attendance Report (${userDept || 'All'})"`,
      `"Date/Range:","${dateStr}"`,
      ``,
      `"Name","Date","Check In","Check Out","Worked Hours","Status","Breaks"`
    ];

    const dataRows = reports.map((r) => {
      const checkIn = r.check_in ? new Date(r.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
      const checkOut = r.check_out ? new Date(r.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
      const workedHrs = r.worked_mins != null ? formatMins(r.worked_mins) : (r.check_in && r.check_out ? formatMins(Math.floor((new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 60000)) : '-');
      const breaksStr = r.breaks ? r.breaks.map((b: any) => `${b.break_type} at ${new Date(b.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`).join('; ') : 'No breaks';
      return `"${r.full_name}","${formatDateToDDMMYYYY(r.date)}","${checkIn}","${checkOut}","${workedHrs}","${r.status}","${breaksStr.replace(/"/g, '""')}"`;
    });

    const csvContent = [...headerRows, ...dataRows].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `attendance_${userDept}.csv`);
      a.click();
    } else {
      try {
        const path = `${FileSystem.documentDirectory}attendance_${userDept}.csv`;
        await FileSystem.writeAsStringAsync(path, csvContent, { encoding: 'utf8' });
        await Sharing.shareAsync(path);
      } catch (e: any) {
        Alert.alert("Error", "Failed to export CSV: " + e.message);
      }
    }
  };

  const handlePrint = async () => {
    if (!reports || reports.length === 0) return;

    const hasDateFilter = startDate && endDate;
    const dateStr = hasDateFilter ? `${startDate} to ${endDate}` : (reports[0]?.date ? formatDateToDDMMYYYY(reports[0].date) : new Date().toISOString().split('T')[0]);

    const tableHeadersHtml = `
      <tr>
        <th>Name</th>
        <th>Date</th>
        <th>Check In</th>
        <th>Check Out</th>
        <th>Worked</th>
        <th>Status</th>
        <th>Breaks</th>
      </tr>
    `;

    const tableRowsHtml = reports.map(r => {
      const checkIn = r.check_in ? new Date(r.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
      const checkOut = r.check_out ? new Date(r.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
      const workedHrs = r.worked_mins != null ? formatMins(r.worked_mins) : (r.check_in && r.check_out ? formatMins(Math.floor((new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 60000)) : '-');
      const breaksHtml = r.breaks && r.breaks.length > 0 
        ? r.breaks.map((b: any) => `<div>${b.break_type}: ${new Date(b.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`).join('')
        : '-';
      return `
        <tr>
          <td><b>${r.full_name}</b></td>
          <td>${formatDateToDDMMYYYY(r.date)}</td>
          <td>${checkIn}</td>
          <td>${checkOut}</td>
          <td>${workedHrs}</td>
          <td>${r.status}</td>
          <td>${breaksHtml}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <style>
            @page { size: portrait; margin: 8mm; }
            body { font-family: sans-serif; padding: 10px; color: #334155; }
            h1 { color: #0f172a; margin-bottom: 4px; text-align: center; font-size: 18px; }
            .meta-section { margin-top: 10px; margin-bottom: 12px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 10px; }
            .meta-row { display: flex; margin-bottom: 4px; font-size: 11px; }
            .meta-label { font-weight: bold; width: 130px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9px; }
            th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: top; }
            th { background-color: #f8fafc; font-weight: bold; color: #1e293b; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Bharat Medical Hall</h1>
          <div class="meta-section">
            <div class="meta-row"><span class="meta-label">Report Type:</span><span>Department Attendance Report</span></div>
            <div class="meta-row"><span class="meta-label">Department:</span><span>${userDept || '-'}</span></div>
            <div class="meta-row"><span class="meta-label">Date/Range:</span><span>${dateStr}</span></div>
          </div>
          <table>
            <thead>${tableHeadersHtml}</thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(htmlContent);
          doc.close();
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            document.body.removeChild(iframe);
          }, 500);
        }
      } else {
        await Print.printAsync({ html: htmlContent });
      }
    } catch (e: any) {
      Alert.alert("Error", "Failed to print: " + e.message);
    }
  };

  if (loading) {
    return <View style={{flex: 1, justifyContent: 'center', alignItems:'center'}}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 15 }}>
        <Text style={[styles.header, { marginBottom: 0 }]}>{userDept} Attendance</Text>
        <View style={{ flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 8, padding: 4 }}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'department' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('department')}
          >
            <Text style={[styles.tabText, activeTab === 'department' && styles.tabTextActive]}>Department Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'personal' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('personal')}
          >
            <Text style={[styles.tabText, activeTab === 'personal' && styles.tabTextActive]}>My Attendance</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'personal' ? (
        <MyAttendanceHistory />
      ) : (
        <>
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

        <View style={{
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: isDesktop ? 'center' : 'stretch',
          marginBottom: 15,
          gap: 10,
          flexWrap: 'wrap',
          zIndex: 1000
        }}>
          {/* Date Range Picker block */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#f3f4f6',
            padding: 6,
            borderRadius: 8,
            alignSelf: 'flex-start'
          }}>
            {Platform.OS === 'web' ? (
              <>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  style={{padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', width: '130px', minHeight: '38px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#000'}}
                />
                <Text style={{color: '#6b7280', fontWeight: '500', marginHorizontal: 2}}>to</Text>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  style={{padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', width: '130px', minHeight: '38px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#000'}}
                />
              </>
            ) : (
              <>
                <TextInput style={[styles.input, {minWidth: 100, margin: 0, padding: 8, height: 38}]} placeholder="YYYY-MM-DD" value={startDate} onChangeText={setStartDate} />
                <Text style={{color: '#6b7280', marginHorizontal: 2}}>to</Text>
                <TextInput style={[styles.input, {minWidth: 100, margin: 0, padding: 8, height: 38}]} placeholder="YYYY-MM-DD" value={endDate} onChangeText={setEndDate} />
              </>
            )}
          </View>

          {/* Employee Search Dropdown */}
          <SearchableDropdown
            options={[
              { label: 'All', value: 'All', full_name: 'All', email: '', mobile: '' },
              ...allUsers
                .filter(u => u.type === 'employee' && (u.department === userDept || !userDept))
                .map(u => ({
                  label: `${u.full_name} (${u.role || ''} - ${u.department || ''})`,
                  value: u.full_name,
                  full_name: u.full_name,
                  email: u.email || '',
                  mobile: u.mobile || ''
                }))
            ]}
            value={searchQuery || 'All'}
            onChange={(val: string) => setSearchQuery(val === 'All' ? '' : val)}
            placeholder="Search Employee"
            searchPlaceholder="Search name, email, phone..."
          />

          {/* Apply and Clear buttons */}
          <View style={{flexDirection: 'row', gap: 4, alignItems: 'center'}}>
            <TouchableOpacity style={{backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center', minHeight: 40}} onPress={() => fetchData(false)}>
              <Text style={{color: 'white', fontWeight: 'bold', fontSize: 13}}>Apply</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{backgroundColor: '#6b7280', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center', minHeight: 40}} 
              onPress={() => { 
                setStartDate(''); 
                setEndDate(''); 
                setSearchQuery(''); 
                fetchData(true); 
              }}
            >
              <Text style={{color: 'white', fontWeight: 'bold', fontSize: 13}}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
          <View style={[styles.table, { minWidth: 1200 }]}>
            <View style={styles.tableRowHeader}>
            <Text style={[styles.tableCellHeader, { width: 60 }]}>S.No</Text>
            <Text style={[styles.tableCellHeader, { width: 250 }]}>Name</Text>
            <Text style={[styles.tableCellHeader, { width: 100 }]}>Date</Text>
            <Text style={[styles.tableCellHeader, { width: 100 }]}>Shift</Text>
            <Text style={[styles.tableCellHeader, { width: 100 }]}>Check In</Text>
            <Text style={[styles.tableCellHeader, { width: 100 }]}>Check Out</Text>
            <Text style={[styles.tableCellHeader, { width: 100 }]}>Worked</Text>
            <Text style={[styles.tableCellHeader, { width: 120 }]}>Deviation</Text>
            <Text style={[styles.tableCellHeader, { width: 120 }]}>Status</Text>
            <Text style={[styles.tableCellHeader, { width: 100 }]}>Action</Text>
            </View>
          {reports.map((r, i) => (
            <View 
              key={i} 
              style={styles.tableRow}
            >
              <Text style={[styles.tableCell, { width: 60, fontWeight: 'bold' }]}>{i + 1}</Text>
              <View style={[styles.tableCellView, { width: 250 }]}>
                <Text style={{fontWeight: '700', color: Colors.light.text}}>{r.full_name}</Text>
                <Text style={{fontSize: 12, color: Colors.light.icon}}>{r.email}</Text>
                <Text style={{fontSize: 12, color: Colors.light.icon}}>{r.mobile}</Text>
              </View>
              <Text style={[styles.tableCell, { width: 100 }]}>{formatDateToDDMMYYYY(r.date)}</Text>
              <View style={[styles.tableCellView, { width: 100 }]}>
                {r.shiftIn && r.shiftOut ? <Text style={{fontSize: 12, color: Colors.light.text}}>{r.shiftIn} - {r.shiftOut}</Text> : <Text style={{fontSize: 12, color: Colors.light.icon}}>-</Text>}
              </View>
              <Text style={[styles.tableCell, { width: 100 }]}>{r.check_in ? new Date(r.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</Text>
              <Text style={[styles.tableCell, { width: 100 }]}>{r.check_out ? new Date(r.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</Text>
              <View style={[styles.tableCellView, { width: 100 }]}>
                <Text style={{fontWeight: 'bold', color: Colors.light.text}}>{r.worked_mins != null ? formatMins(r.worked_mins) : (r.check_in && r.check_out ? formatMins(Math.floor((new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 60000)) : '-')}</Text>
              </View>
              <View style={[styles.tableCellView, { width: 120 }]}>
                {r.late_checkin_mins > 0 ? <Text style={{fontSize: 12, color: '#ef4444'}}>Late In: {formatMins(r.late_checkin_mins)}</Text> : null}
                {r.early_checkout_mins > 0 ? <Text style={{fontSize: 12, color: '#f59e0b'}}>Early Out: {formatMins(r.early_checkout_mins)}</Text> : null}
                {r.extra_break_mins > 0 ? <Text style={{fontSize: 12, color: '#ef4444'}}>Extra Break: {formatMins(r.extra_break_mins)}</Text> : null}
                {(!r.late_checkin_mins && !r.early_checkout_mins && !r.extra_break_mins) ? <Text style={{fontSize: 12, color: '#10b981'}}>On Time</Text> : null}
              </View>
              <Text style={[styles.tableCell, { width: 120 }]}>{r.status}</Text>
              <View style={[styles.tableCellView, { width: 100, alignItems: 'center', justifyContent: 'center' }]}>
                <TouchableOpacity 
                  style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eff6ff', borderRadius: 8 }} 
                  onPress={() => {
                    setSelectedEmployeeId(r.employee_id);
                    setModalVisible(true);
                  }}
                >
                  <Text style={{color: Colors.light.primary, fontWeight: '600', fontSize: 12}}>Analytics</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          </View>
        </ScrollView>
        {hasMore && (
          <TouchableOpacity 
            style={{ paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 10 }} 
            onPress={() => fetchData(false, true)}
          >
            <Text style={{ color: Colors.light.primary, fontWeight: '600', fontSize: 14, textDecorationLine: 'underline' }}>
              Load More
            </Text>
          </TouchableOpacity>
        )}
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
        </>
      )}
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
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableCellHeader: { padding: 16, fontSize: 13, fontWeight: '700', color: Colors.light.icon, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  tableCell: { padding: 16, fontSize: 14, color: Colors.light.text, fontWeight: '500' },
  tableCellView: { padding: 16, justifyContent: 'center' },
  thumb: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'white' },
  thumbPlaceholder: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e5e7eb', borderWidth: 2, borderColor: 'white' },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  tabBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: Colors.light.primary },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6'
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginTop: 12, marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: 'white', borderRadius: 12, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  modalInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 }
});

const webInputStyle = { width: '100%', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, outlineStyle: 'none' as any, fontFamily: 'inherit' };
