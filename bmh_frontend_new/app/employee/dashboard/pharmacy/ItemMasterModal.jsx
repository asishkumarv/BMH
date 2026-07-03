import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Colors } from '../../../../constants/Colors';
import { Search, X } from 'lucide-react-native';

export function ItemMasterModal({ visible, onClose, onSelectItem, apiKey }) {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && apiKey) {
      fetchStockData();
    }
  }, [visible, apiKey]);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredItems(items);
    } else {
      const lower = searchText.toLowerCase();
      setFilteredItems(
        items.filter((item) => item.itemName?.toLowerCase().includes(lower) || item.c_item_code?.toLowerCase().includes(lower))
      );
    }
  }, [searchText, items]);

  const fetchStockData = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        c2Code: "P00000",
        storeId: "001",
        prodCode: "02",
        inputDateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
        itemCodes: [],
        apiKey: apiKey
      };

      const res = await fetch('http://117.211.64.158:21000/ws_c2_services_get_stock_data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result && result.code === "200" && result.data) {
        setItems(result.data);
        setFilteredItems(result.data);
      } else {
        setError('Failed to fetch items or invalid API key.');
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
            <ScrollView style={styles.tableBody}>
              {filteredItems.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
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
              ))}
              {filteredItems.length === 0 && (
                <View style={styles.centerMsg}>
                  <Text>No items found.</Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Total Items: {filteredItems.length}</Text>
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
    alignItems: 'center'
  },
  footerText: {
    color: '#000',
    fontWeight: 'bold'
  }
});
