import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { X, Clock, AlertTriangle, CheckCircle, Download } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface Props {
  visible: boolean;
  onClose: () => void;
  employeeId: number | null;
}

export default function EmployeeAnalyticsModal({ visible, onClose, employeeId }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (visible && employeeId) {
      fetchAnalytics();
    }
  }, [visible, employeeId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`https://bmh-eitu.onrender.com/attendance/employee-analytics?employeeId=${employeeId}`);
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
    
    let csvContent = "Date,Check In,Check Out,Status,Breaks\n";
    data.history.forEach((r: any) => {
      const checkIn = r.check_in ? new Date(r.check_in).toLocaleTimeString() : 'N/A';
      const checkOut = r.check_out ? new Date(r.check_out).toLocaleTimeString() : 'N/A';
      const breaksStr = r.breaks ? r.breaks.map((b: any) => `${b.break_type} at ${new Date(b.timestamp).toLocaleTimeString()}`).join('; ') : 'No breaks';
      
      csvContent += `${new Date(r.date).toLocaleDateString()},${checkIn},${checkOut},${r.status},"${breaksStr}"\n`;
    });

    try {
      if (typeof document !== 'undefined') {
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
        const fileUri = FileSystem.documentDirectory + `${data.employee.full_name.replace(/\s+/g, '_')}_Analytics.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        }
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
            <ScrollView style={{ flex: 1 }}>
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
              </View>

              {/* History Table */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Attendance History</Text>
                <TouchableOpacity style={styles.exportBtn} onPress={exportEmployeeData}>
                  <Download size={16} color="white" style={{ marginRight: 5 }} />
                  <Text style={styles.exportText}>Export</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <Text style={styles.tableCellHeader}>Date</Text>
                  <Text style={styles.tableCellHeader}>Check In</Text>
                  <Text style={styles.tableCellHeader}>Check Out</Text>
                  <Text style={[styles.tableCellHeader, { flex: 2 }]}>Breaks</Text>
                </View>
                {data.history.map((row: any, idx: number) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{new Date(row.date).toLocaleDateString()}</Text>
                    <Text style={styles.tableCell}>{row.check_in ? new Date(row.check_in).toLocaleTimeString() : '--'}</Text>
                    <Text style={styles.tableCell}>{row.check_out ? new Date(row.check_out).toLocaleTimeString() : '--'}</Text>
                    <View style={[styles.tableCell, { flex: 2 }]}>
                      {row.breaks && row.breaks.length > 0 ? (
                        row.breaks.map((b: any, bi: number) => (
                          <Text key={bi} style={{ fontSize: 12, color: '#4b5563' }}>
                            {b.break_type}: {new Date(b.timestamp).toLocaleTimeString()}
                          </Text>
                        ))
                      ) : (
                        <Text style={{ fontSize: 12, color: '#9ca3af' }}>No breaks</Text>
                      )}
                    </View>
                  </View>
                ))}
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
  tableCell: { flex: 1, color: '#1f2937', fontSize: 14 }
});
