import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { ShieldCheck } from 'lucide-react-native';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, { sub_admin: boolean, employee: boolean }>>({});
  const [salesOrderAccess, setSalesOrderAccess] = useState<Record<string, boolean>>({});
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, deptRes, empRes, subAdminRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/settings'),
        axios.get('https://napi.bharatmedicalhallplus.com/department'),
        axios.get('https://napi.bharatmedicalhallplus.com/employees'),
        axios.get('https://napi.bharatmedicalhallplus.com/admin/department-admins')
      ]);

      const depts = deptRes.data.data || [];
      setDepartments(depts);
      const emps = empRes.data.data || empRes.data || [];
      const subAdmins = subAdminRes.data.data || subAdminRes.data || [];
      
      const combinedUsers = [
        ...(Array.isArray(emps) ? emps : []),
        ...(Array.isArray(subAdmins) ? subAdmins.map(sa => ({ ...sa, role: 'Sub Admin' })) : [])
      ];
      setEmployees(combinedUsers);

      let currentSettings: any = {};
      if (settingsRes.data.success && settingsRes.data.settings.doctor_management_access) {
        let value = settingsRes.data.settings.doctor_management_access;
        if (typeof value === 'string') value = JSON.parse(value);
        currentSettings = value;
      }

      // Initialize missing departments in settings
      const initSettings: Record<string, { sub_admin: boolean, employee: boolean }> = { ...currentSettings };
      depts.forEach((dept: any) => {
        if (!initSettings[dept.name]) {
          // Default to old global setting if it was boolean, otherwise false
          const legacySubAdmin = typeof currentSettings.sub_admin === 'boolean' ? currentSettings.sub_admin : false;
          const legacyEmployee = typeof currentSettings.employee === 'boolean' ? currentSettings.employee : false;
          initSettings[dept.name] = { sub_admin: legacySubAdmin, employee: legacyEmployee };
        }
      });
      // Remove legacy top-level keys if they exist
      delete initSettings.sub_admin;
      delete initSettings.employee;
      
      setSettings(initSettings);

      let currentSalesOrderAccess = {};
      if (settingsRes.data.success && settingsRes.data.settings.sales_order_access) {
        let value = settingsRes.data.settings.sales_order_access;
        if (typeof value === 'string') value = JSON.parse(value);
        currentSalesOrderAccess = value;
      }
      setSalesOrderAccess(currentSalesOrderAccess);

    } catch (err) {
      console.error('Failed to fetch settings or departments', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        axios.post('https://napi.bharatmedicalhallplus.com/settings', {
          key: 'doctor_management_access',
          value: settings
        }),
        axios.post('https://napi.bharatmedicalhallplus.com/settings', {
          key: 'sales_order_access',
          value: salesOrderAccess
        })
      ]);
      alert('Settings saved successfully');
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (deptName: string, field: 'sub_admin' | 'employee', value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [deptName]: {
        ...prev[deptName],
        [field]: value
      }
    }));
  };

  const toggleSalesOrderAccess = (empId: string, value: boolean) => {
    setSalesOrderAccess(prev => ({
      ...prev,
      [empId]: value
    }));
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>System Settings</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ShieldCheck size={24} color={Colors.light.primary} />
          <Text style={styles.cardTitle}>Granular Doctor Management Access</Text>
        </View>
        <Text style={styles.description}>
          Control which departments allow their Sub-Admins to manage doctors, and which departments allow Employees to book patients.
        </Text>

        {departments.map((dept, index) => (
          <View key={dept.name || index} style={styles.deptCard}>
            <Text style={styles.deptName}>{dept.name}</Text>
            
            <View style={styles.settingRow}>
              <View style={{flex: 1}}>
                <Text style={styles.settingTitle}>Sub-Admin Access</Text>
                <Text style={styles.settingDesc}>Allow {dept.name} Sub-Admins to manage doctors & slots</Text>
              </View>
              <Switch 
                value={settings[dept.name]?.sub_admin || false} 
                onValueChange={(v) => toggleSetting(dept.name, 'sub_admin', v)} 
                trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                thumbColor={settings[dept.name]?.sub_admin ? Colors.light.primary : '#f8fafc'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={{flex: 1}}>
                <Text style={styles.settingTitle}>Employee Booking Access</Text>
                <Text style={styles.settingDesc}>Allow Receptionists to book patients for {dept.name} doctors</Text>
              </View>
              <Switch 
                value={settings[dept.name]?.employee || false} 
                onValueChange={(v) => toggleSetting(dept.name, 'employee', v)} 
                trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                thumbColor={settings[dept.name]?.employee ? Colors.light.primary : '#f8fafc'}
              />
            </View>
          </View>
        ))}

        {departments.length === 0 && (
          <Text style={{textAlign: 'center', padding: 20, color: '#64748b'}}>No departments found.</Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ShieldCheck size={24} color={Colors.light.primary} />
          <Text style={styles.cardTitle}>Sales Order & Item Master Access</Text>
        </View>
        <Text style={styles.description}>
          Control which employees have access to the Sales Order and Item Master features.
        </Text>

        {employees.map((emp, index) => {
          const empId = emp.id?.toString() || index.toString();
          return (
            <View key={empId} style={styles.settingRow}>
              <View style={{flex: 1}}>
                <Text style={styles.settingTitle}>{emp.full_name || emp.name || 'Unknown User'}</Text>
                <Text style={styles.settingDesc}>{emp.role || 'Employee'}</Text>
              </View>
              <Switch 
                value={salesOrderAccess[empId] || false} 
                onValueChange={(v) => toggleSalesOrderAccess(empId, v)} 
                trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                thumbColor={salesOrderAccess[empId] ? Colors.light.primary : '#f8fafc'}
              />
            </View>
          );
        })}

        {employees.length === 0 && (
          <Text style={{textAlign: 'center', padding: 20, color: '#64748b'}}>No users found.</Text>
        )}
      </View>

      <TouchableOpacity style={[styles.saveBtn, { marginBottom: 40 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Configuration</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 24 },
  card: { backgroundColor: 'white', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 40 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginLeft: 12 },
  description: { fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 20 },
  
  deptCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16 },
  deptName: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderColor: '#e2e8f0' },
  settingTitle: { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 4 },
  settingDesc: { fontSize: 13, color: '#94a3b8' },
  
  saveBtn: { backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
