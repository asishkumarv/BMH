import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Wallet, IndianRupee, ArrowUpRight, ArrowDownRight, Check, X, Send } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

type EmployeeWallet = { id: string; employee_id: string; balance: string; full_name: string; department: string; email: string; };
type Transaction = { id: string; employee_id: string; full_name: string; department: string; type: string; amount: string; note: string; status: string; created_at: string; };

export default function AdminAllowancesScreen() {
  const { isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState<'wallets' | 'transactions'>('wallets');
  
  const [wallets, setWallets] = useState<EmployeeWallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Allocation Modal
  const [allocationModalVisible, setAllocationModalVisible] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocNote, setAllocNote] = useState('');
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // The getAllWallets endpoint returns both wallets and transactions
      const res = await axios.get('https://bmh-eitu.onrender.com/wallet');
      if (res.data.success) {
        setWallets(res.data.data.wallets);
        setTransactions(res.data.data.transactions);
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
    
    setAllocating(true);
    try {
      const res = await axios.post('https://bmh-eitu.onrender.com/wallet/allocate', {
        employee_id: selectedEmployeeId,
        amount: Number(allocAmount),
        note: allocNote
      });
      if (res.data.success) {
        Alert.alert('Success', 'Funds allocated successfully. The employee must accept it.');
        setAllocationModalVisible(false);
        setAllocAmount(''); setAllocNote(''); setSelectedEmployeeId('');
        fetchData();
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to allocate funds');
    } finally {
      setAllocating(false);
    }
  };

  const handleReviewRequest = async (txId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await axios.put(`https://bmh-eitu.onrender.com/wallet/transaction/${txId}`, { status });
      if (res.data.success) {
        Alert.alert('Success', `Request ${status}`);
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process request');
    }
  };

  const renderWalletItem = ({ item }: { item: EmployeeWallet }) => (
    <View style={styles.walletCard}>
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
    </View>
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
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.txAmount, { color }]}>{sign}₹{item.amount}</Text>
          
          {isRequest && item.status === 'pending' ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable style={styles.actionBtnSmall} onPress={() => handleReviewRequest(item.id, 'approved')}>
                <Check size={16} color="#10B981" />
              </Pressable>
              <Pressable style={[styles.actionBtnSmall, { backgroundColor: '#FEE2E2' }]} onPress={() => handleReviewRequest(item.id, 'rejected')}>
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
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={item => item.id}
            renderItem={renderTransactionItem}
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No transactions found.</Text>}
          />
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
              {wallets.map(w => (
                <Pressable 
                  key={w.employee_id} 
                  style={[styles.pickerItem, selectedEmployeeId === w.employee_id && styles.pickerItemActive]}
                  onPress={() => setSelectedEmployeeId(w.employee_id)}
                >
                  <Text style={[styles.pickerItemText, selectedEmployeeId === w.employee_id && styles.pickerItemTextActive]}>
                    {w.full_name} ({w.department})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput style={styles.input} value={allocAmount} onChangeText={setAllocAmount} keyboardType="numeric" placeholder="e.g. 5000" />
            
            <Text style={styles.label}>Note (Optional)</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={allocNote} onChangeText={setAllocNote} multiline placeholder="e.g. Monthly travel allowance" />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => { setAllocationModalVisible(false); setAllocAmount(''); setAllocNote(''); setSelectedEmployeeId(''); }}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
              <Pressable style={styles.submitBtn} onPress={handleAllocate} disabled={allocating}><Text style={styles.submitBtnText}>{allocating ? 'Processing...' : 'Allocate'}</Text></Pressable>
            </View>
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
