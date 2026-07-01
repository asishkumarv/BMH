import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Modal, Alert, Platform } from 'react-native';
import { Users, Calendar, DollarSign, ListOrdered, CheckCircle, XCircle, Plus, X } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../../constants/Colors';
import { useResponsive } from '../../../../hooks/useResponsive';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
const TABS = ['Doctors', 'Slots', 'Bookings']; // No Revenue tab

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 20; h++) {
  const hr = h.toString().padStart(2, '0');
  TIME_SLOTS.push(`${hr}:00`);
  TIME_SLOTS.push(`${hr}:30`);
}

export default function DepartmentDoctorManagement() {
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState('Doctors');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Add Doctor Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    full_name: '', email: '', mobile: '', password: '', 
    department: '', role: 'Doctor', experience: '', gender: 'Male', description: ''
  });
  const [adding, setAdding] = useState(false);

  const [showAddSlotForm, setShowAddSlotForm] = useState(false);
  const [newSlot, setNewSlot] = useState({
    doctor_id: '', date: '', start_time: '', end_time: '', total_tokens: '', fee: '', assigned_peon_id: ''
  });
  const [addingSlot, setAddingSlot] = useState(false);
  
  // Manage Tokens
  const [manageTokenSlot, setManageTokenSlot] = useState<any>(null);
  const [slotBookingsMap, setSlotBookingsMap] = useState<any>({});
  const [selectedTokens, setSelectedTokens] = useState<number[]>([]);

  const handleManageTokens = async (s: any) => {
    setManageTokenSlot(s);
    setSelectedTokens([]);
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings?slot_id=${s.id}`);
      const mapping: any = {};
      res.data.data.forEach((b: any) => {
        mapping[b.token_number] = b.status;
      });
      setSlotBookingsMap(mapping);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTokenSelect = (token_number: number) => {
    const status = slotBookingsMap[token_number];
    if (status && status !== 'VIP Quota') {
      alert('This token is already booked by a patient.');
      return;
    }
    setSelectedTokens(prev => 
      prev.includes(token_number) 
        ? prev.filter(t => t !== token_number) 
        : [...prev, token_number]
    );
  };

  const executeMultiBlock = async (action: 'block' | 'unblock') => {
    if (selectedTokens.length === 0) return;
    
    const confirmMsg = action === 'block' 
      ? `Are you sure you want to block ${selectedTokens.length} tokens?`
      : `Are you sure you want to unblock ${selectedTokens.length} tokens?`;

    const proceed = async () => {
      try {
        const results = await Promise.all(selectedTokens.map(async (token_number) => {
          // Skip if already in desired state
          if (action === 'block' && slotBookingsMap[token_number] === 'VIP Quota') return token_number;
          if (action === 'unblock' && slotBookingsMap[token_number] !== 'VIP Quota') return token_number;

          const res = await axios.post('https://napi.bharatmedicalhallplus.com/bookings/block-token', {
            slot_id: manageTokenSlot.id,
            token_number,
            action,
            booked_by: user?.id || undefined
          });
          return res.data.success ? token_number : null;
        }));

        const successful = results.filter(Boolean);
        if (successful.length > 0) {
          const newMap = { ...slotBookingsMap };
          successful.forEach((t: any) => {
            newMap[t] = action === 'block' ? 'VIP Quota' : undefined;
          });
          setSlotBookingsMap(newMap);
        }
        setSelectedTokens([]);
        alert(`Successfully ${action}ed ${successful.length} tokens.`);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error updating tokens');
      }
    };

    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMsg)) return;
      proceed();
    } else {
      Alert.alert(
        action === 'block' ? 'Block Tokens' : 'Unblock Tokens',
        confirmMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: proceed }
        ]
      );
    }
  };
  const [peons, setPeons] = useState<any[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Booking Filters
  const [bDoctor, setBDoctor] = useState('');
  const [bEmployee, setBEmployee] = useState('');
  const [bDate, setBDate] = useState('');
  const [bPatient, setBPatient] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [showBDatePicker, setShowBDatePicker] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await AsyncStorage.getItem('subAdminUser');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (activeTab === 'Bookings' && user) fetchBookings();
    else if (user) fetchData();
  }, [activeTab, bDoctor, bEmployee, bDate, bPatient, user]);

  const fetchBookings = async () => {
    try {
      let url = `https://napi.bharatmedicalhallplus.com/bookings?department=${user.department}&`;
      if (bDoctor) url += `doctor_id=${bDoctor}&`;
      if (bEmployee) url += `booked_by=${bEmployee}&`;
      if (bDate) url += `date=${bDate}&`;
      if (bPatient) url += `patient_name=${bPatient}&`;
      const res = await axios.get(url);
      setBookings(res.data.data);
      
      const empRes = await axios.get('https://napi.bharatmedicalhallplus.com/employees').catch(()=>null);
      if (empRes?.data?.data) setEmployees(empRes.data.data);
      const docsRes = await axios.get(`https://napi.bharatmedicalhallplus.com/doctors?department=${user.department}`).catch(()=>null);
      if (docsRes?.data?.data) setDoctors(docsRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = async () => {
    if (!bookings || bookings.length === 0) return;
    
    let csvContent = "Token,Patient Name,Mobile,Doctor,Department,Date,Time,Status,Payment Mode,Booked By\n";
    bookings.forEach((b) => {
      csvContent += `${b.token_number},${b.patient_name},${b.mobile},${b.doctor_name},${b.department},${new Date(b.date).toLocaleDateString()},${b.start_time},${b.status},${b.payment_mode},${b.booked_by_name || 'Self'}\n`;
    });
    
    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', 'department_bookings.csv');
      a.click();
    } else {
      // @ts-ignore
      const uri = FileSystem.documentDirectory + "department_bookings.csv";
      // @ts-ignore
      await FileSystem.writeAsStringAsync(uri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'Doctors') {
        const res = await axios.get(`https://napi.bharatmedicalhallplus.com/doctors?department=${user.department}`);
        setDoctors(res.data.data);
      } else if (activeTab === 'Slots') {
        const [resSlots, resPeons] = await Promise.all([
          axios.get('https://napi.bharatmedicalhallplus.com/doctors/slots'),
          axios.get('https://napi.bharatmedicalhallplus.com/doctors/peons')
        ]);
        const deptSlots = resSlots.data.data.filter((s: any) => s.doctor_name && doctors.some(d => d.full_name === s.doctor_name));
        setSlots(deptSlots.length > 0 ? deptSlots : resSlots.data.data);
        setPeons(resPeons.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approveDoctor = async (id: string, status: string) => {
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/doctors/${id}/approve`, { status });
      fetchData();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleAddDoctor = async () => {
    if(!newDoctor.full_name || !newDoctor.email || !newDoctor.password) {
      alert("Please fill all required fields");
      return;
    }
    setAdding(true);
    try {
      await axios.post('https://napi.bharatmedicalhallplus.com/doctors/create', {
        ...newDoctor,
        department: user.department // Lock to sub-admin's department
      });
      alert('Doctor added successfully!');
      setShowAddForm(false);
      setNewDoctor({
        full_name: '', email: '', mobile: '', password: '', 
        department: '', role: 'Doctor', experience: '', gender: 'Male', description: ''
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error adding doctor');
    } finally {
      setAdding(false);
    }
  };

  const handleAddSlot = async () => {
    if(!newSlot.doctor_id || !newSlot.date || !newSlot.start_time || !newSlot.end_time || !newSlot.total_tokens || !newSlot.fee) {
      alert("Please fill all required fields");
      return;
    }
    setAddingSlot(true);
    try {
      await axios.post('https://napi.bharatmedicalhallplus.com/doctors/slots', newSlot);
      alert('Slot created successfully!');
      setShowAddSlotForm(false);
      setNewSlot({ doctor_id: '', date: '', start_time: '', end_time: '', total_tokens: '', fee: '', assigned_peon_id: '' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating slot');
    } finally {
      setAddingSlot(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
        <Text style={styles.header}>Department Doctors</Text>
        {!showAddForm && !showAddSlotForm && activeTab === 'Doctors' && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(true)}>
            <Plus color="white" size={20} />
            <Text style={styles.addBtnText}>Add Doctor</Text>
          </TouchableOpacity>
        )}
        {!showAddForm && !showAddSlotForm && activeTab === 'Slots' && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddSlotForm(true)}>
            <Plus color="white" size={20} />
            <Text style={styles.addBtnText}>Create Slot</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {showAddForm ? (
        <ScrollView style={styles.card} contentContainerStyle={{ padding: 24 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setShowAddForm(false)}>
            <Text style={styles.backBtnText}>← Back to List</Text>
          </TouchableOpacity>
          <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#1e293b'}}>Create New Doctor Profile</Text>
          
          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput style={styles.input} value={newDoctor.full_name} onChangeText={(t) => setNewDoctor({...newDoctor, full_name: t})} placeholder="Dr. John Doe" />
            </View>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Email *</Text>
              <TextInput style={styles.input} value={newDoctor.email} onChangeText={(t) => setNewDoctor({...newDoctor, email: t})} placeholder="doctor@bmh.com" keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>

          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Mobile</Text>
              <TextInput style={styles.input} value={newDoctor.mobile} onChangeText={(t) => setNewDoctor({...newDoctor, mobile: t})} placeholder="10-digit number" keyboardType="phone-pad" />
            </View>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Password *</Text>
              <TextInput style={styles.input} value={newDoctor.password} onChangeText={(t) => setNewDoctor({...newDoctor, password: t})} placeholder="Auto-gen or type" />
            </View>
          </View>

          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Department</Text>
              <TextInput style={[styles.input, {backgroundColor: '#e2e8f0', color: '#64748b'}]} value={user?.department} editable={false} placeholder="Locked to your dept" />
            </View>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Role</Text>
              <TextInput style={styles.input} value={newDoctor.role} onChangeText={(t) => setNewDoctor({...newDoctor, role: t})} placeholder="Doctor / Head of Dept" />
            </View>
          </View>

          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Experience (Years)</Text>
              <TextInput style={styles.input} value={newDoctor.experience} onChangeText={(t) => setNewDoctor({...newDoctor, experience: t})} placeholder="e.g. 5" keyboardType="numeric" />
            </View>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Gender</Text>
              <TextInput style={styles.input} value={newDoctor.gender} onChangeText={(t) => setNewDoctor({...newDoctor, gender: t})} placeholder="Male / Female" />
            </View>
          </View>

          <Text style={styles.label}>Description / Bio</Text>
          <TextInput style={[styles.input, {height: 80, textAlignVertical: 'top'}]} multiline value={newDoctor.description} onChangeText={(t) => setNewDoctor({...newDoctor, description: t})} placeholder="Brief bio..." />

          <TouchableOpacity style={styles.saveBtn} onPress={handleAddDoctor} disabled={adding}>
            {adding ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Create Doctor</Text>}
          </TouchableOpacity>
        </ScrollView>
      ) : showAddSlotForm ? (
        <ScrollView style={styles.card} contentContainerStyle={{ padding: 24 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setShowAddSlotForm(false)}>
            <Text style={styles.backBtnText}>← Back to List</Text>
          </TouchableOpacity>
          <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#1e293b'}}>Configure Doctor Slot</Text>
          
          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Select Doctor *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newSlot.doctor_id}
                  onValueChange={(val) => setNewSlot({...newSlot, doctor_id: val})}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Doctor" value="" />
                  {doctors.filter(d => d.status === 'Approved').map((d: any) => (
                    <Picker.Item key={d.id} label={`${d.full_name} (${d.department})`} value={d.id} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
              {Platform.OS === 'web' ? (
                <input 
                  type="date"
                  value={newSlot.date}
                  onChange={(e) => setNewSlot({...newSlot, date: e.target.value})}
                  style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 14, fontSize: 14, color: '#1e293b' } as any}
                />
              ) : (
                <>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <TextInput style={styles.input} value={newSlot.date} editable={false} placeholder="Select Date" />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={newSlot.date ? new Date(newSlot.date) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          setNewSlot({...newSlot, date: selectedDate.toISOString().split('T')[0]});
                        }
                      }}
                    />
                  )}
                </>
              )}
            </View>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Assigned Peon (Optional)</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newSlot.assigned_peon_id}
                  onValueChange={(val) => setNewSlot({...newSlot, assigned_peon_id: val})}
                  style={styles.picker}
                >
                  <Picker.Item label="None" value="" />
                  {peons.map((p: any) => (
                    <Picker.Item key={p.id} label={p.full_name} value={p.id} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Start Time *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newSlot.start_time}
                  onValueChange={(val) => setNewSlot({...newSlot, start_time: val})}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Time" value="" />
                  {TIME_SLOTS.map((t, i) => (
                    <Picker.Item key={i} label={t} value={t} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>End Time *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newSlot.end_time}
                  onValueChange={(val) => setNewSlot({...newSlot, end_time: val})}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Time" value="" />
                  {TIME_SLOTS.map((t, i) => (
                    <Picker.Item key={i} label={t} value={t} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Total Tokens (Token Range) *</Text>
              <TextInput style={styles.input} value={newSlot.total_tokens} onChangeText={(t) => setNewSlot({...newSlot, total_tokens: t})} placeholder="e.g. 20" keyboardType="numeric" />
            </View>
            <View style={[styles.formCol, isMobile && { flex: 0, width: '100%' }]}>
              <Text style={styles.label}>Consultation Fee (₹) *</Text>
              <TextInput style={styles.input} value={newSlot.fee} onChangeText={(t) => setNewSlot({...newSlot, fee: t})} placeholder="e.g. 500" keyboardType="numeric" />
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleAddSlot} disabled={addingSlot}>
            {addingSlot ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Create Slot</Text>}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          <View style={styles.tabContainer}>
        {TABS.map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Manage Tokens Modal */}
      <Modal visible={!!manageTokenSlot} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15}}>
              <Text style={styles.modalHeader}>Manage Tokens for Dr. {manageTokenSlot?.doctor_name}</Text>
              <TouchableOpacity onPress={() => setManageTokenSlot(null)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>
            <Text style={{fontSize: 14, color: '#64748b', marginBottom: 15}}>
              Select multiple tokens to block/unblock (VIP Quota). Tokens in red are patient bookings. Gold are VIP Quota. Selected tokens show a blue outline.
            </Text>
            
            <ScrollView contentContainerStyle={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingBottom: 10}}>
              {manageTokenSlot && Array.from({length: manageTokenSlot.total_tokens}, (_, i) => i + 1).map(t => {
                const status = slotBookingsMap[t];
                const isBooked = status && status !== 'VIP Quota';
                const isVip = status === 'VIP Quota';
                const isSelected = selectedTokens.includes(t);
                
                return (
                  <TouchableOpacity
                    key={t}
                    style={{
                      width: 60, height: 60, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                      backgroundColor: isBooked ? '#fecaca' : (isVip ? '#fef3c7' : '#d1fae5'),
                      borderWidth: isSelected ? 3 : 1, 
                      borderColor: isSelected ? '#3b82f6' : (isBooked ? '#ef4444' : (isVip ? '#f59e0b' : '#10b981')),
                      opacity: isBooked ? 0.6 : 1
                    }}
                    onPress={() => handleTokenSelect(t)}
                  >
                    <Text style={{fontWeight: 'bold', color: isBooked ? '#b91c1c' : (isVip ? '#b45309' : '#047857')}}>{t}</Text>
                    {isVip && <Text style={{fontSize: 9, color: '#b45309', fontWeight: 'bold', marginTop: 2}}>Blocked</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedTokens.length > 0 && (
              <View style={{flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 20}}>
                <TouchableOpacity 
                  style={{backgroundColor: '#f59e0b', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center'}}
                  onPress={() => executeMultiBlock('block')}
                >
                  <Text style={{color: 'white', fontWeight: 'bold'}}>Block Selected</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{backgroundColor: '#10b981', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center'}}
                  onPress={() => executeMultiBlock('unblock')}
                >
                  <Text style={{color: 'white', fontWeight: 'bold'}}>Unblock Selected</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 50 }} />
        ) : (
          <ScrollView horizontal={isMobile} showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: isMobile ? 800 : '100%' }}>
              {activeTab === 'Doctors' && (
                <View style={styles.card}>
                <View style={styles.tableRowHeader}>
                  <Text style={[styles.tableCellHeader, {flex: 0.5}]}>ID</Text>
                  <Text style={styles.tableCellHeader}>Name</Text>
                  <Text style={styles.tableCellHeader}>Role/Exp</Text>
                  <Text style={styles.tableCellHeader}>Status</Text>
                  <Text style={styles.tableCellHeader}>Actions</Text>
                </View>
                {doctors.map((d, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>{d.id}</Text>
                    <View style={styles.tableCell}>
                      <Text style={{fontWeight: '500'}}>{d.full_name}</Text>
                      <Text style={{fontSize: 12, color: '#64748b'}}>{d.email}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text>{d.role}</Text>
                      <Text style={{fontSize: 12, color: '#64748b'}}>{d.experience} Yrs</Text>
                    </View>
                    <Text style={[styles.tableCell, {color: d.status === 'Approved' ? '#10b981' : '#f59e0b', fontWeight: 'bold'}]}>
                      {d.status}
                    </Text>
                    <View style={[styles.tableCell, {flexDirection: 'row', gap: 10}]}>
                      {d.status === 'Pending' && (
                        <>
                          <TouchableOpacity onPress={() => approveDoctor(d.id, 'Approved')}>
                            <CheckCircle color="#10b981" size={20} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => approveDoctor(d.id, 'Rejected')}>
                            <XCircle color="#ef4444" size={20} />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                ))}
                {doctors.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No doctors found in your department.</Text>}
              </View>
            )}

            {activeTab === 'Slots' && (
              <View style={styles.card}>
                <View style={styles.tableRowHeader}>
                  <Text style={styles.tableCellHeader}>Date</Text>
                  <Text style={styles.tableCellHeader}>Doctor</Text>
                  <Text style={styles.tableCellHeader}>Time</Text>
                  <Text style={styles.tableCellHeader}>Tokens/Fee</Text>
                  <Text style={styles.tableCellHeader}>Assigned Peon</Text>
                  <Text style={styles.tableCellHeader}>Actions</Text>
                </View>
                {slots.map((s, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{new Date(s.date).toLocaleDateString()}</Text>
                    <Text style={styles.tableCell}>{s.doctor_name}</Text>
                    <Text style={styles.tableCell}>{s.start_time} - {s.end_time}</Text>
                    <Text style={styles.tableCell}>{s.total_tokens} tokens / ₹{s.fee}</Text>
                    <Text style={styles.tableCell}>{s.peon_name || 'Unassigned'}</Text>
                    <Text style={styles.tableCell}>
                      <TouchableOpacity style={{backgroundColor: '#3b82f6', padding: 6, borderRadius: 6, alignItems: 'center'}} onPress={() => handleManageTokens(s)}>
                        <Text style={{color: 'white', fontSize: 12}}>Tokens</Text>
                      </TouchableOpacity>
                    </Text>
                  </View>
                ))}
                {slots.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No slots found.</Text>}
              </View>
            )}

            {activeTab === 'Bookings' && (
              <View style={styles.card}>
                <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
                  <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1e293b'}}>Bookings Filter</Text>
                  <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
                    <Text style={styles.exportBtnText}>Export CSV</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.filterRow, isMobile && { flexDirection: 'column' }, {flexWrap: 'wrap'}]}>
                  <View style={[styles.filterCol, {minWidth: 150}]}>
                    <Text style={styles.label}>Patient Name</Text>
                    <TextInput style={[styles.input, {padding: 10}]} value={bPatient} onChangeText={setBPatient} placeholder="Search patient" />
                  </View>
                  <View style={[styles.filterCol, {minWidth: 150}]}>
                    <Text style={styles.label}>Date</Text>
                    {Platform.OS === 'web' ? (
                      <input 
                        type="date"
                        value={bDate}
                        onChange={(e) => setBDate(e.target.value)}
                        style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', width: '100%' } as any}
                      />
                    ) : (
                      <>
                        <TouchableOpacity onPress={() => setShowBDatePicker(true)}>
                          <TextInput style={[styles.input, {padding: 10}]} value={bDate} editable={false} placeholder="Select Date" />
                        </TouchableOpacity>
                        {showBDatePicker && (
                          <DateTimePicker
                            value={bDate ? new Date(bDate) : new Date()}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                              setShowBDatePicker(false);
                              if (selectedDate) setBDate(selectedDate.toISOString().split('T')[0]);
                            }}
                          />
                        )}
                      </>
                    )}
                  </View>
                  <View style={[styles.filterCol, {minWidth: 150}]}>
                    <Text style={styles.label}>Doctor</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={bDoctor} onValueChange={(val) => setBDoctor(val)} style={styles.picker}>
                        <Picker.Item label="All Doctors" value="" />
                        {doctors.map((d: any) => <Picker.Item key={d.id} label={d.full_name} value={d.id} />)}
                      </Picker>
                    </View>
                  </View>
                  <View style={[styles.filterCol, {minWidth: 150}]}>
                    <Text style={styles.label}>Booked By (Employee)</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={bEmployee} onValueChange={(val) => setBEmployee(val)} style={styles.picker}>
                        <Picker.Item label="All" value="" />
                        {employees.map((e: any) => <Picker.Item key={e.id} label={e.full_name} value={e.id} />)}
                      </Picker>
                    </View>
                  </View>
                  <View style={[styles.filterCol, {minWidth: 150, justifyContent: 'flex-end'}]}>
                    <TouchableOpacity style={styles.clearBtn} onPress={() => { setBDoctor(''); setBEmployee(''); setBDate(''); setBPatient(''); }}>
                      <Text style={styles.clearBtnText}>Clear Filters</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.tableRowHeader}>
                  <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Token</Text>
                  <Text style={styles.tableCellHeader}>Patient</Text>
                  <Text style={styles.tableCellHeader}>Doctor & Slot</Text>
                  <Text style={styles.tableCellHeader}>Payment</Text>
                  <Text style={styles.tableCellHeader}>Booked By</Text>
                  <Text style={styles.tableCellHeader}>Status</Text>
                </View>
                {bookings.map((b, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>#{b.token_number}</Text>
                    <View style={styles.tableCell}>
                      <Text style={{fontWeight: '500'}}>{b.patient_name}</Text>
                      <Text style={{fontSize: 12, color: '#64748b'}}>{b.mobile}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text>{b.doctor_name}</Text>
                      <Text style={{fontSize: 12, color: '#64748b'}}>{new Date(b.date).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.tableCell}>{b.payment_mode}</Text>
                    <Text style={styles.tableCell}>{b.booked_by_name || 'Self'}</Text>
                    <Text style={styles.tableCell}>{b.status}</Text>
                  </View>
                ))}
                {bookings.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No bookings found in your department.</Text>}
              </View>
            )}
            </View>
          </ScrollView>
        )}
      </ScrollView>
      </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#e2e8f0', padding: 4, borderRadius: 12, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: Colors.light.primary },
  content: { flex: 1 },
  card: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 16, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tableRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  tableCellHeader: { flex: 1, minWidth: 100, fontSize: 13, fontWeight: 'bold', color: '#475569' },
  tableCell: { flex: 1, minWidth: 100, fontSize: 14, color: '#334155' },

  // Form Styles
  backBtn: { marginBottom: 16 },
  backBtnText: { color: Colors.light.primary, fontWeight: '600', fontSize: 16 },
  formRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  formCol: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { 
    backgroundColor: '#f8fafc', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 8, 
    paddingHorizontal: 14, 
    fontSize: 14, 
    color: '#1e293b',
    height: 50,
  },
  pickerContainer: { 
    backgroundColor: '#f8fafc', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 8, 
    overflow: 'hidden',
    height: 50,
    justifyContent: 'center',
  },
  picker: { 
    fontSize: 14, 
    color: '#1e293b', 
    ...Platform.select({ 
      web: { 
        outlineWidth: 0 as any, 
        border: 'none', 
        backgroundColor: 'transparent',
        padding: 14,
      },
      default: {
        height: 50,
      }
    }) 
  },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 10 },
  pickerItemActive: { backgroundColor: Colors.light.primary },
  pickerItemText: { color: '#64748b', fontWeight: '500' },
  pickerItemTextActive: { color: 'white', fontWeight: 'bold' },
  saveBtn: { backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  exportBtn: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  exportBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  filterCol: { flex: 1 },
  clearBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc' },
  clearBtnText: { color: '#64748b', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 500, maxHeight: '80%' },
  modalHeader: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
});
