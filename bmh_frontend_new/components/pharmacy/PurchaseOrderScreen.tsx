import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Modal, FlatList, useWindowDimensions } from 'react-native';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Eye, Edit, Trash2, CheckCircle, X, ShoppingBag, Clock } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { API_URL } from '../../config';
import axios from 'axios';

export default function PurchaseOrderScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Search & Filters State
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeCreatorTab, setActiveCreatorTab] = useState('All');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [itemsModalVisible, setItemsModalVisible] = useState(false);
  
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusOrderTarget, setStatusOrderTarget] = useState<any>(null);
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<any>(null);

  // Fetch from the backend database (has assignment, modified details, status updates)
  const fetchPurchaseOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/all');
      if (res.data && res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching POs:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Sync endpoint from Ecogreen (updates local database)
  const handleEcogreenSync = async () => {
    setSyncing(true);
    try {
      // Sync defaults to past 1 day if dates are empty
      const today = new Date().toISOString().split('T')[0];
      const start = fromDate || today;
      const end = toDate || today;

      const res = await fetch(`${API_URL}/pharmacy/purchase-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromDate: start, toDate: end }),
      });
      
      if (!res.ok) throw new Error('Failed to sync from Ecogreen');
      alert('Ecogreen Sync completed successfully!');
      
      // Reload from local DB
      await fetchPurchaseOrders(true);
    } catch (err: any) {
      alert(`Sync failed: ${err.message || err}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
    const interval = setInterval(() => {
      fetchPurchaseOrders(true);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Status updates in the local database
  const handleUpdateStatusSubmit = async (status: string) => {
    if (!statusOrderTarget) return;
    try {
      const res = await axios.post(`https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/status/${statusOrderTarget.id}`, { status });
      if (res.data.success) {
        alert('Order status updated successfully!');
        setStatusModalVisible(false);
        setStatusOrderTarget(null);
        fetchPurchaseOrders(true);
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteOrderTarget) return;
    try {
      const res = await axios.delete(`https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/${deleteOrderTarget.id}`);
      if (res.data.success) {
        alert('Order deleted successfully!');
        setDeleteModalVisible(false);
        setDeleteOrderTarget(null);
        fetchPurchaseOrders();
      }
    } catch (err) {
      alert('Failed to delete order');
    }
  };

  // Extract unique creator names dynamically
  const uniqueCreators = ['All', ...Array.from(new Set(data.map(item => item.createuser || item.modified_by_name || 'SYSTEM').filter(Boolean)))];

  // Filtering data
  const filteredData = data.filter(item => {
    const orderNo = `${item.prefix || ''}${item.year || ''}${item.srno || ''}`.toLowerCase();
    const custName = (item.custname || '').toLowerCase();
    const refName = (item.refname || '').toLowerCase();
    const creator = (item.createuser || item.modified_by_name || 'SYSTEM').toLowerCase();
    const query = search.toLowerCase();

    const matchesSearch = orderNo.includes(query) || custName.includes(query) || refName.includes(query) || creator.includes(query);

    // Creator Tab filter
    let matchesCreatorTab = true;
    if (activeCreatorTab !== 'All') {
      matchesCreatorTab = creator === activeCreatorTab.toLowerCase();
    }

    // Date range filter
    let matchesDate = true;
    if (fromDate) {
      const orderDate = new Date(item.created_at || item.createdatetime).toISOString().split('T')[0];
      matchesDate = orderDate >= fromDate;
    }
    if (toDate && matchesDate) {
      const orderDate = new Date(item.created_at || item.createdatetime).toISOString().split('T')[0];
      matchesDate = orderDate <= toDate;
    }

    return matchesSearch && matchesCreatorTab && matchesDate;
  });

  // Sort: Latest on top
  const sortedData = [...filteredData].sort((a, b) => {
    const dA = new Date(a.created_at || a.createdatetime || 0).getTime();
    const dB = new Date(b.created_at || b.createdatetime || 0).getTime();
    return dB - dA;
  });

  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
  const displayedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Panel */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Purchase Orders Panel</Text>
          <Text style={styles.subtitle}>
            Manage wholesaler purchase orders, track delivery assignments and sync real-time Ecogreen records.
          </Text>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={handleEcogreenSync} disabled={syncing}>
          <RefreshCw size={16} color="#fff" style={[styles.syncIcon, syncing && styles.rotatingIcon]} />
          <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync from Ecogreen'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {/* Filters Top Bar */}
        <View style={styles.filterBar}>
          <View style={styles.searchContainer}>
            <Search size={18} color={Colors.light.icon} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by code, wholesaler..."
              placeholderTextColor={Colors.light.icon}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          
          <View style={styles.filtersGroup}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>From Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={webDatePickerStyle}
                />
              ) : (
                <TextInput
                  style={styles.inputField}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.light.icon}
                  value={fromDate}
                  onChangeText={setFromDate}
                />
              )}
            </View>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>To Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={webDatePickerStyle}
                />
              ) : (
                <TextInput
                  style={styles.inputField}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.light.icon}
                  value={toDate}
                  onChangeText={setToDate}
                />
              )}
            </View>

            {(fromDate || toDate) && (
              <TouchableOpacity onPress={() => { setFromDate(''); setToDate(''); }} style={styles.clearDateBtn}>
                <Text style={styles.clearDateText}>Clear Dates</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Dynamic Creator Filter Tabs */}
        <View style={styles.creatorTabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
            {uniqueCreators.map((creator) => (
              <TouchableOpacity
                key={creator}
                onPress={() => {
                  setActiveCreatorTab(creator);
                  setPage(0);
                }}
                style={[
                  styles.creatorTab,
                  activeCreatorTab === creator && styles.creatorTabActive
                ]}
              >
                <Text style={[
                  styles.creatorTabText,
                  activeCreatorTab === creator && styles.creatorTabTextActive
                ]}>
                  {creator === 'All' ? 'All Creators' : creator}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalScroll}>
              <View style={[styles.scrollableTable, { minWidth: 1200 }]}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, { flex: 0.8 }]}>Status</Text>
                  <Text style={[styles.headerCell, { flex: 1.2 }]}>PO Number</Text>
                  <Text style={[styles.headerCell, { flex: 2.2 }]}>Wholesaler / Customer</Text>
                  <Text style={[styles.headerCell, { flex: 1.8 }]}>Reference</Text>
                  <Text style={[styles.headerCell, { flex: 1 }]}>Del. Mode</Text>
                  <Text style={[styles.headerCell, { flex: 1, textAlign: 'right' }]}>Total (₹)</Text>
                  <Text style={[styles.headerCell, { flex: 1.5 }]}>Created By</Text>
                  <Text style={[styles.headerCell, { flex: 1.2 }]}>Approved</Text>
                  <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>Actions</Text>
                </View>

                {/* Table Body */}
                {displayedData.length > 0 ? (
                  displayedData.map((item, index) => {
                    let itemsArr = [];
                    try {
                      itemsArr = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
                    } catch (e) {}

                    const itemsCount = Array.isArray(itemsArr) ? itemsArr.length : 0;
                    const dateFormatted = item.created_at || item.createdatetime
                      ? new Date(item.created_at || item.createdatetime).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })
                      : '-';

                    let statusColor = '#ef4444'; 
                    if (item.status === 'Pending') statusColor = '#3b82f6';
                    else if (item.status === 'Assigned') statusColor = '#f59e0b';
                    else if (item.status === 'Delivered' || item.status === 'Completed') statusColor = '#10b981';

                    return (
                      <View key={index} style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc' }]}>
                        {/* Status Badge */}
                        <View style={[styles.cellWrapper, { flex: 0.8 }]}>
                          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                            <Text style={styles.statusBadgeText}>{item.status || 'Pending'}</Text>
                          </View>
                        </View>

                        {/* PO Identifier */}
                        <View style={[styles.cellWrapper, { flex: 1.2 }]}>
                          <Text style={styles.cellBold}>{item.prefix || ''}{item.year || ''}{item.srno || ''}</Text>
                          <Text style={styles.cellSub}>{item.br_code || '001'}</Text>
                        </View>

                        {/* Wholesaler Details */}
                        <View style={[styles.cellWrapper, { flex: 2.2 }]}>
                          <Text style={styles.cellBold} numberOfLines={1}>{item.custname || '-'}</Text>
                          {item.custcode && <Text style={styles.cellSub}>Code: {item.custcode}</Text>}
                        </View>

                        {/* Reference details */}
                        <View style={[styles.cellWrapper, { flex: 1.8 }]}>
                          <Text style={styles.cellText} numberOfLines={1}>{item.refname || '-'}</Text>
                          {item.refcode && <Text style={styles.cellSub}>Ref Code: {item.refcode}</Text>}
                        </View>

                        {/* Delivery Mode */}
                        <Text style={[styles.cellText, { flex: 1 }]}>{item.delivery_type || 'Local'}</Text>

                        {/* Net Amount */}
                        <Text style={[styles.cellBold, { flex: 1, textAlign: 'right', color: Colors.light.success }]}>
                          ₹{item.total || '0.00'}
                        </Text>

                        {/* Creator & Timestamp */}
                        <View style={[styles.cellWrapper, { flex: 1.5 }]}>
                          <Text style={styles.cellText}>{item.createuser || 'SYSTEM'}</Text>
                          <Text style={styles.cellSub}>{dateFormatted}</Text>
                        </View>

                        {/* Approved state */}
                        <View style={[styles.cellWrapper, { flex: 1.2 }]}>
                          <View style={[
                            styles.approvedBadge, 
                            item.approved === 'Y' || item.approved === 'true' ? styles.approvedYes : styles.approvedNo
                          ]}>
                            <Text style={styles.approvedBadgeText}>
                              {item.approved === 'Y' || item.approved === 'true' ? 'Approved' : 'Unapproved'}
                            </Text>
                          </View>
                        </View>

                        {/* Actions Panel */}
                        <View style={[styles.cellActions, { flex: 1 }]}>
                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: '#e0e7ff' }]}
                            onPress={() => {
                              setSelectedOrder(item);
                              setItemsModalVisible(true);
                            }}
                          >
                            <Eye size={14} color="#4338ca" />
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: '#fef3c7' }]}
                            onPress={() => {
                              setStatusOrderTarget(item);
                              setStatusModalVisible(true);
                            }}
                          >
                            <Edit size={14} color="#d97706" />
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: '#fee2e2' }]}
                            onPress={() => {
                              setDeleteOrderTarget(item);
                              setDeleteModalVisible(true);
                            }}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>No synced purchase orders found matching current filters.</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Pagination Panel */}
            {sortedData.length > 0 && (
              <View style={styles.paginationRow}>
                <Text style={styles.paginationText}>
                  Showing {page * rowsPerPage + 1} - {Math.min((page + 1) * rowsPerPage, sortedData.length)} of {sortedData.length} total orders
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

      {/* ITEMS MODAL */}
      {selectedOrder && (
        <Modal visible={itemsModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ShoppingBag size={20} color="#4338ca" />
                <Text style={styles.modalTitle}>Order Details ({selectedOrder.prefix || ''}{selectedOrder.year || ''}{selectedOrder.srno || ''})</Text>
                <TouchableOpacity onPress={() => { setItemsModalVisible(false); setSelectedOrder(null); }}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 350, marginVertical: 10 }}>
                {/* General data */}
                <View style={styles.modalMetaInfo}>
                  <Text style={styles.metaText}>Wholesaler: {selectedOrder.custname} ({selectedOrder.custcode})</Text>
                  <Text style={styles.metaText}>Reference: {selectedOrder.refname || 'N/A'}</Text>
                  <Text style={styles.metaText}>Delivery: {selectedOrder.delivery_type || 'Local'}</Text>
                  {selectedOrder.address && <Text style={styles.metaText}>Address: {selectedOrder.address}</Text>}
                  {selectedOrder.remarks && <Text style={styles.metaText}>Remarks: {selectedOrder.remarks}</Text>}
                </View>

                {/* Items rows */}
                <Text style={{ fontWeight: '700', color: '#1e293b', marginBottom: 8, fontSize: 13 }}>Items List</Text>
                {(() => {
                  let list: any[] = [];
                  try {
                    list = typeof selectedOrder.details === 'string' ? JSON.parse(selectedOrder.details) : selectedOrder.details;
                  } catch(e) {}
                  
                  if (!Array.isArray(list) || list.length === 0) {
                    return <Text style={{ color: '#64748b', fontSize: 13 }}>No items details recorded.</Text>;
                  }

                  return list.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600', color: '#334155' }}>{item.itemName || item.name}</Text>
                        <Text style={{ fontSize: 11, color: '#94a3b8' }}>Code: {item.itemCode || item.code}</Text>
                      </View>
                      <Text style={{ fontWeight: '700', color: '#4338ca' }}>Qty: {item.Qty || item.quantity} | Rate: ₹{item.rate}</Text>
                    </View>
                  ));
                })()}
              </ScrollView>

              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setItemsModalVisible(false); setSelectedOrder(null); }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* UPDATE STATUS MODAL */}
      {statusOrderTarget && (
        <Modal visible={statusModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxWidth: 400 }]}>
              <View style={styles.modalHeader}>
                <Clock size={20} color="#d97706" />
                <Text style={styles.modalTitle}>Update Order Status</Text>
                <TouchableOpacity onPress={() => { setStatusModalVisible(false); setStatusOrderTarget(null); }}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 14, color: '#475569', marginBottom: 16 }}>
                Select new status for Order #{statusOrderTarget.prefix || ''}{statusOrderTarget.year || ''}{statusOrderTarget.srno || ''} ({statusOrderTarget.custname})
              </Text>

              <View style={{ gap: 8, marginBottom: 20 }}>
                {['Pending', 'Assigned', 'Delivered', 'Cancelled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => handleUpdateStatusSubmit(status)}
                    style={[
                      styles.statusSelectBtn,
                      statusOrderTarget.status === status && styles.statusSelectBtnActive
                    ]}
                  >
                    <Text style={[
                      styles.statusSelectBtnText,
                      statusOrderTarget.status === status && styles.statusSelectBtnTextActive
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {deleteOrderTarget && (
        <Modal visible={deleteModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxWidth: 380 }]}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 }}>Delete Order Record</Text>
              <Text style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>
                Are you sure you want to delete PO #{deleteOrderTarget.prefix || ''}{deleteOrderTarget.year || ''}{deleteOrderTarget.srno || ''}? This action is irreversible.
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#e2e8f0', marginRight: 0 }]} onPress={() => { setDeleteModalVisible(false); setDeleteOrderTarget(null); }}>
                  <Text style={{ color: '#475569', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#ef4444', marginRight: 0 }]} onPress={handleDeleteSubmit}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const webDatePickerStyle: any = {
  height: '40px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '#cbd5e1',
  borderRadius: '8px',
  paddingHorizontal: '12px',
  fontSize: '14px',
  backgroundColor: '#fff',
  color: '#334155',
  outlineStyle: 'none',
  padding: '6px 12px',
  fontFamily: 'inherit'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
  },
  syncBtn: {
    backgroundColor: '#4338ca',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  syncIcon: {
    marginRight: 8,
  },
  rotatingIcon: {
    transform: [{ rotate: '360deg' }]
  },
  syncBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  filterBar: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
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
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    width: 280,
    maxWidth: '100%',
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
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
    color: '#64748b',
    paddingLeft: 4,
  },
  inputField: {
    height: 40,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#0f172a',
    width: 150,
  },
  clearDateBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-end',
    height: 40,
    justifyContent: 'center'
  },
  clearDateText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600'
  },
  creatorTabsWrapper: {
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  creatorTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  creatorTabActive: {
    backgroundColor: '#4338ca'
  },
  creatorTabText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600'
  },
  creatorTabTextActive: {
    color: '#fff'
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
    borderBottomColor: '#cbd5e1',
  },
  headerCell: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  cellWrapper: {
    flexDirection: 'column',
    justifyContent: 'center',
    paddingRight: 8
  },
  cellText: {
    fontSize: 13,
    color: '#334155',
  },
  cellBold: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  cellSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center'
  },
  approvedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  approvedYes: {
    backgroundColor: '#d1fae5'
  },
  approvedNo: {
    backgroundColor: '#fee2e2'
  },
  approvedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a'
  },
  cellActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyRow: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
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
    color: '#64748b',
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
    borderColor: '#cbd5e1',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 550,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 10
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 6,
    flex: 1
  },
  modalMetaInfo: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    gap: 4
  },
  metaText: {
    fontSize: 12,
    color: '#475569'
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  modalCloseBtn: {
    backgroundColor: '#4338ca',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15
  },
  statusSelectBtn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center'
  },
  statusSelectBtnActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#4338ca'
  },
  statusSelectBtnText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600'
  },
  statusSelectBtnTextActive: {
    color: '#4338ca',
    fontWeight: '700'
  }
});
