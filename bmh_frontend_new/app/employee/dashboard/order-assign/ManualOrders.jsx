import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Modal, TextInput, useWindowDimensions, Image, ScrollView } from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { Package, MapPin, Bus, User, Map, CheckCircle, Search, Calendar, FileText, Plus, Eye, Share2, Phone, Navigation } from 'lucide-react-native';

export default function ManualOrders({ deliveryBoys }) {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('All'); 
  const [selectedDate, setSelectedDate] = useState('');

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editAddress, setEditAddress] = useState('');
  const [newNote, setNewNote] = useState('');
  
  // Patient auto-fill state
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');

  // Create Form State
  const [formData, setFormData] = useState({
    customer_phone: '',
    customer_name: '',
    ship_to_phone: '',
    ship_to_name: '',
    address: '',
    location_link: '',
    order_no: '',
    invoice_no: '',
    amount: '',
    delivery_charge: '',
    mode_of_delivery: 'Counter',
    order_date: new Date().toISOString().split('T')[0],
    order_time: new Date().toTimeString().substring(0,5),
    notes: ''
  });

  const fetchManualOrders = async () => {
    try {
      setLoading(true);
      let url = 'https://napi.bharatmedicalhallplus.com/manual-orders';
      const params = [];
      if (assignmentFilter !== 'All') params.push(`status=${assignmentFilter}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      
      const res = await axios.get(url);
      if (res.data && res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManualOrders();
  }, [assignmentFilter]);

  const handlePatientSearch = async (text) => {
    setPatientSearch(text);
    if (text.length >= 10) {
      try {
        const res = await axios.get(`https://napi.bharatmedicalhallplus.com/patient/by-mobile/${text}`);
        if (res.data && res.data.success) {
          const p = res.data.data;
          let defaultAddress = p.addresses && p.addresses.length > 0 ? p.addresses[0].address : '';
          let defaultLink = p.addresses && p.addresses.length > 0 ? p.addresses[0].location_link : '';
          setFormData({
            ...formData,
            customer_phone: p.mobile,
            customer_name: p.name,
            ship_to_phone: p.mobile,
            ship_to_name: p.name,
            address: defaultAddress,
            location_link: defaultLink
          });
        }
      } catch (e) {
        setFormData({ ...formData, customer_phone: text });
      }
    } else {
      setFormData({ ...formData, customer_phone: text });
    }
  };

  const handleCreateSubmit = async () => {
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/manual-orders', formData);
      if (res.data.success) {
        alert('Order created successfully!');
        setCreateModalVisible(false);
        fetchManualOrders();
      }
    } catch (err) {
      alert('Failed to create order');
    }
  };

  const handleUpdateOrderDetails = async () => {
    if (!selectedOrder) return;
    try {
      const authCookie = Cookies.get('auth_employee');
      const auth = authCookie ? JSON.parse(authCookie) : null;
      await axios.put(`https://napi.bharatmedicalhallplus.com/manual-orders/${selectedOrder.id}`, {
        address: editAddress,
        new_note: newNote,
        note_author: auth ? auth.full_name : 'Employee'
      });
      alert('Order updated successfully!');
      setNewNote('');
      fetchManualOrders();
      setViewModalVisible(false);
    } catch (err) {
      alert('Failed to update order');
    }
  };

  const handleAssignBoy = async (orderId, boyId) => {
    if (!boyId) return;
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/manual-orders/${orderId}`, {
        delivery_boy_id: boyId,
        status: 'Assigned'
      });
      fetchManualOrders();
    } catch (err) {
      alert('Failed to assign boy');
    }
  };

  const renderOrderItem = ({ item, index }) => {
    // Determine the status badge color
    let statusColor = '#3b82f6';
    if (item.status === 'Assigned') statusColor = '#f59e0b';
    else if (item.status === 'Completed' || item.status === 'Delivered') statusColor = '#10b981';
    
    // Created By parsing
    let creatorImg = null;
    try {
      if (item.admin_creator_profile) creatorImg = item.admin_creator_profile;
      else if (item.creator_profile) {
        const prof = typeof item.creator_profile === 'string' ? JSON.parse(item.creator_profile) : item.creator_profile;
        creatorImg = prof.image;
      }
    } catch(e){}

    let boyImg = null;
    try {
      if (item.delivery_boy_profile) {
        const prof = typeof item.delivery_boy_profile === 'string' ? JSON.parse(item.delivery_boy_profile) : item.delivery_boy_profile;
        boyImg = prof.image;
      }
    } catch(e){}

    return (
      <View style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff' }]}>
        {/* Status */}
        <View style={[styles.cell, { flex: 0.8, flexDirection: 'row', alignItems: 'center' }]}>
          {item.mode_of_delivery === 'Bus' ? <Bus size={16} color="#64748b" style={{marginRight: 4}}/> : 
           item.mode_of_delivery === 'Local' ? <MapPin size={16} color="#64748b" style={{marginRight: 4}}/> :
           <Package size={16} color="#64748b" style={{marginRight: 4}}/>}
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        
        {/* Customer */}
        <View style={[styles.cell, { flex: 1.5 }]}>
          <Text style={styles.cellTextBold}>{item.customer_name}</Text>
          <Text style={styles.cellSubText}>{item.customer_phone}</Text>
        </View>
        
        {/* Order/Invoice No */}
        <View style={[styles.cell, { flex: 1 }]}>
          <Text style={styles.cellTextBold}>{item.order_no}</Text>
          <Text style={styles.cellSubText}>{item.invoice_no}</Text>
        </View>
        
        {/* Delivery Boy */}
        <View style={[styles.cell, { flex: 1.5 }]}>
          {item.delivery_boy_id ? (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
               {boyImg ? <Image source={{uri: boyImg}} style={styles.avatar} /> : <User size={20} color="#94a3b8" style={{marginRight: 4}}/>}
               <Text style={styles.cellText} numberOfLines={1}>{item.delivery_boy_name}</Text>
            </View>
          ) : (
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={''}
                onValueChange={(val) => handleAssignBoy(item.id, val)}
                style={styles.inlinePicker}
              >
                <Picker.Item label="Assign To" value="" />
                {deliveryBoys.map(boy => (
                  <Picker.Item key={boy.id} label={boy.full_name} value={boy.id} />
                ))}
              </Picker>
            </View>
          )}
        </View>

        {/* Charge/Amount */}
        <View style={[styles.cell, { flex: 1 }]}>
          <Text style={styles.cellText}>₹{item.delivery_charge || 0}</Text>
          <Text style={styles.cellTextBold}>₹{item.amount || 0}</Text>
        </View>
        
        {/* Date/Time */}
        <View style={[styles.cell, { flex: 1 }]}>
          <Text style={styles.cellText}>{item.order_date ? item.order_date.substring(0,10) : ''}</Text>
          <Text style={styles.cellSubText}>{item.order_time}</Text>
        </View>
        
        {/* Created By */}
        <View style={[styles.cell, { flex: 1.2, flexDirection: 'row', alignItems: 'center' }]}>
           {creatorImg ? <Image source={{uri: creatorImg}} style={styles.avatar} /> : <User size={20} color="#94a3b8" style={{marginRight: 4}}/>}
           <Text style={styles.cellText} numberOfLines={1}>{item.admin_creator_name || item.creator_name}</Text>
        </View>
        
        {/* Actions */}
        <View style={[styles.cell, { flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'center' }]}>
          <TouchableOpacity onPress={() => { 
              setSelectedOrder(item); 
              setEditAddress(item.address || '');
              setNewNote('');
              setViewModalVisible(true); 
            }} style={[styles.actionBtn, {backgroundColor: '#e0e7ff'}]}>
             <Eye size={16} color="#4338ca" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.filters}>
          <View style={styles.searchContainer}>
            <Search size={18} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <View style={styles.dropdownWrapper}>
            <Picker
              selectedValue={assignmentFilter}
              onValueChange={(val) => setAssignmentFilter(val)}
              style={styles.picker}
            >
              <Picker.Item label="Select Status" value="All" />
              <Picker.Item label="Pending" value="Pending" />
              <Picker.Item label="Assigned" value="Assigned" />
              <Picker.Item label="Delivered" value="Delivered" />
            </Picker>
          </View>
        </View>
        
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModalVisible(true)}>
          <Plus size={18} color="#fff" style={{marginRight: 6}} />
          <Text style={styles.addBtnText}>Add Orders</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tableContainer}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { flex: 0.8 }]}>Status</Text>
          <Text style={[styles.headerText, { flex: 1.5 }]}>Customer</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Order No</Text>
          <Text style={[styles.headerText, { flex: 1.5 }]}>Delivery Boy</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Amount</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Date / Time</Text>
          <Text style={[styles.headerText, { flex: 1.2 }]}>Created By</Text>
          <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>Actions</Text>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#4338ca" style={{marginTop: 50}} />
        ) : (
          <FlatList
            data={orders.filter(o => 
              o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
              o.customer_phone?.includes(searchQuery) ||
              o.order_no?.includes(searchQuery)
            )}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderOrderItem}
          />
        )}
      </View>

      {/* Create Order Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: isDesktop ? 800 : '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Order</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}><Text style={{fontSize:20, color:'#64748b'}}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Customer Phone No</Text>
                  <TextInput style={styles.input} value={formData.customer_phone} onChangeText={handlePatientSearch} placeholder="Phone No" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Customer Name</Text>
                  <TextInput style={styles.input} value={formData.customer_name} onChangeText={(t) => setFormData({...formData, customer_name: t})} placeholder="Name" />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Ship to Phone No</Text>
                  <TextInput style={styles.input} value={formData.ship_to_phone} onChangeText={(t) => setFormData({...formData, ship_to_phone: t})} placeholder="Ship Phone" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Ship to Name</Text>
                  <TextInput style={styles.input} value={formData.ship_to_name} onChangeText={(t) => setFormData({...formData, ship_to_name: t})} placeholder="Ship Name" />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Address</Text>
                  <TextInput style={styles.input} value={formData.address} onChangeText={(t) => setFormData({...formData, address: t})} placeholder="Full Address" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Delivery Location Link</Text>
                  <TextInput style={styles.input} value={formData.location_link} onChangeText={(t) => setFormData({...formData, location_link: t})} placeholder="Google Maps URL" />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Order No</Text>
                  <TextInput style={styles.input} value={formData.order_no} onChangeText={(t) => setFormData({...formData, order_no: t})} placeholder="Order No" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Invoice No</Text>
                  <TextInput style={styles.input} value={formData.invoice_no} onChangeText={(t) => setFormData({...formData, invoice_no: t})} placeholder="Invoice No" />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput style={styles.input} value={formData.amount} onChangeText={(t) => setFormData({...formData, amount: t})} placeholder="Amount" keyboardType="numeric" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Mode of Delivery</Text>
                  <View style={styles.dropdownWrapper}>
                    <Picker
                      selectedValue={formData.mode_of_delivery}
                      onValueChange={(val) => setFormData({...formData, mode_of_delivery: val})}
                      style={styles.picker}
                    >
                      <Picker.Item label="Counter" value="Counter" />
                      <Picker.Item label="Local" value="Local" />
                      <Picker.Item label="Bus" value="Bus" />
                    </Picker>
                  </View>
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Delivery Charge</Text>
                  <TextInput style={styles.input} value={formData.delivery_charge} onChangeText={(t) => setFormData({...formData, delivery_charge: t})} placeholder="Charge" keyboardType="numeric" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Order Date</Text>
                  <TextInput style={styles.input} value={formData.order_date} onChangeText={(t) => setFormData({...formData, order_date: t})} placeholder="YYYY-MM-DD" />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Order Time</Text>
                  <TextInput style={styles.input} value={formData.order_time} onChangeText={(t) => setFormData({...formData, order_time: t})} placeholder="HH:MM" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Notes</Text>
                  <TextInput style={[styles.input, {height: 60}]} multiline value={formData.notes} onChangeText={(t) => setFormData({...formData, notes: t})} placeholder="Initial Notes..." />
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateSubmit}>
                <Text style={styles.saveBtnText}>Save Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Details Modal */}
      {selectedOrder && (
      <Modal visible={viewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: isDesktop ? 600 : '95%', padding: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details ({selectedOrder.order_no})</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}><Text style={{fontSize:20, color:'#64748b'}}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={{marginTop: 15, maxHeight: 500}}>
               <View style={{flexDirection:'row', flexWrap:'wrap', gap: 15}}>
                 <Text><Text style={{fontWeight:'bold'}}>Status:</Text> {selectedOrder.status}</Text>
                 <Text><Text style={{fontWeight:'bold'}}>Customer:</Text> {selectedOrder.customer_name} ({selectedOrder.customer_phone})</Text>
                 <Text><Text style={{fontWeight:'bold'}}>Amount:</Text> ₹{selectedOrder.amount}</Text>
                 <Text><Text style={{fontWeight:'bold'}}>Mode:</Text> {selectedOrder.mode_of_delivery}</Text>
                 {selectedOrder.delivery_otp && <Text><Text style={{fontWeight:'bold'}}>OTP:</Text> {selectedOrder.delivery_otp}</Text>}
               </View>

               {selectedOrder.mode_of_delivery === 'Bus' && (
                 <View style={{marginTop: 20, backgroundColor: '#f8fafc', padding: 15, borderRadius: 8}}>
                    <Text style={{fontWeight:'bold', marginBottom: 10}}>Bus Info</Text>
                    <Text>Travels: {selectedOrder.bus_travels_name || 'N/A'}</Text>
                    <Text>Driver: {selectedOrder.bus_driver_name || 'N/A'} ({selectedOrder.bus_driver_number || 'N/A'})</Text>
                    <Text>Bus No: {selectedOrder.bus_number || 'N/A'}</Text>
                    <Text>Dispatch: {selectedOrder.dispatch_time || 'N/A'}</Text>
                    <Text>Est Arrival: {selectedOrder.est_reach_time || 'N/A'}</Text>
                 </View>
               )}

               {(selectedOrder.payment_mode || selectedOrder.paid_amount) && (
                 <View style={{marginTop: 20, backgroundColor: '#f0fdf4', padding: 15, borderRadius: 8}}>
                    <Text style={{fontWeight:'bold', marginBottom: 10}}>Payment Info</Text>
                    <Text>Mode: {selectedOrder.payment_mode}</Text>
                    <Text>Amount: ₹{selectedOrder.paid_amount}</Text>
                    <Text>Txn ID: {selectedOrder.payment_txn_id || 'N/A'}</Text>
                    {selectedOrder.payment_attachment && <Image source={{uri: `https://napi.bharatmedicalhallplus.com${selectedOrder.payment_attachment}`}} style={{width: 100, height: 100, marginTop: 10}}/>}
                 </View>
               )}

               <View style={{marginTop: 20}}>
                 <Text style={{fontWeight:'bold', marginBottom: 10}}>Address Info</Text>
                 <TextInput 
                   style={styles.input} 
                   value={editAddress} 
                   onChangeText={setEditAddress} 
                   multiline 
                 />
                 {selectedOrder.location_link && (
                   <Text style={{color: '#3b82f6', marginTop: 5}} onPress={() => Platform.OS==='web'?window.open(selectedOrder.location_link,'_blank'):Linking.openURL(selectedOrder.location_link)}>
                     Open Location Link
                   </Text>
                 )}
               </View>

               <View style={{marginTop: 20}}>
                 <Text style={{fontWeight:'bold', marginBottom: 10}}>Notes</Text>
                 <View style={{backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8}}>
                    {selectedOrder.notes && (typeof selectedOrder.notes === 'string' ? JSON.parse(selectedOrder.notes) : selectedOrder.notes).map((n, i) => (
                      <View key={i} style={{marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderColor: '#e2e8f0'}}>
                        <Text style={{fontSize: 12, color: '#64748b'}}>{n.author} at {new Date(n.timestamp).toLocaleString()}</Text>
                        <Text style={{fontSize: 14, color: '#1e293b', marginTop: 2}}>{n.text}</Text>
                      </View>
                    ))}
                    <TextInput
                      style={[styles.input, {marginTop: 10, backgroundColor: '#fff'}]}
                      placeholder="Add a new note..."
                      value={newNote}
                      onChangeText={setNewNote}
                    />
                 </View>
               </View>

            </ScrollView>
            <View style={styles.modalFooter}>
               <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateOrderDetails}>
                 <Text style={styles.saveBtnText}>Save Updates</Text>
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
  container: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  filters: { flexDirection: 'row', gap: 12, flex: 1, flexWrap: 'wrap' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, height: 40, width: 250 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', outlineStyle: 'none' },
  dropdownWrapper: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#fff', height: 40, justifyContent: 'center', minWidth: 160 },
  picker: { height: 40, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 8, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  tableContainer: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', padding: 16, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  tableRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  cell: { paddingRight: 8 },
  cellText: { fontSize: 14, color: '#334155' },
  cellTextBold: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  cellSubText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#fff', textTransform: 'capitalize' },
  avatar: { width: 24, height: 24, borderRadius: 12, marginRight: 6 },
  pickerWrapper: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, backgroundColor: '#fff', height: 32, justifyContent: 'center' },
  inlinePicker: { height: 32, fontSize: 13, borderWidth: 0, backgroundColor: 'transparent', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  actionBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '90%', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  modalBody: { flex: 1 },
  formRow: { flexDirection: 'row', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  formCol: { flex: 1, minWidth: 200 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#f8fafc' },
  modalFooter: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16, marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end' },
  saveBtn: { backgroundColor: '#1e293b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});
