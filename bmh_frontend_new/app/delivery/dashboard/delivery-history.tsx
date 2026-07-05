import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../constants/Colors';
import { Calendar, Package, MapPin, CheckCircle, Clock } from 'lucide-react-native';

export default function DeliveryHistoryScreen() {
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState('All'); // All, manual_order, online_order, sales_order, purchase_order
  
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD
  
  useEffect(() => {
    const init = async () => {
      let storedUser = null;
      if (Platform.OS === 'web') {
        storedUser = JSON.parse(localStorage.getItem('employeeUser') || 'null');
      } else {
        const u = await AsyncStorage.getItem('employeeUser');
        storedUser = u ? JSON.parse(u) : null;
      }
      setUser(storedUser);
      if (storedUser) fetchHistory(storedUser.id);
    };
    init();
  }, []);

  const fetchHistory = async (userId: string | number) => {
    try {
      setLoading(true);
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/employees/${userId}/assigned-orders`);
      if (res.data && res.data.success) {
        // Only keep delivered/completed
        const completed = res.data.data.filter((o: any) => o.status?.toUpperCase() === 'DELIVERED' || o.status?.toUpperCase() === 'COMPLETED');
        setHistory(completed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    if (filterType !== 'All' && item.type !== filterType) return false;
    if (dateFilter) {
      const itemDate = new Date(item.created_at).toISOString().split('T')[0];
      if (itemDate !== dateFilter) return false;
    }
    return true;
  });

  const renderItem = ({ item }: { item: any }) => {
    let title = 'Order';
    if (item.type === 'manual_order') title = 'Manual Order';
    if (item.type === 'online_order') title = 'Online Order';
    if (item.type === 'sales_order' || item.type === 'sales_invoice') title = 'Sales Order';
    if (item.type === 'purchase_order') title = 'Purchase Order';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Package size={18} color={Colors.light.primary} />
            <Text style={styles.cardTitle}>{title} #{item.id}</Text>
          </View>
          <Text style={[styles.statusText, {color: '#10b981'}]}>{item.status}</Text>
        </View>
        <Text style={styles.detailText}><MapPin size={14} color="#64748B"/> {item.address || 'No Address'}</Text>
        <Text style={styles.detailText}><Clock size={14} color="#64748B"/> {new Date(item.created_at).toLocaleString()}</Text>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Delivery History</Text>
      
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}}>
          {['All', 'manual_order', 'online_order', 'sales_order', 'purchase_order'].map(t => (
            <TouchableOpacity 
              key={t}
              style={[styles.filterBtn, filterType === t && styles.filterBtnActive]}
              onPress={() => setFilterType(t)}
            >
              <Text style={[styles.filterBtnText, filterType === t && styles.filterBtnTextActive]}>
                {t.replace('_', ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 5, borderRadius: 8}}>
          <Calendar size={18} color="#64748B" style={{marginHorizontal: 8}} />
          <input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ border: 'none', outline: 'none', padding: 8, fontSize: 14 }}
          />
          {dateFilter ? (
             <TouchableOpacity onPress={() => setDateFilter('')} style={{padding: 8}}>
               <Text style={{color: 'red'}}>Clear</Text>
             </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredHistory}
        keyExtractor={(item, index) => item.id + '-' + index}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20, color: '#64748B'}}>No delivery history found.</Text>}
      />
    </View>
  );
}

// @ts-ignore
import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: 'bold', padding: 15, paddingBottom: 5, color: '#1e293b' },
  filtersContainer: { paddingHorizontal: 15, paddingBottom: 10 },
  filterBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0', marginRight: 10 },
  filterBtnActive: { backgroundColor: Colors.light.primary },
  filterBtnText: { color: '#475569', fontWeight: '600', fontSize: 12 },
  filterBtnTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#334155' },
  statusText: { fontSize: 14, fontWeight: 'bold' },
  detailText: { fontSize: 14, color: '#64748B', marginBottom: 5, marginLeft: 2 }
});
