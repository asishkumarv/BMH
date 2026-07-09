import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Award, Calendar, DollarSign, MapPin, ShieldCheck, Star, Clock, AlertCircle } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';

const API_URL = 'https://napi.bharatmedicalhallplus.com';

export default function RiderPerformance() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [filterMonth, setFilterMonth] = useState('');

  useEffect(() => {
    const today = new Date();
    const currentMonth = today.toISOString().substring(0, 7); // 'YYYY-MM'
    setFilterMonth(currentMonth);
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      let userStr = null;
      if (Platform.OS === 'web') {
        userStr = localStorage.getItem('employeeUser');
      } else {
        userStr = await AsyncStorage.getItem('employeeUser');
      }
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user && filterMonth) {
      fetchPerformance();
    }
  }, [user, filterMonth]);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/performance/rider-stats/${user.id}?month=${filterMonth}`);
      if (res.data && res.data.success) {
        setData(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Fetching Performance History...</Text>
      </View>
    );
  }

  const basic = data?.basicDetails || {};
  const perf = data?.performance || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      {/* Date Filter */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Performance & KPI</Text>
          <Text style={styles.subtitle}>Track your delivery metrics, ratings, and incentives</Text>
        </View>
        
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Month:</Text>
          <TextInput
            style={styles.filterInput}
            value={filterMonth}
            onChangeText={setFilterMonth}
            placeholder="YYYY-MM"
          />
        </View>
      </View>

      {/* Basic Rider Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Basic Rider Profile</Text>
        <View style={styles.profileGrid}>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Employee ID:</Text>
            <Text style={styles.profileValue}>{basic.employeeId || 'N/A'}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Full Name:</Text>
            <Text style={styles.profileValue}>{basic.name || 'N/A'}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Shift Schedule:</Text>
            <Text style={styles.profileValue}>{basic.shift || 'N/A'}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Supervisor:</Text>
            <Text style={styles.profileValue}>{basic.supervisor || 'Super Admin'}</Text>
          </View>
        </View>
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.grid}>
        <View style={styles.kpiCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
            <ShieldCheck size={20} color="#4F46E5" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Deliveries Success</Text>
            <Text style={[styles.kpiValue, { color: perf.successRate >= 98 ? '#10B981' : perf.successRate >= 95 ? '#F59E0B' : '#EF4444' }]}>
              {perf.successRate || 0}%
            </Text>
            <Text style={styles.kpiSub}>Delivered: {perf.ordersDelivered || 0} / {perf.ordersAssigned || 0}</Text>
          </View>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
            <DollarSign size={20} color="#10B981" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Incentive Earned</Text>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>₹{perf.incentiveEarned || 0}</Text>
            <Text style={styles.kpiSub}>Rate: ₹15 per delivery</Text>
          </View>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Star size={20} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Average Rating</Text>
            <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>{perf.rating || 0} ★</Text>
            <Text style={styles.kpiSub}>Based on OTP verifies</Text>
          </View>
        </View>
      </View>

      {/* Details Grid */}
      <View style={[styles.card, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Operational Performance Details</Text>
        <View style={styles.detailsList}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Distance Traveled</Text>
            <Text style={styles.detailValue}>{perf.totalDistanceKM || 0} KM</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fuel Reimbursement (₹3.5/KM)</Text>
            <Text style={styles.detailValue}>₹{perf.fuelReimbursement || 0}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Average Delivery Cycle Duration</Text>
            <Text style={styles.detailValue}>{perf.avgDeliveryTimeMin || 0} mins</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Working Days</Text>
            <Text style={styles.detailValue}>{perf.workingDays || 0} days</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Active Working Hours</Text>
            <Text style={styles.detailValue}>{perf.workingHours || 0} hrs</Text>
          </View>
        </View>
      </View>

      {/* Exception Logs */}
      <View style={[styles.card, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Delivery Failures & Cancellations</Text>
        <View style={styles.exceptionContainer}>
          <View style={styles.exceptionItem}>
            <Text style={styles.exceptionCount}>{perf.ordersCancelled || 0}</Text>
            <Text style={styles.exceptionLabel}>Cancelled Orders</Text>
          </View>
          <View style={styles.exceptionDivider} />
          <View style={styles.exceptionItem}>
            <Text style={[styles.exceptionCount, { color: '#EF4444' }]}>{perf.failedDeliveryAttempts || 0}</Text>
            <Text style={styles.exceptionLabel}>Failed Attempts</Text>
          </View>
          <View style={styles.exceptionDivider} />
          <View style={styles.exceptionItem}>
            <Text style={styles.exceptionCount}>{perf.ordersReturned || 0}</Text>
            <Text style={styles.exceptionLabel}>Returned Orders</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  filterInput: {
    width: 80,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.primary,
    padding: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  profileGrid: {
    gap: 12,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  profileValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  detailsList: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  exceptionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  exceptionItem: {
    alignItems: 'center',
  },
  exceptionCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4B5563',
  },
  exceptionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  exceptionDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
});
