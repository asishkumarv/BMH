import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const patientData = await AsyncStorage.getItem('patientUser');
        if (patientData) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      } catch (err) {
        console.error('Auth check error:', err);
        router.replace('/login');
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
      <ActivityIndicator size="large" color={Colors.light.primary} />
    </View>
  );
}
