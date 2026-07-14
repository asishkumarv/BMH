import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, TextInput, Pressable } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Award, Clock, Calendar, CheckCircle2, User, DollarSign, CalendarDays, ClipboardList, ShieldAlert, ArrowLeft } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import { useRouter } from 'expo-router';

const API_URL = 'https://napi.bharatmedicalhallplus.com';

const getStatusBadgeColor = (status: string) => {
  const s = status?.toLowerCase() || '';
  if (['completed', 'consulted', 'present', 'regular'].includes(s)) return { bg: '#dcfce7', text: '#10b981' };
  if (['pending', 'in progress', 'booked', 'checked in'].includes(s)) return { bg: '#fef3c7', text: '#d97706' };
  return { bg: '#fee2e2', text: '#ef4444' };
};

export default function EmployeePerformance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [month, setMonth] = useState(''); // YYYY-MM
  const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'attendance' | 'bookings'>('tasks');

  useEffect(() => {
    // Set initial filter value based on current month
    const today = new Date();
    const currentMonth = today.toISOString().substring(0, 7); // 'YYYY-MM'
    setMonth(currentMonth);

    const loadUser = async () => {
      try {
        let userDataStr = null;
        if (Platform.OS === 'web') {
          userDataStr = localStorage.getItem('employeeUser');
        } else {
          userDataStr = await AsyncStorage.getItem('employeeUser');
        }
        if (userDataStr) {
          setUser(JSON.parse(userDataStr));
        } else {
          router.replace('/employee/login');
        }
      } catch (e) {
        console.error('Failed to load employee user', e);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.id && month) {
      fetchPerformanceData();
    }
  }, [user, month]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/performance/employee-stats/${user.id}?month=${month}`);
      if (res.data && res.data.success) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch performance stats', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading performance report...</Text>
      </View>
    );
  }

  const perf = stats?.performance || {};
  const basic = stats?.basicDetails || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Performance Report</Text>
          <Text style={styles.subtitle}>{basic.name} • {basic.role} ({basic.department})</Text>
        </View>
        
        {/* Date Filter */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Select Month</Text>
          <TextInput
            style={styles.dateInput}
            value={month}
            onChangeText={setMonth}
            placeholder="YYYY-MM"
          />
        </View>
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.grid}>
        <View style={styles.kpiCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
            <Award size={20} color="#4F46E5" />
          </View>
          <View style={styles.kpiInfo}>
            <Text style={styles.kpiLabel}>Task Completion</Text>
            <Text style={styles.kpiValue}>{perf.taskCompletionRate || 0}%</Text>
            <Text style={styles.kpiSub}>{perf.tasksCompleted || 0} / {perf.tasksAssigned || 0} completed</Text>
          </View>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
            <Clock size={20} color="#0284C7" />
          </View>
          <View style={styles.kpiInfo}>
            <Text style={styles.kpiLabel}>Hours Worked</Text>
            <Text style={styles.kpiValue}>{perf.workingHours || 0} hrs</Text>
            <Text style={styles.kpiSub}>{perf.workingDays || 0} present days</Text>
          </View>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
            <CheckCircle2 size={20} color="#10B981" />
          </View>
          <View style={styles.kpiInfo}>
            <Text style={styles.kpiLabel}>On-Time Tasks</Text>
            <Text style={styles.kpiValue}>{perf.onTimeRate || 0}%</Text>
            <Text style={styles.kpiSub}>SLA compliance</Text>
          </View>
        </View>

        {perf.bookingsMade > 0 && (
          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#F59E0B15' }]}>
              <User size={20} color="#D97706" />
            </View>
            <View style={styles.kpiInfo}>
              <Text style={styles.kpiLabel}>Bookings Revenue</Text>
              <Text style={styles.kpiValue}>₹{(perf.bookingRevenue || 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.kpiSub}>{perf.bookingsMade} consultations booked</Text>
            </View>
          </View>
        )}
      </View>

      {/* Tabs Switcher for details lists */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeSubTab === 'tasks' && styles.tabButtonActive]}
          onPress={() => setActiveSubTab('tasks')}
        >
          <ClipboardList size={16} color={activeSubTab === 'tasks' ? Colors.light.primary : '#64748b'} />
          <Text style={[styles.tabText, activeSubTab === 'tasks' && styles.tabTextActive]}>Tasks ({stats?.tasksList?.length || 0})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeSubTab === 'attendance' && styles.tabButtonActive]}
          onPress={() => setActiveSubTab('attendance')}
        >
          <CalendarDays size={16} color={activeSubTab === 'attendance' ? Colors.light.primary : '#64748b'} />
          <Text style={[styles.tabText, activeSubTab === 'attendance' && styles.tabTextActive]}>Attendance ({stats?.attendanceList?.length || 0})</Text>
        </TouchableOpacity>

        {perf.bookingsMade > 0 && (
          <TouchableOpacity
            style={[styles.tabButton, activeSubTab === 'bookings' && styles.tabButtonActive]}
            onPress={() => setActiveSubTab('bookings')}
          >
            <User size={16} color={activeSubTab === 'bookings' ? Colors.light.primary : '#64748b'} />
            <Text style={[styles.tabText, activeSubTab === 'bookings' && styles.tabTextActive]}>Bookings ({stats?.bookingsList?.length || 0})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Contents */}
      <View style={styles.detailsCard}>
        {activeSubTab === 'tasks' && (
          <View style={styles.listContainer}>
            {(!stats?.tasksList || stats.tasksList.length === 0) ? (
              <Text style={styles.emptyText}>No tasks assigned for this month.</Text>
            ) : (
              stats.tasksList.map((t: any) => {
                const badge = getStatusBadgeColor(t.status);
                return (
                  <View key={t.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <Text style={styles.itemTitle}>{t.title}</Text>
                      {t.description && <Text style={styles.itemSubtitle}>{t.description}</Text>}
                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>Priority: {t.priority || 'Medium'}</Text>
                        {t.dueDate && <Text style={styles.metaText}>Due: {new Date(t.dueDate).toLocaleDateString('en-IN')}</Text>}
                        {t.durationHours != null && <Text style={styles.metaText}>Took: {t.durationHours} hrs</Text>}
                      </View>
                    </View>
                    <View style={[styles.badgeContainer, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>{t.status}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeSubTab === 'attendance' && (
          <View style={styles.listContainer}>
            {(!stats?.attendanceList || stats.attendanceList.length === 0) ? (
              <Text style={styles.emptyText}>No attendance records found.</Text>
            ) : (
              stats.attendanceList.map((a: any) => {
                const badge = getStatusBadgeColor(a.status);
                const checkInTime = a.checkin ? new Date(a.checkin).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';
                const checkOutTime = a.checkout ? new Date(a.checkout).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';

                return (
                  <View key={a.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <Text style={styles.itemTitle}>{new Date(a.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>In: {checkInTime}</Text>
                        <Text style={styles.metaText}>Out: {checkOutTime}</Text>
                        {a.sessionHours && <Text style={styles.metaText}>Duration: {a.sessionHours}</Text>}
                      </View>
                    </View>
                    <View style={[styles.badgeContainer, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>{a.status || 'Present'}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeSubTab === 'bookings' && (
          <View style={styles.listContainer}>
            {(!stats?.bookingsList || stats.bookingsList.length === 0) ? (
              <Text style={styles.emptyText}>No patient bookings log found.</Text>
            ) : (
              stats.bookingsList.map((b: any) => {
                const badge = getStatusBadgeColor(b.status);
                return (
                  <View key={b.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <Text style={styles.itemTitle}>{b.patientName}</Text>
                      <Text style={styles.itemSubtitle}>Doctor: {b.doctorName}</Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>Date: {new Date(b.createdAt).toLocaleDateString('en-IN')}</Text>
                        <Text style={styles.metaText}>Payment: {b.paymentMode}</Text>
                        <Text style={[styles.metaText, { fontWeight: '700', color: Colors.light.primary }]}>Fee: ₹{b.fee}</Text>
                      </View>
                    </View>
                    <View style={[styles.badgeContainer, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>{b.status}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  filterContainer: {
    minWidth: 120,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  dateInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiInfo: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#4F46E510',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: Colors.light.primary,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  listContainer: {
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    paddingVertical: 20,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 16,
  },
  listItemLeft: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  badgeContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
