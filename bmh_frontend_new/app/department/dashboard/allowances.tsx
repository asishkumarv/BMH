import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Wallet, IndianRupee, ArrowUpRight, ArrowDownRight, Check, X, Send } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

type EmployeeWallet = { id: string; employee_id: string; balance: string; full_name: string; department: string; email: string; profile_data?: string; };
type Transaction = { id: string; employee_id: string; full_name: string; department: string; type: string; amount: string; note: string; status: string; created_at: string; approved_by: string; payment_mode?: string; payment_txn_id?: string; };
type Employee = { id: string; full_name: string; department: string; };

export default function SubAdminAllowancesScreen() {
  const { isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState<'wallets' | 'requests' | 'transactions'>('wallets');
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  
  const [wallets, setWallets] = useState<EmployeeWallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Usage Logs Modal
  const [usageLogsModalVisible, setUsageLogsModalVisible] = useState(false);
  const [selectedWalletForLogs, setSelectedWalletForLogs] = useState<EmployeeWallet | null>(null);

  // Allocation Modal
  const [allocationModalVisible, setAllocationModalVisible] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocNote, setAllocNote] = useState('');
  const [allocPaymentMode, setAllocPaymentMode] = useState<'Cash'|'Online'>('Cash');
  const [allocTxnId, setAllocTxnId] = useState('');
  const [allocating, setAllocating] = useState(false);

  // Review Modal
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewingTx, setReviewingTx] = useState<{id: string, status: 'approved' | 'rejected'} | null>(null);
  const [reviewPaymentMode, setReviewPaymentMode] = useState<'Cash'|'Online'>('Cash');
  const [reviewTxnId, setReviewTxnId] = useState('');
  const [processingReview, setProcessingReview] = useState(false);

  // History Filters
  const [historySearchName, setHistorySearchName] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState('All');

  useEffect(() => {
    if (Platform.OS === 'web') {
      const userStr = localStorage.getItem('subAdminUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        setDepartmentId(user.department_id);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, departmentId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = 'https://bmh-eitu.onrender.com/wallet';
      let empUrl = 'https://bmh-eitu.onrender.com/employees';
      
      if (departmentId) {
        url += `?department_id=${encodeURIComponent(departmentId)}`;
        empUrl = `https://bmh-eitu.onrender.com/employees/by-department-id/${departmentId}`;
      }
      
      const [walletRes, empRes] = await Promise.all([
        axios.get(url),
        axios.get(empUrl)
      ]);
      
      if (walletRes.data.success) {
        setWallets(walletRes.data.data.wallets);
        setTransactions(walletRes.data.data.transactions);
      }
      if (empRes.data.success) {
        setAllEmployees(empRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedEmployeeId) return Alert.alert('Error', 'Please select an employee');
    if (!allocAmount || isNaN(Number(allocAmount)) || Number(allocAmount) <= 0) return Alert.alert('Error', 'Invalid amount');
    if (allocPaymentMode === 'Online' && !allocTxnId.trim()) return Alert.alert('Error', 'Please enter Transaction ID for online payment');
    
    setAllocating(true);
    try {
      const res = await axios.post('https://bmh-eitu.onrender.com/wallet/allocate', {
        employee_id: selectedEmployeeId,
        amount: Number(allocAmount),
        note: allocNote,
        payment_mode: allocPaymentMode,
        payment_txn_id: allocPaymentMode === 'Online' ? allocTxnId : ''
      });
      if (res.data.success) {
        Alert.alert('Success', 'Funds allocated successfully. The employee must accept it.');
        setAllocationModalVisible(false);
        setAllocAmount(''); setAllocNote(''); setSelectedEmployeeId('');
        setAllocPaymentMode('Cash'); setAllocTxnId('');
        fetchData();
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to allocate funds');
    } finally {
      setAllocating(false);
    }
  };

  const submitReviewRequest = async () => {
    if (!reviewingTx) return;
    if (reviewingTx.status === 'approved' && reviewPaymentMode === 'Online' && !reviewTxnId.trim()) {
      return Alert.alert('Error', 'Please enter Transaction ID for online payment');
    }
    setProcessingReview(true);
    try {
      let adminStr = 'Sub Admin';
      if (Platform.OS === 'web') {
        const userStr = localStorage.getItem('subAdminUser');
        if (userStr) {
          const u = JSON.parse(userStr);
          adminStr = `Sub Admin: ${u.full_name} (${u.email}, ID: ${u.id})`;
        }
      }

      const res = await axios.put(`https://bmh-eitu.onrender.com/wallet/transaction/${reviewingTx.id}`, { 
        status: reviewingTx.status,
        approved_by: adminStr,
        payment_mode: reviewingTx.status === 'approved' ? reviewPaymentMode : null,
        payment_txn_id: reviewingTx.status === 'approved' && reviewPaymentMode === 'Online' ? reviewTxnId : null
      });
      if (res.data.success) {
        Alert.alert('Success', `Request ${reviewingTx.status}`);
        setReviewModalVisible(false);
        setReviewingTx(null);
        setReviewPaymentMode('Cash');
        setReviewTxnId('');
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process request');
    } finally {
      setProcessingReview(false);
    }
  };

  const handleExportUsageCSV = () => {
    if (!selectedWalletForLogs) return;

    const empTxs = transactions.filter(t => t.employee_id === selectedWalletForLogs.employee_id);
    let phone = 'N/A';
    try {
      if (selectedWalletForLogs.profile_data) {
        const pd = JSON.parse(selectedWalletForLogs.profile_data);
        phone = pd.mobile || pd.phone || pd.phoneNumber || 'N/A';
      }
    } catch(e) {}

    const csvRows = [];
    csvRows.push(['Employee Name', selectedWalletForLogs.full_name]);
    csvRows.push(['Employee ID', selectedWalletForLogs.employee_id]);
    csvRows.push(['Department', selectedWalletForLogs.department]);
    csvRows.push(['Email', selectedWalletForLogs.email]);
    csvRows.push(['Phone', phone]);
    csvRows.push(['Current Balance', `Rs. ${selectedWalletForLogs.balance}`]);
    csvRows.push([]);
    csvRows.push(['Date', 'Type', 'Amount', 'Status', 'Note']);

    empTxs.forEach(tx => {
      const date = new Date(tx.created_at).toLocaleString().replace(',', '');
      let typeLabel = tx.type;
      if (tx.type === 'usage') typeLabel = 'Debit (Usage)';
      if (tx.type === 'allocation_granted') typeLabel = 'Credit (Allocated)';
      if (tx.type === 'allocation_request') typeLabel = 'Request';
      
      let sign = tx.type === 'usage' ? '-' : (tx.type === 'allocation_granted' && tx.status === 'completed' ? '+' : '');
      
      csvRows.push([
        date, 
        typeLabel, 
        `${sign}${tx.amount}`, 
        tx.status, 
        `"${tx.note ? tx.note.replace(/"/g, '""') : ''}"`
      ]);
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${selectedWalletForLogs.full_name.replace(/\s+/g, '_')}_transactions.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('Notice', 'CSV Export is only supported on web right now.');
    }
  };

  const filteredHistoryTxs = transactions.filter(t => {
    if (historySearchName && !t.full_name.toLowerCase().includes(historySearchName.toLowerCase())) return false;
    if (historyFilterType === 'Requests' && t.type !== 'allocation_request') return false;
    if (historyFilterType === 'Allocations' && t.type !== 'allocation_granted') return false;
    if (historyFilterType === 'Usage' && t.type !== 'usage') return false;
    return true;
  });

  const handleExportHistoryCSV = () => {
    const csvRows = [];
    csvRows.push(['Date', 'Employee Name', 'Department', 'Type', 'Amount', 'Status', 'Payment Mode', 'Txn ID', 'Note', 'Approved By']);
    
    filteredHistoryTxs.forEach(tx => {
      const date = new Date(tx.created_at).toLocaleString().replace(',', '');
      let typeLabel = tx.type;
      if (tx.type === 'usage') typeLabel = 'Debit (Usage)';
      if (tx.type === 'allocation_granted') typeLabel = 'Credit (Allocated)';
      if (tx.type === 'allocation_request') typeLabel = 'Request';
      let sign = tx.type === 'usage' ? '-' : (tx.type === 'allocation_granted' && tx.status === 'completed' ? '+' : '');
      
      csvRows.push([
        date,
        `"${tx.full_name}"`,
        `"${tx.department}"`,
        typeLabel,
        `${sign}${tx.amount}`,
        tx.status,
        tx.payment_mode || 'N/A',
        tx.payment_txn_id || 'N/A',
        `"${tx.note ? tx.note.replace(/"/g, '""') : ''}"`,
        `"${tx.approved_by || ''}"`
      ]);
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `department_transaction_history.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('Notice', 'CSV Export is only supported on web right now.');
    }
  };

  const renderWalletItem = ({ item }: { item: EmployeeWallet }) => (
    <Pressable 
      style={styles.walletCard} 
      onPress={() => {
        setSelectedWalletForLogs(item);
        setUsageLogsModalVisible(true);
      }}
    >
      <View style={styles.walletIconWrapper}>
        <Text style={styles.walletInitials}>{item.full_name.charAt(0)}</Text>
      </View>
      <View style={{ flex: 1, marginRight: 16 }}>
        <Text style={styles.walletName}>{item.full_name}</Text>
        <Text style={styles.walletDept}>{item.department} • {item.email}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.walletBalanceLabel}>Balance</Text>
        <Text style={styles.walletBalanceAmount}>₹{item.balance}</Text>
      </View>
    </Pressable>
  );

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isUsage = item.type === 'usage';
    const isRequest = item.type === 'allocation_request';
    const isGranted = item.type === 'allocation_granted';
    
    let icon = <IndianRupee size={20} color={Colors.light.icon} />;
    let color = Colors.light.text;
    let sign = '';
    
    if (isUsage) {
      icon = <ArrowUpRight size={20} color={Colors.light.error} />;
      color = Colors.light.error;
      sign = '-';
    } else if (isRequest) {
      icon = <ArrowDownRight size={20} color={Colors.light.primary} />;
    } else if (isGranted && item.status === 'completed') {
      icon = <ArrowDownRight size={20} color="#10B981" />;
      color = '#10B981';
      sign = '+';
    }

    return (
      <View style={styles.txRow}>
        <View style={[styles.txIcon, isUsage ? { backgroundColor: '#FEE2E2' } : isGranted && item.status === 'completed' ? { backgroundColor: '#D1FAE5' } : undefined]}>
          {icon}
        </View>
        <View style={{ flex: 1, marginRight: 16 }}>
          <Text style={styles.txType}>
            {isUsage ? 'Usage Logged' : isRequest ? 'Requested Allocation' : 'Allocation Granted'}
          </Text>
          <Text style={styles.txEmployee}>{item.full_name} ({item.department})</Text>
          {item.note ? <Text style={styles.txNote} numberOfLines={1}>"{item.note}"</Text> : null}
          <Text style={styles.txDate}>{new Date(item.created_at).toLocaleString()}</Text>
          {item.payment_mode && <Text style={{ fontSize: 12, color: Colors.light.icon, marginTop: 4 }}>Paid via: {item.payment_mode} {item.payment_mode === 'Online' ? `(${item.payment_txn_id})` : ''}</Text>}
          {item.approved_by && item.status !== 'pending' && (
            <Text style={{ fontSize: 11, color: Colors.light.primary, marginTop: 4, fontWeight: '600' }}>Processed by: {item.approved_by}</Text>
          )}
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.txAmount, { color }]}>{sign}₹{item.amount}</Text>
          
          {isRequest && item.status === 'pending' ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable style={styles.actionBtnSmall} onPress={() => { setReviewingTx({ id: item.id, status: 'approved' }); setReviewModalVisible(true); }}>
                <Check size={16} color="#10B981" />
              </Pressable>
              <Pressable style={[styles.actionBtnSmall, { backgroundColor: '#FEE2E2' }]} onPress={() => { setReviewingTx({ id: item.id, status: 'rejected' }); setReviewModalVisible(true); }}>
                <X size={16} color={Colors.light.error} />
              </Pressable>
            </View>
          ) : (
            <View style={[styles.statusBadge, (styles as any)[`status_${item.status}`] || styles.status_pending]}>
              <Text style={[styles.statusText, (styles as any)[`text_${item.status}`] || styles.text_pending]}>{item.status}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
        <View>
          <Text style={styles.title}>Allowances & Usage</Text>
          <Text style={styles.subtitle}>Manage employee wallets and track spending.</Text>
        </View>
        
        <Pressable style={styles.primaryBtn} onPress={() => setAllocationModalVisible(true)}>
          <Send size={18} color="#FFF" />
          <Text style={styles.primaryBtnText}>Allocate Funds</Text>
        </Pressable>
      </View>

      <View style={styles.tabsContainer}>
        <Pressable 
          style={[styles.tab, activeTab === 'wallets' && styles.activeTab]} 
          onPress={() => setActiveTab('wallets')}
        >
          <Text style={[styles.tabText, activeTab === 'wallets' && styles.activeTabText]}>Employee Wallets</Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]} 
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Fund Requests</Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]} 
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>Transaction History</Text>
        </Pressable>
      </View>

      <View style={styles.contentArea}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
        ) : activeTab === 'wallets' ? (
          <FlatList
            data={wallets}
            keyExtractor={item => item.id}
            renderItem={renderWalletItem}
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No wallets found. They will be created when employees are added.</Text>}
          />
        ) : activeTab === 'requests' ? (
          <FlatList
            data={transactions.filter(t => t.type === 'allocation_request')}
            keyExtractor={item => item.id}
            renderItem={renderTransactionItem}
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No fund requests found.</Text>}
          />
        ) : (
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'center', zIndex: 10, flexWrap: 'wrap' }}>
              <TextInput style={[styles.input, { marginBottom: 0, flex: 1, minWidth: 200, padding: 10 }]} placeholder="Search Employee Name..." value={historySearchName} onChangeText={setHistorySearchName} />
              {Platform.OS === 'web' && (
                <View style={{ flex: 1, minWidth: 150, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, backgroundColor: '#FFF', height: 42, justifyContent: 'center' }}>
                  <select value={historyFilterType} onChange={(e) => setHistoryFilterType(e.target.value)} style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', padding: '0 10px', outline: 'none' }}>
                    <option value="All">All Types</option>
                    <option value="Requests">Requests</option>
                    <option value="Allocations">Allocations</option>
                    <option value="Usage">Usage</option>
                  </select>
                </View>
              )}
              <Pressable onPress={handleExportHistoryCSV} style={{ backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 }}>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Export CSV</Text>
              </Pressable>
            </View>
            <FlatList
              data={filteredHistoryTxs}
              keyExtractor={item => item.id}
              renderItem={renderTransactionItem}
              contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No transactions match your filters.</Text>}
            />
          </View>
        )}
      </View>

      {/* Allocate Funds Modal */}
      <Modal visible={allocationModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 500 }]}>
            <Text style={styles.modalTitle}>Allocate Funds</Text>
            
            <Text style={styles.label}>Select Employee</Text>
            {/* Simple picker simulation for demo, ideally a proper searchable dropdown */}
            <ScrollView style={{ maxHeight: 150, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, marginBottom: 20 }}>
              {allEmployees.map(e => (
                <Pressable 
                  key={e.id} 
                  style={[styles.pickerItem, selectedEmployeeId === e.id.toString() && styles.pickerItemActive]}
                  onPress={() => setSelectedEmployeeId(e.id.toString())}
                >
                  <Text style={[styles.pickerItemText, selectedEmployeeId === e.id.toString() && styles.pickerItemTextActive]}>
                    {e.full_name} ({e.department})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput style={styles.input} value={allocAmount} onChangeText={setAllocAmount} keyboardType="numeric" placeholder="e.g. 5000" />
            
            <Text style={styles.label}>Payment Mode</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <Pressable style={[styles.pickerItem, {flex:1, borderRadius:8, borderWidth: 1, borderColor: Colors.light.border}, allocPaymentMode === 'Cash' && styles.pickerItemActive]} onPress={() => setAllocPaymentMode('Cash')}>
                <Text style={[styles.pickerItemText, {textAlign: 'center'}, allocPaymentMode === 'Cash' && styles.pickerItemTextActive]}>Cash</Text>
              </Pressable>
              <Pressable style={[styles.pickerItem, {flex:1, borderRadius:8, borderWidth: 1, borderColor: Colors.light.border}, allocPaymentMode === 'Online' && styles.pickerItemActive]} onPress={() => setAllocPaymentMode('Online')}>
                <Text style={[styles.pickerItemText, {textAlign: 'center'}, allocPaymentMode === 'Online' && styles.pickerItemTextActive]}>Online</Text>
              </Pressable>
            </View>

            {allocPaymentMode === 'Online' && (
              <>
                <Text style={styles.label}>Transaction ID</Text>
                <TextInput style={styles.input} value={allocTxnId} onChangeText={setAllocTxnId} placeholder="Enter Txn ID" />
              </>
            )}

            <Text style={styles.label}>Note (Optional)</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={allocNote} onChangeText={setAllocNote} multiline placeholder="e.g. Monthly travel allowance" />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => { setAllocationModalVisible(false); setAllocAmount(''); setAllocNote(''); setSelectedEmployeeId(''); setAllocPaymentMode('Cash'); setAllocTxnId(''); }}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
              <Pressable style={styles.submitBtn} onPress={handleAllocate} disabled={allocating}><Text style={styles.submitBtnText}>{allocating ? 'Processing...' : 'Allocate'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review Request Modal */}
      <Modal visible={reviewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 400 }]}>
            <Text style={styles.modalTitle}>{reviewingTx?.status === 'approved' ? 'Approve Request' : 'Reject Request'}</Text>
            
            {reviewingTx?.status === 'approved' && (
              <>
                <Text style={styles.label}>Payment Mode</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                  <Pressable style={[styles.pickerItem, {flex:1, borderRadius:8, borderWidth: 1, borderColor: Colors.light.border}, reviewPaymentMode === 'Cash' && styles.pickerItemActive]} onPress={() => setReviewPaymentMode('Cash')}>
                    <Text style={[styles.pickerItemText, {textAlign: 'center'}, reviewPaymentMode === 'Cash' && styles.pickerItemTextActive]}>Cash</Text>
                  </Pressable>
                  <Pressable style={[styles.pickerItem, {flex:1, borderRadius:8, borderWidth: 1, borderColor: Colors.light.border}, reviewPaymentMode === 'Online' && styles.pickerItemActive]} onPress={() => setReviewPaymentMode('Online')}>
                    <Text style={[styles.pickerItemText, {textAlign: 'center'}, reviewPaymentMode === 'Online' && styles.pickerItemTextActive]}>Online</Text>
                  </Pressable>
                </View>

                {reviewPaymentMode === 'Online' && (
                  <>
                    <Text style={styles.label}>Transaction ID</Text>
                    <TextInput style={styles.input} value={reviewTxnId} onChangeText={setReviewTxnId} placeholder="Enter Txn ID" />
                  </>
                )}
              </>
            )}
            
            {reviewingTx?.status === 'rejected' && (
              <Text style={{ marginBottom: 20, color: Colors.light.icon }}>Are you sure you want to reject this request?</Text>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => { setReviewModalVisible(false); setReviewingTx(null); setReviewPaymentMode('Cash'); setReviewTxnId(''); }}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
              <Pressable style={[styles.submitBtn, reviewingTx?.status === 'rejected' && { backgroundColor: Colors.light.error }]} onPress={submitReviewRequest} disabled={processingReview}><Text style={styles.submitBtnText}>{processingReview ? 'Processing...' : 'Confirm'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Usage Logs Modal */}
      <Modal visible={usageLogsModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 600, maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={styles.modalTitle}>
                {selectedWalletForLogs ? `Employee Details & Logs` : 'Logs'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable onPress={handleExportUsageCSV} style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.light.primary, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Export CSV</Text>
                </Pressable>
                <Pressable onPress={() => setUsageLogsModalVisible(false)} style={{ padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 }}>
                  <X size={20} color={Colors.light.icon} />
                </Pressable>
              </View>
            </View>

            {selectedWalletForLogs && (
              <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.light.text, marginBottom: 8 }}>{selectedWalletForLogs.full_name}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                  <Text style={{ fontSize: 13, color: Colors.light.icon }}>ID: {selectedWalletForLogs.employee_id}</Text>
                  <Text style={{ fontSize: 13, color: Colors.light.icon }}>Dept: {selectedWalletForLogs.department}</Text>
                  <Text style={{ fontSize: 13, color: Colors.light.icon }}>Email: {selectedWalletForLogs.email}</Text>
                  <Text style={{ fontSize: 13, color: Colors.light.icon }}>
                    Phone: {(() => {
                      try {
                        if (selectedWalletForLogs.profile_data) {
                          const pd = JSON.parse(selectedWalletForLogs.profile_data);
                          return pd.mobile || pd.phone || pd.phoneNumber || 'N/A';
                        }
                      } catch(e) {}
                      return 'N/A';
                    })()}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.light.primary, marginTop: 12 }}>Balance: ₹{selectedWalletForLogs.balance}</Text>
              </View>
            )}

            <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.light.text, marginBottom: 12 }}>Transaction History</Text>
            
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 12 }}>
              {selectedWalletForLogs ? (
                transactions.filter(t => t.employee_id === selectedWalletForLogs.employee_id).length > 0 ? (
                  transactions.filter(t => t.employee_id === selectedWalletForLogs.employee_id).map(tx => {
                    const isUsage = tx.type === 'usage';
                    const isRequest = tx.type === 'allocation_request';
                    const isGranted = tx.type === 'allocation_granted';
                    
                    let icon = <IndianRupee size={20} color={Colors.light.icon} />;
                    let color = Colors.light.text;
                    let sign = '';
                    
                    if (isUsage) {
                      icon = <ArrowUpRight size={20} color={Colors.light.error} />;
                      color = Colors.light.error;
                      sign = '-';
                    } else if (isRequest) {
                      icon = <ArrowDownRight size={20} color={Colors.light.primary} />;
                    } else if (isGranted && tx.status === 'completed') {
                      icon = <ArrowDownRight size={20} color="#10B981" />;
                      color = '#10B981';
                      sign = '+';
                    }

                    return (
                      <View key={tx.id} style={styles.txRow}>
                        <View style={[styles.txIcon, isUsage ? { backgroundColor: '#FEE2E2' } : isGranted && tx.status === 'completed' ? { backgroundColor: '#D1FAE5' } : undefined]}>
                          {icon}
                        </View>
                        <View style={{ flex: 1, marginRight: 16 }}>
                          <Text style={styles.txType}>
                            {isUsage ? 'Debit (Usage)' : isRequest ? 'Requested Allocation' : 'Credit (Allocated)'}
                          </Text>
                          {tx.note ? <Text style={styles.txNote}>"{tx.note}"</Text> : null}
                          <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleString()}</Text>
                          {tx.approved_by && tx.status !== 'pending' && (
                            <Text style={{ fontSize: 11, color: Colors.light.primary, marginTop: 4, fontWeight: '600' }}>Processed by: {tx.approved_by}</Text>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.txAmount, { color }]}>{sign}₹{tx.amount}</Text>
                          <View style={[styles.statusBadge, (styles as any)[`status_${tx.status}`] || styles.status_pending]}>
                            <Text style={[styles.statusText, (styles as any)[`text_${tx.status}`] || styles.text_pending]}>{tx.status}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.emptyText}>No transactions found for this employee.</Text>
                )
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, padding: 32 },
  containerMobile: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 15 },
  
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.light.border, marginBottom: 24 },
  tab: { paddingVertical: 12, paddingHorizontal: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: Colors.light.primary },
  tabText: { fontSize: 16, fontWeight: '600', color: Colors.light.icon },
  activeTabText: { color: Colors.light.primary, fontWeight: '700' },

  contentArea: { flex: 1 },

  walletCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border },
  walletIconWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  walletInitials: { fontSize: 18, fontWeight: '700', color: Colors.light.primary },
  walletName: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  walletDept: { fontSize: 14, color: Colors.light.icon, marginTop: 2 },
  walletBalanceLabel: { fontSize: 12, color: Colors.light.icon, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  walletBalanceAmount: { fontSize: 24, fontWeight: '800', color: Colors.light.primary },

  txRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: Colors.light.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border },
  txIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  txType: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  txEmployee: { fontSize: 14, fontWeight: '600', color: Colors.light.primary, marginTop: 2 },
  txNote: { fontSize: 13, color: Colors.light.icon, marginTop: 2, fontStyle: 'italic' },
  txDate: { fontSize: 12, color: Colors.light.icon, marginTop: 4 },
  txAmount: { fontSize: 18, fontWeight: '800', marginBottom: 8 },

  actionBtnSmall: { padding: 8, backgroundColor: '#D1FAE5', borderRadius: 8 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  status_pending: { backgroundColor: '#FEF3C7' }, text_pending: { color: '#D97706' },
  status_approved: { backgroundColor: '#D1FAE5' }, text_approved: { color: '#059669' },
  status_rejected: { backgroundColor: '#FEE2E2' }, text_rejected: { color: '#DC2626' },
  status_completed: { backgroundColor: '#F1F5F9' }, text_completed: { color: '#64748B' },

  emptyText: { color: Colors.light.icon, fontSize: 15, fontStyle: 'italic', textAlign: 'center', marginTop: 40 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 32, width: '100%', ...Platform.select({ web: { boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' } }) },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, padding: 14, fontSize: 14, color: Colors.light.text, marginBottom: 20, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  
  pickerItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerItemActive: { backgroundColor: '#EFF6FF' },
  pickerItemText: { fontSize: 15, color: Colors.light.text },
  pickerItemTextActive: { color: Colors.light.primary, fontWeight: '700' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: Colors.light.icon, fontWeight: '700', fontSize: 15 },
  submitBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
