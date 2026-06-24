import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, Image, TouchableOpacity } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

import { Clock, CheckCircle, AlertTriangle, Coffee, Download } from 'lucide-react-native';

const Dropdown = ({ options, value, onChange }: any) => {
  if (Platform.OS === 'web') {
    return (
      <View style={{ padding: 0, justifyContent: 'center', minWidth: 150, backgroundColor: '#f3f4f6', borderRadius: 8 }}>
        {React.createElement(
          'select',
          {
            value: value,
            onChange: (e: any) => onChange(e.target.value),
            style: { width: '100%', height: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', padding: '10px', fontSize: '14px', color: '#111827' }
          },
          ...options.map((o: any) => React.createElement('option', { key: o, value: o }, o))
        )}
      </View>
    );
  }
  return <Text>Filter</Text>;
};

export default function EmployeeAttendanceHistory() {
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (forceClear = false) => {
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

      let url = `https://bmh-eitu.onrender.com/attendance/employee-analytics?employeeId=${user.id}`;
      if (!forceClear && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await axios.get(url);
      if (res.data.success) {
        setReports(res.data.history || []);
        setAnalytics(res.data.analytics);
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

  const handleExportCSV = () => {
    if (!filteredReports || filteredReports.length === 0) return;
    
    let csvContent = "Date,Check In,Check Out,Status,Late In (mins),Early Out (mins),Breaks\n";
    filteredReports.forEach((r) => {
      const checkIn = r.check_in ? new Date(r.check_in).toLocaleTimeString() : 'N/A';
      const checkOut = r.check_out ? new Date(r.check_out).toLocaleTimeString() : 'N/A';
      const breaksStr = r.breaks ? r.breaks.map((b: any) => `${b.break_type} at ${new Date(b.timestamp).toLocaleTimeString()}`).join('; ') : 'No breaks';
      
      csvContent += `${new Date(r.date).toLocaleDateString()},${checkIn},${checkOut},${r.status},${r.late_checkin_mins || 0},${r.early_checkout_mins || 0},"${breaksStr}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `my_attendance.csv`);
    a.click();
  };

  if (loading) {
    return <View style={{flex: 1, justifyContent: 'center', alignItems:'center'}}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>My Attendance History</Text>

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
        </View>
      )}

      <View style={[styles.section, {marginBottom: 20}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#f3f4f6', flexWrap: 'wrap', gap: 12}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap'}}>
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
                  <TouchableOpacity style={{backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, flex: 1, alignItems: 'center'}} onPress={() => fetchHistory(false)}>
                    <Text style={{color: 'white', fontWeight: 'bold'}}>Apply</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{backgroundColor: '#6b7280', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, flex: 1, alignItems: 'center'}} onPress={() => { setStartDate(''); setEndDate(''); fetchHistory(true); }}>
                    <Text style={{color: 'white', fontWeight: 'bold'}}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <Dropdown 
              options={['All', 'Late In', 'Early Out']} 
              value={statusFilter} 
              onChange={setStatusFilter} 
            />
          </View>

          <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8}} onPress={handleExportCSV}>
            <Download size={18} color="white" style={{marginRight: 8}} />
            <Text style={{color: 'white', fontWeight: 'bold'}}>Export CSV</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
          <View style={[styles.table, { minWidth: 800, width: '100%' }]}>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableCellHeader, { flex: 0.5 }]}>In</Text>
              <Text style={styles.tableCellHeader}>Date</Text>
              <Text style={styles.tableCellHeader}>Check In</Text>
              <Text style={styles.tableCellHeader}>Check Out</Text>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Breaks</Text>
              <Text style={styles.tableCellHeader}>Status</Text>
            </View>
          {filteredReports.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: Colors.light.icon }}>No attendance records found.</Text>
            </View>
          ) : filteredReports.map((r, i) => (
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
        </ScrollView>
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
  thumbPlaceholder: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e5e7eb', borderWidth: 2, borderColor: 'white' },
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
  statLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' }
});
