import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Modal, TextInput, useWindowDimensions, ScrollView } from 'react-native';
import axios from 'react-native-axios' // wait, use axios from react-native or standard axios
import axiosInstance from 'axios'; // let's just use standard 'axios'
import { Picker } from '@react-native-picker/picker';
import { Package, MapPin, Bus, User, Map, CheckCircle, Search, Calendar, FileText, Eye, Share2, Phone, Navigation, ChevronDown, X } from 'lucide-react-native';

const axios = axiosInstance;

export default function SalesOrders({ deliveryBoys }) {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buses, setBuses] = useState([]);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('All'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBoyId, setSelectedBoyId] = useState('All');
  const [riderDropdownOpen, setRiderDropdownOpen] = useState(false);
  const [assignOrder, setAssignOrder] = useState(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  
  // Assign details state
  const [deliveryType, setDeliveryType] = useState('Local');
  const [targetBoyId, setTargetBoyId] = useState('');
  const [busDetails, setBusDetails] = useState({
    bus_number: '',
    arrival_time: '',
    driver_name: '',
    driver_number: '',
    waybill_number: '',
    drop_location: '',
    bus_date: ''
  });

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchSalesOrders = async (silent = false, targetPage = page) => {
    try {
      if (!silent) setLoading(true);
      let url = 'https://napi.bharatmedicalhallplus.com/ecogreen/sales-orders';
      const params = [`page=${targetPage}`, 'limit=50'];
      if (assignmentFilter !== 'All') params.push(`status=${assignmentFilter}`);
      if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
      if (startDate) params.push(`fromDate=${startDate}`);
      if (endDate) params.push(`toDate=${endDate}`);
      if (selectedBoyId !== 'All') {
        params.push(`delivery_boy_id=${selectedBoyId}`);
      }
      
      url += `?${params.join('&')}`;
      
      const res = await axios.get(url);
      if (res.data && res.data.success) {
        setOrders(res.data.data);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Error fetching sales orders:', err.message || err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchBuses = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/buses');
      if (res.data && res.data.success) {
        setBuses(res.data.data);
      }
    } catch(err) {
      console.log('Error fetching buses', err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchSalesOrders(false, 1);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    fetchSalesOrders(false, 1);
  }, [startDate, endDate, selectedBoyId, assignmentFilter]);

  useEffect(() => {
    fetchSalesOrders(false, page);
  }, [page]);

  useEffect(() => {
    fetchBuses();
    const interval = setInterval(() => {
      fetchSalesOrders(true, page);
    }, 15000);
    return () => clearInterval(interval);
  }, [page, searchQuery, startDate, endDate, selectedBoyId, assignmentFilter]);

  const handleAssignDelivery = async () => {
    if (deliveryType !== 'Store' && !targetBoyId) {
      alert('Please select a delivery boy');
      return;
    }
    try {
      let assignedBy = null;
      if (typeof window !== 'undefined') {
        const empUser = localStorage.getItem('employeeUser');
        if (empUser) {
          assignedBy = JSON.parse(empUser).id;
        }
      }

      const payload = {
        delivery_boy_id: deliveryType === 'Store' ? null : targetBoyId,
        delivery_type: deliveryType,
        bus_details: deliveryType === 'Bus' ? busDetails : null,
        assigned_by: assignedBy
      };

      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/ecogreen/sales-orders/assign/${assignOrder.id}`, payload);
      if (res.data.success) {
        alert(`Sales order assigned successfully! OTP: ${res.data.delivery_otp || 'N/A'}`);
        setAssignModalVisible(false);
        fetchSalesOrders();
      }
    } catch (err) {
      alert('Failed to assign order');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      let author = 'Employee';
      if (typeof window !== 'undefined') {
        const empUser = localStorage.getItem('employeeUser');
        if (empUser) {
          author = JSON.parse(empUser).name || 'Employee';
        }
      }
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/ecogreen/sales-orders/notes/${selectedOrder.id}`, {
        note: newNote,
        author: author
      });
      if (res.data.success) {
        setSelectedOrder(res.data.data);
        setNewNote('');
        fetchSalesOrders(true);
      }
    } catch (err) {
      alert('Failed to add note');
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/ecogreen/sales-orders/status/${selectedOrder.id}`, { status });
      if (res.data.success) {
        setSelectedOrder(res.data.data);
        fetchSalesOrders(true);
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput) return;
    try {
      setOtpVerifying(true);
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/ecogreen/sales-orders/otp/${selectedOrder.id}`, { otp: otpInput });
      if (res.data.success) {
        alert('Order delivered successfully!');
        setSelectedOrder(res.data.data);
        setOtpInput('');
        fetchSalesOrders();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Invalid OTP verification failed.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const renderOrderItem = ({ item }) => {
    const isAssigned = item.delivery_boy_id != null;
    const dboy = deliveryBoys.find(b => b.id.toString() === String(item.delivery_boy_id));
    
    return (
      <View style={styles.orderCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNoText}>Order: {item.order_no}</Text>
            {item.invoice_id && <Text style={styles.invoiceNoText}>Inv: {item.invoice_id}</Text>}
          </View>
          <Text style={[styles.statusBadge, { 
            backgroundColor: item.status === 'Delivered' ? '#D1FAE5' : item.status === 'Assigned' ? '#DBEAFE' : '#FEE2E2',
            color: item.status === 'Delivered' ? '#065F46' : item.status === 'Assigned' ? '#1E40AF' : '#991B1B'
          }]}>
            {item.status || 'Pending'}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <User size={14} color="#64748b" />
            <Text style={styles.infoText}>{item.patient_name || 'Walk-in'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Phone size={14} color="#64748b" />
            <Text style={styles.infoText}>{item.patient_contact_no || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={14} color="#64748b" />
            <Text style={styles.infoText} numberOfLines={2}>
              {typeof item.patient_address === 'object' ? item.patient_address?.address || item.patient_address?.locality : item.patient_address}
            </Text>
          </View>
          {isAssigned && dboy && (
            <View style={[styles.infoRow, { marginTop: 6, backgroundColor: '#EFF6FF', padding: 6, borderRadius: 4 }]}>
              <User size={14} color="#2563EB" />
              <Text style={[styles.infoText, { color: '#2563EB', fontWeight: '600' }]}>Rider: {dboy.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedOrder(item); setViewModalVisible(true); }}>
            <Eye size={16} color="#475569" />
            <Text style={styles.actionBtnText}>View Details</Text>
          </TouchableOpacity>
          
          {item.status !== 'Delivered' && item.status !== 'Cancelled' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4338CA' }]} onPress={() => { setAssignOrder(item); setTargetBoyId(item.delivery_boy_id || ''); setAssignModalVisible(true); }}>
              <User size={16} color="#fff" />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Assign</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Search and Filters */}
      <View style={styles.filtersPanel}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Sales Orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.dropdownsContainer}>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={assignmentFilter} onValueChange={setAssignmentFilter} style={styles.picker}>
              <Picker.Item label="All Statuses" value="All" />
              <Picker.Item label="Pending" value="Pending" />
              <Picker.Item label="Assigned" value="Assigned" />
              <Picker.Item label="Delivered" value="Delivered" />
            </Picker>
          </View>

          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedBoyId} onValueChange={setSelectedBoyId} style={styles.picker}>
              <Picker.Item label="All Riders" value="All" />
              {deliveryBoys.map(boy => (
                <Picker.Item key={boy.id} label={boy.name} value={boy.id} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4338CA" />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No sales orders matched filters.</Text>}
        />
      )}

      {/* Pagination Footer */}
      <View style={styles.paginationRow}>
        <TouchableOpacity disabled={page <= 1} onPress={() => setPage(p => Math.max(1, p - 1))} style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}>
          <Text style={styles.pageBtnText}>Previous</Text>
        </TouchableOpacity>
        <Text style={styles.pageText}>Page {pagination.page} of {pagination.totalPages}</Text>
        <TouchableOpacity disabled={page >= pagination.totalPages} onPress={() => setPage(p => Math.min(pagination.totalPages, p + 1))} style={[styles.pageBtn, page >= pagination.totalPages && styles.pageBtnDisabled]}>
          <Text style={styles.pageBtnText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Assign Modal */}
      {assignModalVisible && assignOrder && (
        <Modal visible={assignModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assign Order #{assignOrder.id}</Text>
                <TouchableOpacity onPress={() => setAssignModalVisible(false)}><X size={24} color="#64748b" /></TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 16 }}>
                <Text style={styles.label}>Select Delivery Type</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={deliveryType} onValueChange={setDeliveryType} style={styles.picker}>
                    <Picker.Item label="Local Delivery" value="Local" />
                    <Picker.Item label="Bus Delivery" value="Bus" />
                    <Picker.Item label="Store Pickup" value="Store" />
                  </Picker>
                </View>

                {deliveryType !== 'Store' && (
                  <>
                    <Text style={styles.label}>Select Rider</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker selectedValue={targetBoyId} onValueChange={setTargetBoyId} style={styles.picker}>
                        <Picker.Item label="-- Select Rider --" value="" />
                        {deliveryBoys.map(boy => (
                          <Picker.Item key={boy.id} label={boy.name} value={boy.id} />
                        ))}
                      </Picker>
                    </View>
                  </>
                )}

                {deliveryType === 'Bus' && (
                  <View style={{ gap: 10, marginTop: 12 }}>
                    <Text style={styles.label}>Bus Travel Name</Text>
                    <TextInput style={styles.input} value={busDetails.driver_name} onChangeText={t => setBusDetails({ ...busDetails, driver_name: t })} placeholder="Travel / Operator Name" />
                    <Text style={styles.label}>Bus Number</Text>
                    <TextInput style={styles.input} value={busDetails.bus_number} onChangeText={t => setBusDetails({ ...busDetails, bus_number: t })} placeholder="Vehicle Number" />
                    <Text style={styles.label}>Waybill Number</Text>
                    <TextInput style={styles.input} value={busDetails.waybill_number} onChangeText={t => setBusDetails({ ...busDetails, waybill_number: t })} placeholder="Bill / Receipt No" />
                  </View>
                )}

                <TouchableOpacity style={styles.submitBtn} onPress={handleAssignDelivery}>
                  <Text style={styles.submitBtnText}>Confirm Assignment</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* View Details Modal */}
      {viewModalVisible && selectedOrder && (
        <Modal visible={viewModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Order Details #{selectedOrder.id}</Text>
                <TouchableOpacity onPress={() => setViewModalVisible(false)}><X size={24} color="#64748b" /></TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 16 }}>
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Patient Profile</Text>
                  <Text style={styles.detailsText}>Name: {selectedOrder.patient_name || 'N/A'}</Text>
                  <Text style={styles.detailsText}>Contact: {selectedOrder.patient_contact_no || 'N/A'}</Text>
                  <Text style={styles.detailsText}>
                    Address: {typeof selectedOrder.patient_address === 'object' ? selectedOrder.patient_address?.address || selectedOrder.patient_address?.locality : selectedOrder.patient_address}
                  </Text>
                </View>

                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Financial Details</Text>
                  <Text style={styles.detailsText}>Total Price: ₹{selectedOrder.total_price}</Text>
                  <Text style={styles.detailsText}>Total Discount: ₹{selectedOrder.total_discount}</Text>
                  <Text style={styles.detailsText}>Payment Status: {selectedOrder.payment_status}</Text>
                </View>

                {/* Items */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Items Ordered</Text>
                  {(selectedOrder.order_items || []).map((itm, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemName}>{itm.medicine_name}</Text>
                      <Text style={styles.itemQty}>Qty: {itm.quantity} | Sub: ₹{itm.sub_total}</Text>
                    </View>
                  ))}
                </View>

                {/* OTP Delivery Verification */}
                {selectedOrder.status === 'Assigned' && selectedOrder.delivery_otp && (
                  <View style={[styles.detailsGroup, { backgroundColor: '#F0FDF4', padding: 12, borderRadius: 8 }]}>
                    <Text style={[styles.detailsTitle, { color: '#166534' }]}>Deliver Verification OTP</Text>
                    <Text style={{ fontSize: 12, color: '#166534', marginBottom: 8 }}>Enter the OTP shared with the customer to complete delivery.</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TextInput style={[styles.input, { flex: 1, backgroundColor: '#fff' }]} value={otpInput} onChangeText={setOtpInput} placeholder="Enter 6-digit OTP" keyboardType="numeric" />
                      <TouchableOpacity disabled={otpVerifying} onPress={handleVerifyOtp} style={styles.otpBtn}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Verify</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Status Transitions */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Dispatch States</Text>
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    {selectedOrder.status !== 'Delivered' && (
                      <TouchableOpacity onPress={() => handleUpdateStatus('Delivered')} style={[styles.stateBtn, { backgroundColor: '#10B981' }]}>
                        <Text style={styles.stateBtnText}>Mark Delivered</Text>
                      </TouchableOpacity>
                    )}
                    {selectedOrder.status !== 'Cancelled' && (
                      <TouchableOpacity onPress={() => handleUpdateStatus('Cancelled')} style={[styles.stateBtn, { backgroundColor: '#EF4444' }]}>
                        <Text style={styles.stateBtnText}>Cancel Order</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Notes log */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Activity Notes</Text>
                  {(selectedOrder.notes || []).map((nt, idx) => (
                    <View key={idx} style={styles.noteBlock}>
                      <Text style={styles.noteAuthor}>{nt.author} ({new Date(nt.timestamp).toLocaleDateString()}):</Text>
                      <Text style={styles.noteText}>{nt.text}</Text>
                    </View>
                  ))}
                  
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TextInput style={[styles.input, { flex: 1 }]} value={newNote} onChangeText={setNewNote} placeholder="Add action note..." />
                    <TouchableOpacity onPress={handleAddNote} style={styles.noteBtn}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { textAlign: 'center', color: '#64748b', marginVertical: 24, fontSize: 14 },
  filtersPanel: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', gap: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, paddingHorizontal: 8, fontSize: 14, color: '#0f172a' },
  dropdownsContainer: { flexDirection: 'row', gap: 10 },
  pickerWrapper: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#fff', height: 40, justifyContent: 'center' },
  picker: { width: '100%', fontSize: 13 },
  orderCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderNoText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  invoiceNoText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBadge: { fontSize: 11, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, overflow: 'hidden' },
  cardBody: { gap: 6, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: '#334155', flex: 1 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#f1f5f9' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  pageBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 6, backgroundColor: '#4338CA' },
  pageBtnDisabled: { backgroundColor: '#cbd5e1' },
  pageBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  pageText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, width: '90%', maxWidth: 600, maxHeight: '85%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  label: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, height: 40, fontSize: 13, color: '#0f172a' },
  submitBtn: { backgroundColor: '#4338CA', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 20, marginBottom: 12 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  detailsGroup: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12, marginBottom: 12 },
  detailsTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  detailsText: { fontSize: 13, color: '#334155', marginBottom: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  itemName: { fontSize: 13, color: '#0f172a', flex: 1 },
  itemQty: { fontSize: 12, color: '#64748b' },
  otpBtn: { backgroundColor: '#166534', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  stateBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center' },
  stateBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  noteBlock: { backgroundColor: '#f8fafc', padding: 8, borderRadius: 6, marginBottom: 6 },
  noteAuthor: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  noteText: { fontSize: 12, color: '#334155', marginTop: 2 },
  noteBtn: { backgroundColor: '#4338CA', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }
});
