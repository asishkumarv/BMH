import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Modal, TextInput, useWindowDimensions, ScrollView, Image } from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { Package, MapPin, Bus, User, Map, CheckCircle, Search, Calendar, FileText, Eye, Share2, Trash2, Plus, Phone, Navigation, ChevronDown, X } from 'lucide-react-native';
import { Share } from 'react-native';

export default function PurchaseOrders({ deliveryBoys, storeDeliveryFleet, onStartAssignment }) {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAssigneeName = (boyId, assignedUserType) => {
    const stringId = boyId?.toString();
    if (!stringId) return 'Unassigned';
    
    const storeBoy = storeDeliveryFleet?.find(b => {
      const bId = b.id?.toString();
      if (assignedUserType === 'sub_admin') {
        return bId === `SA-${stringId}` || bId === stringId;
      }
      return bId === stringId;
    });
    if (storeBoy) return storeBoy.full_name || storeBoy.name;

    const stdBoy = deliveryBoys?.find(b => b.id?.toString() === stringId);
    if (stdBoy) return stdBoy.full_name || stdBoy.name;
    
    return 'Unassigned';
  };
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('All'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBoyId, setSelectedBoyId] = useState('All');
  
  const [riderDropdownOpen, setRiderDropdownOpen] = useState(false);
  const [deliveryBoySearchQuery, setDeliveryBoySearchQuery] = useState('');
  
  // Creator Filter State
  const [selectedCreator, setSelectedCreator] = useState('All');

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [assignOrder, setAssignOrder] = useState(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  
  // Assign options
  const [deliveryType, setDeliveryType] = useState('Local'); // Store, Local, Bus
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [address, setAddress] = useState('');
  const [gpsLocation, setGpsLocation] = useState('');
  const [busDetails, setBusDetails] = useState({
    bus_travels_name: '',
    bus_driver_name: '',
    bus_driver_number: '',
    bus_number: '',
    bus_date: '',
    scheduled_time: ''
  });

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editAddress, setEditAddress] = useState('');
  const [newNote, setNewNote] = useState('');
  const [deleteOrderTarget, setDeleteOrderTarget] = useState(null);

  // Buses list for picker
  const [buses, setBuses] = useState([]);

  // Create Form State (Wholesaler Purchase Order creation)
  const initialFormData = {
    custname: '',
    custcode: '',
    refname: '',
    refcode: '',
    total: '',
    details: '', // JSON items string
    delivery_type: 'Local',
    address: '',
    gps_location: '',
    bus_travels_name: '',
    bus_driver_name: '',
    bus_driver_number: '',
    bus_number: '',
    bus_date: '',
    scheduled_time: ''
  };
  const [formData, setFormData] = useState(initialFormData);

  // Client-side pagination
  const [page, setPage] = useState(1);

  const fetchPurchaseOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/all');
      if (res.data && res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching purchase orders:', err.message || err);
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
    fetchPurchaseOrders();
    fetchBuses();
    const interval = setInterval(() => {
      fetchPurchaseOrders(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleBusSelection = (busId) => {
    if (!busId) return;
    const bus = buses.find(b => b.id.toString() === busId.toString());
    if (bus) {
      setFormData({
        ...formData,
        bus_travels_name: bus.operator_name || bus.bus_name,
        bus_driver_name: bus.parcel_contact_person || '',
        bus_driver_number: bus.mobile_no || '',
        bus_number: bus.bus_number || '',
        bus_date: new Date().toISOString().split('T')[0],
        scheduled_time: bus.departure_time || '',
        delivery_type: 'Bus'
      });
    }
  };

  const handleCreateSubmit = async () => {
    if (!formData.custname) {
      alert("Please enter Wholesaler / Customer Name");
      return;
    }

    try {
      let creatorName = 'SYSTEM';
      if (typeof window !== 'undefined') {
        const adminUser = localStorage.getItem('superAdminUser') || localStorage.getItem('subAdminUser');
        const empUser = localStorage.getItem('employeeUser');
        if (adminUser) {
          creatorName = JSON.parse(adminUser).full_name || JSON.parse(adminUser).name || 'Admin';
        } else if (empUser) {
          creatorName = JSON.parse(empUser).name || 'Employee';
        }
      }

      const payload = {
        custname: formData.custname,
        custcode: formData.custcode || 'WH001',
        refname: formData.refname,
        refcode: formData.refcode,
        total: formData.total || 0,
        details: formData.details || '[]',
        delivery_type: formData.delivery_type,
        address: formData.delivery_type === 'Local' ? formData.address : null,
        gps_location: formData.delivery_type === 'Local' ? formData.gps_location : null,
        bus_details: formData.delivery_type === 'Bus' ? {
          bus_travels_name: formData.bus_travels_name,
          bus_driver_name: formData.bus_driver_name,
          bus_driver_number: formData.bus_driver_number,
          bus_number: formData.bus_number,
          bus_date: formData.bus_date,
          scheduled_time: formData.scheduled_time
        } : null,
        createuser: creatorName
      };

      const res = await axios.post('https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/add', payload);
      if (res.data.success) {
        alert('Purchase Order created successfully!');
        setCreateModalVisible(false);
        setFormData(initialFormData);
        fetchPurchaseOrders();
      }
    } catch (err) {
      alert('Failed to create manual purchase order');
    }
  };

  const handleAssignBoy = async (orderId, boyId) => {
    try {
      const isUnassign = boyId === 'null' || !boyId;
      
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

      const useModalState = assignOrder && assignOrder.id === orderId;
      const targetOrder = orders.find(o => o.id === orderId);

      let riderIdVal = boyId;
      let userType = 'employee';
      if (typeof riderIdVal === 'string' && riderIdVal.startsWith('SA-')) {
        riderIdVal = riderIdVal.replace('SA-', '');
        userType = 'sub_admin';
      }
      const riderIdInt = riderIdVal && riderIdVal !== 'null' ? parseInt(riderIdVal, 10) : null;

      const payload = {
        delivery_type: useModalState ? deliveryType : (targetOrder?.delivery_type || 'Store'),
        delivery_boy_id: riderIdInt,
        delivery_assigned_user_type: userType,
        address: useModalState 
          ? (deliveryType === 'Local' ? address : null) 
          : (targetOrder?.delivery_type === 'Local' ? targetOrder?.address : null),
        gps_location: useModalState 
          ? (deliveryType === 'Local' ? gpsLocation : null) 
          : (targetOrder?.delivery_type === 'Local' ? targetOrder?.gps_location : null),
        bus_details: useModalState 
          ? (deliveryType === 'Bus' ? busDetails : null) 
          : (targetOrder?.delivery_type === 'Bus' ? targetOrder?.bus_details : null),
        assigned_by: assignedBy
      };

      const res = await axios.post(`https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/assign/${orderId}`, payload);
      if (res.data.success) {
        alert('Assignment updated successfully!');
        fetchPurchaseOrders(true);
      }
    } catch (err) {
      alert('Failed to assign rider');
    }
  };

  const handleAssignSubmit = async () => {
    if (!assignOrder) return;
    handleAssignBoy(assignOrder.id, selectedRiderId);
    setAssignModalVisible(false);
    setAssignOrder(null);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      let author = 'Employee';
      let modifiedById = null;
      let modifiedByType = 'Employee';
      let authName = 'Employee';

      if (typeof window !== 'undefined') {
        const adminUser = localStorage.getItem('superAdminUser') || localStorage.getItem('subAdminUser');
        const empUser = localStorage.getItem('employeeUser');
        if (adminUser) {
          const auth = JSON.parse(adminUser);
          author = auth.full_name || auth.name || 'Admin';
          authName = auth.full_name || auth.name || 'Admin';
          modifiedById = auth.id;
          modifiedByType = 'Admin';
        } else if (empUser) {
          const auth = JSON.parse(empUser);
          author = auth.name || 'Employee';
          authName = auth.name || 'Employee';
          modifiedById = auth.id;
          modifiedByType = 'Employee';
        }
      }

      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/update/${selectedOrder.id}`, {
        address: editAddress || null,
        new_note: newNote,
        note_author: author,
        modified_by_id: modifiedById,
        modified_by_type: modifiedByType,
        modified_by_name: authName
      });
      if (res.data.success) {
        setSelectedOrder(res.data.data);
        setNewNote('');
        fetchPurchaseOrders(true);
      }
    } catch (err) {
      alert('Failed to add note');
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      const res = await axios.post(`https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/status/${selectedOrder.id}`, { status });
      if (res.data.success) {
        setSelectedOrder(res.data.data);
        fetchPurchaseOrders(true);
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteOrderTarget) return;
    try {
      const res = await axios.delete(`https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/${deleteOrderTarget.id}`);
      if (res.data.success) {
        alert('Purchase Order deleted successfully!');
        fetchPurchaseOrders();
      }
    } catch (err) {
      alert('Failed to delete purchase order');
    } finally {
      setDeleteModalVisible(false);
      setDeleteOrderTarget(null);
    }
  };

  const handleShareOrder = async (item) => {
    try {
      let header = '';
      if (item.delivery_type === 'Bus') {
        let busParsed = {};
        try {
          busParsed = typeof item.bus_details === 'string' ? JSON.parse(item.bus_details) : item.bus_details;
        } catch (e) {}
        header = `${busParsed?.bus_travels_name || 'Bus Travels'} Bus Driver\nPhone: +91${busParsed?.bus_driver_number || ''}`;
      } else {
        header = `${item.custname || 'Wholesaler'}\nRef: ${item.refname || 'N/A'}`;
      }

      const assignedBoy = deliveryBoys.find(b => b.id?.toString() === item.delivery_boy_id?.toString());

      let msg = `${header}\n\n` +
                `Purchase Order Information:\n` +
                `Order No: ${item.prefix || ''}${item.year || ''}${item.srno || ''}\n` +
                `Amount: ${item.total || '0.00'}\n\n` +
                `Rider Information:\n` +
                `Name: ${assignedBoy ? assignedBoy.full_name : 'Not assigned'}\n` +
                `Phone: ${assignedBoy?.phone ? '+91' + assignedBoy.phone : 'N/A'}`;

      if (item.delivery_type === 'Bus') {
        let busParsed = {};
        try {
          busParsed = typeof item.bus_details === 'string' ? JSON.parse(item.bus_details) : item.bus_details;
        } catch (e) {}
        msg += `\n\nBus Information:\n` +
               `Bus Name: ${busParsed?.bus_travels_name || '--'}\n` +
               `Bus No: ${busParsed?.bus_number || '--'}\n` +
               `Bus Contact Number: ${busParsed?.bus_driver_number || '--'}\n` +
               `Date: ${busParsed?.bus_date || '--'}\n` +
               `Time of Dispatch: ${busParsed?.scheduled_time || '--'}`;
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
    } catch(err) {
      alert('Error sharing order details');
    }
  };

  const handleSelectOrderForView = (order) => {
    setSelectedOrder(order);
    setEditAddress(order.address || '');
  };

  const openAssignModal = (order) => {
    const isStoreOrCounter = order.delivery_type === 'Store' || order.mode_of_delivery === 'Store' || order.delivery_type === 'Counter' || order.mode_of_delivery === 'Counter';
    if (isStoreOrCounter && onStartAssignment) {
      onStartAssignment({ ...order, type: 'purchase_order' });
    } else {
      setAssignOrder(order);
      setDeliveryType(order.delivery_type || 'Store');
      setSelectedRiderId(order.delivery_boy_id?.toString() || '');
      setAddress(order.address || '');
      setGpsLocation(order.gps_location || '');
      
      let parsedBus = { bus_travels_name: '', bus_driver_name: '', bus_driver_number: '', bus_number: '', bus_date: '', scheduled_time: '' };
      if (order.bus_details) {
        try {
          parsedBus = typeof order.bus_details === 'string' ? JSON.parse(order.bus_details) : order.bus_details;
        } catch (e) {}
      }
      setBusDetails(parsedBus);
      setAssignModalVisible(true);
    }
  };

  // Filtering purchase orders
  const filteredOrders = orders.filter(order => {
    const orderNo = `${order.prefix || ''}${order.year || ''}${order.srno || ''}`.toLowerCase();
    const custName = (order.custname || '').toLowerCase();
    const refName = (order.refname || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = orderNo.includes(query) || custName.includes(query) || refName.includes(query);

    // Assignment filter
    let matchesAssignment = true;
    if (assignmentFilter === 'Pending') {
      matchesAssignment = order.status !== 'Assigned' && order.status !== 'Delivered';
    } else if (assignmentFilter === 'Assigned') {
      matchesAssignment = order.status === 'Assigned';
    } else if (assignmentFilter === 'Delivered') {
      matchesAssignment = order.status === 'Delivered';
    }

    // Selected boy filter
    let matchesBoy = true;
    if (selectedBoyId !== 'All') {
      if (selectedBoyId === 'unassigned') {
        matchesBoy = !order.delivery_boy_id;
      } else {
        matchesBoy = order.delivery_boy_id?.toString() === selectedBoyId.toString();
      }
    }

    // Date filters
    let matchesDate = true;
    if (startDate) {
      const orderDate = new Date(order.created_at || order.createdatetime).toISOString().split('T')[0];
      matchesDate = orderDate >= startDate;
    }
    if (endDate && matchesDate) {
      const orderDate = new Date(order.created_at || order.createdatetime).toISOString().split('T')[0];
      matchesDate = orderDate <= endDate;
    }

    // Creator filter
    let matchesCreator = true;
    if (selectedCreator !== 'All') {
      const orderCreator = order.createuser || order.modified_by_name || 'SYSTEM';
      matchesCreator = orderCreator.toLowerCase() === selectedCreator.toLowerCase();
    }

    return matchesSearch && matchesAssignment && matchesBoy && matchesDate && matchesCreator;
  });

  // Sort: Latest dated and time on top (guaranteed)
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdatetime || 0);
    const dateB = new Date(b.created_at || b.createdatetime || 0);
    return dateB.getTime() - dateA.getTime();
  });

  // Paginated orders
  const totalPages = Math.ceil(sortedOrders.length / 50) || 1;
  const paginatedOrders = sortedOrders.slice((page - 1) * 50, page * 50);

  const renderOrderItem = ({ item, index }) => {
    // Determine status badge color
    let statusColor = '#3b82f6';
    if (item.status === 'Assigned') statusColor = '#f59e0b';
    else if (item.status === 'Delivered' || item.status === 'Completed') statusColor = '#10b981';

    const formattedDate = item.created_at || item.createdatetime 
      ? new Date(item.created_at || item.createdatetime).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })
      : '';

    return (
      <View style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff' }]}>
        {/* Status Badge & Mode Icon */}
        <View style={[styles.cell, { flex: 0.8, flexDirection: 'row', alignItems: 'center' }]}>
          {item.delivery_type === 'Bus' ? <Bus size={14} color="#64748b" style={{ marginRight: 4 }}/> : 
           item.delivery_type === 'Local' ? <MapPin size={14} color="#64748b" style={{ marginRight: 4 }}/> :
           <Package size={14} color="#64748b" style={{ marginRight: 4 }}/>}
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{item.status || 'Pending'}</Text>
          </View>
        </View>

        {/* Wholesaler / Customer Name */}
        <View style={[styles.cell, { flex: 1.5 }]}>
          <Text style={styles.cellTextBold}>{item.custname}</Text>
          {item.refname ? <Text style={styles.cellSubText}>Ref: {item.refname}</Text> : null}
          {item.address ? <Text style={[styles.cellSubText, { color: '#4338ca' }]} numberOfLines={1}>Addr: {item.address}</Text> : null}
        </View>

        {/* Order Identifier */}
        <View style={[styles.cell, { flex: 1 }]}>
          <Text style={styles.cellTextBold}>{item.prefix || ''}{item.year || ''}{item.srno || ''}</Text>
          <Text style={styles.cellSubText}>Br: {item.br_code || '001'}</Text>
        </View>

        {/* Delivery boy picker directly inline */}
        <View style={[styles.cell, { flex: 1.5 }]}>
          <View style={{ flexDirection: 'column' }}>
            {item.status === 'Delivered' || item.status === 'Completed' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <User size={16} color="#94a3b8" style={{ marginRight: 4 }}/>
                <Text style={styles.cellText} numberOfLines={1}>
                  {getAssigneeName(item.delivery_boy_id, item.delivery_assigned_user_type)}
                </Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.pickerWrapper, { paddingHorizontal: 8, height: 28, justifyContent: 'center', backgroundColor: '#f8fafc' }]}
                onPress={() => openAssignModal(item)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#334155' }} numberOfLines={1}>
                    {item.delivery_boy_id ? getAssigneeName(item.delivery_boy_id, item.delivery_assigned_user_type) : 'Assign To'}
                  </Text>
                  <ChevronDown size={12} color="#64748b" style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            )}
            {item.submitted_to_name && (
              <Text style={{ fontSize: 10, color: '#059669', marginTop: 2, fontWeight: 'bold' }} numberOfLines={2}>
                Sub: {item.submitted_to_name} ({item.submitted_to_role || ''} - {item.submitted_to_dept || ''})
              </Text>
            )}
          </View>
        </View>

        {/* Amount */}
        <View style={[styles.cell, { flex: 1 }]}>
          <Text style={styles.cellTextBold}>₹{item.total}</Text>
        </View>

        {/* Date / Time */}
        <View style={[styles.cell, { flex: 1 }]}>
          <Text style={styles.cellText}>{formattedDate.split(',')[0]}</Text>
          <Text style={styles.cellSubText}>{formattedDate.split(',')[1] || ''}</Text>
        </View>

        {/* Created By / Modified By */}
        <View style={[styles.cell, { flex: 1.2 }]}>
          <Text style={styles.cellText}>{item.createuser || 'SYSTEM'}</Text>
          {(item.modified_by_name || item.modifieduser) ? (
            <Text style={[styles.cellSubText, { color: '#4338ca', fontWeight: '500' }]}>
              Mod: {item.modified_by_name || item.modifieduser}
            </Text>
          ) : null}
        </View>

        {/* Action button options */}
        <View style={[styles.cell, { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#e0e7ff' }]} 
            onPress={() => handleSelectOrderForView(item)}
          >
            <Eye size={14} color="#4338ca" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#fef3c7' }]} 
            onPress={() => handleShareOrder(item)}
          >
            <Share2 size={14} color="#b45309" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]} 
            onPress={() => { setDeleteOrderTarget(item); setDeleteModalVisible(true); }}
          >
            <Trash2 size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Filter & Actions Header */}
      <View style={styles.header}>
        <View style={styles.filters}>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Search size={16} color="#94a3b8" style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search PO/Wholesaler..." 
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Rider Selection Dropdown */}
          <View style={{ position: 'relative', zIndex: 110 }}>
            <TouchableOpacity 
              onPress={() => setRiderDropdownOpen(!riderDropdownOpen)}
              style={styles.riderSelectBtn}
            >
              <Text style={{ fontSize: 13, color: '#334155' }}>
                Rider: {selectedBoyId === 'All' ? 'All Riders' : selectedBoyId === 'unassigned' ? 'Unassigned' : deliveryBoys.find(b => b.id.toString() === selectedBoyId.toString())?.full_name || 'Selected Rider'}
              </Text>
              <ChevronDown size={14} color="#64748b" />
            </TouchableOpacity>

            {riderDropdownOpen && (
              <View style={styles.riderDropdown}>
                <TextInput 
                  style={styles.riderSearchInput}
                  placeholder="Search rider..."
                  value={deliveryBoySearchQuery}
                  onChangeText={setDeliveryBoySearchQuery}
                />
                <ScrollView style={{ maxHeight: 200 }}>
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedBoyId('All');
                      setRiderDropdownOpen(false);
                      setDeliveryBoySearchQuery('');
                    }}
                    style={styles.riderDropdownItem}
                  >
                    <Text style={{ fontSize: 13, color: selectedBoyId === 'All' ? '#4338ca' : '#334155', fontWeight: selectedBoyId === 'All' ? '600' : 'normal' }}>All Riders</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedBoyId('unassigned');
                      setRiderDropdownOpen(false);
                      setDeliveryBoySearchQuery('');
                    }}
                    style={styles.riderDropdownItem}
                  >
                    <Text style={{ fontSize: 13, color: selectedBoyId === 'unassigned' ? '#4338ca' : '#334155', fontWeight: selectedBoyId === 'unassigned' ? '600' : 'normal' }}>Unassigned</Text>
                  </TouchableOpacity>

                  {deliveryBoys.filter(b => b.full_name?.toLowerCase().includes(deliveryBoySearchQuery.toLowerCase())).map((boy) => (
                    <TouchableOpacity 
                      key={boy.id}
                      onPress={() => {
                        setSelectedBoyId(boy.id.toString());
                        setRiderDropdownOpen(false);
                        setDeliveryBoySearchQuery('');
                      }}
                      style={styles.riderDropdownItem}
                    >
                      <Text style={{ fontSize: 13, color: selectedBoyId.toString() === boy.id.toString() ? '#4338ca' : '#334155', fontWeight: selectedBoyId.toString() === boy.id.toString() ? '600' : 'normal' }}>
                        {boy.full_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Creator Selection Dropdown */}
          <View style={styles.dropdownWrapper}>
            <Picker
              selectedValue={selectedCreator}
              onValueChange={(val) => setSelectedCreator(val)}
              style={styles.picker}
            >
              <Picker.Item label="Creator: All" value="All" />
              {['All', ...new Set(orders.map(order => order.createuser || order.modified_by_name || 'SYSTEM').filter(Boolean))].filter(c => c !== 'All').map((creator) => (
                <Picker.Item key={creator} label={`Creator: ${creator}`} value={creator} />
              ))}
            </Picker>
          </View>

          {/* Date range pickers */}
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>Date Range:</Text>
            {Platform.OS === 'web' ? (
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                style={webFilterInputStyle}
              />
            ) : (
              <TextInput style={styles.mobileDateInput} placeholder="Start Date" value={startDate} onChangeText={setStartDate} />
            )}
            <Text style={{ fontSize: 13, color: '#64748b' }}>to</Text>
            {Platform.OS === 'web' ? (
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={webFilterInputStyle}
              />
            ) : (
              <TextInput style={styles.mobileDateInput} placeholder="End Date" value={endDate} onChangeText={setEndDate} />
            )}
            {(startDate || endDate) && (
              <TouchableOpacity onPress={() => { setStartDate(''); setEndDate(''); }} style={{ padding: 6, backgroundColor: '#fee2e2', borderRadius: 6 }}>
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Add Manual Wholesaler Purchase Order button */}
          <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModalVisible(true)}>
            <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Add Orders</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tabular Grid Section */}
      <View style={styles.statusChipsRow}>
        {['All', 'Pending', 'Assigned', 'Delivered'].map((status) => (
          <TouchableOpacity 
            key={status}
            onPress={() => setAssignmentFilter(status)}
            style={[styles.statusChip, assignmentFilter === status && styles.statusChipActive]}
          >
            <Text style={[styles.statusChipText, assignmentFilter === status && styles.statusChipTextActive]}>{status}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tableContainer}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { flex: 0.8 }]}>Status</Text>
          <Text style={[styles.headerText, { flex: 1.5 }]}>Customer / Wholesaler</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Order No</Text>
          <Text style={[styles.headerText, { flex: 1.5 }]}>Submitted To</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Amount</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Date / Time</Text>
          <Text style={[styles.headerText, { flex: 1.2 }]}>Created By</Text>
          <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>Actions</Text>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#4338ca" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={paginatedOrders}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderOrderItem}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FileText size={48} color="#94a3b8" />
                <Text style={styles.emptyText}>No purchase orders found.</Text>
              </View>
            }
          />
        )}

        {/* Pagination bar matching ManualOrders.jsx */}
        <View style={styles.paginationContainer}>
          <TouchableOpacity 
            disabled={page <= 1} 
            onPress={() => setPage(p => Math.max(1, p - 1))}
            style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
          >
            <Text style={[styles.pageButtonText, page <= 1 && styles.pageButtonTextDisabled]}>Previous</Text>
          </TouchableOpacity>
          
          <Text style={styles.pageInfoText}>
            Page {page} of {totalPages} (Showing {paginatedOrders.length} of {sortedOrders.length} total orders)
          </Text>
          
          <TouchableOpacity 
            disabled={page >= totalPages} 
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
          >
            <Text style={[styles.pageButtonText, page >= totalPages && styles.pageButtonTextDisabled]}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CREATE MANUAL PURCHASE ORDER MODAL */}
      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: isDesktop ? 1000 : '95%', maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Wholesaler Purchase Order</Text>
              <TouchableOpacity onPress={() => { setCreateModalVisible(false); setFormData(initialFormData); }}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Wholesaler Name *</Text>
                  <TextInput style={styles.input} value={formData.custname} onChangeText={(t) => setFormData({...formData, custname: t})} placeholder="e.g. SAKUNIA MEDICAL AGENCY" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Wholesaler Code</Text>
                  <TextInput style={styles.input} value={formData.custcode} onChangeText={(t) => setFormData({...formData, custcode: t})} placeholder="e.g. WH001" />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Reference Name</Text>
                  <TextInput style={styles.input} value={formData.refname} onChangeText={(t) => setFormData({...formData, refname: t})} placeholder="e.g. BHARAT MEDICAL HALL" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Reference Code</Text>
                  <TextInput style={styles.input} value={formData.refcode} onChangeText={(t) => setFormData({...formData, refcode: t})} placeholder="Reference Code" />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Order Prefix (Default: PO)</Text>
                  <TextInput style={styles.input} value={formData.prefix} onChangeText={(t) => setFormData({...formData, prefix: t})} placeholder="PO" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Order Year</Text>
                  <TextInput style={styles.input} value={formData.year} onChangeText={(t) => setFormData({...formData, year: t})} placeholder="Year" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Serial Number</Text>
                  <TextInput style={styles.input} value={formData.srno} onChangeText={(t) => setFormData({...formData, srno: t})} placeholder="Serial No" />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Total Amount (₹)</Text>
                  <TextInput style={styles.input} value={formData.total} onChangeText={(t) => setFormData({...formData, total: t})} placeholder="Total price" keyboardType="numeric" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Mode of Delivery</Text>
                  <View style={styles.dropdownWrapper}>
                    <Picker
                      selectedValue={formData.delivery_type}
                      onValueChange={(val) => setFormData({...formData, delivery_type: val})}
                      style={styles.picker}
                    >
                      <Picker.Item label="Store Pickup" value="Store" />
                      <Picker.Item label="Local Pickup/Delivery" value="Local" />
                      <Picker.Item label="Bus Transport" value="Bus" />
                    </Picker>
                  </View>
                </View>
              </View>

              {formData.delivery_type === 'Local' && (
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Pickup Address</Text>
                    <TextInput style={styles.input} value={formData.address} onChangeText={(t) => setFormData({...formData, address: t})} placeholder="Pickup address details" />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Google Maps Navigation Link</Text>
                    <TextInput style={styles.input} value={formData.gps_location} onChangeText={(t) => setFormData({...formData, gps_location: t})} placeholder="Google Maps URL" />
                  </View>
                </View>
              )}

              {formData.delivery_type === 'Bus' && (
                <View style={{ marginTop: 10, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#334155', marginBottom: 8 }}>Bus Details Setup</Text>
                  
                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Select Saved Bus Stop</Text>
                      <View style={styles.dropdownWrapper}>
                        <Picker
                          selectedValue=""
                          onValueChange={(val) => handleBusSelection(val)}
                          style={styles.picker}
                        >
                          <Picker.Item label="-- Choose Bus --" value="" />
                          {buses.map(b => (
                            <Picker.Item key={b.id} label={`${b.operator_name || b.bus_name} (${b.departure_time || ''}) - to ${b.destination}`} value={b.id.toString()} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Bus Driver Name</Text>
                      <TextInput style={styles.input} value={formData.bus_driver_name} onChangeText={(t) => setFormData({...formData, bus_driver_name: t})} placeholder="Driver Name" />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Bus Driver Number</Text>
                      <TextInput style={styles.input} value={formData.bus_driver_number} onChangeText={(t) => setFormData({...formData, bus_driver_number: t.replace(/\s+/g, '')})} placeholder="Driver Phone" />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Bus Number</Text>
                      <TextInput style={styles.input} value={formData.bus_number} onChangeText={(t) => setFormData({...formData, bus_number: t})} placeholder="Plate No" />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Travels Name</Text>
                      <TextInput style={styles.input} value={formData.bus_travels_name} onChangeText={(t) => setFormData({...formData, bus_travels_name: t})} placeholder="Travels" />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Bus Departure Date</Text>
                      {Platform.OS === 'web' ? (
                        <input 
                          type="date" 
                          value={formData.bus_date} 
                          onChange={(e) => setFormData({...formData, bus_date: e.target.value})}
                          style={webFilterInputStyle}
                        />
                      ) : (
                        <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={formData.bus_date} onChangeText={(t) => setFormData({...formData, bus_date: t})} />
                      )}
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Departure Time</Text>
                      {Platform.OS === 'web' ? (
                        <input 
                          type="time" 
                          value={formData.scheduled_time} 
                          onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                          style={webFilterInputStyle}
                        />
                      ) : (
                        <TextInput style={styles.input} placeholder="HH:MM" value={formData.scheduled_time} onChangeText={(t) => setFormData({...formData, scheduled_time: t})} />
                      )}
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Items / Details (JSON Array format or Text)</Text>
                  <TextInput 
                    style={[styles.input, { height: 60 }]} 
                    multiline 
                    value={formData.details} 
                    onChangeText={(t) => setFormData({...formData, details: t})} 
                    placeholder='e.g. [{"itemName": "Paracetamol", "Qty": 10, "rate": 15}]' 
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#ef4444', marginRight: 10 }]} onPress={() => setFormData(initialFormData)}>
                <Text style={styles.saveBtnText}>Clear Form</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateSubmit}>
                <Text style={styles.saveBtnText}>Save Purchase Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* RIDER ASSIGNMENT MODAL */}
      {assignOrder && (
        <Modal visible={assignModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isDesktop ? 500 : '90%', maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assign Rider (PO #{assignOrder.prefix || ''}{assignOrder.year || ''}{assignOrder.srno || ''})</Text>
                <TouchableOpacity onPress={() => { setAssignModalVisible(false); setAssignOrder(null); }}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              {/* Items Ordered List */}
              <View style={{ maxHeight: 110, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8, marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', color: '#4338ca', fontSize: 13, marginBottom: 4 }}>Items in Order:</Text>
                <ScrollView nestedScrollEnabled style={{ flexGrow: 0 }}>
                  {(() => {
                    let items = [];
                    try {
                      items = typeof assignOrder.details === 'string' ? JSON.parse(assignOrder.details) : assignOrder.details;
                    } catch (e) {}

                    if (!Array.isArray(items) || items.length === 0) {
                      return <Text style={{ fontSize: 12, color: '#64748b' }}>No items listed.</Text>;
                    }

                    return items.map((itm, index) => (
                      <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: index < items.length - 1 ? 1 : 0, borderBottomColor: '#f1f5f9' }}>
                        <Text style={{ fontSize: 12, color: '#1e293b', flex: 1, fontWeight: '500' }} numberOfLines={1}>{itm.itemName || itm.name}</Text>
                        <Text style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>Qty: {itm.Qty || itm.quantity} | Rate: ₹{itm.rate}</Text>
                      </View>
                    ));
                  })()}
                </ScrollView>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, height: 32, marginBottom: 12 }}>
                <Search size={16} color="#94a3b8" style={{ marginRight: 6 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 13 }}
                  placeholder="Search Rider..."
                  value={assignSearchQuery}
                  onChangeText={setAssignSearchQuery}
                  autoFocus
                />
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
                {/* Delivery Type Select inside assignment */}
                <Text style={styles.label}>Delivery Mode</Text>
                <View style={[styles.dropdownWrapper, { marginBottom: 12, minWidth: '100%' }]}>
                  <Picker
                    selectedValue={deliveryType}
                    onValueChange={(val) => setDeliveryType(val)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Store Pickup" value="Store" />
                    <Picker.Item label="Local Pickup/Delivery" value="Local" />
                    <Picker.Item label="Bus Transport" value="Bus" />
                  </Picker>
                </View>

                {deliveryType === 'Local' && (
                  <>
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.label}>Pickup Address</Text>
                      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Pickup address" />
                    </View>
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.label}>Location Link (GPS/Map URL)</Text>
                      <TextInput style={styles.input} value={gpsLocation} onChangeText={setGpsLocation} placeholder="e.g. https://maps.google.com/..." />
                    </View>
                  </>
                )}

                {deliveryType === 'Bus' && (
                  <View style={{ marginBottom: 12, padding: 8, backgroundColor: '#f8fafc', borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' }}>
                    <TextInput style={[styles.input, { marginBottom: 6, height: 30 }]} placeholder="Travels Name" value={busDetails.bus_travels_name} onChangeText={t => setBusDetails({...busDetails, bus_travels_name: t})} />
                    <TextInput style={[styles.input, { marginBottom: 6, height: 30 }]} placeholder="Driver Name" value={busDetails.bus_driver_name} onChangeText={t => setBusDetails({...busDetails, bus_driver_name: t})} />
                    <TextInput style={[styles.input, { marginBottom: 6, height: 30 }]} placeholder="Driver Contact" value={busDetails.bus_driver_number} onChangeText={t => setBusDetails({...busDetails, bus_driver_number: t})} />
                    <TextInput style={[styles.input, { marginBottom: 6, height: 30 }]} placeholder="Bus No" value={busDetails.bus_number} onChangeText={t => setBusDetails({...busDetails, bus_number: t})} />
                    
                    {/* Bus Date Picker */}
                    <Text style={[styles.label, { fontSize: 11, marginTop: 4 }]}>Bus Date</Text>
                    {Platform.OS === 'web' ? (
                      <input 
                        type="date" 
                        value={busDetails.bus_date} 
                        onChange={(e) => setBusDetails({...busDetails, bus_date: e.target.value})} 
                        style={{ ...webFilterInputStyle, height: 30, fontSize: 12, padding: 4, width: '100%', marginBottom: 6 }} 
                      />
                    ) : (
                      <TextInput style={[styles.input, { marginBottom: 6, height: 30 }]} placeholder="Bus Date (YYYY-MM-DD)" value={busDetails.bus_date} onChangeText={t => setBusDetails({...busDetails, bus_date: t})} />
                    )}

                    {/* Bus Departure Time */}
                    <Text style={[styles.label, { fontSize: 11, marginTop: 4 }]}>Bus Time</Text>
                    {Platform.OS === 'web' ? (
                      <input 
                        type="time" 
                        value={busDetails.scheduled_time} 
                        onChange={(e) => setBusDetails({...busDetails, scheduled_time: e.target.value})} 
                        style={{ ...webFilterInputStyle, height: 30, fontSize: 12, padding: 4, width: '100%' }} 
                      />
                    ) : (
                      <TextInput style={[styles.input, { height: 30 }]} placeholder="Bus Time (e.g. 10:30 AM)" value={busDetails.scheduled_time} onChangeText={t => setBusDetails({...busDetails, scheduled_time: t})} />
                    )}
                  </View>
                )}

                <TouchableOpacity 
                  style={{ padding: 10, borderRadius: 6, backgroundColor: '#fee2e2', marginBottom: 10 }}
                  onPress={() => {
                    handleAssignBoy(assignOrder.id, 'null');
                    setAssignModalVisible(false);
                    setAssignOrder(null);
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#ef4444', fontWeight: '600', textAlign: 'center' }}>Unassign Rider</Text>
                </TouchableOpacity>

                {((deliveryType === 'Store' || deliveryType === 'Counter') ? (storeDeliveryFleet || []) : (deliveryBoys || []))?.filter(boy => 
                  (boy.full_name || boy.name)?.toLowerCase().includes(assignSearchQuery.toLowerCase())
                ).map((boy) => (
                  <TouchableOpacity 
                    key={boy.id}
                    style={{ 
                      padding: 10, 
                      borderRadius: 6, 
                      backgroundColor: selectedRiderId?.toString() === boy.id.toString() ? '#e0e7ff' : '#f8fafc',
                      marginBottom: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onPress={() => setSelectedRiderId(boy.id)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e293b' }}>{boy.full_name || boy.name}</Text>
                      {boy.recommended && (
                        <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, color: '#15803d', fontWeight: 'bold' }}>⭐ Recommended (Nearest)</Text>
                        </View>
                      )}
                      {!(deliveryType === 'Store' || deliveryType === 'Counter') ? (() => {
                        const pendingOrders = boy.pending_orders_count !== undefined ? boy.pending_orders_count : boy.pending_count;
                        const pendingTasks = boy.pending_tasks_count || 0;
                        return (
                          <Text style={{ fontSize: 11, color: (pendingOrders > 0 || pendingTasks > 0) ? '#d97706' : '#10b981', fontWeight: '500' }}>
                            ({pendingOrders || 0} orders, {pendingTasks} tasks)
                          </Text>
                        );
                      })() : null}
                    </View>
                    {selectedRiderId?.toString() === boy.id.toString() && <CheckCircle size={14} color="#4338ca" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#ef4444', marginRight: 8 }]} onPress={() => { setAssignModalVisible(false); setAssignOrder(null); }}>
                  <Text style={styles.saveBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAssignSubmit}>
                  <Text style={styles.saveBtnText}>Confirm Assignment</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* VIEW PO DETAILS & NOTES MODAL */}
      {selectedOrder && (
        <Modal visible={!!selectedOrder} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isDesktop ? 700 : '95%', maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Purchase Order Details</Text>
                <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, marginTop: 10 }}>
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>General Information</Text>
                  <Text style={styles.detailsText}>Customer/Wholesaler: {selectedOrder.custname} ({selectedOrder.custcode})</Text>
                  <Text style={styles.detailsText}>PO Code: {selectedOrder.prefix || ''}{selectedOrder.year || ''}{selectedOrder.srno || ''}</Text>
                  <Text style={styles.detailsText}>Reference: {selectedOrder.refname || 'N/A'}</Text>
                  <Text style={styles.detailsText}>Status: {selectedOrder.status || 'Pending'}</Text>
                </View>

                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Delivery Details</Text>
                  <Text style={styles.detailsText}>Type: {selectedOrder.delivery_type}</Text>
                  
                  <Text style={styles.label}>Pickup Address</Text>
                  <TextInput 
                    style={styles.modalInput} 
                    value={editAddress} 
                    onChangeText={setEditAddress}
                    placeholder="Modify pickup address"
                  />
                </View>

                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Items Ordered</Text>
                  {(() => {
                    let items = [];
                    try {
                      items = typeof selectedOrder.details === 'string' ? JSON.parse(selectedOrder.details) : selectedOrder.details;
                    } catch (e) {}

                    if (!Array.isArray(items) || items.length === 0) {
                      return <Text style={{ color: '#64748b' }}>No items listed.</Text>;
                    }

                    return items.map((itm, index) => (
                      <View key={index} style={styles.itemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '600', color: '#1e293b' }}>{itm.itemName || itm.name}</Text>
                          <Text style={{ fontSize: 12, color: '#64748b' }}>Code: {itm.itemCode || itm.code}</Text>
                        </View>
                        <Text style={{ fontWeight: '600', color: '#4338ca' }}>Qty: {itm.Qty || itm.quantity} | Rate: ₹{itm.rate}</Text>
                      </View>
                    ));
                  })()}
                </View>

                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Status Management</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {selectedOrder.status !== 'Delivered' && (
                      <TouchableOpacity onPress={() => handleUpdateStatus('Delivered')} style={[styles.stateBtn, { backgroundColor: '#10b981' }]}>
                        <Text style={styles.stateBtnText}>Mark Delivered</Text>
                      </TouchableOpacity>
                    )}
                    {selectedOrder.status !== 'Cancelled' && (
                      <TouchableOpacity onPress={() => handleUpdateStatus('Cancelled')} style={[styles.stateBtn, { backgroundColor: '#ef4444' }]}>
                        <Text style={styles.stateBtnText}>Cancel Order</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsTitle}>Activity Logs & Notes</Text>
                  <View style={{ marginTop: 10 }}>
                    <TextInput 
                      style={[styles.modalInput, { height: 60 }]} 
                      multiline 
                      value={newNote} 
                      onChangeText={setNewNote} 
                      placeholder="Add status or activity note..." 
                    />
                    <TouchableOpacity onPress={handleAddNote} style={styles.noteSaveBtn}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save note & updates</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 350 }]}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 }}>Delete Purchase Order</Text>
            <Text style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>Are you sure you want to delete this purchase order? This action cannot be undone.</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#e2e8f0' }]} onPress={() => { setDeleteModalVisible(false); setDeleteOrderTarget(null); }}>
                <Text style={{ color: '#475569', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#ef4444' }]} onPress={handleDeleteSubmit}>
                <Text style={styles.saveBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const webFilterInputStyle = {
  padding: '6px 10px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#fff',
  fontSize: '13px',
  boxSizing: 'border-box',
  outlineStyle: 'none'
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10, zIndex: 100, elevation: 10, position: 'relative' },
  filters: { flexDirection: 'row', gap: 10, flex: 1, flexWrap: 'wrap', alignItems: 'center', zIndex: 100, elevation: 10, position: 'relative' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, height: 32, width: 210 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, height: '100%', outlineStyle: 'none', fontSize: 13, color: '#334155' },
  dropdownWrapper: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff', height: 32, justifyContent: 'center', minWidth: 140 },
  picker: { height: 32, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 6, ...Platform.select({ web: { outlineStyle: 'none' } }), fontSize: 13, color: '#334155' },
  riderSelectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 32, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', minWidth: 160, gap: 6 },
  riderDropdown: { position: 'absolute', top: 36, left: 0, right: 0, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5, padding: 8, zIndex: 999, minWidth: 200 },
  riderSearchInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 6, fontSize: 13, marginBottom: 8 },
  riderDropdownItem: { paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, height: 32 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  statusChipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  statusChipActive: { backgroundColor: '#4338ca', borderColor: '#4338ca' },
  statusChipText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  statusChipTextActive: { color: 'white', fontWeight: '600' },
  tableContainer: { flex: 1, minHeight: 400, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
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
  mobileDateInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, backgroundColor: '#fff', height: 32 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: '#64748b', fontSize: 14 },
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
  saveBtn: { backgroundColor: '#1e293b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  paginationContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 8, marginTop: 8, alignSelf: 'flex-end' },
  pageButton: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: '#4338ca', justifyContent: 'center', alignItems: 'center' },
  pageButtonDisabled: { backgroundColor: '#e2e8f0' },
  pageButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  pageButtonTextDisabled: { color: '#94a3b8' },
  pageInfoText: { fontSize: 12, color: '#64748b', fontWeight: '500', marginHorizontal: 4 },
  detailsGroup: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 },
  detailsTitle: { fontSize: 14, fontWeight: 'bold', color: '#4338ca', marginBottom: 8 },
  detailsText: { fontSize: 13, color: '#334155', marginBottom: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  stateBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  stateBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  noteSaveBtn: { backgroundColor: '#4338ca', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  modalInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#f8fafc', color: '#334155' }
});
