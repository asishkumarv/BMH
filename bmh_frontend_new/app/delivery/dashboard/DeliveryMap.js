import React from "react";
import { View, StyleSheet } from "react-native";
import { Platform } from "react-native";

let MapView, Marker, Polyline;
if (Platform.OS !== "web") {
  const RNMaps = require("react" + "-native-maps");
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
  Polyline = RNMaps.Polyline;
}



/**
 * DeliveryMap (NATIVE version) — Single-order tracking map
 */
export default function DeliveryMap({
  deliveryLocation,
  customerCoords,
  routeCoords = [],
}) {
  const dLat = deliveryLocation?.latitude ?? 20.5937;
  const dLng = deliveryLocation?.longitude ?? 78.9629;
  const cLat = customerCoords?.latitude ?? 20.5937;
  const cLng = customerCoords?.longitude ?? 78.9629;

  // Compute region to fit both points
  const midLat = (dLat + cLat) / 2;
  const midLng = (dLng + cLng) / 2;
  const latDelta = Math.max(Math.abs(dLat - cLat) * 1.5, 0.02);
  const lngDelta = Math.max(Math.abs(dLng - cLng) * 1.5, 0.02);

  const polyCoords = routeCoords.map((c) => {
    if (Array.isArray(c)) return { latitude: c[0], longitude: c[1] };
    return { latitude: c.latitude, longitude: c.longitude };
  });

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }}
      >
        {/* Delivery Boy */}
        <Marker
          coordinate={{ latitude: dLat, longitude: dLng }}
          title="🏍️ Delivery Boy"
          pinColor="#0ea5e9"
        />

        {/* Customer */}
        <Marker
          coordinate={{ latitude: cLat, longitude: cLng }}
          title="📍 Customer"
          pinColor="#ef4444"
        />

        {/* Route line */}
        {polyCoords.length > 1 && (
          <Polyline
            coordinates={polyCoords}
            strokeColor="#3B82F6"
            strokeWidth={4}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
});