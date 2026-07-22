import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Modal, TextInput, useWindowDimensions, ScrollView, Image } from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { Package, MapPin, Bus, User, Map, CheckCircle, Search, Calendar, FileText, Eye, Share2, Trash2, Plus, Phone, Navigation, ChevronDown, X } from 'lucide-react-native';

export default function SalesOrders({ deliveryBoys, onStartAssignment }) {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('All'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBoyId, setSelectedBoyId] = useState('All');
  
  const [riderDropdownOpen, setRiderDropdownOpen] = useState(false);
  const [deliveryBoySearchQuery, setDeliveryBoySearchQuery] = useState('');

  const [assignOrder, setAssignOrder] = useState(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [newNote, setNewNote] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [editCreatedAtDate, setEditCreatedAtDate] = useState('');
  const [editCreatedAtTime, setEditCreatedAtTime] = useState('');

  // Buses list and manage states
  const [buses, setBuses] = useState([]);
  const [busesModalVisible, setBusesModalVisible] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [isAddingBus, setIsAddingBus] = useState(false);
  const [busForm, setBusForm] = useState({
    bus_name: '', operator_name: '', bus_number: '', route_code: '',
    source: '', destination: '', departure_time: '',
    parcel_contact_person: '', mobile_no: '', remarks: ''
  });

  // Current order's bus details
  const [busDetails, setBusDetails] = useState({
    bus_travels_name: '',
    bus_driver_name: '',
    bus_driver_number: '',
    bus_number: '',
    bus_date: '',
    scheduled_time: ''
  });

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchSalesOrders = async (silent = false, targetPage = page) => {
    try {
      if (!silent) setLoading(true);
      let url = 'https://napi.bharatmedicalhallplus.com/ecogreen/sales-orders';
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
      console.error('Error fetching sales orders:', err.message || err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchBuses = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/buses');
      if (res.data && res.data.success) {
        setBuses(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching buses', err);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchSalesOrders(false, 1);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    fetchSalesOrders(false, 1);
  }, [startDate, endDate, selectedBoyId, assignmentFilter]);

  useEffect(() => {
    fetchSalesOrders(false, page);
  }, [page]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchSalesOrders(true, page);
    }, 10000);
    return () => clearInterval(interval);
  }, [page, searchQuery, startDate, endDate, selectedBoyId, assignmentFilter]);

  const handleAssignBoy = async (orderId, boyId) => {
    try {
      let assignedBy = null;
      if (typeof window !== 'undefined') {
        const adminUser = localStorage.getItem('superAdminUser') || localStorage.getItem('subAdminUser');
        const empUser = localStorage.getItem('employeeUser');
        if (adminUser) {
          assignedBy = JSON.parse(adminUser).id;
        } else if (empUser) {
          assignedBy = JSON.parse(empUser).id;
        }
      }

      const targetOrder = assignOrder || orders.find(o => o.id === orderId);

      const payload = {
        delivery_boy_id: boyId === 'null' ? null : boyId,
        delivery_type: targetOrder?.delivery_type || 'Local',
        bus_details: targetOrder?.bus_details || null,
        assigned_by: assignedBy
      };

      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/ecogreen/sales-orders/assign/${orderId}`, payload);
      if (res.data.success) {
        alert('Rider assigned successfully!');
        fetchSalesOrders(true);
      }
    } catch (err) {
      alert('Failed to assign order');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      let author = 'Employee';
      if (typeof window !== 'undefined') {
        const adminUser = localStorage.getItem('superAdminUser') || localStorage.getItem('subAdminUser');
        const empUser = localStorage.getItem('employeeUser');
        if (adminUser) {
          author = JSON.parse(adminUser).full_name || JSON.parse(adminUser).name || 'Admin';
        } else if (empUser) {
          author = JSON.parse(empUser).name || 'Employee';
        }
      }
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/ecogreen/sales-orders/notes/${selectedOrder.id}`, {
        note: newNote,
        author: author
      });
      if (res.data.success) {
        setSelectedOrder(res.data.data);
        setNewNote('');
        fetchSalesOrders(true);
      }
    } catch (err) {
      alert('Failed to add note');
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/ecogreen/sales-orders/status/${selectedOrder.id}`, { status });
      if (res.data.success) {
        setSelectedOrder(res.data.data);
        fetchSalesOrders(true);
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput) return;
    try {
      setOtpVerifying(true);
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/ecogreen/sales-orders/otp/${selectedOrder.id}`, { otp: otpInput });
      if (res.data.success) {
        alert('Order delivered successfully!');
        setSelectedOrder(res.data.data);
        setOtpInput('');
        fetchSalesOrders();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Invalid OTP verification failed.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSelectOrderForView = (order) => {
    setSelectedOrder(order);
    setEditAddress(typeof order.patient_address === 'object' ? order.patient_address?.address || order.patient_address?.locality || '' : order.patient_address || '');
    
    if (order.created_at) {
      try {
        const d = new Date(order.created_at);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          setEditCreatedAtDate(`${year}-${month}-${day}`);
          setEditCreatedAtTime(`${hours}:${minutes}`);
        } else {
          setEditCreatedAtDate('');
          setEditCreatedAtTime('');
        }
      } catch (e) {
        setEditCreatedAtDate('');
        setEditCreatedAtTime('');
      }
    } else {
      setEditCreatedAtDate('');
      setEditCreatedAtTime('');
    }

    // Parse bus details
    let bDetails = {
      bus_travels_name: '',
      bus_driver_name: '',
      bus_driver_number: '',
      bus_number: '',
      bus_date: '',
      scheduled_time: ''
    };
    if (order.bus_details) {
      try {
        const parsed = typeof order.bus_details === 'string' ? JSON.parse(order.bus_details) : order.bus_details;
        if (parsed) bDetails = { ...bDetails, ...parsed };
      } catch (e) {
        console.error(e);
      }
    }
    setBusDetails(bDetails);
    setViewModalVisible(true);
  };

  const handleUpdateOrderDetails = async () => {
    try {
      let finalCreatedAt = null;
      if (editCreatedAtDate) {
        finalCreatedAt = `${editCreatedAtDate}T${editCreatedAtTime || '00:00'}:00`;
      }

      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/ecogreen/sales-orders/details/${selectedOrder.id}`, {
        patient_address: editAddress,
        patient_name: selectedOrder.patient_name,
        patient_contact_no: selectedOrder.patient_contact_no,
        delivery_type: selectedOrder.delivery_type || 'Local',
        bus_details: busDetails,
        order_no: selectedOrder.order_no,
        invoice_id: selectedOrder.invoice_id,
        created_at: finalCreatedAt
      });
      if (res.data.success) {
        alert('Order details updated successfully!');
        setViewModalVisible(false);
        fetchSalesOrders();
      }
    } catch (err) {
      alert('Failed to update order details');
    }
  };

  const handleDeleteOrder = async (item) => {
    const proceed = Platform.OS === 'web' ? window.confirm(`Are you sure you want to delete sales order #${item.order_no}?`) : true;
    if (!proceed) return;
    try {
      const res = await axios.delete(`https://napi.bharatmedicalhallplus.com/ecogreen/sales-orders/${item.id}`);
      if (res.data.success) {
        alert('Order deleted successfully');
        fetchSalesOrders();
      }
    } catch (err) {
      alert('Failed to delete order');
    }
  };

  const handleShareOrder = async (item) => {
    try {
      let header = '';
      const bDetails = typeof item.bus_details === 'string' ? JSON.parse(item.bus_details || '{}') : item.bus_details || {};
      
      if (item.delivery_type === 'Bus') {
        header = `${bDetails.bus_travels_name || 'Bus Travels'} Bus Driver\nPhone: +91${bDetails.bus_driver_number || ''}`;
      } else if (item.delivery_type === 'Schedule Delivery') {
        header = `Scheduled Delivery\nCustomer: ${item.patient_name || 'N/A'}\nPhone: ${item.patient_contact_no ? '+91' + item.patient_contact_no : 'N/A'}`;
      } else {
        header = `${item.patient_name || 'Customer'}\nPhone: ${item.patient_contact_no ? '+91' + item.patient_contact_no : 'N/A'}`;
      }

      const addr = typeof item.patient_address === 'object' ? item.patient_address?.address || item.patient_address?.locality || 'N/A' : item.patient_address || 'N/A';
      let msg = `${header}\n\n` +
                `Order Information:\n` +
                `Order No: ${item.order_no || 'N/A'}\n` +
                `Invoice No: ${item.invoice_id || 'N/A'}\n\n` +
                `Amount: ₹${item.total_price || '0.00'}\n` +
                `OTP: ${item.delivery_otp || 'N/A'}\n\n` +
                `Delivery Boy Information:\n` +
                `Name: ${deliveryBoys.find(b => b.id.toString() === String(item.delivery_boy_id))?.full_name || 'Not assigned'}`;

      if (item.delivery_type === 'Bus') {
        msg += `\n\nBus Information:\n` +
               `Bus Name: ${bDetails.bus_travels_name || '--'}\n` +
               `Bus No: ${bDetails.bus_number || '--'}\n` +
               `Bus Contact Number: ${bDetails.bus_driver_number || '--'}\n` +
               `Bus Date: ${bDetails.bus_date || '--'}\n` +
               `Bus Time: ${bDetails.scheduled_time || '--'}`;
      }
      
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(msg);
        alert('Copied to clipboard!');
      } else {
        const { Share } = require('react-native');
        await Share.share({ message: msg });
      }
    } catch (error) {
      console.error('Error sharing:', error.message || error);
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
    } catch (err) {
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

  const handleDeleteBus = async (busId) => {
    if (!confirm('Are you sure you want to delete this bus?')) return;
    try {
      const res = await axios.delete(`https://napi.bharatmedicalhallplus.com/buses/${busId}`);
      if (res.data.success) {
        alert('Bus deleted successfully!');
        fetchBuses();
      }
    } catch (err) {
      alert('Failed to delete bus');
    }
  };

  const renderOrderItem = ({ item, index }) => {
    let statusColor = '#3b82f6';
    if (item.status === 'Assigned') statusColor = '#f59e0b';
    else if (item.status === 'Delivered') statusColor = '#10b981';

    const dboy = deliveryBoys.find(b => b.id.toString() === String(item.delivery_boy_id));

    if (!isDesktop) {
      return (
        <View style={{ borderLeftColor: statusColor, borderLeftWidth: 4, backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {item.delivery_type === 'Bus' ? <Bus size={14} color="#64748b" /> : 
               item.delivery_type === 'Local' ? <MapPin size={14} color="#64748b" /> :
               <Package size={14} color="#64748b" />}
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1e293b' }}>
                {item.order_no}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor }]}>
              <Text style={styles.badgeText}>{item.status || 'Pending'}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 4 }}>{item.patient_name || 'Walk-in'}</Text>
          {item.patient_contact_no ? <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Phone: {item.patient_contact_no}</Text> : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#64748b' }}>Date: {item.created_at ? item.created_at.substring(0,10) : ''}</Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Creator: {item.createduser || 'System'}</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#0f172a' }}>₹{item.total_price || 0}</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, backgroundColor: '#f8fafc', padding: 8, borderRadius: 6 }}>
            <View style={{ flex: 1 }}>
              {item.status === 'Delivered' ? (
                 <View style={{flexDirection: 'row', alignItems: 'center'}}>
                   <User size={14} color="#64748b" style={{marginRight: 4}}/>
                   <Text style={{ fontSize: 12, color: '#334155', flex: 1 }} numberOfLines={1}>{dboy?.full_name || item.delivered_by || 'Unassigned'}</Text>
                 </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.pickerWrapper, { paddingHorizontal: 8, height: 28, justifyContent: 'center', backgroundColor: '#fff', width: 140 }]}
                  onPress={() => {
                    const isStoreOrCounter = item.mode_of_delivery === 'Store' || item.delivery_type === 'Store' || item.mode_of_delivery === 'Counter' || item.delivery_type === 'Counter';
                    if (isStoreOrCounter && onStartAssignment) {
                      onStartAssignment({ ...item, type: 'sales_order' });
                    } else {
                      setAssignOrder(item);
                      setAssignSearchQuery('');
                      setAssignModalVisible(true);
                    }
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#334155' }} numberOfLines={1}>
                      {dboy?.full_name || 'Assign To'}
                    </Text>
                    <ChevronDown size={12} color="#64748b" style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity onPress={() => handleSelectOrderForView(item)} style={[styles.actionBtn, {backgroundColor: '#e0e7ff'}]}>
                 <Eye size={14} color="#4338ca" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleShareOrder(item)} style={[styles.actionBtn, {backgroundColor: '#fef3c7'}]}>
                 <Share2 size={14} color="#b45309" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteOrder(item)} style={[styles.actionBtn, {backgroundColor: '#fee2e2'}]}>
                 <Trash2 size={14} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff' }]}>
        {/* Status */}
        <View style={[styles.cell, { flex: 0.8, flexDirection: 'row', alignItems: 'center' }]}>
          {item.delivery_type === 'Bus' ? <Bus size={14} color="#64748b" style={{marginRight: 4}}/> : 
           item.delivery_type === 'Local' ? <MapPin size={14} color="#64748b" style={{marginRight: 4}}/> :
           <Package size={14} color="#64748b" style={{marginRight: 4}}/>}
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{item.status || 'Pending'}</Text>
          </View>
        </View>

        {/* Customer */}
        <View style={[styles.cell, { flex: 1.5 }]}>
          <Text style={styles.cellTextBold}>{item.patient_name || 'Walk-in'}</Text>
          {item.patient_contact_no ? <Text style={styles.cellSubText}>{item.patient_contact_no}</Text> : null}
          <View style={{backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, alignSelf: 'flex-start'}}>
            <Text style={{fontSize: 9, color: '#b45309', fontWeight: 'bold'}}>SALES ORDER</Text>
          </View>
        </View>

        {/* Order/Invoice No */}
        <View style={[styles.cell, { flex: 1 }]}>
          <Text style={styles.cellTextBold}>{item.order_no}</Text>
          {item.invoice_id ? <Text style={styles.cellSubText}>{item.invoice_id}</Text> : null}
        </View>

        {/* Delivery Boy */}
        <View style={[styles.cell, { flex: 1.5 }]}>
          {item.status === 'Delivered' ? (
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
               <User size={16} color="#94a3b8" style={{marginRight: 4}}/>
               <Text style={styles.cellText} numberOfLines={1}>{dboy?.full_name || item.delivered_by || 'Unassigned'}</Text>
             </View>
          ) : (
            <TouchableOpacity 
              style={[styles.pickerWrapper, { paddingHorizontal: 8, height: 28, justifyContent: 'center', backgroundColor: '#f8fafc' }]}
              onPress={() => {
                const isStoreOrCounter = item.mode_of_delivery === 'Store' || item.delivery_type === 'Store' || item.mode_of_delivery === 'Counter' || item.delivery_type === 'Counter';
                if (isStoreOrCounter && onStartAssignment) {
                  onStartAssignment({ ...item, type: 'sales_order' });
                } else {
                  setAssignOrder(item);
                  setAssignSearchQuery('');
                  setAssignModalVisible(true);
                }
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#334155' }} numberOfLines={1}>
                  {dboy?.full_name || 'Assign To'}
                </Text>
                <ChevronDown size={12} color="#64748b" style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Amount */}
        <View style={[styles.cell, { flex: 1 }]}>
          <Text style={styles.cellTextBold}>₹{item.total_price || 0}</Text>
          <Text style={styles.cellSubText}>Disc: {item.total_discount || 0}%</Text>
        </View>

        {/* Date/Time */}
        <View style={[styles.cell, { flex: 1 }]}>
          <Text style={styles.cellText}>{item.created_at ? item.created_at.substring(0,10) : ''}</Text>
          <Text style={styles.cellSubText}>{item.created_at ? item.created_at.substring(11,16) : ''}</Text>
        </View>

        {/* Created By */}
        <View style={[styles.cell, { flex: 1.2 }]}>
          <Text style={styles.cellText}>{item.createduser || 'System'}</Text>
        </View>

        {/* Actions */}
        <View style={[styles.cell, { flex: 1.2, flexDirection: 'row', gap: 6, justifyContent: 'center' }]}>
          <TouchableOpacity onPress={() => handleSelectOrderForView(item)} style={[styles.actionBtn, {backgroundColor: '#e0e7ff'}]}>
             <Eye size={14} color="#4338ca" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleShareOrder(item)} style={[styles.actionBtn, {backgroundColor: '#dcfce7'}]}>
             <Share2 size={14} color="#15803d" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteOrder(item)} style={[styles.actionBtn, {backgroundColor: '#fee2e2'}]}>
             <Trash2 size={14} color="#ef4444" />
          </TouchableOpacity>
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
              placeholder="Search Sales Orders..."
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
                   deliveryBoys?.find(b => b.id.toString() === selectedBoyId)?.full_name || 'Select Rider'}
                </Text>
                <ChevronDown size={16} color="#64748b" />
              </View>
            </TouchableOpacity>

            {riderDropdownOpen && (
              <View style={styles.popoverMenu}>
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
                style={{ padding: '4px 6px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', backgroundColor: '#fff', outlineStyle: 'none', width: '125px', maxWidth: '125px', boxSizing: 'border-box' }}
              />
            ) : null}
            <Text style={{ fontSize: 13, color: '#64748b' }}>to</Text>
            {Platform.OS === 'web' ? (
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '4px 6px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', backgroundColor: '#fff', outlineStyle: 'none', width: '125px', maxWidth: '125px', boxSizing: 'border-box' }}
              />
            ) : null}
            {(startDate || endDate) && (
              <TouchableOpacity onPress={() => { setStartDate(''); setEndDate(''); }} style={{ padding: 6, backgroundColor: '#fee2e2', borderRadius: 6 }}>
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Buses Button next to filters */}
        <View style={{flexDirection: 'row', gap: 10}}>
          <TouchableOpacity style={[styles.addBtn, {backgroundColor: '#4f46e5'}]} onPress={() => setBusesModalVisible(true)}>
            <Bus size={18} color="#fff" style={{marginRight: 6}} />
            <Text style={styles.addBtnText}>Buses</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={isDesktop ? styles.tableContainer : { flex: 1, minHeight: 400 }}>
        {/* Header */}
        {isDesktop && (
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { flex: 0.8 }]}>Status</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>Customer</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>Order No</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>Delivery Boy</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>Amount</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>Date / Time</Text>
            <Text style={[styles.headerText, { flex: 1.2 }]}>Created By</Text>
            <Text style={[styles.headerText, { flex: 1.2, textAlign: 'center' }]}>Actions</Text>
          </View>
        )}
        
        {loading ? (
          <ActivityIndicator size="large" color="#4338ca" style={{marginTop: 50}} />
        ) : (
          <FlatList
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

      {/* Assign Modal (Rider Select List) */}
      {assignModalVisible && assignOrder && (
        <Modal visible={assignModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isDesktop ? 450 : '90%', height: isDesktop ? 500 : 450, maxHeight: '85%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assign Rider to Order</Text>
                <TouchableOpacity onPress={() => { setAssignModalVisible(false); setAssignOrder(null); }}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={[styles.searchContainer, { width: '100%', marginBottom: 16, height: 36 }]}>
                <Search size={16} color="#94a3b8" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search Rider..."
                  value={assignSearchQuery}
                  onChangeText={setAssignSearchQuery}
                  autoFocus
                />
              </View>

              <ScrollView style={{ flex: 1 }}>
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
                    </View>
                    {assignOrder.delivery_boy_id?.toString() === boy.id.toString() && <CheckCircle size={16} color="#4338ca" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* View Details Modal */}
      {viewModalVisible && selectedOrder && (
        <Modal visible={viewModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isDesktop ? 600 : '95%', height: isDesktop ? 600 : 540, maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { fontSize: isDesktop ? 20 : 17, flex: 1 }]} numberOfLines={1}>Order Details #{selectedOrder.id}</Text>
                <TouchableOpacity onPress={() => setViewModalVisible(false)}><X size={24} color="#64748b" /></TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, paddingRight: 4 }}>
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Patient Profile</Text>
                  <Text style={styles.label}>Patient Name</Text>
                  <TextInput 
                    style={[styles.input, { marginBottom: 8 }]} 
                    value={selectedOrder.patient_name || ''} 
                    onChangeText={t => setSelectedOrder({...selectedOrder, patient_name: t})}
                    placeholder="Patient Name"
                  />
                  
                  <Text style={styles.label}>Contact Number</Text>
                  <TextInput 
                    style={[styles.input, { marginBottom: 8 }]} 
                    value={selectedOrder.patient_contact_no || ''} 
                    onChangeText={t => setSelectedOrder({...selectedOrder, patient_contact_no: t})}
                    placeholder="Contact Number"
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.label}>Address Info</Text>
                  <TextInput 
                    style={styles.input} 
                    value={editAddress || ''} 
                    onChangeText={setEditAddress} 
                    multiline 
                  />
                </View>

                {/* Delivery Mode & Location Link */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Delivery & Location</Text>
                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Delivery Mode</Text>
                      <View style={styles.dropdownWrapper}>
                        <Picker
                          selectedValue={selectedOrder.delivery_type || 'Local'}
                          onValueChange={(val) => setSelectedOrder({...selectedOrder, delivery_type: val})}
                          style={styles.picker}
                        >
                          <Picker.Item label="Counter / Store Pickup" value="Counter" />
                          <Picker.Item label="Schedule Delivery" value="Schedule Delivery" />
                          <Picker.Item label="Local" value="Local" />
                          <Picker.Item label="Bus" value="Bus" />
                        </Picker>
                      </View>
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Location Link</Text>
                      <TextInput 
                        style={styles.input} 
                        value={selectedOrder.location_link || ''} 
                        onChangeText={t => setSelectedOrder({...selectedOrder, location_link: t})} 
                        placeholder="Google Maps Location Link" 
                      />
                    </View>
                  </View>

                  {/* Bus Delivery Form Details */}
                  {selectedOrder.delivery_type === 'Bus' && (
                    <View style={{ marginTop: 15, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#334155', marginBottom: 8 }}>Bus Details Setup</Text>
                      
                      <Text style={styles.label}>Select Saved Bus</Text>
                      <View style={[styles.dropdownWrapper, { width: '100%', marginBottom: 10 }]}>
                        <Picker
                          selectedValue=""
                          onValueChange={(val) => {
                            if (val) {
                              const b = buses.find(x => x.id.toString() === val.toString());
                              if (b) {
                                setBusDetails({
                                  bus_travels_name: b.operator_name || b.bus_name || '',
                                  bus_driver_name: b.parcel_contact_person || '',
                                  bus_driver_number: b.mobile_no || '',
                                  bus_number: b.bus_number || '',
                                  bus_date: new Date().toISOString().split('T')[0],
                                  scheduled_time: b.departure_time || ''
                                });
                              }
                            }
                          }}
                          style={styles.picker}
                        >
                          <Picker.Item label="-- Choose Bus --" value="" />
                          {buses.map(b => (
                            <Picker.Item key={b.id} label={`${b.operator_name || b.bus_name} (${b.departure_time || ''})`} value={b.id.toString()} />
                          ))}
                        </Picker>
                      </View>

                      <TextInput style={[styles.input, { marginBottom: 6, height: 32 }]} placeholder="Travels Name" value={busDetails.bus_travels_name} onChangeText={t => setBusDetails({...busDetails, bus_travels_name: t})} />
                      <TextInput style={[styles.input, { marginBottom: 6, height: 32 }]} placeholder="Driver Name" value={busDetails.bus_driver_name} onChangeText={t => setBusDetails({...busDetails, bus_driver_name: t})} />
                      <TextInput style={[styles.input, { marginBottom: 6, height: 32 }]} placeholder="Driver Number" value={busDetails.bus_driver_number} onChangeText={t => setBusDetails({...busDetails, bus_driver_number: t})} />
                      <TextInput style={[styles.input, { marginBottom: 6, height: 32 }]} placeholder="Bus No" value={busDetails.bus_number} onChangeText={t => setBusDetails({...busDetails, bus_number: t})} />
                      
                      <Text style={styles.label}>Bus Date</Text>
                      {Platform.OS === 'web' ? (
                        <input 
                          type="date" 
                          value={busDetails.bus_date || ''} 
                          onChange={(e) => setBusDetails({...busDetails, bus_date: e.target.value})}
                          style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit', marginBottom: 6, height: 32 }}
                        />
                      ) : (
                        <TextInput style={[styles.input, { marginBottom: 6, height: 32 }]} placeholder="Bus Date (YYYY-MM-DD)" value={busDetails.bus_date} onChangeText={t => setBusDetails({...busDetails, bus_date: t})} />
                      )}

                      <Text style={styles.label}>Departure Time</Text>
                      {Platform.OS === 'web' ? (
                        <input 
                          type="time" 
                          value={busDetails.scheduled_time || ''} 
                          onChange={(e) => setBusDetails({...busDetails, scheduled_time: e.target.value})}
                          style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit', marginBottom: 6, height: 32 }}
                        />
                      ) : (
                        <TextInput style={[styles.input, { marginBottom: 6, height: 32 }]} placeholder="Departure Time (HH:MM)" value={busDetails.scheduled_time} onChangeText={t => setBusDetails({...busDetails, scheduled_time: t})} />
                      )}
                    </View>
                  )}

                  {/* Schedule Delivery Form Details */}
                  {selectedOrder.delivery_type === 'Schedule Delivery' && (
                    <View style={{ marginTop: 15, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#334155', marginBottom: 8 }}>Schedule Delivery Setup</Text>
                      
                      <Text style={styles.label}>Scheduled Date</Text>
                      {Platform.OS === 'web' ? (
                        <input 
                          type="date" 
                          value={busDetails.bus_date || ''} 
                          onChange={(e) => setBusDetails({...busDetails, bus_date: e.target.value})}
                          style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit', marginBottom: 6, height: 32 }}
                        />
                      ) : (
                        <TextInput style={[styles.input, { marginBottom: 6, height: 32 }]} placeholder="Date (YYYY-MM-DD)" value={busDetails.bus_date} onChangeText={t => setBusDetails({...busDetails, bus_date: t})} />
                      )}

                      <Text style={styles.label}>Scheduled Time</Text>
                      {Platform.OS === 'web' ? (
                        <input 
                          type="time" 
                          value={busDetails.scheduled_time || ''} 
                          onChange={(e) => setBusDetails({...busDetails, scheduled_time: e.target.value})}
                          style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit', marginBottom: 6, height: 32 }}
                        />
                      ) : (
                        <TextInput style={[styles.input, { marginBottom: 6, height: 32 }]} placeholder="Time (HH:MM)" value={busDetails.scheduled_time} onChangeText={t => setBusDetails({...busDetails, scheduled_time: t})} />
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Order Identification</Text>
                  <Text style={styles.label}>Order Number</Text>
                  <TextInput 
                    style={[styles.input, { marginBottom: 8 }]} 
                    value={selectedOrder.order_no || ''} 
                    onChangeText={t => setSelectedOrder({...selectedOrder, order_no: t})}
                    placeholder="Order Number"
                  />
                  <Text style={styles.label}>Invoice Number</Text>
                  <TextInput 
                    style={[styles.input, { marginBottom: 8 }]} 
                    value={selectedOrder.invoice_id || ''} 
                    onChangeText={t => setSelectedOrder({...selectedOrder, invoice_id: t})}
                    placeholder="Invoice Number"
                  />
                  
                  <Text style={styles.label}>Ordered Date</Text>
                  {Platform.OS === 'web' ? (
                    <input 
                      type="date" 
                      value={editCreatedAtDate} 
                      onChange={(e) => setEditCreatedAtDate(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit', marginBottom: 8, height: 32 }}
                    />
                  ) : (
                    <TextInput style={[styles.input, { marginBottom: 8, height: 32 }]} placeholder="Date YYYY-MM-DD" value={editCreatedAtDate} onChangeText={setEditCreatedAtDate} />
                  )}

                  <Text style={styles.label}>Ordered Time</Text>
                  {Platform.OS === 'web' ? (
                    <input 
                      type="time" 
                      value={editCreatedAtTime} 
                      onChange={(e) => setEditCreatedAtTime(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit', marginBottom: 8, height: 32 }}
                    />
                  ) : (
                    <TextInput style={[styles.input, { marginBottom: 8, height: 32 }]} placeholder="Time HH:MM" value={editCreatedAtTime} onChangeText={setEditCreatedAtTime} />
                  )}
                </View>

                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Financial Details</Text>
                  <Text style={styles.detailsText}>Total Price: ₹{selectedOrder.total_price}</Text>
                  <Text style={styles.detailsText}>Total Discount: {selectedOrder.total_discount}%</Text>
                  <Text style={styles.detailsText}>Payment Status: {selectedOrder.payment_status}</Text>
                </View>

                {/* Items */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Items Ordered</Text>
                  {(selectedOrder.order_items || []).map((itm, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemName}>{itm.medicine_name}</Text>
                      <Text style={styles.itemQty}>Qty: {itm.quantity} | Sub: ₹{itm.sub_total}</Text>
                    </View>
                  ))}
                </View>

                {/* Status Transitions */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Dispatch States</Text>
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    {selectedOrder.status !== 'Delivered' && (
                      <TouchableOpacity onPress={() => handleUpdateStatus('Delivered')} style={[styles.stateBtn, { backgroundColor: '#10B981' }]}>
                        <Text style={styles.stateBtnText}>Mark Delivered</Text>
                      </TouchableOpacity>
                    )}
                    {selectedOrder.status !== 'Cancelled' && (
                      <TouchableOpacity onPress={() => handleUpdateStatus('Cancelled')} style={[styles.stateBtn, { backgroundColor: '#EF4444' }]}>
                        <Text style={styles.stateBtnText}>Cancel Order</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Notes log */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Activity Notes</Text>
                  {(selectedOrder.notes || []).map((nt, idx) => (
                    <View key={idx} style={styles.noteBlock}>
                      <Text style={styles.noteAuthor}>{nt.author} ({new Date(nt.timestamp).toLocaleDateString()}):</Text>
                      <Text style={styles.noteText}>{nt.text}</Text>
                    </View>
                  ))}
                  
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TextInput style={[styles.input, { flex: 1 }]} value={newNote} onChangeText={setNewNote} placeholder="Add action note..." />
                    <TouchableOpacity onPress={handleAddNote} style={styles.noteBtn}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateOrderDetails}>
                  <Text style={styles.saveBtnText}>Save Updates</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Manage Buses Modal */}
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
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {(editingBus || isAddingBus) ? (
              <ScrollView style={{ flex: 1 }}>
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
                    <TextInput style={styles.input} value={busForm.parcel_contact_person} onChangeText={t => setBusForm({...busForm, parcel_contact_person: t})} placeholder="Driver Name" />
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
                      <View style={{padding: 20, alignItems: 'center'}}><Text>No buses registered.</Text></View>
                    ) : buses.map(bus => (
                      <View key={bus.id} style={{flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center'}}>
                        <View style={{flex: 1.5}}>
                          <Text style={{fontWeight: '600', fontSize: 13}}>{bus.operator_name || bus.bus_name}</Text>
                          <Text style={{fontSize: 11, color: '#64748b'}}>{bus.bus_number}</Text>
                        </View>
                        <View style={{flex: 1.2}}>
                          <Text style={{fontSize: 13}}>{bus.source} - {bus.destination}</Text>
                          <Text style={{fontSize: 11, color: '#64748b'}}>Code: {bus.route_code}</Text>
                        </View>
                        <Text style={{flex: 1, fontSize: 13}}>{bus.departure_time}</Text>
                        <View style={{flex: 1.2}}>
                          <Text style={{fontSize: 13}}>{bus.parcel_contact_person}</Text>
                          <Text style={{fontSize: 11, color: '#64748b'}}>{bus.mobile_no}</Text>
                        </View>
                        <View style={{flex: 0.8, flexDirection: 'row', gap: 6, justifyContent: 'center'}}>
                          <TouchableOpacity onPress={() => startEditBus(bus)} style={[styles.actionBtn, {backgroundColor: '#e0e7ff'}]}>
                            <Eye size={12} color="#4338ca" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteBus(bus.id)} style={[styles.actionBtn, {backgroundColor: '#fee2e2'}]}>
                            <Trash2 size={12} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  dropdownWrapper: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#fff', height: 32, justifyContent: 'center', minWidth: 140, maxWidth: '100%', overflow: 'hidden' },
  picker: { height: 32, width: '100%', maxWidth: '100%', borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 6, ...Platform.select({ web: { outlineStyle: 'none' } }), fontSize: 13 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  tableContainer: { height: 540, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden' },
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
  actionBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '95%', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 2, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, height: 40, fontSize: 13, color: '#0f172a', backgroundColor: '#f8fafc' },
  detailsGroup: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12, marginBottom: 12 },
  detailsTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  detailsText: { fontSize: 13, color: '#334155', marginBottom: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  itemName: { fontSize: 13, color: '#0f172a', flex: 1 },
  itemQty: { fontSize: 12, color: '#64748b' },
  otpBtn: { backgroundColor: '#166534', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  stateBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center' },
  stateBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  noteBlock: { backgroundColor: '#f8fafc', padding: 8, borderRadius: 6, marginBottom: 6 },
  noteAuthor: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  noteText: { fontSize: 12, color: '#334155', marginTop: 2 },
  noteBtn: { backgroundColor: '#4338CA', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  formRow: { flexDirection: 'row', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  formCol: { flex: 1, minWidth: 200 },
  popoverMenu: {
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
  },
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
