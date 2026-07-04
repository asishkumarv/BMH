import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Linking, Alert, Modal, TextInput, ScrollView } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { MapPin, Phone, User, CheckCircle, Clock, Package, Navigation } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [locationStatus, setLocationStatus] = useState('Initializing...');
  const [busModalVisible, setBusModalVisible] = useState(false);
  const [selectedBusOrder, setSelectedBusOrder] = useState<any>(null);
  const [busDetails, setBusDetails] = useState({
    bus_number: '', arrival_time: '', driver_name: '', driver_number: '', waybill_number: '', drop_location: ''
  });
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentTxnId, setPaymentTxnId] = useState('');
  const [paymentImage, setPaymentImage] = useState<any>(null);
  const [currentOrder, setCurrentOrder] = useState({ id: '', type: '', amount: '', payment_mode: '' });
  const [alarmSound, setAlarmSound] = useState<Audio.Sound | null>(null);
  useEffect(() => {
    let interval: any;
    if (user) {
      interval = setInterval(() => {
        fetchOrders(user.id);
      }, 5000); // Check every 15 seconds
    }
    return () => clearInterval(interval);
  }, [user, orders]);

  useEffect(() => {
    const init = async () => {
      try {
        let storedUser;
        if (Platform.OS === 'web') {
          storedUser = JSON.parse(localStorage.getItem('employeeUser') || 'null');
        } else {
          const u = await AsyncStorage.getItem('employeeUser');
          storedUser = u ? JSON.parse(u) : null;
        }
        setUser(storedUser);
        if (storedUser) {
          fetchOrders(storedUser.id);
          startLocationTracking(storedUser.id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  const fetchOrders = async (userId: string | number) => {
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/employees/${userId}/assigned-orders`);
      if (res.data && res.data.success) {
        // If we have more orders now than before, it means a new order was assigned
        if (orders.length > 0 && res.data.data.length > orders.length) {
           try {
             const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
                { isLooping: true, shouldPlay: true }
             );
             setAlarmSound(sound);
             alert("🔔 New Delivery Assigned!");
           } catch (e) { console.log("Audio play failed:", e); }
        }
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async (userId: string | number) => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationStatus('Permission denied');
      return;
    }

    setLocationStatus('Tracking Active');

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,
        distanceInterval: 10,
      },
      async (location) => {
        try {
          await axios.put(`https://napi.bharatmedicalhallplus.com/employees/${userId}/location`, {
            lat: location.coords.latitude,
            lng: location.coords.longitude
          });
        } catch (err) {
          console.log("Failed to update location to server");
        }
      }
    );
  };

  const handleMarkDelivered = async (orderId: string | number, type: string, deliveryType: string, amount: string = '', paymentMode: string = '') => {
    if ((type === 'online_order' || type === 'sales_order' || type === 'manual_order') && deliveryType === 'Local') {
      setCurrentOrder({ id: String(orderId), type, amount: String(amount), payment_mode: paymentMode });
      setDeliveryOtp('');
      setPaymentMode('Cash');
      setPaidAmount(String(amount));
      setPaymentTxnId('');
      setPaymentImage(null);
      setOtpModalVisible(true);
      return;
    }

    if (Platform.OS !== 'web') {
      Alert.alert(
        "Confirm Delivery",
        "Are you sure you want to mark this as Delivered?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes", onPress: () => processDelivery(orderId, type) }
        ]
      );
    } else {
      if (window.confirm("Are you sure you want to mark this as Delivered?")) {
        processDelivery(orderId, type);
      }
    }
  };
  const handleUpdateStatus = async (orderId: string | number, type: string, newStatus: string) => {
    try {
      if (type === 'manual_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/manual-orders/${orderId}`, {
          status: newStatus
        });
        if (user) fetchOrders(user.id);
      } else {
        alert("Status updates not yet supported for this order type.");
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const processDelivery = async (orderId: string | number, type: string, otp?: string) => {
    try {
      if (type === 'online_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/online-orders/${orderId}/status`, {
          status: 'DELIVERED',
          delivery_otp: otp
        });
      } else if (type === 'sales_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/sales-order/${orderId}/status`, {
          status: 'DELIVERED',
          delivery_otp: otp
        });
      } else if (type === 'manual_order') {
        const payload: any = {
          status: 'Delivered',
          delivery_otp: otp,
          payment_mode: paymentMode,
          paid_amount: paidAmount,
          payment_txn_id: paymentTxnId
        };
        // For image upload, if we want to use form data we should implement it, but for now we send raw json without image since it's complex via put in this generic function.
        await axios.put(`https://napi.bharatmedicalhallplus.com/manual-orders/${orderId}`, payload);
      } else {
        alert('Ecogreen Order Delivered (Status update pending backend implementation)');
      }
      alert('Order Marked as Delivered!');
      setOtpModalVisible(false);
      if (user) fetchOrders(user.id);
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenBusDetails = (order: any) => {
    setSelectedBusOrder(order);
    if (order.bus_details) {
      let parsed = order.bus_details;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch(e) {}
      }
      setBusDetails(parsed || { bus_number: '', arrival_time: '', driver_name: '', driver_number: '', waybill_number: '', drop_location: '' });
    } else {
      setBusDetails({ bus_number: '', arrival_time: '', driver_name: '', driver_number: '', waybill_number: '', drop_location: '' });
    }
    setBusModalVisible(true);
  };

  const handleSaveBusDetails = async () => {
    if (!selectedBusOrder) return;
    try {
      let url = '';
      let payload: any = { bus_details: busDetails };

      if (selectedBusOrder.type === 'manual_order') {
        url = `https://napi.bharatmedicalhallplus.com/manual-orders/${selectedBusOrder.id}`;
        payload = {
          bus_number: busDetails.bus_number,
          bus_driver_name: busDetails.driver_name,
          bus_driver_number: busDetails.driver_number,
          est_reach_time: busDetails.arrival_time,
          bus_travels_name: busDetails.waybill_number
        };
      } else if (selectedBusOrder.type === 'sales_order') {
        url = `https://napi.bharatmedicalhallplus.com/sales-order/${selectedBusOrder.id}/update-bus-details`;
      } else if (selectedBusOrder.type === 'sales_invoice' || selectedBusOrder.type === 'ecogreen_invoice') {
        url = `https://napi.bharatmedicalhallplus.com/sales-invoice-list/${selectedBusOrder.id}/update-bus-details`;
      } else {
        alert("Cannot update bus details for this order type");
        return;
      }
      
      const res = await axios.put(url, payload);
      if (res.data) {
        alert("Bus Details Saved!");
        setBusModalVisible(false);
        if (user) fetchOrders(user.id);
      }
    } catch (err: any) {
      alert("Failed to save bus details: " + err.message);
    }
  };

  const openMap = (lat: any, lng: any, address: string, locationLink?: string) => {
    let url = '';
    
    if (locationLink && (locationLink.startsWith('http://') || locationLink.startsWith('https://'))) {
      url = locationLink;
    } else if (address && (address.startsWith('http://') || address.startsWith('https://'))) {
      url = address;
    } else if (lat && lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else if (address) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    } else {
      alert('No location data available');
      return;
    }

    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => alert('Could not open maps'));
    }
  };

  const stopAlarm = async () => {
    if (alarmSound) {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
      setAlarmSound(null);
    }
  };

  const renderOrder = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
          <View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Text style={styles.orderTypeBadge}>
                {item.type === 'online_order' ? 'Online App Order' : item.type === 'sales_order' ? 'Ecogreen Sales Order' : item.type === 'purchase_order' ? 'Ecogreen Purchase Order' : 'Ecogreen Invoice'}
              </Text>
              {item.delivery_type === 'Bus' && (
                <View style={[styles.orderTypeBadge, {backgroundColor: '#FEF3C7'}]}>
                  <Text style={{fontSize: 10, fontWeight: 'bold', color: '#B45309'}}>🚌 BUS DELIVERY</Text>
                </View>
              )}
            </View>
            <Text style={styles.orderId}>Order #{item.id}</Text>
          </View>
        <View style={[styles.statusBadge, item.status === 'DELIVERED' ? styles.statusDelivered : styles.statusPending]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <User size={16} color="#64748B" style={styles.icon} />
          <Text style={styles.infoText}>{item.patient_name} {item.mobile_no ? `(${item.mobile_no})` : ''}</Text>
        </View>
        <View style={styles.infoRow}>
          <MapPin size={16} color="#64748B" style={styles.icon} />
          <Text style={styles.infoText} numberOfLines={2}>{item.address || 'No Address Provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Clock size={16} color="#64748B" style={styles.icon} />
          <Text style={styles.infoText}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        <Text style={styles.totalText}>Total: ₹{parseFloat(item.total_amount || 0).toFixed(2)}</Text>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity 
          style={styles.mapBtn} 
          onPress={() => openMap(item.map_lat, item.map_lng, item.address, item.location_link)}
        >
          <MapPin color="#3B82F6" size={16} style={{marginRight: 6}} />
          <Text style={styles.mapBtnText}>Navigate</Text>
        </TouchableOpacity>

        {item.delivery_type === 'Bus' && item.type !== 'purchase_order' && (
             <TouchableOpacity 
               style={[styles.mapBtn, {backgroundColor: '#FFFBEB', borderColor: '#FDE68A'}]} 
               onPress={() => handleOpenBusDetails(item)}
             >
               <Package color="#D97706" size={16} style={{marginRight: 6}} />
               <Text style={[styles.mapBtnText, {color: '#D97706'}]}>Bus Info</Text>
             </TouchableOpacity>
          )}
          {item.delivery_type === 'Bus' && item.type === 'purchase_order' && (
             <TouchableOpacity 
               style={[styles.mapBtn, {backgroundColor: '#F0FDF4', borderColor: '#BBF7D0'}]} 
               onPress={() => handleOpenBusDetails(item)}
             >
               <Package color="#16A34A" size={16} style={{marginRight: 6}} />
               <Text style={[styles.mapBtnText, {color: '#16A34A'}]}>View Bus</Text>
             </TouchableOpacity>
          )}

          {item.type === 'manual_order' && item.status === 'Assigned' && (
            <TouchableOpacity 
              style={[styles.deliverBtn, {backgroundColor: '#F59E0B'}]} 
              onPress={() => handleUpdateStatus(item.id, item.type, 'Picked Up')}
            >
              <Package color="#fff" size={16} style={{marginRight: 6}} />
              <Text style={styles.deliverBtnText}>Pickup</Text>
            </TouchableOpacity>
          )}

          {item.type === 'manual_order' && item.status === 'Picked Up' && (
            <TouchableOpacity 
              style={[styles.deliverBtn, {backgroundColor: '#3B82F6'}]} 
              onPress={() => handleUpdateStatus(item.id, item.type, 'Out for Delivery')}
            >
              <Navigation color="#fff" size={16} style={{marginRight: 6}} />
              <Text style={styles.deliverBtnText}>Start</Text>
            </TouchableOpacity>
          )}

          {((item.type === 'manual_order' && item.status === 'Out for Delivery') || 
            (item.type !== 'manual_order' && item.status?.toLowerCase() !== 'delivered' && item.type !== 'purchase_order')) && (
            <TouchableOpacity 
            style={styles.deliverBtn} 
            onPress={() => handleMarkDelivered(item.id, item.type, item.delivery_type, item.total_amount, item.payment_mode)}
            >
              <CheckCircle color="#fff" size={16} style={{marginRight: 6}} />
              <Text style={styles.deliverBtnText}>Mark Delivered</Text>
            </TouchableOpacity>
          )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Welcome, {user?.full_name}</Text>
          <Text style={styles.subtitle}>GPS: {locationStatus}</Text>
        </View>
        <View style={{flexDirection:'row', gap: 10}}>
          {alarmSound && (
            <TouchableOpacity style={[styles.refreshBtn, {backgroundColor: '#ef4444'}]} onPress={stopAlarm}>
              <Text style={[styles.refreshBtnText, {color: '#fff'}]}>Stop Alarm</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={() => user && fetchOrders(user.id)}>
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
      ) : orders.length === 0 ? (
        <View style={styles.noDataContainer}>
          <Package size={48} color="#CBD5E1" />
          <Text style={styles.noData}>No orders assigned to you yet.</Text>
          <Text style={styles.noDataSub}>We will notify you when a new order arrives.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => `${item.type}-${item.id}`}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={busModalVisible}
        onRequestClose={() => setBusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedBusOrder?.type === 'purchase_order' ? 'Bus Pickup Details' : 'Enter Bus Delivery Details'}
            </Text>
            
            <ScrollView style={{width: '100%', maxHeight: '70%'}}>
              <Text style={styles.label}>Bus Number</Text>
              <TextInput style={styles.input} value={busDetails.bus_number} onChangeText={t => setBusDetails(p => ({...p, bus_number: t}))} editable={selectedBusOrder?.type !== 'purchase_order'} />
              
              <Text style={styles.label}>Reach Time / Incoming Time</Text>
              <TextInput style={styles.input} value={busDetails.arrival_time} onChangeText={t => setBusDetails(p => ({...p, arrival_time: t}))} editable={selectedBusOrder?.type !== 'purchase_order'} />
              
              <Text style={styles.label}>Driver Name</Text>
              <TextInput style={styles.input} value={busDetails.driver_name} onChangeText={t => setBusDetails(p => ({...p, driver_name: t}))} editable={selectedBusOrder?.type !== 'purchase_order'} />
              
              <Text style={styles.label}>Driver Number</Text>
              <TextInput style={styles.input} value={busDetails.driver_number} onChangeText={t => setBusDetails(p => ({...p, driver_number: t}))} editable={selectedBusOrder?.type !== 'purchase_order'} />
              
              <Text style={styles.label}>Waybill Number</Text>
              <TextInput style={styles.input} value={busDetails.waybill_number} onChangeText={t => setBusDetails(p => ({...p, waybill_number: t}))} editable={selectedBusOrder?.type !== 'purchase_order'} />
              
              <Text style={styles.label}>Drop Location</Text>
              <TextInput style={styles.input} value={busDetails.drop_location} onChangeText={t => setBusDetails(p => ({...p, drop_location: t}))} editable={selectedBusOrder?.type !== 'purchase_order'} />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBusModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
              {selectedBusOrder?.type !== 'purchase_order' && (
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBusDetails}>
                  <Text style={styles.saveBtnText}>Save Details</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={otpModalVisible}
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delivery Verification</Text>
            
            <ScrollView>
              <Text style={styles.label}>Ask the customer for the 4-digit delivery OTP</Text>
              <TextInput 
                style={[styles.input, { fontSize: 24, letterSpacing: 5, textAlign: 'center', paddingVertical: 15 }]} 
                value={deliveryOtp} 
                onChangeText={setDeliveryOtp} 
                keyboardType="number-pad"
                maxLength={4}
                placeholder="0000"
              />

              {currentOrder.type === 'manual_order' && currentOrder.payment_mode !== 'Prepaid' && (
                <>
                  <Text style={[styles.label, {marginTop: 20}]}>Payment Mode</Text>
                  <View style={{flexDirection:'row', gap:10, marginBottom: 10}}>
                     <TouchableOpacity 
                        style={{flex:1, padding:10, borderWidth:1, borderColor: paymentMode==='Cash'?'#10B981':'#CBD5E1', borderRadius:8, backgroundColor: paymentMode==='Cash'?'#D1FAE5':'#fff'}}
                        onPress={()=>setPaymentMode('Cash')}
                     >
                       <Text style={{textAlign:'center', fontWeight:'bold', color: paymentMode==='Cash'?'#065F46':'#475569'}}>Cash</Text>
                     </TouchableOpacity>
                     <TouchableOpacity 
                        style={{flex:1, padding:10, borderWidth:1, borderColor: paymentMode==='Online'?'#3B82F6':'#CBD5E1', borderRadius:8, backgroundColor: paymentMode==='Online'?'#DBEAFE':'#fff'}}
                        onPress={()=>setPaymentMode('Online')}
                     >
                       <Text style={{textAlign:'center', fontWeight:'bold', color: paymentMode==='Online'?'#1E40AF':'#475569'}}>Online / UPI</Text>
                     </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Paid Amount (₹)</Text>
                  <TextInput style={styles.input} value={paidAmount} onChangeText={setPaidAmount} keyboardType="numeric" />

                  {paymentMode === 'Online' && (
                    <>
                      <Text style={styles.label}>Transaction ID</Text>
                      <TextInput style={styles.input} value={paymentTxnId} onChangeText={setPaymentTxnId} placeholder="e.g. UTR / Ref No" />
                    </>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setOtpModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, deliveryOtp.length !== 4 && { opacity: 0.5 }]} 
                onPress={() => processDelivery(currentOrder.id, currentOrder.type, deliveryOtp)}
                disabled={deliveryOtp.length !== 4}
              >
                <Text style={styles.saveBtnText}>Verify & Mark Delivered</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#10B981', marginTop: 4, fontWeight: '600' },
  refreshBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, height: 40, justifyContent: 'center' },
  refreshBtnText: { color: '#3B82F6', fontWeight: 'bold' },
  listContainer: { padding: 16 },
  noDataContainer: { alignItems: 'center', marginTop: 100 },
  noData: { color: '#475569', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  noDataSub: { color: '#94A3B8', fontSize: 14, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderTypeBadge: { fontSize: 10, color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  orderId: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusDelivered: { backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#1E293B' },
  cardBody: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { marginRight: 8 },
  infoText: { fontSize: 14, color: '#475569', flex: 1 },
  totalText: { fontSize: 16, fontWeight: 'bold', color: '#10B981', marginTop: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginTop: 8 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flex: 1, justifyContent: 'center', marginRight: 8 },
  mapBtnText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 14 },
  deliverBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flex: 1, justifyContent: 'center', marginLeft: 8 },
  deliverBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#1E293B' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: '#64748B', fontWeight: 'bold' },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#3B82F6' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});
