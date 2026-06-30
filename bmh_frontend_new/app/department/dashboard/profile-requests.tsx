import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { CheckCircle2, XCircle, User, Clock } from 'lucide-react-native';

export default function SubAdminProfileRequestsScreen() {
  const { isDesktop } = useResponsive();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        let deptName = '';
        let userStr = null;
        if (Platform.OS === 'web') {
          userStr = localStorage.getItem('subAdminUser');
        } else {
          userStr = await AsyncStorage.getItem('subAdminUser');
        }
        if (userStr) {
            const parsed = JSON.parse(userStr);
            const deptRes = await axios.get('https://napi.bharatmedicalhallplus.com/department');
            if (deptRes.data.success) {
              const dept = deptRes.data.data.find((d: any) => String(d.id) === String(parsed.department_id));
              if (dept) deptName = dept.name;
            }
        }

        const url = deptName ? `https://napi.bharatmedicalhallplus.com/profile/pending-requests?department_name=${deptName}` : 'https://napi.bharatmedicalhallplus.com/profile/pending-requests';
        const res = await axios.get(url);
        if (res.data.success) {
          setRequests(res.data.data);
        }
      } catch (error) {
        console.error('Error fetching requests', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleReview = async (id: number, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/profile/review-request/${id}`, { status });
      if (res.data.success) {
        Alert.alert('Success', `Request ${status} successfully`);
        setRequests(requests.filter(r => r.id !== id));
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to review request');
    } finally {
      setProcessingId(null);
    }
  };

  const renderRequestItem = ({ item }: { item: any }) => {
    let pd = item.requested_data;
    if (typeof pd === 'string') {
      try { pd = JSON.parse(pd); } catch (e) {}
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.avatar}>
              <User size={20} color="#1E40AF" />
            </View>
            <View>
              <Text style={styles.userName}>{item.user_name || `User ID: ${item.user_id}`}</Text>
              <Text style={styles.userEmail}>{item.user_email}</Text>
              <Text style={styles.userType}>{item.user_type === 'sub_admin' ? 'Sub Admin' : 'Employee'} - {item.department_name}</Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Clock size={14} color="#D97706" />
            <Text style={styles.statusText}>Pending Review</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <Text style={styles.sectionTitle}>Requested Updates:</Text>
          <View style={styles.updatesGrid}>
            {Object.keys(pd).map((key) => {
              if (pd[key] !== undefined && pd[key] !== '') {
                const prevValue = item.current_data ? item.current_data[key] : 'N/A';
                return (
                  <View key={key} style={styles.updateItem}>
                    <Text style={styles.updateLabel}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                    <View style={styles.valueRow}>
                      <View style={styles.valueCol}>
                        <Text style={styles.valueSub}>Current:</Text>
                        <Text style={styles.prevValue} numberOfLines={2}>{prevValue || 'N/A'}</Text>
                      </View>
                      <View style={styles.valueCol}>
                        <Text style={styles.valueSub}>Requested:</Text>
                        <Text style={styles.updateValue} numberOfLines={2}>{pd[key]}</Text>
                      </View>
                    </View>
                  </View>
                );
              }
              return null;
            })}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Pressable 
            style={[styles.actionBtn, styles.rejectBtn, processingId === item.id && { opacity: 0.5 }]} 
            onPress={() => handleReview(item.id, 'rejected')}
            disabled={processingId === item.id}
          >
            <XCircle size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.rejectText}>Reject</Text>
          </Pressable>
          <Pressable 
            style={[styles.actionBtn, styles.approveBtn, processingId === item.id && { opacity: 0.5 }]} 
            onPress={() => handleReview(item.id, 'approved')}
            disabled={processingId === item.id}
          >
            <CheckCircle2 size={18} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.approveText}>Approve</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
      <View style={styles.header}>
        <Text style={styles.title}>Employee Profile Requests</Text>
        <Text style={styles.subtitle}>Review and approve profile changes requested by your department staff.</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={48} color={Colors.light.icon} />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptyDesc}>No pending profile update requests.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, padding: 32 },
  containerMobile: { padding: 16 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  
  listContent: { gap: 24, paddingBottom: 40 },
  card: { backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.light.border, backgroundColor: '#F8FAFC' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  userName: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  userType: { fontSize: 13, color: Colors.light.icon, marginTop: 4, textTransform: 'capitalize', fontWeight: '500' },
  userEmail: { fontSize: 13, color: Colors.light.icon, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  statusText: { color: '#D97706', fontSize: 12, fontWeight: '700', marginLeft: 6 },
  
  cardBody: { padding: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.icon, marginBottom: 16, textTransform: 'uppercase' },
  updatesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  updateItem: { width: '47%', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border },
  updateLabel: { fontSize: 12, fontWeight: '800', color: Colors.light.primary, marginBottom: 12 },
  valueRow: { flexDirection: 'row', gap: 12 },
  valueCol: { flex: 1 },
  valueSub: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  prevValue: { fontSize: 14, fontWeight: '500', color: '#64748b', textDecorationLine: 'line-through' },
  updateValue: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: Colors.light.border, gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  rejectBtn: { backgroundColor: '#FFF', borderColor: '#EF4444' },
  rejectText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
  approveBtn: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  approveText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 60, backgroundColor: Colors.light.card, borderRadius: 24, borderWidth: 1, borderColor: Colors.light.border },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginTop: 16 },
  emptyDesc: { fontSize: 15, color: Colors.light.icon, marginTop: 8 },
});
