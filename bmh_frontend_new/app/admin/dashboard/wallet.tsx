import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Platform, Alert, ScrollView } from 'react-native';
import { Banknote, CheckCircle2 } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

type Handover = { id: string; from_name: string; to_name: string; from_employee_id: string; to_employee_id: string; amount: string; status: string; created_at: string; };

export default function AdminWalletScreen() {
  const { isDesktop } = useResponsive();

  const [cashInHand, setCashInHand] = useState('0.00');
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    let aId = null;
    if (Platform.OS === 'web') {
      const userStr = localStorage.getItem('adminUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        aId = `ADMIN-${user.id}`;
        setAdminId(aId);
      }
    }
    if (aId) {
      fetchData(aId);
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
        setCashInHand(walletRes.data.data.wallet?.cash_in_hand || '0.00');
      }
      if (handoversRes.data.success) {
        setHandovers(handoversRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching admin wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptHandover = async (id: string, action: 'Accepted' | 'Rejected') => {
    try {
      const res = await axios.post('https://bmh-eitu.onrender.com/wallet/handover/accept', { id, action });
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
          <Text style={styles.subtitle}>Manage cash handed over from departments.</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          
          <View style={styles.cashCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={[styles.iconBox, { backgroundColor: '#10B9811A' }]}>
                <Banknote size={24} color="#10B981" />
              </View>
              <Text style={{ fontSize: 16, color: '#059669', fontWeight: '600', marginLeft: 12 }}>Vault Cash Balance</Text>
            </View>
            <Text style={{ fontSize: 40, fontWeight: '800', color: '#064E3B' }}>₹{cashInHand}</Text>
          </View>

          {incomingHandovers.length > 0 && (
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

          <View style={{ marginTop: 32 }}>
            <Text style={styles.sectionTitle}>Handover History</Text>
            {pastHandovers.length === 0 && <Text style={{color: Colors.light.icon}}>No past handovers.</Text>}
            {pastHandovers.map(h => (
              <View key={h.id} style={styles.historyCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={styles.historyPeer}>From: {h.from_name}</Text>
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
  cashCard: { backgroundColor: '#ECFDF5', padding: 24, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#D1FAE5' },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pendingSection: { marginBottom: 32, backgroundColor: '#FFFBEB', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#FEF3C7' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },
  pendingCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  pendingAmount: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  pendingNote: { fontSize: 14, color: Colors.light.text, marginTop: 4 },
  txDate: { fontSize: 12, color: Colors.light.icon, marginTop: 4 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
  acceptBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  historyCard: { backgroundColor: Colors.light.card, padding: 20, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  historyPeer: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  historyDate: { fontSize: 12, color: Colors.light.icon, marginTop: 4 },
  historyAmount: { fontSize: 16, fontWeight: '700' },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  tagText: { fontSize: 12, color: Colors.light.icon, fontWeight: '600' }
});
