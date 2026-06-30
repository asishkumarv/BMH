import React, { useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
let MapContainer, TileLayer, Marker, Popup, Polyline, useMap, L;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  require("leaflet/dist/leaflet.css");
  const ReactLeaflet = require("react-leaflet");
  MapContainer = ReactLeaflet.MapContainer;
  TileLayer = ReactLeaflet.TileLayer;
  Marker = ReactLeaflet.Marker;
  Popup = ReactLeaflet.Popup;
  Polyline = ReactLeaflet.Polyline;
  useMap = ReactLeaflet.useMap;
  L = require("leaflet");

  // Fix default marker icons
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}


const createColoredIcon = (color) => {
  if (Platform.OS !== 'web' || !L) return null;
  return L.divIcon({
    className: "",
    html: `
      <svg width="30" height="42" viewBox="0 0 24 24" fill="none">
        <path 
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          fill="${color}"
          stroke="white"
          stroke-width="1.5"
        />
        <circle cx="12" cy="9" r="2.5" fill="white"/>
      </svg>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
  });
};

let bikeIcon = null;
if (Platform.OS === 'web' && L) {
  bikeIcon = L.divIcon({
    className: "",
    html: `
      <div style="
        background:#0ea5e9;
        width:35px;
        height:35px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 4px 10px rgba(0,0,0,0.3);
      ">
        🏍️
      </div>
    `,
    iconSize: [35, 35],
    iconAnchor: [17, 17],
  });
}

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

// Auto-fit bounds component
function FitMapToPoints({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [points]);
  return null;
}

/**
 * CrossPlatformMap (WEB version) — Leaflet-based multi-marker logistics map
 */
export default function CrossPlatformMapLeaflet({
  mapPoints = [],
  deliveryBoyLocation,
  onMarkerPress,
  linePositions = [],
}) {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !MapContainer) {
    return null;
  }
  return (
    <div
      style={{
        height: 400,
        marginBottom: 10,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={[17.385, 78.4867]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <FitMapToPoints points={mapPoints} />

        {/* Order Markers */}
        {mapPoints.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={createColoredIcon(getOrderColor(p))}
            eventHandlers={{
              click: () => onMarkerPress?.(p),
            }}
          >
            <Popup>
              <b>{p.name}</b>
              <br />
              {p.address}
              <br />
              <br />
              <button
                onClick={() => onMarkerPress?.(p)}
                style={{
                  background: "#0ea5e9",
                  color: "white",
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Navigate 🧭
              </button>
            </Popup>
          </Marker>
        ))}

        {/* Delivery Boy Marker */}
        {deliveryBoyLocation && (
          <Marker
            position={[deliveryBoyLocation.lat, deliveryBoyLocation.lng]}
            icon={bikeIcon}
          >
            <Popup>🏍️ Delivery Boy Live Location</Popup>
          </Marker>
        )}

        {/* Route Lines */}
        {linePositions.length > 1 && (
          <Polyline
            positions={linePositions}
            color="blue"
            weight={4}
            opacity={0.7}
          />
        )}
      </MapContainer>
    </div>
  );
}
