import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Users, UserPlus, FileText, CheckCircle, Building, Clock, IndianRupee, CreditCard, Banknote, HandCoins } from 'lucide-react-native';
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

  const [revStats, setRevStats] = useState({
    totalOnline: 0,
    totalCash: 0,
    totalCashInWallets: 0,
    adminVaultAmount: 0,
    totalPendingHandovers: 0
  });
  
  const [walletBalances, setWalletBalances] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, adminRes, deptRes, revRes, balRes] = await Promise.all([
          axios.get('https://bmh-eitu.onrender.com/employees'),
          axios.get('https://bmh-eitu.onrender.com/admin/department-admins'),
          axios.get('https://bmh-eitu.onrender.com/department'),
          axios.get('https://bmh-eitu.onrender.com/admin/revenue-stats'),
          axios.get('https://bmh-eitu.onrender.com/admin/wallet-balances')
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

        if (revRes.data.success) {
          setRevStats({
            totalOnline: revRes.data.data.totalOnline || 0,
            totalCash: revRes.data.data.totalCash || 0,
            totalCashInWallets: revRes.data.data.totalCashInWallets || 0,
            adminVaultAmount: revRes.data.data.adminVaultAmount || 0,
            totalPendingHandovers: revRes.data.data.totalPendingHandovers || 0
          });
        }
        
        if (balRes.data.success) {
          setWalletBalances(balRes.data.data || []);
        }
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

  const FINANCE_STATS = [
    { label: 'Total Online Revenue', value: `₹${revStats.totalOnline}`, icon: CreditCard, color: Colors.light.primary },
    { label: 'Total Cash Revenue', value: `₹${revStats.totalCash}`, icon: IndianRupee, color: '#16a34a' },
    { label: 'Admin Vault Amount', value: `₹${revStats.adminVaultAmount}`, icon: Banknote, color: '#8b5cf6' },
    { label: 'Cash in Employee Wallets', value: `₹${revStats.totalCashInWallets}`, icon: Banknote, color: '#ca8a04' },
    { label: 'Pending Cash Handovers', value: `₹${revStats.totalPendingHandovers}`, icon: HandCoins, color: '#ea580c' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, !isDesktop && styles.contentMobile]}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, Admin 👋</Text>
        <Text style={styles.subtitle}>Here is what's happening today.</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginVertical: 40 }} />
      ) : (
        <>
          <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 16 }}>Financial Overview</Text>
          <View style={[styles.statsGrid, !isDesktop && styles.statsGridMobile]}>
            {FINANCE_STATS.map((stat, i) => (
              <View key={i} style={[styles.statCard, !isDesktop && styles.statCardMobile]}>
                <View style={[styles.iconBox, { backgroundColor: stat.color + '1A' }]}>
                  <stat.icon color={stat.color} size={24} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 16, marginTop: 16 }}>Organization Overview</Text>
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
        </>
      )}

      <View style={[styles.chartSection, !isDesktop && styles.chartSectionMobile]}>
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Employee Wallet Balances</Text>
          <View style={{ marginTop: 16, overflow: 'hidden', borderRadius: 8, borderWidth: 1, borderColor: Colors.light.border }}>
            <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border }}>
              <Text style={{ flex: 1, fontWeight: '600', color: '#64748b', fontSize: 13 }}>ID</Text>
              <Text style={{ flex: 2, fontWeight: '600', color: '#64748b', fontSize: 13 }}>Name</Text>
              <Text style={{ flex: 1, fontWeight: '600', color: '#64748b', fontSize: 13 }}>Role</Text>
              <Text style={{ flex: 1, fontWeight: '600', color: '#64748b', fontSize: 13, textAlign: 'right' }}>Cash in Hand</Text>
            </View>
            {walletBalances.length === 0 ? (
              <Text style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No wallet data found.</Text>
            ) : (
              walletBalances.map((w: any, idx: number) => (
                <View key={idx} style={{ flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border, backgroundColor: '#fff' }}>
                  <Text style={{ flex: 1, color: Colors.light.text, fontSize: 14 }}>{w.employee_id}</Text>
                  <Text style={{ flex: 2, color: Colors.light.text, fontSize: 14, fontWeight: '500' }}>{w.full_name}</Text>
                  <Text style={{ flex: 1, color: '#64748b', fontSize: 13 }}>{w.role}</Text>
                  <Text style={{ flex: 1, color: '#16a34a', fontSize: 14, fontWeight: '600', textAlign: 'right' }}>₹{w.cash_in_hand}</Text>
                </View>
              ))
            )}
          </View>
        </View>
        
        <View style={[styles.activityCard, !isDesktop && styles.activityCardMobile]}>
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
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: 32 },
  contentMobile: { padding: 16 },
  header: { marginBottom: 32 },
  greeting: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginBottom: 32 },
  statsGridMobile: { flexDirection: 'column' },
  statCard: { flex: 1, minWidth: 200, backgroundColor: Colors.light.card, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statCardMobile: { width: '100%' },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statValue: { fontSize: 28, fontWeight: '800', color: Colors.light.text, marginBottom: 4 },
  statLabel: { fontSize: 14, color: Colors.light.icon, fontWeight: '500' },
  chartSection: { flexDirection: 'row', gap: 24 },
  chartSectionMobile: { flexDirection: 'column' },
  chartCard: { flex: 2, backgroundColor: Colors.light.card, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, minHeight: 400 },
  activityCard: { flex: 1, backgroundColor: Colors.light.card, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, minHeight: 400 },
  activityCardMobile: { width: '100%' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text, marginBottom: 24 },
  chartPlaceholder: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  placeholderText: { color: Colors.light.icon, fontWeight: '500' },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  activityDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.light.primary, marginTop: 5, marginRight: 12 },
  activityText: { flex: 1, fontSize: 14, color: Colors.light.text, lineHeight: 20 },
});
