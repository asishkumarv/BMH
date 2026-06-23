import { Stack } from 'expo-router';
import { Colors } from '../constants/Colors';

export default function RootLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: Colors.light.background }
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="roles" />
      <Stack.Screen name="admin" options={{ animation: 'fade' }} />
      <Stack.Screen name="employee" options={{ animation: 'fade' }} />
      <Stack.Screen name="department" options={{ animation: 'fade' }} />
    </Stack>
  );
}
