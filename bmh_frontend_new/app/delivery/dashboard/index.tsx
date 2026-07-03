import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Linking, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { MapPin, Phone, User, CheckCircle, Clock, Package } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Initializing...');

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

  const fetchOrders = async (userId) => {
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/employees/${userId}/assigned-orders`);
      if (res.data && res.data.success) {
        // If we have more orders now than before, it means a new order was assigned
        if (orders.length > 0 && res.data.data.length > orders.length) {
           if (Platform.OS === 'web') {
             try {
               const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
               audio.play();
             } catch (e) { console.log(e); }
           }
           alert("🔔 New Delivery Assigned!");
        }
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async (userId) => {
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

  const handleMarkDelivered = async (orderId, type) => {
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

  const processDelivery = async (orderId, type) => {
    try {
      if (type === 'online_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/online-orders/${orderId}/status`, {
          status: 'DELIVERED'
        });
      } else {
        alert('Ecogreen Order Delivered (Status update pending backend implementation)');
      }
      alert('Order Marked as Delivered!');
      if (user) fetchOrders(user.id);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const openMap = (lat, lng, address) => {
    let url = '';
    if (lat && lng) {
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

  const renderOrder = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderTypeBadge}>
            {item.type === 'online_order' ? 'Online App Order' : item.type === 'sales_order' ? 'Ecogreen Sales Order' : 'Ecogreen Invoice'}
          </Text>
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
          onPress={() => openMap(item.map_lat, item.map_lng, item.address)}
        >
          <MapPin color="#3B82F6" size={16} style={{marginRight: 6}} />
          <Text style={styles.mapBtnText}>Navigate</Text>
        </TouchableOpacity>

        {item.status !== 'DELIVERED' && (
          <TouchableOpacity 
            style={styles.deliverBtn} 
            onPress={() => handleMarkDelivered(item.id, item.type)}
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
          <Text style={styles.subtitle}>GPS Status: {locationStatus}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => user && fetchOrders(user.id)}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
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
  deliverBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
