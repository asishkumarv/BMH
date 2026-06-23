import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Platform, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Wallet, IndianRupee, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2 } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

type Transaction = {
  id: string;
  type: string;
  amount: string;
  note: string;
  status: string;
  created_at: string;
};

export default function EmployeeWalletScreen() {
  const { isDesktop } = useResponsive();
  const [balance, setBalance] = useState('0.00');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  // Modals
  const [usageModalVisible, setUsageModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let empId = null;
    if (Platform.OS === 'web') {
      const userStr = localStorage.getItem('employeeUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        empId = user.id;
        setEmployeeId(empId);
      }
    }
    if (empId) fetchData(empId);
  }, []);

  const fetchData = async (id: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`https://bmh-eitu.onrender.com/wallet/${id}`);
      if (res.data.success) {
        setBalance(res.data.data.wallet?.balance || '0.00');
        setTransactions(res.data.data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogUsage = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return Alert.alert('Error', 'Invalid amount');
    if (Number(amount) > Number(balance)) return Alert.alert('Error', 'Insufficient balance');
    if (!employeeId) return;

    setSubmitting(true);
    try {
      const res = await axios.post('https://bmh-eitu.onrender.com/wallet/usage', {
        employee_id: employeeId,
        amount: Number(amount),
        note
      });
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
      const res = await axios.post('https://bmh-eitu.onrender.com/wallet/request', {
        employee_id: employeeId,
        amount: Number(amount),
        note
      });
      if (res.data.success) {
        Alert.alert('Success', 'Allocation request sent successfully');
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
      const res = await axios.put(`https://bmh-eitu.onrender.com/wallet/transaction/${txId}`, {
        status: 'completed'
      });
      if (res.data.success) {
        Alert.alert('Success', 'Allocation accepted and added to wallet');
        fetchData(employeeId);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to accept allocation');
    }
  };

  const pendingAllocations = transactions.filter(t => t.type === 'allocation_granted' && t.status === 'pending');

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
        <View>
          <Text style={styles.title}>My Wallet</Text>
          <Text style={styles.subtitle}>Track your allowances and usage.</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable style={styles.secondaryBtn} onPress={() => setRequestModalVisible(true)}>
            <ArrowDownRight size={18} color={Colors.light.primary} />
            {isDesktop && <Text style={styles.secondaryBtnText}>Request Funds</Text>}
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={() => setUsageModalVisible(true)}>
            <ArrowUpRight size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Log Usage</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.balanceCard}>
            <View style={styles.balanceIconWrapper}>
              <Wallet size={32} color={Colors.light.primary} />
            </View>
            <View>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceAmount}>₹{balance}</Text>
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
                    <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleString()}</Text>
                  </View>
                  <Pressable style={styles.acceptBtn} onPress={() => handleAcceptAllocation(tx.id)}>
                    <CheckCircle2 size={16} color="#FFF" />
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Transaction History</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>No transactions found.</Text>
          ) : (
            <View style={styles.txList}>
              {transactions.map(tx => {
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
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txType}>
                        {isUsage ? 'Usage Logged' : isRequest ? 'Requested Allocation' : 'Allocation Received'}
                      </Text>
                      {tx.note ? <Text style={styles.txNote} numberOfLines={1}>{tx.note}</Text> : null}
                      <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.txAmount, { color }]}>{sign}₹{tx.amount}</Text>
                      <View style={[styles.statusBadge, (styles as any)[`status_${tx.status}`] || styles.status_pending]}>
                        <Text style={[styles.statusText, (styles as any)[`text_${tx.status}`] || styles.text_pending]}>{tx.status}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Log Usage Modal */}
      <Modal visible={usageModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 400 }]}>
            <Text style={styles.modalTitle}>Log Usage</Text>
            
            <Text style={styles.label}>Amount Spent (₹)</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="e.g. 500" />
            
            <Text style={styles.label}>Note / Reason</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={note} onChangeText={setNote} multiline placeholder="e.g. Travel to client site" />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => { setUsageModalVisible(false); setAmount(''); setNote(''); }}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
              <Pressable style={styles.submitBtn} onPress={handleLogUsage} disabled={submitting}><Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Log Usage'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Request Funds Modal */}
      <Modal visible={requestModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 400 }]}>
            <Text style={styles.modalTitle}>Request Funds</Text>
            
            <Text style={styles.label}>Amount Needed (₹)</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="e.g. 2000" />
            
            <Text style={styles.label}>Reason</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={note} onChangeText={setNote} multiline placeholder="Why do you need this amount?" />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => { setRequestModalVisible(false); setAmount(''); setNote(''); }}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
              <Pressable style={styles.submitBtn} onPress={handleRequestAllocation} disabled={submitting}><Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Send Request'}</Text></Pressable>
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
  headerButtons: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 15 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  secondaryBtnText: { color: Colors.light.primary, fontWeight: '700', marginLeft: 8, fontSize: 15 },

  balanceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.card, padding: 32, borderRadius: 24, borderWidth: 1, borderColor: Colors.light.border, marginBottom: 32 },
  balanceIconWrapper: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 24 },
  balanceLabel: { fontSize: 16, color: Colors.light.icon, fontWeight: '600', marginBottom: 4 },
  balanceAmount: { fontSize: 40, fontWeight: '800', color: Colors.light.text },

  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },
  
  pendingSection: { marginBottom: 32 },
  pendingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 12 },
  pendingAmount: { fontSize: 24, fontWeight: '800', color: Colors.light.primary, marginBottom: 4 },
  pendingNote: { fontSize: 14, color: Colors.light.text, fontStyle: 'italic', marginBottom: 4 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  acceptBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8 },

  txList: { gap: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: Colors.light.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border },
  txIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  txType: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  txNote: { fontSize: 14, color: Colors.light.icon, marginTop: 2 },
  txDate: { fontSize: 12, color: Colors.light.icon, marginTop: 4 },
  txAmount: { fontSize: 18, fontWeight: '800', marginBottom: 8 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  status_pending: { backgroundColor: '#FEF3C7' }, text_pending: { color: '#D97706' },
  status_approved: { backgroundColor: '#D1FAE5' }, text_approved: { color: '#059669' },
  status_rejected: { backgroundColor: '#FEE2E2' }, text_rejected: { color: '#DC2626' },
  status_completed: { backgroundColor: '#F1F5F9' }, text_completed: { color: '#64748B' },

  emptyText: { color: Colors.light.icon, fontSize: 15, fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 32, width: '100%', ...Platform.select({ web: { boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' } }) },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, padding: 14, fontSize: 14, color: Colors.light.text, marginBottom: 20, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: Colors.light.icon, fontWeight: '700', fontSize: 15 },
  submitBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
