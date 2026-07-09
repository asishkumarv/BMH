import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform, LogBox } from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import * as Notifications from 'expo-notifications';

if (Platform.OS === 'android') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

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
    get length() { return store.size; },
    __setRaw: (key: string, value: string) => store.set(key, value)
  };
  (global as any).localStorage = localStorageMock;
}

export default function RootLayout() {
  const [ready, setReady] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const initStorage = async () => {
        try {
          // Register custom notification channel with high priority and alarm sound
          await Notifications.setNotificationChannelAsync('alarm-channel-v4', {
            name: 'Alarm Notifications',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'alarm',
            bypassDnd: true,
          });

          const keys = await AsyncStorage.getAllKeys();
          const pairs = await AsyncStorage.multiGet(keys);
          pairs.forEach(([key, value]) => {
            if (value !== null) {
              const store = (global as any).localStorage;
              if (store && typeof store.__setRaw === 'function') {
                store.__setRaw(key, value);
              } else if (store && typeof store.setItem === 'function') {
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

