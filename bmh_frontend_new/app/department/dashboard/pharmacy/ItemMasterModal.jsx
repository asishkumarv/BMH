import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, FlatList } from 'react-native';
import { Colors } from '../../../../constants/Colors';
import { Search, X } from 'lucide-react-native';

export function ItemMasterModal({ visible, onClose, onSelectItem, apiKey, allStock = [] }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 100;

  // Debounce search text
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (visible) {
        setCurrentPage(1); // Reset to page 1 on new search
        fetchStockData(1, searchText);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText, visible]);

  // Fetch when page changes (not triggered by search)
  useEffect(() => {
    if (visible && currentPage > 1) {
      fetchStockData(currentPage, searchText);
    }
  }, [currentPage]);

  const fetchStockData = async (page = 1, search = '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://napi.bharatmedicalhallplus.com/pharmacy/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page, limit: itemsPerPage, search })
      });
      const result = await res.json();

      if (result && result.data) {
        setItems(result.data);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotalItems(result.pagination.totalItems);
        }
      } else {
        setError('Failed to fetch items from server.');
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('Error connecting to the stock server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>List of Values (Item Master)</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </View>

          {/* Search Area */}
          <View style={styles.searchContainer}>
            <View style={styles.searchRow}>
              <Text style={styles.searchLabel}>Search Text</Text>
              <View style={styles.searchInputWrapper}>
                <Search size={16} color="#666" style={{marginLeft: 8}} />
                <TextInput 
                  style={styles.searchInput}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search item name or code..."
                  autoFocus
                />
              </View>
              <TouchableOpacity style={styles.refreshBtn} onPress={fetchStockData}>
                <Text style={styles.refreshBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 0.5 }]}>Sr.</Text>
            <Text style={[styles.th, { flex: 3 }]}>Item Name</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Code</Text>
            <Text style={[styles.th, { flex: 1 }]}>Batch No.</Text>
            <Text style={[styles.th, { flex: 1 }]}>Bal.Qty</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Exp Dt</Text>
            <Text style={[styles.th, { flex: 1 }]}>MRP</Text>
            <Text style={[styles.th, { flex: 1 }]}>Sale Rate</Text>
          </View>

          {/* Table Body */}
          {loading ? (
            <View style={styles.centerMsg}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
              <Text style={{marginTop: 10}}>Loading stock data...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerMsg}>
              <Text style={{color: 'red'}}>{error}</Text>
            </View>
          ) : (
            <FlatList
              style={styles.tableBody}
              data={items}
              keyExtractor={(item, index) => index.toString()}
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={5}
              renderItem={({ item, index }) => (
                <TouchableOpacity 
                  style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}
                  onPress={() => onSelectItem(item)}
                >
                  <Text style={[styles.td, { flex: 0.5 }]}>F{index + 1}</Text>
                  <Text style={[styles.td, { flex: 3 }]}>{item.itemName}</Text>
                  <Text style={[styles.td, { flex: 1.5 }]}>{item.c_item_code}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{item.batchNo}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{item.stockBalQty}</Text>
                  <Text style={[styles.td, { flex: 1.5 }]}>{item.expiryDate}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{item.mrp}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{item.saleRate}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.centerMsg}>
                  <Text>No items found.</Text>
                </View>
              )}
            />
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Total Items: {totalItems}</Text>
            <View style={styles.pagination}>
               <TouchableOpacity 
                  disabled={currentPage === 1} 
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
               >
                 <Text style={styles.pageBtnText}>Prev</Text>
               </TouchableOpacity>
               <Text style={styles.pageText}>Page {currentPage} of {totalPages || 1}</Text>
               <TouchableOpacity 
                  disabled={currentPage >= totalPages || totalPages === 0} 
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  style={[styles.pageBtn, (currentPage >= totalPages || totalPages === 0) && styles.pageBtnDisabled]}
               >
                 <Text style={styles.pageBtnText}>Next</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    width: '90%',
    maxWidth: 1000,
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    backgroundColor: '#1E3A8A', // BMH blue
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  closeButton: {
    padding: 4
  },
  searchContainer: {
    backgroundColor: '#C5E1A5', // Greenish from screenshot
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc'
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  searchLabel: {
    fontWeight: 'bold',
    color: '#000'
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#999',
    height: 36
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {})
  },
  refreshBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#999',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4
  },
  refreshBtnText: {
    fontWeight: 'bold'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#007E33', // Dark green header
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  th: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    paddingHorizontal: 4
  },
  tableBody: {
    flex: 1,
    backgroundColor: '#fff'
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  rowEven: {
    backgroundColor: '#f9f9f9'
  },
  rowOdd: {
    backgroundColor: '#fff'
  },
  td: {
    fontSize: 12,
    paddingHorizontal: 4,
    color: '#333'
  },
  centerMsg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  footer: {
    backgroundColor: '#FF8C00', // Orange footer
    padding: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerText: {
    color: '#000',
    fontWeight: 'bold'
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  pageBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4
  },
  pageBtnDisabled: {
    opacity: 0.5
  },
  pageBtnText: {
    fontWeight: 'bold',
    color: '#333'
  },
  pageText: {
    color: '#000',
    fontWeight: 'bold'
  }
});
