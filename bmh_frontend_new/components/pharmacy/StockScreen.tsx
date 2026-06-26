import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { API_URL } from '../../config';

export default function StockScreen() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [itemCodesInput, setItemCodesInput] = useState('');
  const [inputDateTime, setInputDateTime] = useState('');

  const handleFetch = async () => {
    setLoading(true);
    try {
      const itemCodes = itemCodesInput ? itemCodesInput.split(',').map(c => c.trim()) : [];
      let formattedDate = inputDateTime;
      if (inputDateTime) {
        formattedDate = inputDateTime.replace('T', ' ');
        if (formattedDate.length === 16) formattedDate += ':00';
      }
      const res = await fetch(`${API_URL}/pharmacy/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemCodes, inputDateTime: formattedDate }),
      });
      if (!res.ok) throw new Error('Failed to fetch stock');
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
    handleFetch();
  }, []);

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

  const isExpired = (expiryStr: string) => {
    if (!expiryStr) return false;
    try {
      const expDate = new Date(expiryStr);
      return expDate < new Date();
    } catch (e) {
      return false;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Stock Details</Text>
          <Text style={styles.subtitle}>
            View branch stock balances and expiry information synced from the pharmacy network.
            {lastUpdated && ` Last sync: ${new Date(lastUpdated).toLocaleString()}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={handleFetch} disabled={loading}>
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
              placeholder="Search stock..."
              placeholderTextColor={Colors.light.icon}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          
          <View style={styles.filtersGroup}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Item Codes (comma sep)</Text>
              <TextInput
                style={[styles.inputField, { width: 180 }]}
                placeholder="e.g. 711291, 254229"
                placeholderTextColor={Colors.light.icon}
                value={itemCodesInput}
                onChangeText={setItemCodesInput}
              />
            </View>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Input Date/Time</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="datetime-local"
                  value={inputDateTime}
                  onChange={(e) => setInputDateTime(e.target.value)}
                  style={styles.webDatePicker}
                />
              ) : (
                <TextInput
                  style={styles.inputField}
                  placeholder="YYYY-MM-DD HH:MM:SS"
                  placeholderTextColor={Colors.light.icon}
                  value={inputDateTime}
                  onChangeText={setInputDateTime}
                />
              )}
            </View>
          </View>
        </View>

        {loading && data.length === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={styles.horizontalScroll}>
              <View style={[styles.scrollableTable, { minWidth: 900 }]}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, { flex: 1.2 }]}>Item Code</Text>
                  <Text style={[styles.headerCell, { flex: 3 }]}>Item Name</Text>
                  <Text style={[styles.headerCell, { flex: 1.5 }]}>Batch</Text>
                  <Text style={[styles.headerCell, { flex: 1.5 }]}>Expiry Date</Text>
                  <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>Stock Qty</Text>
                  <Text style={[styles.headerCell, { flex: 1, textAlign: 'right' }]}>MRP</Text>
                  <Text style={[styles.headerCell, { flex: 1, textAlign: 'right' }]}>Sale Rate</Text>
                </View>

                {/* Table Body */}
                {displayedData.length > 0 ? (
                  displayedData.map((item, index) => {
                    const expired = isExpired(item.expiryDate);
                    return (
                      <View key={index} style={styles.tableRow}>
                        <Text style={[styles.cell, { flex: 1.2, fontWeight: '700', color: Colors.light.primary }]}>
                          {item.c_item_code || '-'}
                        </Text>
                        <Text style={[styles.cell, { flex: 3 }]}>{item.itemName || '-'}</Text>
                        <Text style={[styles.cell, { flex: 1.5 }]}>{item.batchNo || '-'}</Text>
                        <Text style={[
                          styles.cell, 
                          { 
                            flex: 1.5, 
                            fontWeight: '600', 
                            color: expired ? Colors.light.error : Colors.light.success 
                          }
                        ]}>
                          {item.expiryDate || '-'}
                        </Text>
                        <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>{item.stockBalQty || '0'}</Text>
                        <Text style={[styles.cell, { flex: 1, textAlign: 'right' }]}>₹{item.mrp || '0.00'}</Text>
                        <Text style={[styles.cell, { flex: 1, textAlign: 'right' }]}>₹{item.saleRate || '0.00'}</Text>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>No stock found</Text>
                  </View>
                )}
              </View>
            </ScrollView>

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
  inputField: {
    height: 40,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: Colors.light.text,
    width: 160,
  },
  webDatePicker: {
    height: 40,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: Colors.light.text,
    fontFamily: 'inherit',
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
  horizontalScroll: {
    width: '100%',
  },
  scrollableTable: {
    flexDirection: 'column',
  },
});
