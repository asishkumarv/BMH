import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform, Modal, ScrollView, TextInput, Alert } from 'react-native';
import axios from 'axios';
import { MapPin, User, Package, RefreshCw, X, Eye, CheckCircle, Navigation, Clock, Calendar, Download, Printer } from 'lucide-react-native';
import CustomTimePicker from '../../../components/ui/CustomTimePicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import 'leaflet/dist/leaflet.css';

let MapContainer: any, TileLayer: any, Marker: any, Popup: any, Tooltip: any, CircleMarker: any, L: any;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const RL = require('react-leaflet');
  MapContainer = RL.MapContainer;
  TileLayer = RL.TileLayer;
  Marker = RL.Marker;
  Popup = RL.Popup;
  Tooltip = RL.Tooltip;
  CircleMarker = RL.CircleMarker;
  var useMap = RL.useMap;
  L = require('leaflet');

  // Fix Leaflet's default icon path issues in React
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}


function MapBoundsFitter({ fleet }: { fleet: any[] }) {
  const map = useMap();
  useEffect(() => {
    const validMarkers = fleet.filter(b => b.location_lat && b.location_lng);
    if (validMarkers.length > 0) {
      const bounds = L.latLngBounds(validMarkers.map(m => [parseFloat(m.location_lat), parseFloat(m.location_lng)]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [fleet, map]);
  return null;
}

export default function DeliveryFleetScreen() {
  const [fleet, setFleet] = useState<any[]>([]);
  const [deptLocation, setDeptLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [ordersModalVisible, setOrdersModalVisible] = useState(false);
  const [selectedBoy, setSelectedBoy] = useState<any>(null);
  const [boyOrders, setBoyOrders] = useState<any[]>([]);
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [editShiftModalVisible, setEditShiftModalVisible] = useState(false);
  const [editShiftIn, setEditShiftIn] = useState('');
  const [editShiftOut, setEditShiftOut] = useState('');
  const [editBreakIn, setEditBreakIn] = useState('');
  const [editBreakOut, setEditBreakOut] = useState('');
  const [savingShift, setSavingShift] = useState(false);

  const fetchFleet = async () => {
    setLoading(true);
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/employees/delivery-fleet');
      if (res.data && res.data.success) {
        setFleet(res.data.data);
        if (res.data.departmentLocation) {
          setDeptLocation(res.data.departmentLocation);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleViewOrders = async (boy: any) => {
    setSelectedBoy(boy);
    setOrdersModalVisible(true);
    setLoadingOrders(true);
    setOrderStartDate('');
    setOrderEndDate('');
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/employees/${boy.id}/assigned-orders`);
      if (res.data && res.data.success) {
        setBoyOrders(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const filteredBoyOrders = boyOrders.filter(order => {
    if (orderStartDate || orderEndDate) {
      if (!order.created_at) return true;
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      if (orderStartDate && orderDate < orderStartDate) return false;
      if (orderEndDate && orderDate > orderEndDate) return false;
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

  const exportOrdersToCSV = async () => {
    try {
      const headers = ['Date', 'Type', 'Order/Invoice No', 'Customer Name', 'Phone', 'Address', 'Amount', 'Payment Mode', 'Method', 'Status', 'Notes'];
      const headerRows = [
        `"Bharat Medical Hall"`,
        `"Delivery Boy Name:","${selectedBoy?.full_name || 'N/A'}"`,
        `"Phone:","${selectedBoy?.phone || 'N/A'}"`,
        `"Date Range:","${orderStartDate || 'All'} to ${orderEndDate || 'All'}"`,
        ``,
        headers.map(h => `"${h}"`).join(',')
      ];

      const dataRows = filteredBoyOrders.map(o => {
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
        link.setAttribute('download', `${selectedBoy?.full_name || 'Rider'}_Delivery_Orders.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const filename = `${(selectedBoy?.full_name || 'Rider').replace(/\s+/g, '_')}_Delivery_Orders`;
        const path = `${(FileSystem as any).documentDirectory}${filename}.csv`;
        await FileSystem.writeAsStringAsync(path, csvContent, { encoding: (FileSystem as any).EncodingType.UTF8 });
        await Sharing.shareAsync(path);
      }
    } catch (e: any) {
      Alert.alert("Error", "Failed to export CSV: " + e.message);
    }
  };

  const printOrders = async () => {
    try {
      const headers = ['Date', 'Type', 'Order/Invoice No', 'Customer Name', 'Phone', 'Address', 'Amount', 'Payment Mode', 'Method', 'Status', 'Notes'];
      const tableHeadersHtml = headers.map(h => `<th>${h}</th>`).join('');
      const tableRowsHtml = filteredBoyOrders.map(o => {
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
              <div class="meta-row"><span class="meta-label">Report:</span><span>Assigned Orders Report</span></div>
              <div class="meta-row"><span class="meta-label">Delivery Boy:</span><span>${selectedBoy?.full_name || 'N/A'}</span></div>
              <div class="meta-row"><span class="meta-label">Phone:</span><span>${selectedBoy?.phone || 'N/A'}</span></div>
              <div class="meta-row"><span class="meta-label">Date Range:</span><span>${orderStartDate || 'All'} to ${orderEndDate || 'All'}</span></div>
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

  const renderBoy = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <User size={24} color="#3B82F6" />
        <View style={styles.headerTextContainer}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        <TouchableOpacity style={styles.viewOrdersBtn} onPress={() => handleViewOrders(item)}>
          <Text style={styles.viewOrdersText}>View Orders</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statSection}>
          <Text style={styles.sectionHeader}>Today</Text>
          <View style={styles.statRow}>
            <View style={styles.statBoxMini}>
              <Text style={styles.statValueMini}>{item.today_assigned_count || item.assigned_today_count || 0}</Text>
              <Text style={styles.statLabelMini}>Assigned</Text>
            </View>
            <View style={styles.statBoxMini}>
              <Text style={[styles.statValueMini, {color:'#10B981'}]}>{item.today_delivered_count || item.delivered_today_count || 0}</Text>
              <Text style={styles.statLabelMini}>Delivered</Text>
            </View>
          </View>
        </View>

        <View style={styles.statSection}>
          <Text style={styles.sectionHeader}>Overall</Text>
          <View style={styles.statRow}>
            <View style={styles.statBoxMini}>
              <Text style={styles.statValueMini}>{item.total_assigned_count || 0}</Text>
              <Text style={styles.statLabelMini}>Assigned</Text>
            </View>
            <View style={styles.statBoxMini}>
              <Text style={[styles.statValueMini, {color:'#F59E0B'}]}>{item.total_pending_count || item.pending_orders_count || 0}</Text>
              <Text style={styles.statLabelMini}>Pending</Text>
            </View>
            <View style={styles.statBoxMini}>
              <Text style={[styles.statValueMini, {color:'#10B981'}]}>{item.total_delivered_count || 0}</Text>
              <Text style={styles.statLabelMini}>Delivered</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        {item.location_lat ? (
          <View>
            <View style={styles.locationRow}>
              <MapPin size={16} color="#475569" style={{marginRight: 6}} />
              <Text style={styles.locationText}>Last seen: {new Date(item.updated_at).toLocaleTimeString()}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noLocation}>No location data recorded yet</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery Fleet Tracking</Text>
        <View style={{flexDirection:'row', gap: 10}}>
          {Platform.OS === 'web' && (
            <TouchableOpacity style={[styles.refreshBtn, {backgroundColor:'#4F46E5'}]} onPress={() => setMapModalVisible(true)}>
              <MapPin size={16} color="#fff" style={{marginRight: 8}} />
              <Text style={[styles.refreshBtnText, {color:'#fff'}]}>View Map</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchFleet}>
            <RefreshCw size={16} color="#3B82F6" style={{marginRight: 8}} />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
      ) : fleet.length === 0 ? (
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No active delivery boys found in the fleet.</Text>
        </View>
      ) : (
        <FlatList
          data={fleet}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBoy}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Map Modal */}
      {Platform.OS === 'web' && mapModalVisible && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, {width: '90%', height: '90%'}]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Live Fleet Map</Text>
                <TouchableOpacity onPress={() => setMapModalVisible(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <View style={{flex: 1, backgroundColor:'#E2E8F0', overflow: 'hidden', borderRadius: 8}}>
                  <MapContainer center={deptLocation ? [deptLocation.latitude, deptLocation.longitude] : [21.9608, 86.7423]} zoom={13} style={{ height: '100%', width: '100%' }}>
                     <TileLayer
                       attribution='&copy; OpenStreetMap contributors'
                       url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                     />
                     <MapBoundsFitter fleet={fleet.filter((b: any) => b.is_active)} />
                     
                     {/* Department Ideal Location (Blue Dot) */}
                     {deptLocation && deptLocation.latitude && deptLocation.longitude && (
                       <CircleMarker 
                         center={[deptLocation.latitude, deptLocation.longitude]} 
                         radius={10} 
                         pathOptions={{ color: '#2563EB', fillColor: '#3B82F6', fillOpacity: 0.85, weight: 3 }}
                       >
                         <Tooltip permanent direction="top" offset={[0, -12]}>
                           <span style={{ fontWeight: 'bold', fontSize: '11px', color: '#1e293b' }}>
                             Delivery Department Store
                           </span>
                         </Tooltip>
                       </CircleMarker>
                     )}

                     {fleet.filter((b: any) => b.is_active).map((boy: any) => boy.location_lat ? (
                       <Marker key={boy.id} position={[parseFloat(boy.location_lat), parseFloat(boy.location_lng)]}>
                         <Tooltip permanent direction="top" offset={[0, -20]}>
                           <span style={{ fontWeight: '600', fontSize: '11px', color: '#1e293b' }}>
                             {boy.full_name}
                           </span>
                         </Tooltip>
                         <Popup>
                           <Text style={{fontWeight:'bold'}}>{boy.full_name}</Text>
                           <br />
                           <Text>{boy.phone}</Text>
                           <br />
                           <Text>{boy.pending_orders_count} pending orders</Text>
                         </Popup>
                       </Marker>
                     ) : null)}
                   </MapContainer>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Orders Modal */}
      {ordersModalVisible && selectedBoy && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, {width: '90%', maxWidth: 600, maxHeight: '90%'}]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedBoy.full_name}'s Orders</Text>
                <TouchableOpacity onPress={() => setOrdersModalVisible(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Date Filter & Export Panel */}
              <View style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC', gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 5, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' }}>
                    <Calendar size={14} color="#64748B" style={{ marginHorizontal: 6 }} />
                    <TextInput 
                      placeholder="Start: YYYY-MM-DD"
                      value={orderStartDate}
                      onChangeText={setOrderStartDate}
                      style={{ padding: 4, fontSize: 12, flex: 1 }}
                    />
                    {orderStartDate ? (
                      <TouchableOpacity onPress={() => setOrderStartDate('')}>
                        <Text style={{ color: 'red', fontSize: 12, marginRight: 4 }}>X</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 5, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' }}>
                    <Calendar size={14} color="#64748B" style={{ marginHorizontal: 6 }} />
                    <TextInput 
                      placeholder="End: YYYY-MM-DD"
                      value={orderEndDate}
                      onChangeText={setOrderEndDate}
                      style={{ padding: 4, fontSize: 12, flex: 1 }}
                    />
                    {orderEndDate ? (
                      <TouchableOpacity onPress={() => setOrderEndDate('')}>
                        <Text style={{ color: 'red', fontSize: 12, marginRight: 4 }}>X</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity 
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', padding: 8, borderRadius: 6, gap: 6 }}
                    onPress={printOrders}
                  >
                    <Printer size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>Print Report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', padding: 8, borderRadius: 6, gap: 6 }}
                    onPress={exportOrdersToCSV}
                  >
                    <Download size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>Export CSV</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={{padding: 15}}>
                {loadingOrders ? (
                  <ActivityIndicator size="large" color="#3B82F6" style={{ margin: 20 }} />
                ) : filteredBoyOrders.length === 0 ? (
                  <Text style={{textAlign:'center', color:'#64748B', margin: 20}}>No orders found matching filters.</Text>
                ) : (
                  filteredBoyOrders.map((order, index) => {
                    const orderNo = order.order_no || order.id || '--';
                    const isBus = order.delivery_type === 'Bus';
                    
                    return (
                      <View key={index} style={styles.orderCard}>
                        <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 8}}>
                          <Text style={{fontWeight:'bold', fontSize: 15, color: '#1E293B'}}>
                            {getOrderTitle(order)} #{orderNo}
                          </Text>
                          <Text style={{fontWeight:'bold', color: order.status === 'Delivered' ? '#10B981' : '#F59E0B'}}>
                            {order.status}
                          </Text>
                        </View>
                        
                        <View style={{ gap: 4 }}>
                          {order.invoice_no ? <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Invoice No:</Text> {order.invoice_no}</Text> : null}
                          <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Customer:</Text> {order.patient_name || '--'} {order.mobile_no ? `(${order.mobile_no})` : ''}</Text>
                          <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Address:</Text> {order.address || 'No Address'}</Text>
                          <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Amount:</Text> ₹{order.total_amount || '0.00'}</Text>
                          {order.payment_mode ? <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Payment Mode:</Text> {order.payment_mode}</Text> : null}
                          <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Method:</Text> {order.delivery_type || 'Local'}</Text>
                          {order.notes ? <Text style={{ fontSize: 13, color: '#475569', fontStyle: 'italic' }}><Text style={{ fontWeight: '600', fontStyle: 'normal' }}>Notes:</Text> {formatNotes(order.notes)}</Text> : null}
                          
                          {isBus && order.bus_details && (
                            <View style={{ marginTop: 8, padding: 8, backgroundColor: '#EFF6FF', borderRadius: 6, borderWidth: 1, borderColor: '#DBEAFE', gap: 2 }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E40AF', marginBottom: 2 }}>Bus Routing Details</Text>
                              <Text style={{ fontSize: 12, color: '#1E40AF' }}><Text style={{ fontWeight: '600' }}>Bus Number:</Text> {order.bus_details.bus_number || '--'}</Text>
                              <Text style={{ fontSize: 12, color: '#1E40AF' }}><Text style={{ fontWeight: '600' }}>Driver Name:</Text> {order.bus_details.driver_name || '--'}</Text>
                              <Text style={{ fontSize: 12, color: '#1E40AF' }}><Text style={{ fontWeight: '600' }}>Driver Phone:</Text> {order.bus_details.driver_number || '--'}</Text>
                              <Text style={{ fontSize: 12, color: '#1E40AF' }}><Text style={{ fontWeight: '600' }}>Waybill No:</Text> {order.bus_details.waybill_number || '--'}</Text>
                              {order.bus_details.arrival_time && <Text style={{ fontSize: 12, color: '#1E40AF' }}><Text style={{ fontWeight: '600' }}>ETA:</Text> {order.bus_details.arrival_time}</Text>}
                            </View>
                          )}
                        </View>
                        
                        <Text style={{color:'#64748B', fontSize: 12, marginTop: 8}}>
                          {formatDateDMY(order.created_at, true)}
                        </Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  refreshBtn: { flexDirection: 'row', backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  refreshBtnText: { color: '#3B82F6', fontWeight: 'bold' },
  listContainer: { padding: 20, gap: 16 },
  noData: { alignItems: 'center', marginTop: 100 },
  noDataText: { color: '#64748B', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerTextContainer: { flex: 1, marginLeft: 12 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  phone: { fontSize: 14, color: '#64748B', marginTop: 2 },
  viewOrdersBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  viewOrdersText: { color: '#4F46E5', fontWeight: '600', fontSize: 12 },
  statsGrid: { flexDirection: 'column', gap: 10, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  statSection: { gap: 4 },
  sectionHeader: { fontSize: 10, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  statRow: { flexDirection: 'row', gap: 8 },
  statBoxMini: { flex: 1, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  statValueMini: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  statLabelMini: { fontSize: 10, color: '#64748B', marginTop: 1 },
  cardBody: { paddingTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 14, color: '#475569' },
  noLocation: { color: '#94A3B8', fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  orderCard: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' }
});
