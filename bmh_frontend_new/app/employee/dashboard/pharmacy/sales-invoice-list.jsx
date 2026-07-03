import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../../constants/Colors';
import { Search, Eye } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function SalesInvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredInvoices(invoices);
    } else {
      const lower = search.toLowerCase();
      setFilteredInvoices(invoices.filter(o => 
        o.patientName?.toLowerCase().includes(lower) || 
        o.mobileNo?.includes(lower) || 
        o.refNo?.toString().includes(lower)
      ));
    }
  }, [search, invoices]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/sales-invoice-list');
      if (res.data && res.data.success) {
        setInvoices(res.data.data);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const renderInvoice = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderId}>Ref No: {item.refNo}</Text>
          <Text style={styles.date}>{item.ordDate} {item.ordTime}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Completed</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Customer:</Text>
          <Text style={styles.infoValue}>{item.patientName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{item.mobileNo}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Amount:</Text>
          <Text style={styles.amount}>₹{parseFloat(item.orderTotal).toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.user}>Created by: {item.userId}</Text>
        <TouchableOpacity style={styles.viewBtn}>
          <Eye size={16} color={Colors.light.primary} />
          <Text style={styles.viewBtnText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sales Invoices</Text>
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748b" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by name, phone, or Ref No..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : (
        <FlatList 
          data={filteredInvoices}
          keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
          renderItem={renderInvoice}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading && (
              <View style={styles.center}>
                <Text style={styles.noData}>No sales orders found.</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    borderRadius: 8,
    width: 300,
    height: 40
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    height: '100%'
  },
  list: {
    padding: 20,
    gap: 16
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b'
  },
  date: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  statusText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '600'
  },
  cardBody: {
    gap: 8,
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 14
  },
  infoValue: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '500'
  },
  amount: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12
  },
  user: {
    color: '#94a3b8',
    fontSize: 12
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6
  },
  viewBtnText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  noData: {
    color: '#64748b',
    fontSize: 16
  }
});
