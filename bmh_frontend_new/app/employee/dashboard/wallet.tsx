import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Platform, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Wallet, IndianRupee, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Banknote, RefreshCcw, HandCoins } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

type Transaction = { id: string; type: string; amount: string; note: string; status: string; created_at: string; };
type Handover = { id: string; from_name: string; to_name: string; from_employee_id: string; to_employee_id: string; amount: string; status: string; created_at: string; };
type Peer = { id: string; full_name: string; email: string; role: string; department: string; };
type Booking = { booking_id: string; token_number: number; patient_name: string; date: string; fee: string; payment_mode: string; doctor_name: string; };

export default function EmployeeWalletScreen() {
  const { isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState<'Allowance' | 'Cash'>('Allowance');

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
    if (empId) {
      fetchData(empId);
      fetchPeers(empId);
      fetchBookings(empId);
    }
  }, []);

  const fetchData = async (id: string) => {
    setLoading(true);
    try {
      const [walletRes, handoversRes] = await Promise.all([
        axios.get(`https://bmh-eitu.onrender.com/wallet/${id}`),
        axios.get(`https://bmh-eitu.onrender.com/wallet/handovers/${id}`)
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
      const res = await axios.get(`https://bmh-eitu.onrender.com/employees/peers/${id}`);
      if (res.data.success) setPeers(res.data.data);
    } catch (error) {}
  };

  const fetchBookings = async (id: string) => {
    try {
      const res = await axios.get(`https://bmh-eitu.onrender.com/bookings?booked_by=${id}`);
      if (res.data.success) setBookings(res.data.data);
    } catch (error) {}
  };

  const handleLogUsage = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return Alert.alert('Error', 'Invalid amount');
    if (Number(amount) > Number(balance)) return Alert.alert('Error', 'Insufficient balance');
    if (!employeeId) return;

    setSubmitting(true);
    try {
      const res = await axios.post('https://bmh-eitu.onrender.com/wallet/usage', { employee_id: employeeId, amount: Number(amount), note });
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
      const res = await axios.post('https://bmh-eitu.onrender.com/wallet/request', { employee_id: employeeId, amount: Number(amount), note });
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
      const res = await axios.put(`https://bmh-eitu.onrender.com/wallet/transaction/${txId}`, { status: 'completed' });
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
      const res = await axios.post('https://bmh-eitu.onrender.com/wallet/handover/request', {
        from_employee_id: employeeId,
        to_employee_id: selectedPeerId,
        amount: Number(amount)
      });
      if (res.data.success) {
        Alert.alert('Success', 'Handover requested successfully');
        setHandoverModalVisible(false);
        setAmount(''); setSelectedPeerId('');
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
      const res = await axios.post('https://bmh-eitu.onrender.com/wallet/handover/accept', { id, action });
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

  // Bookings calculations
  const totalCashBooked = bookings.filter(b => b.payment_mode === 'Cash').reduce((acc, b) => acc + Number(b.fee || 0), 0);
  const totalOnlineBooked = bookings.filter(b => b.payment_mode === 'Online').reduce((acc, b) => acc + Number(b.fee || 0), 0);

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
          
          {incomingHandovers.length > 0 && activeTab === 'Cash' && (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionTitle}>Incoming Cash Handovers</Text>
              {incomingHandovers.map(h => (
                <View key={h.id} style={styles.pendingCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingAmount}>₹{h.amount}</Text>
                    <Text style={styles.pendingNote}>From: {h.from_name}</Text>
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

          {activeTab === 'Allowance' ? (
            <>
              <View style={[styles.balanceCard, !isDesktop && { flexDirection: 'column', alignItems: 'center', textAlign: 'center' }]}>
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

              <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text, marginTop: 32, marginBottom: 16 }}>Transaction History</Text>
              {transactions.map(tx => (
                <View key={tx.id} style={styles.txCard}>
                  <View style={[styles.txIconWrapper, { backgroundColor: tx.type === 'usage' ? '#fee2e2' : '#dcfce7' }]}>
                    {tx.type === 'usage' ? <ArrowUpRight size={20} color="#ef4444" /> : <ArrowDownRight size={20} color="#22c55e" />}
                  </View>
                  <View style={styles.txDetails}>
                    <Text style={styles.txType}>
                      {tx.type === 'usage' ? 'Usage Logged' : tx.type === 'allocation_granted' ? 'Allocation Granted' : 'Allocation Requested'}
                    </Text>
                    <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleString()}</Text>
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

              <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text, marginTop: 32, marginBottom: 16 }}>My Booking Collections</Text>
              {bookings.slice(0, 10).map(b => (
                <View key={b.booking_id} style={styles.txCard}>
                  <View style={[styles.txIconWrapper, { backgroundColor: b.payment_mode === 'Cash' ? '#dcfce7' : '#e0f2fe' }]}>
                    {b.payment_mode === 'Cash' ? <Banknote size={20} color="#16a34a" /> : <RefreshCcw size={20} color={Colors.light.primary} />}
                  </View>
                  <View style={styles.txDetails}>
                    <Text style={styles.txType}>Patient: {b.patient_name}</Text>
                    <Text style={styles.txDate}>{new Date(b.date).toLocaleDateString()} - Dr. {b.doctor_name}</Text>
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

              <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text, marginTop: 32, marginBottom: 16 }}>Handover History</Text>
              {handovers.map(h => (
                <View key={h.id} style={styles.txCard}>
                  <View style={styles.txDetails}>
                    <Text style={styles.txType}>
                      {h.from_employee_id == employeeId ? `Handed to ${h.to_name}` : `Received from ${h.from_name}`}
                    </Text>
                    <Text style={styles.txDate}>{new Date(h.created_at).toLocaleString()}</Text>
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
            <View style={styles.peerList}>
              {peers.map(p => (
                <Pressable 
                  key={p.id} 
                  style={[styles.peerItem, selectedPeerId === p.id && styles.peerItemActive]}
                  onPress={() => setSelectedPeerId(p.id)}
                >
                  <Text style={[styles.peerName, selectedPeerId === p.id && styles.peerNameActive]}>{p.full_name}</Text>
                  <Text style={[styles.peerRole, selectedPeerId === p.id && styles.peerNameActive]}>{p.role}</Text>
                </Pressable>
              ))}
              {peers.length === 0 && <Text style={{color: '#64748b'}}>No peers found in your department.</Text>}
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
  btnDisabled: { opacity: 0.7 }
});
