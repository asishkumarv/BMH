import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal, Alert, Platform } from 'react-native';
import { Plus, Edit, Trash2, Calendar, MapPin, Clock, X, Search, Pause, Play, Trash } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 20; h++) {
  const hr = h.toString().padStart(2, '0');
  TIME_SLOTS.push(`${hr}:00`);
  TIME_SLOTS.push(`${hr}:30`);
}

const WEEKDAYS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 }
];

export default function DoctorSchedulesEditor() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [peonsList, setPeonsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [formData, setFormData] = useState<any>({
    name: '',
    qualification: '',
    department: '',
    schedule_type: 'Daily', // 'Daily' | 'Weekly' | 'Monthly'
    timing: '',
    cabin: '',
    fee: '',
    notes: '',
    doctor_id: '',
    status: 'Active', // 'Active' | 'Paused' | 'Stopped'
    timing_config: { slots: [{ start_time: '09:00', end_time: '12:00', total_tokens: '20', fee: '300', assigned_peon_id: '' }] },
    recurrence_rule: { days: [], type: 'dates', dates: [], patterns: [] }
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchedules();
    fetchDoctorsAndPeons();
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

  const fetchDoctorsAndPeons = async () => {
    try {
      const [docsRes, empsRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/doctors'),
        axios.get('https://napi.bharatmedicalhallplus.com/employees')
      ]);
      setDoctorsList(docsRes.data.data || []);
      setPeonsList(empsRes.data.data || []);
    } catch (e) {
      console.error('Failed to load doctors and peons:', e);
    }
  };

  const handleSelectDoctor = (docId: string) => {
    const doc = doctorsList.find(d => d.id === docId);
    if (doc) {
      setFormData((prev: any) => ({
        ...prev,
        doctor_id: docId,
        name: doc.full_name,
        department: doc.department || '',
        qualification: doc.experience ? `${doc.experience} Years Experience` : '',
        fee: doc.consultation_fee ? `${doc.consultation_fee}` : ''
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        doctor_id: ''
      }));
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
      doctor_id: '',
      status: 'Active',
      timing_config: { slots: [{ start_time: '09:00', end_time: '12:00', total_tokens: '20', fee: '300', assigned_peon_id: '' }] },
      recurrence_rule: { days: [], type: 'dates', dates: [], patterns: [] }
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    
    let tConfig = { slots: [{ start_time: '09:00', end_time: '12:00', total_tokens: '20', fee: '300', assigned_peon_id: '' }] };
    if (item.timing_config) {
      try {
        tConfig = typeof item.timing_config === 'string' ? JSON.parse(item.timing_config) : item.timing_config;
      } catch (e) {
        console.error(e);
      }
    }
    
    let rRule = { days: [], type: 'dates', dates: [], patterns: [] };
    if (item.recurrence_rule) {
      try {
        rRule = typeof item.recurrence_rule === 'string' ? JSON.parse(item.recurrence_rule) : item.recurrence_rule;
      } catch (e) {
        console.error(e);
      }
    }

    setFormData({
      name: item.name || '',
      qualification: item.qualification || '',
      department: item.department || '',
      schedule_type: item.schedule_type || 'Daily',
      timing: item.timing || '',
      cabin: item.cabin || '',
      fee: item.fee || '',
      notes: item.notes || '',
      doctor_id: item.doctor_id || '',
      status: item.status || 'Active',
      timing_config: tConfig,
      recurrence_rule: rRule
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (item: any) => {
    const nextStatus = item.status === 'Active' ? 'Paused' : 'Active';
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/doctor-schedules/${item.id}`, {
        ...item,
        status: nextStatus
      });
      if (res.data.success) {
        fetchSchedules();
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    }
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
      if (window.confirm('Are you sure you want to delete this doctor schedule template? This will stop future automatic slots generation for this schedule.')) {
        proceed();
      }
    } else {
      Alert.alert(
        'Delete Schedule',
        'Are you sure you want to delete this doctor schedule template?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', onPress: proceed, style: 'destructive' },
        ]
      );
    }
  };

  // Dynamic slot handlers
  const handleAddSlot = () => {
    const newSlots = [...formData.timing_config.slots, { start_time: '09:00', end_time: '12:00', total_tokens: '20', fee: '300', assigned_peon_id: '' }];
    setFormData((p: any) => ({
      ...p,
      timing_config: { ...p.timing_config, slots: newSlots }
    }));
  };

  const handleRemoveSlot = (index: number) => {
    const newSlots = formData.timing_config.slots.filter((_: any, i: number) => i !== index);
    setFormData((p: any) => ({
      ...p,
      timing_config: { ...p.timing_config, slots: newSlots }
    }));
  };

  const handleUpdateSlotField = (index: number, key: string, val: any) => {
    const newSlots = [...formData.timing_config.slots];
    newSlots[index] = { ...newSlots[index], [key]: val };
    setFormData((p: any) => ({
      ...p,
      timing_config: { ...p.timing_config, slots: newSlots }
    }));
  };

  // Recurrence rule handlers
  const toggleWeekday = (dayVal: number) => {
    const currentDays = formData.recurrence_rule.days || [];
    const newDays = currentDays.includes(dayVal)
      ? currentDays.filter((d: number) => d !== dayVal)
      : [...currentDays, dayVal];
    setFormData((p: any) => ({
      ...p,
      recurrence_rule: { ...p.recurrence_rule, days: newDays }
    }));
  };

  const handleAddMonthlyPattern = () => {
    const currentPatterns = formData.recurrence_rule.patterns || [];
    const newPatterns = [...currentPatterns, { week: 1, day: 0 }];
    setFormData((p: any) => ({
      ...p,
      recurrence_rule: { ...p.recurrence_rule, patterns: newPatterns }
    }));
  };

  const handleRemoveMonthlyPattern = (idx: number) => {
    const currentPatterns = formData.recurrence_rule.patterns || [];
    const newPatterns = currentPatterns.filter((_: any, i: number) => i !== idx);
    setFormData((p: any) => ({
      ...p,
      recurrence_rule: { ...p.recurrence_rule, patterns: newPatterns }
    }));
  };

  const handleUpdateMonthlyPattern = (idx: number, key: string, val: any) => {
    const currentPatterns = [...(formData.recurrence_rule.patterns || [])];
    currentPatterns[idx] = { ...currentPatterns[idx], [key]: parseInt(val) };
    setFormData((p: any) => ({
      ...p,
      recurrence_rule: { ...p.recurrence_rule, patterns: currentPatterns }
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Doctor Name/Profile selection is required');
      return;
    }
    
    // Auto-generate text summary for "timing" for backward compatibility
    let textTiming = '';
    if (formData.schedule_type === 'Daily') {
      const slotTexts = formData.timing_config.slots.map((s: any) => `${s.start_time} - ${s.end_time}`);
      textTiming = `Daily: ${slotTexts.join(', ')}`;
    } else if (formData.schedule_type === 'Weekly') {
      const selectedDayNames = WEEKDAYS.filter(w => formData.recurrence_rule.days?.includes(w.value)).map(w => w.label.substring(0, 3));
      const slotTexts = formData.timing_config.slots.map((s: any) => `${s.start_time} - ${s.end_time}`);
      textTiming = `${selectedDayNames.join(', ')}: ${slotTexts.join(', ')}`;
    } else {
      if (formData.recurrence_rule.type === 'dates') {
        textTiming = `Monthly Dates: ${formData.recurrence_rule.dates?.join(', ')}`;
      } else {
        const orderNames = ['1st', '2nd', '3rd', '4th', '5th'];
        const pTexts = (formData.recurrence_rule.patterns || []).map((p: any) => {
          const wName = orderNames[p.week - 1] || `${p.week}th`;
          const dName = WEEKDAYS.find(w => w.value === p.day)?.label || '';
          return `${wName} ${dName}`;
        });
        textTiming = `Monthly: ${pTexts.join(', ')}`;
      }
    }

    const payload = {
      ...formData,
      timing: textTiming
    };

    setSaving(true);
    try {
      if (editingItem) {
        await axios.put(`https://napi.bharatmedicalhallplus.com/doctor-schedules/${editingItem.id}`, payload);
      } else {
        await axios.post('https://napi.bharatmedicalhallplus.com/doctor-schedules', payload);
      }
      setShowModal(false);
      fetchSchedules();
      alert(`Doctor schedule template ${editingItem ? 'updated' : 'added'} successfully`);
    } catch (err: any) {
      console.error('Error saving schedule template:', err);
      alert(err.response?.data?.message || 'Failed to save doctor schedule template');
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
        {items.map((doc) => {
          const isActive = doc.status === 'Active';
          return (
            <View key={doc.id} style={[styles.card, !isActive && { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}>
              <View style={styles.cardHeader}>
                <View style={styles.headerInfo}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  {doc.department ? <Text style={styles.deptText}>{doc.department}</Text> : null}
                  <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusPaused]}>
                    <Text style={[styles.statusText, isActive ? styles.textActive : styles.textPaused]}>{doc.status || 'Active'}</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: isActive ? '#FEF3C7' : '#D1FAE5' }]} 
                    onPress={() => handleToggleStatus(doc)}
                    title={isActive ? 'Pause' : 'Resume'}
                  >
                    {isActive ? <Pause color="#D97706" size={16} /> : <Play color="#059669" size={16} />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(doc)}>
                    <Edit color="#0F766E" size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(doc.id)}>
                    <Trash2 color="#EF4444" size={16} />
                  </TouchableOpacity>
                </View>
              </View>

              {doc.qualification ? <Text style={styles.qualText}>{doc.qualification}</Text> : null}

              <View style={styles.detailsRow}>
                <Clock color="#64748B" size={14} style={{ marginRight: 6 }} />
                <Text style={styles.detailsText}>{doc.timing || 'N/A'}</Text>
              </View>

              {doc.cabin ? (
                <View style={styles.detailsRow}>
                  <MapPin color="#64748B" size={14} style={{ marginRight: 6 }} />
                  <Text style={styles.detailsText}>{doc.cabin}</Text>
                </View>
              ) : null}

              {doc.fee ? (
                <View style={[styles.detailsRow, { marginTop: 4 }]}>
                  <Text style={styles.feeText}>Fee: ₹{doc.fee}</Text>
                </View>
              ) : null}

              {doc.notes ? (
                <Text style={styles.noteText}>Note: {doc.notes}</Text>
              ) : null}
            </View>
          );
        })}
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
            placeholder="Search by doctor name or department..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenAdd}>
          <Plus color="#FFF" size={18} style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>Predefine Doctor Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Lists */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderSection('Daily Doctors', daily)}
        {renderSection('Weekly / Bi-Weekly Doctors', weekly)}
        {renderSection('Monthly Doctors', monthly)}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Edit Predefined Schedule' : 'Predefine Doctor Schedule'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X color="#64748B" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.label}>Select System Doctor profile *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.doctor_id}
                  onValueChange={(val) => handleSelectDoctor(val)}
                  style={styles.picker}
                >
                  <Picker.Item label="-- Choose Doctor --" value="" />
                  {doctorsList.map((d: any) => (
                    <Picker.Item key={d.id} label={`${d.full_name} (${d.department})`} value={d.id} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Doctor Display Name (for patient view)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dr. Sujit Ranjan Sahoo"
                value={formData.name}
                onChangeText={(v) => setFormData((p: any) => ({ ...p, name: v }))}
              />

              <Text style={styles.label}>Specialty / Department</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dentist, Cardiologist"
                value={formData.department}
                onChangeText={(v) => setFormData((p: any) => ({ ...p, department: v }))}
              />

              <Text style={styles.label}>Qualification / Description</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MBBS, MD, MDS"
                value={formData.qualification}
                onChangeText={(v) => setFormData((p: any) => ({ ...p, qualification: v }))}
              />

              <Text style={styles.label}>Cabin / Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Cabin 9, 1st Floor"
                value={formData.cabin}
                onChangeText={(v) => setFormData((p: any) => ({ ...p, cabin: v }))}
              />

              <Text style={styles.label}>Consultation Fee (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 300"
                value={formData.fee}
                onChangeText={(v) => setFormData((p: any) => ({ ...p, fee: v }))}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Special Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={2}
                placeholder="e.g. Advance booking recommended"
                value={formData.notes}
                onChangeText={(v) => setFormData((p: any) => ({ ...p, notes: v }))}
              />

              <Text style={styles.label}>Schedule Recurrence Type</Text>
              <View style={styles.typeSelector}>
                {(['Daily', 'Weekly', 'Monthly'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeBtn,
                      formData.schedule_type === type && styles.typeBtnActive,
                    ]}
                    onPress={() => setFormData((p: any) => ({ ...p, schedule_type: type }))}
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

              {/* Weekly recurrence parameters */}
              {formData.schedule_type === 'Weekly' && (
                <View style={styles.configBox}>
                  <Text style={styles.configTitle}>Select Days Available in a Week:</Text>
                  <View style={styles.daysRow}>
                    {WEEKDAYS.map((w) => {
                      const isSelected = formData.recurrence_rule.days?.includes(w.value);
                      return (
                        <TouchableOpacity
                          key={w.value}
                          style={[styles.dayBadge, isSelected && styles.dayBadgeSelected]}
                          onPress={() => toggleWeekday(w.value)}
                        >
                          <Text style={[styles.dayBadgeText, isSelected && styles.dayBadgeTextSelected]}>
                            {w.label.substring(0, 3)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Monthly recurrence parameters */}
              {formData.schedule_type === 'Monthly' && (
                <View style={styles.configBox}>
                  <Text style={styles.configTitle}>Monthly Availability Rules:</Text>
                  <View style={styles.typeSelector}>
                    <TouchableOpacity
                      style={[styles.typeBtn, formData.recurrence_rule.type === 'dates' && styles.typeBtnActive]}
                      onPress={() => setFormData((p: any) => ({
                        ...p,
                        recurrence_rule: { ...p.recurrence_rule, type: 'dates' }
                      }))}
                    >
                      <Text style={[styles.typeText, formData.recurrence_rule.type === 'dates' && styles.typeTextActive]}>Specific Dates</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeBtn, formData.recurrence_rule.type === 'pattern' && styles.typeBtnActive]}
                      onPress={() => setFormData((p: any) => ({
                        ...p,
                        recurrence_rule: { ...p.recurrence_rule, type: 'pattern' }
                      }))}
                    >
                      <Text style={[styles.typeText, formData.recurrence_rule.type === 'pattern' && styles.typeTextActive]}>Weekday Pattern</Text>
                    </TouchableOpacity>
                  </View>

                  {formData.recurrence_rule.type === 'dates' ? (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.label}>Available Dates of the Month (comma separated)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 5, 12, 28"
                        value={formData.recurrence_rule.dates?.join(', ') || ''}
                        onChangeText={(t) => {
                          const datesArr = t.split(',')
                            .map(x => parseInt(x.trim()))
                            .filter(x => !isNaN(x) && x >= 1 && x <= 31);
                          setFormData((p: any) => ({
                            ...p,
                            recurrence_rule: { ...p.recurrence_rule, dates: datesArr }
                          }));
                        }}
                      />
                    </View>
                  ) : (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.configSubtitle}>Select Weekday Patterns:</Text>
                      {(formData.recurrence_rule.patterns || []).map((pattern: any, idx: number) => (
                        <View key={idx} style={styles.patternRow}>
                          <View style={[styles.pickerContainer, { flex: 1 }]}>
                            <Picker
                              selectedValue={pattern.week}
                              onValueChange={(val) => handleUpdateMonthlyPattern(idx, 'week', val)}
                              style={styles.picker}
                            >
                              <Picker.Item label="1st" value={1} />
                              <Picker.Item label="2nd" value={2} />
                              <Picker.Item label="3rd" value={3} />
                              <Picker.Item label="4th" value={4} />
                              <Picker.Item label="5th" value={5} />
                            </Picker>
                          </View>
                          <View style={[styles.pickerContainer, { flex: 1 }]}>
                            <Picker
                              selectedValue={pattern.day}
                              onValueChange={(val) => handleUpdateMonthlyPattern(idx, 'day', val)}
                              style={styles.picker}
                            >
                              {WEEKDAYS.map(w => (
                                <Picker.Item key={w.value} label={w.label} value={w.value} />
                              ))}
                            </Picker>
                          </View>
                          <TouchableOpacity onPress={() => handleRemoveMonthlyPattern(idx)} style={styles.removePatternBtn}>
                            <Trash color="#EF4444" size={18} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity style={styles.addPatternBtn} onPress={handleAddMonthlyPattern}>
                        <Text style={styles.addPatternText}>+ Add Pattern Occurrence</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Timing configs (List of slots) */}
              <View style={styles.configBox}>
                <Text style={styles.configTitle}>Auto-Created Slot Configurations:</Text>
                {formData.timing_config?.slots?.map((slot: any, idx: number) => (
                  <View key={idx} style={styles.slotBlock}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#334155' }}>Slot #{idx + 1}</Text>
                      {formData.timing_config.slots.length > 1 && (
                        <TouchableOpacity onPress={() => handleRemoveSlot(idx)}>
                          <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.slotFormRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Start Time</Text>
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={slot.start_time}
                            onValueChange={(v) => handleUpdateSlotField(idx, 'start_time', v)}
                            style={styles.picker}
                          >
                            {TIME_SLOTS.map(t => (
                              <Picker.Item key={t} label={t} value={t} />
                            ))}
                          </Picker>
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>End Time</Text>
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={slot.end_time}
                            onValueChange={(v) => handleUpdateSlotField(idx, 'end_time', v)}
                            style={styles.picker}
                          >
                            {TIME_SLOTS.map(t => (
                              <Picker.Item key={t} label={t} value={t} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    </View>

                    <View style={styles.slotFormRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Tokens</Text>
                        <TextInput
                          style={styles.smallInput}
                          value={String(slot.total_tokens)}
                          onChangeText={(v) => handleUpdateSlotField(idx, 'total_tokens', v)}
                          placeholder="20"
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Fee (₹)</Text>
                        <TextInput
                          style={styles.smallInput}
                          value={String(slot.fee)}
                          onChangeText={(v) => handleUpdateSlotField(idx, 'fee', v)}
                          placeholder="300"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.miniLabel}>Assigned Peon (Optional)</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={slot.assigned_peon_id}
                          onValueChange={(v) => handleUpdateSlotField(idx, 'assigned_peon_id', v)}
                          style={styles.picker}
                        >
                          <Picker.Item label="None" value="" />
                          {peonsList.map((p: any) => (
                            <Picker.Item key={p.id} label={p.full_name} value={p.id} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.addSlotBtn} onPress={handleAddSlot}>
                  <Text style={styles.addSlotBtnText}>+ Add Timing Slot</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Scheduler Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.status}
                  onValueChange={(v) => setFormData((p: any) => ({ ...p, status: v }))}
                  style={styles.picker}
                >
                  <Picker.Item label="Active (Generating slots)" value="Active" />
                  <Picker.Item label="Paused (Stop generating temporarily)" value="Paused" />
                  <Picker.Item label="Stopped" value="Stopped" />
                </Picker>
              </View>

            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Template'}</Text>
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
    ...Platform.select({ web: { outlineWidth: 0 as any } })
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
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusPaused: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textActive: {
    color: '#065F46',
  },
  textPaused: {
    color: '#981B1B',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontStyle: 'italic',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    fontStyle: 'italic',
    paddingLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    ...Platform.select({ web: { boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' } }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalForm: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 12,
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    ...Platform.select({ web: { outlineWidth: 0 as any } }),
  },
  smallInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    color: '#1E293B',
    ...Platform.select({ web: { outlineWidth: 0 as any } }),
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  picker: {
    height: 40,
    width: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: '#1E293B',
    fontSize: 14,
    ...Platform.select({ web: { outlineWidth: 0 as any } }),
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  typeBtnActive: {
    borderColor: '#0F766E',
    backgroundColor: '#ECFDF5',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  typeTextActive: {
    color: '#0F766E',
  },
  configBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
    marginBottom: 8,
  },
  configTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 8,
  },
  configSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  dayBadgeSelected: {
    borderColor: '#0F766E',
    backgroundColor: '#0F766E',
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  dayBadgeTextSelected: {
    color: '#FFF',
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  addPatternBtn: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  addPatternText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  removePatternBtn: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  slotBlock: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  slotFormRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  addSlotBtn: {
    paddingVertical: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  addSlotBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0F766E',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
