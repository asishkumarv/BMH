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
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deliveryType, setDeliveryType] = useState('Local');
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
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
      const [res, empRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/sales-invoice-list'),
        axios.get('https://napi.bharatmedicalhallplus.com/employees')
      ]);
      
      if (res.data && res.data.success) {
        setInvoices(res.data.data);
      } else {
        setInvoices([]);
      }

      if (empRes.data && empRes.data.success) {
        setDeliveryBoys(empRes.data.data.filter((e) => e.department === 'Delivery' && e.status === 'approved'));
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDelivery = async (invoiceId, boyId) => {
    try {
        await axios.put(`https://napi.bharatmedicalhallplus.com/sales-invoice-list/${invoiceId}/assign-delivery`, {
          delivery_boy_id: boyId,
          delivery_type: deliveryType
        });
      alert('Delivery Boy Assigned Successfully');
      fetchInvoices();
      setModalVisible(false);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const renderInvoice = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderId}>Ref No: {item.refNo}</Text>
          <Text style={styles.date}>{item.ordDate} {item.ordTime}</Text>
          {item.salesOrderId && (
            <Text style={{fontSize: 12, color: Colors.light.primary, marginTop: 4, fontWeight: 'bold'}}>
              Generated from Order #{item.salesOrderId}
            </Text>
          )}
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          {item.deliveryBoyId && (
            <View style={styles.assignedBadge}>
              <Text style={styles.assignedBadgeText}>Assigned</Text>
            </View>
          )}
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Completed</Text>
          </View>
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
        <TouchableOpacity style={styles.viewBtn} onPress={() => openInvoiceDetails(item)}>
          <Eye size={16} color={Colors.light.primary} />
          <Text style={styles.viewBtnText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
      alert('Failed to load invoice items.');
    } finally {
      setLoadingDetails(false);
    }
  };

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
                <Text style={styles.noData}>No sales invoices found.</Text>
              </View>
            )
          }
        />
      )}

      {/* View Details Modal */}
      {modalVisible && selectedInvoice && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invoice Details: {selectedInvoice.refNo}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{fontSize: 20}}>✕</Text></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={{fontWeight: 'bold', marginBottom: 5}}>Customer: {selectedInvoice.patientName}</Text>
              <Text style={{marginBottom: 15}}>Date: {selectedInvoice.ordDate} {selectedInvoice.ordTime}</Text>
              
              {selectedInvoice.deliveryType === 'Bus' && selectedInvoice.busDetails && (
                <View style={{ marginBottom: 15, padding: 12, backgroundColor: '#FEF3C7', borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' }}>
                  <Text style={{fontWeight: 'bold', color: '#B45309', marginBottom: 6}}>🚌 Bus Delivery Details:</Text>
                  <Text style={{fontSize: 13, color: '#92400E'}}><Text style={{fontWeight:'bold'}}>Bus No:</Text> {selectedInvoice.busDetails.bus_number}</Text>
                  <Text style={{fontSize: 13, color: '#92400E'}}><Text style={{fontWeight:'bold'}}>Driver:</Text> {selectedInvoice.busDetails.driver_name} ({selectedInvoice.busDetails.driver_number})</Text>
                  <Text style={{fontSize: 13, color: '#92400E'}}><Text style={{fontWeight:'bold'}}>Reach Time:</Text> {selectedInvoice.busDetails.arrival_time}</Text>
                  <Text style={{fontSize: 13, color: '#92400E'}}><Text style={{fontWeight:'bold'}}>Drop Location:</Text> {selectedInvoice.busDetails.drop_location}</Text>
                </View>
              )}
              <Text style={{fontWeight: 'bold', marginBottom: 5}}>Items:</Text>
              {loadingDetails ? (
                <ActivityIndicator size="small" color={Colors.light.primary} style={{marginVertical: 20}} />
              ) : (
                <View style={styles.itemsTable}>
                  <View style={styles.itemsTableHeader}>
                    <Text style={[styles.itemTh, {flex: 2}]}>Item</Text>
                    <Text style={[styles.itemTh, {flex: 1}]}>Qty</Text>
                    <Text style={[styles.itemTh, {flex: 1}]}>Rate</Text>
                  </View>
                  {invoiceItems?.map((item, idx) => (
                    <View key={idx} style={styles.itemsTableRow}>
                      <Text style={[styles.itemTd, {flex: 2}]}>{item.itemName}</Text>
                      <Text style={[styles.itemTd, {flex: 1}]}>{item.totalLooseQty}</Text>
                      <Text style={[styles.itemTd, {flex: 1}]}>₹{item.saleRate}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.modalFooter}>
              <View style={{ flex: 1 }}>
                {!selectedInvoice.deliveryBoyId && selectedInvoice.salesOrderId && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>Delivery Type:</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <TouchableOpacity 
                        style={[styles.typeBtn, deliveryType === 'Local' && styles.typeBtnActive]}
                        onPress={() => setDeliveryType('Local')}
                      >
                        <Text style={[styles.typeText, deliveryType === 'Local' && styles.typeTextActive]}>Local</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.typeBtn, deliveryType === 'Bus' && styles.typeBtnActive]}
                        onPress={() => setDeliveryType('Bus')}
                      >
                        <Text style={[styles.typeText, deliveryType === 'Bus' && styles.typeTextActive]}>Bus</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Assign Delivery Boy:</Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {deliveryBoys?.map((boy) => (
                        <TouchableOpacity 
                          key={boy.id} 
                          style={styles.boyTag}
                          onPress={() => handleAssignDelivery(selectedInvoice.id, boy.id)}
                        >
                          <Text style={styles.boyTagText}>{boy.full_name}</Text>
                        </TouchableOpacity>
                      ))}
                      {(!deliveryBoys || deliveryBoys.length === 0) && <Text style={{fontSize: 12, color: '#DC2626'}}>No approved delivery boys found</Text>}
                    </View>
                  </View>
                )}
                <Text style={{fontWeight: 'bold', fontSize: 16}}>Total: ₹{selectedInvoice.orderTotal}</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '90%',
    maxWidth: 600,
    borderRadius: 8,
    padding: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
    marginBottom: 10
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalBody: {
    maxHeight: 400,
    overflow: 'hidden'
  },
  itemsTable: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4
  },
  itemsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  itemTh: {
    fontWeight: 'bold',
    fontSize: 12
  },
  itemsTableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  itemTd: {
    fontSize: 12
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  closeBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 6
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  generateBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  assignedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#E0E7FF' },
  assignedBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#4338CA' },
  typeBtn: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, alignItems: 'center' },
  typeBtnActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  typeText: { fontSize: 14, color: '#64748B' },
  typeTextActive: { color: '#4F46E5', fontWeight: 'bold' },
  boyTag: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  boyTagText: { fontSize: 12, color: '#334155', fontWeight: '600' }
});
