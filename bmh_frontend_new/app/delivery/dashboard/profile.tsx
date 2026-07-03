import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Phone, Mail, Building } from 'lucide-react-native';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        let data;
        if (Platform.OS === 'web') {
          data = localStorage.getItem('employeeUser');
        } else {
          data = await AsyncStorage.getItem('employeeUser');
        }
        if (data) {
          setProfile(JSON.parse(data));
        }
      } catch (err) {
        console.error('Error loading profile', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  if (loading) return <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />;

  if (!profile) return <Text style={styles.error}>No profile data found.</Text>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>
      
      <View style={styles.card}>
        <View style={styles.avatarContainer}>
          <User size={48} color="#3B82F6" />
        </View>
        <Text style={styles.name}>{profile.full_name}</Text>
        <Text style={styles.role}>Delivery Staff</Text>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Mail size={20} color="#64748B" style={styles.icon} />
            <Text style={styles.infoText}>{profile.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Phone size={20} color="#64748B" style={styles.icon} />
            <Text style={styles.infoText}>{profile.phone || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Building size={20} color="#64748B" style={styles.icon} />
            <Text style={styles.infoText}>{profile.department}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  error: { textAlign: 'center', marginTop: 50, color: '#EF4444' },
  card: { backgroundColor: '#fff', margin: 20, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  role: { fontSize: 16, color: '#3B82F6', marginTop: 4, fontWeight: '500' },
  infoSection: { marginTop: 30, width: '100%' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  icon: { marginRight: 16 },
  infoText: { fontSize: 16, color: '#334155' }
});
