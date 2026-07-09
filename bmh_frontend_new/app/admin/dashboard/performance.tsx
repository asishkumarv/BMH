import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, TextInput, Pressable } from 'react-native';
import axios from 'axios';
import { ArrowUpDown, Calendar, Award, MapPin, TrendingUp, Clock, ShieldCheck, DollarSign, Star, AlertCircle, RefreshCw } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';

const API_URL = 'https://napi.bharatmedicalhallplus.com';

// Color threshold helpers according to specifications
const getStatusColor = (val: number, type: 'success' | 'on_time' | 'rating') => {
  if (type === 'success') {
    if (val >= 98) return '#10B981'; // Green
    if (val >= 95) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  }
  if (type === 'on_time') {
    if (val >= 95) return '#10B981';
    if (val >= 90) return '#F59E0B';
    return '#EF4444';
  }
  if (type === 'rating') {
    if (val >= 4.8) return '#10B981';
    if (val >= 4.5) return '#F59E0B';
    return '#EF4444';
  }
  return '#6B7280';
};

export default function AdminPerformance() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [filterRiderId, setFilterRiderId] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [filterValue, setFilterValue] = useState(''); // E.g., '2026-07'
  
  useEffect(() => {
    // Set initial filter value based on current month/date
    const today = new Date();
    const currentMonth = today.toISOString().substring(0, 7); // 'YYYY-MM'
    setFilterValue(currentMonth);
  }, []);

  useEffect(() => {
    if (filterValue !== '') {
      fetchPerformanceData();
    }
  }, [filterRiderId, filterPeriod, filterValue]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      let queryParams = [];
      if (filterRiderId) queryParams.push(`delivery_boy_id=${filterRiderId}`);
      
      if (filterPeriod === 'daily') {
        queryParams.push(`date=${filterValue}`);
      } else if (filterPeriod === 'monthly') {
        queryParams.push(`month=${filterValue}`);
      } else if (filterPeriod === 'yearly') {
        queryParams.push(`year=${filterValue}`);
      }

      const url = `${API_URL}/performance/admin-stats?${queryParams.join('&')}`;
      const res = await axios.get(url);
      if (res.data && res.data.success) {
        setStats(res.data.executiveDashboard);
        setRiders(res.data.riders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilterRiderId('');
    setFilterPeriod('monthly');
    const currentMonth = new Date().toISOString().substring(0, 7);
    setFilterValue(currentMonth);
  };

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Compiling Performance Analytics...</Text>
      </View>
    );
  }

  const executive = stats || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
      {/* Page Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Delivery Performance & KPA Dashboard</Text>
          <Text style={styles.subtitle}>Measure productivity, quality, and service levels of delivery executives</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchPerformanceData}>
          <RefreshCw size={18} color="#fff" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Reporting Filters</Text>
        <View style={styles.filtersRow}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Rider ID (Optional)</Text>
            {Platform.OS === 'web' ? (
              <select
                value={filterRiderId}
                onChange={(e) => setFilterRiderId(e.target.value)}
                style={styles.webSelect}
              >
                <option value="">All Executives</option>
                {riders.map(r => <option key={r.riderId} value={r.riderId}>{r.name}</option>)}
              </select>
            ) : (
              <TextInput
                style={styles.input}
                placeholder="Rider ID"
                value={filterRiderId}
                onChangeText={setFilterRiderId}
                keyboardType="numeric"
              />
            )}
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Period Selection</Text>
            <View style={styles.periodTabs}>
              {(['daily', 'monthly', 'yearly'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.periodTab, filterPeriod === tab && styles.periodTabActive]}
                  onPress={() => {
                    setFilterPeriod(tab);
                    const today = new Date().toISOString();
                    setFilterValue(
                      tab === 'daily' ? today.substring(0, 10) :
                      tab === 'monthly' ? today.substring(0, 7) :
                      today.substring(0, 4)
                    );
                  }}
                >
                  <Text style={[styles.periodTabText, filterPeriod === tab && styles.periodTabActiveText]}>
                    {tab.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>
              {filterPeriod === 'daily' ? 'Date (YYYY-MM-DD)' :
               filterPeriod === 'monthly' ? 'Month (YYYY-MM)' : 'Year (YYYY)'}
            </Text>
            <TextInput
              style={styles.input}
              value={filterValue}
              onChangeText={setFilterValue}
              placeholder={filterPeriod === 'daily' ? 'e.g. 2026-07-09' : 'e.g. 2026-07'}
            />
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.grid}>
        <View style={styles.kpiCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
            <Award size={20} color="#4F46E5" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Deliveries Success %</Text>
            <Text style={[styles.kpiValue, { color: getStatusColor(executive.deliverySuccessRate || 0, 'success') }]}>
              {executive.deliverySuccessRate || 0}%
            </Text>
            <Text style={styles.kpiSub}>Target: ≥98% Success</Text>
          </View>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
            <ShieldCheck size={20} color="#10B981" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Total Orders Delivered</Text>
            <Text style={styles.kpiValue}>{executive.totalOrdersDelivered || 0}</Text>
            <Text style={styles.kpiSub}>Assigned: {executive.totalOrdersAssigned || 0}</Text>
          </View>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Clock size={20} color="#D97706" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Avg. Delivery Cycle</Text>
            <Text style={styles.kpiValue}>{executive.averageDeliveryTimeMin || 0}m</Text>
            <Text style={styles.kpiSub}>In-Transit Duration</Text>
          </View>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#FDF2F8' }]}>
            <MapPin size={20} color="#DB2777" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Distance Covered</Text>
            <Text style={styles.kpiValue}>{executive.totalDistanceKM || 0} KM</Text>
            <Text style={styles.kpiSub}>Calculated via coordinates</Text>
          </View>
        </View>
      </View>

      {/* Cash Collection Summary */}
      <View style={[styles.card, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Total Cash & Payment Collection Accuracy</Text>
        <View style={styles.paymentsSummary}>
          <View style={styles.paymentCol}>
            <Text style={styles.paymentLabel}>Cash Collected (COD)</Text>
            <Text style={styles.paymentValue}>₹{executive.totalCashCollected?.toLocaleString('en-IN') || 0}</Text>
          </View>
          <View style={styles.paymentDivider} />
          <View style={styles.paymentCol}>
            <Text style={styles.paymentLabel}>Online / UPI Received</Text>
            <Text style={styles.paymentValue}>₹{executive.totalOnlinePayments?.toLocaleString('en-IN') || 0}</Text>
          </View>
          <View style={styles.paymentDivider} />
          <View style={styles.paymentCol}>
            <Text style={styles.paymentLabel}>Total Combined Collection</Text>
            <Text style={[styles.paymentValue, { color: Colors.light.primary }]}>
              ₹{((executive.totalCashCollected || 0) + (executive.totalOnlinePayments || 0)).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>

      {/* Leaderboard/Ranking */}
      <View style={styles.rankingsRow}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.sectionTitle}>Top Performing Executives</Text>
          {(executive.topExecutives || []).map((exec: any, index: number) => (
            <View key={exec.riderId} style={styles.rankItem}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rankName}>{exec.name}</Text>
                <Text style={styles.rankDetails}>Delivered: {exec.delivered} orders | Rating: {exec.rating} ★</Text>
              </View>
              <Text style={[styles.rankScore, { color: '#10B981' }]}>{exec.successRate}%</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.sectionTitle}>Needs Attention (Issues & Failures)</Text>
          {(executive.bottomExecutives || []).map((exec: any, index: number) => (
            <View key={exec.riderId} style={styles.rankItem}>
              <View style={[styles.rankBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.rankText, { color: '#EF4444' }]}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rankName}>{exec.name}</Text>
                <Text style={styles.rankDetails}>Failed/Returned: {exec.failed + exec.returned} | Rating: {exec.rating} ★</Text>
              </View>
              <Text style={[styles.rankScore, { color: '#EF4444' }]}>{exec.successRate}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Detail Table */}
      <View style={[styles.card, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Rider Breakdown Statistics</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 150 }]}>Executive</Text>
              <Text style={[styles.th, { width: 100 }]}>Shift</Text>
              <Text style={[styles.th, { width: 80 }]}>Assigned</Text>
              <Text style={[styles.th, { width: 80 }]}>Delivered</Text>
              <Text style={[styles.th, { width: 80 }]}>Success %</Text>
              <Text style={[styles.th, { width: 100 }]}>Avg Time</Text>
              <Text style={[styles.th, { width: 100 }]}>Distance</Text>
              <Text style={[styles.th, { width: 100 }]}>Attendance</Text>
              <Text style={[styles.th, { width: 80 }]}>Rating</Text>
            </View>

            {riders.map((r) => (
              <View key={r.riderId} style={styles.tableRow}>
                <View style={[{ width: 150 }]}>
                  <Text style={styles.riderName}>{r.name}</Text>
                  <Text style={styles.riderPhone}>{r.phone}</Text>
                </View>
                <Text style={[styles.td, { width: 100 }]}>{r.shift}</Text>
                <Text style={[styles.td, { width: 80 }]}>{r.assigned}</Text>
                <Text style={[styles.td, { width: 80 }]}>{r.delivered}</Text>
                <View style={[styles.td, { width: 80 }]}>
                  <Text style={[styles.badge, { backgroundColor: getStatusColor(r.successRate, 'success') + '15', color: getStatusColor(r.successRate, 'success') }]}>
                    {r.successRate}%
                  </Text>
                </View>
                <Text style={[styles.td, { width: 100 }]}>{r.avgDeliveryTimeMin} min</Text>
                <Text style={[styles.td, { width: 100 }]}>{r.totalDistanceKM} KM</Text>
                <Text style={[styles.td, { width: 100 }]}>{r.workingDays} days</Text>
                <Text style={[styles.td, { width: 80, fontWeight: '700', color: getStatusColor(r.rating, 'rating') }]}>{r.rating} ★</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  refreshBtn: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  refreshText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-end',
  },
  filterGroup: {
    flex: 1,
    minWidth: 200,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  webSelect: {
    width: '100%',
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#111827',
  },
  input: {
    width: '100%',
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodTabActive: {
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  periodTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  periodTabActiveText: {
    color: Colors.light.primary,
  },
  resetBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  paymentsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentCol: {
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  paymentValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  paymentDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  rankingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 20,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  rankName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rankDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  rankScore: {
    fontSize: 16,
    fontWeight: '800',
  },
  table: {
    minWidth: 900,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  th: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  td: {
    fontSize: 14,
    color: '#4B5563',
    paddingHorizontal: 8,
  },
  riderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 8,
  },
  riderPhone: {
    fontSize: 11,
    color: '#6B7280',
    paddingHorizontal: 8,
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '700',
  },
});
