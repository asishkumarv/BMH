import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Platform, Modal, useWindowDimensions, ScrollView } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../../constants/Colors';
import { Search, Eye, X } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

const webDatePickerStyle = {
  height: '38px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '#e2e8f0',
  borderRadius: '8px',
  paddingLeft: '12px',
  paddingRight: '12px',
  fontSize: '13px',
  backgroundColor: '#fff',
  color: '#334155',
  outlineStyle: 'none',
  fontFamily: 'inherit',
  minWidth: '140px',
  boxSizing: 'border-box'
};

export default function SalesInvoiceList() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filters state
  const [searchInvoiceNo, setSearchInvoiceNo] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [filterUser, setFilterUser] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const rowsPerPage = 50;

  useEffect(() => {
    // 1. Initial run: Fetch first 50 invoices instantly
    fetchInvoices(50, false);

    // 2. Poll for the first 50 invoices every 5 seconds to keep it real-time
    const pollInterval = setInterval(() => {
      fetchInvoices(50, true);
    }, 5000);

    // 3. Lazy background loading: fetch all remaining records in the background silently
    setTimeout(() => {
      fetchInvoices(null, true);
    }, 1500);

    return () => clearInterval(pollInterval);
  }, []);

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1);
  }, [searchInvoiceNo, searchCustomer, filterUser, startDate, endDate]);

  const fetchInvoices = async (limit = null, isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const url = limit 
        ? `https://napi.bharatmedicalhallplus.com/sales-invoice-list?limit=${limit}` 
        : `https://napi.bharatmedicalhallplus.com/sales-invoice-list`;
      
      const res = await axios.get(url);
      if (res.data && res.data.success) {
        if (limit) {
          // Update list only if we haven't loaded the full background list yet,
          // or just merge if we are doing active polling.
          setInvoices((prev) => {
            // If the current list length is larger than the limit, it means background load already finished.
            // In that case, we can update or prepend any newly polled items.
            if (prev.length > limit) {
              const newItems = res.data.data.filter(item => !prev.some(p => p.id === item.id));
              return [...newItems, ...prev];
            }
            return res.data.data;
          });
        } else {
          // Background load of all historical invoices
          setInvoices(res.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const openInvoiceDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setModalVisible(true);
    setLoadingDetails(true);
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/sales-invoice/${invoice.id}`);
      if (res.data && res.data.success) {
        setInvoiceItems(res.data.data.materialInfo || []);
      }
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      setInvoiceItems([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatDateTime = (ordDate, ordTime) => {
    if (!ordDate) return 'N/A';
    try {
      const datePart = typeof ordDate === 'string' && ordDate.includes('T')
        ? ordDate.substring(0, 10)
        : ordDate;
      const cleanTime = ordTime || '00:00:00';
      const parsed = new Date(`${datePart}T${cleanTime}`);
      if (isNaN(parsed.getTime())) {
        const fallback = new Date(ordDate);
        if (!isNaN(fallback.getTime())) {
          return fallback.toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
          }) + (ordTime ? ' ' + ordTime : '');
        }
        return `${ordDate} ${ordTime || ''}`;
      }
      return parsed.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return `${ordDate} ${ordTime || ''}`;
    }
  };

  // Get list of unique created users dynamically for dropdown
  const uniqueUsers = Array.from(new Set(invoices.map(inv => inv.userId).filter(Boolean)));

  // Client-side filtering
  const filteredInvoices = invoices.filter(item => {
    let matchesInvoiceNo = true;
    if (searchInvoiceNo) {
      matchesInvoiceNo = item.ipNo?.toLowerCase().includes(searchInvoiceNo.toLowerCase());
    }

    let matchesCustomer = true;
    if (searchCustomer) {
      matchesCustomer = item.patientName?.toLowerCase().includes(searchCustomer.toLowerCase());
    }

    let matchesCreatedBy = true;
    if (filterUser !== 'All') {
      matchesCreatedBy = item.userId?.toLowerCase() === filterUser.toLowerCase();
    }

    let matchesDate = true;
    if (startDate || endDate) {
      const itemDateStr = item.ordDate 
        ? (typeof item.ordDate === 'string' && item.ordDate.includes('T') ? item.ordDate.substring(0,10) : item.ordDate)
        : '';
      
      if (startDate && itemDateStr) {
        matchesDate = itemDateStr >= startDate;
      }
      if (endDate && matchesDate && itemDateStr) {
        matchesDate = itemDateStr <= endDate;
      }
    }

    return matchesInvoiceNo && matchesCustomer && matchesCreatedBy && matchesDate;
  });

  // Client-side pagination
  const totalPages = Math.ceil(filteredInvoices.length / rowsPerPage) || 1;
  const paginatedInvoices = filteredInvoices.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerText, { flex: 1.5 }]}>Invoice ID</Text>
      <Text style={[styles.headerText, { flex: 1.5 }]}>Order No</Text>
      <Text style={[styles.headerText, { flex: 2 }]}>Customer</Text>
      <Text style={[styles.headerText, { flex: 1.2 }]}>Total Amount</Text>
      <Text style={[styles.headerText, { flex: 1.8 }]}>Date / Time</Text>
      <Text style={[styles.headerText, { flex: 1.2 }]}>Created By</Text>
      <Text style={[styles.headerText, { flex: 0.8, textAlign: 'center' }]}>Actions</Text>
    </View>
  );

  const renderInvoiceRow = ({ item, index }) => {
    const formattedDate = formatDateTime(item.ordDate, item.ordTime);

    return (
      <View style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff' }]}>
        <View style={[styles.cell, { flex: 1.5 }]}>
          <Text style={styles.cellTextBold} numberOfLines={1}>{item.ipNo || 'N/A'}</Text>
        </View>
        <View style={[styles.cell, { flex: 1.5 }]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.actCode || 'N/A'}</Text>
        </View>
        <View style={[styles.cell, { flex: 2 }]}>
          <Text style={styles.cellTextBold} numberOfLines={1}>{item.patientName || 'Walk-in'}</Text>
        </View>
        <View style={[styles.cell, { flex: 1.2 }]}>
          <Text style={[styles.cellTextBold, { color: '#10b981' }]}>₹{parseFloat(item.orderTotal || 0).toFixed(2)}</Text>
        </View>
        <View style={[styles.cell, { flex: 1.8 }]}>
          <Text style={styles.cellText} numberOfLines={1}>{formattedDate}</Text>
        </View>
        <View style={[styles.cell, { flex: 1.2 }]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.userId || 'Walk-in'}</Text>
        </View>
        <View style={[styles.cell, { flex: 0.8, justifyContent: 'center', alignItems: 'center' }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openInvoiceDetails(item)}>
            <Eye size={16} color="#4338ca" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Title Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sales Invoices</Text>
      </View>

      {/* Modern Filter Row */}
      <View style={styles.filterRow}>
        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>Invoice No</Text>
          <View style={styles.inputWrapper}>
            <Search size={14} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput 
              style={styles.filterInput}
              placeholder="Search Invoice ID..."
              value={searchInvoiceNo}
              onChangeText={setSearchInvoiceNo}
            />
          </View>
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>Customer Name</Text>
          <View style={styles.inputWrapper}>
            <Search size={14} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput 
              style={styles.filterInput}
              placeholder="Search Customer..."
              value={searchCustomer}
              onChangeText={setSearchCustomer}
            />
          </View>
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>Created By</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={filterUser}
              onValueChange={setFilterUser}
              style={styles.filterPicker}
            >
              <Picker.Item label="All Users" value="All" />
              {uniqueUsers.map(u => (
                <Picker.Item key={u} label={u} value={u} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>Start Date</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={webDatePickerStyle}
            />
          ) : (
            <TextInput
              style={styles.mobileDateInput}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
            />
          )}
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>End Date</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={webDatePickerStyle}
            />
          ) : (
            <TextInput
              style={styles.mobileDateInput}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
            />
          )}
        </View>
      </View>

      {/* Grid Table Container */}
      <View style={styles.tableContainer}>
        {loading && invoices.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4338ca" />
          </View>
        ) : (
          <>
            <FlatList 
              data={paginatedInvoices}
              keyExtractor={(item) => item.id.toString()}
              ListHeaderComponent={renderTableHeader}
              stickyHeaderIndices={[0]}
              renderItem={renderInvoiceRow}
              contentContainerStyle={{ flexGrow: 1 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No sales invoices found.</Text>
                </View>
              }
            />
            
            {/* Pagination Panel */}
            <View style={styles.paginationContainer}>
              <TouchableOpacity 
                disabled={page === 1} 
                onPress={() => setPage(page - 1)} 
                style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
              >
                <Text style={[styles.pageButtonText, page === 1 && styles.pageButtonTextDisabled]}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfoText}>
                Page {page} of {totalPages} (Total Invoices: {filteredInvoices.length})
              </Text>
              <TouchableOpacity 
                disabled={page === totalPages} 
                onPress={() => setPage(page + 1)} 
                style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
              >
                <Text style={[styles.pageButtonText, page === totalPages && styles.pageButtonTextDisabled]}>Next</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* View Details Modal */}
      {modalVisible && selectedInvoice && (
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isDesktop ? 700 : '95%', maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Invoice Specifications</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); setSelectedInvoice(null); }}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Customer Details Block */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Customer & Order Specifications</Text>
                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', flexWrap: 'wrap', gap: 16 }}>
                    <View style={{ flex: 1, minWidth: 250 }}>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Name:</Text> {selectedInvoice.patientName || 'Walk-in'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Phone:</Text> {selectedInvoice.mobileNo || 'N/A'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Address:</Text> {selectedInvoice.patientAddress || 'Walk-in Customer'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Invoice ID:</Text> {selectedInvoice.ipNo}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Order No:</Text> {selectedInvoice.orderNo || selectedInvoice.actCode || 'N/A'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Created By:</Text> {selectedInvoice.userId || 'Walk-in'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Date/Time:</Text> {formatDateTime(selectedInvoice.ordDate, selectedInvoice.ordTime)}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 250 }}>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Reminder Date:</Text> {selectedInvoice.reminderDate || 'N/A'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Order Type:</Text> {selectedInvoice.orderType || selectedInvoice.counterSale || 'N/A'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Payment Status:</Text> {selectedInvoice.paymentStatus || 'N/A'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Order For:</Text> {selectedInvoice.orderFor || selectedInvoice.actName || 'N/A'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Delivered By:</Text> {selectedInvoice.deliveredBy || 'N/A'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Shipping Charge:</Text> ₹{parseFloat(selectedInvoice.shippingCharge || 0).toFixed(2)}</Text>
                    </View>
                  </View>
                </View>

                {/* Pharmacy Details Block */}
                {(() => {
                  let pharm = null;
                  try {
                    pharm = typeof selectedInvoice.pharmacyDetails === 'string'
                      ? JSON.parse(selectedInvoice.pharmacyDetails)
                      : selectedInvoice.pharmacyDetails;
                  } catch(e) {}
                  if (!pharm) return null;
                  return (
                    <View style={styles.detailsGroup}>
                      <Text style={styles.detailsTitle}>Pharmacy Information</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Name:</Text> {pharm.pharmacy_name || 'N/A'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Address:</Text> {pharm.address || 'N/A'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Locality/City:</Text> {`${pharm.locality || ''} ${pharm.city || ''} (${pharm.pincode || ''})`}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>State:</Text> {pharm.state || 'N/A'}</Text>
                    </View>
                  );
                })()}

                {/* Items Ordered Block */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Medicines & Items</Text>
                  {loadingDetails ? (
                    <ActivityIndicator size="small" color="#4338ca" style={{ marginVertical: 20 }} />
                  ) : (
                    <View style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                      {invoiceItems && invoiceItems.length > 0 ? (
                        invoiceItems.map((item, idx) => {
                          const rate = parseFloat(item.maxmrp || item.saleRate || 0);
                          const qty = parseInt(item.quantity || item.totalLooseQty || 0, 10);
                          const subTotal = item.sub_total ? parseFloat(item.sub_total) : (rate * qty);
                          const discount = item.discount ? parseFloat(item.discount) : 0;
                          const sellingPrice = item.selling_price ? parseFloat(item.selling_price) : subTotal;
                          
                          return (
                            <View key={idx} style={{ padding: 12, borderBottomWidth: idx === invoiceItems.length - 1 ? 0 : 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' }}>
                              <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#1e293b' }}>
                                {item.medicine_name || item.itemName || 'N/A'}
                              </Text>
                              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                Code: {item.item_code || item.itemcode || 'N/A'}
                              </Text>
                              
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, flexWrap: 'wrap', gap: 12 }}>
                                <Text style={{ fontSize: 13, color: '#475569' }}>Qty: <Text style={{ fontWeight: '600' }}>{qty}</Text></Text>
                                <Text style={{ fontSize: 13, color: '#475569' }}>MRP: <Text style={{ fontWeight: '600' }}>₹{rate.toFixed(2)}</Text></Text>
                                <Text style={{ fontSize: 13, color: '#475569' }}>Selling Price: <Text style={{ fontWeight: '600' }}>₹{sellingPrice.toFixed(2)}</Text></Text>
                                <Text style={{ fontSize: 13, color: '#475569' }}>Discount: <Text style={{ fontWeight: '600', color: '#ef4444' }}>₹{discount.toFixed(2)}</Text></Text>
                                <Text style={{ fontSize: 13, color: '#0f172a', fontWeight: 'bold' }}>Subtotal: ₹{subTotal.toFixed(2)}</Text>
                              </View>
                            </View>
                          );
                        })
                      ) : (
                        <Text style={{ fontSize: 13, color: '#64748b', padding: 12, textAlign: 'center' }}>No items recorded.</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Billing Breakdown */}
                <View style={{ gap: 4, marginTop: 8 }}>
                  <Text style={{ fontSize: 14, color: '#334155', textAlign: 'right' }}>
                    Discount: <Text style={{ color: '#ef4444' }}>₹{parseFloat(selectedInvoice.orderDiscPer || 0).toFixed(2)}</Text>
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a', textAlign: 'right', marginTop: 4 }}>
                    Grand Total: ₹{parseFloat(selectedInvoice.orderTotal || 0).toFixed(2)}
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => { setModalVisible(false); setSelectedInvoice(null); }}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  
  // Filter row styling
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'flex-end', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  filterCol: { flexDirection: 'column', gap: 4, minWidth: 140 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, height: 38, width: 200 },
  filterInput: { flex: 1, height: '100%', outlineStyle: 'none', fontSize: 13, color: '#334155' },
  pickerWrapper: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff', height: 38, justifyContent: 'center', minWidth: 150 },
  filterPicker: { height: 38, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 6, fontSize: 13, color: '#334155', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  mobileDateInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, height: 38, fontSize: 13, backgroundColor: '#fff', color: '#334155', minWidth: 140 },

  tableContainer: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  cell: { paddingRight: 8 },
  cellText: { fontSize: 13, color: '#334155' },
  cellTextBold: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  actionBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef2ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#64748b', fontSize: 14 },
  
  // Pagination styling
  paginationContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  pageButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#4338ca', justifyContent: 'center', alignItems: 'center' },
  pageButtonDisabled: { backgroundColor: '#e2e8f0' },
  pageButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  pageButtonTextDisabled: { color: '#94a3b8' },
  pageInfoText: { fontSize: 12, color: '#64748b', fontWeight: '500', marginHorizontal: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  modalBody: { flex: 1 },
  detailsGroup: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 },
  detailsTitle: { fontSize: 14, fontWeight: 'bold', color: '#4338ca', marginBottom: 8 },
  detailsText: { fontSize: 13, color: '#334155', marginBottom: 4 },
  itemsTable: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' },
  itemsTableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  itemTh: { fontWeight: 'bold', fontSize: 12, color: '#475569' },
  itemsTableRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemTd: { fontSize: 12, color: '#334155' },
  modalFooter: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12, marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },
  closeBtn: { backgroundColor: '#ef4444', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6 },
  closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 }
});
