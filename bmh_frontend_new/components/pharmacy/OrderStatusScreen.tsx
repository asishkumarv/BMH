import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { API_URL } from '../../config';

export default function OrderStatusScreen() {
  const params = useLocalSearchParams<{ order_no?: string }>();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [orderNoInput, setOrderNoInput] = useState(params.order_no || '');

  const handleFetch = async (overrideOrderNo?: string) => {
    setLoading(true);
    const orderToFetch = overrideOrderNo !== undefined ? overrideOrderNo : orderNoInput;
    try {
      const url = orderToFetch ? `${API_URL}/pharmacy/order-status?order_no=${orderToFetch}` : `${API_URL}/pharmacy/order-status`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch order status');
      const json = await res.json();
      setData(json.data || []);
      setLastUpdated(json.lastUpdated);
      setPage(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.order_no) {
      setOrderNoInput(params.order_no);
      handleFetch(params.order_no);
    } else {
      handleFetch();
    }
  }, [params.order_no]);

  const filteredData = data.filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const displayedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Sales Order Status</Text>
          <Text style={styles.subtitle}>
            Track sales order status and invoice details synced from the pharmacy network.
            {lastUpdated && ` Last sync: ${new Date(lastUpdated).toLocaleString()}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={() => handleFetch()} disabled={loading}>
          <RefreshCw size={16} color="#fff" style={styles.syncIcon} />
          <Text style={styles.syncBtnText}>{loading ? 'Syncing...' : 'Manual Sync'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.filterBar}>
          <View style={styles.searchContainer}>
            <Search size={18} color={Colors.light.icon} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search orders..."
              placeholderTextColor={Colors.light.icon}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          
          <View style={styles.filtersGroup}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Order Number</Text>
              <View style={styles.orderNoRow}>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. 12345"
                  placeholderTextColor={Colors.light.icon}
                  value={orderNoInput}
                  onChangeText={setOrderNoInput}
                />
                <TouchableOpacity style={styles.goBtn} onPress={() => handleFetch()}>
                  <Text style={styles.goBtnText}>Go</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {loading && data.length === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : (
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, { flex: 2 }]}>Order ID</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Customer Code</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Customer Type</Text>
              <Text style={[styles.headerCell, { flex: 2, textAlign: 'center' }]}>Invoice Status</Text>
              <Text style={[styles.headerCell, { flex: 2, textAlign: 'right' }]}>Total Value</Text>
            </View>

            {/* Table Body */}
            {displayedData.length > 0 ? (
              displayedData.map((item, index) => {
                const invoice = item.invoices && item.invoices.length > 0 ? item.invoices[0] : null;
                const status = invoice ? invoice.docStatus : 'Pending';
                const isCreated = status === 'Invoice Created';
                return (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.cell, { flex: 2, fontWeight: '700', color: Colors.light.primary }]}>
                      {item.orderId || '-'}
                    </Text>
                    <Text style={[styles.cell, { flex: 2 }]}>{item.custCode || '-'}</Text>
                    <Text style={[styles.cell, { flex: 2 }]}>{item.customerType || '-'}</Text>
                    <View style={[styles.cell, { flex: 2, alignItems: 'center' }]}>
                      <View style={[
                        styles.statusBadge, 
                        { backgroundColor: isCreated ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)' }
                      ]}>
                        <Text style={[
                          styles.statusBadgeText, 
                          { color: isCreated ? Colors.light.success : '#D97706' }
                        ]}>
                          {status}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.cell, { flex: 2, textAlign: 'right', fontWeight: '700' }]}>
                      ₹{invoice ? invoice.docTotal : '0.00'}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No orders found</Text>
              </View>
            )}

            {/* Pagination */}
            {filteredData.length > 0 && (
              <View style={styles.paginationRow}>
                <Text style={styles.paginationText}>
                  Showing {page * rowsPerPage + 1} - {Math.min((page + 1) * rowsPerPage, filteredData.length)} of {filteredData.length}
                </Text>
                <View style={styles.paginationBtns}>
                  <TouchableOpacity 
                    style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]} 
                    disabled={page === 0}
                    onPress={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft size={18} color={page === 0 ? Colors.light.tabIconDefault : Colors.light.text} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.pageBtn, page >= totalPages - 1 && styles.pageBtnDisabled]} 
                    disabled={page >= totalPages - 1}
                    onPress={() => setPage(p => p + 1)}
                  >
                    <ChevronRight size={18} color={page >= totalPages - 1 ? Colors.light.tabIconDefault : Colors.light.text} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  contentContainer: {
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginTop: 6,
  },
  syncBtn: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  syncIcon: {
    marginRight: 8,
  },
  syncBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  filterBar: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    width: 260,
    maxWidth: '100%',
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 14,
    padding: 0,
  },
  filtersGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
  },
  fieldContainer: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textMuted,
    paddingLeft: 4,
  },
  orderNoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputField: {
    height: 40,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: Colors.light.text,
    width: 150,
  },
  goBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  loaderContainer: {
    padding: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableContainer: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerCell: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textMuted,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    alignItems: 'center',
  },
  cell: {
    fontSize: 14,
    color: Colors.light.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyRow: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.light.textMuted,
    fontSize: 14,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  paginationText: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  paginationBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
});
