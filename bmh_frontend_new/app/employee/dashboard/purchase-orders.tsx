import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Modal, ScrollView, TextInput } from 'react-native';
import axios from 'axios';
import { Package, MapPin, Bus, User, Map, CheckCircle } from 'lucide-react-native';

export default function PurchaseOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Assignment Modal State
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deliveryType, setDeliveryType] = useState<string>('Local');
  const [selectedBoyId, setSelectedBoyId] = useState<string>('');
  
  // Local Pickup fields
  const [address, setAddress] = useState('');
  const [gpsLocation, setGpsLocation] = useState('');
  
  // Bus Pickup fields
  const [busDetails, setBusDetails] = useState({
    driver_name: '',
    driver_number: '',
    waybill_number: '',
    drop_location: ''
  });

  const fetchData = async () => {
    try {
      const [ordRes, empRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/all'),
        axios.get('https://napi.bharatmedicalhallplus.com/employees/delivery-fleet')
      ]);
      if (ordRes.data && ordRes.data.success) {
        setOrders(ordRes.data.data);
      }
      if (empRes.data && empRes.data.success) {
        setDeliveryBoys(empRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const handleAssign = async () => {
    if (deliveryType !== 'Store' && !selectedBoyId) {
      alert("Please select a delivery boy");
      return;
    }
    
    try {
      const payload = {
        delivery_type: deliveryType,
        delivery_boy_id: deliveryType === 'Store' ? null : selectedBoyId,
        address: deliveryType === 'Local' ? address : null,
        gps_location: deliveryType === 'Local' ? gpsLocation : null,
        bus_details: deliveryType === 'Bus' ? busDetails : null
      };

      await axios.post(`https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/assign/${selectedOrder.id}`, payload);
      alert('Delivery Assigned Successfully!');
      setSelectedOrder(null);
      fetchData();
    } catch (err: any) {
      alert("Error assigning delivery: " + err.message);
    }
  };

  const openAssignModal = (order: any) => {
    setSelectedOrder(order);
    setDeliveryType('Local');
    setSelectedBoyId('');
    setAddress('');
    setGpsLocation('');
    setBusDetails({ driver_name: '', driver_number: '', waybill_number: '', drop_location: '' });
  };

  const renderOrder = ({ item }: { item: any }) => {
    let detailsStr = item.details;
    let itemsCount = 0;
    try {
        const parsed = JSON.parse(detailsStr);
        itemsCount = Array.isArray(parsed) ? parsed.length : 0;
    } catch (e) {}

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>{item.prefix}{item.year}{item.srno} ({item.br_code})</Text>
          <View style={[styles.statusBadge, item.status === 'Assigned' ? styles.statusAssigned : styles.statusPending]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <Text style={styles.customerName}>{item.custname}</Text>
          <Text style={styles.refCode}>Ref: {item.refname}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>₹{item.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{itemsCount}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{item.delivery_type || 'N/A'}</Text>
              <Text style={styles.statLabel}>Delivery</Text>
            </View>
          </View>

          {item.status === 'Assigned' && item.delivery_boy_id && (
             <View style={styles.assignedInfo}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={styles.assignedText}>
                  Assigned to: {deliveryBoys.find(b => b.id === item.delivery_boy_id)?.full_name || 'Delivery Boy'}
                </Text>
             </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={[styles.btn, item.status === 'Assigned' ? styles.btnOutline : styles.btnPrimary]}
            onPress={() => openAssignModal(item)}
          >
            <Text style={[styles.btnText, item.status === 'Assigned' ? styles.btnOutlineText : styles.btnPrimaryText]}>
              {item.status === 'Assigned' ? 'Reassign Delivery' : 'Assign Delivery'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Purchase Orders</Text>
      
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrder}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 40}}>No purchase orders found.</Text>}
      />

      {/* ASSIGNMENT MODAL */}
      <Modal visible={!!selectedOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Delivery</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{maxHeight: '80%'}}>
              <Text style={styles.label}>Delivery Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity 
                  style={[styles.typeBtn, deliveryType === 'Store' && styles.typeBtnActive]}
                  onPress={() => setDeliveryType('Store')}
                >
                  <Package size={20} color={deliveryType === 'Store' ? '#4F46E5' : '#64748B'} />
                  <Text style={[styles.typeText, deliveryType === 'Store' && styles.typeTextActive]}>Store</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeBtn, deliveryType === 'Local' && styles.typeBtnActive]}
                  onPress={() => setDeliveryType('Local')}
                >
                  <MapPin size={20} color={deliveryType === 'Local' ? '#4F46E5' : '#64748B'} />
                  <Text style={[styles.typeText, deliveryType === 'Local' && styles.typeTextActive]}>Local</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeBtn, deliveryType === 'Bus' && styles.typeBtnActive]}
                  onPress={() => setDeliveryType('Bus')}
                >
                  <Bus size={20} color={deliveryType === 'Bus' ? '#4F46E5' : '#64748B'} />
                  <Text style={[styles.typeText, deliveryType === 'Bus' && styles.typeTextActive]}>Bus</Text>
                </TouchableOpacity>
              </View>

              {deliveryType !== 'Store' && (
                <>
                  <Text style={styles.label}>Select Delivery Boy</Text>
                  <View style={styles.boyList}>
                    {deliveryBoys.map(boy => (
                      <TouchableOpacity 
                        key={boy.id} 
                        style={[styles.boyBtn, selectedBoyId === boy.id && styles.boyBtnActive]}
                        onPress={() => setSelectedBoyId(boy.id)}
                      >
                        <User size={16} color={selectedBoyId === boy.id ? '#4F46E5' : '#64748B'} />
                        <Text style={[styles.boyText, selectedBoyId === boy.id && styles.boyTextActive]}>
                          {boy.full_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {deliveryType === 'Local' && (
                <>
                  <Text style={styles.label}>Pickup Address</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Enter full address" 
                    value={address}
                    onChangeText={setAddress}
                  />
                  <Text style={styles.label}>Google Maps Link (Optional)</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="https://maps.google.com/..." 
                    value={gpsLocation}
                    onChangeText={setGpsLocation}
                  />
                </>
              )}

              {deliveryType === 'Bus' && (
                <>
                  <Text style={styles.label}>Driver Name</Text>
                  <TextInput style={styles.input} value={busDetails.driver_name} onChangeText={t => setBusDetails(p => ({...p, driver_name: t}))} />
                  <Text style={styles.label}>Driver Number</Text>
                  <TextInput style={styles.input} value={busDetails.driver_number} onChangeText={t => setBusDetails(p => ({...p, driver_number: t}))} />
                  <Text style={styles.label}>Waybill Number</Text>
                  <TextInput style={styles.input} value={busDetails.waybill_number} onChangeText={t => setBusDetails(p => ({...p, waybill_number: t}))} />
                  <Text style={styles.label}>Bus Drop Location</Text>
                  <TextInput style={styles.input} value={busDetails.drop_location} onChangeText={t => setBusDetails(p => ({...p, drop_location: t}))} />
                </>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={handleAssign}>
              <Text style={styles.saveBtnText}>Confirm Assignment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 16 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusAssigned: { backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  cardBody: { marginBottom: 16 },
  customerName: { fontSize: 18, fontWeight: 'bold', color: '#334155' },
  refCode: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8 },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B' },
  assignedInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  assignedText: { fontSize: 14, color: '#10B981', fontWeight: '600' },
  cardFooter: { borderTopWidth: 1, borderColor: '#F1F5F9', paddingTop: 12 },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#4F46E5' },
  btnPrimaryText: { color: 'white', fontWeight: 'bold' },
  btnOutline: { borderWidth: 1, borderColor: '#4F46E5' },
  btnOutlineText: { color: '#4F46E5', fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeBtn: { fontSize: 24, color: '#64748B' },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 16 },
  typeSelector: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, alignItems: 'center', gap: 4 },
  typeBtnActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  typeText: { fontSize: 14, color: '#64748B' },
  typeTextActive: { color: '#4F46E5', fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 16 },
  boyList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  boyBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, gap: 6 },
  boyBtnActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  boyText: { color: '#64748B' },
  boyTextActive: { color: '#4F46E5', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
