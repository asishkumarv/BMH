import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Package, MapPin, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MyOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const patientData = await AsyncStorage.getItem('patientUser');
        if (patientData) {
          const parsed = JSON.parse(patientData);
          setPatient(parsed);
          fetchOrders(parsed.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchPatientData();
  }, []);

  const fetchOrders = async (patientId: string) => {
    try {
      const res = await fetch(`https://napi.bharatmedicalhallplus.com/online-orders/patient/${patientId}`);
      const data = await res.json();
      if (data && data.success) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderOrder = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.orderIdContainer}>
          <Package size={20} color="#0F172A" style={{ marginRight: 8 }} />
          <Text style={styles.orderId}>Order #{item.id}</Text>
        </View>
        <View style={[styles.statusBadge, item.status === 'DISBURSED' ? styles.statusDisbursed : styles.statusPending]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Clock size={16} color="#64748B" style={styles.icon} />
          <Text style={styles.infoText}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        <View style={styles.infoRow}>
          <MapPin size={16} color="#64748B" style={styles.icon} />
          <Text style={styles.infoText} numberOfLines={1}>{item.manual_address || 'Location provided via map'}</Text>
        </View>
        
        <View style={styles.itemsList}>
          {item.items && item.items.map((prod: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>{prod.qty} x {prod.itemName}</Text>
              <Text style={styles.itemPrice}>₹{(prod.saleRate * prod.qty).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalAmount}>₹{parseFloat(item.total_amount).toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Package size={64} color="#CBD5E1" style={{marginBottom: 16}} />
          <Text style={styles.noData}>You haven't placed any orders yet.</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/dashboard/medicine-store' as any)}>
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#0F172A',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  listContainer: { padding: 16, maxWidth: 800, alignSelf: 'center', width: '100%' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  noData: { color: '#64748B', fontSize: 18, marginBottom: 20 },
  shopBtn: { backgroundColor: '#0F172A', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  shopBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    marginBottom: 16, 
    elevation: 2, 
    shadowColor: '#0F172A', 
    shadowOpacity: 0.05, 
    shadowRadius: 10, 
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    overflow: 'hidden'
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  orderIdContainer: { flexDirection: 'row', alignItems: 'center' },
  orderId: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusDisbursed: { backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  
  cardBody: { padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { marginRight: 8 },
  infoText: { fontSize: 14, color: '#475569', flex: 1 },
  
  itemsList: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemName: { fontSize: 14, color: '#334155', flex: 1, paddingRight: 10 },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1, 
    borderTopColor: '#E2E8F0' 
  },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  totalAmount: { fontSize: 18, fontWeight: '900', color: '#10B981' },
});
