import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { Search, Filter, Calendar, Printer } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';

export default function PatientHistoryEmployee() {
  const { isMobile } = useResponsive();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  
  const handlePrintReceipt = async (record: any) => {
    let currentPrintCount = 1;
    const bookingId = record.booking_id;
    if (bookingId) {
      try {
        const res = await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/${bookingId}/print-count`);
        if (res.data.success) {
           currentPrintCount = res.data.print_count;
           record.print_count = currentPrintCount;
        }
      } catch(e) { console.error('Failed to update print count'); }
    }
    
    const nowStr = new Date().toLocaleDateString('en-GB');
    const printDate = new Date(record.consultation_date).toLocaleDateString('en-GB');
    
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
              HOSPITAL ROAD , BARIPADA, MAYURBHANJ, ODISHA, PIN NO : 757001<br/>
              REGD. NO : MBJ/CE/03/2019, MOBILE NO : 8093110888
            </div>
          </div>
          <div class="dotted-line"></div>
          <div class="ticket-title">TEMPORARY APPOINTMENT TICKET</div>
          
          <div style="display: flex; align-items: center; justify-content: flex-start; margin-bottom: 8px; font-size: 11px;">
            <div style="display: flex; align-items: center; margin-right: 15px;">Slno : <span class="box">${printToken}</span></div>
            <div>Appt date : ${printDate}</div>
          </div>
          
          <div class="row">
            <span class="label">Name</span><span class="colon">:</span><span style="text-transform: uppercase;">${printPatient}</span>
          </div>
          
          <div class="row-spaced">
            <div>
              <span class="label">Age / Sex</span><span class="colon">:</span><span style="text-transform: uppercase;">${printAge} Yrs / ${printGender}</span>
            </div>
            <div>
              <span>MobNo : ${printMobile}</span>
            </div>
          </div>
          
          <div class="row">
            <span class="label">Address</span><span class="colon">:</span><span style="text-transform: uppercase;">${printCity || ''}</span>
          </div>
          
          <div style="border-bottom: 1px solid #000; margin: 6px 0; width: 35px;"></div>
          
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

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('role', 'Employee');
      
      if (name) params.append('name', name);
      if (email) params.append('email', email);
      if (phone) params.append('phone', phone);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/doctors/patient-history?${params.toString()}`);
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching patient history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Patient Directory & Appointments</Text>
      
      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}><Filter size={18} color={Colors.light.text} /> Filter Records</Text>
        <View style={styles.filterGrid}>
          <TextInput style={styles.input} placeholder="Patient Name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} />
          <TextInput style={styles.input} placeholder="Start Date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
          <TextInput style={styles.input} placeholder="End Date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={fetchHistory}>
          <Search size={18} color="white" />
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : history.length === 0 ? (
        <Text style={styles.emptyText}>No records found matching your filters.</Text>
      ) : (
        history.map((record, index) => (
          <View key={index} style={styles.recordCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.patientName}>{record.name}</Text>
                <Text style={styles.patientInfo}>Age: {record.age} | Gender: {record.gender} | Phone: {record.mobile}</Text>
              </View>
              <TouchableOpacity onPress={() => handlePrintReceipt(record)} style={{backgroundColor: '#e0f2fe', padding: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4}}>
                <Printer size={16} color="#0284c7" />
                <Text style={{color: '#0284c7', fontSize: 12, fontWeight: '600'}}>Print Token</Text>
              </TouchableOpacity>
              <View style={{width: 8}}/>
              <View style={[styles.dateBox, {marginTop: 0}]}>
                <Text style={styles.dateText}>{new Date(record.consultation_date).toLocaleDateString('en-GB')}</Text>
              </View>
            </View>

            <View style={styles.doctorInfo}>
              <Text style={styles.doctorText}>Consulted by: Dr. {record.doctor_name} ({record.doctor_department})</Text>
            </View>

            {record.next_consultation_date && (
              <View style={styles.nextDateBox}>
                <Calendar size={16} color="#059669" />
                <Text style={styles.nextDateText}>Next Visit Scheduled: {new Date(record.next_consultation_date).toLocaleDateString('en-GB')}</Text>
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
  filterCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: Colors.light.border },
  filterTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  input: { flex: 1, minWidth: 200, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12 },
  searchBtn: { backgroundColor: Colors.light.primary, padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  searchBtnText: { color: 'white', fontWeight: '600', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 40, fontSize: 16 },
  recordCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  patientName: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  patientInfo: { fontSize: 14, color: '#64748b', marginTop: 4, flexWrap: 'wrap' },
  dateBox: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  dateText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  doctorInfo: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, marginBottom: 16 },
  doctorText: { color: '#1d4ed8', fontWeight: '500' },
  nextDateBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ecfdf5', padding: 12, borderRadius: 8 },
  nextDateText: { color: '#059669', fontWeight: '600' }
});
