import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Users, UserPlus, FileText, CheckCircle, Building, Clock } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';



export default function AdminDashboard() {
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    employees: 0,
    subAdmins: 0,
    departments: 0,
    pendingApprovals: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, adminRes, deptRes] = await Promise.all([
          axios.get('http://localhost:5000/employees'),
          axios.get('http://localhost:5000/admin/department-admins'),
          axios.get('http://localhost:5000/department')
        ]);
        
        const emps = empRes.data.success ? empRes.data.data : [];
        const admins = adminRes.data.success ? adminRes.data.data : [];
        const depts = deptRes.data.success ? deptRes.data.data : [];

        const pendingEmps = emps.filter((e: any) => e.status === 'pending').length;
        const pendingAdmins = admins.filter((a: any) => a.status === 'pending').length;

        setStats({
          employees: emps.length,
          subAdmins: admins.length,
          departments: depts.length,
          pendingApprovals: pendingEmps + pendingAdmins
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const STATS_DATA = [
    { label: 'Total Employees', value: stats.employees.toString(), icon: Users, color: '#3B82F6' },
    { label: 'Total Sub Admins', value: stats.subAdmins.toString(), icon: UserPlus, color: '#10B981' },
    { label: 'Total Departments', value: stats.departments.toString(), icon: Building, color: '#8B5CF6' },
    { label: 'Pending Approvals', value: stats.pendingApprovals.toString(), icon: Clock, color: '#F59E0B' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, Admin 👋</Text>
        <Text style={styles.subtitle}>Here is what's happening today.</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginVertical: 40 }} />
      ) : (
        <View style={[styles.statsGrid, !isDesktop && styles.statsGridMobile]}>
          {STATS_DATA.map((stat, i) => (
            <View key={i} style={[styles.statCard, !isDesktop && styles.statCardMobile]}>
              <View style={[styles.iconBox, { backgroundColor: stat.color + '1A' }]}>
                <stat.icon color={stat.color} size={24} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.chartSection}>
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Activity Overview</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.placeholderText}>Chart Visualization Space</Text>
            {/* In a real app, react-native-chart-kit or recharts would go here */}
          </View>
        </View>
        
        {isDesktop && (
          <View style={styles.activityCard}>
             <Text style={styles.cardTitle}>Recent Activity</Text>
             <View style={styles.activityItem}>
                <View style={styles.activityDot} />
                <Text style={styles.activityText}>John Doe requested sick leave.</Text>
             </View>
             <View style={styles.activityItem}>
                <View style={[styles.activityDot, {backgroundColor: '#10B981'}]} />
                <Text style={styles.activityText}>New department "Neurology" created.</Text>
             </View>
          </View>
        )}
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
    minHeight: 400,
  },
  activityCard: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
      }
    })
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
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginRight: 12,
  },
  activityText: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
  }
});
