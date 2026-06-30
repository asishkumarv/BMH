import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { Save, Calendar } from 'lucide-react-native';

export default function DoctorPatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editNextDate, setEditNextDate] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const res = await axios.get(`https://napi.bharatmedicalhallplus.com/doctors/${user.id}/patients`);
        if (res.data.success) {
          setPatients(res.data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (p: any) => {
    setEditingId(p.consultation_id);
    setEditNotes(p.notes || '');
    // Ensure date is string
    const dateStr = p.next_consultation_date ? new Date(p.next_consultation_date).toISOString().split('T')[0] : '';
    setEditNextDate(dateStr);
  };

  const saveEdit = async (consultation_id: number) => {
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/doctors/consultation/${consultation_id}`, {
        notes: editNotes,
        next_consultation_date: editNextDate || null
      });
      alert('Consultation updated successfully');
      setEditingId(null);
      fetchPatients();
    } catch (error) {
      alert('Error updating consultation');
      console.error(error);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} color={Colors.light.primary} />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Patients & Consultation History</Text>
      
      {patients.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#64748b' }}>No patient history found.</Text>
      ) : (
        patients.map((p, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.patientName}>{p.name}</Text>
              <Text style={styles.date}>{new Date(p.consultation_date).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.info}>Age: {p.age} | Gender: {p.gender} | Phone: {p.mobile}</Text>

            {editingId === p.consultation_id ? (
              <View style={styles.editSection}>
                <Text style={styles.label}>Notes:</Text>
                <TextInput 
                  style={styles.textArea} 
                  multiline 
                  value={editNotes} 
                  onChangeText={setEditNotes} 
                />
                <Text style={styles.label}>Next Consultation Date (YYYY-MM-DD):</Text>
                <TextInput 
                  style={styles.input} 
                  value={editNextDate} 
                  onChangeText={setEditNextDate} 
                />
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.btnSecondary} onPress={() => setEditingId(null)}>
                    <Text style={styles.btnTextSec}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => saveEdit(p.consultation_id)}>
                    <Save color="white" size={16} />
                    <Text style={styles.btnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.viewSection}>
                <Text style={styles.notesLabel}>Consultation Notes:</Text>
                <Text style={styles.notesText}>{p.notes || 'No notes added.'}</Text>
                
                {p.next_consultation_date && (
                  <View style={styles.nextDateBox}>
                    <Calendar size={16} color="#3b82f6" />
                    <Text style={styles.nextDateText}>Follow-up: {new Date(p.next_consultation_date).toLocaleDateString()}</Text>
                  </View>
                )}
                
                <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(p)}>
                  <Text style={styles.editBtnText}>Edit Notes</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: Colors.light.background },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20, color: Colors.light.text },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  patientName: { fontSize: 18, fontWeight: '600', color: Colors.light.text },
  date: { fontSize: 14, color: '#64748b' },
  info: { fontSize: 14, color: '#64748b', marginBottom: 16, flexWrap: 'wrap' },
  notesLabel: { fontWeight: '600', marginBottom: 4, color: Colors.light.text },
  notesText: { color: '#475569', backgroundColor: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 12 },
  nextDateBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', padding: 8, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 12 },
  nextDateText: { marginLeft: 6, color: '#1d4ed8', fontWeight: '500' },
  editBtn: { alignSelf: 'flex-start' },
  editBtnText: { color: Colors.light.primary, fontWeight: '600' },
  editSection: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 8 },
  label: { fontWeight: '500', marginBottom: 6, color: Colors.light.text },
  textArea: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 12, height: 100, marginBottom: 12, textAlignVertical: 'top' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 10, marginBottom: 16 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, gap: 6 },
  btnSecondary: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnTextSec: { color: '#64748b', fontWeight: '600' },
  viewSection: {}
});
