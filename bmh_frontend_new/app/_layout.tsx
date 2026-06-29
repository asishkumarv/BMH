import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform, LogBox } from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import Toast from 'react-native-toast-message';
import axios from 'axios';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'expo-notifications functionality is not fully supported',
]);

if (Platform.OS !== 'web') {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
      AsyncStorage.setItem(key, value).catch(err => console.error('localStorage setItem error:', err));
    },
    removeItem: (key: string) => {
      store.delete(key);
      AsyncStorage.removeItem(key).catch(err => console.error('localStorage removeItem error:', err));
    },
    clear: () => {
      store.clear();
      AsyncStorage.clear().catch(err => console.error('localStorage clear error:', err));
    },
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() { return store.size; }
  };
  (global as any).localStorage = localStorageMock;
}

export default function RootLayout() {
  const [ready, setReady] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const initStorage = async () => {
        try {
          const keys = await AsyncStorage.getAllKeys();
          const pairs = await AsyncStorage.multiGet(keys);
          pairs.forEach(([key, value]) => {
            if (value !== null) {
              const store = (global as any).localStorage;
              if (store && typeof store.setItem === 'function') {
                // Directly set in memory store map to avoid redundant AsyncStorage writes during startup
                // Our mock implementation uses a Map under the hood, but since we wrapped it, let's write to it
                // using setItem which is safe. To avoid infinite loops, the mock's setItem writes to AsyncStorage,
                // which is redundant but fast enough. Let's just use setItem.
                store.setItem(key, value);
              }
            }
          });
        } catch (err) {
          console.error('Failed to pre-populate localStorage polyfill:', err);
        } finally {
          setReady(true);
        }
      };
      initStorage();
    }
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => {
        // If it's a mutation request
        const method = response.config?.method?.toLowerCase() || '';
        if (['post', 'put', 'patch', 'delete'].includes(method)) {
          // If the request was successful
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: response.data?.message || 'Action completed successfully!',
            position: 'top',
          });
        }
        return response;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: Colors.light.background }
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="roles" />
      </Stack>
      <Toast />
    </>
  );
}

