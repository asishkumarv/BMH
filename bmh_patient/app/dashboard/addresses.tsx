import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../constants/Colors';
import { MapPin, Plus, Trash2 } from 'lucide-react-native';

export default function AddressesPage() {
  const [patient, setPatient] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newAddress, setNewAddress] = useState('');
  const [newLocationLink, setNewLocationLink] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await AsyncStorage.getItem('patientUser');
      if (data) {
        const p = JSON.parse(data);
        setPatient(p);
        const res = await axios.get(`https://napi.bharatmedicalhallplus.com/patient/profile/${p.id}`);
        if (res.data && res.data.success) {
          const fetchedPatient = res.data.data;
          setPatient(fetchedPatient);
          
          let parsedAddresses = [];
          if (fetchedPatient.addresses) {
            try {
              parsedAddresses = typeof fetchedPatient.addresses === 'string' 
                ? JSON.parse(fetchedPatient.addresses) 
                : fetchedPatient.addresses;
            } catch (e) {}
          }
          setAddresses(parsedAddresses || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.trim()) {
      alert("Please enter an address");
      return;
    }

    const updatedAddresses = [...addresses, { address: newAddress, location_link: newLocationLink }];
    
    try {
      const payload = {
        ...patient,
        addresses: updatedAddresses
      };
      
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/patient/profile/${patient.id}`, payload);
      
      if (res.data && res.data.success) {
        alert("Address saved successfully!");
        setAddresses(updatedAddresses);
        setNewAddress('');
        setNewLocationLink('');
      }
    } catch (err) {
      alert("Failed to save address");
      console.error(err);
    }
  };

  const handleDeleteAddress = async (index: number) => {
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm("Delete this address?")
      : await new Promise(resolve => Alert.alert("Confirm", "Delete this address?", [{text: "Cancel", onPress: () => resolve(false)}, {text: "Yes", onPress: () => resolve(true)}]));
      
    if (!confirmDelete) return;

    const updatedAddresses = addresses.filter((_, i) => i !== index);

    try {
      const payload = {
        ...patient,
        addresses: updatedAddresses
      };
      
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/patient/profile/${patient.id}`, payload);
      
      if (res.data && res.data.success) {
        setAddresses(updatedAddresses);
      }
    } catch (err) {
      alert("Failed to delete address");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>My Saved Addresses</Text>
        <Text style={styles.subtitle}>Manage your delivery locations for manual and online orders.</Text>
      </View>

      <View style={styles.addCard}>
        <Text style={styles.cardTitle}>Add New Address</Text>
        <TextInput 
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Full Address (House No, Street, Landmark, City)"
          value={newAddress}
          onChangeText={setNewAddress}
          multiline
        />
        <TextInput 
          style={styles.input}
          placeholder="Google Maps Location Link (Optional)"
          value={newLocationLink}
          onChangeText={setNewLocationLink}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={handleAddAddress}>
          <Plus size={20} color="#fff" style={{marginRight: 8}} />
          <Text style={styles.saveBtnText}>Save Address</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No saved addresses found</Text>
          </View>
        ) : (
          addresses.map((item, index) => (
            <View key={index} style={styles.addressCard}>
              <View style={styles.addressInfo}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
                   <MapPin size={18} color={Colors.light.primary} style={{marginRight: 6}} />
                   <Text style={styles.addressLabel}>Address {index + 1}</Text>
                </View>
                <Text style={styles.addressText}>{item.address}</Text>
                {item.location_link ? (
                  <Text style={styles.linkText} numberOfLines={1}>{item.location_link}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => handleDeleteAddress(index)} style={styles.deleteBtn}>
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, maxWidth: 800, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  addCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#f8fafc', marginBottom: 16 },
  saveBtn: { backgroundColor: Colors.light.primary, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  listContainer: { gap: 16 },
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyText: { color: '#94a3b8', fontSize: 16, marginTop: 12 },
  addressCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'space-between' },
  addressInfo: { flex: 1, paddingRight: 16 },
  addressLabel: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  addressText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  linkText: { fontSize: 13, color: Colors.light.primary, marginTop: 4 },
  deleteBtn: { padding: 8, backgroundColor: '#fef2f2', borderRadius: 8 }
});
