import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Modal, TextInput, useWindowDimensions, Image, ScrollView } from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Package, MapPin, Bus, User, Map, CheckCircle, Search, Calendar, FileText, Plus, Eye, Share2, Phone, Navigation, ChevronDown, Trash2, X } from 'lucide-react-native';
import { Share } from 'react-native';

export default function ManualOrders({ deliveryBoys, onStartAssignment }) {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buses, setBuses] = useState([]);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('All'); 
  const [selectedDate, setSelectedDate] = useState('');

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const phoneRef = React.useRef(null);
  const nameRef = React.useRef(null);
  const shipPhoneRef = React.useRef(null);
  const shipNameRef = React.useRef(null);
  const addressRef = React.useRef(null);
  const linkRef = React.useRef(null);
  const orderNoRef = React.useRef(null);
  const invoiceNoRef = React.useRef(null);
  const amountRef = React.useRef(null);
  const txnRef = React.useRef(null);
  const chargeRef = React.useRef(null);
  const dateRef = React.useRef(null);
  const timeRef = React.useRef(null);
  const notesRef = React.useRef(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [busesModalVisible, setBusesModalVisible] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBoyId, setSelectedBoyId] = useState('All');
  const [deliveryBoySearchQuery, setDeliveryBoySearchQuery] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [riderDropdownOpen, setRiderDropdownOpen] = useState(false);
  const [assignOrder, setAssignOrder] = useState(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [editingBus, setEditingBus] = useState(null);
  const [isAddingBus, setIsAddingBus] = useState(false);
  const [busForm, setBusForm] = useState({
    bus_name: '', operator_name: '', bus_number: '', route_code: '',
    source: '', destination: '', departure_time: '',
    parcel_contact_person: '', mobile_no: '', remarks: ''
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editAddress, setEditAddress] = useState('');
  const [newNote, setNewNote] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteOrderTarget, setDeleteOrderTarget] = useState(null);
  
  // Patient auto-fill state
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientAddresses, setPatientAddresses] = useState([]);
  const [isNewAddress, setIsNewAddress] = useState(false);

  // Date/Time Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Create Form State
  const initialFormData = {
    customer_phone: '',
    customer_name: '',
    ship_to_phone: '',
    ship_to_name: '',
    address: '',
    location_link: '',
    order_no: '',
    invoice_no: '',
    amount: '',
    delivery_charge: '',
    mode_of_delivery: 'Counter',
    order_date: new Date().toISOString().split('T')[0],
    order_time: new Date().toTimeString().substring(0,5),
    notes: '',
    payment_mode: 'POD',
    payment_txn_id: '',
    is_scheduled: false,
    scheduled_date: '',
    scheduled_time: '',
    bus_travels_name: '',
    bus_driver_name: '',
    bus_driver_number: '',
    bus_number: '', bus_date: ''
  };
  const [formData, setFormData] = useState(initialFormData);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchManualOrders = async (silent = false, targetPage = page) => {
    try {
      if (!silent) setLoading(true);
      let url = 'https://napi.bharatmedicalhallplus.com/manual-orders';
      const params = [`page=${targetPage}`, 'limit=50'];
      if (assignmentFilter !== 'All') params.push(`status=${assignmentFilter}`);
      if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
      if (startDate) params.push(`fromDate=${startDate}`);
      if (endDate) params.push(`toDate=${endDate}`);
      if (selectedBoyId !== 'All') {
        params.push(`delivery_boy_id=${selectedBoyId}`);
      }
      
      url += `?${params.join('&')}`;
      
      const res = await axios.get(url);
      if (res.data && res.data.success) {
        setOrders(res.data.data);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err.message || err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Debounce search query changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchManualOrders(false, 1);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Fetch when filters change
  useEffect(() => {
    setPage(1);
    fetchManualOrders(false, 1);
  }, [startDate, endDate, selectedBoyId, assignmentFilter]);

  // Fetch when page changes
  useEffect(() => {
    fetchManualOrders(false, page);
  }, [page]);

  // Initialize and run background updates
  useEffect(() => {
    fetchBuses();
    const interval = setInterval(() => {
      fetchManualOrders(true, page);
    }, 10000);
    return () => clearInterval(interval);
  }, [page, searchQuery, startDate, endDate, selectedBoyId, assignmentFilter]);

  const fetchBuses = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/buses');
      if (res.data && res.data.success) {
        setBuses(res.data.data);
      }
    } catch(err) {
      console.log('Error fetching buses', err);
    }
  };

  const handleBusSelection = (busId) => {
    if (!busId) return;
    const bus = buses.find(b => b.id.toString() === busId.toString());
    if (bus) {
      setFormData({
        ...formData,
        bus_travels_name: bus.operator_name || bus.bus_name,
        bus_driver_name: bus.parcel_contact_person || bus.contact_person || '',
        bus_driver_number: bus.mobile_no || '',
        bus_number: bus.bus_number || '', bus_date: bus.bus_date || '',
        mode_of_delivery: 'Bus',
        is_scheduled: true,
        scheduled_time: bus.departure_time || ''
      });
    }
  };

  const handlePatientSearch = async (text) => {
    const sanitized = text.replace(/\s+/g, '');
    setPatientSearch(sanitized);
    if (sanitized.length >= 10) {
      try {
        const res = await axios.get(`https://napi.bharatmedicalhallplus.com/patient/by-mobile/${sanitized}`);
        if (res.data && res.data.success) {
          const p = res.data.patient || res.data.data;
          const addrs = p.addresses || [];
          setPatientAddresses(addrs);
          
          let defaultAddress = addrs.length > 0 ? addrs[0].address : '';
          let defaultLink = addrs.length > 0 ? addrs[0].location_link : '';
          
          setIsNewAddress(addrs.length === 0);

          setFormData({
            ...formData,
            customer_phone: p.mobile,
            customer_name: p.name,
            ship_to_phone: p.mobile,
            ship_to_name: p.name,
            address: defaultAddress,
            location_link: defaultLink
          });
        } else {
            setPatientAddresses([]);
            setIsNewAddress(true);
            setFormData({ ...formData, customer_phone: sanitized });
        }
      } catch (e) {
        setPatientAddresses([]);
        setIsNewAddress(true);
        setFormData({ ...formData, customer_phone: sanitized });
      }
    } else {
      setPatientAddresses([]);
      setFormData({ ...formData, customer_phone: sanitized });
    }
  };

  const handleSaveBus = async () => {
    try {
      if (editingBus) {
        const res = await axios.put(`https://napi.bharatmedicalhallplus.com/buses/${editingBus.id}`, busForm);
        if (res.data.success) {
          alert('Bus updated successfully!');
          fetchBuses();
          setEditingBus(null);
        }
      } else {
        const res = await axios.post('https://napi.bharatmedicalhallplus.com/buses', busForm);
        if (res.data.success) {
          alert('Bus added successfully!');
          fetchBuses();
          setIsAddingBus(false);
        }
      }
    } catch(err) {
      alert('Failed to save bus details');
    }
  };

  const startEditBus = (bus) => {
    setEditingBus(bus);
    setBusForm({
      bus_name: bus.bus_name || '',
      operator_name: bus.operator_name || '',
      bus_number: bus.bus_number || '',
      route_code: bus.route_code || '',
      source: bus.source || '',
      destination: bus.destination || '',
      departure_time: bus.departure_time || '',
      parcel_contact_person: bus.parcel_contact_person || '',
      mobile_no: bus.mobile_no || '',
      remarks: bus.remarks || ''
    });
  };

  const startAddBus = () => {
    setIsAddingBus(true);
    setEditingBus(null);
    setBusForm({
      bus_name: '', operator_name: '', bus_number: '', route_code: '',
      source: '', destination: '', departure_time: '',
      parcel_contact_person: '', mobile_no: '', remarks: ''
    });
  };

  const handleCreateSubmit = async () => {
    try {
      let createdById = null;
      let createdByType = 'Employee';
      if (typeof window !== 'undefined') {
        const adminUser = localStorage.getItem('superAdminUser') || localStorage.getItem('subAdminUser');
        const empUser = localStorage.getItem('employeeUser');
        if (adminUser) {
          const auth = JSON.parse(adminUser);
          createdById = auth.id;
          createdByType = 'Admin';
        } else if (empUser) {
          const auth = JSON.parse(empUser);
          createdById = auth.id;
        }
      }

      const payload = {
        ...formData,
        is_scheduled: formData.mode_of_delivery === 'Schedule Delivery',
        created_by_id: createdById,
        created_by_type: createdByType
      };

      const res = await axios.post('https://napi.bharatmedicalhallplus.com/manual-orders', payload);
      if (res.data.success) {
        alert('Order created successfully!');
        setFormData(initialFormData);
        setCreateModalVisible(false);
        fetchManualOrders();
      }
    } catch (err) {
      alert('Failed to create order');
    }
  };

  const handleUpdateOrderDetails = async () => {
    if (!selectedOrder) return;
    try {
      let authName = 'Employee';
      let modifiedById = null;
      let modifiedByType = 'Employee';

      if (typeof window !== 'undefined') {
        const adminUser = localStorage.getItem('superAdminUser') || localStorage.getItem('subAdminUser');
        const empUser = localStorage.getItem('employeeUser');
        if (adminUser) {
          const auth = JSON.parse(adminUser);
          authName = auth.full_name || authName;
          modifiedById = auth.id;
          modifiedByType = 'Admin';
        } else if (empUser) {
          const auth = JSON.parse(empUser);
          authName = auth.full_name || authName;
          modifiedById = auth.id;
          modifiedByType = 'Employee';
        }
      }

      if (selectedOrder.order_source_type === 'purchase_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/update/${selectedOrder.id}`, {
          address: editAddress,
          new_note: newNote,
          note_author: authName,
          modified_by_id: modifiedById,
          modified_by_type: modifiedByType,
          modified_by_name: authName
        });
      } else if (selectedOrder.order_source_type === 'online_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/online-orders/${selectedOrder.id}/update`, {
          address: editAddress,
          new_note: newNote,
          note_author: authName,
          modified_by_id: modifiedById,
          modified_by_type: modifiedByType,
          modified_by_name: authName
        });
      } else if (selectedOrder.order_source_type === 'sales_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/sales-order/${selectedOrder.id}/update`, {
          address: editAddress,
          new_note: newNote,
          note_author: authName,
          modified_by_id: modifiedById,
          modified_by_type: modifiedByType,
          modified_by_name: authName
        });
      } else {
        await axios.put(`https://napi.bharatmedicalhallplus.com/manual-orders/${selectedOrder.id}`, {
          ...selectedOrder,
          address: editAddress,
          new_note: newNote,
          note_author: authName,
          modified_by_id: modifiedById,
          modified_by_type: modifiedByType,
          modified_by_name: authName
        });
      }
      alert('Order updated successfully!');
      setNewNote('');
      fetchManualOrders();
      setViewModalVisible(false);
    } catch (err) {
      alert('Failed to update order');
    }
  };

  const handleAssignBoy = async (orderId, boyId) => {
    try {
      const isUnassign = boyId === 'null' || !boyId;
      
      let authName = 'Employee';
      let modifiedById = null;
      let modifiedByType = 'Employee';

      if (typeof window !== 'undefined') {
        const adminUser = localStorage.getItem('superAdminUser') || localStorage.getItem('subAdminUser');
        const empUser = localStorage.getItem('employeeUser');
        if (adminUser) {
          const auth = JSON.parse(adminUser);
          authName = auth.full_name || authName;
          modifiedById = auth.id;
          modifiedByType = 'Admin';
        } else if (empUser) {
          const auth = JSON.parse(empUser);
          authName = auth.full_name || authName;
          modifiedById = auth.id;
          modifiedByType = 'Employee';
        }
      }

      if (assignOrder && assignOrder.order_source_type === 'purchase_order') {
        await axios.post(`https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/assign/${orderId}`, {
          delivery_boy_id: isUnassign ? null : boyId,
          delivery_type: assignOrder.mode_of_delivery || assignOrder.delivery_type || 'Local',
          address: assignOrder.address || null,
          gps_location: assignOrder.gps_location || null,
          bus_details: assignOrder.bus_details || null,
          assigned_by: modifiedById
        });
      } else if (assignOrder && assignOrder.order_source_type === 'online_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/online-orders/${orderId}/assign-delivery`, {
          delivery_boy_id: isUnassign ? null : boyId,
          assigned_by: modifiedById
        });
      } else if (assignOrder && assignOrder.order_source_type === 'sales_order') {
        await axios.put(`https://napi.bharatmedicalhallplus.com/sales-order/${orderId}/assign-delivery`, {
          delivery_boy_id: isUnassign ? null : boyId,
          delivery_type: assignOrder.mode_of_delivery || assignOrder.delivery_type || 'Local',
          bus_details: assignOrder.bus_details || null,
          assigned_by: modifiedById
        });
      } else {
        await axios.put(`https://napi.bharatmedicalhallplus.com/manual-orders/${orderId}`, {
          delivery_boy_id: isUnassign ? null : boyId,
          status: isUnassign ? 'Pending' : 'Assigned',
          modified_by_id: modifiedById,
          modified_by_type: modifiedByType,
          modified_by_name: authName
        });
      }
      fetchManualOrders();
    } catch (err) {
      alert('Failed to assign boy');
    }
  };

  const handleResetStatus = async () => {
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/manual-orders/${selectedOrder.id}`, {
        status: 'Pending',
        delivery_boy_id: null
      });
      alert('Order reset to Pending');
      fetchManualOrders();
      setViewModalVisible(false);
    } catch (err) { alert('Failed to reset'); }
  };


  const handleShareOrder = async (item) => {
    try {
      let header = '';
      if (item.mode_of_delivery === 'Bus' || item.delivery_type === 'Bus') {
        header = `${item.bus_travels_name || 'Bus Travels'} Bus Driver\nPhone: +91${item.bus_driver_number || item.bus_driver_phone || ''}`;
      } else if (item.mode_of_delivery === 'Schedule Delivery' || item.is_scheduled) {
        header = `Scheduled Delivery\nCustomer: ${item.customer_name || 'N/A'}\nPhone: ${item.customer_phone ? '+91' + item.customer_phone : 'N/A'}`;
      } else {
        header = `${item.customer_name || 'Customer'}\nPhone: ${item.customer_phone ? '+91' + item.customer_phone : 'N/A'}`;
      }

      let msg = `${header}\n\n` +
                `Order Information:\n` +
                `Order No: ${item.order_no || 'N/A'}\n` +
                `Invoice No: ${item.invoice_no || 'N/A'}\n\n` +
                `Amount: ${item.amount || '0.00'}\n` +
                `OTP: ${item.delivery_otp || 'N/A'}\n\n` +
                `Delivery Boy Information:\n` +
                `Name: ${item.delivery_boy_name || 'Not assigned'}\n` +
                `Phone: ${item.delivery_boy_phone ? '+91' + item.delivery_boy_phone : 'N/A'}`;

      if (item.mode_of_delivery === 'Bus' || item.delivery_type === 'Bus') {
        msg += `\n\nBus Information:\n` +
               `Bus Name: ${item.bus_travels_name || '--'}\n` +
               `Bus No: ${item.bus_number || '--'}\n` +
               `Bus Contact Number: ${item.bus_driver_number || '--'}\n` +
               `Time of Dispatch: ${item.bus_dispatch_time || '--'}\n` +
               `Time of Arrival: ${item.est_reach_time || '--'}\n` +
               `Handover To: ${item.bus_handover_to || '--'}`;
      } else if (item.mode_of_delivery === 'Schedule Delivery' || item.is_scheduled) {
        msg += `\n\nSchedule Information:\n` +
               `Schedule Date: ${item.scheduled_date ? item.scheduled_date.substring(0, 10) : '--'}\n` +
               `Schedule Time: ${item.scheduled_time || '--'}`;
      }
      
      if (Platform.OS === 'web') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(msg);
          alert('Details copied to clipboard!');
        } else {
          alert('Clipboard not supported on this browser');
        }
      } else {
        await Share.share({ message: msg });
      }
    } catch (error) {
      console.error('Error sharing:', error.message || error);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrderTarget) return;
    try {
      const API_URL = 'https://napi.bharatmedicalhallplus.com';
      const res = await axios.delete(`${API_URL}/manual-orders/${deleteOrderTarget.id}`);
      if (res.data && res.data.success) {
        alert('Order deleted successfully');
        setOrders(prev => prev.filter(o => o.id !== deleteOrderTarget.id));
      } else {
        alert(res.data.message || 'Failed to delete order');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error deleting order');
    } finally {
      setDeleteModalVisible(false);
      setDeleteOrderTarget(null);
    }
  };

  const renderOrderItem = ({ item, index }) => {
    // Determine the status badge color
    let statusColor = '#3b82f6';
    if (item.status === 'Assigned') statusColor = '#f59e0b';
    else if (item.status === 'Completed' || item.status === 'Delivered') statusColor = '#10b981';
    
    // Created By parsing
    let creatorImg = null;
    try {
      if (item.admin_creator_profile) creatorImg = item.admin_creator_profile;
      else if (item.creator_profile) {
        const prof = typeof item.creator_profile === 'string' ? JSON.parse(item.creator_profile) : item.creator_profile;
        creatorImg = prof.image;
      }
    } catch(e){}

    let boyImg = null;
    try {
      if (item.delivery_boy_profile) {
        const prof = typeof item.delivery_boy_profile === 'string' ? JSON.parse(item.delivery_boy_profile) : item.delivery_boy_profile;
        boyImg = prof.image;
      }
    } catch(e){}

    // Filter available delivery boys based on order scheduled_time and boy's shift
    const availableBoys = deliveryBoys?.filter(boy => {
      if (!item.scheduled_time || !boy.schedule_in || !boy.schedule_out) return true; // Show all if no shift data
      try {
        const [bH, bM] = item.scheduled_time.split(':').map(Number);
        if (isNaN(bH)) return true;
        const busMins = bH * 60 + (bM || 0);

        const [inH, inM] = boy.schedule_in.split(':').map(Number);
        const inMins = inH * 60 + (inM || 0);

        const [outH, outM] = boy.schedule_out.split(':').map(Number);
        const outMins = outH * 60 + (outM || 0);

        if (inMins <= outMins) {
          return busMins >= inMins && busMins <= outMins;
        } else {
          // Night shift cross midnight
          return busMins >= inMins || busMins <= outMins;
        }
      } catch (e) {
        return true;
      }
    });


    return (
      <View style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff' }]}>
        {/* Status */}
        <View style={[styles.cell, { flex: 0.8, flexDirection: 'row', alignItems: 'center' }]}>
          {item.mode_of_delivery === 'Bus' ? <Bus size={14} color="#64748b" style={{marginRight: 4}}/> : 
           item.mode_of_delivery === 'Local' ? <MapPin size={14} color="#64748b" style={{marginRight: 4}}/> :
           <Package size={14} color="#64748b" style={{marginRight: 4}}/>}
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        
        {/* Customer */}
        <View style={[styles.cell, { flex: 1.5 }]}>
          <Text style={styles.cellTextBold}>{item.customer_name}</Text>
          {item.customer_phone ? <Text style={styles.cellSubText}>{item.customer_phone}</Text> : null}
          {item.ship_to_name ? (
            <Text style={[styles.cellSubText, { color: '#3b82f6', fontWeight: 'bold', marginTop: 4 }]}>
              Ship to: {item.ship_to_name} ({item.ship_to_phone || 'No Phone'})
            </Text>
          ) : null}
          {item.order_source_type === 'purchase_order' && (
            <View style={{backgroundColor: '#e0e7ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, alignSelf: 'flex-start'}}>
              <Text style={{fontSize: 9, color: '#4338ca', fontWeight: 'bold'}}>PURCHASE ORDER</Text>
            </View>
          )}
          {item.order_source_type === 'online_order' && (
            <View style={{backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, alignSelf: 'flex-start'}}>
              <Text style={{fontSize: 9, color: '#b91c1c', fontWeight: 'bold'}}>ONLINE ORDER</Text>
            </View>
          )}
          {item.order_source_type === 'sales_order' && (
            <View style={{backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, alignSelf: 'flex-start'}}>
              <Text style={{fontSize: 9, color: '#b45309', fontWeight: 'bold'}}>SALES ORDER</Text>
            </View>
          )}
        </View>
        
        {/* Order/Invoice No */}
        <View style={[styles.cell, { flex: 1 }]}>
          <Text style={styles.cellTextBold}>{item.order_no}</Text>
          <Text style={styles.cellSubText}>{item.invoice_no}</Text>
        </View>
        
        {/* Delivery Boy */}
        <View style={[styles.cell, { flex: 1.5 }]}>
          {(item.status === 'Delivered') ? (
            <View style={{flexDirection: 'column'}}>
               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 {boyImg ? <Image source={{uri: boyImg}} style={styles.avatar} /> : <User size={16} color="#94a3b8" style={{marginRight: 4}}/>}
                 <Text style={styles.cellText} numberOfLines={1}>{item.delivery_boy_name || 'Unassigned'}</Text>
               </View>
               {item.submitted_to_name && (
                 <Text style={{fontSize: 10, color: '#059669', marginTop: 2, fontWeight: 'bold'}} numberOfLines={2}>
                   Sub: {item.submitted_to_name} ({item.submitted_to_role || ''} - {item.submitted_to_dept || ''})
                 </Text>
               )}
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.pickerWrapper, { paddingHorizontal: 8, height: 28, justifyContent: 'center', backgroundColor: '#f8fafc' }]}
              onPress={() => {
                const isStoreOrCounter = item.mode_of_delivery === 'Store' || item.delivery_type === 'Store' || item.mode_of_delivery === 'Counter' || item.delivery_type === 'Counter';
                if (isStoreOrCounter && onStartAssignment) {
                  onStartAssignment({ ...item, type: item.order_source_type || 'manual_order' });
                } else {
                  setAssignOrder(item);
                  setAssignSearchQuery('');
                  setAssignModalVisible(true);
                }
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#334155' }} numberOfLines={1}>
                  {item.delivery_boy_name || 'Assign To'}
                </Text>
                <ChevronDown size={12} color="#64748b" style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
          )}
        </View>
 
        {/* Charge/Amount */}
        <View style={[styles.cell, { flex: 1 }]}>
          <Text style={styles.cellText}>₹{item.delivery_charge || 0}</Text>
          <Text style={styles.cellTextBold}>₹{item.amount || 0}</Text>
        </View>
        
        {/* Date/Time */}
        <View style={[styles.cell, { flex: 1 }]}>
          <Text style={styles.cellText}>{item.order_date ? item.order_date.substring(0,10) : ''}</Text>
          <Text style={styles.cellSubText}>{item.order_time}</Text>
          {item.started_at && item.delivered_at && (
             <Text style={[styles.cellSubText, {color:'#10B981'}]}>Time: {Math.round((new Date(item.delivered_at).getTime() - new Date(item.started_at).getTime()) / 60000)}m</Text>
          )}
        </View>
        
        {/* Created By */}
        <View style={[styles.cell, { flex: 1.2, justifyContent: 'center' }]}>
           <View style={{flexDirection: 'row', alignItems: 'center'}}>
              {creatorImg ? <Image source={{uri: creatorImg}} style={styles.avatar} /> : <User size={14} color="#94a3b8" style={{marginRight: 4}}/>}
              <Text style={styles.cellText} numberOfLines={1}>{item.admin_creator_name || item.creator_name}</Text>
           </View>
           {item.modified_by_name && (
             <Text style={[styles.cellSubText, { color: '#6366f1', marginTop: 1 }]} numberOfLines={1}>
               Mod: {item.modified_by_name}
             </Text>
           )}
        </View>
        
        {/* Actions */}
        <View style={[styles.cell, { flex: 1.2, flexDirection: 'row', gap: 6, justifyContent: 'center' }]}>
          <TouchableOpacity onPress={() => { 
              setSelectedOrder(item); 
              setEditAddress(item.address || '');
              setNewNote('');
              setViewModalVisible(true); 
            }} style={[styles.actionBtn, {backgroundColor: '#e0e7ff'}]}>
             <Eye size={14} color="#4338ca" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleShareOrder(item)} style={[styles.actionBtn, {backgroundColor: '#dcfce7'}]}>
             <Share2 size={14} color="#15803d" />
          </TouchableOpacity>
          {item.order_source_type === 'manual_order' && ['pending', 'assigned'].includes(item.status?.toLowerCase()) && (
            <TouchableOpacity 
              onPress={() => {
                setDeleteOrderTarget(item);
                setDeleteModalVisible(true);
              }}
              style={[styles.actionBtn, {backgroundColor: '#fee2e2'}]}
            >
              <Trash2 size={14} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.filters}>
          {/* General Search */}
          <View style={styles.searchContainer}>
            <Search size={18} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Customer/Order..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          {/* Status Filter */}
          <View style={styles.dropdownWrapper}>
            <Picker
              selectedValue={assignmentFilter}
              onValueChange={(val) => setAssignmentFilter(val)}
              style={styles.picker}
            >
              <Picker.Item label="Select Status" value="All" />
              <Picker.Item label="Pending" value="Pending" />
              <Picker.Item label="Assigned" value="Assigned" />
              <Picker.Item label="Delivered" value="Delivered" />
            </Picker>
          </View>

          {/* Delivery Boy Filter Search & Select */}
          <View style={{ zIndex: 100, position: 'relative' }}>
            <TouchableOpacity 
              style={styles.dropdownWrapper}
              onPress={() => setRiderDropdownOpen(!riderDropdownOpen)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, justifyContent: 'space-between', height: 40 }}>
                <Text style={{ fontSize: 14, color: '#0f172a' }}>
                  {selectedBoyId === 'All' ? 'All Riders' : 
                   selectedBoyId === 'unassigned' ? 'Unassigned' : 
                   deliveryBoys?.find(b => b.id.toString() === selectedBoyId)?.full_name || 'Select Rider'}
                </Text>
                <ChevronDown size={16} color="#64748b" />
              </View>
            </TouchableOpacity>

            {riderDropdownOpen && (
              <View style={{
                position: 'absolute',
                top: 45,
                left: 0,
                width: 250,
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 4,
                padding: 8,
                zIndex: 1000
              }}>
                <View style={[styles.searchContainer, { width: '100%', marginBottom: 8, height: 36 }]}>
                  <Search size={14} color="#94a3b8" style={{ marginRight: 6 }} />
                  <TextInput
                    style={[styles.searchInput, { fontSize: 13 }]}
                    placeholder="Search Rider..."
                    value={deliveryBoySearchQuery}
                    onChangeText={setDeliveryBoySearchQuery}
                    autoFocus
                  />
                </View>

                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                  <TouchableOpacity 
                    style={{ padding: 8, borderRadius: 6, backgroundColor: selectedBoyId === 'All' ? '#f1f5f9' : 'transparent' }}
                    onPress={() => {
                      setSelectedBoyId('All');
                      setRiderDropdownOpen(false);
                      setDeliveryBoySearchQuery('');
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: selectedBoyId === 'All' ? '600' : 'normal' }}>All Riders</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{ padding: 8, borderRadius: 6, backgroundColor: selectedBoyId === 'unassigned' ? '#f1f5f9' : 'transparent', marginTop: 2 }}
                    onPress={() => {
                      setSelectedBoyId('unassigned');
                      setRiderDropdownOpen(false);
                      setDeliveryBoySearchQuery('');
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: selectedBoyId === 'unassigned' ? '600' : 'normal' }}>Unassigned</Text>
                  </TouchableOpacity>

                  {deliveryBoys?.filter(boy => 
                    boy.full_name?.toLowerCase().includes(deliveryBoySearchQuery.toLowerCase())
                  ).map(boy => {
                    const isSelected = selectedBoyId === boy.id.toString();
                    return (
                      <TouchableOpacity 
                        key={boy.id}
                        style={{ padding: 8, borderRadius: 6, backgroundColor: isSelected ? '#f1f5f9' : 'transparent', marginTop: 2 }}
                        onPress={() => {
                          setSelectedBoyId(boy.id.toString());
                          setRiderDropdownOpen(false);
                          setDeliveryBoySearchQuery('');
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: isSelected ? '600' : 'normal' }}>{boy.full_name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Date Range Filter */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>Date Range:</Text>
            {Platform.OS === 'web' ? (
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', backgroundColor: '#fff', outlineStyle: 'none' }}
              />
            ) : (
              <TouchableOpacity onPress={() => setShowStartPicker(true)} style={{ padding: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#fff' }}>
                <Text style={{ fontSize: 13 }}>{startDate || 'Start Date'}</Text>
              </TouchableOpacity>
            )}
            {showStartPicker && (
              <DateTimePicker
                value={startDate ? new Date(startDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowStartPicker(false);
                  if (date) setStartDate(date.toISOString().split('T')[0]);
                }}
              />
            )}

            <Text style={{ fontSize: 13, color: '#64748b' }}>to</Text>
            
            {Platform.OS === 'web' ? (
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', backgroundColor: '#fff', outlineStyle: 'none' }}
              />
            ) : (
              <TouchableOpacity onPress={() => setShowEndPicker(true)} style={{ padding: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#fff' }}>
                <Text style={{ fontSize: 13 }}>{endDate || 'End Date'}</Text>
              </TouchableOpacity>
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate ? new Date(endDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowEndPicker(false);
                  if (date) setEndDate(date.toISOString().split('T')[0]);
                }}
              />
            )}

            {(startDate || endDate) && (
              <TouchableOpacity onPress={() => { setStartDate(''); setEndDate(''); }} style={{ padding: 6, backgroundColor: '#fee2e2', borderRadius: 6 }}>
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={{flexDirection: 'row', gap: 10}}>
          <TouchableOpacity style={[styles.addBtn, {backgroundColor: '#4f46e5'}]} onPress={() => setBusesModalVisible(true)}>
            <Bus size={18} color="#fff" style={{marginRight: 6}} />
            <Text style={styles.addBtnText}>Buses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModalVisible(true)}>
            <Plus size={18} color="#fff" style={{marginRight: 6}} />
            <Text style={styles.addBtnText}>Add Orders</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tableContainer}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { flex: 0.8 }]}>Status</Text>
          <Text style={[styles.headerText, { flex: 1.5 }]}>Customer</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Order No</Text>
          <Text style={[styles.headerText, { flex: 1.5 }]}>Delivery Boy</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Amount</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Date / Time</Text>
          <Text style={[styles.headerText, { flex: 1.2 }]}>Created By</Text>
          <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>Actions</Text>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#4338ca" style={{marginTop: 50}} />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={orders}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderOrderItem}
          />
        )}
        <View style={styles.paginationContainer}>
          <TouchableOpacity 
            disabled={page <= 1} 
            onPress={() => setPage(p => Math.max(1, p - 1))}
            style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
          >
            <Text style={[styles.pageButtonText, page <= 1 && styles.pageButtonTextDisabled]}>Previous</Text>
          </TouchableOpacity>
          
          <Text style={styles.pageInfoText}>
            Page {pagination.page} of {pagination.totalPages || 1} (Showing {orders.length} of {pagination.total} total orders)
          </Text>
          
          <TouchableOpacity 
            disabled={page >= (pagination.totalPages || 1)} 
            onPress={() => setPage(p => Math.min(pagination.totalPages || 1, p + 1))}
            style={[styles.pageButton, page >= (pagination.totalPages || 1) && styles.pageButtonDisabled]}
          >
            <Text style={[styles.pageButtonText, page >= (pagination.totalPages || 1) && styles.pageButtonTextDisabled]}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      {deleteModalVisible && deleteOrderTarget && (
        <Modal visible={deleteModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: '90%', maxWidth: 450, padding: 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Delete Order Permanently?</Text>
                <TouchableOpacity onPress={() => { setDeleteModalVisible(false); setDeleteOrderTarget(null); }}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600', marginBottom: 12 }}>
                  Warning: This action cannot be undone. Are you sure you want to delete this order permanently?
                </Text>
                
                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, gap: 8 }}>
                  <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: 'bold' }}>Order No:</Text> {deleteOrderTarget.order_no}</Text>
                  <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: 'bold' }}>Invoice No:</Text> {deleteOrderTarget.invoice_no || 'N/A'}</Text>
                  <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: 'bold' }}>Customer:</Text> {deleteOrderTarget.customer_name} ({deleteOrderTarget.customer_phone})</Text>
                  <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: 'bold' }}>Amount:</Text> ₹{deleteOrderTarget.amount}</Text>
                  <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: 'bold' }}>Delivery Charge:</Text> ₹{deleteOrderTarget.delivery_charge || 0}</Text>
                  <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: 'bold' }}>Address:</Text> {deleteOrderTarget.address || 'N/A'}</Text>
                  <Text style={{ fontSize: 13, color: '#475569' }}><Text style={{ fontWeight: 'bold' }}>Status:</Text> {deleteOrderTarget.status}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <TouchableOpacity 
                  onPress={() => { setDeleteModalVisible(false); setDeleteOrderTarget(null); }}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#E2E8F0' }}
                >
                  <Text style={{ color: '#475569', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleDeleteOrder}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#EF4444' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Delete Permanently</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Create Order Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: isDesktop ? 1000 : '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Order</Text>
              <TouchableOpacity onPress={() => { setCreateModalVisible(false); setFormData(initialFormData); }}><Text style={{fontSize:20, color:'#64748b'}}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Customer Phone No</Text>
                  <TextInput style={styles.input} value={formData.customer_phone || ''} onChangeText={handlePatientSearch} placeholder="Phone No" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Customer Name</Text>
                  <TextInput style={styles.input} value={formData.customer_name || ''} onChangeText={(t) => setFormData({...formData, customer_name: t})} placeholder="Name" />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Ship to Phone No</Text>
                  <TextInput style={styles.input} value={formData.ship_to_phone || ''} onChangeText={(t) => setFormData({...formData, ship_to_phone: t.replace(/\s+/g, '')})} placeholder="Ship Phone" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Ship to Name</Text>
                  <TextInput style={styles.input} value={formData.ship_to_name || ''} onChangeText={(t) => setFormData({...formData, ship_to_name: t})} placeholder="Ship Name" />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={[styles.formCol, { flex: 2 }]}>
                  <Text style={styles.label}>Select Address</Text>
                  <View style={styles.dropdownWrapper}>
                    <Picker
                      selectedValue={formData.address || 'new'}
                      onValueChange={(val) => {
                        if (val === 'new') {
                          setFormData({...formData, address: '', location_link: ''});
                        } else {
                          const selected = patientAddresses.find(a => a.address === val);
                          setFormData({
                            ...formData, 
                            address: val, 
                            location_link: selected ? selected.location_link : ''
                          });
                        }
                      }}
                      style={styles.picker}
                    >
                      {patientAddresses.map((addr, idx) => (
                        <Picker.Item key={idx} label={addr.address} value={addr.address} />
                      ))}
                      <Picker.Item label="(Enter New Address)" value="new" />
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Address</Text>
                  <TextInput style={styles.input} value={formData.address || ''} onChangeText={(t) => setFormData({...formData, address: t})} placeholder="Full Address" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Delivery Location Link</Text>
                  <TextInput style={styles.input} value={formData.location_link || ''} onChangeText={(t) => setFormData({...formData, location_link: t})} placeholder="Google Maps URL" />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Order No</Text>
                  <TextInput style={styles.input} value={formData.order_no || ''} onChangeText={(t) => setFormData({...formData, order_no: t})} placeholder="Order No" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Invoice No</Text>
                  <TextInput style={styles.input} value={formData.invoice_no || ''} onChangeText={(t) => setFormData({...formData, invoice_no: t})} placeholder="Invoice No" />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput style={styles.input} value={formData.amount || ''} onChangeText={(t) => setFormData({...formData, amount: t})} placeholder="Amount" keyboardType="numeric" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Mode of Delivery</Text>
                  <View style={styles.dropdownWrapper}>
                    <Picker
                      selectedValue={formData.mode_of_delivery}
                      onValueChange={(val) => setFormData({...formData, mode_of_delivery: val})}
                      style={styles.picker}
                    >
                      <Picker.Item label="Counter" value="Counter" />
                        <Picker.Item label="Schedule Delivery" value="Schedule Delivery" />
                      <Picker.Item label="Local" value="Local" />
                      <Picker.Item label="Bus" value="Bus" />
                    </Picker>
                  </View>
                </View>
              </View>

              {formData.mode_of_delivery === 'Schedule Delivery' && (
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Scheduled Date</Text>
                    {Platform.OS === 'web' ? (
                      <input 
                        type="date" 
                        value={formData.scheduled_date || ''} 
                        onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit' }}
                      />
                    ) : (
                      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.input, {justifyContent: 'center'}]}>
                        <Text style={{color: formData.scheduled_date ? '#000' : '#94a3b8'}}>{formData.scheduled_date || 'YYYY-MM-DD'}</Text>
                      </TouchableOpacity>
                    )}
                    {showDatePicker && (
                      <DateTimePicker
                        value={formData.scheduled_date ? new Date(formData.scheduled_date) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(false);
                          if (selectedDate) {
                            setFormData({...formData, scheduled_date: selectedDate.toISOString().split('T')[0]});
                          }
                        }}
                      />
                    )}
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Scheduled Time</Text>
                    {Platform.OS === 'web' ? (
                      <input 
                        type="time" 
                        value={formData.scheduled_time || ''} 
                        onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit' }}
                      />
                    ) : (
                      <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.input, {justifyContent: 'center'}]}>
                        <Text style={{color: formData.scheduled_time ? '#000' : '#94a3b8'}}>{formData.scheduled_time || 'HH:MM'}</Text>
                      </TouchableOpacity>
                    )}
                    {showTimePicker && (
                      <DateTimePicker
                        value={formData.scheduled_time ? new Date(`2000-01-01T${formData.scheduled_time}:00`) : new Date()}
                        mode="time"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowTimePicker(false);
                          if (selectedDate) {
                            setFormData({...formData, scheduled_time: selectedDate.toTimeString().substring(0, 5)});
                          }
                        }}
                      />
                    )}
                  </View>
                </View>
              )}

              {formData.mode_of_delivery === 'Bus' && (
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Select Bus Route</Text>
                    <View style={styles.dropdownWrapper}>
                      <Picker
                        selectedValue=""
                        onValueChange={(val) => handleBusSelection(val)}
                        style={styles.picker}
                      >
                        <Picker.Item label="-- Choose from Database --" value="" />
                        {buses.map(b => (
                          <Picker.Item key={b.id} label={`${b.bus_name} (${b.departure_time || 'N/A'}) - to ${b.destination}`} value={b.id.toString()} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Bus Driver Name</Text>
                    <TextInput style={styles.input} value={formData.bus_driver_name || ''} onChangeText={(t) => setFormData({...formData, bus_driver_name: t})} placeholder="Driver Name" />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Bus Driver Number</Text>
                    <TextInput style={styles.input} value={formData.bus_driver_number || ''} onChangeText={(t) => setFormData({...formData, bus_driver_number: t.replace(/\s+/g, '')})} placeholder="Driver No" />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Bus Number</Text>
                    <TextInput style={styles.input} value={formData.bus_number || ''} onChangeText={(t) => setFormData({...formData, bus_number: t})} placeholder="OD-XX..." />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Travels Name</Text>
                    <TextInput style={styles.input} value={formData.bus_travels_name || ''} onChangeText={(t) => setFormData({...formData, bus_travels_name: t})} placeholder="Travels" />
                  </View>
                  
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Bus Date</Text>
                      {Platform.OS === 'web' ? (
                        <input 
                          type="date" 
                          value={formData.bus_date ? formData.bus_date.substring(0, 10) : ''} 
                          onChange={(e) => setFormData({...formData, bus_date: e.target.value})}
                          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit', marginBottom: 5 }}
                        />
                      ) : (
                        <TextInput style={styles.input} value={formData.bus_date ? formData.bus_date.substring(0, 10) : ''} onChangeText={(t) => setFormData({...formData, bus_date: t})} placeholder="YYYY-MM-DD" />
                      )}
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Bus Timing</Text>
                      {Platform.OS === 'web' ? (
                        <input 
                          type="time" 
                          value={formData.scheduled_time || ''} 
                          onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit' }}
                        />
                      ) : (
                        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.input, {justifyContent: 'center', height: 40}]}>
                          <Text style={{color: formData.scheduled_time ? '#000' : '#94a3b8'}}>{formData.scheduled_time || 'HH:MM'}</Text>
                        </TouchableOpacity>
                      )}
                      {showTimePicker && (
                        <DateTimePicker
                          value={formData.scheduled_time ? new Date(`2000-01-01T${formData.scheduled_time}:00`) : new Date()}
                          mode="time"
                          display="default"
                          onChange={(event, selectedDate) => {
                            setShowTimePicker(false);
                            if (selectedDate) {
                              setFormData({...formData, scheduled_time: selectedDate.toTimeString().substring(0, 5)});
                            }
                          }}
                        />
                      )}
                    </View>
                </View>
              )}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Payment Mode</Text>
                  <View style={styles.dropdownWrapper}>
                    <Picker
                      selectedValue={formData.payment_mode}
                      onValueChange={(val) => setFormData({...formData, payment_mode: val})}
                      style={styles.picker}
                    >
                      <Picker.Item label="POD (Pay on Delivery)" value="POD" />
                      <Picker.Item label="Prepaid" value="Prepaid" />
                    </Picker>
                  </View>
                </View>
                {formData.payment_mode === 'Prepaid' && (
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Transaction Number</Text>
                    <TextInput style={styles.input} value={formData.payment_txn_id || ''} onChangeText={(t) => setFormData({...formData, payment_txn_id: t})} placeholder="Txn ID" />
                  </View>
                )}
              </View>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Delivery Charge</Text>
                  <TextInput style={styles.input} value={formData.delivery_charge || ''} onChangeText={(t) => setFormData({...formData, delivery_charge: t})} placeholder="Charge" keyboardType="numeric" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Order Date</Text>
                  <TextInput style={styles.input} value={formData.order_date || ''} onChangeText={(t) => setFormData({...formData, order_date: t})} placeholder="YYYY-MM-DD" />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Order Time</Text>
                  <TextInput style={styles.input} value={formData.order_time || ''} onChangeText={(t) => setFormData({...formData, order_time: t})} placeholder="HH:MM" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Notes</Text>
                  <TextInput style={[styles.input, {height: 60}]} multiline value={formData.notes || ''} onChangeText={(t) => setFormData({...formData, notes: t})} placeholder="Initial Notes..." />
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#ef4444', marginRight: 10}]} onPress={() => setFormData(initialFormData)}>
                <Text style={styles.saveBtnText}>Clear Form</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateSubmit}>
                <Text style={styles.saveBtnText}>Save Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Details Modal */}
      {selectedOrder && (
      <Modal visible={viewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: isDesktop ? 600 : '95%', padding: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details ({selectedOrder.order_no})</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}><Text style={{fontSize:20, color:'#64748b'}}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={{marginTop: 15, maxHeight: 500}}>
               <View style={{ marginBottom: 15 }}>
                 <Text style={{fontWeight:'bold', color: '#64748b', marginBottom: 5}}>Status: {selectedOrder.status}</Text>
               </View>

               <View style={styles.formRow}>
                 <View style={styles.formCol}>
                   <Text style={styles.label}>Order Number</Text>
                   <TextInput style={styles.input} value={selectedOrder.order_no || ''} onChangeText={t => setSelectedOrder({...selectedOrder, order_no: t})} placeholder="Order No" />
                 </View>
                 <View style={styles.formCol}>
                   <Text style={styles.label}>Invoice Number</Text>
                   <TextInput style={styles.input} value={selectedOrder.invoice_no || ''} onChangeText={t => setSelectedOrder({...selectedOrder, invoice_no: t})} placeholder="Invoice No" />
                 </View>
                 <View style={styles.formCol}>
                   <Text style={styles.label}>Amount (₹)</Text>
                   <TextInput style={styles.input} value={selectedOrder.amount !== null && selectedOrder.amount !== undefined ? selectedOrder.amount.toString() : ''} onChangeText={t => setSelectedOrder({...selectedOrder, amount: t})} keyboardType="numeric" placeholder="Amount" />
                 </View>
               </View>

               <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Customer Name</Text>
                    <TextInput style={styles.input} value={selectedOrder.customer_name || ''} onChangeText={t => setSelectedOrder({...selectedOrder, customer_name: t})} placeholder="Customer Name" />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Customer Phone</Text>
                    <TextInput style={styles.input} value={selectedOrder.customer_phone || ''} onChangeText={t => setSelectedOrder({...selectedOrder, customer_phone: t.replace(/\s+/g, '')})} placeholder="Customer Phone" />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Ship To Name (Optional)</Text>
                    <TextInput style={styles.input} value={selectedOrder.ship_to_name || ''} onChangeText={t => setSelectedOrder({...selectedOrder, ship_to_name: t})} placeholder="Ship To Name" />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Ship To Phone (Optional)</Text>
                    <TextInput style={styles.input} value={selectedOrder.ship_to_phone || ''} onChangeText={t => setSelectedOrder({...selectedOrder, ship_to_phone: t.replace(/\s+/g, '')})} placeholder="Ship To Phone" />
                  </View>
                </View>

               <View style={styles.formRow}>
                 <View style={styles.formCol}>
                   <Text style={styles.label}>Delivery Mode</Text>
                   <View style={styles.dropdownWrapper}>
                     <Picker
                       selectedValue={selectedOrder.mode_of_delivery}
                       onValueChange={(val) => setSelectedOrder({...selectedOrder, mode_of_delivery: val})}
                       style={styles.picker}
                     >
                       <Picker.Item label="Counter" value="Counter" />
                       <Picker.Item label="Schedule Delivery" value="Schedule Delivery" />
                       <Picker.Item label="Local" value="Local" />
                       <Picker.Item label="Bus" value="Bus" />
                     </Picker>
                   </View>
                 </View>
                 <View style={styles.formCol}>
                   <Text style={styles.label}>Delivery Location Link</Text>
                   <TextInput style={styles.input} value={selectedOrder.location_link || ''} onChangeText={t => setSelectedOrder({...selectedOrder, location_link: t})} placeholder="Google Maps Link" />
                 </View>
               </View>

               {selectedOrder.mode_of_delivery === 'Bus' && (
                 <View style={{marginTop: 20, backgroundColor: '#f8fafc', padding: 15, borderRadius: 8}}>
                    <Text style={{fontWeight:'bold', marginBottom: 10}}>Bus Info</Text>
                    <TextInput style={[styles.input, {marginBottom:5}]} placeholder="Travels Name" value={selectedOrder.bus_travels_name || ''} onChangeText={t => setSelectedOrder({...selectedOrder, bus_travels_name: t})} />
                    <TextInput style={[styles.input, {marginBottom:5}]} placeholder="Driver Name" value={selectedOrder.bus_driver_name || ''} onChangeText={t => setSelectedOrder({...selectedOrder, bus_driver_name: t})} />
                    <TextInput style={[styles.input, {marginBottom:5}]} placeholder="Driver Number" value={selectedOrder.bus_driver_number || ''} onChangeText={t => setSelectedOrder({...selectedOrder, bus_driver_number: t.replace(/\s+/g, '')})} />
                    
                      <TextInput style={[styles.input, {marginBottom:5}]} placeholder="Bus No" value={selectedOrder.bus_number || ''} onChangeText={t => setSelectedOrder({...selectedOrder, bus_number: t})} />
                      {Platform.OS === 'web' ? (
                        <input 
                          type="date" 
                          value={selectedOrder.bus_date ? selectedOrder.bus_date.substring(0, 10) : ''} 
                          onChange={(e) => setSelectedOrder({...selectedOrder, bus_date: e.target.value})}
                          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit', marginBottom: 5 }}
                        />
                      ) : (
                        <TextInput style={[styles.input, {marginBottom:5}]} placeholder="Bus Date (YYYY-MM-DD)" value={selectedOrder.bus_date ? selectedOrder.bus_date.substring(0, 10) : ''} onChangeText={t => setSelectedOrder({...selectedOrder, bus_date: t})} />
                      )}
                      {Platform.OS === 'web' ? (
                        <input 
                          type="time" 
                          value={selectedOrder.scheduled_time || ''} 
                          onChange={(e) => setSelectedOrder({...selectedOrder, scheduled_time: e.target.value})}
                          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit', marginBottom: 5 }}
                        />
                      ) : (
                        <TextInput style={[styles.input, {marginBottom:5}]} placeholder="Bus Timing (HH:MM)" value={selectedOrder.scheduled_time || ''} onChangeText={t => setSelectedOrder({...selectedOrder, scheduled_time: t})} />
                      )}
                 </View>
               )}

               <View style={{marginTop: 20, backgroundColor: '#f0fdf4', padding: 15, borderRadius: 8}}>
                  <Text style={{fontWeight:'bold', marginBottom: 10}}>Payment Info</Text>
                  <View style={styles.dropdownWrapper}>
                    <Picker
                      selectedValue={selectedOrder.payment_mode || 'POD'}
                      onValueChange={(val) => setSelectedOrder({...selectedOrder, payment_mode: val})}
                      style={[styles.picker, {marginBottom:5}]}
                    >
                      <Picker.Item label="Cash" value="Cash" />
                      <Picker.Item label="Online" value="Online" />
                      <Picker.Item label="Prepaid" value="Prepaid" />
                      <Picker.Item label="POD" value="POD" />
                    </Picker>
                  </View>
                  <TextInput style={[styles.input, {marginBottom:5}]} placeholder="Paid Amount" value={selectedOrder.paid_amount || ''} onChangeText={t => setSelectedOrder({...selectedOrder, paid_amount: t})} />
                  <TextInput style={[styles.input, {marginBottom:5}]} placeholder="Txn ID" value={selectedOrder.payment_txn_id || ''} onChangeText={t => setSelectedOrder({...selectedOrder, payment_txn_id: t})} />
                  {selectedOrder.payment_attachment && <Image source={{uri: `https://napi.bharatmedicalhallplus.com${selectedOrder.payment_attachment}`}} style={{width: 100, height: 100, marginTop: 10}}/>}
               </View>

               <View style={{marginTop: 20}}>
                 <Text style={{fontWeight:'bold', marginBottom: 10}}>Address Info</Text>
                 <TextInput 
                   style={styles.input} 
                   value={editAddress || ''} 
                   onChangeText={setEditAddress} 
                   multiline 
                 />
                 {selectedOrder.location_link && (
                   <Text style={{color: '#3b82f6', marginTop: 5}} onPress={() => Platform.OS==='web'?window.open(selectedOrder.location_link,'_blank'):Linking.openURL(selectedOrder.location_link)}>
                     Open Location Link
                   </Text>
                 )}
               </View>

               <View style={{marginTop: 20}}>
                 <Text style={{fontWeight:'bold', marginBottom: 10}}>Notes</Text>
                 <View style={{backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8}}>
                    {selectedOrder.notes && selectedOrder.notes.length > 0 ? (typeof selectedOrder.notes === 'string' ? JSON.parse(selectedOrder.notes) : selectedOrder.notes)?.map((n, i) => (
                      <View key={i} style={{marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderColor: '#e2e8f0'}}>
                        <Text style={{fontSize: 12, color: '#64748b'}}>{n.author} at {new Date(n.timestamp).toLocaleString()}</Text>
                        <Text style={{fontSize: 14, color: '#1e293b', marginTop: 2}}>{n.text}</Text>
                      </View>
                    )) : null}
                    <TextInput
                      style={[styles.input, {marginTop: 10, backgroundColor: '#fff'}]}
                      placeholder="Add a new note..."
                      value={newNote || ''}
                      onChangeText={setNewNote}
                    />
                 </View>
               </View>

            </ScrollView>
            <View style={styles.modalFooter}>
               {selectedOrder.status === 'Customer Not Available' && (
                 <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#f59e0b', marginRight: 'auto'}]} onPress={handleResetStatus}>
                   <Text style={styles.saveBtnText}>Reset to Pending</Text>
                 </TouchableOpacity>
               )}
               <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateOrderDetails}>
                 <Text style={styles.saveBtnText}>Save Updates</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      )}

          {/* Buses Modal */}
      <Modal visible={busesModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: isDesktop ? 900 : '95%', height: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBus ? 'Edit Bus Details' : isAddingBus ? 'Add New Bus' : 'Manage Buses'}
              </Text>
              <TouchableOpacity onPress={() => {
                if (editingBus || isAddingBus) {
                  setEditingBus(null);
                  setIsAddingBus(false);
                } else {
                  setBusesModalVisible(false);
                }
              }}>
                <Text style={{fontSize:20, color:'#64748b'}}>✕</Text>
              </TouchableOpacity>
            </View>

            {(editingBus || isAddingBus) ? (
              <ScrollView style={styles.modalBody}>
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Bus Name</Text>
                    <TextInput style={styles.input} value={busForm.bus_name} onChangeText={t => setBusForm({...busForm, bus_name: t})} placeholder="e.g. Biswakarma" />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Travels / Operator Name</Text>
                    <TextInput style={styles.input} value={busForm.operator_name} onChangeText={t => setBusForm({...busForm, operator_name: t})} placeholder="e.g. Travels Co" />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Bus Number</Text>
                    <TextInput style={styles.input} value={busForm.bus_number} onChangeText={t => setBusForm({...busForm, bus_number: t})} placeholder="e.g. OD-11G-6920" />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Route Code</Text>
                    <TextInput style={styles.input} value={busForm.route_code} onChangeText={t => setBusForm({...busForm, route_code: t})} placeholder="e.g. R001" />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Source Stop</Text>
                    <TextInput style={styles.input} value={busForm.source} onChangeText={t => setBusForm({...busForm, source: t})} placeholder="e.g. Golei Stop" />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Destination Stop</Text>
                    <TextInput style={styles.input} value={busForm.destination} onChangeText={t => setBusForm({...busForm, destination: t})} placeholder="e.g. Udla" />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Departure Time</Text>
                    <TextInput style={styles.input} value={busForm.departure_time} onChangeText={t => setBusForm({...busForm, departure_time: t})} placeholder="e.g. 18:00" />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Parcel Contact Person</Text>
                    <TextInput style={styles.input} value={busForm.parcel_contact_person} onChangeText={t => setBusForm({...busForm, parcel_contact_person: t})} placeholder="e.g. Driver Name" />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Driver Mobile Number</Text>
                    <TextInput style={styles.input} value={busForm.mobile_no} onChangeText={t => setBusForm({...busForm, mobile_no: t})} placeholder="Driver Phone" />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Remarks</Text>
                    <TextInput style={styles.input} value={busForm.remarks} onChangeText={t => setBusForm({...busForm, remarks: t})} placeholder="Any special notes..." />
                  </View>
                </View>

                <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10}}>
                  <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#ef4444'}]} onPress={() => { setEditingBus(null); setIsAddingBus(false); }}>
                    <Text style={styles.saveBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBus}>
                    <Text style={styles.saveBtnText}>Save Bus</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <View style={{flex: 1}}>
                <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10}}>
                  <TouchableOpacity style={[styles.addBtn, {backgroundColor: '#10b981'}]} onPress={startAddBus}>
                    <Plus size={16} color="#fff" style={{marginRight: 6}} />
                    <Text style={styles.addBtnText}>Add New Bus</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={{flex: 1}}>
                  <View style={{borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden'}}>
                    <View style={{flexDirection: 'row', backgroundColor: '#f8fafc', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0'}}>
                      <Text style={{flex: 1.5, fontWeight: '700', fontSize: 13, color: '#475569'}}>Bus Details</Text>
                      <Text style={{flex: 1.2, fontWeight: '700', fontSize: 13, color: '#475569'}}>Route Stop</Text>
                      <Text style={{flex: 1, fontWeight: '700', fontSize: 13, color: '#475569'}}>Timing</Text>
                      <Text style={{flex: 1.2, fontWeight: '700', fontSize: 13, color: '#475569'}}>Contact</Text>
                      <Text style={{flex: 0.8, fontWeight: '700', fontSize: 13, color: '#475569', textAlign: 'center'}}>Actions</Text>
                    </View>

                    {buses.length === 0 ? (
                      <View style={{padding: 20, alignItems: 'center'}}><Text style={{color: '#64748b'}}>No buses found.</Text></View>
                    ) : (
                      buses.map((bus, idx) => (
                        <View key={bus.id} style={{flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc'}}>
                          <View style={{flex: 1.5}}>
                            <Text style={{fontWeight: '600', fontSize: 14, color: '#0f172a'}}>{bus.bus_name}</Text>
                            <Text style={{fontSize: 12, color: '#64748b'}}>{bus.bus_number}</Text>
                          </View>
                          <View style={{flex: 1.2}}>
                            <Text style={{fontSize: 13, color: '#334155'}}>{bus.source || 'N/A'} ➔ {bus.destination || 'N/A'}</Text>
                            {bus.route_code && <Text style={{fontSize: 11, color: '#64748b'}}>Code: {bus.route_code}</Text>}
                          </View>
                          <View style={{flex: 1}}>
                            <Text style={{fontSize: 13, color: '#334155'}}>{bus.departure_time || 'N/A'}</Text>
                          </View>
                          <View style={{flex: 1.2}}>
                            <Text style={{fontSize: 13, color: '#334155', fontWeight: '500'}}>{bus.parcel_contact_person || 'N/A'}</Text>
                            {bus.mobile_no && <Text style={{fontSize: 12, color: '#3b82f6'}}>{bus.mobile_no}</Text>}
                          </View>
                          <View style={{flex: 0.8, alignItems: 'center'}}>
                            <TouchableOpacity style={{backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6}} onPress={() => startEditBus(bus)}>
                              <Text style={{color: '#4338ca', fontSize: 12, fontWeight: '600'}}>Edit</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>
      {/* Searchable Rider Assignment Modal */}
      {assignOrder && (
        <Modal visible={assignModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isDesktop ? 450 : '90%', maxHeight: '70%', padding: 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assign Rider (Order #{assignOrder.order_no})</Text>
                <TouchableOpacity onPress={() => { setAssignModalVisible(false); setAssignOrder(null); }}>
                  <Text style={{ fontSize: 20, color: '#64748b' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.searchContainer, { width: '100%', marginBottom: 15 }]}>
                <Search size={18} color="#94a3b8" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search Rider..."
                  value={assignSearchQuery}
                  onChangeText={setAssignSearchQuery}
                  autoFocus
                />
              </View>

              <ScrollView style={{ flex: 1 }}>
                {/* Option to clear assignment (unassign) */}
                <TouchableOpacity 
                  style={{ padding: 12, borderRadius: 8, backgroundColor: '#fee2e2', marginBottom: 10 }}
                  onPress={() => {
                    handleAssignBoy(assignOrder.id, 'null');
                    setAssignModalVisible(false);
                    setAssignOrder(null);
                  }}
                >
                  <Text style={{ fontSize: 14, color: '#ef4444', fontWeight: '600', textAlign: 'center' }}>Unassign Rider</Text>
                </TouchableOpacity>

                {deliveryBoys?.filter(boy => 
                  boy.full_name?.toLowerCase().includes(assignSearchQuery.toLowerCase())
                ).map((boy) => (
                  <TouchableOpacity 
                    key={boy.id}
                    style={{ 
                      padding: 12, 
                      borderRadius: 8, 
                      backgroundColor: assignOrder.delivery_boy_id?.toString() === boy.id.toString() ? '#e0e7ff' : '#f8fafc',
                      marginBottom: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onPress={() => {
                      handleAssignBoy(assignOrder.id, boy.id);
                      setAssignModalVisible(false);
                      setAssignOrder(null);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                       <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b' }}>{boy.full_name}</Text>
                       {boy.recommended && (
                         <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                           <Text style={{ fontSize: 10, color: '#15803d', fontWeight: 'bold' }}>⭐ Recommended (Nearest)</Text>
                         </View>
                       )}
                      {(() => {
                        const pendingOrders = boy.pending_orders_count !== undefined ? boy.pending_orders_count : boy.pending_count;
                        const pendingTasks = boy.pending_tasks_count || 0;
                        if (pendingOrders !== undefined) {
                          return (
                            <Text style={{ fontSize: 12, color: (pendingOrders > 0 || pendingTasks > 0) ? '#d97706' : '#10b981', fontWeight: '500' }}>
                              ({pendingOrders} orders, {pendingTasks} tasks)
                            </Text>
                          );
                        }
                        return null;
                      })()}
                    </View>{assignOrder.delivery_boy_id?.toString() === boy.id.toString() && <CheckCircle size={16} color="#4338ca" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10, zIndex: 100, elevation: 10, position: 'relative' },
  filters: { flexDirection: 'row', gap: 10, flex: 1, flexWrap: 'wrap', zIndex: 100, elevation: 10, position: 'relative' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, height: 32, width: 210 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, height: '100%', outlineStyle: 'none', fontSize: 13 },
  dropdownWrapper: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#fff', height: 32, justifyContent: 'center', minWidth: 140 },
  picker: { height: 32, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 6, ...Platform.select({ web: { outlineStyle: 'none' } }), fontSize: 13 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  tableContainer: { flex: 1, minHeight: 400, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  cell: { paddingRight: 8 },
  cellText: { fontSize: 13, color: '#334155' },
  cellTextBold: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  cellSubText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#fff', textTransform: 'capitalize' },
  avatar: { width: 20, height: 20, borderRadius: 10, marginRight: 6 },
  pickerWrapper: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, backgroundColor: '#fff', height: 28, justifyContent: 'center' },
  inlinePicker: { height: 28, fontSize: 12, borderWidth: 0, backgroundColor: 'transparent', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  actionBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '95%', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  modalBody: { flex: 1 },
  formRow: { flexDirection: 'row', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  formCol: { flex: 1, minWidth: 200 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 2, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, backgroundColor: '#f8fafc' },
  modalFooter: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16, marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end' },
  saveBtn: { backgroundColor: '#1e293b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 8,
    alignSelf: 'flex-end'
  },
  pageButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#4338ca',
    justifyContent: 'center',
    alignItems: 'center'
  },
  pageButtonDisabled: {
    backgroundColor: '#e2e8f0'
  },
  pageButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  pageButtonTextDisabled: {
    color: '#94a3b8'
  },
  pageInfoText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginHorizontal: 4
  }
});
