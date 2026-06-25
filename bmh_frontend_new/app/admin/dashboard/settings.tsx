import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { ShieldCheck } from 'lucide-react-native';

export default function AdminSettings() {
  const [settings, setSettings] = useState<any>({ sub_admin: false, employee: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('https://bmh-eitu.onrender.com/settings');
      if (res.data.success && res.data.settings.doctor_management_access) {
        let value = res.data.settings.doctor_management_access;
        if (typeof value === 'string') value = JSON.parse(value);
        setSettings(value);
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post('https://bmh-eitu.onrender.com/settings', {
        key: 'doctor_management_access',
        value: settings
      });
      alert('Settings saved successfully');
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>System Settings</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ShieldCheck size={24} color={Colors.light.primary} />
          <Text style={styles.cardTitle}>Doctor Management Access Controls</Text>
        </View>
        <Text style={styles.description}>
          Control which roles have access to the Doctor Management features (e.g. creating doctors, managing slots, and booking patients).
        </Text>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingTitle}>Sub-Admin Access</Text>
            <Text style={styles.settingDesc}>Allow Sub-Admins to manage doctors in their department</Text>
          </View>
          <Switch 
            value={settings.sub_admin} 
            onValueChange={(v) => setSettings({...settings, sub_admin: v})} 
            trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
            thumbColor={settings.sub_admin ? Colors.light.primary : '#f8fafc'}
          />
        </View>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingTitle}>Employee Booking Access</Text>
            <Text style={styles.settingDesc}>Allow all employees to book patients for doctors</Text>
          </View>
          <Switch 
            value={settings.employee} 
            onValueChange={(v) => setSettings({...settings, employee: v})} 
            trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
            thumbColor={settings.employee ? Colors.light.primary : '#f8fafc'}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Configuration</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 24 },
  card: { backgroundColor: 'white', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginLeft: 12 },
  description: { fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 20 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderColor: '#f1f5f9' },
  settingTitle: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 4 },
  settingDesc: { fontSize: 13, color: '#94a3b8' },
  saveBtn: { backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
