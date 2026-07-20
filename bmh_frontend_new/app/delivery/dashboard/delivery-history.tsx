import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, TextInput, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../constants/Colors';
import { Calendar, Package, MapPin, CheckCircle, Clock, Download, Printer } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

export default function DeliveryHistoryScreen() {
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState('All'); // All, manual_order, online_order, sales_order, purchase_order
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  useEffect(() => {
    const init = async () => {
      let storedUser = null;
      if (Platform.OS === 'web') {
        storedUser = JSON.parse(localStorage.getItem('employeeUser') || 'null');
      } else {
        const u = await AsyncStorage.getItem('employeeUser');
        storedUser = u ? JSON.parse(u) : null;
      }
      setUser(storedUser);
      if (storedUser) fetchHistory(storedUser.id);
    };
    init();
  }, []);

  const fetchHistory = async (userId: string | number) => {
    try {
      setLoading(true);
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/employees/${userId}/assigned-orders`);
      if (res.data && res.data.success) {
        // Only keep delivered/completed
        const completed = res.data.data.filter((o: any) => o.status?.toUpperCase() === 'DELIVERED' || o.status?.toUpperCase() === 'COMPLETED');
        setHistory(completed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    if (filterType !== 'All' && item.type !== filterType) return false;
    if (startDate || endDate) {
      if (!item.created_at) return true;
      const itemDate = new Date(item.created_at).toISOString().split('T')[0];
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
    }
    return true;
  });

  const formatDateDMY = (dateStr: string, includeTime = false) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      let formatted = `${day}-${month}-${year}`;
      if (includeTime) {
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        formatted += ` ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      }
      return formatted;
    } catch (e) {
      return dateStr;
    }
  };

  const getOrderTitle = (item: any) => {
    let title = 'Order';
    if (item.type === 'manual_order') title = 'Manual Order';
    if (item.type === 'online_order') title = 'Online Order';
    if (item.type === 'sales_order' || item.type === 'sales_invoice') title = 'Sales Order';
    if (item.type === 'purchase_order') title = 'Purchase Order';
    return title;
  };

  const formatNotes = (notesVal: any): string => {
    if (!notesVal) return '';
    try {
      if (Array.isArray(notesVal)) {
        return notesVal.map((n: any) => `${n.text || ''} (${n.author || ''})`).join('; ');
      }
      if (typeof notesVal === 'string') {
        if (notesVal.startsWith('[')) {
          const parsed = JSON.parse(notesVal);
          if (Array.isArray(parsed)) {
            return parsed.map((n: any) => `${n.text || ''} (${n.author || ''})`).join('; ');
          }
        }
        return notesVal;
      }
      if (typeof notesVal === 'object') {
        return `${notesVal.text || JSON.stringify(notesVal)} ${notesVal.author ? `(${notesVal.author})` : ''}`;
      }
      return String(notesVal);
    } catch (e) {
      return String(notesVal);
    }
  };

  const exportHistoryToCSV = async () => {
    try {
      const headers = ['Date', 'Type', 'Order/Invoice No', 'Customer Name', 'Phone', 'Address', 'Amount', 'Payment Mode', 'Method', 'Status', 'Notes'];
      const headerRows = [
        `"Bharat Medical Hall"`,
        `"Employee Name:","${user?.full_name || 'N/A'}"`,
        `"Role:","${user?.role || 'Delivery Boy'}"`,
        `"Date Range:","${startDate || 'All'} to ${endDate || 'All'}"`,
        ``,
        headers.map(h => `"${h}"`).join(',')
      ];

      const dataRows = filteredHistory.map(o => {
        const orderNo = o.order_no || o.id || '--';
        const paymentMode = o.payment_mode || '--';
        const method = o.delivery_type || '--';
        return [
          formatDateDMY(o.created_at, true),
          getOrderTitle(o),
          orderNo,
          o.patient_name || '--',
          o.mobile_no || '--',
          o.address || '--',
          `₹${o.total_amount || 0}`,
          paymentMode,
          method,
          o.status || '--',
          formatNotes(o.notes)
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
      });

      const csvContent = [...headerRows, ...dataRows].join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Delivery_History.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const path = `${(FileSystem as any).documentDirectory}Delivery_History.csv`;
        await FileSystem.writeAsStringAsync(path, csvContent, { encoding: (FileSystem as any).EncodingType.UTF8 });
        await Sharing.shareAsync(path);
      }
    } catch (e: any) {
      Alert.alert("Error", "Failed to export CSV: " + e.message);
    }
  };

  const printHistory = async () => {
    try {
      const headers = ['Date', 'Type', 'Order/Invoice No', 'Customer Name', 'Phone', 'Address', 'Amount', 'Payment Mode', 'Method', 'Status', 'Notes'];
      const tableHeadersHtml = headers.map(h => `<th>${h}</th>`).join('');
      const tableRowsHtml = filteredHistory.map(o => {
        const orderNo = o.order_no || o.id || '--';
        const paymentMode = o.payment_mode || '--';
        const method = o.delivery_type || '--';
        const cols = [
          formatDateDMY(o.created_at, true),
          getOrderTitle(o),
          orderNo,
          o.patient_name || '--',
          o.mobile_no || '--',
          o.address || '--',
          `₹${o.total_amount || 0}`,
          paymentMode,
          method,
          o.status || '--',
          formatNotes(o.notes)
        ];
        const cells = cols.map(val => `<td>${val}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #334155; }
              h1 { color: #0f172a; margin-bottom: 5px; text-align: center; font-size: 24px; }
              .meta-section { margin-top: 15px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
              .meta-row { display: flex; margin-bottom: 6px; font-size: 14px; }
              .meta-label { font-weight: bold; width: 150px; color: #475569; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
              th { background-color: #f8fafc; font-weight: bold; color: #1e293b; }
              tr:nth-child(even) { background-color: #f8fafc; }
            </style>
          </head>
          <body>
            <h1>Bharat Medical Hall</h1>
            <div class="meta-section">
              <div class="meta-row"><span class="meta-label">Report:</span><span>Delivery History Report</span></div>
              <div class="meta-row"><span class="meta-label">Employee Name:</span><span>${user?.full_name || 'N/A'}</span></div>
              <div class="meta-row"><span class="meta-label">Role:</span><span>${user?.role || 'Delivery Boy'}</span></div>
              <div class="meta-row"><span class="meta-label">Date Range:</span><span>${startDate || 'All'} to ${endDate || 'All'}</span></div>
            </div>
            <table>
              <thead>
                <tr>${tableHeadersHtml}</tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(htmlContent);
          doc.close();
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            document.body.removeChild(iframe);
          }, 500);
        }
      } else {
        await Print.printAsync({ html: htmlContent });
      }
    } catch (e: any) {
      Alert.alert("Error", "Failed to print: " + e.message);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isBus = item.delivery_type === 'Bus';
    const orderNo = item.order_no || item.id || '--';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Package size={18} color={Colors.light.primary} />
            <Text style={styles.cardTitle}>{getOrderTitle(item)} #{orderNo}</Text>
          </View>
          <Text style={[styles.statusText, {color: '#10b981'}]}>{item.status}</Text>
        </View>

        <View style={{ gap: 4 }}>
          {item.invoice_no ? <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Invoice No:</Text> {item.invoice_no}</Text> : null}
          <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Customer:</Text> {item.patient_name || '--'} {item.mobile_no ? `(${item.mobile_no})` : ''}</Text>
          <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Address:</Text> {item.address || 'No Address'}</Text>
          <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Amount:</Text> ₹{item.total_amount || '0.00'}</Text>
          {item.payment_mode ? <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Payment Mode:</Text> {item.payment_mode}</Text> : null}
          <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Method:</Text> {item.delivery_type || 'Local'}</Text>
          {item.notes ? <Text style={{ fontSize: 13, color: '#475569', fontStyle: 'italic' }}><Text style={{ fontWeight: '600', fontStyle: 'normal' }}>Notes:</Text> {formatNotes(item.notes)}</Text> : null}
          {item.type === 'purchase_order' && (
            <View style={{ marginTop: 8, padding: 8, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#8b5cf6', marginBottom: 4 }}>Items Ordered:</Text>
              {(() => {
                let items = [];
                try {
                  items = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
                } catch (e) {}
                if (!Array.isArray(items) || items.length === 0) {
                  return <Text style={{ fontSize: 11, color: '#64748B' }}>No items listed.</Text>;
                }
                return items.map((itm: any, index: number) => (
                  <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, borderBottomWidth: index < items.length - 1 ? 1 : 0, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{ fontSize: 11, color: '#1e293b', flex: 1 }} numberOfLines={1}>{itm.itemName || itm.name}</Text>
                    <Text style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>Qty: {itm.Qty || itm.quantity} | Rate: ₹{itm.rate}</Text>
                  </View>
                ));
              })()}
            </View>
          )}

          {item.type === 'purchase_order' && item.submitted_to_name && (
            <View style={{ marginTop: 6, padding: 8, backgroundColor: '#ecfdf5', borderRadius: 8, borderWidth: 1, borderColor: '#a7f3d0' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#047857' }}>Submitted To:</Text>
              <Text style={{ fontSize: 12, color: '#065f46', marginTop: 2, fontWeight: '600' }}>
                {item.submitted_to_name} ({item.submitted_to_role || ''} - {item.submitted_to_dept || ''})
              </Text>
              {item.submitted_at && (
                <Text style={{ fontSize: 10, color: '#047857', marginTop: 2 }}>
                  Submitted At: {formatDateDMY(item.submitted_at, true)}
                </Text>
              )}
            </View>
          )}
          
          {isBus && item.bus_details && (
            <View style={{ marginTop: 8, padding: 8, backgroundColor: '#EFF6FF', borderRadius: 6, borderWidth: 1, borderColor: '#DBEAFE', gap: 2 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E40AF', marginBottom: 2 }}>Bus Routing Details</Text>
              <Text style={{ fontSize: 12, color: '#1E40AF' }}><Text style={{ fontWeight: '600' }}>Bus Number:</Text> {item.bus_details.bus_number || '--'}</Text>
              <Text style={{ fontSize: 12, color: '#1E40AF' }}><Text style={{ fontWeight: '600' }}>Driver Name:</Text> {item.bus_details.driver_name || '--'}</Text>
              <Text style={{ fontSize: 12, color: '#1E40AF' }}><Text style={{ fontWeight: '600' }}>Driver Phone:</Text> {item.bus_details.driver_number || '--'}</Text>
              <Text style={{ fontSize: 12, color: '#1E40AF' }}><Text style={{ fontWeight: '600' }}>Waybill No:</Text> {item.bus_details.waybill_number || '--'}</Text>
              {item.bus_details.arrival_time && <Text style={{ fontSize: 12, color: '#1E40AF' }}><Text style={{ fontWeight: '600' }}>ETA:</Text> {item.bus_details.arrival_time}</Text>}
            </View>
          )}
        </View>

        <Text style={{color:'#64748B', fontSize: 12, marginTop: 8}}>
          {formatDateDMY(item.created_at, true)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Delivery History</Text>
      
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}}>
          {['All', 'manual_order', 'online_order', 'sales_order', 'purchase_order'].map(t => (
            <TouchableOpacity 
              key={t}
              style={[styles.filterBtn, filterType === t && styles.filterBtnActive]}
              onPress={() => setFilterType(t)}
            >
              <Text style={[styles.filterBtnText, filterType === t && styles.filterBtnTextActive]}>
                {t.replace('_', ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10}}>
          <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 5, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1'}}>
            <Calendar size={16} color="#64748B" style={{marginHorizontal: 8}} />
            <TextInput 
              placeholder="Start: YYYY-MM-DD"
              value={startDate}
              onChangeText={setStartDate}
              style={{ padding: 6, fontSize: 13, flex: 1 }}
            />
            {startDate ? (
               <TouchableOpacity onPress={() => setStartDate('')} style={{padding: 4}}>
                 <Text style={{color: 'red', fontSize: 12}}>Clear</Text>
               </TouchableOpacity>
            ) : null}
          </View>
          
          <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 5, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1'}}>
            <Calendar size={16} color="#64748B" style={{marginHorizontal: 8}} />
            <TextInput 
              placeholder="End: YYYY-MM-DD"
              value={endDate}
              onChangeText={setEndDate}
              style={{ padding: 6, fontSize: 13, flex: 1 }}
            />
            {endDate ? (
               <TouchableOpacity onPress={() => setEndDate('')} style={{padding: 4}}>
                 <Text style={{color: 'red', fontSize: 12}}>Clear</Text>
               </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity 
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.primary, padding: 10, borderRadius: 8, gap: 8 }}
            onPress={printHistory}
          >
            <Printer size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>Print Report</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', padding: 10, borderRadius: 8, gap: 8 }}
            onPress={exportHistoryToCSV}
          >
            <Download size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>Export CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredHistory}
        keyExtractor={(item, index) => item.id + '-' + index}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20, color: '#64748B'}}>No delivery history found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: 'bold', padding: 15, paddingBottom: 5, color: '#1e293b' },
  filtersContainer: { paddingHorizontal: 15, paddingBottom: 10 },
  filterBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0', marginRight: 10 },
  filterBtnActive: { backgroundColor: Colors.light.primary },
  filterBtnText: { color: '#475569', fontWeight: '600', fontSize: 12 },
  filterBtnTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#334155' },
  statusText: { fontSize: 14, fontWeight: 'bold' },
  detailText: { fontSize: 14, color: '#64748B', marginBottom: 5, marginLeft: 2 }
});
