import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import axios from 'axios';
import { MapPin, User, Package, RefreshCw } from 'lucide-react-native';

export default function DeliveryFleetScreen() {
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // In a full implementation, we'd use react-leaflet on web or react-native-maps on mobile.
  // Given the complexity of polyfilling maps, we'll build a rich list view that opens a map.
  
  const renderBoy = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <User size={24} color="#3B82F6" />
        <View style={styles.headerTextContainer}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        <View style={styles.badge}>
          <Package size={14} color="#10B981" />
          <Text style={styles.badgeText}>{item.pending_orders_count || 0} Pending</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        {item.location_lat ? (
          <View>
            <View style={styles.locationRow}>
              <MapPin size={16} color="#475569" style={{marginRight: 6}} />
              <Text style={styles.locationText}>Last seen: {new Date(item.updated_at).toLocaleTimeString()}</Text>
            </View>
            <TouchableOpacity 
              style={styles.mapBtn}
              onPress={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${item.location_lat},${item.location_lng}`;
                if (Platform.OS === 'web') window.open(url, '_blank');
              }}
            >
              <Text style={styles.mapBtnText}>View Live Location on Google Maps</Text>
            </TouchableOpacity>
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
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchFleet}>
          <RefreshCw size={16} color="#3B82F6" style={{marginRight: 8}} />
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
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
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#10B981', marginLeft: 4 },
  cardBody: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  locationText: { fontSize: 14, color: '#475569' },
  mapBtn: { backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  mapBtnText: { color: '#334155', fontWeight: '600' },
  noLocation: { color: '#94A3B8', fontStyle: 'italic' }
});
