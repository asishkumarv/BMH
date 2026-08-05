import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Modal, Image } from 'react-native';
import { Users, UserPlus, FileText, CheckCircle, Building, Clock, IndianRupee, CreditCard, Banknote, HandCoins, UserX, AlertCircle, X, Download, Gift, CalendarDays } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { useRouter } from 'expo-router';

const isBirthdayToday = (dobStr: string | null) => {
  if (!dobStr) return false;
  const today = new Date();
  const todayMonth = today.getMonth() + 1; // 1-12
  const todayDate = today.getDate(); // 1-31

  let birthMonth = 0;
  let birthDate = 0;

  if (dobStr.includes('-')) {
    const parts = dobStr.split('-');
    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        birthMonth = parseInt(parts[1], 10);
        birthDate = parseInt(parts[2], 10);
      } else {
        birthMonth = parseInt(parts[1], 10);
        birthDate = parseInt(parts[0], 10);
      }
    }
  } else if (dobStr.includes('/')) {
    const parts = dobStr.split('/');
    if (parts.length >= 3) {
      if (parts[2].length === 4) {
        birthMonth = parseInt(parts[0], 10);
        birthDate = parseInt(parts[1], 10);
      } else {
        birthMonth = parseInt(parts[1], 10);
        birthDate = parseInt(parts[2], 10);
      }
    }
  }
  return birthMonth === todayMonth && birthDate === todayDate;
};

const formatDateToDDMMYYYY = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  const match = dateStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const matchIso = dateStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (matchIso) {
    return `${matchIso[3]}-${matchIso[2]}-${matchIso[1]}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch (e) {}
  return dateStr;
};

export default function AdminDashboard() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [todayCollections, setTodayCollections] = useState(0);
  const [stats, setStats] = useState({
    employees: 0,
    subAdmins: 0,
    departments: 0,
    pendingApprovals: 0
  });

  const [revStats, setRevStats] = useState({
    totalOnline: 0,
    totalCash: 0,
    bookingCash: 0,
    bookingOnline: 0,
    orderCash: 0,
    orderOnline: 0,
    totalCashInWallets: 0,
    adminVaultAmount: 0,
    totalPendingHandovers: 0
  });
  
  const [walletBalances, setWalletBalances] = useState<any[]>([]);

  // Attendance stats states
  const [attStats, setAttStats] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'employees' | 'sub_admins'>('employees');
  
  const [birthdaysToday, setBirthdaysToday] = useState<{
    employees: any[];
    sub_admins: any[];
  }>({ employees: [], sub_admins: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const [empRes, adminRes, deptRes, revRes, balRes, attStatsRes, bookingsRes, billingRes] = await Promise.all([
          axios.get('https://napi.bharatmedicalhallplus.com/employees'),
          axios.get('https://napi.bharatmedicalhallplus.com/admin/department-admins'),
          axios.get('https://napi.bharatmedicalhallplus.com/department'),
          axios.get('https://napi.bharatmedicalhallplus.com/admin/revenue-stats'),
          axios.get('https://napi.bharatmedicalhallplus.com/admin/wallet-balances'),
          axios.get('https://napi.bharatmedicalhallplus.com/attendance/dashboard-stats'),
          axios.get(`https://napi.bharatmedicalhallplus.com/bookings?date=${todayStr}`),
          axios.get(`https://napi.bharatmedicalhallplus.com/bookings/billing-stats?date=${todayStr}`)
        ]);
        
        if (billingRes.data.success) {
          setTodayCollections(billingRes.data.stats.todayCollections || 0);
        }
        
        if (bookingsRes.data.success) {
          const list = bookingsRes.data.data || [];
          const activeBookingsCount = list.filter((b: any) => b.status !== 'Cancelled').length;
          setTodayAppointments(activeBookingsCount);
        }
        
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

        // Filter today's birthdays
        const bdayEmps = emps.filter((e: any) => {
          let pd: any = {};
          if (e.profile_data) {
            try { pd = typeof e.profile_data === 'string' ? JSON.parse(e.profile_data) : e.profile_data; } catch (err) {}
          }
          const dobVal = e.dob || pd.dob;
          return isBirthdayToday(dobVal);
        });

        const bdayAdmins = admins.map((a: any) => ({
          ...a,
          role: 'Sub Admin',
          department: depts.find((d: any) => String(d.id) === String(a.department_id))?.name || 'Unknown'
        })).filter((a: any) => {
          let pd: any = {};
          if (a.profile_data) {
            try { pd = typeof a.profile_data === 'string' ? JSON.parse(a.profile_data) : a.profile_data; } catch (err) {}
          }
          const dobVal = a.dob || pd.dob;
          return isBirthdayToday(dobVal);
        });

        setBirthdaysToday({
          employees: bdayEmps.map((e: any) => ({
            ...e,
            name: e.full_name,
            role: e.role || 'Staff',
            department: e.department || 'General'
          })),
          sub_admins: bdayAdmins.map((a: any) => ({
            ...a,
            name: a.full_name,
            role: 'Sub Admin',
            department: a.department || 'General'
          }))
        });

        if (revRes.data.success) {
          setRevStats({
            totalOnline: revRes.data.data.totalOnline || 0,
            totalCash: revRes.data.data.totalCash || 0,
            bookingCash: revRes.data.data.bookingCash || 0,
            bookingOnline: revRes.data.data.bookingOnline || 0,
            orderCash: revRes.data.data.orderCash || 0,
            orderOnline: revRes.data.data.orderOnline || 0,
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
      case 'birthdays_today': return "Today's Birthdays";
      default: return 'Details';
    }
  };

  const handleExportPopupCSV = () => {
    if (!selectedCard) return;
    const data = selectedCard === 'birthdays_today' ? birthdaysToday[modalTab] : attStats?.[selectedCard]?.[modalTab] || [];
    if (data.length === 0) return;
    
    let csvContent = `"${getCardTitle(selectedCard)} - ${modalTab === 'employees' ? 'Employees' : 'Sub Admins'} - ${new Date().toLocaleDateString()}"\n\n`;
    if (selectedCard === 'birthdays_today') {
      csvContent += 'ID,Name,Role,Email,Mobile,Department,DOB\n';
      data.forEach((r: any) => {
        csvContent += `"${r.id}","${r.name || r.full_name}","${r.role}","${r.email || ''}","${r.mobile || r.phone}","${r.department}","${r.dob || ''}"\n`;
      });
    } else {
      csvContent += 'ID,Name,Role,Email,Mobile,Department,Shift,Check In,Check Out,Deviation/Status\n';
      data.forEach((r: any) => {
        const checkIn = r.check_in ? new Date(r.check_in).toLocaleTimeString() : '-';
        const checkOut = r.check_out ? new Date(r.check_out).toLocaleTimeString() : '-';
        const devOrStat = r.deviation || r.status || '';
        csvContent += `"${r.id}","${r.name}","${r.role}","${r.email || ''}","${r.mobile}","${r.department}","${r.shift}","${checkIn}","${checkOut}","${devOrStat}"\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${selectedCard}_${modalTab}_report_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
  };

  const birthdaysCount = birthdaysToday.employees.length + birthdaysToday.sub_admins.length;

  const ATTENDANCE_CARDS = [
    { key: 'total_checkin', label: 'Total Check-in Today', value: (attStats?.total_checkin?.count ?? 0).toString(), icon: CheckCircle, color: '#10B981' },
    { key: 'on_leave', label: 'On Leave Today', value: (attStats?.on_leave?.count ?? 0).toString(), icon: FileText, color: '#3B82F6' },
    { key: 'yet_to_check_in', label: 'Yet to Check-in', value: (attStats?.yet_to_check_in?.count ?? 0).toString(), icon: Clock, color: '#F59E0B' },
    { key: 'absent', label: 'Absent Today', value: (attStats?.absent?.count ?? 0).toString(), icon: UserX, color: '#EF4444' },
    { key: 'late_checkin', label: 'Late Check-ins', value: (attStats?.late_checkin?.count ?? 0).toString(), icon: AlertCircle, color: '#D97706' },
    { key: 'early_checkin', label: 'Early Check-ins', value: (attStats?.early_checkin?.count ?? 0).toString(), icon: CheckCircle, color: '#059669' },
    { key: 'birthdays_today', label: "Today's Birthdays", value: birthdaysCount.toString(), icon: Gift, color: '#EC4899' },
  ];

  const STATS_DATA = [
    { label: 'Total Employees', value: stats.employees.toString(), icon: Users, color: '#3B82F6' },
    { label: 'Total Sub Admins', value: stats.subAdmins.toString(), icon: UserPlus, color: '#10B981' },
    { label: 'Total Departments', value: stats.departments.toString(), icon: Building, color: '#8B5CF6' },
    { label: 'Pending Approvals', value: stats.pendingApprovals.toString(), icon: Clock, color: '#F59E0B' },
  ];

  const FINANCE_STATS = [
    { label: 'Total Booking Online Revenue', value: `₹${parseFloat(String(revStats.totalOnline)).toFixed(2)}`, icon: CreditCard, color: Colors.light.primary },
    { label: 'Total Booking Cash Revenue', value: `₹${parseFloat(String(revStats.totalCash)).toFixed(2)}`, icon: IndianRupee, color: '#16a34a' },
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
                {card.key === 'birthdays_today' && birthdaysCount > 0 && (
                  <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 }}>
                    {[...birthdaysToday.employees, ...birthdaysToday.sub_admins].map((b, idx) => (
                      <Text key={idx} style={{ fontSize: 13, fontWeight: '600', color: '#EC4899', marginTop: 4 }}>
                        🎂 {b.name} ({b.department} - {b.role})
                      </Text>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 16, marginTop: 16 }}>Clinic & Appointments Queue</Text>
          <View style={[styles.statsGrid, !isDesktop && styles.statsGridMobile, { marginBottom: 24 }]}>
            <TouchableOpacity 
              style={[styles.statCard, !isDesktop && styles.statCardMobile, { flex: 1 }]} 
              onPress={() => router.push('/admin/dashboard/appointments' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: Colors.light.primary + '1A' }]}>
                <CalendarDays color={Colors.light.primary} size={24} />
              </View>
              <Text style={styles.statValue}>{todayAppointments}</Text>
              <Text style={styles.statLabel}>Today's Scheduled Appointments</Text>
              <Text style={{ fontSize: 12, color: Colors.light.primary, fontWeight: 'bold', marginTop: 10 }}>
                Manage Live Queue & Patient Admissions →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statCard, !isDesktop && styles.statCardMobile, { flex: 1 }]} 
              onPress={() => router.push('/admin/dashboard/clinic-overview' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: '#3b82f61A' }]}>
                <Building color="#3b82f6" size={24} />
              </View>
              <Text style={styles.statValue}>Live</Text>
              <Text style={styles.statLabel}>Today's Clinic Operations Overview</Text>
              <Text style={{ fontSize: 12, color: '#3b82f6', fontWeight: 'bold', marginTop: 10 }}>
                View Command Center & Performance →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statCard, !isDesktop && styles.statCardMobile, { flex: 1 }]} 
              onPress={() => router.push('/admin/dashboard/billing' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: '#10b9811A' }]}>
                <IndianRupee color="#10b981" size={24} />
              </View>
              <Text style={styles.statValue}>₹{todayCollections.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>Today's Financial Collections</Text>
              <Text style={{ fontSize: 12, color: '#10b981', fontWeight: 'bold', marginTop: 10 }}>
                Manage Billing, Invoices & Refunds →
              </Text>
            </TouchableOpacity>
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
                      Employees ({selectedCard === 'birthdays_today' ? birthdaysToday.employees.length : (attStats?.[selectedCard]?.employees?.length || 0)})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalToggleBtn, modalTab === 'sub_admins' && styles.modalToggleBtnActive]} 
                    onPress={() => setModalTab('sub_admins')}
                  >
                    <Text style={[styles.modalToggleText, modalTab === 'sub_admins' && styles.modalToggleTextActive]}>
                      Sub Admins ({selectedCard === 'birthdays_today' ? birthdaysToday.sub_admins.length : (attStats?.[selectedCard]?.sub_admins?.length || 0)})
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
                      <Text style={[styles.tableCellHeader, { width: 130 }]}>{selectedCard === 'birthdays_today' ? 'Role' : 'Shift'}</Text>
                      <Text style={[styles.tableCellHeader, { width: 100 }]}>{selectedCard === 'birthdays_today' ? 'DOB' : 'Check In'}</Text>
                      <Text style={[styles.tableCellHeader, { width: 100 }]}>{selectedCard === 'birthdays_today' ? 'Occasion' : 'Check Out'}</Text>
                      <Text style={[styles.tableCellHeader, { width: 110 }]}>{selectedCard === 'birthdays_today' ? 'Status' : 'Status/Deviation'}</Text>
                    </View>

                    {((selectedCard === 'birthdays_today' ? birthdaysToday[modalTab] : attStats?.[selectedCard]?.[modalTab]) || []).length === 0 ? (
                      <View style={{ padding: 32, alignItems: 'center' }}>
                        <Text style={{ color: '#64748b', fontSize: 15, fontWeight: '500' }}>No records found.</Text>
                      </View>
                    ) : (
                      ((selectedCard === 'birthdays_today' ? birthdaysToday[modalTab] : attStats?.[selectedCard]?.[modalTab]) || []).map((emp: any, i: number) => (
                        <View key={i} style={styles.tableRow}>
                          {/* Name / Contact with Thumbnail */}
                          <View style={[styles.tableCellView, { width: 220, flexDirection: 'row', alignItems: 'center' }]}>
                            {emp.image || (emp.profile_data && typeof emp.profile_data === 'string' && JSON.parse(emp.profile_data).photo) || (emp.profile_data && emp.profile_data.photo) ? (
                              <Image source={{ uri: emp.image || (typeof emp.profile_data === 'string' ? JSON.parse(emp.profile_data).photo : emp.profile_data.photo) }} style={styles.thumb} />
                            ) : (
                              <View style={styles.thumbPlaceholder}>
                                <Text style={styles.avatarText}>{(emp.name || emp.full_name || '?').charAt(0).toUpperCase()}</Text>
                              </View>
                            )}
                            <View>
                              <Text style={{ fontWeight: '700', color: Colors.light.text, fontSize: 14 }}>{emp.name || emp.full_name}</Text>
                              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{emp.mobile || emp.phone || (emp.profile_data && typeof emp.profile_data === 'string' && JSON.parse(emp.profile_data).mobile) || (emp.profile_data && emp.profile_data.mobile) || 'N/A'}</Text>
                            </View>
                          </View>
                          
                          {/* Department */}
                          <Text style={[styles.tableCell, { width: 140 }]}>{emp.department}</Text>
                          
                          {/* Shift or Role */}
                          <Text style={[styles.tableCell, { width: 130 }]}>{selectedCard === 'birthdays_today' ? emp.role : emp.shift}</Text>
                          
                          {/* Check In or DOB */}
                          <Text style={[styles.tableCell, { width: 100 }]}>{selectedCard === 'birthdays_today' ? formatDateToDDMMYYYY(emp.dob || (emp.profile_data && typeof emp.profile_data === 'string' && JSON.parse(emp.profile_data).dob) || (emp.profile_data && emp.profile_data.dob)) : formatTime(emp.check_in)}</Text>
                          
                          {/* Check Out or Today */}
                          <Text style={[styles.tableCell, { width: 100 }]}>{selectedCard === 'birthdays_today' ? 'Today' : formatTime(emp.check_out)}</Text>
                          
                          {/* Deviation/Status */}
                          <View style={[styles.tableCellView, { width: 110 }]}>
                            {selectedCard === 'birthdays_today' ? (
                              <Text style={{ 
                                fontSize: 12, 
                                fontWeight: '700', 
                                color: '#EC4899',
                                backgroundColor: '#FCE7F3',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                alignSelf: 'flex-start'
                              }}>
                                Birthday 🎂
                              </Text>
                            ) : emp.deviation ? (
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
