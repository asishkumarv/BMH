import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function CrossPlatformMap(props) {
  const [MapComponent, setMapComponent] = useState(null);

  useEffect(() => {
    // Dynamically import Leaflet on the client side only to avoid "window is not defined" SSR crash
    if (typeof window !== 'undefined') {
      try {
        // Use require to prevent Expo's SSR from hoisting dynamic imports
        const mod = require('./CrossPlatformMapLeaflet');
        setMapComponent(() => mod.default);
      } catch (e) {
        console.error("Failed to load map:", e);
      }
    }
  }, []);

  if (!MapComponent) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return <MapComponent {...props} />;
}
