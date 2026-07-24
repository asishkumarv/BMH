import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Linking, Modal } from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { MapPin, Phone, User, CheckCircle, Clock } from 'lucide-react-native';

export default function OnlineOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrdersAndBoys = async () => {
    try {
      const [ordRes, empRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/online-orders'),
        axios.get('https://napi.bharatmedicalhallplus.com/employees')
      ]);
      if (ordRes.data && ordRes.data.success) {
        setOrders(ordRes.data.data);
      }
      if (empRes.data && empRes.data.success) {
        setDeliveryBoys(empRes.data.data.filter((e) => e.department === 'Delivery' && e.status === 'approved'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndBoys();
    const interval = setInterval(fetchOrdersAndBoys, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleDisburse = async (id) => {
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/online-orders/${id}/status`, {
        status: 'DISBURSED'
      });
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleAssignDelivery = async (orderId, boyId) => {
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/online-orders/${orderId}/assign-delivery`, {
        delivery_boy_id: boyId
      });
      alert('Delivery Boy Assigned Successfully');
      fetchOrdersAndBoys();
      setSelectedOrder(null);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleSavePaymentUpdates = async () => {
    try {
      // Validation check for split
      if (selectedOrder.payment_mode === 'POD' && selectedOrder.pod_payment_mode === 'Split') {
        const cAmt = parseFloat(selectedOrder.cash_amount || 0);
        const oAmt = parseFloat(selectedOrder.online_amount || 0);
        const paidAmt = parseFloat(selectedOrder.paid_amount || 0);
        if (Math.abs((cAmt + oAmt) - paidAmt) > 0.01) {
          alert("Split Cash Portion + UPI Portion must equal Paid Amount!");
          return;
        }
      }

      let authName = 'Employee';
      let modifiedById = null;
      let modifiedByType = 'Employee';

      if (typeof window !== 'undefined') {
        const adminUser = localStorage.getItem('superAdminUser') || localStorage.getItem('subAdminUser');
        const empUser = localStorage.getItem('employeeUser');
        if (adminUser) {
          const auth = JSON.parse(adminUser);
          authName = auth.full_name || authName;
          modifiedById = auth.id;
          modifiedByType = 'Admin';
        } else if (empUser) {
          const auth = JSON.parse(empUser);
          authName = auth.full_name || authName;
          modifiedById = auth.id;
          modifiedByType = 'Employee';
        }
      }

      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/online-orders/${selectedOrder.id}/update`, {
        payment_mode: selectedOrder.payment_mode,
        pod_payment_mode: selectedOrder.pod_payment_mode,
        payment_txn_id: selectedOrder.payment_txn_id,
        cash_amount: selectedOrder.cash_amount,
        online_amount: selectedOrder.online_amount,
        credit_amount: selectedOrder.credit_amount,
        paid_amount: selectedOrder.paid_amount,
        status: selectedOrder.status,
        modified_by_id: modifiedById,
        modified_by_type: modifiedByType,
        modified_by_name: authName
      });

      if (res.data.success) {
        alert('Payment details updated successfully!');
        setSelectedOrder(null);
        fetchOrdersAndBoys();
      }
    } catch (err) {
      alert('Failed to update payment details: ' + (err.response?.data?.message || err.message));
    }
  };

  const openMap = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => alert('Could not open maps'));
    }
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedOrder(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Order #{item.id}</Text>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          {item.delivery_boy_id && (
            <View style={styles.assignedBadge}>
              <Text style={styles.assignedBadgeText}>Assigned</Text>
            </View>
          )}
          <View style={[styles.statusBadge, item.status === 'DISBURSED' ? styles.statusDisbursed : item.status === 'DELIVERED' ? styles.statusDelivered : styles.statusPending]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <User size={16} color="#64748B" style={styles.icon} />
          <Text style={styles.infoText}>{item.patient_name} {item.patient_mobile ? `(${item.patient_mobile})` : ''}</Text>
        </View>
        <View style={styles.infoRow}>
          <MapPin size={16} color="#64748B" style={styles.icon} />
          <Text style={styles.infoText} numberOfLines={1}>{item.manual_address || 'No Address'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Clock size={16} color="#64748B" style={styles.icon} />
          <Text style={styles.infoText}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.totalText}>₹{parseFloat(item.total_amount).toFixed(2)}</Text>
        <Text style={styles.itemsText}>{item.items?.length || 0} items</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Online Orders</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchOrdersAndBoys}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
      ) : orders.length === 0 ? (
        <Text style={styles.noData}>No online orders found.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id.toString()}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {selectedOrder && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%', width: '90%', maxWidth: 600 }]}>
              <Text style={styles.modalTitle}>Order Details #{selectedOrder.id}</Text>
              
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.sectionTitle}>Patient Info</Text>
                <Text style={styles.modalText}>{selectedOrder.patient_name} - {selectedOrder.patient_mobile}</Text>
                <Text style={styles.modalText}>{selectedOrder.manual_address}</Text>

                {selectedOrder.map_lat && (
                  <TouchableOpacity 
                    style={styles.mapBtn} 
                    onPress={() => openMap(selectedOrder.map_lat, selectedOrder.map_lng)}
                  >
                    <MapPin color="#fff" size={18} style={{marginRight: 8}} />
                    <Text style={styles.mapBtnText}>Open Delivery Location in Google Maps</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.sectionTitle}>Items to Pack</Text>
                <FlatList
                  data={selectedOrder.items}
                  keyExtractor={(it, idx) => idx.toString()}
                  renderItem={({item}) => (
                    <View style={styles.itemRow}>
                      <Text style={styles.itemRowName}>{item.itemName}</Text>
                      <Text style={styles.itemRowQty}>Qty: {item.qty}</Text>
                    </View>
                  )}
                  style={styles.itemsList}
                  scrollEnabled={false}
                />

                <Text style={styles.sectionTitle}>Order Status</Text>
                <View style={styles.dropdownWrapper}>
                  <Picker
                    selectedValue={selectedOrder.status}
                    onValueChange={(val) => setSelectedOrder({...selectedOrder, status: val})}
                    style={styles.picker}
                  >
                    <Picker.Item label="Pending" value="Pending" />
                    <Picker.Item label="DISBURSED" value="DISBURSED" />
                    <Picker.Item label="DELIVERED" value="DELIVERED" />
                    <Picker.Item label="Cancelled" value="Cancelled" />
                  </Picker>
                </View>

                <Text style={styles.sectionTitle}>Payment Details</Text>
                <View style={{ backgroundColor: '#f0fdf4', padding: 15, borderRadius: 8 }}>
                   <Text style={{fontSize: 12, color: '#64748b', marginBottom: 4}}>Order Type</Text>
                   <View style={styles.dropdownWrapper}>
                     <Picker
                       selectedValue={selectedOrder.payment_mode === 'Prepaid' ? 'Prepaid' : 'POD'}
                       onValueChange={(val) => {
                         const isPrepaid = val === 'Prepaid';
                         const totalAmt = parseFloat(selectedOrder.total_amount || 0);
                         setSelectedOrder({
                           ...selectedOrder,
                           payment_mode: val,
                           paid_amount: isPrepaid ? totalAmt.toString() : (selectedOrder.paid_amount || '0'),
                           credit_amount: isPrepaid ? 0 : Math.max(0, totalAmt - parseFloat(selectedOrder.paid_amount || 0)),
                           pod_payment_mode: isPrepaid ? 'Online' : (selectedOrder.pod_payment_mode || 'Cash'),
                           cash_amount: isPrepaid ? 0 : (selectedOrder.cash_amount || 0),
                           online_amount: isPrepaid ? totalAmt : (selectedOrder.online_amount || 0)
                         });
                       }}
                       style={styles.picker}
                     >
                       <Picker.Item label="POD" value="POD" />
                       <Picker.Item label="Prepaid" value="Prepaid" />
                     </Picker>
                   </View>

                   {selectedOrder.payment_mode !== 'Prepaid' && (
                     <>
                       <Text style={{fontSize: 12, color: '#64748b', marginBottom: 4, marginTop: 8}}>Payment Type</Text>
                       <View style={styles.dropdownWrapper}>
                         <Picker
                           selectedValue={selectedOrder.pod_payment_mode || 'Cash'}
                           onValueChange={(val) => {
                             const paidAmt = parseFloat(selectedOrder.paid_amount || 0);
                             let cPortion = 0;
                             let oPortion = 0;
                             if (val === 'Cash') {
                               cPortion = paidAmt;
                             } else if (val === 'Online') {
                               oPortion = paidAmt;
                             } else if (val === 'Split') {
                               cPortion = Math.floor(paidAmt / 2);
                               oPortion = paidAmt - cPortion;
                             }
                             setSelectedOrder({
                               ...selectedOrder,
                               pod_payment_mode: val,
                               cash_amount: cPortion,
                               online_amount: oPortion
                             });
                           }}
                           style={styles.picker}
                         >
                           <Picker.Item label="Cash" value="Cash" />
                           <Picker.Item label="UPI" value="Online" />
                           <Picker.Item label="Split" value="Split" />
                         </Picker>
                       </View>

                       <Text style={{fontSize: 12, color: '#64748b', marginBottom: 4, marginTop: 8}}>Paid Amount (₹)</Text>
                       <TextInput 
                         style={styles.input} 
                         placeholder="Paid Amount" 
                         value={selectedOrder.paid_amount !== null && selectedOrder.paid_amount !== undefined ? selectedOrder.paid_amount.toString() : ''} 
                         keyboardType="numeric"
                         onChangeText={t => {
                           const val = parseFloat(t || '0');
                           const totalAmt = parseFloat(selectedOrder.total_amount || 0);
                           let cPortion = 0;
                           let oPortion = 0;
                           const currentMode = selectedOrder.pod_payment_mode || 'Cash';
                           if (currentMode === 'Cash') {
                             cPortion = val;
                           } else if (currentMode === 'Online') {
                             oPortion = val;
                           } else if (currentMode === 'Split') {
                             cPortion = Math.floor(val / 2);
                             oPortion = val - cPortion;
                           }
                           setSelectedOrder({
                             ...selectedOrder,
                             paid_amount: t,
                             cash_amount: cPortion,
                             online_amount: oPortion,
                             credit_amount: Math.max(0, totalAmt - val)
                           });
                         }} 
                       />

                       {selectedOrder.pod_payment_mode === 'Split' && (
                         <View style={{marginTop: 8, padding: 10, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0'}}>
                           <Text style={{fontWeight: '700', fontSize: 13, marginBottom: 5, color: '#334155'}}>Split Breakdown</Text>
                           
                           <Text style={{fontSize: 11, color: '#64748b', marginBottom: 2}}>Cash Portion (₹)</Text>
                           <TextInput 
                             style={[styles.input, {marginBottom:5, height: 35, paddingVertical: 5}]} 
                             value={selectedOrder.cash_amount !== null && selectedOrder.cash_amount !== undefined ? selectedOrder.cash_amount.toString() : ''} 
                             keyboardType="numeric"
                             onChangeText={t => setSelectedOrder({...selectedOrder, cash_amount: t})} 
                           />

                           <Text style={{fontSize: 11, color: '#64748b', marginBottom: 2, marginTop: 4}}>UPI Portion (₹)</Text>
                           <TextInput 
                             style={[styles.input, {marginBottom:5, height: 35, paddingVertical: 5}]} 
                             value={selectedOrder.online_amount !== null && selectedOrder.online_amount !== undefined ? selectedOrder.online_amount.toString() : ''} 
                             keyboardType="numeric"
                             onChangeText={t => setSelectedOrder({...selectedOrder, online_amount: t})} 
                           />

                           {Math.abs((parseFloat(selectedOrder.cash_amount || 0) + parseFloat(selectedOrder.online_amount || 0)) - parseFloat(selectedOrder.paid_amount || 0)) > 0.01 && (
                             <Text style={{color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: '600'}}>
                               ❌ Cash portion + UPI portion must equal Paid Amount!
                             </Text>
                           )}
                         </View>
                       )}
                     </>
                   )}

                   {(selectedOrder.payment_mode === 'Prepaid' || selectedOrder.pod_payment_mode === 'Online' || selectedOrder.pod_payment_mode === 'Split') && (
                     <>
                       <Text style={{fontSize: 12, color: '#64748b', marginBottom: 4, marginTop: 8}}>Transaction ID (UPI/Online)</Text>
                       <TextInput 
                         style={styles.input} 
                         placeholder="e.g. UTR / Ref No" 
                         value={selectedOrder.payment_txn_id || ''} 
                         onChangeText={t => setSelectedOrder({...selectedOrder, payment_txn_id: t})} 
                       />
                     </>
                   )}

                   {selectedOrder.payment_mode !== 'Prepaid' && (
                     <Text style={{fontSize: 13, fontWeight: 'bold', color: '#b45309', marginTop: 8}}>
                       Credit Portion (Unpaid): ₹{selectedOrder.credit_amount !== undefined && selectedOrder.credit_amount !== null ? parseFloat(selectedOrder.credit_amount).toFixed(2) : (parseFloat(selectedOrder.total_amount || 0) - parseFloat(selectedOrder.paid_amount || 0)).toFixed(2)}
                     </Text>
                   )}

                   {selectedOrder.payment_re_edited_by && (
                     <Text style={{fontSize: 13, fontWeight: '700', color: '#dc2626', marginTop: 8}}>
                       ⚠️ Re-edited by: {selectedOrder.payment_re_edited_by}
                     </Text>
                   )}
                </View>

                {selectedOrder.status !== 'DISBURSED' && selectedOrder.status !== 'DELIVERED' && !selectedOrder.delivery_boy_id && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Assign Delivery Boy:</Text>
                    <View style={styles.dropdownWrapper}>
                      <Picker
                        selectedValue=""
                        onValueChange={(val) => {
                          if (val) handleAssignDelivery(selectedOrder.id, val);
                        }}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select a delivery boy..." value="" />
                        {deliveryBoys.map((boy) => (
                          <Picker.Item key={boy.id} label={boy.full_name} value={boy.id} />
                        ))}
                      </Picker>
                    </View>
                    {deliveryBoys.length === 0 && <Text style={{fontSize: 12, color: '#DC2626'}}>No approved delivery boys found</Text>}
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedOrder(null)}>
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.disburseBtn} onPress={handleSavePaymentUpdates}>
                  <CheckCircle color="#fff" size={18} style={{marginRight: 6}} />
                  <Text style={styles.disburseBtnText}>Save Updates</Text>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  refreshBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  refreshBtnText: { color: '#3B82F6', fontWeight: 'bold' },
  listContainer: { padding: 16 },
  noData: { textAlign: 'center', marginTop: 50, color: '#64748B', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusDisbursed: { backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#1E293B' },
  cardBody: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  icon: { marginRight: 8 },
  infoText: { fontSize: 14, color: '#475569' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  totalText: { fontSize: 16, fontWeight: 'bold', color: '#10B981' },
  itemsText: { fontSize: 14, color: '#64748B' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginTop: 16, marginBottom: 8 },
  modalText: { fontSize: 15, color: '#475569', marginBottom: 4 },
  mapBtn: { backgroundColor: '#4285F4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, marginTop: 12 },
  mapBtnText: { color: '#fff', fontWeight: 'bold' },
  itemsList: { maxHeight: 200, borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 8, padding: 8, marginTop: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  itemRowName: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' },
  itemRowQty: { fontSize: 14, color: '#64748B', fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 12 },
  cancelBtnText: { color: '#64748B', fontWeight: 'bold' },
  disburseBtn: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, height: 40, alignSelf: 'flex-end' },
  disburseBtnText: { color: '#fff', fontWeight: 'bold' },
  statusDelivered: { backgroundColor: '#60A5FA' },
  assignedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#E0E7FF' },
  assignedBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#4338CA' },
  dropdownWrapper: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  picker: {
    height: 40,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    color: '#1e293b',
    ...Platform.select({ web: { outlineStyle: 'none' } })
  }
});
