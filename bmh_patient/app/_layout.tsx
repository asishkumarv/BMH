import { Stack } from 'expo-router';
import { Colors } from '../constants/Colors';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { useEffect } from 'react';

export default function RootLayout() {
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

  return (
    <>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: Colors.light.background }
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="dashboard" />
      </Stack>
      <Toast />
    </>
  );
}
