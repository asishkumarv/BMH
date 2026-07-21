import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Platform, Modal, useWindowDimensions, ScrollView } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../../constants/Colors';
import { Search, Eye, X } from 'lucide-react-native';

export default function SalesInvoiceList() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;

  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchInvoices();
    const interval = setInterval(() => {
      fetchInvoices(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredInvoices(invoices);
    } else {
      const lower = search.toLowerCase();
      setFilteredInvoices(invoices.filter(o => 
        o.patientName?.toLowerCase().includes(lower) || 
        o.ipNo?.toLowerCase().includes(lower) || 
        o.actCode?.toLowerCase().includes(lower) ||
        o.userId?.toLowerCase().includes(lower)
      ));
    }
  }, [search, invoices]);

  const fetchInvoices = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
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
    const formattedDate = item.ordDate 
      ? new Date(`${item.ordDate}T${item.ordTime || '00:00:00'}`).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })
      : `${item.ordDate || ''} ${item.ordTime || ''}`;

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
      <View style={styles.header}>
        <Text style={styles.title}>Sales Invoices</Text>
        <View style={styles.searchContainer}>
          <Search size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search invoice, customer, order..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.tableContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4338ca" />
          </View>
        ) : (
          <FlatList 
            data={filteredInvoices}
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
                  <Text style={styles.detailsTitle}>Customer Details</Text>
                  <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Name:</Text> {selectedInvoice.patientName || 'Walk-in'}</Text>
                  <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Phone:</Text> {selectedInvoice.mobileNo || 'N/A'}</Text>
                  <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Address:</Text> {selectedInvoice.patientAddress || 'Walk-in Customer'}</Text>
                  <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Invoice ID:</Text> {selectedInvoice.ipNo}</Text>
                  <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Order No:</Text> {selectedInvoice.actCode || 'N/A'}</Text>
                  <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Created By:</Text> {selectedInvoice.userId || 'Walk-in'}</Text>
                  <Text style={styles.detailsText}><Text style={{ fontWeight: 'bold' }}>Payment Mode:</Text> {selectedInvoice.counterSale || 'N/A'}</Text>
                </View>

                {/* Items Ordered Block */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Medicines & Items</Text>
                  {loadingDetails ? (
                    <ActivityIndicator size="small" color="#4338ca" style={{ marginVertical: 20 }} />
                  ) : (
                    <View style={styles.itemsTable}>
                      <View style={styles.itemsTableHeader}>
                        <Text style={[styles.itemTh, { flex: 2 }]}>Medicine Name</Text>
                        <Text style={[styles.itemTh, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                        <Text style={[styles.itemTh, { flex: 1, textAlign: 'right' }]}>Rate</Text>
                        <Text style={[styles.itemTh, { flex: 1, textAlign: 'right' }]}>Total</Text>
                      </View>
                      {invoiceItems && invoiceItems.length > 0 ? (
                        invoiceItems.map((item, idx) => {
                          const rate = parseFloat(item.saleRate || 0);
                          const qty = parseInt(item.totalLooseQty || 0, 10);
                          const subTotal = rate * qty;
                          return (
                            <View key={idx} style={styles.itemsTableRow}>
                              <Text style={[styles.itemTd, { flex: 2, fontWeight: '500' }]}>{item.itemName}</Text>
                              <Text style={[styles.itemTd, { flex: 1, textAlign: 'center' }]}>{qty}</Text>
                              <Text style={[styles.itemTd, { flex: 1, textAlign: 'right' }]}>₹{rate.toFixed(2)}</Text>
                              <Text style={[styles.itemTd, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>₹{subTotal.toFixed(2)}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, height: 38, width: 300 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, height: '100%', outlineStyle: 'none', fontSize: 13, color: '#334155' },
  tableContainer: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  cell: { paddingRight: 8 },
  cellText: { fontSize: 13, color: '#334155' },
  cellTextBold: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  actionBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef2ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#64748b', fontSize: 14 },
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
