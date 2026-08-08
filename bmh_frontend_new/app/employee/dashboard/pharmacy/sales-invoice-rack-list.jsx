import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Platform, Modal, useWindowDimensions, ScrollView } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../../constants/Colors';
import { Search, Eye, X } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

const webDatePickerStyle = {
  height: '32px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '#e2e8f0',
  borderRadius: '8px',
  paddingLeft: '8px',
  paddingRight: '8px',
  fontSize: '13px',
  backgroundColor: '#fff',
  color: '#334155',
  outlineStyle: 'none',
  fontFamily: 'inherit',
  width: '125px',
  maxWidth: '125px',
  boxSizing: 'border-box'
};

export default function SalesInvoiceRackList() {
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
    fetchInvoices(50, false);

    const pollInterval = setInterval(() => {
      fetchInvoices(50, true);
    }, 5000);

    setTimeout(() => {
      fetchInvoices(null, true);
    }, 1500);

    return () => clearInterval(pollInterval);
  }, []);

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
          setInvoices((prev) => {
            if (prev.length > limit) {
              const newItems = res.data.data.filter(item => !prev.some(p => p.id === item.id));
              return [...newItems, ...prev];
            }
            return res.data.data;
          });
        } else {
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

  const uniqueUsers = Array.from(new Set(invoices.map(inv => inv.userId).filter(Boolean)));

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

  const totalPages = Math.ceil(filteredInvoices.length / rowsPerPage) || 1;
  const paginatedInvoices = filteredInvoices.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const renderTableHeader = () => {
    if (!isDesktop) return null;
    return (
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, { flex: 1.5 }]}>Invoice ID</Text>
        <Text style={[styles.headerText, { flex: 1.5 }]}>Order No</Text>
        <Text style={[styles.headerText, { flex: 2 }]}>Customer</Text>
        <Text style={[styles.headerText, { flex: 1.3 }]}>Mobile</Text>
        <Text style={[styles.headerText, { flex: 1.2 }]}>Total Amount</Text>
        <Text style={[styles.headerText, { flex: 1.8 }]}>Date / Time</Text>
        <Text style={[styles.headerText, { flex: 1.2 }]}>Created By</Text>
        <Text style={[styles.headerText, { flex: 0.8, textAlign: 'center' }]}>Actions</Text>
      </View>
    );
  };

  const renderInvoiceRow = ({ item, index }) => {
    const formattedDate = formatDateTime(item.ordDate, item.ordTime);

    if (!isDesktop) {
      return (
        <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#4338ca' }}>
              Inv #{item.ipNo || 'N/A'}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#10b981' }}>
              ₹{parseFloat(item.orderTotal || 0).toFixed(2)}
            </Text>
          </View>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a', marginBottom: 2 }}>{item.patientName || 'Walk-in'}</Text>
          {item.mobileNo ? <Text style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>Mob: {item.mobileNo}</Text> : null}
          {item.actCode ? <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Order No: {item.actCode}</Text> : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#64748b' }}>Date: {formattedDate}</Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>User: {item.userId || 'Walk-in'}</Text>
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openInvoiceDetails(item)}>
              <Eye size={16} color="#4338ca" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

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
        <View style={[styles.cell, { flex: 1.3 }]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.mobileNo || 'N/A'}</Text>
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
      <View style={styles.header}>
        <Text style={styles.title}>Sales Invoice Rack List</Text>
      </View>

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

      <View style={isDesktop ? styles.tableContainer : { flex: 1, minHeight: 400 }}>
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

      {modalVisible && selectedInvoice && (
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isDesktop ? 700 : '95%', maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Invoice Medicine Rack Locations</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); setSelectedInvoice(null); }}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Customer & Order Specifications</Text>
                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', flexWrap: 'wrap', gap: 16 }}>
                    <View style={{ flex: 1, minWidth: 250 }}>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Name:</Text> {selectedInvoice.patientName || 'Walk-in'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Phone:</Text> {selectedInvoice.mobileNo || 'N/A'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Address:</Text> {selectedInvoice.patientAddress || 'Walk-in Customer'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Invoice ID:</Text> {selectedInvoice.ipNo}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 250 }}>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Created By:</Text> {selectedInvoice.userId || 'Walk-in'}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Date/Time:</Text> {formatDateTime(selectedInvoice.ordDate, selectedInvoice.ordTime)}</Text>
                      <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Grand Total:</Text> ₹{parseFloat(selectedInvoice.orderTotal || 0).toFixed(2)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Medicines & Rack Placements</Text>
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
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#1e293b', flex: 1, minWidth: 200 }}>
                                  {item.medicine_name || item.itemName || 'N/A'}
                                </Text>
                                <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' }}>
                                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1e40af' }}>
                                    Rack: {item.rack || 'N/A'}
                                  </Text>
                                </View>
                              </View>
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
  
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'flex-end', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  filterCol: { flexDirection: 'column', gap: 4, minWidth: 140, flex: 1 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, height: 38 },
  filterInput: { flex: 1, height: '100%', outlineStyle: 'none', fontSize: 13, color: '#334155' },
  pickerWrapper: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff', height: 38, justifyContent: 'center' },
  filterPicker: { height: 38, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 6, fontSize: 13, color: '#334155', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  mobileDateInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, height: 38, fontSize: 13, backgroundColor: '#fff', color: '#334155' },

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
  modalFooter: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12, marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },
  closeBtn: { backgroundColor: '#ef4444', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6 },
  closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 }
});
