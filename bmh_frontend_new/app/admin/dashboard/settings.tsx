import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator, ScrollView, Modal, TextInput } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { ShieldCheck, X, Search, CheckCircle } from 'lucide-react-native';

export default function AdminSettings() {
  const [doctorManagementAccess, setDoctorManagementAccess] = useState<Record<string, boolean>>({});
  const [salesOrderAccess, setSalesOrderAccess] = useState<Record<string, boolean>>({});
  const [purchaseOrderAccess, setPurchaseOrderAccess] = useState<Record<string, boolean>>({});
  const [orderAssignAccess, setOrderAssignAccess] = useState<Record<string, boolean>>({});
  const [peonAssignmentAccess, setPeonAssignmentAccess] = useState<Record<string, boolean>>({});
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, empRes, subAdminRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/settings'),
        axios.get('https://napi.bharatmedicalhallplus.com/employees'),
        axios.get('https://napi.bharatmedicalhallplus.com/admin/department-admins')
      ]);

      const emps = empRes.data.data || empRes.data || [];
      const subAdmins = subAdminRes.data.data || subAdminRes.data || [];
      
      const combinedUsers = [
        ...(Array.isArray(emps) ? emps : []),
        ...(Array.isArray(subAdmins) ? subAdmins.map(sa => ({ ...sa, role: 'Sub Admin' })) : [])
      ];
      setEmployees(combinedUsers);

      const sData = settingsRes.data.settings || {};

      const parseSetting = (key: string) => {
        let val = sData[key];
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch(e){}
        }
        return val || {};
      };

      setDoctorManagementAccess(parseSetting('doctor_management_access'));
      setSalesOrderAccess(parseSetting('sales_order_access'));
      setPurchaseOrderAccess(parseSetting('purchase_order_access'));
      setOrderAssignAccess(parseSetting('order_assign_access'));
      setPeonAssignmentAccess(parseSetting('peon_assignment_access'));

    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccess = async (setter: any, stateObj: any, settingKey: string, empId: string, value: boolean) => {
    // Optimistic UI update
    setter((prev: any) => ({ ...prev, [empId]: value }));
    
    // Save to backend immediately
    const updatedState = { ...stateObj, [empId]: value };
    try {
      await axios.post('https://napi.bharatmedicalhallplus.com/settings', { key: settingKey, value: updatedState });
    } catch (err) {
      console.error('Failed to save', err);
      // Revert on failure
      setter((prev: any) => ({ ...prev, [empId]: !value }));
      alert('Failed to save setting. Please check your connection.');
    }
  };

  const renderAccessList = (title: string, settingKey: string, stateObj: any, setter: any) => {
    const filteredEmployees = employees.filter(emp => {
      const name = emp.full_name || emp.name || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
      <Modal visible={activeModal === title} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styles.modalTitle}>{title}</Text>
                <View style={styles.autoSaveBadge}>
                  <CheckCircle size={12} color="#10b981" style={{marginRight: 4}} />
                  <Text style={styles.autoSaveText}>Auto-saves</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => { setActiveModal(null); setSearchQuery(''); }}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={20} color="#94a3b8" style={styles.searchIcon} />
              <TextInput 
                style={styles.searchInput}
                placeholder="Search by name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <ScrollView style={styles.modalBody}>
              {filteredEmployees.map((emp, index) => {
                const empId = emp.id?.toString() || index.toString();
                return (
                  <View key={empId} style={styles.settingRow}>
                    <View style={{flex: 1}}>
                      <Text style={styles.settingTitle}>{emp.full_name || emp.name || 'Unknown User'}</Text>
                      <Text style={styles.settingDesc}>{emp.role || 'Employee'} • {emp.department || 'N/A'}</Text>
                    </View>
                    <Switch 
                      value={stateObj[empId] || false} 
                      onValueChange={(v) => toggleAccess(setter, stateObj, settingKey, empId, v)} 
                      trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                      thumbColor={stateObj[empId] ? Colors.light.primary : '#f8fafc'}
                    />
                  </View>
                );
              })}
              {filteredEmployees.length === 0 && (
                <Text style={{textAlign: 'center', padding: 20, color: '#64748b'}}>No users found.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderCard = (title: string, description: string, modalKey: string) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <ShieldCheck size={24} color={Colors.light.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.description}>{description}</Text>
      <TouchableOpacity style={styles.manageBtn} onPress={() => setActiveModal(modalKey)}>
        <Text style={styles.manageBtnText}>Manage Access</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={{flex:1}}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>System Settings</Text>
        <Text style={{color: '#64748b', marginBottom: 20}}>Changes are saved automatically when you toggle a switch.</Text>

        {renderCard('Granular Doctor Management Access', 'Control which Employees and Sub-Admins can manage doctors and book patients across all departments.', 'Doctor Management Access')}
        {renderCard('Peon Assignment Access', 'Control which employees can manage the Live Queue and Check-In for Peon tracking.', 'Peon Assignment Access')}
        {renderCard('Sales Order & Item Master Access', 'Control which employees have access to the Sales Order and Item Master features.', 'Sales Order Access')}
        {renderCard('Purchase Order Access', 'Control which employees have access to view and assign EcoGreen Purchase Orders.', 'Purchase Order Access')}
        {renderCard('Order Assign Access', 'Control which employees have access to view and assign deliveries for all orders on the Order Assign page.', 'Order Assign Access')}

      </ScrollView>

      {renderAccessList('Doctor Management Access', 'doctor_management_access', doctorManagementAccess, setDoctorManagementAccess)}
      {renderAccessList('Peon Assignment Access', 'peon_assignment_access', peonAssignmentAccess, setPeonAssignmentAccess)}
      {renderAccessList('Sales Order Access', 'sales_order_access', salesOrderAccess, setSalesOrderAccess)}
      {renderAccessList('Purchase Order Access', 'purchase_order_access', purchaseOrderAccess, setPurchaseOrderAccess)}
      {renderAccessList('Order Assign Access', 'order_assign_access', orderAssignAccess, setOrderAssignAccess)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  card: { backgroundColor: 'white', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginLeft: 12 },
  description: { fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 20 },
  
  manageBtn: { backgroundColor: '#e0e7ff', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  manageBtnText: { color: Colors.light.primary, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 600, height: '80%', backgroundColor: 'white', borderRadius: 16, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  
  autoSaveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 12 },
  autoSaveText: { fontSize: 11, color: '#10b981', fontWeight: 'bold' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#f8fafc' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#334155', padding: 0, outlineStyle: 'none' as any },

  modalBody: { padding: 20 },
  
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  settingTitle: { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 4 },
  settingDesc: { fontSize: 13, color: '#94a3b8' },
});
