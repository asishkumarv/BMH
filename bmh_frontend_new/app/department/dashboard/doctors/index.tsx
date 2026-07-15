import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Modal, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import {  Users, Calendar, DollarSign, ListOrdered, CheckCircle, XCircle, Plus, X , RefreshCcw } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../../constants/Colors';
import { useResponsive } from '../../../../hooks/useResponsive';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
const TABS = ['Doctors', 'Slots', 'Bookings', 'Cancelled Tokens']; // No Revenue tab

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 20; h++) {
  const hr = h.toString().padStart(2, '0');
  TIME_SLOTS.push(`${hr}:00`);
  TIME_SLOTS.push(`${hr}:30`);
}

export default function DepartmentDoctorManagement() {
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState('Doctors');

  // Cancelled Tokens State
  const [cancelledTokens, setCancelledTokens] = useState<any[]>([]);
  const [cDate, setCDate] = useState('');
  const [cDoctor, setCDoctor] = useState('');
  const [cPatient, setCPatient] = useState('');
  const [cEmployee, setCEmployee] = useState('');
  const [showCDatePicker, setShowCDatePicker] = useState(false);
  const [todayRefund, setTodayRefund] = useState(0);
  const [filterRefund, setFilterRefund] = useState(0);

  // Refund Processing State
  const [refundProcessing, setRefundProcessing] = useState<any>(null);
  const [refundType, setRefundType] = useState('Cash');
  const [refundTnx, setRefundTnx] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  useEffect(() => {
    if (activeTab === 'Cancelled Tokens') fetchCancelledTokens();
  }, [activeTab, cDate, cDoctor, cPatient, cEmployee]);

  const fetchCancelledTokens = async () => {
    try {
      let url = 'https://napi.bharatmedicalhallplus.com/bookings/cancelled-list?';
      if (cDate) url += `date=${cDate}&`;
      if (cDoctor) url += `doctor_id=${cDoctor}&`;
      if (cEmployee) url += `booked_by=${cEmployee}&`;
      if (cPatient) url += `patient_name=${cPatient}&`;
      const res = await axios.get(url);
      const tokens = res.data.data || [];
      setCancelledTokens(tokens);
      
      const today = new Date().toISOString().split('T')[0];
      const todayTotal = tokens.filter((t: any) => t.refund_status === 'Refunded' && new Date(t.cancelled_at).toISOString().split('T')[0] === today).reduce((sum: number, t: any) => sum + parseFloat(t.fee), 0);
      setTodayRefund(todayTotal);

      const filterTotal = tokens.filter((t: any) => t.refund_status === 'Refunded').reduce((sum: number, t: any) => sum + parseFloat(t.fee), 0);
      setFilterRefund(filterTotal);

      // Fetched in loadUser instead
      const empRes = await axios.get('https://napi.bharatmedicalhallplus.com/employees').catch(()=>null);
      if (empRes?.data?.data) setEmployees(empRes.data.data);
      const docsRes = await axios.get('https://napi.bharatmedicalhallplus.com/doctors').catch(()=>null);
      if (docsRes?.data?.data) setDoctors(docsRes.data.data);
    } catch(e) {
      console.error(e);
    }
  };

  const handleProcessRefund = async () => {
    if (refundType === 'Online' && !refundTnx) {
      alert('Transaction number is required for Online refunds');
      return;
    }
    setProcessingRefund(true);
    try {
      const userData = await AsyncStorage.getItem('subAdminUser') || await AsyncStorage.getItem('departmentUser') || await AsyncStorage.getItem('user');
      let userId = '1';
      if (userData) {
         const user = JSON.parse(userData);
         userId = user.id;
      }

      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/cancelled/${refundProcessing.id}/refund`, {
        refund_type: refundType,
        refund_tnx: refundTnx,
        processed_by_id: userId
      });
      if (res.data.success) {
        alert('Refund processed successfully');
        setRefundProcessing(null);
        setRefundTnx('');
        fetchCancelledTokens();
      }
    } catch(err: any) {
      alert(err?.response?.data?.message || 'Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  const [doctors, setDoctors] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [hasGlobalDoctorAccess, setHasGlobalDoctorAccess] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);

  // Add Doctor Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [editDoctor, setEditDoctor] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    full_name: '', email: '', mobile: '', password: '', 
    department: '', role: 'Doctor', experience: '', gender: 'Male', description: '',
    fee_percent: '0'
  });
  const [adding, setAdding] = useState(false);

  const [showAddSlotForm, setShowAddSlotForm] = useState(false);
  const [newSlot, setNewSlot] = useState({
    doctor_id: '', date: '', assigned_peon_id: '', 
    slotConfigs: [{ start_time: '', end_time: '', total_tokens: '', fee: '' }]
  });
  const [addingSlot, setAddingSlot] = useState(false);
  
  // Manage Tokens
  const [manageTokenSlot, setManageTokenSlot] = useState<any>(null);
  const [slotBookingsMap, setSlotBookingsMap] = useState<any>({});
  const [selectedTokens, setSelectedTokens] = useState<number[]>([]);

  const [reassignSlot, setReassignSlot] = useState<any>(null);
  const [reassignPeonId, setReassignPeonId] = useState('');
  const [updatingPeon, setUpdatingPeon] = useState(false);


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

  
  const handleReassignPeon = async () => {
    setUpdatingPeon(true);
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/doctors/slots/${reassignSlot.id}/peon`, { assigned_peon_id: reassignPeonId });
      if (res.data.success) {
        Alert.alert('Success', res.data.message);
        setReassignSlot(null);
        fetchData();
      }
    } catch(e) {
      Alert.alert('Error', 'Failed to reassign peon');
    } finally {
      setUpdatingPeon(false);
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
        const u = JSON.parse(userData);
        setUser(u);
        try {
          const [settingsRes, deptRes] = await Promise.all([
            axios.get('https://napi.bharatmedicalhallplus.com/settings'),
            axios.get('https://napi.bharatmedicalhallplus.com/department')
          ]);
          setDepartments(deptRes.data.data || []);
          if (settingsRes.data.success && settingsRes.data.settings.doctor_management_access) {
              let value = settingsRes.data.settings.doctor_management_access;
              if (typeof value === 'string') value = JSON.parse(value);
              if (u.id && value[u.id] === true) {
                 setHasGlobalDoctorAccess(true);
              }
          }
        } catch(e){}
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (activeTab === 'Bookings' && user) fetchBookings();
    else if (user) fetchData();
  }, [activeTab, bDoctor, bEmployee, bDate, bPatient, user, hasGlobalDoctorAccess]);

  const fetchBookings = async () => {
    try {
      let url = 'https://napi.bharatmedicalhallplus.com/bookings?';
      if (!hasGlobalDoctorAccess) url += 'department=' + user.department + '&';
      url += 'exclude_blocked=true&';
      if (bDoctor) url += `doctor_id=${bDoctor}&`;
      if (bEmployee) url += `booked_by=${bEmployee}&`;
      if (bDate) url += `date=${bDate}&`;
      if (bPatient) url += `patient_name=${bPatient}&`;
      const res = await axios.get(url);
      setBookings(res.data.data);
      
      const empRes = await axios.get('https://napi.bharatmedicalhallplus.com/employees').catch(()=>null);
      if (empRes?.data?.data) setEmployees(empRes.data.data);
      const docsUrl = hasGlobalDoctorAccess ? 'https://napi.bharatmedicalhallplus.com/doctors' : 'https://napi.bharatmedicalhallplus.com/doctors?department=' + user.department;
      const docsRes = await axios.get(docsUrl).catch(()=>null);
      if (docsRes?.data?.data) setDoctors(docsRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = async () => {
    if (!bookings || bookings.length === 0) return;
    
    let completed = bookings.reduce((sum, b) => sum + (b.status === 'Completed' ? parseFloat(b.fee || 0) : 0), 0);
    let refund = bookings.reduce((sum, b) => sum + (b.status === 'Cancelled' ? parseFloat(b.fee || 0) : 0), 0);
    let toRefund = bookings.reduce((sum, b) => sum + (b.status === 'Booked' ? parseFloat(b.fee || 0) : 0), 0);

    let csvContent = "Bharat Medical Hall - Filtered Bookings Report\n";
    csvContent += `Filters:,Date: ${bDate || 'All'},Doctor: ${doctors?.find(d => d.id === bDoctor)?.name || 'All'},Employee: ${employees?.find(e => e.id === bEmployee)?.full_name || 'All'}\n`;
    csvContent += `Summary:,Completed: ₹${completed},Refund: ₹${refund},To Refund: ₹${toRefund}\n\n`;

    csvContent += "Token,Patient Name,Mobile,Doctor,Department,Date,Time,Booked By,Status,Payment Mode,Fee\n";
    bookings.forEach((b) => {
      csvContent += `${b.token_number},${b.patient_name},${b.mobile},${b.doctor_name},${b.department},${new Date(b.date).toLocaleDateString('en-GB')},${b.start_time},${b.booked_by_name || 'Self'},${b.status},${b.payment_mode},${b.fee}\n`;
    });
    
    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', 'bookings_export.csv');
      a.click();
    } else {
      // @ts-ignore
      const uri = FileSystem.documentDirectory + "bookings_export.csv";
      // @ts-ignore
      await FileSystem.writeAsStringAsync(uri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri);
    }
  };

  const handlePrintBookings = async () => {
    if (!bookings || bookings.length === 0) return;
    
    let completed = bookings.reduce((sum, b) => sum + (b.status === 'Completed' ? parseFloat(b.fee || 0) : 0), 0);
    let refund = bookings.reduce((sum, b) => sum + (b.status === 'Cancelled' ? parseFloat(b.fee || 0) : 0), 0);
    let toRefund = bookings.reduce((sum, b) => sum + (b.status === 'Booked' ? parseFloat(b.fee || 0) : 0), 0);

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; color: #1e3a8a; margin-bottom: 5px; font-size: 24px; }
            .header-info { text-align: center; margin-bottom: 20px; font-size: 14px; color: #666; }
            .summary-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-around; border: 1px solid #e2e8f0; }
            .summary-item { text-align: center; font-size: 14px; }
            .summary-item span { display: block; font-size: 18px; font-weight: bold; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; color: #1e293b; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Bharat Medical Hall</h1>
          <div class="header-info">
            <p><strong>Filtered Bookings Report</strong></p>
            <p>Date: ${bDate || 'All'} | Doctor: ${doctors?.find(d => d.id === bDoctor)?.name || 'All'} | Employee: ${employees?.find(e => e.id === bEmployee)?.full_name || 'All'}</p>
          </div>
          <div class="summary-box">
            <div class="summary-item" style="color: #16a34a;">Completed<span>₹${completed}</span></div>
            <div class="summary-item" style="color: #ef4444;">Refund<span>₹${refund}</span></div>
            <div class="summary-item" style="color: #f59e0b;">To Refund<span>₹${toRefund}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient</th>
                <th>Mobile</th>
                <th>Doctor</th>
                <th>Date & Time</th>
                <th>Booked By</th>
                <th>Status</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              ${bookings.map((b: any) => `
                <tr>
                  <td>#${b.token_number}</td>
                  <td>${b.patient_name}</td>
                  <td>${b.mobile}</td>
                  <td>${b.doctor_name}</td>
                  <td>${new Date(b.date).toLocaleDateString('en-GB')} ${b.start_time}</td>
                  <td>${b.booked_by_name || 'Self'}</td>
                  <td>${b.status}</td>
                  <td>₹${b.fee} (${b.payment_mode})</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      // @ts-ignore
      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.contentDocument?.write(htmlContent);
        iframe.contentDocument?.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 250);
      } else {
        // @ts-ignore
        if (typeof Print !== 'undefined') await Print.printAsync({ html: htmlContent });
      }
    } catch (err) {
      console.error('Print error', err);
    }
  };
const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'Doctors') {
        const url = hasGlobalDoctorAccess ? 'https://napi.bharatmedicalhallplus.com/doctors' : 'https://napi.bharatmedicalhallplus.com/doctors?department=' + user.department;
        const res = await axios.get(url);
        setDoctors(res.data.data);
      } else if (activeTab === 'Slots') {
        const [resSlots, resPeons] = await Promise.all([
          axios.get('https://napi.bharatmedicalhallplus.com/doctors/slots'),
          axios.get('https://napi.bharatmedicalhallplus.com/employees')
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

  const handleUpdateDoctor = async () => {
    if (!editDoctor.full_name) return Alert.alert('Error', 'Name is required');
    setUpdating(true);
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/doctors/${editDoctor.id}`, editDoctor);
      if (res.data.success) {
        Alert.alert('Success', res.data.message);
        setEditDoctor(null);
        fetchData();
      }
    } catch(e) {
      Alert.alert('Error', 'Failed to update doctor');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async (doc: any) => {
    const newStatus = doc.status === 'Inactive' ? 'Approved' : 'Inactive';
    Alert.alert('Confirm', `Are you sure you want to ${newStatus === 'Inactive' ? 'deactivate' : 'activate'} Dr. ${doc.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: async () => {
          try {
            await axios.put(`https://napi.bharatmedicalhallplus.com/doctors/${doc.id}/status`, { status: newStatus });
            fetchData();
          } catch(e) {
            Alert.alert('Error', 'Failed to update status');
          }
      }}
    ]);
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
        department: hasGlobalDoctorAccess ? newDoctor.department : user.department
      });
      alert('Doctor added successfully!');
      setShowAddForm(false);
      setNewDoctor({
        full_name: '', email: '', mobile: '', password: '', 
        department: '', role: 'Doctor', experience: '', gender: 'Male', description: '',
        fee_percent: '0'
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error adding doctor');
    } finally {
      setAdding(false);
    }
  };

  const handleAddSlot = async () => {
    if(!newSlot.doctor_id || !newSlot.date || newSlot.slotConfigs.length === 0) {
      alert("Please select doctor and date");
      return;
    }
    const invalidConfigs = newSlot.slotConfigs.some(c => !c.start_time || !c.end_time || !c.total_tokens || !c.fee);
    if (invalidConfigs) {
      alert("Please fill all required fields for each slot");
      return;
    }
    setAddingSlot(true);
    try {
      const results = await Promise.allSettled(newSlot.slotConfigs.map(async (config) => {
        return axios.post('https://napi.bharatmedicalhallplus.com/doctors/slots', {
          doctor_id: newSlot.doctor_id,
          date: newSlot.date,
          assigned_peon_id: newSlot.assigned_peon_id,
          ...config
        });
      }));

      const successes = results.filter(r => r.status === 'fulfilled');
      const fails = results.filter(r => r.status === 'rejected');

      if (fails.length === 0) {
        alert('All slots created successfully!');
        setShowAddSlotForm(false);
        setNewSlot({ doctor_id: '', date: '', assigned_peon_id: '', slotConfigs: [{ start_time: '', end_time: '', total_tokens: '', fee: '' }] });
      } else {
        alert(`Created ${successes.length} slots. Failed to create ${fails.length} slots. Please check for overlap.`);
      }
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating slots');
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
            <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput style={styles.input} value={newDoctor.full_name} onChangeText={(t) => setNewDoctor({...newDoctor, full_name: t})} placeholder="Dr. John Doe" />
            </View>
            <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
              <Text style={styles.label}>Email *</Text>
              <TextInput style={styles.input} value={newDoctor.email} onChangeText={(t) => setNewDoctor({...newDoctor, email: t})} placeholder="doctor@bmh.com" keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>

          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
              <Text style={styles.label}>Mobile</Text>
              <TextInput style={styles.input} value={newDoctor.mobile} onChangeText={(t) => setNewDoctor({...newDoctor, mobile: t})} placeholder="10-digit number" keyboardType="phone-pad" />
            </View>
            <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
              <Text style={styles.label}>Password *</Text>
              <TextInput style={styles.input} value={newDoctor.password} onChangeText={(t) => setNewDoctor({...newDoctor, password: t})} placeholder="Auto-gen or type" />
            </View>
          </View>

          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
              <Text style={styles.label}>Department *</Text>
              {hasGlobalDoctorAccess ? (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newDoctor.department}
                    onValueChange={(val) => setNewDoctor({...newDoctor, department: val})}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Department" value="" />
                    {departments.map((d) => (
                      <Picker.Item key={d.id} label={d.name} value={d.name} />
                    ))}
                  </Picker>
                </View>
              ) : (
                <TextInput style={[styles.input, {backgroundColor: '#e2e8f0', color: '#64748b'}]} value={user?.department} editable={false} placeholder="Locked to your dept" />
              )}
            </View>
            <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
              <Text style={styles.label}>Role</Text>
              <TextInput style={styles.input} value={newDoctor.role} onChangeText={(t) => setNewDoctor({...newDoctor, role: t})} placeholder="Doctor / Head of Dept" />
            </View>
          </View>

          <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
              <Text style={styles.label}>Experience (Years)</Text>
              <TextInput style={styles.input} value={newDoctor.experience} onChangeText={(t) => setNewDoctor({...newDoctor, experience: t})} placeholder="e.g. 5" keyboardType="numeric" />
            </View>
            <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
              <Text style={styles.label}>Fee Share Percentage (%)</Text>
              <TextInput style={styles.input} value={String(newDoctor.fee_percent || '')} onChangeText={(t) => setNewDoctor({...newDoctor, fee_percent: t.replace(/[^0-9.]/g, '')})} placeholder="e.g. 20" keyboardType="numeric" />
            </View>
            <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
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
            <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
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
            <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
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
            <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
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

          {newSlot.slotConfigs.map((config, index) => (
            <View key={index} style={{borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 16}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                <Text style={{fontWeight: 'bold', color: '#1e293b'}}>Slot #{index + 1}</Text>
                {newSlot.slotConfigs.length > 1 && (
                  <TouchableOpacity onPress={() => {
                    const newConfigs = [...newSlot.slotConfigs];
                    newConfigs.splice(index, 1);
                    setNewSlot({...newSlot, slotConfigs: newConfigs});
                  }}>
                    <XCircle color="#ef4444" size={20} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
                <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
                  <Text style={styles.label}>Start Time *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={config.start_time}
                      onValueChange={(val) => {
                        const newConfigs = [...newSlot.slotConfigs];
                        newConfigs[index].start_time = val;
                        setNewSlot({...newSlot, slotConfigs: newConfigs});
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Time" value="" />
                      {TIME_SLOTS.map((t, i) => (
                        <Picker.Item key={i} label={t} value={t} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
                  <Text style={styles.label}>End Time *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={config.end_time}
                      onValueChange={(val) => {
                        const newConfigs = [...newSlot.slotConfigs];
                        newConfigs[index].end_time = val;
                        setNewSlot({...newSlot, slotConfigs: newConfigs});
                      }}
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
                <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
                  <Text style={styles.label}>Total Tokens *</Text>
                  <TextInput style={styles.input} value={config.total_tokens} onChangeText={(t) => {
                    const newConfigs = [...newSlot.slotConfigs];
                    newConfigs[index].total_tokens = t;
                    setNewSlot({...newSlot, slotConfigs: newConfigs});
                  }} placeholder="e.g. 20" keyboardType="numeric" />
                </View>
                <View style={[styles.formCol, isMobile && { width: '100%', marginBottom: 16 }]}>
                  <Text style={styles.label}>Fee (₹) *</Text>
                  <TextInput style={styles.input} value={config.fee} onChangeText={(t) => {
                    const newConfigs = [...newSlot.slotConfigs];
                    newConfigs[index].fee = t;
                    setNewSlot({...newSlot, slotConfigs: newConfigs});
                  }} placeholder="e.g. 500" keyboardType="numeric" />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#3b82f6', marginBottom: 16}]} onPress={() => {
            setNewSlot({...newSlot, slotConfigs: [...newSlot.slotConfigs, { start_time: '', end_time: '', total_tokens: '', fee: '' }]});
          }}>
            <Text style={styles.saveBtnText}>+ Add Another Slot Time</Text>
          </TouchableOpacity>

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
              Green: Available. Orange: Blocked (VIP). Purple: Completed Consultation. Blue: Checked In (In Waiting). Red: Booked (Not Attended). Selected tokens show a blue outline.
            </Text>

            {(() => {
              const totalTokens = manageTokenSlot?.total_tokens || 0;
              let totalBooked = 0;
              let totalBlocked = 0;
              let totalCompleted = 0;
              let totalInWaiting = 0;
              let totalNotAttended = 0;

              if (manageTokenSlot) {
                Array.from({length: totalTokens}, (_, i) => i + 1).forEach(t => {
                  const status = slotBookingsMap[t];
                  if (status) {
                    if (status === 'VIP Quota') {
                      totalBlocked++;
                    } else if (status === 'Completed') {
                      totalCompleted++;
                      totalBooked++;
                    } else if (status === 'Waiting') {
                      totalInWaiting++;
                      totalBooked++;
                    } else if (status === 'Booked') {
                      totalNotAttended++;
                      totalBooked++;
                    } else if (status !== 'Cancelled') {
                      totalBooked++;
                    }
                  }
                });
              }

              return (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
                  <View style={{ flex: 1, minWidth: 80, backgroundColor: '#f1f5f9', padding: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569', textAlign: 'center' }}>Total Tokens</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b', marginTop: 2 }}>{totalTokens}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 80, backgroundColor: '#ffe4e6', padding: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#b91c1c', textAlign: 'center' }}>Booked</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#991b1b', marginTop: 2 }}>{totalBooked}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 80, backgroundColor: '#ffedd5', padding: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#fed7aa' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#c2410c', textAlign: 'center' }}>Blocked</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#9a3412', marginTop: 2 }}>{totalBlocked}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 80, backgroundColor: '#f3e8ff', padding: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#d8b4fe' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6b21a8', textAlign: 'center' }}>Completed</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#581c87', marginTop: 2 }}>{totalCompleted}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 80, backgroundColor: '#dbeafe', padding: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#1d4ed8', textAlign: 'center' }}>Waiting</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e3a8a', marginTop: 2 }}>{totalInWaiting}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 80, backgroundColor: '#fee2e2', padding: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#b91c1c', textAlign: 'center' }}>Not Attended</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#991b1b', marginTop: 2 }}>{totalNotAttended}</Text>
                  </View>
                </View>
              );
            })()}
            
            <ScrollView contentContainerStyle={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingBottom: 10}}>
              
      {/* Reassign Peon Modal */}
      <Modal visible={!!reassignSlot} animationType="slide" transparent={true} onRequestClose={() => setReassignSlot(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalTitle}>Reassign Peon</Text>
              <TouchableOpacity onPress={() => setReassignSlot(null)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalForm}>
              <View style={[styles.formGroup, isMobile ? { flex: 0, width: '100%' } : { flex: 1 }]}>
                <Text style={styles.label}>Select Peon (Optional)</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={reassignPeonId}
                    onValueChange={(val) => setReassignPeonId(val)}
                    style={styles.picker}
                  >
                    <Picker.Item label="None" value="" />
                    {peons.map((p: any) => (
                      <Picker.Item key={p.id} label={p.full_name} value={p.id} />
                    ))}
                  </Picker>
                </View>
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleReassignPeon} disabled={updatingPeon}>
                {updatingPeon ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Confirm Reassign</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

              {manageTokenSlot && Array.from({length: manageTokenSlot.total_tokens}, (_, i) => i + 1).map(t => {
                const status = slotBookingsMap[t];
                const isSelected = selectedTokens.includes(t);
                const isActionable = !status || status === 'VIP Quota';
                
                let bgColor = '#d1fae5'; // Available (Green)
                let borderColor = '#10b981';
                let textColor = '#047857';
                let label = '';
                
                if (status === 'VIP Quota') {
                  bgColor = '#ffedd5'; // Blocked (Orange)
                  borderColor = '#f97316';
                  textColor = '#c2410c';
                  label = 'Blocked';
                } else if (status === 'Completed') {
                  bgColor = '#f3e8ff'; // Completed (Purple)
                  borderColor = '#a855f7';
                  textColor = '#6b21a8';
                  label = 'Completed';
                } else if (status === 'Waiting') {
                  bgColor = '#dbeafe'; // In Waiting (Blue)
                  borderColor = '#3b82f6';
                  textColor = '#1d4ed8';
                  label = 'Waiting';
                } else if (status === 'Booked') {
                  bgColor = '#fee2e2'; // Not Attended / Booked (Red)
                  borderColor = '#ef4444';
                  textColor = '#b91c1c';
                  label = 'Booked';
                } else if (status) {
                  bgColor = '#fee2e2';
                  borderColor = '#ef4444';
                  textColor = '#b91c1c';
                  label = status;
                }
                
                return (
                  <TouchableOpacity
                    key={t}
                    style={{
                      width: 70, height: 70, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                      backgroundColor: bgColor,
                      borderWidth: isSelected ? 3 : 1, 
                      borderColor: isSelected ? '#3b82f6' : borderColor,
                      opacity: isActionable ? 1 : 0.8
                    }}
                    onPress={() => handleTokenSelect(t)}
                  >
                    <Text style={{fontWeight: 'bold', fontSize: 16, color: textColor}}>{t}</Text>
                    {label ? <Text style={{fontSize: 9, color: textColor, fontWeight: '700', marginTop: 2, textAlign: 'center'}} numberOfLines={1}>{label}</Text> : null}
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
                      <View style={[styles.tableCell, {flexDirection: 'row', gap: 10, flexWrap: 'wrap'}]}>
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
                        <TouchableOpacity style={{backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4}} onPress={() => setEditDoctor(d)}>
                          <Text style={{fontSize: 12, color: '#334155'}}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{backgroundColor: d.status === 'Inactive' ? '#dcfce7' : '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4}} onPress={() => handleToggleStatus(d)}>
                          <Text style={{fontSize: 12, color: d.status === 'Inactive' ? '#166534' : '#991b1b'}}>{d.status === 'Inactive' ? 'Activate' : 'Deactivate'}</Text>
                        </TouchableOpacity>
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

                      <TouchableOpacity style={{backgroundColor: '#10b981', padding: 6, borderRadius: 6, alignItems: 'center', marginTop: 4}} onPress={() => { setReassignSlot(s); setReassignPeonId(s.assigned_peon_id || ''); }}>
                        <Text style={{color: 'white', fontSize: 12}}>Reassign</Text>
                      </TouchableOpacity>

                    </Text>
                  </View>
                ))}
                {slots.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No slots found.</Text>}
              </View>
            )}

            
            {activeTab === 'Cancelled Tokens' && (
              <View style={styles.card}>
                <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
                  <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1e293b'}}>Cancelled Tokens & Refunds</Text>
                  <View style={{flexDirection: 'row', gap: 16}}>
                    <View style={{backgroundColor: '#ecfdf5', padding: 8, borderRadius: 8}}>
                      <Text style={{fontSize: 12, color: '#065f46', fontWeight: 'bold'}}>Today's Refunds: ₹{bookings.reduce((sum, b) => sum + (b.status === 'Cancelled' ? parseFloat(b.fee || 0) : 0), 0)}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.filterRow, isMobile && { flexDirection: 'column' }, {flexWrap: 'wrap'}]}>
                  <View style={[styles.filterCol, {minWidth: 150}]}>
                    <Text style={styles.label}>Patient Name</Text>
                    <TextInput style={[styles.input, {padding: 10}]} value={cPatient} onChangeText={setCPatient} placeholder="Search patient or ID" />
                  </View>
                  <View style={[styles.filterCol, {minWidth: 150}]}>
                    <Text style={styles.label}>Date</Text>
                    {Platform.OS === 'web' ? (
                      <input type="date" value={cDate} onChange={(e) => setCDate(e.target.value)} style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', width: '100%' } as any} />
                    ) : (
                      <>
                        <TouchableOpacity onPress={() => setShowCDatePicker(true)}>
                          <TextInput style={[styles.input, {padding: 10}]} value={cDate} editable={false} placeholder="Select Date" />
                        </TouchableOpacity>
                        {showCDatePicker && <DateTimePicker value={cDate ? new Date(cDate) : new Date()} mode="date" display="default" onChange={(e, d) => { setShowCDatePicker(false); if(d) setCDate(d.toISOString().split('T')[0]); }} />}
                      </>
                    )}
                  </View>
                  <View style={[styles.filterCol, {minWidth: 150}]}>
                    <Text style={styles.label}>Doctor</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={cDoctor} onValueChange={setCDoctor} style={styles.picker}>
                        <Picker.Item label="All Doctors" value="" />
                        {doctors.map((d: any) => <Picker.Item key={d.id} label={d.full_name} value={d.id} />)}
                      </Picker>
                    </View>
                  </View>
                  <View style={[styles.filterCol, {minWidth: 150}]}>
                    <Text style={styles.label}>Cancelled By</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={cEmployee} onValueChange={setCEmployee} style={styles.picker}>
                        <Picker.Item label="All" value="" />
                        {employees.map((e: any) => <Picker.Item key={e.id} label={e.full_name} value={e.id} />)}
                      </Picker>
                    </View>
                  </View>
                  <View style={[styles.filterCol, {minWidth: 150, justifyContent: 'flex-end'}]}>
                    <TouchableOpacity style={styles.clearBtn} onPress={() => { setCDoctor(''); setCEmployee(''); setCDate(''); setCPatient(''); }}>
                      <Text style={styles.clearBtnText}>Clear Filters</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ minWidth: isMobile ? 1000 : '100%' }}>
                    <View style={styles.tableRowHeader}>
                      <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Token</Text>
                  <Text style={[styles.tableCellHeader, {flex: 0.5}]}>ID</Text>
                      <Text style={styles.tableCellHeader}>Patient</Text>
                      <Text style={styles.tableCellHeader}>Doctor & Date</Text>
                      <Text style={styles.tableCellHeader}>Cancelled At</Text>
                      <Text style={styles.tableCellHeader}>Cancelled By</Text>
                      <Text style={styles.tableCellHeader}>Fee</Text>
                      <Text style={styles.tableCellHeader}>Refund Status</Text>
                    </View>
                    {cancelledTokens.map((b: any, i: number) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>#{b.token_number}</Text>
                  <Text style={[styles.tableCell, {flex: 0.5}]}>#{b.booking_id || b.id || b.original_booking_id}</Text>
                        <View style={styles.tableCell}>
                          <Text style={{fontWeight: '500'}}>{b.patient_name}</Text>
                          <Text style={{fontSize: 12, color: '#64748b'}}>{b.mobile}</Text>
                        </View>
                        <View style={styles.tableCell}>
                          <Text>{b.doctor_name}</Text>
                          <Text style={{fontSize: 12, color: '#64748b'}}>{new Date(b.date).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.tableCell}>
                          <Text>{new Date(b.cancelled_at).toLocaleDateString()}</Text>
                          <Text style={{fontSize: 12, color: '#64748b'}}>{new Date(b.cancelled_at).toLocaleTimeString()}</Text>
                        </View>
                        <View style={styles.tableCell}>
                          <Text>{b.cancelled_by_name || 'System'}</Text>
                          <Text style={{fontSize: 12, color: '#64748b'}}>{b.cancelled_by_role}</Text>
                        </View>
                        <Text style={[styles.tableCell, {fontWeight: 'bold'}]}>₹{b.fee}</Text>
                        <View style={styles.tableCell}>
                          {b.refund_status === 'Refunded' ? (
                            <View>
                              <Text style={{color: '#10b981', fontWeight: 'bold'}}>Refunded</Text>
                              <Text style={{fontSize: 10, color: '#64748b'}}>{b.refund_type}</Text>
                            </View>
                          ) : (
                            <TouchableOpacity style={{backgroundColor: '#f59e0b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start'}} onPress={() => setRefundProcessing(b)}>
                              <Text style={{color: 'white', fontSize: 12, fontWeight: 'bold'}}>Process Refund</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                    {cancelledTokens.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No cancelled tokens found.</Text>}
                  </View>
                </ScrollView>
              </View>
            )}


            {activeTab === 'Bookings' && (
              <View style={styles.card}>
                <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
                    <View>
                      <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 8}}>Bookings Filter</Text>
                      <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
                        <Text style={{fontSize: 13, color: '#16a34a', fontWeight: 'bold'}}>Completed: ₹{bookings.reduce((sum, b) => sum + (b.status === 'Completed' ? parseFloat(b.fee || 0) : 0), 0)}</Text>
                        <Text style={{fontSize: 13, color: '#ef4444', fontWeight: 'bold'}}>Refund: ₹{bookings.reduce((sum, b) => sum + (b.status === 'Cancelled' ? parseFloat(b.fee || 0) : 0), 0)}</Text>
                        <Text style={{fontSize: 13, color: '#f59e0b', fontWeight: 'bold'}}>To Refund: ₹{bookings.reduce((sum, b) => sum + (b.status === 'Booked' ? parseFloat(b.fee || 0) : 0), 0)}</Text>
                      </View>
                    </View>
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center'}}>
                      <TouchableOpacity style={[styles.exportBtn, {backgroundColor: '#3b82f6'}]} onPress={handlePrintBookings}>
                        <Text style={styles.exportBtnText}>Print All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
                        <Text style={styles.exportBtnText}>Export CSV</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                <View style={[styles.filterRow, isMobile && { flexDirection: 'column' }, {flexWrap: 'wrap'}]}>
                  <View style={[styles.filterCol, {minWidth: 150}]}>
                    <Text style={styles.label}>Patient Name</Text>
                    <TextInput style={[styles.input, {padding: 10}]} value={bPatient} onChangeText={setBPatient} placeholder="Search patient or ID" />
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
                  <Text style={[styles.tableCellHeader, {flex: 0.5}]}>ID</Text>
                  <Text style={styles.tableCellHeader}>Patient</Text>
                  <Text style={styles.tableCellHeader}>Doctor & Slot</Text>
                  <Text style={styles.tableCellHeader}>Payment</Text>
                  <Text style={styles.tableCellHeader}>Booked By</Text>
                  <Text style={styles.tableCellHeader}>Status</Text>
                </View>
                {bookings.map((b, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>#{b.token_number}</Text>
                  <Text style={[styles.tableCell, {flex: 0.5}]}>#{b.booking_id || b.id || b.original_booking_id}</Text>
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

      
      {/* Refund Modal */}
      <Modal visible={!!refundProcessing} animationType="slide" transparent={true} onRequestClose={() => setRefundProcessing(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {maxWidth: 400}]}>
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalTitle}>Process Refund</Text>
              <TouchableOpacity onPress={() => setRefundProcessing(null)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            {refundProcessing && (
              <View>
                <Text style={{fontSize: 16, marginBottom: 16}}>
                  Refunding <Text style={{fontWeight: 'bold', color: '#10b981'}}>₹{refundProcessing.fee}</Text> for Token #{refundProcessing.token_number}
                </Text>
                
                <Text style={styles.label}>Refund Type</Text>
                <View style={[styles.pickerContainer, {marginBottom: 16}]}>
                  <Picker selectedValue={refundType} onValueChange={setRefundType} style={styles.picker}>
                    <Picker.Item label="Cash" value="Cash" />
                    <Picker.Item label="Online" value="Online" />
                  </Picker>
                </View>
                
                {refundType === 'Online' && (
                  <View style={{marginBottom: 16}}>
                    <Text style={styles.label}>Transaction Number *</Text>
                    <TextInput style={styles.input} value={refundTnx} onChangeText={setRefundTnx} placeholder="Enter Txn Number" />
                  </View>
                )}
                
                {refundType === 'Cash' && (
                  <Text style={{fontSize: 12, color: '#64748b', marginBottom: 16}}>
                    Warning: Cash refund amount will be deducted from your cash-in-hand wallet balance.
                  </Text>
                )}
                
                <TouchableOpacity style={styles.submitBtn} onPress={handleProcessRefund} disabled={processingRefund}>
                  {processingRefund ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Confirm Refund</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Doctor Modal */}
      <Modal visible={!!editDoctor} animationType="slide" transparent={true} onRequestClose={() => setEditDoctor(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalTitle}>Edit Doctor</Text>
              <TouchableOpacity onPress={() => setEditDoctor(null)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            {editDoctor && (
              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <View style={[styles.formGroup, isMobile ? { flex: 0, width: '100%' } : { flex: 1 }]}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput style={styles.input} value={editDoctor.full_name || ''} onChangeText={(t) => setEditDoctor({...editDoctor, full_name: t})} />
                </View>
                <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
                  <View style={[styles.formGroup, isMobile ? { flex: 0, width: '100%' } : { flex: 1 }]}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput style={styles.input} value={editDoctor.email || ''} onChangeText={(t) => setEditDoctor({...editDoctor, email: t})} keyboardType="email-address" />
                  </View>
                  <View style={[styles.formGroup, isMobile ? { flex: 0, width: '100%' } : { flex: 1 }]}>
                    <Text style={styles.label}>Phone *</Text>
                    <TextInput style={styles.input} value={editDoctor.phone_number || ''} onChangeText={(t) => setEditDoctor({...editDoctor, phone_number: t})} keyboardType="phone-pad" />
                  </View>
                </View>
                <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
                  <View style={[styles.formGroup, isMobile ? { flex: 0, width: '100%' } : { flex: 1 }]}>
                    <Text style={styles.label}>Department</Text>
                    <TextInput style={styles.input} value={editDoctor.department || ''} onChangeText={(t) => setEditDoctor({...editDoctor, department: t})} />
                  </View>
                  <View style={[styles.formGroup, isMobile ? { flex: 0, width: '100%' } : { flex: 1 }]}>
                    <Text style={styles.label}>Experience (Years)</Text>
                    <TextInput style={styles.input} value={String(editDoctor.experience || '')} onChangeText={(t) => setEditDoctor({...editDoctor, experience: parseInt(t) || 0})} keyboardType="numeric" />
                  </View>
                  <View style={[styles.formGroup, isMobile ? { flex: 0, width: '100%' } : { flex: 1 }]}>
                    <Text style={styles.label}>Fee Share Percentage (%)</Text>
                    <TextInput style={styles.input} value={String(editDoctor.fee_percent || '')} onChangeText={(t) => setEditDoctor({...editDoctor, fee_percent: t.replace(/[^0-9.]/g, '')})} keyboardType="numeric" />
                  </View>
                </View>
                <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateDoctor} disabled={updating}>
                  {updating ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Update Doctor</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>


      {/* Reassign Peon Modal */}
      <Modal visible={!!reassignSlot} animationType="slide" transparent={true} onRequestClose={() => setReassignSlot(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalTitle}>Reassign Peon</Text>
              <TouchableOpacity onPress={() => setReassignSlot(null)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalForm}>
              <View style={[styles.formGroup, isMobile ? { flex: 0, width: '100%' } : { flex: 1 }]}>
                <Text style={styles.label}>Select Peon (Optional)</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={reassignPeonId}
                    onValueChange={(val) => setReassignPeonId(val)}
                    style={styles.picker}
                  >
                    <Picker.Item label="None" value="" />
                    {peons.map((p: any) => (
                      <Picker.Item key={p.id} label={p.full_name} value={p.id} />
                    ))}
                  </Picker>
                </View>
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleReassignPeon} disabled={updatingPeon}>
                {updatingPeon ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Confirm Reassign</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  formCol: { },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { 
    backgroundColor: '#f8fafc', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 8, 
    paddingHorizontal: 14, 
    fontSize: 14, 
    color: '#1e293b',
    minHeight: 50,
    justifyContent: 'center',
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
  modalHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  modalForm: { marginTop: 10 },
  formGroup: { marginBottom: 16 },
  submitBtn: { backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

});
