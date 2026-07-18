import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Modal, Image } from 'react-native';
import { Users, UserPlus, FileText, CheckCircle, Building, Clock, IndianRupee, CreditCard, Banknote, HandCoins, UserX, AlertCircle, X, Download } from 'lucide-react-native';
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

  // Attendance stats states
  const [attStats, setAttStats] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'employees' | 'sub_admins'>('employees');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, adminRes, deptRes, revRes, balRes, attStatsRes] = await Promise.all([
          axios.get('https://napi.bharatmedicalhallplus.com/employees'),
          axios.get('https://napi.bharatmedicalhallplus.com/admin/department-admins'),
          axios.get('https://napi.bharatmedicalhallplus.com/department'),
          axios.get('https://napi.bharatmedicalhallplus.com/admin/revenue-stats'),
          axios.get('https://napi.bharatmedicalhallplus.com/admin/wallet-balances'),
          axios.get('https://napi.bharatmedicalhallplus.com/attendance/dashboard-stats')
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

        if (attStatsRes.data.success) {
          setAttStats(attStatsRes.data.stats);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatTime = (isoStr: string | null) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCardTitle = (key: string) => {
    switch (key) {
      case 'total_checkin': return 'Total Check-in Today';
      case 'on_leave': return 'On Leave Today';
      case 'yet_to_check_in': return 'Yet to Check-in';
      case 'absent': return 'Absent Today';
      case 'late_checkin': return 'Late Check-ins';
      case 'early_checkin': return 'Early Check-ins';
      default: return 'Details';
    }
  };

  const handleExportPopupCSV = () => {
    if (!selectedCard || !attStats) return;
    const data = attStats[selectedCard]?.[modalTab] || [];
    if (data.length === 0) return;
    
    let csvContent = `"${getCardTitle(selectedCard)} - ${modalTab === 'employees' ? 'Employees' : 'Sub Admins'} - ${new Date().toLocaleDateString()}"\n\n`;
    csvContent += 'ID,Name,Role,Email,Mobile,Department,Shift,Check In,Check Out,Deviation/Status\n';

    data.forEach((r: any) => {
      const checkIn = r.check_in ? new Date(r.check_in).toLocaleTimeString() : '-';
      const checkOut = r.check_out ? new Date(r.check_out).toLocaleTimeString() : '-';
      const devOrStat = r.deviation || r.status || '';
      csvContent += `"${r.id}","${r.name}","${r.role}","${r.email || ''}","${r.mobile}","${r.department}","${r.shift}","${checkIn}","${checkOut}","${devOrStat}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${selectedCard}_${modalTab}_report_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
  };

  const ATTENDANCE_CARDS = [
    { key: 'total_checkin', label: 'Total Check-in Today', value: (attStats?.total_checkin?.count ?? 0).toString(), icon: CheckCircle, color: '#10B981' },
    { key: 'on_leave', label: 'On Leave Today', value: (attStats?.on_leave?.count ?? 0).toString(), icon: FileText, color: '#3B82F6' },
    { key: 'yet_to_check_in', label: 'Yet to Check-in', value: (attStats?.yet_to_check_in?.count ?? 0).toString(), icon: Clock, color: '#F59E0B' },
    { key: 'absent', label: 'Absent Today', value: (attStats?.absent?.count ?? 0).toString(), icon: UserX, color: '#EF4444' },
    { key: 'late_checkin', label: 'Late Check-ins', value: (attStats?.late_checkin?.count ?? 0).toString(), icon: AlertCircle, color: '#D97706' },
    { key: 'early_checkin', label: 'Early Check-ins', value: (attStats?.early_checkin?.count ?? 0).toString(), icon: CheckCircle, color: '#059669' },
  ];

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
          <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 16 }}>Today's Attendance Overview</Text>
          <View style={[styles.statsGrid, !isDesktop && styles.statsGridMobile]}>
            {ATTENDANCE_CARDS.map((card, i) => (
              <TouchableOpacity 
                key={i} 
                style={[styles.statCard, !isDesktop && styles.statCardMobile]} 
                onPress={() => {
                  setSelectedCard(card.key);
                  setModalTab('employees');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: card.color + '1A' }]}>
                  <card.icon color={card.color} size={24} />
                </View>
                <Text style={styles.statValue}>{card.value}</Text>
                <Text style={styles.statLabel}>{card.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

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

      {/* Details Popup Modal */}
      {selectedCard && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setSelectedCard(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{getCardTitle(selectedCard)} Details</Text>
                <TouchableOpacity onPress={() => setSelectedCard(null)}>
                  <X color="#6b7280" size={24} />
                </TouchableOpacity>
              </View>

              {/* Tabs & Export Row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <View style={styles.modalToggleContainer}>
                  <TouchableOpacity 
                    style={[styles.modalToggleBtn, modalTab === 'employees' && styles.modalToggleBtnActive]} 
                    onPress={() => setModalTab('employees')}
                  >
                    <Text style={[styles.modalToggleText, modalTab === 'employees' && styles.modalToggleTextActive]}>
                      Employees ({attStats?.[selectedCard]?.employees?.length || 0})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalToggleBtn, modalTab === 'sub_admins' && styles.modalToggleBtnActive]} 
                    onPress={() => setModalTab('sub_admins')}
                  >
                    <Text style={[styles.modalToggleText, modalTab === 'sub_admins' && styles.modalToggleTextActive]}>
                      Sub Admins ({attStats?.[selectedCard]?.sub_admins?.length || 0})
                    </Text>
                  </TouchableOpacity>
                </View>

                {Platform.OS === 'web' && (
                  <TouchableOpacity style={styles.exportButton} onPress={handleExportPopupCSV}>
                    <Download size={16} color="white" />
                    <Text style={styles.exportButtonText}>Export CSV</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView>
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                  <View style={[styles.table, { minWidth: 800 }]}>
                    <View style={styles.tableRowHeader}>
                      <Text style={[styles.tableCellHeader, { width: 220 }]}>Name / Contact</Text>
                      <Text style={[styles.tableCellHeader, { width: 140 }]}>Department</Text>
                      <Text style={[styles.tableCellHeader, { width: 130 }]}>Shift</Text>
                      <Text style={[styles.tableCellHeader, { width: 100 }]}>Check In</Text>
                      <Text style={[styles.tableCellHeader, { width: 100 }]}>Check Out</Text>
                      <Text style={[styles.tableCellHeader, { width: 110 }]}>Status/Deviation</Text>
                    </View>

                    {((attStats?.[selectedCard]?.[modalTab]) || []).length === 0 ? (
                      <View style={{ padding: 32, alignItems: 'center' }}>
                        <Text style={{ color: '#64748b', fontSize: 15, fontWeight: '500' }}>No records found.</Text>
                      </View>
                    ) : (
                      (attStats?.[selectedCard]?.[modalTab] || []).map((emp: any, i: number) => (
                        <View key={i} style={styles.tableRow}>
                          {/* Name / Contact with Thumbnail */}
                          <View style={[styles.tableCellView, { width: 220, flexDirection: 'row', alignItems: 'center' }]}>
                            {emp.image ? (
                              <Image source={{ uri: emp.image }} style={styles.thumb} />
                            ) : (
                              <View style={styles.thumbPlaceholder}>
                                <Text style={styles.avatarText}>{(emp.name || '?').charAt(0).toUpperCase()}</Text>
                              </View>
                            )}
                            <View>
                              <Text style={{ fontWeight: '700', color: Colors.light.text, fontSize: 14 }}>{emp.name}</Text>
                              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{emp.mobile}</Text>
                            </View>
                          </View>
                          
                          {/* Department */}
                          <Text style={[styles.tableCell, { width: 140 }]}>{emp.department}</Text>
                          
                          {/* Shift */}
                          <Text style={[styles.tableCell, { width: 130 }]}>{emp.shift}</Text>
                          
                          {/* Check In */}
                          <Text style={[styles.tableCell, { width: 100 }]}>{formatTime(emp.check_in)}</Text>
                          
                          {/* Check Out */}
                          <Text style={[styles.tableCell, { width: 100 }]}>{formatTime(emp.check_out)}</Text>
                          
                          {/* Deviation/Status */}
                          <View style={[styles.tableCellView, { width: 110 }]}>
                            {emp.deviation ? (
                              <Text style={{ 
                                fontSize: 12, 
                                fontWeight: '700', 
                                color: emp.deviation.includes('Late') ? '#D97706' : '#059669',
                                backgroundColor: emp.deviation.includes('Late') ? '#FFF3E0' : '#E8F5E9',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                alignSelf: 'flex-start'
                              }}>
                                {emp.deviation}
                              </Text>
                            ) : (
                              <Text style={{ 
                                fontSize: 12, 
                                fontWeight: '700', 
                                color: emp.status === 'Absent' ? '#EF4444' : (emp.status === 'On Leave' ? '#3B82F6' : '#10B981'),
                                backgroundColor: emp.status === 'Absent' ? '#FFEBEE' : (emp.status === 'On Leave' ? '#E3F2FD' : '#E8F5E9'),
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                alignSelf: 'flex-start'
                              }}>
                                {emp.status || 'On Time'}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  activityDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.light.primary, marginTop: 5, marginRight: 12 },
  activityText: { flex: 1, fontSize: 14, color: Colors.light.text, lineHeight: 20 },

  // New Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '90%', maxWidth: 850, backgroundColor: 'white', borderRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: Colors.light.text },
  modalToggleContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, width: 320 },
  modalToggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  modalToggleBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  modalToggleText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  modalToggleTextActive: { color: Colors.light.primary },
  exportButton: { flexDirection: 'row', backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 6 },
  exportButtonText: { color: 'white', fontWeight: '700', fontSize: 13 },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden' },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableCellHeader: { padding: 14, fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center', backgroundColor: '#fff' },
  tableCell: { padding: 14, fontSize: 13, color: Colors.light.text, fontWeight: '500' },
  tableCellView: { padding: 14, justifyContent: 'center' },
  thumb: { width: 32, height: 32, borderRadius: 16, marginRight: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  thumbPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e2e8f0', marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
});
