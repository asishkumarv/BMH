import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { Users, Calendar, Clock, HeartPulse, CreditCard, CheckCircle, Printer, Search, User, Edit, XCircle } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
// import { COMPANY_LOGO_BASE64 } from './_logoBase64';

export default function PatientBooking() {
  const { isMobile } = useResponsive();
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Booking Filters
  const [slotSearchQuery, setSlotSearchQuery] = useState('');
  const [slotFilterDate, setSlotFilterDate] = useState('');
  const [showSlotDatePicker, setShowSlotDatePicker] = useState(false);

  // Booking Form State
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [slotBookings, setSlotBookings] = useState<number[]>([]);
  const [vipTokens, setVipTokens] = useState<number[]>([]);
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [patientName, setPatientName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [reference, setReference] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [referenceUserType, setReferenceUserType] = useState('');
  const [pr, setPr] = useState('');
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [successToken, setSuccessToken] = useState<number | null>(null);
  const [successPatientId, setSuccessPatientId] = useState<string | null>(null);
  const [autofilled, setAutofilled] = useState(false);

  useEffect(() => {
    const lookupPatient = async () => {
      const cleaned = mobile.replace(/\D/g, '');
      if (cleaned.length === 10) {
        try {
          const res = await axios.get(`https://napi.bharatmedicalhallplus.com/patient/by-mobile/${cleaned}`);
          if (res.data.success && res.data.patient) {
            const p = res.data.patient;
            setPatientName(p.name || '');
            setEmail(p.email || '');
            setAge(p.age ? p.age.toString() : '');
            setGender(p.gender === 'Female' ? 'Female' : 'Male');
            setBloodGroup(p.blood_group || '');
            setCity(p.city || '');
            setPinCode(p.pin_code || '');
            setGuardianName(p.guardian_name || '');
            setSuccessPatientId(p.patient_id || p.id || null);
            setAutofilled(true);
          } else {
            setAutofilled(false);
          }
        } catch (err) {
          // Ignore, patient not found means new patient registration
          setAutofilled(false);
        }
      } else {
        setAutofilled(false);
      }
    };
    
    const timeoutId = setTimeout(() => {
      if (mobile.length >= 10) lookupPatient();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [mobile]);

  // Refs for Input Navigation
  const mobileRef = React.useRef<TextInput>(null);
  const ageRef = React.useRef<TextInput>(null);
  const bloodGroupRef = React.useRef<TextInput>(null);
  const reasonRef = React.useRef<TextInput>(null);
  const cityRef = React.useRef<TextInput>(null);
  const pinCodeRef = React.useRef<TextInput>(null);
  const guardianRef = React.useRef<TextInput>(null);
  const emailRef = React.useRef<TextInput>(null);
  const referenceRef = React.useRef<TextInput>(null);
  const prRef = React.useRef<TextInput>(null);
  const genderRef = React.useRef<TextInput>(null);
  const paymentRef = React.useRef<TextInput>(null);
  const [genderFocused, setGenderFocused] = useState(false);
  const [paymentFocused, setPaymentFocused] = useState(false);

  // My Bookings State
  const [activeTab, setActiveTab] = useState('New Booking');

  // All Bookings Tab State
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [bDateFilter, setBDateFilter] = useState('');
  const [bDoctorFilter, setBDoctorFilter] = useState('');
  const [bPatientFilter, setBPatientFilter] = useState('');
  const [bEmployeeFilter, setBEmployeeFilter] = useState('');
  const [bStatusFilter, setBStatusFilter] = useState('');
  const [showBDatePicker, setShowBDatePicker] = useState(false);

  // Edit Modal State
  const [editBookingSelected, setEditBookingSelected] = useState<any>(null);
  const [editForm, setEditForm] = useState({ patient_name: '', mobile: '', age: '', gender: 'Male', blood_group: '', city: '', pin_code: '', guardian_name: '', reason_for_visit: '', reference: '', pr: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [cancelBookingSelected, setCancelBookingSelected] = useState<any>(null);
  const [cancelRefundMode, setCancelRefundMode] = useState('Cash');
  const [cancelRefundTnx, setCancelRefundTnx] = useState('');

  useEffect(() => {
    if (activeTab === 'Bookings' && user) {
      fetchAllBookings();
      if (allEmployees.length === 0) fetchAllEmployees();
    }
  }, [activeTab, bDateFilter, bDoctorFilter, bPatientFilter, bEmployeeFilter, bStatusFilter, user]);

  const fetchAllBookings = async () => {
    try {
      let url = `https://napi.bharatmedicalhallplus.com/bookings?exclude_blocked=true`;
      if (bDateFilter) url += `&date=${bDateFilter}`;
      if (bDoctorFilter) url += `&doctor_id=${bDoctorFilter}`;
      if (bPatientFilter) url += `&patient_name=${bPatientFilter}`;
      if (bEmployeeFilter) url += `&booked_by=${bEmployeeFilter}`;
      if (bStatusFilter) url += `&status=${bStatusFilter}`;
      const res = await axios.get(url);
      setAllBookings(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchAllEmployees = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/employees/all-users');
      if (res.data.success) {
        setAllEmployees(res.data.data);
      }
    } catch (err) { console.error(err); }
  };

  const handleEditSave = async () => {
    if (!editForm.patient_name || !editForm.mobile || !editForm.age) { alert('Name, mobile and age are required'); return; }
    setEditLoading(true);
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/${editBookingSelected.booking_id}`, {
        ...editForm,
        modified_by_id: user.id,
        modified_by_name: user.name || user.full_name,
        modified_by_role: user.role,
        modified_by_dept: user.department || ''
      });
      if (res.data.success) {
        alert('Booking modified successfully');
        setEditBookingSelected(null);
        fetchAllBookings();
      }
    } catch(err) {
      alert('Failed to modify booking');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelBooking = async (b: any) => {
    if (Platform.OS === 'web') {
      const yes = window.confirm(`Are you sure you want to cancel Token #${b.token_number} for ${b.patient_name}?`);
      if (yes) executeCancel(b);
    } else {
      Alert.alert('Cancel Token', `Are you sure you want to cancel Token #${b.token_number} for ${b.patient_name}?`, [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => executeCancel(b) }
      ]);
    }
  };

  const executeCancel = async (b: any) => {
      try {
        const res = await axios.post(`https://napi.bharatmedicalhallplus.com/bookings/${b.booking_id || b.id}/cancel`, {
          cancelled_by_id: user.id,
          cancelled_by_name: user.name || user.full_name,
          cancelled_by_role: user.role,
          cancelled_by_dept: user.department || '',
          refund_type: cancelRefundMode,
          refund_tnx: cancelRefundTnx
        });
        if (res.data.success) {
          alert('Booking cancelled successfully');
          setCancelBookingSelected(null);
          setCancelRefundTnx('');
          fetchAllBookings();
        }
      } catch(err: any) {
        alert(err?.response?.data?.message || 'Failed to cancel booking');
      }
    };

  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterPatient, setFilterPatient] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uniqueDoctors, setUniqueDoctors] = useState<any[]>([]);

  // Reschedule State
  const [rescheduleBookings, setRescheduleBookings] = useState<any[]>([]);
  const [rescheduleSelectedBooking, setRescheduleSelectedBooking] = useState<any>(null);
  const [rescheduleMode, setRescheduleMode] = useState<'single' | 'bulk'>('single');
  const [bulkOriginalSlot, setBulkOriginalSlot] = useState<any>(null);
  const [bulkRefreshKey, setBulkRefreshKey] = useState(0);
  const [bulkDoctorFilter, setBulkDoctorFilter] = useState('');
  const [bulkDateFilter, setBulkDateFilter] = useState('');
  const [bulkAvailableSlots, setBulkAvailableSlots] = useState<any[]>([]);
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleFilterDate, setRescheduleFilterDate] = useState('');
  const [rescheduleFilterDoctor, setRescheduleFilterDoctor] = useState('');
  const [rescheduleFilterPatient, setRescheduleFilterPatient] = useState('');
  const [rescheduleFilterDepartment, setRescheduleFilterDepartment] = useState('');
  const [rescheduleShowDatePicker, setRescheduleShowDatePicker] = useState(false);

  useEffect(() => {
    if (activeTab === 'Reschedule' && user) {
      fetchRescheduleBookings();
    }
  }, [activeTab, user, rescheduleFilterDate, rescheduleFilterDoctor, rescheduleFilterPatient, rescheduleFilterDepartment, rescheduleMode, bulkRefreshKey]);

  useEffect(() => {
    if (activeTab === 'Reschedule' && rescheduleMode === 'bulk') {
      const fetchBulkSlots = async () => {
        try {
          let url = `https://napi.bharatmedicalhallplus.com/doctors/slots?`;
          if (bulkDoctorFilter) url += `doctor_id=${bulkDoctorFilter}&`;
          if (bulkDateFilter) url += `date=${bulkDateFilter}`;
          const res = await axios.get(url);
          setBulkAvailableSlots(res.data.data || []);
        } catch(e) {}
      };
      fetchBulkSlots();
    }
  }, [activeTab, rescheduleMode, bulkDoctorFilter, bulkDateFilter, bulkRefreshKey]);

  const handleSelectBulkSlot = async (slot: any) => {
    setBulkOriginalSlot(slot);
    setRescheduleLoading(true);
    try {
      const url = `https://napi.bharatmedicalhallplus.com/doctors/slots?doctor_id=${slot.doctor_id}`;
      const res = await axios.get(url);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const validSlots = (res.data.data || []).filter((s: any) => new Date(s.date) >= today && s.id !== slot.id);
      setRescheduleSlots(validSlots);
    } catch(e) {
      console.error(e);
    } finally {
      setRescheduleLoading(false);
    }
  };

  const executeBulkReschedule = async (newSlot: any) => {
    setRescheduleLoading(true);
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/bulk/reschedule`, {
        original_slot_id: bulkOriginalSlot.id,
        new_slot_id: newSlot.id
      });
      if (res.data.success) {
        if (Platform.OS === 'web') {
          window.alert(res.data.message);
        } else {
          Alert.alert('Success', res.data.message);
        }
        setBulkOriginalSlot(null);
        setBulkRefreshKey(k => k + 1);
      } else {
        if (Platform.OS === 'web') {
          window.alert(res.data.message);
        } else {
          Alert.alert('Error', res.data.message);
        }
      }
    } catch(e: any) {
      const msg = e.response?.data?.message || 'Failed to bulk reschedule';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleConfirmBulkReschedule = async (newSlot: any) => {
    if (!bulkOriginalSlot) return;
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to move all tokens from ${bulkOriginalSlot.start_time} to ${newSlot.start_time}?`);
      if (confirmed) {
        executeBulkReschedule(newSlot);
      }
    } else {
      Alert.alert('Confirm Bulk Reschedule', `Are you sure you want to move all tokens from ${bulkOriginalSlot.start_time} to ${newSlot.start_time}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reschedule All', onPress: () => executeBulkReschedule(newSlot) }
      ]);
    }
  };

  const fetchRescheduleBookings = async () => {
    try {
      let url = `https://napi.bharatmedicalhallplus.com/bookings?status=Booked&exclude_blocked=true`;
      
      // If a specific department filter is selected, use it
      if (rescheduleFilterDepartment) {
        url += `&department=${encodeURIComponent(rescheduleFilterDepartment)}`;
      }

      if (rescheduleFilterDate) url += `&date=${rescheduleFilterDate}`;
      if (rescheduleFilterDoctor) url += `&doctor_id=${rescheduleFilterDoctor}`;
      if (rescheduleFilterPatient) url += `&patient_name=${rescheduleFilterPatient}`;

      const res = await axios.get(url);
      setRescheduleBookings(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectReschedule = async (booking: any) => {
    setRescheduleSelectedBooking(booking);
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/doctors/slots');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const validSlots = res.data.data.filter((s: any) => {
        const slotDate = new Date(s.date);
        return slotDate >= today && s.doctor_id === booking.doctor_id;
      });
      setRescheduleSlots(validSlots);
    } catch (err) {
      console.error('Failed to load slots for reschedule', err);
    }
  };

  const handleConfirmReschedule = async (slot: any) => {
    setRescheduleLoading(true);
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings?slot_id=${slot.id}`);
      const booked = res.data.data.filter((b: any) => b.status !== 'VIP Quota' && b.status !== 'Cancelled').map((b: any) => b.token_number);
      let new_token = 1;
      while (booked.includes(new_token)) {
        new_token++;
      }
      
      const reshRes = await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/${rescheduleSelectedBooking.booking_id}/reschedule`, {
        new_slot_id: slot.id,
        new_token_number: new_token
      });

      if (reshRes.data.success) {
        alert('Rescheduled Successfully to Token #' + new_token);
        setRescheduleSelectedBooking(null);
        fetchRescheduleBookings();
      }
    } catch(err: any) {
      alert(err.response?.data?.message || 'Reschedule failed');
    } finally {
      setRescheduleLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'My Bookings' && user) {
      fetchMyBookings();
    }
  }, [activeTab, filterDate, filterDoctor, filterPatient, user]);

  const fetchMyBookings = async () => {
    try {
      let url = `https://napi.bharatmedicalhallplus.com/bookings?booked_by=${user.id}&exclude_blocked=true`;
      if (filterDate) url += `&date=${filterDate}`;
      if (filterDoctor) url += `&doctor_id=${filterDoctor}`;
      if (filterPatient) url += `&patient_name=${filterPatient}`;
      const res = await axios.get(url);
      setMyBookings(res.data.data);
      
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchDoctorsForFilter = async () => {
      try {
        const res = await axios.get('https://napi.bharatmedicalhallplus.com/doctors');
        if (res.data.success && res.data.data) {
          let docs = res.data.data;
          const formatted = docs.map((d: any) => ({ id: d.id, name: d.full_name || d.name }));
          setUniqueDoctors(formatted);
        }
      } catch (err) {
        console.error('Failed to load doctors for filter', err);
      }
    };
    if (user) {
      fetchDoctorsForFilter();
    }
  }, [user]);


  const handleExportAllCSV = async () => {
    if (!allBookings || allBookings.length === 0) return;
    
    let completed = allBookings.reduce((sum, b) => sum + (b.status === 'Completed' ? parseFloat(b.fee || 0) : 0), 0);
    let refund = allBookings.reduce((sum, b) => sum + (b.status === 'Cancelled' ? parseFloat(b.fee || 0) : 0), 0);
    let toRefund = allBookings.reduce((sum, b) => sum + (b.status === 'Booked' ? parseFloat(b.fee || 0) : 0), 0);

    let csvContent = "Bharat Medical Hall - Filtered Bookings Report\n";
    csvContent += `Filters:,Date: ${bDateFilter || 'All'},Doctor: ${bDoctorFilter || 'All'},Employee: ${bEmployeeFilter || 'All'},Status: ${bStatusFilter || 'All'}\n`;
    csvContent += `Summary:,Completed: ₹${completed},Refund: ₹${refund},To Refund: ₹${toRefund}\n\n`;

    csvContent += "Token,Patient Name,Mobile,Doctor,Department,Date,Time,Booked By,Status,Payment Mode,Fee\n";
    allBookings.forEach((b: any) => {
      csvContent += `${b.token_number},${b.patient_name},${b.mobile},${b.doctor_name},${b.department},${new Date(b.date).toLocaleDateString('en-GB')},${b.start_time},${b.booked_by_name || '-'},${b.status},${b.payment_mode},${b.fee}\n`;
    });
    
    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', 'all_bookings_report.csv');
      a.click();
    } else {
      // @ts-ignore
      const uri = FileSystem.documentDirectory + "all_bookings_report.csv";
      // @ts-ignore
      await FileSystem.writeAsStringAsync(uri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri);
    }
  };

  const handlePrintAllBookings = async () => {
    if (!allBookings || allBookings.length === 0) return;
    
    let completed = allBookings.reduce((sum, b) => sum + (b.status === 'Completed' ? parseFloat(b.fee || 0) : 0), 0);
    let refund = allBookings.reduce((sum, b) => sum + (b.status === 'Cancelled' ? parseFloat(b.fee || 0) : 0), 0);
    let toRefund = allBookings.reduce((sum, b) => sum + (b.status === 'Booked' ? parseFloat(b.fee || 0) : 0), 0);

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
            <p>Date: ${bDateFilter || 'All'} | Doctor: ${uniqueDoctors.find((d:any) => d.id === bDoctorFilter)?.name || 'All'} | Employee: ${allEmployees.find((e:any) => e.id === bEmployeeFilter)?.full_name || 'All'} | Status: ${bStatusFilter || 'All'}</p>
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
                <th>Status</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              ${allBookings.map((b: any) => `
                <tr>
                  <td>#${b.token_number}</td>
                  <td>${b.patient_name}</td>
                  <td>${b.mobile}</td>
                  <td>${b.doctor_name}</td>
                  <td>${new Date(b.date).toLocaleDateString('en-GB')} ${b.start_time}</td>
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
        await Print.printAsync({ html: htmlContent });
      }
    } catch (err) {
      console.error('Print error', err);
    }
  };

  
  const handlePrintMyBookings = async () => {
    if (!myBookings || myBookings.length === 0) return;
    
    let completed = myBookings.reduce((sum, b) => sum + (b.status === 'Completed' ? parseFloat(b.fee || 0) : 0), 0);
    let refund = myBookings.reduce((sum, b) => sum + (b.status === 'Cancelled' ? parseFloat(b.fee || 0) : 0), 0);
    let toRefund = myBookings.reduce((sum, b) => sum + (b.status === 'Booked' ? parseFloat(b.fee || 0) : 0), 0);

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
            <p><strong>My Booked Patients Report</strong></p>
            <p>Date: ${filterDate || 'All'} | Doctor: ${uniqueDoctors.find((d:any) => d.id === filterDoctor)?.name || 'All'} | Patient: ${filterPatient || 'All'}</p>
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
                <th>Status</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              ${myBookings.map((b: any) => `
                <tr>
                  <td>#${b.token_number}</td>
                  <td>${b.patient_name}</td>
                  <td>${b.mobile}</td>
                  <td>${b.doctor_name}</td>
                  <td>${new Date(b.date).toLocaleDateString('en-GB')} ${b.start_time}</td>
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
        await Print.printAsync({ html: htmlContent });
      }
    } catch (err) {
      console.error('Print error', err);
    }
  };

  const handleExportCSV = async () => {
    if (!myBookings || myBookings.length === 0) return;
    
    let csvContent = "Token,Patient Name,Mobile,Doctor,Department,Date,Time,Status,Payment Mode\n";
    myBookings.forEach((b) => {
      csvContent += `${b.token_number},${b.patient_name},${b.mobile},${b.doctor_name},${b.department},${new Date(b.date).toLocaleDateString('en-GB')},${b.start_time},${b.status},${b.payment_mode}\n`;
    });
    
    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', 'my_bookings.csv');
      a.click();
    } else {
      // @ts-ignore
      const uri = FileSystem.documentDirectory + "my_bookings.csv";
      // @ts-ignore
      await FileSystem.writeAsStringAsync(uri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri);
    }
  };

useEffect(() => {
    const loadUserAndSlots = async () => {
      const userData = await AsyncStorage.getItem('employeeUser');
      if (userData) {
        setUser(JSON.parse(userData));
      }
      
      try {
        const res = await axios.get('https://napi.bharatmedicalhallplus.com/doctors/slots');
        // Only show slots for today or future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const validSlots = res.data.data.filter((s: any) => {
          const slotDate = new Date(s.date);
          return slotDate >= today;
        });
        
        setSlots(validSlots);
      } catch (err) {
        console.error('Failed to load slots', err);
      } finally {
        setLoading(false);
      }
      
      try {
        const staffRes = await axios.get('https://napi.bharatmedicalhallplus.com/employees/all-users');
        if (staffRes.data.success) {
          setAllStaff(staffRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load staff for reference', err);
      }
    };
    
    loadUserAndSlots();
  }, []);

  const handleBooking = async () => {
    if (!patientName || !mobile || !age) {
      alert('Please fill all required fields');
      return;
    }
    
    if (selectedToken && vipTokens.includes(selectedToken)) {
      if (!referenceId) {
        alert('Please select a reference from the dropdown for a blocked token booking.');
        return;
      }
    }
    
    setBookingLoading(true);
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/bookings/create', {
        slot_id: selectedSlot.id,
        patient_name: patientName,
        mobile,
        email,
        age: parseInt(age),
        gender,
        blood_group: bloodGroup,
        reason_for_visit: reasonForVisit,
        city,
        pin_code: pinCode,
        guardian_name: guardianName,
        reference,
        reference_id: referenceId || null,
        reference_user_type: referenceUserType || null,
        pr,
        booked_by: user.id,
        payment_mode: paymentMode,
        token_number: selectedToken
      });
      
      if (res.data.success) {
        setSuccessToken(res.data.token_number);
          if (res.data.patient_id) setSuccessPatientId(res.data.patient_id);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSlot(null);
    setSelectedToken(null);
    setSlotBookings([]);
    setPatientName('');
    setMobile('');
    setEmail('');
    setAge('');
    setBloodGroup('');
    setReasonForVisit('');
    setReference('');
    setReferenceId('');
    setReferenceUserType('');
    setPr('');
    setCity('');
    setPinCode('');
    setGuardianName('');
    setSuccessToken(null);
      setSuccessPatientId(null);
  };

  const handleSelectSlot = async (s: any) => {
    setSelectedSlot(s);
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings?slot_id=${s.id}`);
      const booked = res.data.data.filter((b: any) => b.status !== 'VIP Quota').map((b: any) => b.token_number);
      const vips = res.data.data.filter((b: any) => b.status === 'VIP Quota').map((b: any) => b.token_number);
      setSlotBookings(booked);
      setVipTokens(vips);
    } catch (err) {
      console.error('Failed to load bookings for slot', err);
    }
  };

  const handlePrintReceipt = async (b: any = null) => {
    const printToken = b ? b.token_number : successToken;
    const printPatient = b ? (b.patient_name || b.name) : patientName;
      const printPatientId = b ? b.patient_id : successPatientId;
    const printAge = b ? b.age : age;
    const printGender = b ? b.gender : gender;
    const printMobile = b ? b.mobile : mobile;
    const printCity = b ? b.city : city;
    const printDoctor = b ? b.doctor_name : selectedSlot?.doctor_name;
    const printDept = b ? b.department : (selectedSlot?.doctor_department || 'General');
    const printAmount = b ? b.fee : selectedSlot?.fee;
    const printMode = b ? b.payment_mode : paymentMode;
    const printDate = b ? new Date(b.date).toLocaleDateString('en-GB') : new Date(selectedSlot?.date).toLocaleDateString('en-GB');
    const printTime = b ? b.start_time : selectedSlot?.start_time;
    const bookingId = b ? (b.booking_id || b.id) : null;
    
    let currentPrintCount = 1;
    if (bookingId) {
      try {
        const res = await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/${bookingId}/print-count`);
        if (res.data.success) {
           currentPrintCount = res.data.print_count;
           if (b) { b.print_count = currentPrintCount; }
        }
      } catch(e) { console.error('Failed to update print count'); }
    }
    
    const nowStr = new Date().toLocaleDateString('en-GB');

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 0; size: auto; }
            body { font-family: monospace; width: 72mm; margin: 0; margin-left: 15px; margin-top: 15px; padding: 2px; color: #000; font-size: 12px; line-height: 1.3; }
            .header { text-align: center; margin-bottom: 2px; }
            .title { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
            .subtitle { font-size: 9px; line-height: 1.2; }
            .dotted-line { border-bottom: 1px dashed #000; margin: 4px 0; }
            .ticket-title { text-align: center; font-weight: bold; text-decoration: underline; margin: 4px 0 8px 0; font-size: 13px; }
            
            .row { display: flex; align-items: flex-start; margin-bottom: 4px; }
            .row-spaced { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
            
            .label { display: inline-block; width: 75px; }
            .colon { margin-right: 6px; }
            
            .box { border: 1px solid #000; padding: 2px 6px; font-weight: bold; font-size: 14px; margin: 0 4px; }
            
            .footer-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px; }
            .print-info { font-size: 9px; }
            .bmh { font-weight: bold; font-size: 14px; margin-right: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">BHARAT HEALTHCARE</div>
            <div class="subtitle">
              HOSPITAL ROAD,BARIPADA,MAYURBHANJ,ODISHA,PIN. 757001<br/>
              REGD. NO: MBJ/CE/03/2019,MOBILE NO:8093110888
            </div>
          </div>
          <div class="dotted-line"></div>
          <div class="ticket-title">TEMPORARY APPOINTMENT TICKET</div>
          
          <div style="display: flex; align-items: center; justify-content: flex-start; margin-bottom: 8px; font-size: 11px;">
            <div style="display: flex; align-items: center; margin-right: 15px; font-weight: bold;">Pid:${printPatientId || "New"} &nbsp; Slno: <span class="box">${printToken}</span></div>
            <div>Appt date:${printDate}</div>
          </div>
          
          <div class="row">
            <span class="label">Name</span><span class="colon">:</span><span style="text-transform: uppercase;">${printPatient}</span>
          </div>
          
          <div class="row-spaced">
            <div>
              <span class="label">Age/Sex</span><span class="colon">:</span><span style="text-transform: uppercase;">${printAge}Y/${printGender}</span>
            </div>
            <div>
              <span>MobNo:${printMobile}</span>
            </div>
          </div>
          
          <div class="row">
            <span class="label">Address</span><span class="colon">:</span><span style="text-transform: uppercase;">${printCity || ''}</span>
          </div>
          
          <div class="row">
            <span class="label">Doctor</span><span class="colon">:</span><span style="text-transform: uppercase;">DR ${printDoctor}</span>
          </div>
          
          <div class="row">
            <span class="label">Department</span><span class="colon">:</span><span style="text-transform: uppercase;">${printDept}</span>
          </div>
          
          ${parseInt(printAmount) > 0 ? `
          <div class="row" style="margin-top: 4px;">
            <span class="label">Amount</span><span class="colon">:</span><span style="margin-left: 30px; font-weight: bold;">${printAmount}</span>
          </div>` : ''}
          
          <div class="footer-row">
            <div class="print-info">Printed: ${nowStr} (p${currentPrintCount})</div>
            <div class="bmh">BMH</div>
          </div>
        </body>
      </html>
    `;
    try {
      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.contentDocument?.write(html);
        iframe.contentDocument?.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 250);
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri);
      }
    } catch (err) {
      console.error('Error printing receipt', err);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (successToken) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={[styles.successCard, isMobile && { width: '100%' }]}>
          <View style={styles.successIconWrapper}>
            <CheckCircle size={48} color="#10b981" />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>Patient Token Number</Text>
          <Text style={styles.tokenNumber}>#{successToken}</Text>
          
          <View style={styles.detailsBox}>
            <Text style={styles.detailText}>Doctor: {selectedSlot.doctor_name}</Text>
            <Text style={styles.detailText}>Time: {selectedSlot.start_time}</Text>
            <Text style={styles.detailText}>Patient: {patientName}</Text>
          </View>
          
          <View style={{flexDirection: 'row', gap: 16, width: '100%'}}>
            <TouchableOpacity style={[styles.btn, {flex: 1, backgroundColor: '#3b82f6', flexDirection: 'row', justifyContent: 'center'}]} onPress={() => handlePrintReceipt(null)}>
              <Printer color="white" size={20} style={{marginRight: 8}} />
              <Text style={styles.btnText}>Print Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, {flex: 1, backgroundColor: '#f1f5f9'}]} onPress={resetForm}>
              <Text style={[styles.btnText, {color: '#475569'}]}>New Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Patient Booking</Text>
      
      <View style={styles.tabContainer}>
        {['New Booking', 'My Bookings', 'Reschedule', 'Bookings'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'New Booking' ? (
        <View>
          {!selectedSlot ? (
        <View>
          <Text style={styles.sectionTitle}>Select an Available Slot</Text>
          <View style={{flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 16}}>
            <TextInput 
              style={[styles.input, {flex: 1}]}
              placeholder="Search by Doctor or Dept"
              value={slotSearchQuery}
              onChangeText={setSlotSearchQuery}
            />
            <View style={{flex: 1}}>
              {Platform.OS === 'web' ? (
                <input 
                  type="date"
                  value={slotFilterDate}
                  onChange={(e) => setSlotFilterDate(e.target.value)}
                  style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 14, fontSize: 14, color: '#1e293b', width: '100%' } as any}
                />
              ) : (
                <>
                  <TouchableOpacity onPress={() => setShowSlotDatePicker(true)}>
                    <TextInput style={styles.input} value={slotFilterDate} editable={false} placeholder="Select Date" />
                  </TouchableOpacity>
                  {showSlotDatePicker && (
                    <DateTimePicker
                      value={slotFilterDate ? new Date(slotFilterDate) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowSlotDatePicker(false);
                        if (selectedDate) {
                          setSlotFilterDate(selectedDate.toISOString().split('T')[0]);
                        }
                      }}
                    />
                  )}
                </>
              )}
            </View>
          </View>
          <View style={styles.grid}>
            {slots.filter((s) => {
              const slotDateStr = s.date.split('T')[0];
              const todayStr = new Date().toISOString().split('T')[0];
              if (slotDateStr < todayStr) return false;
              if (slotFilterDate && slotDateStr !== slotFilterDate) return false;
              if (slotSearchQuery) {
                const query = slotSearchQuery.toLowerCase();
                const docName = (s.doctor_name || '').toLowerCase();
                const dept = (s.doctor_department || '').toLowerCase();
                if (!docName.includes(query) && !dept.includes(query)) return false;
              }
              return true;
            }).map((s, i) => (
              <TouchableOpacity key={i} style={[styles.slotCard, isMobile && { width: '100%' }]} onPress={() => handleSelectSlot(s)}>
                <View style={[styles.slotHeader, {alignItems: 'flex-start'}]}>
                  <View style={{flexDirection: 'row', flex: 1, gap: 12}}>
                    {s.doctor_photo ? (
                      <Image source={{uri: s.doctor_photo}} style={{width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9'}} />
                    ) : (
                      <View style={{width: 48, height: 48, borderRadius: 24, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center'}}>
                        <Users size={24} color="#64748b" />
                      </View>
                    )}
                    <View style={{flex: 1}}>
                      <Text style={styles.doctorName}>Dr. {s.doctor_name}</Text>
                      <Text style={{fontSize: 13, color: '#64748b', marginTop: 2}}>{s.doctor_department || 'General'}{s.doctor_role ? ` • ${s.doctor_role}` : ''}</Text>
                    </View>
                  </View>
                  <Text style={styles.feeText}>₹{s.fee}</Text>
                </View>
                <View style={styles.slotDetails}>
                                <View style={styles.slotDetailRow}><User color="#64748b" size={16} /><Text style={[styles.slotDetailText, {fontWeight: 'bold', color: '#1e293b'}]}>Dr. {s.doctor_name}</Text></View>
                  <View style={styles.slotDetailRow}>
                    <Calendar size={16} color="#64748b" />
                    <Text style={styles.slotDetailText}>{new Date(s.date).toLocaleDateString('en-GB')}</Text>
                  </View>
                  <View style={styles.slotDetailRow}>
                    <Clock size={16} color="#64748b" />
                    <Text style={styles.slotDetailText}>{s.start_time} - {s.end_time}</Text>
                  </View>
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12}}>
                  <Text style={{fontSize: 13, color: '#3b82f6', fontWeight: '500'}}>Available: {s.total_tokens - (s.booked_count || 0)}/{s.total_tokens}</Text>
                  <View style={styles.selectBtn}><Text style={styles.selectBtnText}>Select</Text></View>
                </View>
              </TouchableOpacity>
            ))}
            {slots.length === 0 && <Text style={{color: '#64748b'}}>No slots available for booking.</Text>}
          </View>
        </View>
      ) : !selectedToken ? (
        <View style={styles.formCard}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedSlot(null)}>
            <Text style={styles.backBtnText}>← Back to Slots</Text>
          </TouchableOpacity>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <Text style={{fontSize: 20, fontWeight: 'bold', color: '#0f172a'}}>Select Token for Dr. {selectedSlot.doctor_name}</Text>
            </View>
            <View style={{flexDirection: 'row', gap: 16, marginBottom: 16}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}><Calendar size={18} color="#64748b" /><Text style={{fontSize: 15, color: '#475569', fontWeight: '500'}}>{new Date(selectedSlot.date).toLocaleDateString('en-GB')}</Text></View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}><Clock size={18} color="#64748b" /><Text style={{fontSize: 15, color: '#475569', fontWeight: '500'}}>{selectedSlot.start_time} - {selectedSlot.end_time}</Text></View>
            </View>
            <Text style={{fontSize: 14, color: '#64748b', marginBottom: 20}}>Tokens marked in red are already booked. Tokens in orange are Blocked.</Text>
          
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
            {Array.from({length: selectedSlot.total_tokens}, (_, i) => i + 1).map(t => {
              const isBooked = slotBookings.includes(t);
              const isVip = vipTokens.includes(t);
              return (
                <TouchableOpacity 
                  key={t}
                  disabled={isBooked}
                  style={{
                    width: 56, height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
                    backgroundColor: isBooked ? '#fecaca' : (isVip ? '#ffedd5' : '#d1fae5'),
                    borderWidth: 1, borderColor: isBooked ? '#ef4444' : (isVip ? '#f97316' : '#10b981'),
                    opacity: isBooked ? 0.6 : 1
                  }}
                  onPress={() => setSelectedToken(t)}
                >
                  <Text style={{color: isBooked ? '#b91c1c' : (isVip ? '#c2410c' : '#047857'), fontWeight: 'bold', fontSize: 18}}>{t}</Text>
                  {isVip && <Text style={{fontSize: 9, color: '#c2410c', fontWeight: 'bold', marginTop: 2}}>Blocked</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.formCard}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedToken(null)}>
            <Text style={styles.backBtnText}>← Back to Tokens</Text>
          </TouchableOpacity>
          
          <View style={styles.selectedSlotBanner}>
            <Text style={styles.bannerTitle}>Booking Token #{selectedToken} With</Text>
            <Text style={styles.bannerDoctor}>Dr. {selectedSlot.doctor_name}</Text>
            <Text style={styles.bannerTime}>{new Date(selectedSlot.date).toLocaleDateString('en-GB')} at {selectedSlot.start_time}</Text>
          </View>
          
          <Text style={styles.formLabel}>Patient Full Name *</Text>
          <TextInput style={styles.input} value={patientName} onChangeText={setPatientName} placeholder="Enter patient name" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => mobileRef.current?.focus()} />
          
          <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
            <View style={{flex: 1, marginRight: isMobile ? 0 : 10, marginBottom: isMobile ? 16 : 0}}>
              <Text style={styles.formLabel}>Mobile Number *</Text>
              <TextInput ref={mobileRef} style={styles.input} value={mobile} onChangeText={setMobile} placeholder="Enter mobile" keyboardType="phone-pad" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => ageRef.current?.focus()} />
              {autofilled && (
                <Text style={{ fontSize: 12, color: '#10b981', fontWeight: '600', marginTop: 4 }}>
                  ✓ Patient record found and autofilled
                </Text>
              )}
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.formLabel}>Age *</Text>
              <TextInput ref={ageRef} style={styles.input} value={age} onChangeText={setAge} placeholder="Age" keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => bloodGroupRef.current?.focus()} />
            </View>
          </View>
          
          <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
            <View style={{flex: 1, marginRight: isMobile ? 0 : 10, marginBottom: isMobile ? 16 : 0}}>
              <Text style={styles.formLabel}>Blood Group</Text>
              <TextInput ref={bloodGroupRef} style={styles.input} value={bloodGroup} onChangeText={setBloodGroup} placeholder="e.g. O+" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => reasonRef.current?.focus()} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.formLabel}>Reason for Visit</Text>
              <TextInput ref={reasonRef} style={styles.input} value={reasonForVisit} onChangeText={setReasonForVisit} placeholder="Brief reason" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => cityRef.current?.focus()} />
            </View>
          </View>
          
          <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
            <View style={{flex: 1, marginRight: isMobile ? 0 : 10, marginBottom: isMobile ? 16 : 0}}>
              <Text style={styles.formLabel}>City</Text>
              <TextInput ref={cityRef} style={styles.input} value={city} onChangeText={setCity} placeholder="City name" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => pinCodeRef.current?.focus()} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.formLabel}>Pin Code</Text>
              <TextInput ref={pinCodeRef} style={styles.input} value={pinCode} onChangeText={setPinCode} placeholder="Postal Code" keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => guardianRef.current?.focus()} />
            </View>
          </View>

          <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
            <View style={{flex: 1, marginRight: isMobile ? 0 : 10, marginBottom: isMobile ? 16 : 0}}>
              <Text style={styles.formLabel}>Guardian / Parent Name</Text>
              <TextInput ref={guardianRef} style={styles.input} value={guardianName} onChangeText={setGuardianName} placeholder="Guardian Name" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => emailRef.current?.focus()} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.formLabel}>Email Address (Optional)</Text>
              <TextInput ref={emailRef} style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter email" keyboardType="email-address" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => referenceRef.current?.focus()} />
            </View>
          </View>

          <View style={[styles.row, isMobile && { flexDirection: 'column' }, { zIndex: 50, elevation: 50, position: 'relative' }]}>
            <View style={{flex: 1, marginRight: isMobile ? 0 : 10, marginBottom: isMobile ? 16 : 0, position: 'relative', zIndex: 10 }}>
              <Text style={styles.formLabel}>Reference (Search or Enter Name)</Text>
              <TextInput ref={referenceRef} style={styles.input} value={reference} onChangeText={(text) => { setReference(text); setReferenceId(''); setReferenceUserType(''); }} placeholder="e.g. Dr. John - Cardiology" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => prRef.current?.focus()} />
              {reference.length > 0 && allStaff.filter(s => s.full_name && (s.full_name.toLowerCase().includes(reference.toLowerCase()) || (s.department && s.department.toLowerCase().includes(reference.toLowerCase())) || (s.type && s.type.toLowerCase().includes(reference.toLowerCase())))).length > 0 && !reference.includes('(') && (
                <View style={{position: 'absolute', top: 70, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, maxHeight: 150, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5}}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {allStaff.filter(s => s.full_name && (s.full_name.toLowerCase().includes(reference.toLowerCase()) || (s.department && s.department.toLowerCase().includes(reference.toLowerCase())) || (s.type && s.type.toLowerCase().includes(reference.toLowerCase())))).slice(0, 10).map((s, i) => (
                      <TouchableOpacity key={i} style={{padding: 12, borderBottomWidth: 1, borderColor: '#f1f5f9'}} onPress={() => { setReference(`${s.full_name} (${s.department || s.type})`); setReferenceId(s.id); setReferenceUserType(s.type); }}>
                        <Text style={{fontWeight: 'bold', color: '#1e293b'}}>{s.full_name}</Text>
                        <Text style={{fontSize: 12, color: '#64748b'}}>{s.type} {s.department ? `- ${s.department}` : ''}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.formLabel}>PR</Text>
              <TextInput ref={prRef} style={styles.input} value={pr} onChangeText={setPr} placeholder="PR Details" returnKeyType="done" onSubmitEditing={() => genderRef.current?.focus()} />
            </View>
          </View>
          
          <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
            <View style={{flex: 1, marginRight: isMobile ? 0 : 10, marginBottom: isMobile ? 16 : 0}}>
              <Text style={styles.formLabel}>Gender (Type 'm' or 'f')</Text>
                <TextInput
                  ref={genderRef}
                  style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }}
                  onFocus={() => setGenderFocused(true)}
                  onBlur={() => setGenderFocused(false)}
                  autoCapitalize="none"
                  value=""
                  onChangeText={(text) => {
                    const last = text.slice(-1).toLowerCase();
                    if (last === 'm') setGender('Male');
                    if (last === 'f') setGender('Female');
                  }}
                  returnKeyType="next"
                  onSubmitEditing={() => paymentRef.current?.focus()}
                />
                <View style={[styles.toggleRow, genderFocused && { shadowColor: '#3b82f6', shadowOpacity: 0.5, shadowRadius: 4, elevation: 4, borderWidth: 1, borderColor: '#3b82f6', borderRadius: 8 }]}>
                <TouchableOpacity style={[styles.toggleBtn, gender === 'Male' && styles.toggleBtnActive]} onPress={() => setGender('Male')}>
                  <Text style={[styles.toggleText, gender === 'Male' && styles.toggleTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, gender === 'Female' && styles.toggleBtnActive]} onPress={() => setGender('Female')}>
                  <Text style={[styles.toggleText, gender === 'Female' && styles.toggleTextActive]}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.formLabel}>Payment Mode (Type 'c' or 'o')</Text>
                <TextInput
                  ref={paymentRef}
                  style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }}
                  onFocus={() => setPaymentFocused(true)}
                  onBlur={() => setPaymentFocused(false)}
                  autoCapitalize="none"
                  value=""
                  onChangeText={(text) => {
                    const last = text.slice(-1).toLowerCase();
                    if (last === 'c') setPaymentMode('Cash');
                    if (last === 'o') setPaymentMode('Online');
                  }}
                  returnKeyType="done"
                  onSubmitEditing={() => handleBooking()}
                />
                <View style={[styles.toggleRow, paymentFocused && { shadowColor: '#3b82f6', shadowOpacity: 0.5, shadowRadius: 4, elevation: 4, borderWidth: 1, borderColor: '#3b82f6', borderRadius: 8 }]}>
                <TouchableOpacity style={[styles.toggleBtn, paymentMode === 'Cash' && styles.toggleBtnActive]} onPress={() => setPaymentMode('Cash')}>
                  <Text style={[styles.toggleText, paymentMode === 'Cash' && styles.toggleTextActive]}>Cash</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, paymentMode === 'Online' && styles.toggleBtnActive]} onPress={() => setPaymentMode('Online')}>
                  <Text style={[styles.toggleText, paymentMode === 'Online' && styles.toggleTextActive]}>Online</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Payment Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Consultation Fee</Text>
              <Text style={styles.summaryValue}>₹{selectedSlot.fee}</Text>
            </View>
            <View style={[styles.summaryRow, {borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 10, marginTop: 10}]}>
              <Text style={[styles.summaryLabel, {fontWeight: 'bold'}]}>Total Payable</Text>
              <Text style={[styles.summaryValue, {fontWeight: 'bold', color: '#10b981'}]}>₹{selectedSlot.fee}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.confirmBtn} onPress={handleBooking} disabled={bookingLoading}>
            {bookingLoading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>Confirm Booking & Collect ₹{selectedSlot.fee}</Text>}
          </TouchableOpacity>
        </View>
      )}
        </View>
      ) : activeTab === 'My Bookings' ? (
        <View style={styles.card}>
          <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
            <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1e293b'}}>My Booked Patients</Text>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
              <Text style={styles.exportBtnText}>Export CSV</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.filterRow, isMobile && { flexDirection: 'column' }, {flexWrap: 'wrap'}]}>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Patient Name</Text>
              <TextInput style={[styles.input, {padding: 10}]} value={filterPatient} onChangeText={setFilterPatient} placeholder="Search patient or ID" />
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Date Filter</Text>
              {Platform.OS === 'web' ? (
                <input 
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b' } as any}
                />
              ) : (
                <>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <TextInput style={styles.input} value={filterDate} editable={false} placeholder="Select Date" />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={filterDate ? new Date(filterDate) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setFilterDate(selectedDate.toISOString().split('T')[0]);
                      }}
                    />
                  )}
                </>
              )}
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Doctor Filter</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filterDoctor}
                  onValueChange={(val) => setFilterDoctor(val)}
                  style={styles.picker}
                >
                  <Picker.Item label="All Doctors" value="" />
                  {uniqueDoctors.map((d: any) => (
                    <Picker.Item key={d.id} label={d.name} value={d.id} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={[styles.filterCol, {minWidth: 150, justifyContent: 'flex-end'}]}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setFilterDate(''); setFilterDoctor(''); setFilterPatient(''); }}>
                <Text style={styles.clearBtnText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: isMobile ? 800 : '100%' }}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Token</Text>
                <Text style={[styles.tableCellHeader, {flex: 0.5}]}>ID</Text>
                <Text style={styles.tableCellHeader}>Patient</Text>
                <Text style={styles.tableCellHeader}>Doctor</Text>
                <Text style={styles.tableCellHeader}>Date/Time</Text>
                <Text style={styles.tableCellHeader}>PR / Ref</Text>
                <Text style={styles.tableCellHeader}>Payment</Text>
                <Text style={styles.tableCellHeader}>Status</Text>
                <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Action</Text>
              </View>
              {myBookings.map((b, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>#{b.token_number}</Text>
                      <Text style={[styles.tableCell, {flex: 0.5}]}>#{b.booking_id || b.id}</Text>
                  <View style={styles.tableCell}>
                    <Text style={{fontWeight: '500'}}>{b.patient_name}</Text>
                    <Text style={{fontSize: 12, color: '#64748b'}}>{b.mobile}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text>{b.doctor_name}</Text>
                    <Text style={{fontSize: 12, color: '#64748b'}}>{b.department}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text>{new Date(b.date).toLocaleDateString('en-GB')}</Text>
                    <Text style={{fontSize: 12, color: '#64748b'}}>{b.start_time}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text>{b.pr || '-'}</Text>
                    <Text style={{fontSize: 12, color: '#64748b'}}>{b.reference || ''}</Text>
                  </View>
                  <Text style={styles.tableCell}>{b.payment_mode}</Text>
                  <Text style={styles.tableCell}>{b.status}</Text>
                  <TouchableOpacity onPress={() => handlePrintReceipt(b)} style={{flex: 0.5, alignItems: 'center'}}><Printer color="#3b82f6" size={20}/></TouchableOpacity>
                </View>
              ))}
              {myBookings.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No bookings found.</Text>}
            </View>
            </ScrollView>
          </View>

      ) : activeTab === 'Bookings' ? (
        <View style={styles.card}>
          <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
            <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1e293b'}}>All Bookings</Text>
            
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center'}}>
              <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
                <Text style={{fontSize: 13, color: '#16a34a', fontWeight: 'bold'}}>Completed: ₹{allBookings.reduce((sum, b) => sum + (b.status === 'Completed' ? parseFloat(b.fee || 0) : 0), 0)}</Text>
                <Text style={{fontSize: 13, color: '#ef4444', fontWeight: 'bold'}}>Refund: ₹{allBookings.reduce((sum, b) => sum + (b.status === 'Cancelled' ? parseFloat(b.fee || 0) : 0), 0)}</Text>
                <Text style={{fontSize: 13, color: '#f59e0b', fontWeight: 'bold'}}>To Refund: ₹{allBookings.reduce((sum, b) => sum + (b.status === 'Booked' ? parseFloat(b.fee || 0) : 0), 0)}</Text>
              </View>
              <TouchableOpacity style={[styles.exportBtn, {backgroundColor: '#3b82f6'}]} onPress={handlePrintAllBookings}>
                <Text style={styles.exportBtnText}>Print All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={handleExportAllCSV}>
                <Text style={styles.exportBtnText}>Export CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setBDateFilter(''); setBDoctorFilter(''); setBPatientFilter(''); setBEmployeeFilter(''); setBStatusFilter(''); }}>
                <Text style={styles.clearBtnText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.filterRow, isMobile && { flexDirection: 'column' }, {flexWrap: 'wrap'}]}>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Patient Name/Mobile</Text>
              <TextInput style={styles.input} value={bPatientFilter} onChangeText={setBPatientFilter} placeholder="Search patient" />
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Date Filter</Text>
              {Platform.OS === 'web' ? (
                <input type="date" value={bDateFilter} onChange={(e) => setBDateFilter(e.target.value)} style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', width: '100%' } as any} />
              ) : (
                <TouchableOpacity onPress={() => setShowBDatePicker(true)}><TextInput style={styles.input} value={bDateFilter} editable={false} placeholder="Select Date" /></TouchableOpacity>
              )}
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Doctor Filter</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={bDoctorFilter} onValueChange={setBDoctorFilter} style={styles.picker}>
                  <Picker.Item label="All Doctors" value="" />
                  {uniqueDoctors.map((d: any) => (<Picker.Item key={d.id} label={d.name} value={d.id} />))}
                </Picker>
              </View>
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Employee Filter</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={bEmployeeFilter} onValueChange={setBEmployeeFilter} style={styles.picker}>
                  <Picker.Item label="All Employees" value="" />
                  {allEmployees.map((e: any) => (<Picker.Item key={e.id} label={e.full_name} value={e.id} />))}
                </Picker>
              </View>
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Status Filter</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={bStatusFilter} onValueChange={setBStatusFilter} style={styles.picker}>
                  <Picker.Item label="All Status" value="" />
                  <Picker.Item label="Confirmed" value="Confirmed" />
                  <Picker.Item label="Completed" value="Completed" />
                  <Picker.Item label="Booked" value="Booked" />
                  <Picker.Item label="Cancelled" value="Cancelled" />
                </Picker>
              </View>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: isMobile ? 1000 : '100%' }}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Token</Text>
                <Text style={styles.tableCellHeader}>Patient</Text>
                <Text style={styles.tableCellHeader}>Doctor/Date</Text>
                <Text style={styles.tableCellHeader}>Booked By</Text>
                <Text style={styles.tableCellHeader}>Payment/Status</Text>
                <Text style={[styles.tableCellHeader, {flex: 0.5, textAlign: 'center'}]}>Actions</Text>
              </View>
              {allBookings.map((b, i) => (
                <React.Fragment key={i}>
                  {editBookingSelected?.booking_id === b.booking_id ? (
                    <View style={{padding: 16, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e2e8f0'}}>
                      <Text style={{fontWeight: 'bold', marginBottom: 12, fontSize: 16}}>Edit Booking #{b.token_number}</Text>
                      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
                        <View style={{width: 150}}><Text style={styles.label}>Patient Name*</Text><TextInput style={styles.input} value={editForm.patient_name} onChangeText={(v) => setEditForm({...editForm, patient_name: v})} /></View>
                        <View style={{width: 150}}><Text style={styles.label}>Mobile*</Text><TextInput style={styles.input} value={editForm.mobile} onChangeText={(v) => setEditForm({...editForm, mobile: v})} /></View>
                        <View style={{width: 80}}><Text style={styles.label}>Age*</Text><TextInput style={styles.input} value={editForm.age} onChangeText={(v) => setEditForm({...editForm, age: v})} /></View>
                        <View style={{width: 150}}><Text style={styles.label}>Gender</Text>
                          <View style={styles.pickerContainer}>
                            <Picker selectedValue={editForm.gender} onValueChange={(v) => setEditForm({...editForm, gender: v})} style={styles.picker}>
                              <Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" />
                            </Picker>
                          </View>
                        </View>
                        <View style={{width: 200}}><Text style={styles.label}>Address</Text><TextInput style={styles.input} value={editForm.city} onChangeText={(v) => setEditForm({...editForm, city: v})} /></View>
                      </View>
                      <View style={{flexDirection: 'row', gap: 12, marginTop: 16}}>
                        <TouchableOpacity style={{backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6}} onPress={handleEditSave} disabled={editLoading}>
                          <Text style={{color: 'white', fontWeight: 'bold'}}>{editLoading ? 'Saving...' : 'Save Changes'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{backgroundColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6}} onPress={() => { setEditBookingSelected(null); }}>
                          <Text style={{color: '#475569', fontWeight: 'bold'}}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : cancelBookingSelected?.booking_id === b.booking_id ? (
                    <View style={{padding: 16, backgroundColor: '#fef2f2', borderBottomWidth: 1, borderColor: '#fecaca', flexDirection: 'column'}}>
                      <Text style={{color: '#b91c1c', fontWeight: 'bold', fontSize: 16, marginBottom: 12}}>Are you sure you want to cancel Token #{b.token_number} for {b.patient_name}?</Text>
                      
                      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16}}>
                        <Text style={styles.label}>Refund Method:</Text>
                        <View style={[styles.pickerContainer, {width: 150}]}>
                          <Picker selectedValue={cancelRefundMode} onValueChange={(v) => setCancelRefundMode(v)} style={styles.picker}>
                            <Picker.Item label="Cash" value="Cash" />
                            <Picker.Item label="Online" value="Online" />
                          </Picker>
                        </View>
                        {cancelRefundMode === 'Online' && (
                          <TextInput 
                            style={[styles.input, {width: 200}]} 
                            placeholder="Transaction ID" 
                            value={cancelRefundTnx} 
                            onChangeText={setCancelRefundTnx} 
                          />
                        )}
                      </View>

                      <View style={{flexDirection: 'row', gap: 12}}>
                        <TouchableOpacity style={{backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6}} onPress={() => {
                          if (cancelRefundMode === 'Online' && !cancelRefundTnx) {
                            alert('Please enter a transaction ID for online refund');
                            return;
                          }
                          executeCancel(b);
                        }}>
                          <Text style={{color: 'white', fontWeight: 'bold'}}>Yes, Cancel Token</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{backgroundColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6}} onPress={() => setCancelBookingSelected(null)}>
                          <Text style={{color: '#475569', fontWeight: 'bold'}}>No, Keep It</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.tableRow}>
                      <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>#{b.token_number}</Text>
                      <View style={styles.tableCell}>
                        <Text style={{fontWeight: '500'}}>{b.patient_name}</Text>
                        <Text style={{fontSize: 12, color: '#64748b'}}>{b.mobile} | Age: {b.age}</Text>
                      </View>
                      <View style={styles.tableCell}>
                        <Text>{b.doctor_name}</Text>
                        <Text style={{fontSize: 12, color: '#64748b'}}>{new Date(b.date).toLocaleDateString('en-GB')} {b.start_time}</Text>
                      </View>
                      <View style={styles.tableCell}>
                        <Text>{b.booked_by_name}</Text>
                        <Text style={{fontSize: 12, color: '#64748b'}}>{b.booked_by_role || '-'}</Text>
                      </View>
                      <View style={styles.tableCell}>
                        <Text>₹{b.fee} ({b.payment_mode})</Text>
                        <Text style={{fontSize: 12, color: b.status === 'Cancelled' ? 'red' : 'green'}}>{b.status}</Text>
                      </View>
                      <View style={[styles.tableCell, {flex: 0.5, flexDirection: 'row', justifyContent: 'center', gap: 12}]}>
                        {b.status === 'Booked' && (
                          <TouchableOpacity onPress={() => {
                            setActiveTab('Reschedule');
                            handleSelectReschedule(b);
                          }}>
                            <Calendar color="#8b5cf6" size={20} />
                          </TouchableOpacity>
                        )}
                        {b.status !== 'Cancelled' && (
                          <TouchableOpacity onPress={() => handlePrintReceipt(b)}>
                            <Printer color="#3b82f6" size={20} />
                          </TouchableOpacity>
                        )}
                        {b.status !== 'Cancelled' && (
                          <TouchableOpacity onPress={() => {
                            setEditBookingSelected(b);
                            setCancelBookingSelected(null);
                            setEditForm({ patient_name: b.patient_name, mobile: b.mobile, age: String(b.age), gender: b.gender, blood_group: b.blood_group, city: b.city, pin_code: b.pin_code, guardian_name: b.guardian_name, reason_for_visit: b.reason_for_visit, reference: b.reference, pr: b.pr });
                          }}><Edit color="#eab308" size={20} /></TouchableOpacity>
                        )}
                        {b.status !== 'Cancelled' && b.status !== 'Completed' && (
                          <TouchableOpacity onPress={() => {
                            setCancelBookingSelected(b);
                            setEditBookingSelected(null);
                          }}><XCircle color="#ef4444" size={20} /></TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </React.Fragment>
              ))}
              {allBookings.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No bookings found.</Text>}
            </View>
          </ScrollView>
        </View>
      ) : activeTab === 'Reschedule' ? (
        <View style={styles.card}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1e293b'}}>Reschedule Bookings</Text>
              <View style={{flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 4}}>
                <TouchableOpacity onPress={() => { setRescheduleMode('single'); setRescheduleSelectedBooking(null); }} style={{paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: rescheduleMode === 'single' ? 'white' : 'transparent', shadowColor: rescheduleMode === 'single' ? '#000' : 'transparent', elevation: rescheduleMode === 'single' ? 2 : 0}}>
                  <Text style={{fontWeight: '600', color: rescheduleMode === 'single' ? '#0f172a' : '#64748b'}}>Single</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setRescheduleMode('bulk'); setBulkOriginalSlot(null); }} style={{paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: rescheduleMode === 'bulk' ? 'white' : 'transparent', shadowColor: rescheduleMode === 'bulk' ? '#000' : 'transparent', elevation: rescheduleMode === 'bulk' ? 2 : 0}}>
                  <Text style={{fontWeight: '600', color: rescheduleMode === 'bulk' ? '#0f172a' : '#64748b'}}>Bulk Slot Move</Text>
                </TouchableOpacity>
              </View>
            </View>
          {rescheduleMode === 'bulk' ? (
              <View>
                {bulkOriginalSlot ? (
                  <View>
                    <TouchableOpacity onPress={() => setBulkOriginalSlot(null)} style={{marginBottom: 16}}>
                      <Text style={{color: Colors.light.primary, fontWeight: '600'}}>← Back to Slots</Text>
                    </TouchableOpacity>
                    <Text style={styles.sectionTitle}>Select Target Slot for Bulk Reschedule</Text>
                    <Text style={{color: '#64748b', marginBottom: 16}}>Moving all active tokens from: {new Date(bulkOriginalSlot.date).toLocaleDateString('en-GB')} {bulkOriginalSlot.start_time}</Text>
                    {rescheduleSlots.length === 0 ? (
                      <Text style={{color: '#64748b'}}>No future slots available to move these tokens to.</Text>
                    ) : (
                      <View style={styles.grid}>
                        {rescheduleSlots.map((s: any, i: number) => (
                          <TouchableOpacity key={i} style={[styles.slotCard, isMobile && { width: '100%' }]} onPress={() => handleConfirmBulkReschedule(s)} disabled={rescheduleLoading}>
                            <View style={styles.slotDetails}>
                                <View style={styles.slotDetailRow}><User color="#64748b" size={16} /><Text style={[styles.slotDetailText, {fontWeight: 'bold', color: '#1e293b'}]}>Dr. {s.doctor_name}</Text></View>
                              <View style={styles.slotDetailRow}><Calendar color="#64748b" size={16} /><Text style={styles.slotDetailText}>{new Date(s.date).toLocaleDateString('en-GB')}</Text>
                  </View>
                  <View style={styles.slotDetailRow}><Clock color="#64748b" size={16} /><Text style={styles.slotDetailText}>{s.start_time} - {s.end_time}</Text></View>
                            </View>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12}}>
                              <Text style={{fontSize: 13, color: '#3b82f6', fontWeight: '500'}}>Available: {s.total_tokens - (s.booked_count || 0)}/{s.total_tokens}</Text>
                              <View style={styles.selectBtn}><Text style={styles.selectBtnText}>{rescheduleLoading ? 'Rescheduling...' : 'Move Here'}</Text></View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    <View style={[styles.filterRow, isMobile && { flexDirection: 'column' }]}>
                      <View style={[styles.filterCol, {flex: 1}]}>
                        <Text style={styles.label}>Select Doctor</Text>
                        <View style={styles.pickerContainer}>
                          <Picker selectedValue={bulkDoctorFilter} onValueChange={setBulkDoctorFilter} style={styles.picker}>
                            <Picker.Item label="All Doctors" value="" />
                            {uniqueDoctors.map((d: any) => (
                              <Picker.Item key={d.id} label={d.name} value={d.id} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      <View style={[styles.filterCol, {flex: 1}]}>
                        <Text style={styles.label}>Select Date</Text>
                        {Platform.OS === 'web' ? (
                          <input type="date" value={bulkDateFilter} onChange={(e) => setBulkDateFilter(e.target.value)} style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', width: '100%' } as any} />
                        ) : (
                          <TextInput style={styles.input} value={bulkDateFilter} onChangeText={setBulkDateFilter} placeholder="YYYY-MM-DD" />
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.grid}>
                      {bulkAvailableSlots.map((s: any, i: number) => (
                        <TouchableOpacity key={i} style={[styles.slotCard, isMobile && { width: '100%' }]} onPress={() => handleSelectBulkSlot(s)}>
                          <View style={styles.slotDetails}>
                                <View style={styles.slotDetailRow}><User color="#64748b" size={16} /><Text style={[styles.slotDetailText, {fontWeight: 'bold', color: '#1e293b'}]}>Dr. {s.doctor_name}</Text></View>
                            <View style={styles.slotDetailRow}><Calendar color="#64748b" size={16} /><Text style={styles.slotDetailText}>{new Date(s.date).toLocaleDateString('en-GB')}</Text>
                  </View>
                  <View style={styles.slotDetailRow}><Clock color="#64748b" size={16} /><Text style={styles.slotDetailText}>{s.start_time} - {s.end_time}</Text></View>
                          </View>
                          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12}}>
                            <Text style={{fontSize: 13, color: '#64748b'}}>Booked: {s.booked_count || 0}</Text>
                            <View style={styles.selectBtn}><Text style={styles.selectBtnText}>Select Origin Slot</Text></View>
                          </View>
                        </TouchableOpacity>
                      ))}
                      {bulkAvailableSlots.length === 0 && <Text style={{color: '#64748b', padding: 20}}>No slots found. Select a specific date/doctor.</Text>}
                    </View>
                  </View>
                )}
              </View>
            ) : rescheduleSelectedBooking ? (
            <View>
              <TouchableOpacity onPress={() => setRescheduleSelectedBooking(null)} style={{marginBottom: 16}}>
                <Text style={{color: Colors.light.primary, fontWeight: '600'}}>← Back to List</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>Select New Slot for {rescheduleSelectedBooking.patient_name}</Text>
              {rescheduleSlots.length === 0 ? (
                <Text style={{color: '#64748b'}}>No future slots available for this doctor.</Text>
              ) : (
                <View style={styles.grid}>
                  {rescheduleSlots.map((s, i) => (
                    <TouchableOpacity key={i} style={[styles.slotCard, isMobile && { width: '100%' }]} onPress={() => handleConfirmReschedule(s)} disabled={rescheduleLoading}>
                      <View style={[styles.slotHeader, {alignItems: 'flex-start'}]}>
                        <View style={{flexDirection: 'row', flex: 1, gap: 12}}>
                          {s.doctor_photo ? (
                            <Image source={{uri: s.doctor_photo}} style={{width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9'}} />
                          ) : (
                            <View style={{width: 48, height: 48, borderRadius: 24, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center'}}>
                              <Users size={24} color="#64748b" />
                            </View>
                          )}
                          <View style={{flex: 1}}>
                            <Text style={styles.doctorName}>Dr. {s.doctor_name}</Text>
                            <Text style={{color: '#64748b', fontSize: 12}}>{s.doctor_department}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.slotDetails}>
                                <View style={styles.slotDetailRow}><User color="#64748b" size={16} /><Text style={[styles.slotDetailText, {fontWeight: 'bold', color: '#1e293b'}]}>Dr. {s.doctor_name}</Text></View>
                        <View style={styles.slotDetailRow}><Calendar color="#64748b" size={16} /><Text style={styles.slotDetailText}>{new Date(s.date).toLocaleDateString('en-GB')}</Text>
                  </View>
                  <View style={styles.slotDetailRow}><Clock color="#64748b" size={16} /><Text style={styles.slotDetailText}>{s.start_time} - {s.end_time}</Text></View>
                      </View>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12}}>
                        <Text style={{fontSize: 13, color: '#3b82f6', fontWeight: '500'}}>Available: {s.total_tokens - (s.booked_count || 0)}/{s.total_tokens}</Text>
                        <View style={styles.selectBtn}><Text style={styles.selectBtnText}>{rescheduleLoading ? 'Rescheduling...' : 'Select'}</Text></View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View>
              <View style={[styles.filterRow, isMobile && { flexDirection: 'column' }]}>
                <View style={[styles.filterCol, {flex: 1}]}>
                  <Text style={styles.label}>Patient Name/Mobile</Text>
                  <View style={styles.inputIconContainer}>
                    <Search color="#94a3b8" size={20} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.inputWithIcon]}
                      placeholder="Search patient or phone..."
                      value={rescheduleFilterPatient}
                      onChangeText={setRescheduleFilterPatient}
                    />
                  </View>
                </View>
                <View style={[styles.filterCol, {flex: 1}]}>
                  <Text style={styles.label}>Department</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="E.g. Cardiology"
                    value={rescheduleFilterDepartment}
                    onChangeText={setRescheduleFilterDepartment}
                  />
                </View>
                <View style={[styles.filterCol, {flex: 1}]}>
                  <Text style={styles.label}>Date Filter</Text>
                  {Platform.OS === 'web' ? (
                    <input 
                      type="date"
                      value={rescheduleFilterDate}
                      onChange={(e) => setRescheduleFilterDate(e.target.value)}
                      style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b' } as any}
                    />
                  ) : (
                    <>
                      <TouchableOpacity onPress={() => setRescheduleShowDatePicker(true)}>
                        <TextInput style={styles.input} value={rescheduleFilterDate} editable={false} placeholder="Select Date" />
                      </TouchableOpacity>
                      {rescheduleShowDatePicker && (
                        <DateTimePicker
                          value={rescheduleFilterDate ? new Date(rescheduleFilterDate) : new Date()}
                          mode="date"
                          display="default"
                          onChange={(event, selectedDate) => {
                            setRescheduleShowDatePicker(false);
                            if (selectedDate) setRescheduleFilterDate(selectedDate.toISOString().split('T')[0]);
                          }}
                        />
                      )}
                    </>
                  )}
                </View>
                <View style={[styles.filterCol, {minWidth: 150}]}>
                  <Text style={styles.label}>Doctor Filter</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={rescheduleFilterDoctor}
                      onValueChange={(val) => setRescheduleFilterDoctor(val)}
                      style={styles.picker}
                    >
                      <Picker.Item label="All Doctors" value="" />
                      {uniqueDoctors.map((d: any) => (
                        <Picker.Item key={d.id} label={d.name} value={d.id} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={[styles.filterCol, {minWidth: 150, justifyContent: 'flex-end'}]}>
                  <TouchableOpacity style={styles.clearBtn} onPress={() => { setRescheduleFilterDate(''); setRescheduleFilterDoctor(''); setRescheduleFilterPatient(''); setRescheduleFilterDepartment(''); }}>
                    <Text style={styles.clearBtnText}>Clear Filters</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ minWidth: isMobile ? 800 : '100%' }}>
                  <View style={styles.tableRowHeader}>
                    <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Token</Text>
                    <Text style={styles.tableCellHeader}>Patient</Text>
                    <Text style={styles.tableCellHeader}>Doctor</Text>
                    <Text style={styles.tableCellHeader}>Date/Time</Text>
                    <Text style={styles.tableCellHeader}>PR / Ref</Text>
                    <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Action</Text>
                  </View>
                  {rescheduleBookings.map((b, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>#{b.token_number}</Text>
                      <View style={styles.tableCell}>
                        <Text style={{fontWeight: '500'}}>{b.patient_name}</Text>
                        <Text style={{fontSize: 12, color: '#64748b'}}>{b.mobile}</Text>
                      </View>
                      <View style={styles.tableCell}>
                        <Text>{b.doctor_name}</Text>
                        <Text style={{fontSize: 12, color: '#64748b'}}>{b.department}</Text>
                      </View>
                      <View style={styles.tableCell}>
                        <Text>{new Date(b.date).toLocaleDateString('en-GB')}</Text>
                        <Text style={{fontSize: 12, color: '#64748b'}}>{b.start_time}</Text>
                      </View>
                      <View style={styles.tableCell}>
                        <Text>{b.pr || '-'}</Text>
                        <Text style={{fontSize: 12, color: '#64748b'}}>{b.reference || ''}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleSelectReschedule(b)} style={{flex: 0.5, alignItems: 'center'}}>
                        <Text style={{color: Colors.light.primary, fontWeight: 'bold'}}>Reschedule</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {rescheduleBookings.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No bookings found to reschedule.</Text>}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      ) : null}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 24 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#e2e8f0', padding: 4, borderRadius: 12, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: Colors.light.primary },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#334155', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  slotCard: { width: 300, backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#e2e8f0' },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  doctorName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  feeText: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
  slotDetails: { gap: 8, marginBottom: 16 },
  slotDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotDetailText: { fontSize: 14, color: '#64748b' },
  selectBtn: { backgroundColor: '#eff6ff', padding: 10, borderRadius: 8, alignItems: 'center' },
  selectBtnText: { color: Colors.light.primary, fontWeight: '600' },
  
  formCard: { backgroundColor: 'white', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  backBtn: { marginBottom: 16 },
  backBtnText: { color: Colors.light.primary, fontWeight: '600' },
  selectedSlotBanner: { backgroundColor: '#eff6ff', padding: 16, borderRadius: 12, marginBottom: 24 },
  bannerTitle: { fontSize: 12, color: '#3b82f6', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 4 },
  bannerDoctor: { fontSize: 20, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 4 },
  bannerTime: { fontSize: 14, color: '#2563eb' },
  
  formLabel: { fontSize: 14, fontWeight: '500', color: '#475569', marginBottom: 8 },
  input: { 
    backgroundColor: '#f8fafc', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    fontSize: 16, 
    color: '#1e293b', 
    marginBottom: 16,
    height: 50,
  },
  inputIconContainer: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 12, top: 15, zIndex: 1 },
  inputWithIcon: { paddingLeft: 40 },
  row: { flexDirection: 'row', marginBottom: 16 },
  
  toggleRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 8, padding: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  toggleTextActive: { color: '#0f172a', fontWeight: 'bold' },
  
  summaryBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginTop: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#64748b' },
  summaryValue: { fontSize: 14, color: '#0f172a' },
  
  confirmBtn: { backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  successCard: { backgroundColor: 'white', padding: 40, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, width: 400 },
  successIconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  tokenNumber: { fontSize: 48, fontWeight: 'bold', color: '#10b981', marginBottom: 24 },
  detailsBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, width: '100%', marginBottom: 24 },
  detailText: { fontSize: 15, color: '#334155', marginBottom: 8 },
  btn: { backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  card: { backgroundColor: 'white', padding: 24, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  exportBtn: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  exportBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  filterCol: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  pickerContainer: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' },
  picker: { padding: 10, fontSize: 14, color: '#1e293b', ...Platform.select({ web: { outlineWidth: 0 as any, border: 'none', backgroundColor: 'transparent' } }) },
  clearBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc' },
  clearBtnText: { color: '#64748b', fontWeight: 'bold' },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 16, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tableRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  tableCellHeader: { flex: 1, minWidth: 100, fontSize: 13, fontWeight: 'bold', color: '#475569' },
  tableCell: { flex: 1, minWidth: 100, fontSize: 14, color: '#334155' },
});
