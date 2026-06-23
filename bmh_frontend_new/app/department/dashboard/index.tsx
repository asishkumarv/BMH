import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Users, FileText, CheckCircle, Clock } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

export default function SubAdminDashboard() {
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    presentCount: 0,
    absentCount: 0,
    pendingTasks: 0,
    completedTasks: 0
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        if (Platform.OS === 'web') {
          const userStr = localStorage.getItem('subAdminUser');
          if (userStr) {
            const user = JSON.parse(userStr);
            const res = await axios.get(`https://bmh-eitu.onrender.com/admin/department-admins/${user.department_id}/metrics`);
            if (res.data.success) {
              setMetrics(res.data.data);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching metrics', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, []);

  if (loading) {
    return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;
  }

  const STATS = [
    { label: 'Total Employees', value: metrics.totalEmployees.toString(), icon: Users, color: '#3B82F6' },
    { label: 'Present Today', value: metrics.presentCount.toString(), icon: CheckCircle, color: '#10B981' },
    { label: 'Absent Today', value: metrics.absentCount.toString(), icon: Users, color: '#EF4444' },
    { label: 'Pending Tasks', value: metrics.pendingTasks.toString(), icon: Clock, color: '#F59E0B' },
    { label: 'Completed Tasks', value: metrics.completedTasks.toString(), icon: FileText, color: '#8B5CF6' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, !isDesktop && styles.contentMobile]}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Department Overview 👋</Text>
        <Text style={styles.subtitle}>Here is what's happening in your department today.</Text>
      </View>

      <View style={[styles.statsGrid, !isDesktop && styles.statsGridMobile]}>
        {STATS.map((stat, i) => (
          <View key={i} style={[styles.statCard, !isDesktop && styles.statCardMobile]}>
            <View style={[styles.iconBox, { backgroundColor: stat.color + '1A' }]}>
              <stat.icon color={stat.color} size={24} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.chartSection, !isDesktop && styles.chartSectionMobile]}>
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Recent Tasks Overview</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.placeholderText}>Task metrics visualization</Text>
            {/* Real implementation would map recent tasks from DB */}
          </View>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 32,
  },
  contentMobile: {
    padding: 16,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    marginBottom: 32,
  },
  statsGridMobile: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
      },
      default: {
        elevation: 2,
      }
    })
  },
  statCardMobile: {
    width: '100%',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.light.icon,
    fontWeight: '500',
  },
  chartSection: {
    flexDirection: 'row',
    gap: 24,
  },
  chartSectionMobile: {
    flexDirection: 'column',
  },
  chartCard: {
    flex: 2,
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
      }
    }),
    minHeight: 300,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 20,
  },
  chartPlaceholder: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: Colors.light.icon,
    fontWeight: '500',
  }
});
