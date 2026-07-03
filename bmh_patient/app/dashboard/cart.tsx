import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, MapPin, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// Leaflet setup for web
let MapContainer: any, TileLayer: any, Marker: any, useMapEvents: any;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const RL = require('react-leaflet');
  MapContainer = RL.MapContainer;
  TileLayer = RL.TileLayer;
  Marker = RL.Marker;
  useMapEvents = RL.useMapEvents;
  require('leaflet/dist/leaflet.css');
  const L = require('leaflet');
  
  // Fix Leaflet marker icons using CDN to prevent broken images in Metro Bundler
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

function LocationPicker({ position, setPosition }: { position: any, setPosition: any }) {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !MapContainer) {
    return <Text style={{padding: 20}}>Map picker is only available on web.</Text>;
  }

  const LocationMarker = () => {
    const map = useMapEvents({
      click(e: any) {
        setPosition(e.latlng);
      },
    });

    React.useEffect(() => {
      if (position) {
        map.flyTo(position, map.getZoom());
      }
    }, [position, map]);

    return position === null ? null : (
      <Marker position={position} />
    );
  };

  return (
    <div style={{ height: '300px', width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 10 }}>
      <MapContainer center={position || [17.3850, 78.4867]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker />
      </MapContainer>
    </div>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const [cart, setCart] = useState({});
  const [address, setAddress] = useState('');
  const [mapPosition, setMapPosition] = useState<any>(null); // {lat, lng}
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [patient, setPatient] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const patientData = await AsyncStorage.getItem('patientUser');
      if (patientData) setPatient(JSON.parse(patientData));

      if (Platform.OS === 'web') {
        const savedCart = localStorage.getItem('bmh_patient_cart');
        if (savedCart) {
          try { setCart(JSON.parse(savedCart)); } catch(e) {}
        }
      }
    };
    loadData();
  }, []);

  const getCurrentLocation = async () => {
    setLoadingLoc(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setMapPosition({ lat: location.coords.latitude, lng: location.coords.longitude });
    } catch (err: any) {
      Alert.alert('Error fetching location', err.message);
    } finally {
      setLoadingLoc(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (Object.keys(cart).length === 0) {
      alert("Cart is empty");
      return;
    }
    if (!address) {
      alert("Please enter your delivery address");
      return;
    }
    if (!mapPosition) {
      alert("Please select your location on the map or click 'Get Current Location'");
      return;
    }

    setPlacingOrder(true);
    try {
      const items = Object.values(cart).map((item: any) => ({
        c_item_code: item.c_item_code,
        itemName: item.itemName,
        saleRate: item.saleRate,
        qty: item.qty
      }));
      const total_amount = items.reduce((sum, item) => sum + (item.saleRate * item.qty), 0);

      const res = await fetch('https://napi.bharatmedicalhallplus.com/online-orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patient?.id || 'GUEST',
          patient_name: patient?.name || 'Guest',
          patient_mobile: patient?.mobile || '',
          manual_address: address,
          map_lat: mapPosition.lat,
          map_lng: mapPosition.lng,
          items: items,
          total_amount: total_amount
        })
      });

      const data = await res.json();
      if (data.success) {
        alert("Order placed successfully!");
        if (Platform.OS === 'web') localStorage.removeItem('bmh_patient_cart');
        setCart({});
        router.push('/dashboard/medicine-store' as any);
      } else {
        alert("Failed to place order: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const cartItems = Object.values(cart) as any[];
  const totalAmount: number = cartItems.reduce((sum: number, item: any) => sum + (item.saleRate * item.qty), 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color="#1E293B" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={{width: 24}} />
      </View>

      <View style={styles.content}>
        {/* Cart Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {cartItems.length === 0 ? (
            <Text style={{color: '#64748B'}}>Your cart is empty.</Text>
          ) : (
            cartItems.map((item: any, idx: number) => (
              <View key={idx} style={styles.cartItem}>
                <View style={{flex: 1}}>
                  <Text style={styles.itemName}>{item.itemName}</Text>
                  <Text style={styles.itemDesc}>Qty: {item.qty} x ₹{item.saleRate}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{(item.saleRate * item.qty).toFixed(2)}</Text>
              </View>
            ))
          )}
          {cartItems.length > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Delivery Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TextInput
            style={styles.inputArea}
            placeholder="Enter complete address manually (House No, Street, City, Pincode)"
            multiline
            numberOfLines={3}
            value={address}
            onChangeText={setAddress}
          />

          <Text style={[styles.sectionTitle, {marginTop: 20}]}>Map Location</Text>
          <Text style={styles.helpText}>Click on the map to drop a pin, or fetch your current location.</Text>
          
          <TouchableOpacity style={styles.locationBtn} onPress={getCurrentLocation} disabled={loadingLoc}>
            {loadingLoc ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <MapPin color="#fff" size={18} style={{marginRight: 8}} />
                <Text style={styles.locationBtnText}>Get Current Location</Text>
              </>
            )}
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <LocationPicker position={mapPosition} setPosition={setMapPosition} />
          )}
          
          {mapPosition && (
            <Text style={{marginTop: 10, color: '#10B981', fontWeight: 'bold'}}>
              Location Selected: {mapPosition.lat.toFixed(4)}, {mapPosition.lng.toFixed(4)}
            </Text>
          )}
        </View>

        {/* Place Order */}
        <TouchableOpacity 
          style={[styles.checkoutBtn, (cartItems.length === 0 || placingOrder) && styles.checkoutBtnDisabled]} 
          onPress={handlePlaceOrder}
          disabled={cartItems.length === 0 || placingOrder}
        >
          {placingOrder ? <ActivityIndicator color="#fff" size="small" /> : (
            <Text style={styles.checkoutBtnText}>Place Order (₹{totalAmount.toFixed(2)})</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  backBtn: {
    padding: 8
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4
  },
  itemDesc: {
    fontSize: 14,
    color: '#64748B'
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#F1F5F9'
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B'
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3B82F6'
  },
  inputArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
    textAlignVertical: 'top',
    outlineStyle: 'none' as any
  },
  helpText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12
  },
  locationBtn: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  locationBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  checkoutBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10
  },
  checkoutBtnDisabled: {
    backgroundColor: '#94A3B8'
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  }
});
