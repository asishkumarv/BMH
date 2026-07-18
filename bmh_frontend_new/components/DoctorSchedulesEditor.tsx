import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal, Alert, Platform } from 'react-native';
import { Plus, Edit, Trash2, Calendar, MapPin, Clock, X, Search } from 'lucide-react-native';
import axios from 'axios';

export default function DoctorSchedulesEditor() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    qualification: '',
    department: '',
    schedule_type: 'Daily', // 'Daily' | 'Weekly' | 'Monthly'
    timing: '',
    cabin: '',
    fee: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/doctor-schedules');
      if (res.data.success) {
        setSchedules(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching doctor schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      qualification: '',
      department: '',
      schedule_type: 'Daily',
      timing: '',
      cabin: '',
      fee: '',
      notes: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      qualification: item.qualification || '',
      department: item.department || '',
      schedule_type: item.schedule_type || 'Daily',
      timing: item.timing || '',
      cabin: item.cabin || '',
      fee: item.fee || '',
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const proceed = async () => {
      try {
        await axios.delete(`https://napi.bharatmedicalhallplus.com/doctor-schedules/${id}`);
        fetchSchedules();
        alert('Doctor schedule deleted successfully');
      } catch (err) {
        console.error('Error deleting schedule:', err);
        alert('Failed to delete doctor schedule');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this doctor schedule?')) {
        proceed();
      }
    } else {
      Alert.alert(
        'Delete Schedule',
        'Are you sure you want to delete this doctor schedule?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', onPress: proceed, style: 'destructive' },
        ]
      );
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Doctor Name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        // Update
        await axios.put(`https://napi.bharatmedicalhallplus.com/doctor-schedules/${editingItem.id}`, formData);
      } else {
        // Create
        await axios.post('https://napi.bharatmedicalhallplus.com/doctor-schedules', formData);
      }
      setShowModal(false);
      fetchSchedules();
      alert(`Doctor schedule ${editingItem ? 'updated' : 'added'} successfully`);
    } catch (err) {
      console.error('Error saving schedule:', err);
      alert('Failed to save doctor schedule');
    } finally {
      setSaving(false);
    }
  };

  const filtered = schedules.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.department && item.department.toLowerCase().includes(search.toLowerCase())) ||
    (item.qualification && item.qualification.toLowerCase().includes(search.toLowerCase()))
  );

  const daily = filtered.filter(item => item.schedule_type === 'Daily');
  const weekly = filtered.filter(item => item.schedule_type === 'Weekly');
  const monthly = filtered.filter(item => item.schedule_type === 'Monthly');

  const renderSection = (title: string, items: any[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title} ({items.length})</Text>
      <View style={styles.listContainer}>
        {items.map((doc) => (
          <View key={doc.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.headerInfo}>
                <Text style={styles.docName}>{doc.name}</Text>
                {doc.department ? <Text style={styles.deptText}>{doc.department}</Text> : null}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(doc)}>
                  <Edit color="#0F766E" size={18} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(doc.id)}>
                  <Trash2 color="#EF4444" size={18} />
                </TouchableOpacity>
              </View>
            </View>

            {doc.qualification ? <Text style={styles.qualText}>{doc.qualification}</Text> : null}

            <View style={styles.detailsRow}>
              <Clock color="#64748B" size={14} style={{ marginRight: 6 }} />
              <Text style={styles.detailsText}>{doc.timing || 'N/A'}</Text>
            </View>

            <View style={styles.detailsRow}>
              <MapPin color="#64748B" size={14} style={{ marginRight: 6 }} />
              <Text style={styles.detailsText}>{doc.cabin || 'N/A'}</Text>
            </View>

            {doc.fee ? (
              <View style={[styles.detailsRow, { marginTop: 4 }]}>
                <Text style={styles.feeText}>Fee: {doc.fee}</Text>
              </View>
            ) : null}

            {doc.notes ? (
              <Text style={styles.noteText}>Note: {doc.notes}</Text>
            ) : null}
          </View>
        ))}
        {items.length === 0 && (
          <Text style={styles.emptyText}>No schedules in this category.</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#0F766E" style={{ marginVertical: 40 }} />;
  }

  return (
    <View style={styles.container}>
      {/* Controls */}
      <View style={styles.controlsRow}>
        <View style={styles.searchBox}>
          <Search color="#94A3B8" size={18} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by doctor name or specialty..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenAdd}>
          <Plus color="#FFF" size={18} style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>Add Doctor Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Lists */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderSection('Daily Doctors', daily)}
        {renderSection('Weekly / Bi-Weekly Doctors', weekly)}
        {renderSection('Monthly Doctors', monthly)}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Edit Doctor Schedule' : 'Add Doctor Schedule'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X color="#64748B" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Doctor Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dr. Sujit Ranjan Sahoo"
                value={formData.name}
                onChangeText={(v) => setFormData(p => ({ ...p, name: v }))}
              />

              <Text style={styles.label}>Specialty / Department</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dentist, Cardiologist"
                value={formData.department}
                onChangeText={(v) => setFormData(p => ({ ...p, department: v }))}
              />

              <Text style={styles.label}>Qualification</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MBBS, MD, MDS"
                value={formData.qualification}
                onChangeText={(v) => setFormData(p => ({ ...p, qualification: v }))}
              />

              <Text style={styles.label}>Schedule Type</Text>
              <View style={styles.typeSelector}>
                {(['Daily', 'Weekly', 'Monthly'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeBtn,
                      formData.schedule_type === type && styles.typeBtnActive,
                    ]}
                    onPress={() => setFormData(p => ({ ...p, schedule_type: type }))}
                  >
                    <Text style={[
                      styles.typeText,
                      formData.schedule_type === type && styles.typeTextActive,
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Consultation Days & Timing</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mon-Sat: 9:00 AM & 1:00 PM"
                value={formData.timing}
                onChangeText={(v) => setFormData(p => ({ ...p, timing: v }))}
              />

              <Text style={styles.label}>Cabin / Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Cabin 9, 1st Floor"
                value={formData.cabin}
                onChangeText={(v) => setFormData(p => ({ ...p, cabin: v }))}
              />

              <Text style={styles.label}>Consultation Fee</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. ₹300 or At Clinic"
                value={formData.fee}
                onChangeText={(v) => setFormData(p => ({ ...p, fee: v }))}
              />

              <Text style={styles.label}>Special Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
                placeholder="e.g. Advance booking recommended"
                value={formData.notes}
                onChangeText={(v) => setFormData(p => ({ ...p, notes: v }))}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    width: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFF',
    flexWrap: 'wrap',
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    flex: 1,
    minWidth: 260,
  },
  searchInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F766E',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  listContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    width: Platform.OS === 'web' ? '31%' : '100%',
    minWidth: 300,
    flexGrow: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerInfo: {
    flex: 1,
    marginRight: 8,
  },
  docName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  deptText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0D9488',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
  },
  qualText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 13,
    color: '#334155',
  },
  feeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  noteText: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#CBD5E1',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalForm: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    height: 80,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  typeBtnActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  typeTextActive: {
    color: '#FFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  saveBtn: {
    backgroundColor: '#0F766E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
