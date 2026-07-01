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
    
    const nowStr = new Date().toLocaleString();
    const printDate = new Date(record.consultation_date).toLocaleDateString();
    
    const html = `
      <html>
        <head>
          <style>
            @page { margin: 0; size: 58mm auto; }
            body { font-family: monospace; width: 50mm; margin: 0; padding: 5px; color: #000; font-size: 11px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
            .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
            .subtitle { font-size: 10px; line-height: 1.2; }
            .token-box { text-align: center; margin: 5px 0; border: 1px dashed #000; padding: 5px; border-radius: 4px; background: #fff; color: #000; }
            .token-label { font-size: 11px; font-weight: bold; margin-bottom: 2px; }
            .token-number { font-size: 28px; font-weight: bold; line-height: 1; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
            .detail-label { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
            .footer { margin-top: 10px; text-align: center; font-size: 10px; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">BHARAT HEALTHCARE</div>
            <div class="subtitle">
              HOSPITAL ROAD, BARIPADA, MAYURBHANJ, ODISHA 757001.<br/>
              REGD NO MBJ/CE/03/2019, MOBILE NO 8093110888
            </div>
          </div>
          
          <div class="token-box">
            <div class="token-label">TOKEN NUMBER</div>
            <div class="token-number">#${record.token_number || 'N/A'}</div>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">APPT Date:</span>
            <span>${printDate} ${record.start_time || ''}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Patient:</span>
            <span>${record.name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Age/Sex, Mob:</span>
            <span>${record.age}y/${record.gender}, ${record.mobile}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Address:</span>
            <span>${record.city || 'N/A'}</span>
          </div>
          <div class="divider"></div>
          <div class="detail-row">
            <span class="detail-label">Doctor:</span>
            <span>Dr. ${record.doctor_name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Dept:</span>
            <span>${record.doctor_department}</span>
          </div>
          <div class="divider"></div>
          <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span style="font-weight:bold;">Rs. ${record.fee || 'N/A'} (${record.payment_mode || 'Cash'})</span>
          </div>
          
          <div class="footer">
            Printed: ${nowStr} (p${currentPrintCount})<br/>
            Thank you.
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
              <View style={width: 8}/>
              <View style={...styles.dateBox, marginTop: 0}>
                <Text style={styles.dateText}>{new Date(record.consultation_date).toLocaleDateString()}</Text>
              </View>
            </View>

            <View style={styles.doctorInfo}>
              <Text style={styles.doctorText}>Consulted by: Dr. {record.doctor_name} ({record.doctor_department})</Text>
            </View>

            {record.next_consultation_date && (
              <View style={styles.nextDateBox}>
                <Calendar size={16} color="#059669" />
                <Text style={styles.nextDateText}>Next Visit Scheduled: {new Date(record.next_consultation_date).toLocaleDateString()}</Text>
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
