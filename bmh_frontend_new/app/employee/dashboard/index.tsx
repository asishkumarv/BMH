import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { Users, Clock } from 'lucide-react-native';

export default function EmployeeDashboardScreen() {
  const { isDesktop } = useResponsive();
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    if (Platform.OS === 'web') {
      const userStr = localStorage.getItem('employeeUser');
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    }
  }, []);

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back, {user.full_name}</Text>
        <Text style={styles.subtitle}>{user.role} | {user.department}</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Clock color={Colors.light.primary} size={32} style={{ marginBottom: 16 }} />
          <Text style={styles.cardTitle}>Attendance Status</Text>
          <Text style={styles.cardValue}>Pending</Text>
          <Text style={styles.cardSub}>Mark your attendance for today.</Text>
        </View>
        <View style={styles.card}>
          <Users color={Colors.light.secondary} size={32} style={{ marginBottom: 16 }} />
          <Text style={styles.cardTitle}>Assigned Tasks</Text>
          <Text style={styles.cardValue}>0</Text>
          <Text style={styles.cardSub}>Tasks pending completion.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    backgroundColor: Colors.light.background,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  card: {
    flex: 1,
    minWidth: 250,
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  cardSub: {
    fontSize: 13,
    color: Colors.light.icon,
  }
});
