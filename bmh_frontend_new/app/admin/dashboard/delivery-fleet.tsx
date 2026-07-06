import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform, Modal, ScrollView } from 'react-native';
import axios from 'axios';
import { MapPin, User, Package, RefreshCw, X, Eye, CheckCircle, Navigation, Clock } from 'lucide-react-native';
import { CustomTimePicker } from '../../../components/ui/CustomTimePicker';
import 'leaflet/dist/leaflet.css';

let MapContainer: any, TileLayer: any, Marker: any, Popup: any, L: any;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const RL = require('react-leaflet');
  MapContainer = RL.MapContainer;
  TileLayer = RL.TileLayer;
  Marker = RL.Marker;
  Popup = RL.Popup;
  var useMap = RL.useMap;
  L = require('leaflet');

  // Fix Leaflet's default icon path issues in React
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}


function MapBoundsFitter({ fleet }: { fleet: any[] }) {
  const map = useMap();
  useEffect(() => {
    const validMarkers = fleet.filter(b => b.location_lat && b.location_lng);
    if (validMarkers.length > 0) {
      const bounds = L.latLngBounds(validMarkers.map(m => [parseFloat(m.location_lat), parseFloat(m.location_lng)]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [fleet, map]);
  return null;
}

export default function DeliveryFleetScreen() {
  const [fleet, setFleet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [ordersModalVisible, setOrdersModalVisible] = useState(false);
  const [selectedBoy, setSelectedBoy] = useState<any>(null);
  const [boyOrders, setBoyOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [editShiftModalVisible, setEditShiftModalVisible] = useState(false);
  const [editShiftIn, setEditShiftIn] = useState('');
  const [editShiftOut, setEditShiftOut] = useState('');
  const [editBreakIn, setEditBreakIn] = useState('');
  const [editBreakOut, setEditBreakOut] = useState('');
  const [savingShift, setSavingShift] = useState(false);

  const fetchFleet = async () => {
    setLoading(true);
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/employees/delivery-fleet');
      if (res.data && res.data.success) {
        setFleet(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleViewOrders = async (boy: any) => {
    setSelectedBoy(boy);
    setOrdersModalVisible(true);
    setLoadingOrders(true);
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/employees/${boy.id}/assigned-orders`);
      if (res.data && res.data.success) {
        setBoyOrders(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const renderBoy = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <User size={24} color="#3B82F6" />
        <View style={styles.headerTextContainer}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        <TouchableOpacity style={styles.viewOrdersBtn} onPress={() => handleViewOrders(item)}>
          <Text style={styles.viewOrdersText}>View Orders</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsContainer}>
         <View style={styles.statBox}>
            <Text style={styles.statValue}>{item.assigned_today_count || 0}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
         </View>
         <View style={styles.statBox}>
            <Text style={styles.statValue}>{item.pending_orders_count || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
         </View>
         <View style={styles.statBox}>
            <Text style={[styles.statValue, {color:'#10B981'}]}>{item.delivered_today_count || 0}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
         </View>
      </View>

      <View style={styles.cardBody}>
        {item.location_lat ? (
          <View>
            <View style={styles.locationRow}>
              <MapPin size={16} color="#475569" style={{marginRight: 6}} />
              <Text style={styles.locationText}>Last seen: {new Date(item.updated_at).toLocaleTimeString()}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noLocation}>No location data recorded yet</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery Fleet Tracking</Text>
        <View style={{flexDirection:'row', gap: 10}}>
          {Platform.OS === 'web' && (
            <TouchableOpacity style={[styles.refreshBtn, {backgroundColor:'#4F46E5'}]} onPress={() => setMapModalVisible(true)}>
              <MapPin size={16} color="#fff" style={{marginRight: 8}} />
              <Text style={[styles.refreshBtnText, {color:'#fff'}]}>View Map</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchFleet}>
            <RefreshCw size={16} color="#3B82F6" style={{marginRight: 8}} />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
      ) : fleet.length === 0 ? (
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No active delivery boys found in the fleet.</Text>
        </View>
      ) : (
        <FlatList
          data={fleet}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBoy}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Map Modal */}
      {Platform.OS === 'web' && mapModalVisible && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, {width: '90%', height: '90%'}]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Live Fleet Map</Text>
                <TouchableOpacity onPress={() => setMapModalVisible(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <View style={{flex: 1, backgroundColor:'#E2E8F0', overflow: 'hidden', borderRadius: 8}}>
                 <MapContainer center={[16.5062, 80.6480]} zoom={11} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {fleet.map((boy: any) => boy.location_lat ? (
                      <Marker key={boy.id} position={[parseFloat(boy.location_lat), parseFloat(boy.location_lng)]}>
                        <Popup>
                          <Text style={{fontWeight:'bold'}}>{boy.full_name}</Text>
                          <br />
                          <Text>{boy.phone}</Text>
                          <br />
                          <Text>{boy.pending_orders_count} pending orders</Text>
                        </Popup>
                      </Marker>
                    ) : null)}
                  </MapContainer>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Orders Modal */}
      {ordersModalVisible && selectedBoy && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, {width: '90%', maxWidth: 600, maxHeight: '90%'}]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedBoy.full_name}'s Orders</Text>
                <TouchableOpacity onPress={() => setOrdersModalVisible(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{padding: 15}}>
                {loadingOrders ? (
                  <ActivityIndicator size="large" color="#3B82F6" style={{ margin: 20 }} />
                ) : boyOrders.length === 0 ? (
                  <Text style={{textAlign:'center', color:'#64748B', margin: 20}}>No orders assigned currently.</Text>
                ) : (
                  boyOrders.map((order, index) => (
                    <View key={index} style={styles.orderCard}>
                       <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 5}}>
                         <Text style={{fontWeight:'bold', fontSize: 16}}>{order.type === 'manual_order' ? 'Manual Order' : 'Online Order'}</Text>
                         <Text style={{fontWeight:'bold', color: order.status === 'Delivered' ? '#10B981' : '#F59E0B'}}>{order.status}</Text>
                       </View>
                       <Text>Customer: {order.patient_name} ({order.mobile_no})</Text>
                       <Text>Address: {order.address}</Text>
                       <Text>Amount: ₹{order.total_amount}</Text>
                       <Text style={{color:'#64748B', fontSize: 12, marginTop: 5}}>{new Date(order.created_at).toLocaleString()}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  refreshBtn: { flexDirection: 'row', backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  refreshBtnText: { color: '#3B82F6', fontWeight: 'bold' },
  listContainer: { padding: 20, gap: 16 },
  noData: { alignItems: 'center', marginTop: 100 },
  noDataText: { color: '#64748B', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerTextContainer: { flex: 1, marginLeft: 12 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  phone: { fontSize: 14, color: '#64748B', marginTop: 2 },
  viewOrdersBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  viewOrdersText: { color: '#4F46E5', fontWeight: '600', fontSize: 12 },
  statsContainer: { flexDirection: 'row', gap: 10, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  statBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cardBody: { paddingTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 14, color: '#475569' },
  noLocation: { color: '#94A3B8', fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  orderCard: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' }
});
