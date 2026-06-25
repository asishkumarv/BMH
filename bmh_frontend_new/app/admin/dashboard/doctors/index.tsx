import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { Users, Calendar, DollarSign, ListOrdered, CheckCircle, XCircle, Plus } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../../constants/Colors';
import { useResponsive } from '../../../../hooks/useResponsive';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

const TABS = ['Doctors', 'Slots', 'Bookings', 'Revenue'];

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 20; h++) {
  const hr = h.toString().padStart(2, '0');
  TIME_SLOTS.push(`${hr}:00`);
  TIME_SLOTS.push(`${hr}:30`);
}

export default function DoctorManagement() {
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState('Doctors');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  
  // Add Doctor Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    full_name: '', email: '', mobile: '', password: '', 
    department: '', role: 'Doctor', experience: '', gender: 'Male', description: ''
  });
  const [adding, setAdding] = useState(false);

  // Add Slot Form State
  const [showAddSlotForm, setShowAddSlotForm] = useState(false);
  const [newSlot, setNewSlot] = useState({
    doctor_id: '', date: '', start_time: '', end_time: '', total_tokens: '', fee: '', assigned_peon_id: ''
  });
  const [addingSlot, setAddingSlot] = useState(false);
  const [peons, setPeons] = useState<any[]>([]);
  const [slotDept, setSlotDept] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const deptsRes = await axios.get('https://bmh-eitu.onrender.com/department').catch(() => ({data: {data: []}}));
      setDepartments(deptsRes.data.data || []);
      
      if (activeTab === 'Doctors') {
        const res = await axios.get('https://bmh-eitu.onrender.com/doctors');
        setDoctors(res.data.data);
      } else if (activeTab === 'Slots') {
        const [resSlots, resPeons, resDocs] = await Promise.all([
          axios.get('https://bmh-eitu.onrender.com/doctors/slots'),
          axios.get('https://bmh-eitu.onrender.com/doctors/peons'),
          axios.get('https://bmh-eitu.onrender.com/doctors')
        ]);
        setSlots(resSlots.data.data);
        setPeons(resPeons.data.data);
        setDoctors(resDocs.data.data); // Needed for dropdown
      } else if (activeTab === 'Bookings') {
        const res = await axios.get('https://bmh-eitu.onrender.com/bookings');
        setBookings(res.data.data);
      } else if (activeTab === 'Revenue') {
        const res = await axios.get('https://bmh-eitu.onrender.com/bookings/revenue');
        setRevenue(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approveDoctor = async (id: string, status: string) => {
    try {
      await axios.put(`https://bmh-eitu.onrender.com/doctors/${id}/approve`, { status });
      fetchData();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleAddDoctor = async () => {
    if(!newDoctor.full_name || !newDoctor.email || !newDoctor.password || !newDoctor.department) {
      alert("Please fill all required fields");
      return;
    }
    setAdding(true);
    try {
      await axios.post('https://bmh-eitu.onrender.com/doctors/create', newDoctor);
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
      await axios.post('https://bmh-eitu.onrender.com/doctors/slots', newSlot);
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
        <Text style={styles.header}>Doctor Management</Text>
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
        <ScrollView style={styles.card}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setShowAddForm(false)}>
            <Text style={styles.backBtnText}>← Back to List</Text>
          </TouchableOpacity>
          <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#1e293b'}}>Create New Doctor Profile</Text>
          
          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput style={styles.input} value={newDoctor.full_name} onChangeText={(t) => setNewDoctor({...newDoctor, full_name: t})} placeholder="Dr. John Doe" />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>Email *</Text>
              <TextInput style={styles.input} value={newDoctor.email} onChangeText={(t) => setNewDoctor({...newDoctor, email: t})} placeholder="doctor@bmh.com" keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>

          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Mobile</Text>
              <TextInput style={styles.input} value={newDoctor.mobile} onChangeText={(t) => setNewDoctor({...newDoctor, mobile: t})} placeholder="10-digit number" keyboardType="phone-pad" />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>Password *</Text>
              <TextInput style={styles.input} value={newDoctor.password} onChangeText={(t) => setNewDoctor({...newDoctor, password: t})} placeholder="Auto-gen or type" />
            </View>
          </View>

          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Department *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newDoctor.department}
                  onValueChange={(itemValue) => setNewDoctor({...newDoctor, department: itemValue})}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Department" value="" />
                  {departments.map((d, i) => (
                    <Picker.Item key={i} label={d.name} value={d.name} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>Role</Text>
              <TextInput style={styles.input} value={newDoctor.role} onChangeText={(t) => setNewDoctor({...newDoctor, role: t})} placeholder="Doctor / Head of Dept" />
            </View>
          </View>

          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Experience (Years)</Text>
              <TextInput style={styles.input} value={newDoctor.experience} onChangeText={(t) => setNewDoctor({...newDoctor, experience: t})} placeholder="e.g. 5" keyboardType="numeric" />
            </View>
            <View style={styles.formCol}>
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
        <ScrollView style={styles.card}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setShowAddSlotForm(false)}>
            <Text style={styles.backBtnText}>← Back to List</Text>
          </TouchableOpacity>
          <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#1e293b'}}>Configure Doctor Slot</Text>
          
          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Department</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={slotDept}
                  onValueChange={(val) => {
                    setSlotDept(val);
                    setNewSlot({...newSlot, doctor_id: ''});
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Department" value="" />
                  {departments.map((d, i) => (
                    <Picker.Item key={i} label={d.name} value={d.name} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>Select Doctor *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newSlot.doctor_id}
                  onValueChange={(val) => setNewSlot({...newSlot, doctor_id: val})}
                  style={styles.picker}
                  enabled={!!slotDept}
                >
                  <Picker.Item label="Select Doctor" value="" />
                  {doctors.filter(d => d.status === 'Approved' && d.department === slotDept).map((d: any) => (
                    <Picker.Item key={d.id} label={`${d.full_name} (${d.department})`} value={d.id} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
              {Platform.OS === 'web' ? (
                <input 
                  type="date"
                  value={newSlot.date}
                  onChange={(e) => setNewSlot({...newSlot, date: e.target.value})}
                  style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 14, fontSize: 14, color: '#1e293b', outline: 'none' } as any}
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
            <View style={styles.formCol}>
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
            <View style={styles.formCol}>
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
            <View style={styles.formCol}>
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
            <View style={styles.formCol}>
              <Text style={styles.label}>Total Tokens (Token Range) *</Text>
              <TextInput style={styles.input} value={newSlot.total_tokens} onChangeText={(t) => setNewSlot({...newSlot, total_tokens: t})} placeholder="e.g. 20" keyboardType="numeric" />
            </View>
            <View style={styles.formCol}>
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
                  <Text style={styles.tableCellHeader}>Department</Text>
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
                    <Text style={styles.tableCell}>{d.department}</Text>
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
                {doctors.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No doctors found.</Text>}
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
                </View>
                {slots.map((s, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{new Date(s.date).toLocaleDateString()}</Text>
                    <Text style={styles.tableCell}>{s.doctor_name}</Text>
                    <Text style={styles.tableCell}>{s.start_time} - {s.end_time}</Text>
                    <Text style={styles.tableCell}>{s.total_tokens} tokens / ₹{s.fee}</Text>
                    <Text style={styles.tableCell}>{s.peon_name || 'Unassigned'}</Text>
                  </View>
                ))}
                {slots.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No slots found.</Text>}
              </View>
            )}

            {activeTab === 'Bookings' && (
              <View style={styles.card}>
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
                {bookings.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No bookings found.</Text>}
              </View>
            )}

            {activeTab === 'Revenue' && (
              <View style={styles.card}>
                <View style={styles.tableRowHeader}>
                  <Text style={styles.tableCellHeader}>Date</Text>
                  <Text style={styles.tableCellHeader}>Department</Text>
                  <Text style={styles.tableCellHeader}>Payment Mode</Text>
                  <Text style={styles.tableCellHeader}>Total Bookings</Text>
                  <Text style={styles.tableCellHeader}>Total Amount</Text>
                </View>
                {revenue.map((r, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{new Date(r.date).toLocaleDateString()}</Text>
                    <Text style={styles.tableCell}>{r.department}</Text>
                    <Text style={styles.tableCell}>{r.payment_mode}</Text>
                    <Text style={styles.tableCell}>{r.total_bookings}</Text>
                    <Text style={[styles.tableCell, {fontWeight: 'bold', color: '#10b981'}]}>₹{r.total_amount}</Text>
                  </View>
                ))}
                {revenue.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No revenue data found.</Text>}
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
  tableCellHeader: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#475569' },
  tableCell: { flex: 1, fontSize: 14, color: '#334155' },
  
  // Form Styles
  backBtn: { marginBottom: 16 },
  backBtnText: { color: Colors.light.primary, fontWeight: '600', fontSize: 16 },
  formRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  formCol: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 14, fontSize: 14, color: '#1e293b' },
  pickerContainer: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' },
  picker: { padding: 14, fontSize: 14, color: '#1e293b', ...Platform.select({ web: { outlineStyle: 'none' as any, border: 'none', backgroundColor: 'transparent' } }) },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 10 },
  pickerItemActive: { backgroundColor: Colors.light.primary },
  pickerItemText: { color: '#64748b', fontWeight: '500' },
  pickerItemTextActive: { color: 'white', fontWeight: 'bold' },
  saveBtn: { backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
