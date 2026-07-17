import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import axios from 'axios';
import { X, Clock, AlertTriangle, CheckCircle, Download } from 'lucide-react-native';
import { Platform, Alert } from 'react-native';

const formatDateToDDMMYYYY = (dateStr: any) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  employeeId: number | null;
  userType?: 'employee' | 'sub_admin';
}

export default function EmployeeAnalyticsModal({ visible, onClose, employeeId, userType = 'employee' }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const formatMins = (mins: number) => {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getWorkedHours = (r: any) => {
    if (r.worked_mins != null) return formatMins(r.worked_mins);
    if (r.check_in && r.check_out) {
      let workMs = new Date(r.check_out).getTime() - new Date(r.check_in).getTime();
      if (r.breaks && r.breaks.length > 0) {
        const sortedBreaks = [...r.breaks].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        let currentBreakIn: Date | null = null;
        sortedBreaks.forEach((b: any) => {
          if (b.break_type === 'Break In') {
            currentBreakIn = new Date(b.timestamp);
          } else if (b.break_type === 'Break Out' && currentBreakIn) {
            const breakDuration = new Date(b.timestamp).getTime() - currentBreakIn.getTime();
            workMs -= breakDuration;
            currentBreakIn = null;
          }
        });
      }
      return formatMins(Math.floor(workMs / 60000));
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

  useEffect(() => {
    if (visible && employeeId) {
      fetchAnalytics();
    }
  }, [visible, employeeId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/attendance/employee-analytics?employeeId=${employeeId}&userType=${userType}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const exportEmployeeData = async () => {
    if (!data || !data.history) return;
    
    let csvContent = "Name,Email,Mobile,Department,Date,Check In,Check Out,Status,Breaks\n";
    data.history.forEach((r: any) => {
      const checkIn = r.check_in ? new Date(r.check_in).toLocaleTimeString() : 'N/A';
      const checkOut = r.check_out ? new Date(r.check_out).toLocaleTimeString() : 'N/A';
      const breaksStr = r.breaks ? r.breaks.map((b: any) => `${b.break_type} at ${new Date(b.timestamp).toLocaleTimeString()}`).join('; ') : 'No breaks';
      
      csvContent += `${data.employee.full_name},${data.employee.email || 'N/A'},${data.employee.mobile || 'N/A'},${data.employee.department},${formatDateToDDMMYYYY(r.date)},${checkIn},${checkOut},${r.status},"${breaksStr}"\n`;
    });

    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${data.employee.full_name.replace(/\s+/g, '_')}_Analytics.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        Alert.alert('Notice', 'CSV Export is only supported on web right now.');
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{data?.employee?.full_name || 'Loading...'}</Text>
              <Text style={styles.subtitle}>{data?.employee?.department || ''}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : data ? (
            <ScrollView>
              {/* Analytics Summary */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Clock size={24} color="#3b82f6" />
                  <Text style={styles.statValue}>{data.analytics.avgWorkHours}h</Text>
                  <Text style={styles.statLabel}>Avg Work Hours</Text>
                </View>
                <View style={styles.statCard}>
                  <CheckCircle size={24} color="#10b981" />
                  <Text style={styles.statValue}>{data.analytics.earlyCheckInPercent}%</Text>
                  <Text style={styles.statLabel}>Early Check In</Text>
                </View>
                <View style={styles.statCard}>
                  <AlertTriangle size={24} color="#f59e0b" />
                  <Text style={styles.statValue}>{data.analytics.lateCheckInPercent}%</Text>
                  <Text style={styles.statLabel}>Late Check In</Text>
                </View>
                <View style={styles.statCard}>
                  <Clock size={24} color="#0284c7" />
                  <Text style={styles.statValue}>{data.analytics.currentMonthWorkHours || '0m'}</Text>
                  <Text style={styles.statLabel}>Month Work Hours</Text>
                </View>
                <View style={styles.statCard}>
                  <CheckCircle size={24} color="#059669" />
                  <Text style={styles.statValue}>{data.analytics.currentMonthDaysPresent || 0}d</Text>
                  <Text style={styles.statLabel}>Month Days Present</Text>
                </View>
              </View>

              {/* History Table */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Attendance History</Text>
                <TouchableOpacity style={styles.exportBtn} onPress={exportEmployeeData}>
                  <Download size={16} color="white" style={{ marginRight: 5 }} />
                  <Text style={styles.exportText}>Export</Text>
                </TouchableOpacity>
              </View>
              
              {(data?.employee?.shiftIn || data?.employee?.breakStart) ? (
                <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 15 }}>
                  {data?.employee?.shiftIn ? (
                    <View style={{ backgroundColor: '#eff6ff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' }}>
                      <Text style={{ fontSize: 12, color: '#1e40af', fontWeight: '600' }}>
                        Shift Time: {data.employee.shiftIn} - {data.employee.shiftOut || '-'}
                      </Text>
                    </View>
                  ) : null}
                  {data?.employee?.breakStart ? (
                    <View style={{ backgroundColor: '#fff7ed', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#fed7aa' }}>
                      <Text style={{ fontSize: 12, color: '#9a3412', fontWeight: '600' }}>
                        Break Time: {data.employee.breakStart} - {data.employee.breakEnd || '-'}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={{ padding: 20, paddingTop: 0 }}>
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                  <View style={{ minWidth: 800, width: '100%' }}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableCellHeader, { flex: 0.5 }]}>In</Text>
                      <Text style={styles.tableCellHeader}>Date</Text>
                      <Text style={styles.tableCellHeader}>Check In</Text>
                      <Text style={styles.tableCellHeader}>Check Out</Text>
                      <Text style={styles.tableCellHeader}>Worked</Text>
                      <Text style={[styles.tableCellHeader, { flex: 1.2 }]}>Deviation</Text>
                      <Text style={[styles.tableCellHeader, { flex: 2 }]}>Breaks</Text>
                    </View>
                    {data.history.map((row: any, idx: number) => (
                      <View key={idx} style={styles.tableRow}>
                        <View style={[styles.tableCell, {flex: 0.5, flexDirection: 'row'}]}>
                          {row.check_in_image ? <Image source={{uri: row.check_in_image}} style={styles.thumb} /> : <View style={styles.thumbPlaceholder} />}
                          {row.check_out_image ? <Image source={{uri: row.check_out_image}} style={[styles.thumb, {marginLeft: -10}]} /> : null}
                        </View>
                        <Text style={styles.tableCell}>{formatDateToDDMMYYYY(row.date)}</Text>
                        <Text style={styles.tableCell}>{row.check_in ? new Date(row.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</Text>
                        <Text style={styles.tableCell}>{row.check_out ? new Date(row.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</Text>
                        <Text style={[styles.tableCell, { fontWeight: '600' }]}>{getWorkedHours(row)}</Text>
                        <View style={[styles.tableCell, { flex: 1.2, justifyContent: 'center' }]}>
                          {row.late_checkin_mins > 0 ? <Text style={{fontSize: 12, color: '#ef4444'}}>Late In: {formatMins(row.late_checkin_mins)}</Text> : null}
                          {row.early_checkout_mins > 0 ? <Text style={{fontSize: 12, color: '#f59e0b'}}>Early Out: {formatMins(row.early_checkout_mins)}</Text> : null}
                          {row.extra_break_mins > 0 ? <Text style={{fontSize: 12, color: '#ef4444'}}>Extra Break: {formatMins(row.extra_break_mins)}</Text> : null}
                          {(!row.late_checkin_mins && !row.early_checkout_mins && !row.extra_break_mins) ? <Text style={{fontSize: 12, color: '#10b981'}}>On Time</Text> : null}
                        </View>
                        <View style={[styles.tableCell, { flex: 2, justifyContent: 'center' }]}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1f2937', marginBottom: 4 }}>Total: {getBreakDuration(row)}</Text>
                          {row.breaks && row.breaks.length > 0 ? (
                            row.breaks.map((b: any, bi: number) => (
                              <Text key={bi} style={{ fontSize: 12, color: '#4b5563' }}>
                                {b.break_type}: {new Date(b.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </Text>
                            ))
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </ScrollView>
          ) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text>Failed to load data.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxWidth: 800,
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center'
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280' },
  closeBtn: { padding: 5 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    padding: 20,
    backgroundColor: '#f9fafb'
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginTop: 10 },
  statLabel: { fontSize: 14, color: '#6b7280', marginTop: 5 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  exportBtn: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  exportText: { color: 'white', fontWeight: 'bold' },
  table: { padding: 20, paddingTop: 0 },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 6,
    marginBottom: 5
  },
  tableCellHeader: { flex: 1, fontWeight: 'bold', color: '#4b5563', fontSize: 14 },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
    alignItems: 'center'
  },
  tableCell: { flex: 1, color: '#1f2937', fontSize: 14, justifyContent: 'center' },
  thumb: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'white' },
  thumbPlaceholder: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e5e7eb', borderWidth: 2, borderColor: 'white' }
});
