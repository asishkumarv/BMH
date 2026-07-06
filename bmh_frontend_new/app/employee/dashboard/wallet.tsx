import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Platform, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Wallet, IndianRupee, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Banknote, RefreshCcw, HandCoins, ChevronDown, ChevronUp, Calendar } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import DateTimePicker from '@react-native-community/datetimepicker';

type Transaction = { id: string; type: string; amount: string; note: string; status: string; created_at: string; payment_mode?: string; payment_txn_id?: string; };
type Handover = { id: string; from_name: string; to_name: string; from_employee_id: string; to_employee_id: string; amount: string; status: string; created_at: string; from_role?: string; from_department?: string; to_role?: string; to_department?: string; note?: string; };
type Peer = { id: string; full_name: string; email: string; role: string; department: string; };
type Booking = { booking_id: string; token_number: number; patient_name: string; date: string; fee: string; payment_mode: string; doctor_name: string; };

export default function EmployeeWalletScreen() {
  const { isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState<'Allowance' | 'Cash'>('Allowance');

  // Accordion Expand/Collapse States
  const [isBookingsExpanded, setIsBookingsExpanded] = useState(false);
  const [isHandoversExpanded, setIsHandoversExpanded] = useState(true);

  // User
  const [user, setUser] = useState<any>(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Allowances
  const [balance, setBalance] = useState('0.00');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Cash
  const [cashInHand, setCashInHand] = useState('0.00');
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  // Modals
  const [usageModalVisible, setUsageModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [handoverModalVisible, setHandoverModalVisible] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedPeerId, setSelectedPeerId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      let empId = null;
      let userStr = null;
      if (Platform.OS === 'web') {
        userStr = localStorage.getItem('employeeUser');
      } else {
        userStr = await AsyncStorage.getItem('employeeUser');
      }
      if (userStr) {
        const u = JSON.parse(userStr);
        setUser(u);
        empId = u.id;
        setEmployeeId(empId);
      }
      if (empId) {
        fetchData(empId);
        fetchPeers(empId);
        fetchBookings(empId);
      }
    };
    loadUser();
  }, []);

  const formatDateDMY = (dateStr: string, includeTime = false) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      let formatted = `${day}-${month}-${year}`;
      
      if (includeTime) {
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        formatted += ` ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      }
      
      return formatted;
    } catch (e) {
      return dateStr;
    }
  };

  const exportToCSV = async (data: any[], filename: string, headers: string[], rowMapper: (item: any) => string[]) => {
    try {
      const headerRows = [
        `"Bharat Medical Hall"`,
        `"Employee Name:","${user?.full_name || 'N/A'}"`,
        `"Department:","${user?.department || 'N/A'}"`,
        `"Role:","${user?.role || 'Employee'}"`,
        `"Date Range:","${startDate || 'All'} to ${endDate || 'All'}"`,
        ``,
        headers.map(h => `"${h}"`).join(',')
      ];

      const dataRows = data.map(item => rowMapper(item).map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
      const csvContent = [...headerRows, ...dataRows].join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // @ts-ignore
        const path = `${FileSystem.documentDirectory}${filename}.csv`;
        // @ts-ignore
        await FileSystem.writeAsStringAsync(path, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path);
      }
    } catch (e: any) {
      Alert.alert("Error", "Failed to export CSV: " + e.message);
    }
  };

  const handlePrint = async (title: string, headers: string[], rows: any[], rowMapper: (item: any) => string[]) => {
    try {
      const tableHeadersHtml = headers.map(h => `<th>${h}</th>`).join('');
      const tableRowsHtml = rows.map(row => {
        const cells = rowMapper(row).map(val => `<td>${val}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #334155; }
              h1 { color: #0f172a; margin-bottom: 5px; text-align: center; font-size: 24px; }
              .meta-section { margin-top: 15px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
              .meta-row { display: flex; margin-bottom: 6px; font-size: 14px; }
              .meta-label { font-weight: bold; width: 150px; color: #475569; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
              th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
              th { background-color: #f8fafc; font-weight: bold; color: #1e293b; }
              tr:nth-child(even) { background-color: #f8fafc; }
            </style>
          </head>
          <body>
            <h1>Bharat Medical Hall</h1>
            <div class="meta-section">
              <div class="meta-row"><span class="meta-label">Report:</span><span>${title}</span></div>
              <div class="meta-row"><span class="meta-label">Employee Name:</span><span>${user?.full_name || 'N/A'}</span></div>
              <div class="meta-row"><span class="meta-label">Department:</span><span>${user?.department || 'N/A'}</span></div>
              <div class="meta-row"><span class="meta-label">Role:</span><span>${user?.role || 'Employee'}</span></div>
              <div class="meta-row"><span class="meta-label">Date Range:</span><span>${startDate || 'All'} to ${endDate || 'All'}</span></div>
            </div>
            <table>
              <thead>
                <tr>${tableHeadersHtml}</tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(htmlContent);
          doc.close();
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            document.body.removeChild(iframe);
          }, 500);
        }
      } else {
        await Print.printAsync({ html: htmlContent });
      }
    } catch (e: any) {
      Alert.alert("Error", "Failed to print: " + e.message);
    }
  };

  const fetchData = async (id: string) => {
    setLoading(true);
    try {
      const [walletRes, handoversRes] = await Promise.all([
        axios.get(`https://napi.bharatmedicalhallplus.com/wallet/${id}`),
        axios.get(`https://napi.bharatmedicalhallplus.com/wallet/handovers/${id}`)
      ]);
      
      if (walletRes.data.success) {
        setBalance(walletRes.data.data.wallet?.balance || '0.00');
        setCashInHand(walletRes.data.data.wallet?.cash_in_hand || '0.00');
        setTransactions(walletRes.data.data.transactions || []);
      }
      if (handoversRes.data.success) {
        setHandovers(handoversRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeers = async (id: string) => {
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/employees/all-users`);
      if (res.data.success) {
        // filter out self
        const filtered = res.data.data.filter((p: any) => p.id !== id);
        setPeers(filtered);
      }
    } catch (error) {}
  };

  const fetchBookings = async (id: string) => {
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings?booked_by=${id}&exclude_blocked=true`);
      if (res.data.success) setBookings(res.data.data);
    } catch (error) {}
  };

  const handleLogUsage = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return Alert.alert('Error', 'Invalid amount');
    if (Number(amount) > Number(balance)) return Alert.alert('Error', 'Insufficient balance');
    if (!employeeId) return;

    setSubmitting(true);
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/wallet/usage', { employee_id: employeeId, amount: Number(amount), note });
      if (res.data.success) {
        Alert.alert('Success', 'Usage logged successfully');
        setUsageModalVisible(false);
        setAmount(''); setNote('');
        fetchData(employeeId);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to log usage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestAllocation = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return Alert.alert('Error', 'Invalid amount');
    if (!employeeId) return;

    setSubmitting(true);
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/wallet/request', { employee_id: employeeId, amount: Number(amount), note });
      if (res.data.success) {
        Alert.alert('Success', 'Allocation request sent');
        setRequestModalVisible(false);
        setAmount(''); setNote('');
        fetchData(employeeId);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to request allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptAllocation = async (txId: string) => {
    if (!employeeId) return;
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/wallet/transaction/${txId}`, { status: 'completed' });
      if (res.data.success) fetchData(employeeId);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to accept allocation');
    }
  };

  const handleRequestHandover = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return Alert.alert('Error', 'Invalid amount');
    if (Number(amount) > Number(cashInHand)) return Alert.alert('Error', 'Insufficient cash in hand');
    if (!selectedPeerId) return Alert.alert('Error', 'Please select someone to hand over to');
    if (!employeeId) return;

    setSubmitting(true);
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/wallet/handover/request', {
        from_employee_id: employeeId,
        to_employee_id: selectedPeerId,
        amount: Number(amount),
        note: note
      });
      if (res.data.success) {
        Alert.alert('Success', 'Handover requested successfully');
        setHandoverModalVisible(false);
        setAmount(''); setSelectedPeerId(''); setNote('');
        fetchData(employeeId);
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
        if(employeeId) fetchData(employeeId);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${action.toLowerCase()}`);
    }
  };

  const pendingAllocations = transactions.filter(t => t.type === 'allocation_granted' && t.status === 'pending');
  const incomingHandovers = handovers.filter(h => h.to_employee_id == employeeId && h.status === 'Pending');

  const filteredTransactions = transactions.filter(tx => {
    if (!tx.created_at) return true;
    const txDate = new Date(tx.created_at).toISOString().split('T')[0];
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });

  const filteredBookings = bookings.filter(b => {
    if (!b.date) return true;
    const bDate = new Date(b.date).toISOString().split('T')[0];
    if (startDate && bDate < startDate) return false;
    if (endDate && bDate > endDate) return false;
    return true;
  });

  const filteredHandovers = handovers.filter(h => {
    if (!h.created_at) return true;
    const hDate = new Date(h.created_at).toISOString().split('T')[0];
    if (startDate && hDate < startDate) return false;
    if (endDate && hDate > endDate) return false;
    return true;
  });

  // Bookings calculations
  const totalCashBooked = filteredBookings.filter(b => b.payment_mode === 'Cash').reduce((acc, b) => acc + Number(b.fee || 0), 0);
  const totalOnlineBooked = filteredBookings.filter(b => b.payment_mode === 'Online').reduce((acc, b) => acc + Number(b.fee || 0), 0);

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
        <View>
          <Text style={styles.title}>My Wallet</Text>
          <Text style={styles.subtitle}>Manage allowances and collected cash.</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable style={[styles.tabBtn, activeTab === 'Allowance' && styles.tabBtnActive]} onPress={() => setActiveTab('Allowance')}>
            <Wallet size={18} color={activeTab === 'Allowance' ? '#FFF' : Colors.light.primary} />
            <Text style={[styles.tabBtnText, activeTab === 'Allowance' && styles.tabBtnTextActive]}>Allowances</Text>
          </Pressable>
          <Pressable style={[styles.tabBtn, activeTab === 'Cash' && styles.tabBtnActive]} onPress={() => setActiveTab('Cash')}>
            <Banknote size={18} color={activeTab === 'Cash' ? '#FFF' : Colors.light.primary} />
            <Text style={[styles.tabBtnText, activeTab === 'Cash' && styles.tabBtnTextActive]}>Cash Collections</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.filterCard}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.text, marginBottom: 16 }}>Filter by Date Range</Text>
            <View style={styles.filterRow}>
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>Start Date</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateInputContainer}>
                    <Calendar size={16} color="#64748b" style={styles.webCalendarIcon} />
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      style={styles.webDateInput as any}
                    />
                  </View>
                ) : (
                  <>
                    <Pressable style={styles.mobileDateBtn} onPress={() => setShowStartPicker(true)}>
                      <Calendar size={16} color="#64748b" />
                      <Text style={styles.mobileDateBtnText}>
                        {startDate ? formatDateDMY(startDate, false) : 'Select Start Date'}
                      </Text>
                    </Pressable>
                    {showStartPicker && (
                      <DateTimePicker
                        value={startDate ? new Date(startDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event: any, date?: Date) => {
                          setShowStartPicker(Platform.OS === 'ios');
                          if (date) {
                            const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                            setStartDate(offsetDate.toISOString().split('T')[0]);
                          }
                        }}
                      />
                    )}
                  </>
                )}
              </View>
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>End Date</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateInputContainer}>
                    <Calendar size={16} color="#64748b" style={styles.webCalendarIcon} />
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      style={styles.webDateInput as any}
                    />
                  </View>
                ) : (
                  <>
                    <Pressable style={styles.mobileDateBtn} onPress={() => setShowEndPicker(true)}>
                      <Calendar size={16} color="#64748b" />
                      <Text style={styles.mobileDateBtnText}>
                        {endDate ? formatDateDMY(endDate, false) : 'Select End Date'}
                      </Text>
                    </Pressable>
                    {showEndPicker && (
                      <DateTimePicker
                        value={endDate ? new Date(endDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event: any, date?: Date) => {
                          setShowEndPicker(Platform.OS === 'ios');
                          if (date) {
                            const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                            setEndDate(offsetDate.toISOString().split('T')[0]);
                          }
                        }}
                      />
                    )}
                  </>
                )}
              </View>
              {(startDate !== '' || endDate !== '') && (
                <Pressable style={styles.clearFilterBtn} onPress={() => { setStartDate(''); setEndDate(''); }}>
                  <Text style={styles.clearFilterBtnText}>Clear</Text>
                </Pressable>
              )}
            </View>
          </View>
          
          {incomingHandovers.length > 0 && activeTab === 'Cash' && (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionTitle}>Incoming Cash Handovers</Text>
              {incomingHandovers.map(h => (
                <View key={h.id} style={styles.pendingCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingAmount}>₹{h.amount}</Text>
                    <Text style={styles.pendingNote}>From: {h.from_name} ({h.from_employee_id})</Text>
                    <Text style={{fontSize: 12, color: '#475569', marginTop: 2}}>{h.from_role} • {h.from_department}</Text>
                    <Text style={styles.txDate}>{formatDateDMY(h.created_at, true)}</Text>
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

          {activeTab === 'Allowance' ? (
            <>
              <View style={[styles.balanceCard, !isDesktop && { flexDirection: 'column', alignItems: 'center' }]}>
                <View style={styles.balanceIconWrapper}>
                  <Wallet size={32} color={Colors.light.primary} />
                </View>
                <View style={[{flex: 1}, !isDesktop && { alignItems: 'center' }]}>
                  <Text style={styles.balanceLabel}>Current Allowance Balance</Text>
                  <Text style={styles.balanceAmount}>₹{balance}</Text>
                </View>
                <View style={[{flexDirection: 'row', gap: 8}, !isDesktop && { width: '100%', justifyContent: 'center' }]}>
                   <Pressable style={[styles.secondaryBtn, !isDesktop && {flex: 1, justifyContent: 'center'}]} onPress={() => setRequestModalVisible(true)}>
                     <Text style={styles.secondaryBtnText}>Request Funds</Text>
                   </Pressable>
                   <Pressable style={[styles.primaryBtn, !isDesktop && {flex: 1, justifyContent: 'center'}]} onPress={() => setUsageModalVisible(true)}>
                     <Text style={styles.primaryBtnText}>Log Usage</Text>
                   </Pressable>
                </View>
              </View>

              {pendingAllocations.length > 0 && (
                <View style={styles.pendingSection}>
                  <Text style={styles.sectionTitle}>Pending Allocations</Text>
                  {pendingAllocations.map(tx => (
                    <View key={tx.id} style={styles.pendingCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pendingAmount}>₹{tx.amount}</Text>
                        {tx.note ? <Text style={styles.pendingNote}>Note: {tx.note}</Text> : null}
                        <Text style={styles.txDate}>{formatDateDMY(tx.created_at, true)}</Text>
                      </View>
                      <Pressable style={styles.acceptBtn} onPress={() => handleAcceptAllocation(tx.id)}>
                        <CheckCircle2 size={16} color="#FFF" />
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text }}>Transaction History</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable style={styles.actionIconButton} onPress={() => exportToCSV(filteredTransactions, 'Allowance_History', ['Date', 'Type', 'Amount', 'Note', 'Status'], (tx) => [
                    formatDateDMY(tx.created_at, true),
                    tx.type === 'usage' ? 'Usage' : tx.type === 'allocation_granted' ? 'Granted' : 'Requested',
                    `₹${tx.amount}`,
                    tx.note || '',
                    tx.status
                  ])}>
                    <Text style={styles.actionIconText}>CSV</Text>
                  </Pressable>
                  <Pressable style={styles.actionIconButton} onPress={() => handlePrint('Allowance Transaction History', ['Date', 'Type', 'Amount', 'Note', 'Status'], filteredTransactions, (tx) => [
                    formatDateDMY(tx.created_at, true),
                    tx.type === 'usage' ? 'Usage' : tx.type === 'allocation_granted' ? 'Granted' : 'Requested',
                    `₹${tx.amount}`,
                    tx.note || '',
                    tx.status
                  ])}>
                    <Text style={styles.actionIconText}>Print</Text>
                  </Pressable>
                </View>
              </View>
              {filteredTransactions.map(tx => (
                <View key={tx.id} style={styles.txCard}>
                  <View style={[styles.txIconWrapper, { backgroundColor: tx.type === 'usage' ? '#fee2e2' : '#dcfce7' }]}>
                    {tx.type === 'usage' ? <ArrowUpRight size={20} color="#ef4444" /> : <ArrowDownRight size={20} color="#22c55e" />}
                  </View>
                  <View style={styles.txDetails}>
                    <Text style={styles.txType}>
                      {tx.type === 'usage' ? 'Usage Logged' : tx.type === 'allocation_granted' ? 'Allocation Granted' : 'Allocation Requested'}
                    </Text>
                    <Text style={styles.txDate}>{formatDateDMY(tx.created_at, true)}</Text>
                    {tx.note ? <Text style={styles.txNote}>{tx.note}</Text> : null}
                  </View>
                  <View style={styles.txAmountSection}>
                    <Text style={[styles.txAmount, { color: tx.type === 'usage' ? '#ef4444' : '#22c55e' }]}>
                      {tx.type === 'usage' ? '-' : '+'}₹{tx.amount}
                    </Text>
                    <Text style={[styles.txStatus, { 
                      color: tx.status === 'completed' ? '#22c55e' : tx.status === 'pending' ? '#eab308' : '#ef4444',
                      backgroundColor: tx.status === 'completed' ? '#dcfce7' : tx.status === 'pending' ? '#fef08a' : '#fee2e2'
                    }]}>
                      {tx.status}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={[styles.balanceCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }, !isDesktop && { flexDirection: 'column', alignItems: 'center' }]}>
                <View style={[styles.balanceIconWrapper, { backgroundColor: '#dcfce7' }]}>
                  <Banknote size={32} color="#16a34a" />
                </View>
                <View style={[{flex: 1}, !isDesktop && { alignItems: 'center' }]}>
                  <Text style={styles.balanceLabel}>Cash In Hand (To Handover)</Text>
                  <Text style={[styles.balanceAmount, {color: '#166534'}]}>₹{cashInHand}</Text>
                </View>
                <Pressable style={[styles.primaryBtn, {backgroundColor: '#16a34a'}, !isDesktop && { width: '100%', justifyContent: 'center' }]} onPress={() => {setAmount(cashInHand); setHandoverModalVisible(true)}}>
                  <HandCoins size={18} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Handover Cash</Text>
                </Pressable>
              </View>

              <View style={[{ flexDirection: 'row', gap: 16, marginTop: 16 }, !isDesktop && { flexDirection: 'column' }]}>
                <View style={[styles.statsBox, { flex: 1 }]}>
                  <Text style={styles.statsLabel}>Total Cash Booked</Text>
                  <Text style={[styles.statsValue, { color: '#16a34a' }]}>₹{totalCashBooked}</Text>
                </View>
                <View style={[styles.statsBox, { flex: 1 }]}>
                  <Text style={styles.statsLabel}>Total Online Booked</Text>
                  <Text style={[styles.statsValue, { color: Colors.light.primary }]}>₹{totalOnlineBooked}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 }}>
                <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }} onPress={() => setIsBookingsExpanded(!isBookingsExpanded)}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text }}>My Booking Collections</Text>
                  {isBookingsExpanded ? <ChevronUp size={20} color={Colors.light.text} /> : <ChevronDown size={20} color={Colors.light.text} />}
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable style={styles.actionIconButton} onPress={() => exportToCSV(filteredBookings, 'Booking_Collections', ['Booking ID', 'Patient Name', 'Date', 'Fee', 'Payment Mode', 'Doctor'], (b) => [
                    b.booking_id,
                    b.patient_name,
                    formatDateDMY(b.date, false),
                    `₹${b.fee}`,
                    b.payment_mode,
                    `Dr. ${b.doctor_name}`
                  ])}>
                    <Text style={styles.actionIconText}>CSV</Text>
                  </Pressable>
                  <Pressable style={styles.actionIconButton} onPress={() => handlePrint('My Booking Collections', ['Booking ID', 'Patient Name', 'Date', 'Fee', 'Payment Mode', 'Doctor'], filteredBookings, (b) => [
                    b.booking_id,
                    b.patient_name,
                    formatDateDMY(b.date, false),
                    `₹${b.fee}`,
                    b.payment_mode,
                    `Dr. ${b.doctor_name}`
                  ])}>
                    <Text style={styles.actionIconText}>Print</Text>
                  </Pressable>
                </View>
              </View>
              {isBookingsExpanded && filteredBookings.map(b => (
                <View key={b.booking_id} style={styles.txCard}>
                  <View style={[styles.txIconWrapper, { backgroundColor: b.payment_mode === 'Cash' ? '#dcfce7' : '#e0f2fe' }]}>
                    {b.payment_mode === 'Cash' ? <Banknote size={20} color="#16a34a" /> : <RefreshCcw size={20} color={Colors.light.primary} />}
                  </View>
                  <View style={styles.txDetails}>
                    <Text style={styles.txType}>Patient: {b.patient_name}</Text>
                    <Text style={styles.txDate}>{formatDateDMY(b.date, false)} - Dr. {b.doctor_name}</Text>
                  </View>
                  <View style={styles.txAmountSection}>
                    <Text style={[styles.txAmount, { color: b.payment_mode === 'Cash' ? '#16a34a' : Colors.light.primary }]}>
                      +₹{b.fee || 0}
                    </Text>
                    <Text style={[styles.txStatus, { color: b.payment_mode === 'Cash' ? '#166534' : '#075985', backgroundColor: b.payment_mode === 'Cash' ? '#dcfce7' : '#e0f2fe' }]}>
                      {b.payment_mode}
                    </Text>
                  </View>
                </View>
              ))}
              {!isBookingsExpanded && filteredBookings.length > 0 && (
                <Pressable onPress={() => setIsBookingsExpanded(true)} style={{ padding: 12, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 13, color: '#475569', fontWeight: '500' }}>Show {filteredBookings.length} Booking Collections</Text>
                </Pressable>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 }}>
                <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }} onPress={() => setIsHandoversExpanded(!isHandoversExpanded)}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text }}>Handover History</Text>
                  {isHandoversExpanded ? <ChevronUp size={20} color={Colors.light.text} /> : <ChevronDown size={20} color={Colors.light.text} />}
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable style={styles.actionIconButton} onPress={() => exportToCSV(filteredHandovers, 'Handover_History', ['Date', 'Type', 'Target Person', 'Role', 'Department', 'Amount', 'Status', 'Note'], (h) => {
                    const isOut = h.from_employee_id == employeeId;
                    return [
                      formatDateDMY(h.created_at, true),
                      isOut ? 'Handed Over' : 'Received',
                      isOut ? `${h.to_name} (${h.to_employee_id})` : `${h.from_name} (${h.from_employee_id})`,
                      isOut ? h.to_role || '' : h.from_role || '',
                      isOut ? h.to_department || '' : h.from_department || '',
                      `₹${h.amount}`,
                      h.status,
                      h.note || ''
                    ];
                  })}>
                    <Text style={styles.actionIconText}>CSV</Text>
                  </Pressable>
                  <Pressable style={styles.actionIconButton} onPress={() => handlePrint('Handover History', ['Date', 'Type', 'Target Person', 'Role', 'Department', 'Amount', 'Status', 'Note'], filteredHandovers, (h) => {
                    const isOut = h.from_employee_id == employeeId;
                    return [
                      formatDateDMY(h.created_at, true),
                      isOut ? 'Handed Over' : 'Received',
                      isOut ? `${h.to_name} (${h.to_employee_id})` : `${h.from_name} (${h.from_employee_id})`,
                      isOut ? h.to_role || '' : h.from_role || '',
                      isOut ? h.to_department || '' : h.from_department || '',
                      `₹${h.amount}`,
                      h.status,
                      h.note || ''
                    ];
                  })}>
                    <Text style={styles.actionIconText}>Print</Text>
                  </Pressable>
                </View>
              </View>
              {isHandoversExpanded && filteredHandovers.map(h => (
                <View key={h.id} style={styles.txCard}>
                  <View style={styles.txDetails}>
                    <Text style={styles.txType}>
                      {h.from_employee_id == employeeId ? `Handed to ${h.to_name} (${h.to_employee_id})` : `Received from ${h.from_name} (${h.from_employee_id})`}
                    </Text>
                    <Text style={{fontSize: 12, color: '#475569', marginTop: 2}}>
                      {h.from_employee_id == employeeId ? `${h.to_role} • ${h.to_department}` : `${h.from_role} • ${h.from_department}`}
                    </Text>
                    <Text style={styles.txDate}>{formatDateDMY(h.created_at, true)}</Text>
                    {h.note ? <Text style={styles.txNote}>{h.note}</Text> : null}
                  </View>
                  <View style={styles.txAmountSection}>
                    <Text style={[styles.txAmount, { color: h.from_employee_id == employeeId ? '#ef4444' : '#16a34a' }]}>
                      {h.from_employee_id == employeeId ? '-' : '+'}₹{h.amount}
                    </Text>
                    <Text style={[styles.txStatus, { 
                      color: h.status === 'Accepted' ? '#22c55e' : h.status === 'Pending' ? '#eab308' : '#ef4444',
                      backgroundColor: h.status === 'Accepted' ? '#dcfce7' : h.status === 'Pending' ? '#fef08a' : '#fee2e2'
                    }]}>
                      {h.status}
                    </Text>
                  </View>
                </View>
              ))}
              {!isHandoversExpanded && filteredHandovers.length > 0 && (
                <Pressable onPress={() => setIsHandoversExpanded(true)} style={{ padding: 12, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 13, color: '#475569', fontWeight: '500' }}>Show {filteredHandovers.length} Handover Records</Text>
                </Pressable>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Handover Modal */}
      <Modal visible={handoverModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, !isDesktop && styles.modalContentMobile]}>
            <Text style={styles.modalTitle}>Handover Cash</Text>
            
            <Text style={styles.inputLabel}>Select Peer</Text>
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
                  {peers.length === 0 && <Text style={{padding: 12, color: '#64748b'}}>No peers found in your department.</Text>}
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

            <Text style={styles.inputLabel}>Note (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Booking Collections handover"
              value={note}
              onChangeText={setNote}
            />

            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => {setHandoverModalVisible(false); setSelectedPeerId(''); setNote(''); setAmount('');}}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]} onPress={handleRequestHandover} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalSubmitText}>Submit Request</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Usage Modal */}
      <Modal visible={usageModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, !isDesktop && styles.modalContentMobile]}>
            <Text style={styles.modalTitle}>Log Allowance Usage</Text>
            <Text style={styles.inputLabel}>Amount Used</Text>
            <TextInput style={styles.input} placeholder="e.g. 150" keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <Text style={styles.inputLabel}>Note / Reason</Text>
            <TextInput style={[styles.input, { height: 80 }]} placeholder="e.g. Bought pens for reception" multiline value={note} onChangeText={setNote} />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setUsageModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]} onPress={handleLogUsage} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalSubmitText}>Submit</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Request Modal */}
      <Modal visible={requestModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, !isDesktop && styles.modalContentMobile]}>
            <Text style={styles.modalTitle}>Request Funds</Text>
            <Text style={styles.inputLabel}>Amount</Text>
            <TextInput style={styles.input} placeholder="e.g. 500" keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <Text style={styles.inputLabel}>Reason for Request</Text>
            <TextInput style={[styles.input, { height: 80 }]} placeholder="e.g. Need to buy printer ink" multiline value={note} onChangeText={setNote} />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setRequestModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]} onPress={handleRequestAllocation} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalSubmitText}>Submit Request</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: '#F8FAFC' },
  containerMobile: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.light.text, marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#64748B' },
  headerButtons: { flexDirection: 'row', gap: 12 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#e2e8f0' },
  tabBtnActive: { backgroundColor: Colors.light.primary },
  tabBtnText: { color: Colors.light.primary, fontWeight: '600' },
  tabBtnTextActive: { color: '#FFF' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e0f2fe', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  secondaryBtnText: { color: Colors.light.primary, fontWeight: '600', fontSize: 14 },
  balanceCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#e2e8f0', gap: 16 },
  balanceIconWrapper: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center' },
  balanceLabel: { fontSize: 14, color: '#64748B', fontWeight: '500', marginBottom: 4 },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: Colors.light.text },
  statsBox: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  statsLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  statsValue: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  pendingSection: { marginTop: 24, padding: 16, backgroundColor: '#fef3c7', borderRadius: 12, borderWidth: 1, borderColor: '#fde68a' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#92400e', marginBottom: 12 },
  pendingCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 8, marginBottom: 8 },
  pendingAmount: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  pendingNote: { fontSize: 14, color: '#64748B', marginTop: 4 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  acceptBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  txIconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  txDetails: { flex: 1 },
  txType: { fontSize: 15, fontWeight: '600', color: Colors.light.text, marginBottom: 4 },
  txDate: { fontSize: 13, color: '#94a3b8' },
  txNote: { fontSize: 14, color: '#64748B', marginTop: 4, fontStyle: 'italic' },
  txAmountSection: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  txStatus: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, width: 400, maxWidth: '100%' },
  modalContentMobile: { width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#f8fafc' },
  peerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  peerItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  peerItemActive: { borderColor: Colors.light.primary, backgroundColor: '#e0f2fe' },
  peerName: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  peerNameActive: { color: Colors.light.primary },
  peerRole: { fontSize: 11, color: '#64748b' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalCancelText: { color: '#475569', fontWeight: '600' },
  modalSubmitBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: Colors.light.primary, alignItems: 'center' },
  modalSubmitText: { color: '#FFF', fontWeight: '600' },
  btnDisabled: { opacity: 0.7 },
  filterCard: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  filterCol: { flex: 1, minWidth: 200 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  webDateInputContainer: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  webCalendarIcon: { position: 'absolute', left: 12, zIndex: 10, pointerEvents: 'none' },
  webDateInput: { paddingVertical: 10, paddingLeft: 36, paddingRight: 12, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#F8FAFC', fontSize: 14, width: '100%', outlineWidth: 0, color: '#334155' },
  mobileDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#F8FAFC' },
  mobileDateBtnText: { fontSize: 14, color: '#334155' },
  clearFilterBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end', height: 42 },
  clearFilterBtnText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  actionIconButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  actionIconText: { fontSize: 12, fontWeight: '600', color: '#1E40AF' }
});
