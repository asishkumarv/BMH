import React, { useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Platform } from "react-native";

let MapView, Marker, Polyline;
if (Platform.OS !== "web") {
  const RNMaps = require("react" + "-native-maps");
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
  Polyline = RNMaps.Polyline;
}



// Helper to convert HSL string to hex for react-native-maps
const hslToHex = (hslStr) => {
  const match = hslStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return "#FF0000";
  let [, h, s, l] = match.map(Number);
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// Color cache for consistent order colors
const _colorCache = {};
const getOrderColor = (point) => {
  const key = point.id || point.name;
  if (!_colorCache[key]) {
    const hue = Math.floor(Math.random() * 360);
    _colorCache[key] = `hsl(${hue}, 80%, 50%)`;
  }
  return _colorCache[key];
};

/**
 * CrossPlatformMap (NATIVE version) — react-native-maps multi-marker logistics map
 */
export default function CrossPlatformMap({
  mapPoints = [],
  deliveryBoyLocation,
  onMarkerPress,
  linePositions = [],
}) {
  const mapRef = useRef(null);

  // Calculate initial region to fit all points
  let initialRegion = {
    latitude: 17.385,
    longitude: 78.4867,
    latitudeDelta: 10,
    longitudeDelta: 10,
  };

  const allLats = mapPoints.map((p) => p.lat);
  const allLngs = mapPoints.map((p) => p.lng);
  if (deliveryBoyLocation) {
    allLats.push(deliveryBoyLocation.lat);
    allLngs.push(deliveryBoyLocation.lng);
  }

  if (allLats.length > 0) {
    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);
    initialRegion = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.3, 0.05),
      longitudeDelta: Math.max((maxLng - minLng) * 1.3, 0.05),
    };
  }

  return (
    <View style={mobileStyles.container}>
      <MapView
        ref={mapRef}
        style={mobileStyles.map}
        initialRegion={initialRegion}
      >
        {/* Order markers */}
        {mapPoints.map((point) => {
          const color = hslToHex(getOrderColor(point));
          return (
            <Marker
              key={point.id}
              coordinate={{ latitude: point.lat, longitude: point.lng }}
              title={point.name}
              description={point.address}
              pinColor={color}
              onPress={() => onMarkerPress?.(point)}
            />
          );
        })}

        {/* Delivery boy marker */}
        {deliveryBoyLocation && (
          <Marker
            coordinate={{
              latitude: deliveryBoyLocation.lat,
              longitude: deliveryBoyLocation.lng,
            }}
            title="🏍️ Delivery Boy"
            description="Live Location"
            pinColor="#0ea5e9"
          />
        )}

        {/* Route polyline */}
        {linePositions.length > 1 && (
          <Polyline
            coordinates={linePositions.map(([lat, lng]) => ({
              latitude: lat,
              longitude: lng,
            }))}
            strokeColor="blue"
            strokeWidth={4}
          />
        )}
      </MapView>
    </View>
  );
}

const mobileStyles = StyleSheet.create({
  container: {
    height: 400,
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
});
