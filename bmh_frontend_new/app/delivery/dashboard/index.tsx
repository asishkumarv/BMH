import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Linking, Alert, Modal, TextInput, ScrollView, Animated, RefreshControl } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { MapPin, Phone, User, CheckCircle, Clock, Package, Navigation, Camera as CameraIcon, Sun, Moon, Coffee, FileText } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors } from '../../../constants/Colors';

const formatDateTime = (dateStr: string, timeStr?: string) => {
  if (!dateStr) return 'N/A';
  
  let dateObj: Date;
  if (dateStr.includes('T') && !timeStr) {
    // It's a full ISO string
    dateObj = new Date(dateStr);
  } else if (dateStr && timeStr) {
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const cleanTime = timeStr.includes(':') && timeStr.split(':').length === 2 ? timeStr + ':00' : timeStr;
    dateObj = new Date(`${cleanDate}T${cleanTime}`);
  } else {
    // Just a date string YYYY-MM-DD
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDate.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  if (isNaN(dateObj.getTime())) {
    return dateStr;
  }

  // Format Date: DD-MM-YYYY
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const formattedDate = `${day}-${month}-${year}`;

  // Format Time: hh:mm am/pm
  let hour = dateObj.getHours();
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  const ampm = hour >= 12 ? 'pm' : 'am';
  hour = hour % 12;
  hour = hour ? hour : 12; // the hour '0' should be '12'
  const formattedTime = `${String(hour).padStart(2, '0')}:${min} ${ampm}`;

  return `${formattedTime} ${formattedDate}`;
};

const formatTime12h = (timeStr: string) => {
  if (!timeStr) return '';
  
  // If it's a full ISO string
  if (timeStr.includes('T')) {
    const dateObj = new Date(timeStr);
    if (isNaN(dateObj.getTime())) return timeStr;
    let hour = dateObj.getHours();
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${String(hour).padStart(2, '0')}:${min} ${ampm}`;
  }

  // If it's a standard HH:MM:SS or HH:MM string
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr; // fallback
  
  let hour = parseInt(parts[0], 10);
  const min = parts[1];
  if (isNaN(hour)) return timeStr;

  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${String(hour).padStart(2, '0')}:${min} ${ampm}`;
};

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [locationStatus, setLocationStatus] = useState('Initializing...');
  const [busModalVisible, setBusModalVisible] = useState(false);
  const [selectedBusOrder, setSelectedBusOrder] = useState<any>(null);
  const [busDetails, setBusDetails] = useState({
    bus_number: '', bus_date: '', arrival_time: '', driver_name: '', driver_number: '', waybill_number: '', drop_location: ''
  });
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentTxnId, setPaymentTxnId] = useState('');
  const [paymentImage, setPaymentImage] = useState<any>(null);
  const [currentOrder, setCurrentOrder] = useState({ id: '', type: '', amount: '', payment_mode: '' });
  const [alarmSound, setAlarmSound] = useState<Audio.Sound | null>(null);

  // Update Modal State
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateActionType, setUpdateActionType] = useState('menu'); // 'menu' | 'note' | 'cancel'
  const [updateNote, setUpdateNote] = useState('');
  const [cancelOtp, setCancelOtp] = useState('');
  const [updateOrder, setUpdateOrder] = useState<any>(null);

  // New State
  const [filterState, setFilterState] = useState('All');
  const [summary, setSummary] = useState<any>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [actionType, setActionType] = useState('');
  const [cameraMessage, setCameraMessage] = useState({ text: '', type: '' });
  const [loadingAction, setLoadingAction] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [refreshing, setRefreshing] = useState(false);
  const ordersRef = useRef<any[]>([]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await Promise.all([
        fetchOrders(user.id),
        fetchSummary(user.id)
      ]);
    }
    setRefreshing(false);
  };
  
  const fetchSummary = async (empId: number) => {
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/attendance/employee-dashboard/${empId}`);
      if (res.data.success) setSummary(res.data.data);
    } catch (error) {}
  };
  
  const handleAction = async (type: string) => {
    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') return Alert.alert('Camera permission required.');
    }
    let { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus !== 'granted') return Alert.alert('Location permission required.');
    
    setActionType(type);
    setCameraMessage({ text: '', type: '' });
    setCameraVisible(true);
  };
  
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setLoadingAction(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      const location = await Location.getCurrentPositionAsync({});

      // Verify Location first
      const locRes = await axios.post('https://napi.bharatmedicalhallplus.com/attendance/verify-location', {
        employeeId: user.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      const isLocationVerified = locRes.data.success && locRes.data.locationVerified;
      
      if (!isLocationVerified && (actionType === 'login' || actionType === 'logout')) {
         setCameraMessage({ text: locRes.data.message || "Outside allowed area.", type: 'error' });
         setLoadingAction(false);
         return;
      }

      const payload: any = {
        base64Image: photo.base64,
        employeeId: user.id,
        locationVerified: isLocationVerified
      };

      if (actionType === 'login' || actionType === 'logout') {
        payload.action = actionType;
        const res = await axios.post('https://napi.bharatmedicalhallplus.com/attendance/verify-face', payload);
        if (res.data.success) {
          setCameraMessage({ text: res.data.message, type: 'success' });
          setTimeout(() => setCameraVisible(false), 2000);
        } else {
          setCameraMessage({ text: res.data.message, type: 'error' });
        }
      } else {
        payload.breakType = actionType === 'break_in' ? 'Break In' : 'Break Out';
        const breakRes = await axios.post('https://napi.bharatmedicalhallplus.com/attendance/break', payload);
        if (breakRes.data.success) {
           setCameraMessage({ text: breakRes.data.message, type: 'success' });
           setTimeout(() => setCameraVisible(false), 2000);
        } else {
           setCameraMessage({ text: breakRes.data.message, type: 'error' });
        }
      }
      fetchSummary(user.id);
    } catch (error: any) {
      setCameraMessage({ text: error.response?.data?.message || "Something went wrong.", type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (user) {
      interval = setInterval(() => {
        fetchOrders(user.id);
      }, 5000); // Check every 5 seconds
    }
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const init = async () => {
      try {
        let storedUser;
        if (Platform.OS === 'web') {
          storedUser = JSON.parse(localStorage.getItem('employeeUser') || 'null');
        } else {
          const u = await AsyncStorage.getItem('employeeUser');
          storedUser = u ? JSON.parse(u) : null;
        }
        setUser(storedUser);
        if (storedUser) {
          fetchOrders(storedUser.id);
          fetchSummary(storedUser.id);
          startLocationTracking(storedUser.id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  const fetchOrders = async (userId: string | number) => {
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/employees/${userId}/assigned-orders`);
      if (res.data && res.data.success) {
        // If we have more orders now than before, it means a new order was assigned
        if (ordersRef.current.length > 0 && res.data.data.length > ordersRef.current.length) {
           try {
             const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
                { isLooping: true, shouldPlay: true }
             );
             setAlarmSound(sound);
             alert("🔔 New Delivery Assigned!");
           } catch (e) { console.log("Audio play failed:", e); }
        }
        setOrders(res.data.data);
          if (Platform.OS !== 'web') {
            try {
              await Notifications.cancelAllScheduledNotificationsAsync();
              res.data.data.forEach((order: any) => {
                const isScheduled = order.is_scheduled && order.scheduled_date && order.scheduled_time;
                const isBus = (order.delivery_type === 'Bus' || order.mode_of_delivery === 'Bus') && (order.bus_date || order.scheduled_date) && order.scheduled_time;
                
                if ((isScheduled || isBus) && order.status !== 'Delivered' && order.status !== 'Completed' && order.status !== 'Cancelled') {
                  const dateStr = (order.bus_date || order.scheduled_date).split('T')[0];
                  const timeStr = order.scheduled_time;
                  // Construct date string and parse
                  const scheduledDateTime = new Date(`${dateStr}T${timeStr.includes(':') && timeStr.split(':').length === 2 ? timeStr + ':00' : timeStr}`);
                  const alarmTime = new Date(scheduledDateTime.getTime() - 15 * 60000); // 15 mins prior
                  
                  if (alarmTime > new Date()) {
                    Notifications.scheduleNotificationAsync({
                      content: {
                        title: isBus ? 'Bus Delivery Alert' : 'Scheduled Delivery Alert',
                        body: isBus 
                          ? `Bus delivery scheduled at ${order.scheduled_time}! (Order #${order.id})`
                          : `You have a scheduled delivery for ${order.patient_name} at ${order.scheduled_time}! (Order #${order.id})`,
                        sound: true,
                      },
                      trigger: {
                        seconds: Math.max(1, Math.floor((alarmTime.getTime() - Date.now()) / 1000)),
                        channelId: 'alarm-channel-v2'
                      } as any,
                    });
                  }
                }
              });
            } catch (e) {
              console.log("Error scheduling notifications:", e);
            }
          }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async (userId: string | number) => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationStatus('Permission denied');
      return;
    }

    setLocationStatus('Tracking Active');

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,
        distanceInterval: 10,
      },
      async (location) => {
        try {
          await axios.put(`https://napi.bharatmedicalhallplus.com/employees/${userId}/location`, {
            lat: location.coords.latitude,
            lng: location.coords.longitude
          });
        } catch (err) {
          console.log("Failed to update location to server");
        }
      }
    );
  };

  const handleMarkDelivered = async (orderId: string | number, type: string, deliveryType: string, amount: string = '', paymentMode: string = '') => {
    if ((type === 'online_order' || type === 'sales_order' || type === 'manual_order') && (deliveryType === 'Local' || deliveryType === 'Schedule Delivery')) {
      setCurrentOrder({ id: String(orderId), type, amount: String(amount), payment_mode: paymentMode });
      setDeliveryOtp('');
      setPaymentMode('Cash');
      setPaidAmount(String(amount));
      setPaymentTxnId('');
      setPaymentImage(null);
      setOtpModalVisible(true);
      return;
    }

    if (Platform.OS !== 'web') {
      Alert.alert(
        "Confirm Delivery",
        "Are you sure you want to mark this as Delivered?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes", onPress: () => processDelivery(orderId, type) }
        ]
      );
    } else {
      if (window.confirm("Are you sure you want to mark this as Delivered?")) {
        processDelivery(orderId, type);
      }
    }
  };
  const handleUpdateStatus = async (orderId: string | number, type: string, newStatus: string) => {
    try {
      if (type === 'manual_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/manual-orders/${orderId}`, {
          status: newStatus
        });
        if (user) fetchOrders(user.id);
      } else {
        alert("Status updates not yet supported for this order type.");
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const openUpdateModal = (order: any) => {
    setUpdateOrder(order);
    setUpdateActionType('menu');
    setUpdateNote('');
    setCancelOtp('');
    setUpdateModalVisible(true);
  };

  const submitUpdateNote = async () => {
    try {
      await axios.patch(`https://napi.bharatmedicalhallplus.com/delivery-boy/update-notes`, {
        id: updateOrder.id,
        type: updateOrder.type,
        note: updateNote
      });
      alert('Note added successfully');
      setUpdateModalVisible(false);
      if (user) fetchOrders(user.id);
    } catch(err) { alert('Failed to add note'); }
  };

  const submitCancel = async () => {
    try {
      if (updateOrder.type === 'manual_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/manual-orders/${updateOrder.id}`, {
          status: 'Cancelled',
          delivery_otp: cancelOtp
        });
        alert('Order Cancelled');
      } else {
        alert('Cancellation not supported for this type yet');
      }
      setUpdateModalVisible(false);
      if (user) fetchOrders(user.id);
    } catch(err: any) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  const submitNoShow = async () => {
    try {
      if (updateOrder.type === 'manual_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/manual-orders/${updateOrder.id}`, {
          status: 'Customer Not Available'
        });
        alert('Order marked as Customer Not Available');
      } else {
         alert('No Show not supported for this type yet');
      }
      setUpdateModalVisible(false);
      if (user) fetchOrders(user.id);
    } catch(err) {
      alert('Failed to update status');
    }
  };

  const processDelivery = async (orderId: string | number, type: string, otp?: string) => {
    try {
      if (type === 'online_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/online-orders/${orderId}/status`, {
            status: 'DELIVERED',
            delivery_otp: otp,
            pod_payment_mode: currentOrder.payment_mode === 'POD' ? paymentMode : null
          });
      } else if (type === 'sales_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/sales-order/${orderId}/status`, {
          status: 'DELIVERED',
          delivery_otp: otp
        });
      } else if (type === 'manual_order') {
        const payload: any = {
          status: 'Delivered',
          delivery_otp: otp,
            pod_payment_mode: currentOrder.payment_mode === 'POD' ? paymentMode : null,
            paid_amount: paidAmount,
            payment_txn_id: paymentTxnId
        };
        // For image upload, if we want to use form data we should implement it, but for now we send raw json without image since it's complex via put in this generic function.
        await axios.put(`https://napi.bharatmedicalhallplus.com/manual-orders/${orderId}`, payload);
      } else {
        alert('Ecogreen Order Delivered (Status update pending backend implementation)');
      }
      alert('Order Marked as Delivered!');
      setOtpModalVisible(false);
      if (user) fetchOrders(user.id);
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenBusDetails = (order: any) => {
    setSelectedBusOrder(order);
    if (order.bus_details) {
      let parsed = order.bus_details;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch(e) {}
      }
      const formattedDetails = parsed ? {
        ...parsed,
        arrival_time: parsed.arrival_time ? formatTime12h(parsed.arrival_time) : ''
      } : { bus_number: '', bus_date: '', arrival_time: '', driver_name: '', driver_number: '', waybill_number: '', drop_location: '' };

      setBusDetails(formattedDetails);
    } else {
      setBusDetails({ bus_number: '', bus_date: '', arrival_time: '', driver_name: '', driver_number: '', waybill_number: '', drop_location: '' });
    }
    setBusModalVisible(true);
  };

  const handleSaveBusDetails = async () => {
    if (!selectedBusOrder) return;
    try {
      let url = '';
      let payload: any = { bus_details: busDetails };

      if (selectedBusOrder.type === 'manual_order') {
        url = `https://napi.bharatmedicalhallplus.com/manual-orders/${selectedBusOrder.id}`;
        payload = {
          bus_number: busDetails.bus_number,
            bus_date: busDetails.bus_date,
          bus_driver_name: busDetails.driver_name,
          bus_driver_number: busDetails.driver_number,
          est_reach_time: busDetails.arrival_time,
          bus_travels_name: busDetails.waybill_number
        };
      } else if (selectedBusOrder.type === 'sales_order') {
        url = `https://napi.bharatmedicalhallplus.com/sales-order/${selectedBusOrder.id}/update-bus-details`;
      } else if (selectedBusOrder.type === 'sales_invoice' || selectedBusOrder.type === 'ecogreen_invoice') {
        url = `https://napi.bharatmedicalhallplus.com/sales-invoice-list/${selectedBusOrder.id}/update-bus-details`;
      } else {
        alert("Cannot update bus details for this order type");
        return;
      }
      
      const res = await axios.put(url, payload);
      if (res.data) {
        alert("Bus Details Saved!");
        setBusModalVisible(false);
        if (user) fetchOrders(user.id);
      }
    } catch (err: any) {
      alert("Failed to save bus details: " + err.message);
    }
  };

  const openMap = (lat: any, lng: any, address: string, locationLink?: string) => {
    let url = '';
    
    if (locationLink && (locationLink.startsWith('http://') || locationLink.startsWith('https://'))) {
      url = locationLink;
    } else if (address && (address.startsWith('http://') || address.startsWith('https://'))) {
      url = address;
    } else if (lat && lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else if (address) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    } else {
      alert('No location data available');
      return;
    }

    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => alert('Could not open maps'));
    }
  };

  const stopAlarm = async () => {
    if (alarmSound) {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
      setAlarmSound(null);
    }
  };

  const renderOrder = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
          <View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Text style={styles.orderTypeBadge}>
                {item.type === 'online_order' ? 'Online App Order' : item.type === 'sales_order' ? 'Ecogreen Sales Order' : item.type === 'purchase_order' ? 'Ecogreen Purchase Order' : 'Ecogreen Invoice'}
              </Text>
              
                {item.delivery_type === 'Bus' && (
                  <View style={[styles.orderTypeBadge, {backgroundColor: '#FEF3C7'}]}>
                    <Text style={{fontSize: 10, fontWeight: 'bold', color: '#B45309'}}>BUS DELIVERY</Text>
                  </View>
                )}
                {item.is_scheduled && (
                  <View style={[styles.orderTypeBadge, {backgroundColor: '#E0E7FF'}]}>
                    <Text style={{fontSize: 10, fontWeight: 'bold', color: '#4338CA'}}>SCHEDULED</Text>
                  </View>
                )}
            </View>
            <Text style={styles.orderId}>Order #{item.id}</Text>
          </View>
        <View style={[styles.statusBadge, item.status === 'DELIVERED' ? styles.statusDelivered : styles.statusPending]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <User size={16} color="#64748B" style={styles.icon} />
            <Text style={styles.infoText}>{item.patient_name} {item.mobile_no ? `(${item.mobile_no})` : ''}</Text>
          </View>
          {item.mobile_no && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.mobile_no}`)} style={{ padding: 6, backgroundColor: '#e0e7ff', borderRadius: 20 }}>
              <Phone size={14} color="#4338ca" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.infoRow}>
          <MapPin size={16} color="#64748B" style={styles.icon} />
          <Text style={styles.infoText} numberOfLines={2}>{item.address || 'No Address Provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Clock size={16} color="#64748B" style={styles.icon} />
          <Text style={styles.infoText}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        
        {item.is_scheduled && (
          <View style={styles.infoRow}>
            <Clock size={16} color="#4338CA" style={styles.icon} />
            <Text style={[styles.infoText, {color: '#4338CA', fontWeight: 'bold'}]}>
              Scheduled: {formatDateTime(item.scheduled_date, item.scheduled_time)}
            </Text>
          </View>
        )}

        {(item.delivery_type === 'Bus' || item.mode_of_delivery === 'Bus' || (item.type === 'manual_order' && item.bus_number)) && (
          <View style={styles.infoRow}>
            <Clock size={16} color="#D97706" style={styles.icon} />
            <Text style={[styles.infoText, {color: '#D97706', fontWeight: 'bold'}]}>
              Bus Arrival: {
                item.bus_details 
                  ? formatDateTime(typeof item.bus_details === 'string' ? (JSON.parse(item.bus_details).arrival_time || '') : (item.bus_details.arrival_time || '')) 
                  : (item.bus_date ? formatDateTime(item.bus_date, item.est_reach_time || item.scheduled_time) : 'N/A')
              }
            </Text>
          </View>
        )}
        <Text style={styles.totalText}>Total: ₹{parseFloat(item.total_amount || item.amount || 0).toFixed(2)}</Text>
        {item.notes ? (
          <View style={{marginTop: 10, backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8}}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
              <FileText size={14} color="#64748B" style={{marginRight: 4}} />
              <Text style={{fontSize: 12, fontWeight: 'bold', color: '#475569'}}>Notes</Text>
            </View>
            {Array.isArray(item.notes) ? (
              item.notes.map((n: any, i: number) => (
                <Text key={i} style={{fontSize: 13, color: '#334155', marginTop: 2}}>
                  • {n.text} <Text style={{fontSize: 10, color: '#94a3b8'}}>({n.author})</Text>
                </Text>
              ))
            ) : typeof item.notes === 'string' && item.notes.startsWith('[') ? (
              JSON.parse(item.notes).map((n: any, i: number) => (
                <Text key={i} style={{fontSize: 13, color: '#334155', marginTop: 2}}>
                  • {n.text} <Text style={{fontSize: 10, color: '#94a3b8'}}>({n.author})</Text>
                </Text>
              ))
            ) : typeof item.notes === 'object' && item.notes !== null ? (
              <Text style={{fontSize: 13, color: '#334155'}}>
                • {item.notes.text || JSON.stringify(item.notes)} 
                {item.notes.author && <Text style={{fontSize: 10, color: '#94a3b8'}}> ({item.notes.author})</Text>}
              </Text>
            ) : (
              <Text style={{fontSize: 13, color: '#334155'}}>{String(item.notes)}</Text>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity 
          style={[styles.footerBtn, { backgroundColor: '#EFF6FF' }]} 
          onPress={() => openMap(item.map_lat, item.map_lng, item.address, item.location_link)}
        >
          <MapPin color="#3B82F6" size={16} style={{marginRight: 6}} />
          <Text style={[styles.footerBtnText, { color: '#3B82F6' }]}>Navigate</Text>
        </TouchableOpacity>

        {item.delivery_type === 'Bus' && item.type !== 'purchase_order' && (
             <TouchableOpacity 
               style={[styles.footerBtn, {backgroundColor: '#FFFBEB'}]} 
               onPress={() => handleOpenBusDetails(item)}
             >
               <Package color="#D97706" size={16} style={{marginRight: 6}} />
               <Text style={[styles.footerBtnText, {color: '#D97706'}]}>Bus Info</Text>
             </TouchableOpacity>
          )}
          {item.delivery_type === 'Bus' && item.type === 'purchase_order' && (
             <TouchableOpacity 
               style={[styles.footerBtn, {backgroundColor: '#F0FDF4'}]} 
               onPress={() => handleOpenBusDetails(item)}
             >
               <Package color="#16A34A" size={16} style={{marginRight: 6}} />
               <Text style={[styles.footerBtnText, {color: '#16A34A'}]}>View Bus</Text>
             </TouchableOpacity>
          )}

          {item.type === 'manual_order' && item.status !== 'Delivered' && item.status !== 'Completed' && item.status !== 'Cancelled' && (
            <>
              {item.status === 'Assigned' && (
                <TouchableOpacity style={[styles.footerBtn, {backgroundColor: '#F59E0B'}]} onPress={() => handleUpdateStatus(item.id, item.type, 'Picked Up')}>
                  <Package color="#fff" size={14} style={{marginRight: 4}} />
                  <Text style={[styles.footerBtnText, {color: '#fff'}]}>Pickup</Text>
                </TouchableOpacity>
              )}
              {item.status === 'Picked Up' && (
                <TouchableOpacity style={[styles.footerBtn, {backgroundColor: '#3B82F6'}]} onPress={() => handleUpdateStatus(item.id, item.type, 'Out for Delivery')}>
                  <Navigation color="#fff" size={14} style={{marginRight: 4}} />
                  <Text style={[styles.footerBtnText, {color: '#fff'}]}>Start</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {item.status !== 'Delivered' && item.status !== 'Completed' && item.status !== 'Cancelled' && (
              <TouchableOpacity style={[styles.footerBtn, {backgroundColor: '#6366F1'}]} onPress={() => openUpdateModal(item)}>
                <Text style={[styles.footerBtnText, {color: '#fff'}]}>Update</Text>
              </TouchableOpacity>
          )}

          {((item.type === 'manual_order' && item.status === 'Out for Delivery') || 
            (item.type !== 'manual_order' && item.status?.toLowerCase() !== 'delivered' && item.type !== 'purchase_order')) && (
            <TouchableOpacity 
            style={[styles.footerBtn, {backgroundColor: '#10B981'}]} 
            onPress={() => handleMarkDelivered(item.id, item.type, item.delivery_type, item.total_amount, item.payment_mode)}
            >
              <CheckCircle color="#fff" size={16} style={{marginRight: 6}} />
              <Text style={[styles.footerBtnText, {color: '#fff'}]}>Delivered</Text>
            </TouchableOpacity>
          )}
      </View>
    </View>
  );

    return (
    <View style={styles.container}>
      {cameraVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>Confirm {actionType}</Text>
            <View style={{ width: '100%', height: 300, borderRadius: 12, overflow: 'hidden', marginBottom: 15 }}>
              <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
            </View>
            {cameraMessage.text ? (
              <Text style={{ textAlign: 'center', marginBottom: 15, color: cameraMessage.type === 'error' ? 'red' : 'green', fontWeight: 'bold' }}>{cameraMessage.text}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: '#e2e8f0', borderRadius: 8, marginRight: 10 }} onPress={() => setCameraVisible(false)} disabled={loadingAction}>
                <Text style={{ textAlign: 'center', color: '#475569', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: '#10b981', borderRadius: 8 }} onPress={handleCapture} disabled={loadingAction}>
                {loadingAction ? <ActivityIndicator color="#fff" /> : <Text style={{ textAlign: 'center', color: '#fff', fontWeight: 'bold' }}>Capture & Verify</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Welcome, {user?.full_name}</Text>
          <Text style={styles.subtitle}>GPS: {locationStatus}</Text>
        </View>
        
        {/* Creative Attendance Widget */}
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
          {(!summary || summary.can_check_in) && (
            <TouchableOpacity style={{ backgroundColor: '#10b981', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => handleAction('login')}>
              <Sun size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Check In</Text>
            </TouchableOpacity>
          )}

          {summary && summary.can_break_in && !summary.can_check_in && (
            <TouchableOpacity style={{ backgroundColor: '#f59e0b', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => handleAction('break_in')}>
              <Coffee size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Break In</Text>
            </TouchableOpacity>
          )}

          {summary && summary.can_break_out && !summary.can_check_in && (
            <TouchableOpacity style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => handleAction('break_out')}>
              <Coffee size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Break Out</Text>
            </TouchableOpacity>
          )}

          {summary && summary.can_check_out && !summary.can_check_in && (
            <TouchableOpacity style={{ backgroundColor: '#f43f5e', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => handleAction('logout')}>
              <Moon size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Check Out</Text>
            </TouchableOpacity>
          )}

          {summary && !summary.can_check_in && !summary.can_check_out && !summary.can_break_in && !summary.can_break_out && (
            <View style={{ backgroundColor: '#94a3b8', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Moon size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Off Duty</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats Widget */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15, gap: 10 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: filterState === 'All' ? '#3b82f6' : '#e0e7ff', padding: 15, borderRadius: 12, alignItems: 'center' }} onPress={() => setFilterState('All')}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: filterState === 'All' ? '#fff' : '#1e40af' }}>{orders.length}</Text>
          <Text style={{ fontSize: 12, color: filterState === 'All' ? '#fff' : '#1e40af' }}>Total</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, backgroundColor: filterState === 'Pending' ? '#f59e0b' : '#fef3c7', padding: 15, borderRadius: 12, alignItems: 'center' }} onPress={() => setFilterState('Pending')}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: filterState === 'Pending' ? '#fff' : '#b45309' }}>{orders.filter(o => o.status !== 'Delivered').length}</Text>
          <Text style={{ fontSize: 12, color: filterState === 'Pending' ? '#fff' : '#b45309' }}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, backgroundColor: filterState === 'Completed' ? '#10b981' : '#d1fae5', padding: 15, borderRadius: 12, alignItems: 'center' }} onPress={() => setFilterState('Completed')}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: filterState === 'Completed' ? '#fff' : '#047857' }}>{orders.filter(o => o.status === 'Delivered').length}</Text>
          <Text style={{ fontSize: 12, color: filterState === 'Completed' ? '#fff' : '#047857' }}>Completed</Text>
        </TouchableOpacity>
      </View>

      <View style={{flexDirection:'row', gap: 10, paddingHorizontal: 15, marginBottom: 15}}>
        {alarmSound && (
          <TouchableOpacity style={[styles.refreshBtn, {backgroundColor: '#ef4444'}]} onPress={stopAlarm}>
            <Text style={[styles.refreshBtnText, {color: '#fff'}]}>Stop Alarm</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.refreshBtn} onPress={() => user && fetchOrders(user.id)}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={orders.filter(o => { if (filterState === 'Completed') return o.status === 'Delivered'; if (filterState === 'Pending') return o.status !== 'Delivered'; return true; })}
          keyExtractor={item => `${item.type}-${item.id}`}
          renderItem={renderOrder}
          contentContainerStyle={[styles.listContainer, orders.length === 0 && {flex: 1, justifyContent: 'center'}]}
          ListEmptyComponent={
            <View style={styles.noDataContainer}>
              <Package size={48} color="#CBD5E1" />
              <Text style={styles.noData}>No orders assigned to you yet.</Text>
              <Text style={styles.noDataSub}>We will notify you when a new order arrives.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3B82F6"]}
              tintColor="#3B82F6"
            />
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={busModalVisible}
        onRequestClose={() => setBusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedBusOrder?.type === 'purchase_order' ? 'Bus Pickup Details' : 'Enter Bus Delivery Details'}
            </Text>
            
            <ScrollView style={{width: '100%', maxHeight: '70%'}}>
              
                <Text style={styles.label}>Bus Number</Text>
                <TextInput style={styles.input} value={busDetails.bus_number} onChangeText={t => setBusDetails(p => ({...p, bus_number: t}))} editable={selectedBusOrder?.type !== 'purchase_order'} />
                
                <Text style={styles.label}>Bus Date</Text>
                {Platform.OS === 'web' ? (
                  <input 
                    type="date" 
                    value={busDetails.bus_date || ''} 
                    onChange={(e) => setBusDetails(p => ({...p, bus_date: e.target.value}))}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit', marginBottom: 15 }}
                    disabled={selectedBusOrder?.type === 'purchase_order'}
                  />
                ) : (
                  <TextInput style={styles.input} value={busDetails.bus_date || ''} onChangeText={t => setBusDetails(p => ({...p, bus_date: t}))} editable={selectedBusOrder?.type !== 'purchase_order'} placeholder="YYYY-MM-DD" />
                )}

              
              <Text style={styles.label}>Reach Time / Incoming Time</Text>
              <TextInput style={styles.input} value={busDetails.arrival_time} onChangeText={t => setBusDetails(p => ({...p, arrival_time: t}))} editable={selectedBusOrder?.type !== 'purchase_order'} />
              
              <Text style={styles.label}>Driver Name</Text>
              <TextInput style={styles.input} value={busDetails.driver_name} onChangeText={t => setBusDetails(p => ({...p, driver_name: t}))} editable={selectedBusOrder?.type !== 'purchase_order'} />
              
              <Text style={styles.label}>Driver Number</Text>
              <TextInput style={styles.input} value={busDetails.driver_number} onChangeText={t => setBusDetails(p => ({...p, driver_number: t}))} editable={selectedBusOrder?.type !== 'purchase_order'} />
              
              <Text style={styles.label}>Waybill Number</Text>
              <TextInput style={styles.input} value={busDetails.waybill_number} onChangeText={t => setBusDetails(p => ({...p, waybill_number: t}))} editable={selectedBusOrder?.type !== 'purchase_order'} />
              
              <Text style={styles.label}>Drop Location</Text>
              <TextInput style={styles.input} value={busDetails.drop_location} onChangeText={t => setBusDetails(p => ({...p, drop_location: t}))} editable={selectedBusOrder?.type !== 'purchase_order'} />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBusModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
              {selectedBusOrder?.type !== 'purchase_order' && (
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBusDetails}>
                  <Text style={styles.saveBtnText}>Save Details</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={otpModalVisible}
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delivery Verification</Text>
            
            <ScrollView>
              <Text style={styles.label}>Ask the customer for the 4-digit delivery OTP</Text>
              <TextInput 
                style={[styles.input, { fontSize: 24, letterSpacing: 5, textAlign: 'center', paddingVertical: 15 }]} 
                value={deliveryOtp} 
                onChangeText={setDeliveryOtp} 
                keyboardType="number-pad"
                maxLength={4}
                placeholder="0000"
              />

              {currentOrder.type === 'manual_order' && currentOrder.payment_mode !== 'Prepaid' && (
                <>
                  <Text style={[styles.label, {marginTop: 20}]}>Payment Mode</Text>
                  <View style={{flexDirection:'row', gap:10, marginBottom: 10}}>
                     <TouchableOpacity 
                        style={{flex:1, padding:10, borderWidth:1, borderColor: paymentMode==='Cash'?'#10B981':'#CBD5E1', borderRadius:8, backgroundColor: paymentMode==='Cash'?'#D1FAE5':'#fff'}}
                        onPress={()=>setPaymentMode('Cash')}
                     >
                       <Text style={{textAlign:'center', fontWeight:'bold', color: paymentMode==='Cash'?'#065F46':'#475569'}}>Cash</Text>
                     </TouchableOpacity>
                     <TouchableOpacity 
                        style={{flex:1, padding:10, borderWidth:1, borderColor: paymentMode==='Online'?'#3B82F6':'#CBD5E1', borderRadius:8, backgroundColor: paymentMode==='Online'?'#DBEAFE':'#fff'}}
                        onPress={()=>setPaymentMode('Online')}
                     >
                       <Text style={{textAlign:'center', fontWeight:'bold', color: paymentMode==='Online'?'#1E40AF':'#475569'}}>Online / UPI</Text>
                     </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Paid Amount (₹)</Text>
                  <TextInput style={styles.input} value={paidAmount} onChangeText={setPaidAmount} keyboardType="numeric" />

                  {paymentMode === 'Online' && (
                    <>
                      <Text style={styles.label}>Transaction ID</Text>
                      <TextInput style={styles.input} value={paymentTxnId} onChangeText={setPaymentTxnId} placeholder="e.g. UTR / Ref No" />
                    </>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setOtpModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, deliveryOtp.length !== 4 && { opacity: 0.5 }]} 
                onPress={() => processDelivery(currentOrder.id, currentOrder.type, deliveryOtp)}
                disabled={deliveryOtp.length !== 4}
              >
                <Text style={styles.saveBtnText}>Verify & Mark Delivered</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Order Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={updateModalVisible}
        onRequestClose={() => setUpdateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Order #{updateOrder?.id}</Text>
            
            {updateActionType === 'menu' && (
              <View style={{ gap: 12, marginTop: 10 }}>
                <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: '#3B82F6' }]} onPress={() => setUpdateActionType('note')}>
                  <FileText color="#fff" size={16} style={{marginRight: 8}} />
                  <Text style={styles.saveBtnText}>Add Note</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: '#F59E0B' }]} onPress={submitNoShow}>
                  <Text style={styles.saveBtnText}>Mark as No Show</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: '#EF4444' }]} onPress={() => setUpdateActionType('cancel')}>
                  <Text style={styles.saveBtnText}>Cancel Delivery</Text>
                </TouchableOpacity>
              </View>
            )}

            {updateActionType === 'note' && (
              <View>
                <Text style={styles.label}>Enter your note</Text>
                <TextInput 
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
                  multiline
                  value={updateNote}
                  onChangeText={setUpdateNote}
                  placeholder="e.g. Customer requested delivery at a different time"
                />
              </View>
            )}

            {updateActionType === 'cancel' && (
              <View>
                <Text style={styles.label}>Ask the customer for the 4-digit Delivery OTP to cancel</Text>
                <TextInput 
                  style={[styles.input, { fontSize: 24, letterSpacing: 5, textAlign: 'center', paddingVertical: 15 }]} 
                  value={cancelOtp} 
                  onChangeText={setCancelOtp} 
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="0000"
                />
              </View>
            )}

            <View style={styles.modalActions}>
              {updateActionType !== 'menu' && (
                <TouchableOpacity style={[styles.cancelBtn, {marginRight: 'auto'}]} onPress={() => setUpdateActionType('menu')}>
                  <Text style={styles.cancelBtnText}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setUpdateModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
              
              {updateActionType === 'note' && (
                <TouchableOpacity style={[styles.saveBtn, !updateNote && {opacity: 0.5}]} onPress={submitUpdateNote} disabled={!updateNote}>
                  <Text style={styles.saveBtnText}>Save Note</Text>
                </TouchableOpacity>
              )}
              {updateActionType === 'cancel' && (
                <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#EF4444'}, cancelOtp.length !== 4 && {opacity: 0.5}]} onPress={submitCancel} disabled={cancelOtp.length !== 4}>
                  <Text style={styles.saveBtnText}>Confirm Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#10B981', marginTop: 4, fontWeight: '600' },
  refreshBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, height: 40, justifyContent: 'center' },
  refreshBtnText: { color: '#3B82F6', fontWeight: 'bold' },
  listContainer: { padding: 16 },
  noDataContainer: { alignItems: 'center', marginTop: 100 },
  noData: { color: '#475569', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  noDataSub: { color: '#94A3B8', fontSize: 14, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderTypeBadge: { fontSize: 10, color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  orderId: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusDelivered: { backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#1E293B' },
  cardBody: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { marginRight: 8 },
  infoText: { fontSize: 14, color: '#475569', flex: 1 },
  totalText: { fontSize: 16, fontWeight: 'bold', color: '#10B981', marginTop: 8 },
  cardFooter: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginTop: 8 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 10, borderRadius: 8, flex: 1 },
  footerBtnText: { fontWeight: 'bold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#1E293B' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: '#64748B', fontWeight: 'bold' },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#3B82F6' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  modalActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, paddingHorizontal: 16 }
});
