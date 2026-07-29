import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Platform, Alert, ScrollView, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Banknote, CheckCircle2, TrendingUp, CreditCard, Users, HandCoins } from 'lucide-react-native';
import axios from 'axios';
import * as Print from 'expo-print';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

type Peer = { id: string; full_name: string; };
type Handover = { id: string; from_name: string; to_name: string; from_employee_id: string; to_employee_id: string; amount: string; status: string; created_at: string; from_role?: string; from_department?: string; to_role?: string; to_department?: string; };

const formatDateTimeToDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const displayHours = String(hours).padStart(2, '0');
    return `${day}-${month}-${year} ${displayHours}:${minutes} ${ampm}`;
  } catch (e) {
    return dateStr;
  }
};

const formatDateOnlyToDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const cleanDate = dateStr.split('T')[0].split(' ')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else {
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateStr;
  }
};

export default function AdminWalletScreen() {
  const { isDesktop } = useResponsive();

  const [cashInHand, setCashInHand] = useState('0.00');
  const [stats, setStats] = useState<any>({});
  const [walletBalances, setWalletBalances] = useState<any[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);

  const [handoverModalVisible, setHandoverModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedPeerId, setSelectedPeerId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);

  // Search & Filter state for cash holdings table
  const [searchNameQuery, setSearchNameQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Sub Admin' | 'Employee'>('All');

  // Details Modal state
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employeeHistory, setEmployeeHistory] = useState<any>({ handovers: [], bookings: [], orders: [] });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<'handovers' | 'bookings' | 'orders'>('handovers');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        let userStr = null;
        if (Platform.OS === 'web') {
          userStr = localStorage.getItem('superAdminUser');
        } else {
          userStr = await AsyncStorage.getItem('superAdminUser');
        }
        
        if (userStr) {
          const user = JSON.parse(userStr);
          const aId = `ADMIN-${user.id}`;
          setAdminId(aId);
          fetchData(aId);
          fetchPeers(aId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching admin user:', err);
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchPeers = async (id: string) => {
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/employees/all-users`);
      if (res.data.success) {
        setPeers(res.data.data.filter((p: any) => p.id !== id));
      }
    } catch (error) {}
  };

  const fetchData = async (id: string) => {
    setLoading(true);
    try {
      const [walletRes, handoversRes, statsRes, balancesRes] = await Promise.all([
        axios.get(`https://napi.bharatmedicalhallplus.com/wallet/${id}`),
        axios.get(`https://napi.bharatmedicalhallplus.com/wallet/handovers/${id}`),
        axios.get(`https://napi.bharatmedicalhallplus.com/admin/revenue-stats`),
        axios.get(`https://napi.bharatmedicalhallplus.com/admin/wallet-balances`)
      ]);
      
      if (walletRes.data.success) {
        setCashInHand(walletRes.data.data.wallet?.cash_in_hand || '0.00');
      }
      if (handoversRes.data.success) {
        setHandovers(handoversRes.data.data || []);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (balancesRes.data.success) {
        // Sort by cash_in_hand high to low
        const sorted = (balancesRes.data.data || []).sort((a: any, b: any) => parseFloat(b.cash_in_hand || '0') - parseFloat(a.cash_in_hand || '0'));
        setWalletBalances(sorted);
      }
    } catch (error) {
      console.error('Error fetching admin wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEmployeeDetails = async (employee: any) => {
    setSelectedEmployee(employee);
    setDetailsModalVisible(true);
    setHistoryLoading(true);
    setFilterStartDate('');
    setFilterEndDate('');
    setModalActiveTab('handovers');
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/wallet/history/${employee.employee_id}`);
      if (res.data.success) {
        setEmployeeHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filterDataByDate = (list: any[], dateField: string) => {
    return list.filter(item => {
      const itemDateStr = item[dateField] ? item[dateField].split('T')[0] : '';
      if (!itemDateStr) return true;
      if (filterStartDate && itemDateStr < filterStartDate) return false;
      if (filterEndDate && itemDateStr > filterEndDate) return false;
      return true;
    });
  };

  const filteredHandovers = filterDataByDate(employeeHistory.handovers || [], 'created_at');
  const filteredBookings = filterDataByDate(employeeHistory.bookings || [], 'created_at');
  const filteredOrders = filterDataByDate(employeeHistory.orders || [], 'created_at');

  const filteredBalances = walletBalances.filter(item => {
    const name = item.full_name || '';
    const empId = item.employee_id || '';
    const matchesSearch = name.toLowerCase().includes(searchNameQuery.toLowerCase()) || 
                          empId.toLowerCase().includes(searchNameQuery.toLowerCase());
    
    const roleLower = (item.role || '').toLowerCase();
    const isSubAdmin = roleLower.includes('sub_admin') || roleLower.includes('sub admin');
    
    const matchesRole = roleFilter === 'All' || 
                        (roleFilter === 'Sub Admin' && isSubAdmin) || 
                        (roleFilter === 'Employee' && !isSubAdmin);
    return matchesSearch && matchesRole;
  });

  const handleExportModalCSV = () => {
    if (!selectedEmployee) return;
    let csvContent = "";
    let filename = `${selectedEmployee.full_name.replace(/\s+/g, '_')}_Wallet_Details`;
    
    if (modalActiveTab === 'handovers') {
      csvContent = "Date,From,To,Amount,Status\n";
      filteredHandovers.forEach(h => {
        csvContent += `"${new Date(h.created_at).toLocaleString()}","${h.from_name}","${h.to_name}",${h.amount},"${h.status}"\n`;
      });
      filename += "_Handovers.csv";
    } else if (modalActiveTab === 'bookings') {
      csvContent = "Booking ID,Date,Patient,Amount,Status\n";
      filteredBookings.forEach(b => {
        csvContent += `${b.id},"${new Date(b.created_at).toLocaleString()}","${b.patient_name || 'N/A'}",${b.amount},"${b.payment_status}"\n`;
      });
      filename += "_Bookings.csv";
    } else {
      csvContent = "Order No,Date,Customer,Amount,Paid Amount,Status\n";
      filteredOrders.forEach(o => {
        csvContent += `"${o.order_no || 'N/A'}","${o.order_date || 'N/A'}","${o.customer_name || 'N/A'}",${o.amount},${o.paid_amount},"${o.status}"\n`;
      });
      filename += "_Orders.csv";
    }

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('Notice', 'CSV export is supported on Web.');
    }
  };

  const handlePrintModalPDF = async () => {
    if (!selectedEmployee) return;
    
    let rowsHtml = "";
    let title = "";
    let summaryHtml = "";
    
    const presentCashInHand = parseFloat(selectedEmployee.cash_in_hand || '0').toFixed(2);
    
    if (modalActiveTab === 'handovers') {
      title = "Cash Handovers Transaction History";
      let totalHandoversAmt = 0;
      filteredHandovers.forEach(h => {
        totalHandoversAmt += parseFloat(h.amount || '0');
      });
      summaryHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.6;">
          <strong>Present Cash in Hand of Employee:</strong> ₹${presentCashInHand}<br/>
          <strong>Total Handover Transactions:</strong> ${filteredHandovers.length}<br/>
          <strong>Total Handover Amount:</strong> ₹${totalHandoversAmt.toFixed(2)}
        </div>
      `;
      rowsHtml = `
        <thead>
          <tr>
            <th>Date/Time</th>
            <th>From</th>
            <th>To</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filteredHandovers.map(h => `
            <tr>
              <td>${formatDateTimeToDDMMYYYY(h.created_at)}</td>
              <td>${h.from_name}</td>
              <td>${h.to_name}</td>
              <td>₹${parseFloat(h.amount).toFixed(2)}</td>
              <td>${h.status}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
    } else if (modalActiveTab === 'bookings') {
      title = "Bookings Cash & Online Collection History";
      let totalAmountVal = 0;
      let cashAmountVal = 0;
      let onlineAmountVal = 0;
      
      filteredBookings.forEach(b => {
        const amt = parseFloat(b.amount || '0');
        totalAmountVal += amt;
        const method = (b.payment_method || '').toLowerCase();
        if (method === 'cash') {
          cashAmountVal += amt;
        } else {
          onlineAmountVal += amt;
        }
      });
      
      summaryHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.6;">
          <strong>Present Cash in Hand of Employee:</strong> ₹${presentCashInHand}<br/>
          <strong>Total Bookings:</strong> ${filteredBookings.length}<br/>
          <strong>Total Bookings Amount:</strong> ₹${totalAmountVal.toFixed(2)}<br/>
          <span style="color: #059669; font-weight: bold;">Cash Amount Collected:</span> ₹${cashAmountVal.toFixed(2)}<br/>
          <span style="color: #2563eb; font-weight: bold;">Online Amount:</span> ₹${onlineAmountVal.toFixed(2)}
        </div>
      `;
      
      rowsHtml = `
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Date/Time</th>
            <th>Patient Details</th>
            <th>Payment Mode</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filteredBookings.map(b => `
            <tr>
              <td>#${b.id}</td>
              <td>${formatDateTimeToDDMMYYYY(b.created_at)}</td>
              <td>
                <strong>${b.patient_name || 'N/A'}</strong><br/>
                <span style="font-size: 11px; color: #475569;">Doc: Dr. ${b.doctor_name || 'N/A'} | Slot: ${b.start_time ? b.start_time.substring(0, 5) : ''} - ${b.end_time ? b.end_time.substring(0, 5) : ''}</span>
              </td>
              <td>${b.payment_method}</td>
              <td>₹${parseFloat(b.amount).toFixed(2)}</td>
              <td>${b.payment_status}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
    } else {
      title = "Orders Cash & Online Collection History";
      let totalAmountVal = 0;
      let cashAmountVal = 0;
      let onlineAmountVal = 0;
      
      filteredOrders.forEach(o => {
        const amt = parseFloat(o.paid_amount || o.amount || '0');
        totalAmountVal += amt;
        const mode = (o.payment_mode || '').toLowerCase();
        if (mode === 'cash') {
          cashAmountVal += amt;
        } else {
          onlineAmountVal += amt;
        }
      });
      
      summaryHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.6;">
          <strong>Present Cash in Hand of Employee:</strong> ₹${presentCashInHand}<br/>
          <strong>Total Orders:</strong> ${filteredOrders.length}<br/>
          <strong>Total Orders Amount:</strong> ₹${totalAmountVal.toFixed(2)}<br/>
          <span style="color: #059669; font-weight: bold;">Cash Amount Collected:</span> ₹${cashAmountVal.toFixed(2)}<br/>
          <span style="color: #2563eb; font-weight: bold;">Online Amount:</span> ₹${onlineAmountVal.toFixed(2)}
        </div>
      `;
      
      rowsHtml = `
        <thead>
          <tr>
            <th>Order No</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Payment Mode</th>
            <th>Total Amount</th>
            <th>Paid Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filteredOrders.map(o => `
            <tr>
              <td>${o.order_no || 'N/A'}</td>
              <td>${formatDateOnlyToDDMMYYYY(o.order_date || o.created_at)}</td>
              <td>${o.customer_name || 'N/A'}</td>
              <td>${o.payment_mode || 'N/A'}</td>
              <td>₹${parseFloat(o.amount || '0').toFixed(2)}</td>
              <td>₹${parseFloat(o.paid_amount || '0').toFixed(2)}</td>
              <td>${o.status}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
    }

    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #1e3a8a; text-align: center; }
            .header h3 { margin: 5px 0 0 0; color: #475569; text-align: center; }
            .emp-info { font-size: 14px; margin-top: 15px; color: #334155; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f8fafc; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Bharat Medical Hall</h1>
            <h3>${title}</h3>
            <div class="emp-info">
              <strong>Employee:</strong> ${selectedEmployee.full_name} (${selectedEmployee.employee_id}) <br/>
              <strong>Role:</strong> ${selectedEmployee.role} | <strong>Department:</strong> ${selectedEmployee.department || 'N/A'} <br/>
              <strong>Filters:</strong> ${filterStartDate || 'All'} to ${filterEndDate || 'Today'}
            </div>
          </div>
          
          ${summaryHtml}

          <table>
            ${rowsHtml}
          </table>
          <div class="footer">
            Generated on ${new Date().toLocaleString()} | Bharat Medical Hall Plus
          </div>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        iframe.contentDocument?.open();
        iframe.contentDocument?.write(html);
        iframe.contentDocument?.close();
        setTimeout(() => {
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
        }, 500);
      } else {
        await Print.printAsync({ html });
      }
    } catch (err) {
      console.error('Error printing PDF', err);
    }
  };

  const handleRequestHandover = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return Alert.alert('Error', 'Invalid amount');
    if (Number(amount) > Number(cashInHand)) return Alert.alert('Error', 'Insufficient cash in hand');
    if (!selectedPeerId) return Alert.alert('Error', 'Please select someone to hand over to');
    if (!adminId) return;

    setSubmitting(true);
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/wallet/handover/request', {
        from_employee_id: adminId,
        to_employee_id: selectedPeerId,
        amount: Number(amount)
      });
      if (res.data.success) {
        Alert.alert('Success', 'Handover requested successfully');
        setHandoverModalVisible(false);
        setAmount(''); setSelectedPeerId('');
        fetchData(adminId);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to request handover');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptHandover = async (id: string, action: 'Accepted' | 'Rejected') => {
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/wallet/handover/accept', { id, action });
      if (res.data.success) {
        Alert.alert('Success', `Handover ${action.toLowerCase()}`);
        if(adminId) fetchData(adminId);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${action.toLowerCase()}`);
    }
  };

  const incomingHandovers = handovers.filter(h => h.to_employee_id === adminId && h.status === 'Pending');
  const pastHandovers = handovers.filter(h => h.to_employee_id === adminId && h.status !== 'Pending');

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
        <View>
          <Text style={styles.title}>Super Admin Vault</Text>
          <Text style={styles.subtitle}>Manage cash handed over from departments and track revenue.</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable style={[styles.primaryBtn, {backgroundColor: '#16a34a'}]} onPress={() => {setAmount(cashInHand); setHandoverModalVisible(true)}}>
            <HandCoins size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Handover Cash</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
              <View style={[styles.iconBox, { backgroundColor: '#10B9811A' }]}>
                <Banknote size={24} color="#10B981" />
              </View>
              <Text style={{ fontSize: 16, color: '#059669', fontWeight: '600', marginTop: 12 }}>Vault Cash Balance</Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#064E3B' }}>₹{cashInHand}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
              <View style={[styles.iconBox, { backgroundColor: '#3B82F61A' }]}>
                <CreditCard size={24} color="#3B82F6" />
              </View>
              <Text style={{ fontSize: 16, color: '#2563EB', fontWeight: '600', marginTop: 12 }}>Online Cash</Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#1E3A8A' }}>₹{stats.totalOnline || '0.00'}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#FDF4FF', borderColor: '#FAE8FF' }]}>
              <View style={[styles.iconBox, { backgroundColor: '#D946EF1A' }]}>
                <TrendingUp size={24} color="#D946EF" />
              </View>
              <Text style={{ fontSize: 16, color: '#C026D3', fontWeight: '600', marginTop: 12 }}>Total Revenue</Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#701A75' }}>
                ₹{((parseFloat(stats.totalCash || '0') + parseFloat(stats.totalOnline || '0'))).toFixed(2)}
              </Text>
            </View>
          </View>

          {incomingHandovers.length > 0 && (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionTitle}>Incoming Cash Handovers</Text>
              {incomingHandovers.map(h => (
                <View key={h.id} style={styles.pendingCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingAmount}>₹{h.amount}</Text>
                    <Text style={styles.pendingNote}>From: {h.from_name} ({h.from_employee_id})</Text>
                    <Text style={{fontSize: 12, color: '#475569', marginTop: 2}}>{h.from_role} • {h.from_department}</Text>
                    <Text style={styles.txDate}>{new Date(h.created_at).toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={[styles.acceptBtn, {backgroundColor: '#ef4444'}]} onPress={() => handleAcceptHandover(h.id, 'Rejected')}>
                      <Text style={styles.acceptBtnText}>Reject</Text>
                    </Pressable>
                    <Pressable style={styles.acceptBtn} onPress={() => handleAcceptHandover(h.id, 'Accepted')}>
                      <CheckCircle2 size={16} color="#FFF" />
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.balancesSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Users size={20} color={Colors.light.text} />
              <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>Sub-Admin & Employee Cash Holdings</Text>
            </View>

            {/* Search and Dropdown Filter */}
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextInput
                style={{ flex: 1, minWidth: 200, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 }}
                placeholder="Search by employee/sub admin name or ID..."
                value={searchNameQuery}
                onChangeText={setSearchNameQuery}
              />
              {Platform.OS === 'web' ? (
                <select
                  value={roleFilter}
                  onChange={(e: any) => setRoleFilter(e.target.value as any)}
                  style={{ padding: 8, borderRadius: 8, border: `1px solid ${Colors.light.border}`, fontSize: 14, outline: 'none', height: 38, cursor: 'pointer' }}
                >
                  <option value="All">All Roles</option>
                  <option value="Sub Admin">Sub Admins Only</option>
                  <option value="Employee">Employees Only</option>
                </select>
              ) : (
                <TextInput
                  style={{ width: 120, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 }}
                  placeholder="Role (All/Sub/Emp)"
                  value={roleFilter}
                  onChangeText={(val: any) => setRoleFilter(val)}
                />
              )}
            </View>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]}>Name / ID</Text>
                <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>Role</Text>
                <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>Department</Text>
                <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right' }]}>Cash in Hand</Text>
              </View>
              {filteredBalances.map((item, idx) => (
                <Pressable key={idx} style={styles.tableRow} onPress={() => openEmployeeDetails(item)}>
                  <View style={{ flex: 2 }}>
                    <Text style={{ fontWeight: '500', color: Colors.light.text }}>{item.full_name}</Text>
                    <Text style={{ fontSize: 12, color: Colors.light.icon }}>{item.employee_id}</Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{item.role}</Text>
                  <Text style={[styles.tableCell, { flex: 1, color: Colors.light.icon, fontSize: 13 }]}>{item.department || 'N/A'}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '700', color: '#059669' }]}>
                    ₹{item.cash_in_hand}
                  </Text>
                </Pressable>
              ))}
              {filteredBalances.length === 0 && (
                <Text style={{ padding: 16, textAlign: 'center', color: Colors.light.icon }}>No balances found.</Text>
              )}
            </View>
          </View>

          <View style={{ marginTop: 32 }}>
            <Text style={styles.sectionTitle}>Handover History</Text>
            {pastHandovers.length === 0 && <Text style={{color: Colors.light.icon}}>No past handovers.</Text>}
            {pastHandovers.map(h => (
              <View key={h.id} style={styles.historyCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={styles.historyPeer}>From: {h.from_name} ({h.from_employee_id})</Text>
                      {h.from_role && <Text style={{fontSize: 12, color: '#475569', marginTop: 2}}>{h.from_role} • {h.from_department}</Text>}
                      <Text style={styles.historyDate}>{new Date(h.created_at).toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.historyAmount, { color: h.status === 'Accepted' ? '#10B981' : '#ef4444' }]}>
                      +₹{h.amount}
                    </Text>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{h.status}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

        </ScrollView>
      )}

      <Modal visible={handoverModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, !isDesktop && styles.modalContentMobile]}>
            <Text style={styles.modalTitle}>Handover Cash</Text>
            
            <Text style={styles.inputLabel}>Select Person</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Search name..." 
                value={searchQuery}
                onChangeText={setSearchQuery} 
              />
              <View style={{ maxHeight: 200, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginTop: 8, marginBottom: 16 }}>
                <ScrollView nestedScrollEnabled>
                  {peers.filter((p: any) => p.full_name && p.full_name.toLowerCase().includes(searchQuery.toLowerCase())).map((p: any) => (
                    <Pressable 
                      key={p.id} 
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: selectedPeerId === p.id ? '#eff6ff' : 'transparent' }}
                      onPress={() => setSelectedPeerId(p.id)}
                    >
                      <Text style={{ color: selectedPeerId === p.id ? '#2563eb' : '#334155', fontWeight: selectedPeerId === p.id ? '600' : '400' }}>{p.full_name}</Text>
                      {(p.role || p.department) && (
                        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                          {p.role || 'Unknown Role'} {p.department ? `• ${p.department}` : ''}
                        </Text>
                      )}
                      
                    </Pressable>
                  ))}
                  {peers.length === 0 && <Text style={{padding: 12, color: '#64748b'}}>No persons found.</Text>}
                </ScrollView>
              </View>

            <Text style={styles.inputLabel}>Amount to Handover</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => {setHandoverModalVisible(false); setSelectedPeerId('');}}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]} onPress={handleRequestHandover} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalSubmitText}>Submit</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={detailsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 800, maxHeight: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 24, fontWeight: '800', color: Colors.light.text }}>
                  {selectedEmployee?.full_name || 'Loading...'}
                </Text>
                <Text style={{ fontSize: 14, color: Colors.light.icon }}>
                  {selectedEmployee?.role} • {selectedEmployee?.department || 'N/A'} ({selectedEmployee?.employee_id})
                </Text>
              </View>
              <Pressable style={{ padding: 8 }} onPress={() => setDetailsModalVisible(false)}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ef4444' }}>Close</Text>
              </Pressable>
            </View>

            {/* Date Filters & Export/Print Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {Platform.OS === 'web' ? (
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600' }}>From:</Text>
                  <input 
                    type="date" 
                    value={filterStartDate} 
                    onChange={(e: any) => setFilterStartDate(e.target.value)} 
                    style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                  <Text style={{ fontSize: 14, fontWeight: '600' }}>To:</Text>
                  <input 
                    type="date" 
                    value={filterEndDate} 
                    onChange={(e: any) => setFilterEndDate(e.target.value)} 
                    style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 }}>
                  <TextInput
                    style={{ flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8 }}
                    placeholder="Start (YYYY-MM-DD)"
                    value={filterStartDate}
                    onChangeText={setFilterStartDate}
                  />
                  <TextInput
                    style={{ flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8 }}
                    placeholder="End (YYYY-MM-DD)"
                    value={filterEndDate}
                    onChangeText={setFilterEndDate}
                  />
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable 
                  style={{ backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }} 
                  onPress={handleExportModalCSV}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Export CSV</Text>
                </Pressable>
                <Pressable 
                  style={{ backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }} 
                  onPress={handlePrintModalPDF}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Print PDF</Text>
                </Pressable>
              </View>
            </View>

            {/* Modal Tabs */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 15 }}>
              <Pressable 
                style={[{ paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' }, modalActiveTab === 'handovers' && { borderBottomColor: '#3b82f6' }]} 
                onPress={() => setModalActiveTab('handovers')}
              >
                <Text style={[{ fontSize: 15, color: '#64748b' }, modalActiveTab === 'handovers' && { color: '#3b82f6', fontWeight: '700' }]}>
                  Handovers
                </Text>
              </Pressable>
              <Pressable 
                style={[{ paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' }, modalActiveTab === 'bookings' && { borderBottomColor: '#3b82f6' }]} 
                onPress={() => setModalActiveTab('bookings')}
              >
                <Text style={[{ fontSize: 15, color: '#64748b' }, modalActiveTab === 'bookings' && { color: '#3b82f6', fontWeight: '700' }]}>
                  Bookings
                </Text>
              </Pressable>
              <Pressable 
                style={[{ paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' }, modalActiveTab === 'orders' && { borderBottomColor: '#3b82f6' }]} 
                onPress={() => setModalActiveTab('orders')}
              >
                <Text style={[{ fontSize: 15, color: '#64748b' }, modalActiveTab === 'orders' && { color: '#3b82f6', fontWeight: '700' }]}>
                  Orders
                </Text>
              </Pressable>
            </View>

            {/* Tab content table */}
            {historyLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView style={{ flex: 1 }}>
                {modalActiveTab === 'handovers' && (
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '600' }]}>Date/Time</Text>
                      <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]}>From ➔ To</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right' }]}>Amount</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right' }]}>Status</Text>
                    </View>
                    {filteredHandovers.map((h, i) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 1.5, fontSize: 13 }]}>{formatDateTimeToDDMMYYYY(h.created_at)}</Text>
                        <Text style={[styles.tableCell, { flex: 2, fontSize: 13 }]}>{h.from_name} ➔ {h.to_name}</Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '700', color: '#10b981' }]}>₹{h.amount}</Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontSize: 13 }]}>{h.status}</Text>
                      </View>
                    ))}
                    {filteredHandovers.length === 0 && (
                      <Text style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No handovers found.</Text>
                    )}
                  </View>
                )}

                {modalActiveTab === 'bookings' && (
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>ID</Text>
                      <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '600' }]}>Date/Time</Text>
                      <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]}>Patient / Doctor / Slot</Text>
                      <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '600', textAlign: 'right' }]}>Amount</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right' }]}>Status</Text>
                    </View>
                    {filteredBookings.map((b, i) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 1, fontSize: 13 }]}>#{b.id}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5, fontSize: 13 }]}>{formatDateTimeToDDMMYYYY(b.created_at)}</Text>
                        <View style={{ flex: 2, justifyContent: 'center' }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.light.text }}>{b.patient_name || 'N/A'}</Text>
                          <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Doc: Dr. {b.doctor_name || 'N/A'}</Text>
                          <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                            Slot: {b.start_time ? b.start_time.substring(0, 5) : ''} - {b.end_time ? b.end_time.substring(0, 5) : ''}
                          </Text>
                        </View>
                        <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right', fontWeight: '700' }]}>₹{b.amount}</Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontSize: 13, color: '#10b981' }]}>{b.payment_status}</Text>
                      </View>
                    ))}
                    {filteredBookings.length === 0 && (
                      <Text style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No bookings found.</Text>
                    )}
                  </View>
                )}

                {modalActiveTab === 'orders' && (
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '600' }]}>Order No</Text>
                      <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '600' }]}>Date</Text>
                      <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '600' }]}>Customer</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right' }]}>Total</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right' }]}>Paid</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right' }]}>Status</Text>
                    </View>
                    {filteredOrders.map((o, i) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 1.2, fontSize: 13 }]}>{o.order_no || 'N/A'}</Text>
                        <Text style={[styles.tableCell, { flex: 1.2, fontSize: 13 }]}>{formatDateOnlyToDDMMYYYY(o.order_date || o.created_at)}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5, fontSize: 13 }]}>{o.customer_name || 'N/A'}</Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>₹{o.amount}</Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '700', color: '#10b981' }]}>₹{o.paid_amount}</Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontSize: 13 }]}>{o.status}</Text>
                      </View>
                    ))}
                    {filteredOrders.length === 0 && (
                      <Text style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No orders found.</Text>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, padding: 32 },
  containerMobile: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  headerMobile: { flexDirection: 'column', gap: 16 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 250, padding: 24, borderRadius: 24, borderWidth: 1 },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pendingSection: { marginBottom: 32, backgroundColor: '#FFFBEB', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#FEF3C7' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },
  pendingCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  pendingAmount: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  pendingNote: { fontSize: 14, color: Colors.light.text, marginTop: 4 },
  txDate: { fontSize: 12, color: Colors.light.icon, marginTop: 4 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
  acceptBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  balancesSection: { marginBottom: 32, backgroundColor: '#FFF', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: Colors.light.border },
  table: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  tableRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border, alignItems: 'center' },
  tableCell: { color: Colors.light.text, fontSize: 14 },
  historyCard: { backgroundColor: Colors.light.card, padding: 20, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  historyPeer: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  historyDate: { fontSize: 12, color: Colors.light.icon, marginTop: 4 },
  historyAmount: { fontSize: 16, fontWeight: '700' },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  tagText: { fontSize: 12, color: Colors.light.icon, fontWeight: '600' },
  headerButtons: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#FFF', padding: 32, borderRadius: 24, width: '100%', maxWidth: 500 },
  modalContentMobile: { padding: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  modalCancelText: { color: Colors.light.icon, fontWeight: '600', fontSize: 16 },
  modalSubmitBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  modalSubmitText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  btnDisabled: { opacity: 0.7 },
  peerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  peerItem: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: 'transparent' },
  peerItemActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  peerName: { color: '#64748B', fontWeight: '500' },
  peerNameActive: { color: '#2563EB', fontWeight: '600' }
});
