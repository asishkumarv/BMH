import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { Users, Calendar, Clock, HeartPulse, CreditCard, CheckCircle, Printer } from 'lucide-react-native';
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
            setSuccessPatientId(p.patient_id || null);
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

  // My Bookings State
  const [activeTab, setActiveTab] = useState('New Booking');
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterPatient, setFilterPatient] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uniqueDoctors, setUniqueDoctors] = useState<any[]>([]);

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
          // Only show doctors from this employee's department if applicable
          if (user && user.department) {
            docs = docs.filter((d: any) => d.department === user.department);
          }
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
    };
    
    loadUserAndSlots();
  }, []);

  const handleBooking = async () => {
    if (!patientName || !mobile || !age) {
      alert('Please fill all required fields');
      return;
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
          
          <div class="row" style="margin-top: 4px;">
            <span class="label">Amount</span><span class="colon">:</span><span style="margin-left: 30px; font-weight: bold;">${printAmount}</span>
          </div>
          
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
        {['New Booking', 'My Bookings'].map(tab => (
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
          <View style={styles.grid}>
            {slots.map((s, i) => (
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
                  <View style={styles.slotDetailRow}>
                    <Calendar size={16} color="#64748b" />
                    <Text style={styles.slotDetailText}>{new Date(s.date).toLocaleDateString('en-GB')}</Text>
                  </View>
                  <View style={styles.slotDetailRow}>
                    <Clock size={16} color="#64748b" />
                    <Text style={styles.slotDetailText}>{s.start_time} - {s.end_time}</Text>
                  </View>
                  <View style={styles.slotDetailRow}>
                    <Users size={16} color="#64748b" />
                    <Text style={styles.slotDetailText}>Max Tokens: {s.total_tokens}</Text>
                  </View>
                </View>
                <View style={styles.selectBtn}>
                  <Text style={styles.selectBtnText}>Select Slot</Text>
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
          <Text style={{fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 16}}>Select Token for Dr. {selectedSlot.doctor_name}</Text>
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
              <TextInput ref={emailRef} style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter email" keyboardType="email-address" returnKeyType="done" onSubmitEditing={handleBooking} />
            </View>
          </View>
          
          <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
            <View style={{flex: 1, marginRight: isMobile ? 0 : 10, marginBottom: isMobile ? 16 : 0}}>
              <Text style={styles.formLabel}>Gender</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, gender === 'Male' && styles.toggleBtnActive]} onPress={() => setGender('Male')}>
                  <Text style={[styles.toggleText, gender === 'Male' && styles.toggleTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, gender === 'Female' && styles.toggleBtnActive]} onPress={() => setGender('Female')}>
                  <Text style={[styles.toggleText, gender === 'Female' && styles.toggleTextActive]}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.formLabel}>Payment Mode</Text>
              <View style={styles.toggleRow}>
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
      ) : (
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
              <TextInput style={[styles.input, {padding: 10}]} value={filterPatient} onChangeText={setFilterPatient} placeholder="Search patient" />
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
                <Text style={styles.tableCellHeader}>Patient</Text>
                <Text style={styles.tableCellHeader}>Doctor</Text>
                <Text style={styles.tableCellHeader}>Date/Time</Text>
                <Text style={styles.tableCellHeader}>Payment</Text>
                <Text style={styles.tableCellHeader}>Status</Text>
                <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Action</Text>
              </View>
              {myBookings.map((b, i) => (
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
                  <Text style={styles.tableCell}>{b.payment_mode}</Text>
                  <Text style={styles.tableCell}>{b.status}</Text>
                  <TouchableOpacity onPress={() => handlePrintReceipt(b)} style={{flex: 0.5, alignItems: 'center'}}><Printer color="#3b82f6" size={20}/></TouchableOpacity>
                </View>
              ))}
              {myBookings.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No bookings found.</Text>}
            </View>
          </ScrollView>
        </View>
      )}
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
