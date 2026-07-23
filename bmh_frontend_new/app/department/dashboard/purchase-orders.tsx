import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Modal, TextInput, useWindowDimensions, ScrollView, Image } from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { Package, MapPin, Bus, User, Map, CheckCircle, Search, Calendar, FileText, Eye, Share2, Plus, Phone, Navigation, ChevronDown, X } from 'lucide-react-native';
import { Share } from 'react-native';

const webDatePickerStyle: any = {
  height: '32px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '#cbd5e1',
  borderRadius: '8px',
  paddingHorizontal: '8px',
  fontSize: '13px',
  backgroundColor: '#fff',
  color: '#334155',
  outlineStyle: 'none',
  padding: '4px 6px',
  fontFamily: 'inherit',
  width: '125px',
  maxWidth: '125px'
};

const webFilterInputStyle = webDatePickerStyle;

export default function PurchaseOrdersScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;

  const [orders, setOrders] = useState<any[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [storeDeliveryFleet, setStoreDeliveryFleet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getAssigneeName = (boyId: any, assignedUserType: any) => {
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
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState('All');

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);

  const [assignOrder, setAssignOrder] = useState<any>(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  
  // Assign options
  const [deliveryType, setDeliveryType] = useState('Store'); // Store, Local, Bus
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

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editAddress, setEditAddress] = useState('');
  const [newNote, setNewNote] = useState('');

  // Buses list for picker
  const [buses, setBuses] = useState<any[]>([]);

  // Create Form State (Wholesaler Purchase Order creation)
  const initialFormData = {
    custname: '',
    custcode: '',
    refname: '',
    refcode: '',
    total: '',
    details: '[]',
    delivery_type: 'Store',
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
    } catch (err: any) {
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

  const fetchDeliveryBoys = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/employees/delivery-fleet');
      if (res.data && res.data.success) {
        setDeliveryBoys(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching delivery fleet:', err);
    }
  };

  const fetchStoreDeliveryFleet = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/employees/store-delivery-fleet');
      if (res.data && res.data.success) {
        setStoreDeliveryFleet(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchBuses();
    fetchDeliveryBoys();
    fetchStoreDeliveryFleet();
    const interval = setInterval(() => {
      fetchPurchaseOrders(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (assignOrder) {
      let lat = '';
      let lng = '';
      if (assignOrder.map_lat && assignOrder.map_lng) {
        lat = assignOrder.map_lat;
        lng = assignOrder.map_lng;
      } else if (assignOrder.location_link || assignOrder.gps_location) {
        const link = assignOrder.location_link || assignOrder.gps_location;
        const decMatch = String(link).trim().match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
        if (decMatch) {
          lat = decMatch[1];
          lng = decMatch[2];
        } else {
          const urlMatch = String(link).match(/query=([-\d.]+),([-\d.]+)/) || 
                           String(link).match(/q=([-\d.]+),([-\d.]+)/) ||
                           String(link).match(/place\/([-\d.]+),([-\d.]+)/) ||
                           String(link).match(/@([-\d.]+),([-\d.]+)/);
          if (urlMatch) {
            lat = urlMatch[1];
            lng = urlMatch[2];
          }
        }
      }
      
      let url = 'https://napi.bharatmedicalhallplus.com/employees/delivery-fleet';
      if (lat && lng) {
        url += `?lat=${lat}&lng=${lng}`;
      }
      axios.get(url).then(res => {
        if (res.data && res.data.success) {
          setDeliveryBoys(res.data.data);
        }
      }).catch(err => console.log("Failed to fetch fleet recommendations:", err));
    }
  }, [assignOrder]);

  const handleBusSelection = (busId: string) => {
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

  const handleAssignBoy = async (orderId: number, boyId: string) => {
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

      const targetOrder = assignOrder || orders.find(o => o.id === orderId);

      let riderIdVal = boyId;
      let userType = 'employee';
      if (typeof riderIdVal === 'string' && riderIdVal.startsWith('SA-')) {
        riderIdVal = riderIdVal.replace('SA-', '');
        userType = 'sub_admin';
      }
      const riderIdInt = riderIdVal && riderIdVal !== 'null' ? parseInt(riderIdVal, 10) : null;

      const payload = {
        delivery_type: deliveryType,
        delivery_boy_id: riderIdInt,
        delivery_assigned_user_type: userType,
        address: deliveryType === 'Local' ? address : null,
        gps_location: deliveryType === 'Local' ? gpsLocation : null,
        bus_details: deliveryType === 'Bus' ? busDetails : null,
        assigned_by: assignedBy
      };

      const res = await axios.post(`https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/assign/${orderId}`, payload);
      if (res.data.success) {
        alert('Rider assigned successfully!');
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
          author = 'Admin';
          modifiedById = auth.id;
          modifiedByType = 'Admin';
          authName = auth.full_name || auth.name || 'Admin';
        } else if (empUser) {
          const auth = JSON.parse(empUser);
          author = 'Employee';
          modifiedById = auth.id;
          modifiedByType = 'Employee';
          authName = auth.name || 'Employee';
        }
      }

      const newNoteObj = {
        id: Date.now().toString(),
        text: newNote,
        date: new Date().toISOString(),
        author: authName
      };

      let existingNotes: any[] = [];
      try {
        existingNotes = typeof selectedOrder.notes === 'string' ? JSON.parse(selectedOrder.notes) : (selectedOrder.notes || []);
      } catch(e) {}
      if (!Array.isArray(existingNotes)) existingNotes = [];

      const updatedNotes = [...existingNotes, newNoteObj];

      const res = await axios.post(`https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/notes/${selectedOrder.id}`, {
        notes: JSON.stringify(updatedNotes),
        modified_by_id: modifiedById,
        modified_by_type: modifiedByType,
        modified_by_name: authName
      });

      if (res.data.success) {
        setNewNote('');
        const updatedOrd = { ...selectedOrder, notes: updatedNotes, modified_by_name: authName };
        setSelectedOrder(updatedOrd);
        // refresh in list
        setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrd : o));
      }
    } catch(err) {
      alert('Failed to add note');
    }
  };

  const handleSaveAddress = async () => {
    try {
      let modifiedById = null;
      let modifiedByType = 'Employee';
      let authName = 'Employee';

      if (typeof window !== 'undefined') {
        const adminUser = localStorage.getItem('superAdminUser') || localStorage.getItem('subAdminUser');
        const empUser = localStorage.getItem('employeeUser');
        if (adminUser) {
          const auth = JSON.parse(adminUser);
          modifiedById = auth.id;
          modifiedByType = 'Admin';
          authName = auth.full_name || auth.name || 'Admin';
        } else if (empUser) {
          const auth = JSON.parse(empUser);
          modifiedById = auth.id;
          modifiedByType = 'Employee';
          authName = auth.name || 'Employee';
        }
      }

      const targetAddress = selectedOrder.delivery_type === 'Local' ? editAddress : null;
      const res = await axios.post(`https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/address/${selectedOrder.id}`, {
        address: targetAddress,
        delivery_type: selectedOrder.delivery_type,
        modified_by_id: modifiedById,
        modified_by_type: modifiedByType,
        modified_by_name: authName
      });

      if (res.data.success) {
        alert('Details updated successfully!');
        const updatedOrd = { ...selectedOrder, address: targetAddress, delivery_type: selectedOrder.delivery_type, modified_by_name: authName };
        setSelectedOrder(updatedOrd);
        setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrd : o));
        fetchPurchaseOrders(true);
      }
    } catch (err) {
      alert('Failed to update details');
    }
  };

  const handleSelectOrderForView = (order: any) => {
    let parsedNotes = [];
    try {
      parsedNotes = typeof order.notes === 'string' ? JSON.parse(order.notes) : (order.notes || []);
    } catch(e) {}
    if (!Array.isArray(parsedNotes)) parsedNotes = [];
    
    setSelectedOrder({ ...order, notes: parsedNotes });
    setEditAddress(order.address || '');
    setViewModalVisible(true);
  };

  const handleShareOrder = async (order: any) => {
    let itemsStr = '';
    try {
      const items = typeof order.details === 'string' ? JSON.parse(order.details) : (order.details || []);
      if (Array.isArray(items)) {
        itemsStr = items.map(itm => `- ${itm.itemName || itm.name} (Qty: ${itm.Qty || itm.quantity})`).join('\n');
      }
    } catch (e) {}

    const text = `*BHARAT MEDICAL HALL - PURCHASE ORDER*\n\nOrder No: ${order.prefix || ''}${order.year || ''}${order.srno || ''}\nWholesaler: ${order.custname || '-'}\nTotal Amount: ₹${order.total || '0.00'}\n\n*Items:*\n${itemsStr || 'No details'}\n\nDelivery Mode: ${order.delivery_type || 'Local'}\n${order.address ? `Address: ${order.address}\n` : ''}`;
    try {
      await Share.share({ message: text });
    } catch (e) {
      console.log('Sharing failed', e);
    }
  };

  const openAssignModal = (order: any) => {
    setAssignOrder(order);
    setDeliveryType(order.delivery_type || 'Store');
    setSelectedRiderId(order.delivery_boy_id?.toString() || '');
    setAddress(order.address || '');
    setGpsLocation(order.gps_location || '');
    if (order.bus_details) {
      try {
        const bd = typeof order.bus_details === 'string' ? JSON.parse(order.bus_details) : order.bus_details;
        setBusDetails({
          bus_travels_name: bd.bus_travels_name || '',
          bus_driver_name: bd.bus_driver_name || '',
          bus_driver_number: bd.bus_driver_number || '',
          bus_number: bd.bus_number || '',
          bus_date: bd.bus_date || '',
          scheduled_time: bd.scheduled_time || ''
        });
      } catch (e) {
        setBusDetails({ bus_travels_name: '', bus_driver_name: '', bus_driver_number: '', bus_number: '', bus_date: '', scheduled_time: '' });
      }
    } else {
      setBusDetails({ bus_travels_name: '', bus_driver_name: '', bus_driver_number: '', bus_number: '', bus_date: '', scheduled_time: '' });
    }
    setAssignModalVisible(true);
  };

  // Unique creators dynamically
  const uniqueCreators = ['All', ...Array.from(new Set(orders.map(o => o.createuser || o.modified_by_name || 'SYSTEM').filter(Boolean)))];

  // Filtering
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.custname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (`${order.prefix || ''}${order.year || ''}${order.srno || ''}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.refname || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Status Assignment filter
    let matchesAssignment = true;
    if (assignmentFilter === 'Pending') {
      matchesAssignment = order.status !== 'Assigned' && order.status !== 'Delivered' && order.status !== 'Completed' && order.status !== 'Not Available' && order.status !== 'Cancelled';
    } else if (assignmentFilter === 'Assigned') {
      matchesAssignment = order.status === 'Assigned';
    } else if (assignmentFilter === 'Delivered') {
      matchesAssignment = order.status === 'Delivered' || order.status === 'Completed';
    } else if (assignmentFilter === 'Not Available') {
      matchesAssignment = order.status === 'Not Available' || order.status === 'Cancelled';
    }

    // Date range filter
    let matchesDate = true;
    if (startDate) {
      const orderDate = new Date(order.created_at || order.createdatetime).toISOString().split('T')[0];
      matchesDate = orderDate >= startDate;
    }
    if (endDate && matchesDate) {
      const orderDate = new Date(order.created_at || order.createdatetime).toISOString().split('T')[0];
      matchesDate = orderDate <= endDate;
    }

    // Rider filter
    let matchesRider = true;
    if (selectedBoyId !== 'All') {
      matchesRider = order.delivery_boy_id?.toString() === selectedBoyId.toString();
    }

    // Creator filter
    let matchesCreator = true;
    if (selectedCreator !== 'All') {
      matchesCreator = (order.createuser || order.modified_by_name || 'SYSTEM').toLowerCase() === selectedCreator.toLowerCase();
    }

    // Delivery Type Filter
    let matchesDeliveryType = true;
    if (deliveryTypeFilter !== 'All') {
      const type = (order.delivery_type || order.mode_of_delivery || 'Local').toLowerCase();
      if (deliveryTypeFilter === 'Counter') {
        matchesDeliveryType = type === 'counter' || type === 'store';
      } else if (deliveryTypeFilter === 'Local') {
        matchesDeliveryType = type === 'local' || type === 'schedule delivery';
      } else if (deliveryTypeFilter === 'Bus') {
        matchesDeliveryType = type === 'bus';
      }
    }

    return matchesSearch && matchesAssignment && matchesDate && matchesRider && matchesCreator && matchesDeliveryType;
  });

  // Sort latest on top
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dA = new Date(a.created_at || a.createdatetime || 0).getTime();
    const dB = new Date(b.created_at || b.createdatetime || 0).getTime();
    return dB - dA;
  });

  const rowsPerPage = 50;
  const totalPages = Math.ceil(sortedOrders.length / rowsPerPage) || 1;
  const paginatedOrders = sortedOrders.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, assignmentFilter, startDate, endDate, selectedBoyId, selectedCreator]);

  const renderOrderItem = ({ item, index }: { item: any, index: number }) => {
    const formattedDate = item.created_at || item.createdatetime
      ? new Date(item.created_at || item.createdatetime).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
        })
      : '-';

    let statusColor = '#94a3b8'; 
    if (item.status === 'Pending') statusColor = '#3b82f6';
    else if (item.status === 'Assigned') statusColor = '#f59e0b';
    else if (item.status === 'Delivered' || item.status === 'Completed') statusColor = '#10b981';
    else if (item.status === 'Not Available') statusColor = '#ef4444';
    else if (item.status === 'Cancelled') statusColor = '#ef4444';

    if (!isDesktop) {
      return (
        <View style={{ borderLeftColor: statusColor, borderLeftWidth: 4, backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {item.delivery_type === 'Bus' ? <Bus size={14} color="#64748b" /> : 
               item.delivery_type === 'Local' ? <MapPin size={14} color="#64748b" /> :
               <Package size={14} color="#64748b" />}
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1e293b' }}>
                {item.prefix || 'PO'}{item.year || ''}{item.srno || ''}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor }]}>
              <Text style={styles.badgeText}>{item.status || 'Pending'}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 4 }}>{item.custname}</Text>
          {item.refname ? <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Ref: {item.refname}</Text> : null}
          {item.address ? <Text style={{ fontSize: 12, color: '#4338ca', marginBottom: 4 }}>Addr: {item.address}</Text> : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#64748b' }}>Date: {formattedDate}</Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Creator: {item.createuser || 'SYSTEM'}</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#0f172a' }}>₹{item.total}</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, backgroundColor: '#f8fafc', padding: 8, borderRadius: 6 }}>
            <View style={{ flex: 1 }}>
              {item.status === 'Delivered' || item.status === 'Completed' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <User size={14} color="#64748b" style={{ marginRight: 4 }}/>
                  <Text style={{ fontSize: 12, color: '#334155', flex: 1 }} numberOfLines={1}>
                    {getAssigneeName(item.delivery_boy_id, item.delivery_assigned_user_type)}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.pickerWrapper, { paddingHorizontal: 8, height: 28, justifyContent: 'center', backgroundColor: '#fff', width: 140 }]}
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
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
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
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff' }]}>
        {/* Status Badge & Mode Icon */}
        <View style={[styles.cell, { flex: 0.8, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
          {item.delivery_type === 'Bus' ? <Bus size={14} color="#64748b" /> : 
           item.delivery_type === 'Local' ? <MapPin size={14} color="#64748b" /> :
           <Package size={14} color="#64748b" />}
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{item.status || 'Pending'}</Text>
          </View>
        </View>

        {/* Customer / Wholesaler */}
        <View style={[styles.cell, { flex: 1.5 }]}>
          <Text style={styles.cellTextBold} numberOfLines={1}>{item.custname || '-'}</Text>
          <Text style={styles.cellSubText}>Ref: {item.refname || '-'}</Text>
        </View>

        {/* Order Number */}
        <View style={[styles.cell, { flex: 1 }]}>
          <Text style={styles.cellTextBold}>{item.prefix || ''}{item.year || ''}{item.srno || ''}</Text>
          <Text style={styles.cellSubText}>Br: {item.br_code || '001'}</Text>
        </View>

        {/* Delivery Boy selection dropdown */}
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
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Filter Panel */}
      <View style={styles.header}>
        <View style={styles.filters}>
          <View style={styles.searchContainer}>
            <Search size={16} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search PO/Wholesaler..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Rider selection dropdown */}
          <View style={{ position: 'relative', zIndex: 999 }}>
            <TouchableOpacity 
              style={styles.riderSelectBtn}
              onPress={() => setRiderDropdownOpen(!riderDropdownOpen)}
            >
              <Text style={{ fontSize: 13, color: '#334155' }} numberOfLines={1}>
                Rider: {getAssigneeName(selectedBoyId, selectedOrder?.delivery_assigned_user_type)}
              </Text>
              <ChevronDown size={14} color="#64748b" />
            </TouchableOpacity>

            {riderDropdownOpen && (
              <View style={styles.riderDropdown}>
                <TextInput
                  style={styles.riderSearchInput}
                  placeholder="Search Rider..."
                  value={deliveryBoySearchQuery}
                  onChangeText={setDeliveryBoySearchQuery}
                  placeholderTextColor="#94a3b8"
                />
                <ScrollView style={{ maxHeight: 200 }}>
                  <TouchableOpacity 
                    style={styles.riderDropdownItem}
                    onPress={() => {
                      setSelectedBoyId('All');
                      setRiderDropdownOpen(false);
                      setDeliveryBoySearchQuery('');
                    }}
                  >
                    <Text style={{ fontSize: 13, color: selectedBoyId === 'All' ? '#4338ca' : '#334155', fontWeight: selectedBoyId === 'All' ? '600' : '400' }}>All Riders</Text>
                  </TouchableOpacity>
                  {deliveryBoys
                    .filter(b => b.full_name?.toLowerCase().includes(deliveryBoySearchQuery.toLowerCase()))
                    .map(boy => (
                      <TouchableOpacity 
                        key={boy.id}
                        style={styles.riderDropdownItem}
                        onPress={() => {
                          setSelectedBoyId(boy.id);
                          setRiderDropdownOpen(false);
                          setDeliveryBoySearchQuery('');
                        }}
                      >
                        <Text style={{ fontSize: 13, color: selectedBoyId?.toString() === boy.id?.toString() ? '#4338ca' : '#334155', fontWeight: selectedBoyId?.toString() === boy.id?.toString() ? '600' : '400' }}>{boy.full_name}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Delivery Type Filter */}
          <View style={styles.dropdownWrapper}>
            <Picker
              selectedValue={deliveryTypeFilter}
              onValueChange={(val) => setDeliveryTypeFilter(val)}
              style={styles.picker}
            >
              <Picker.Item label="All Delivery Types" value="All" />
              <Picker.Item label="Counter/Store" value="Counter" />
              <Picker.Item label="Local" value="Local" />
              <Picker.Item label="Bus" value="Bus" />
            </Picker>
          </View>

          {/* Date range inputs */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Calendar size={16} color="#64748b" />
            {Platform.OS === 'web' ? (
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                style={webFilterInputStyle} 
              />
            ) : (
              <TextInput 
                style={[styles.pickerWrapper, { width: 100, paddingHorizontal: 8, fontSize: 12 }]} 
                placeholder="From Date" 
                value={startDate} 
                onChangeText={setStartDate} 
              />
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
              <TextInput 
                style={[styles.pickerWrapper, { width: 100, paddingHorizontal: 8, fontSize: 12 }]} 
                placeholder="To Date" 
                value={endDate} 
                onChangeText={setEndDate} 
              />
            )}

            {(startDate || endDate) && (
              <TouchableOpacity onPress={() => { setStartDate(''); setEndDate(''); }} style={{ padding: 4 }}>
                <X size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModalVisible(true)}>
            <Plus size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.addBtnText}>Add Orders</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dynamic Creator Filter Tabs */}
      <View style={styles.creatorTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
          {uniqueCreators.map((creator) => (
            <TouchableOpacity
              key={creator}
              onPress={() => {
                setSelectedCreator(creator);
                setPage(1);
              }}
              style={[
                styles.creatorTab,
                selectedCreator === creator && styles.creatorTabActive
              ]}
            >
              <Text style={[
                styles.creatorTabText,
                selectedCreator === creator && styles.creatorTabTextActive
              ]}>
                {creator === 'All' ? 'All Creators' : creator}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Assignment Filters (All, Pending, Assigned, Delivered, Not Available) */}
      <View style={styles.statusChipsRow}>
        {['All', 'Pending', 'Assigned', 'Delivered', 'Not Available'].map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => setAssignmentFilter(status)}
            style={[
              styles.statusChip,
              assignmentFilter === status && styles.statusChipActive
            ]}
          >
            <Text style={[
              styles.statusChipText,
              assignmentFilter === status && styles.statusChipTextActive
            ]}>
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={isDesktop ? styles.tableContainer : { flex: 1, minHeight: 400 }}>
        {/* Table Header */}
        {isDesktop && (
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
        )}

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

        {/* Pagination Controls */}
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
                  <TextInput style={styles.input} value={formData.custcode} onChangeText={(t) => setFormData({...formData, custcode: t})} placeholder="e.g. S00033" />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Sales Reference / Supplier Name</Text>
                  <TextInput style={styles.input} value={formData.refname} onChangeText={(t) => setFormData({...formData, refname: t})} placeholder="e.g. BHARAT MEDICAL HALL" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Reference Code</Text>
                  <TextInput style={styles.input} value={formData.refcode} onChangeText={(t) => setFormData({...formData, refcode: t})} placeholder="e.g. REF001" />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Total Amount *</Text>
                  <TextInput style={styles.input} value={formData.total} onChangeText={(t) => setFormData({...formData, total: t})} placeholder="₹ Total Amount" keyboardType="numeric" />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Delivery Mode *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.delivery_type}
                      onValueChange={(itemValue) => setFormData({...formData, delivery_type: itemValue})}
                      style={styles.formPicker}
                    >
                      <Picker.Item label="Direct Store Pickup" value="Store" />
                      <Picker.Item label="Local Delivery" value="Local" />
                      <Picker.Item label="Bus Transport" value="Bus" />
                    </Picker>
                  </View>
                </View>
              </View>

              {formData.delivery_type === 'Local' && (
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Delivery Address</Text>
                    <TextInput style={styles.input} value={formData.address} onChangeText={(t) => setFormData({...formData, address: t})} placeholder="e.g. Baripada, Odisha" />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>GPS Coordinates / Location URL</Text>
                    <TextInput style={styles.input} value={formData.gps_location} onChangeText={(t) => setFormData({...formData, gps_location: t})} placeholder="GPS link" />
                  </View>
                </View>
              )}

              {formData.delivery_type === 'Bus' && (
                <>
                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Select From Template (Pre-configured Buses)</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue=""
                          onValueChange={(val) => handleBusSelection(val)}
                          style={styles.formPicker}
                        >
                          <Picker.Item label="-- Choose Bus Route --" value="" />
                          {buses.map(b => (
                            <Picker.Item key={b.id} label={`${b.operator_name || b.bus_name} (${b.bus_number})`} value={b.id.toString()} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Bus Travels / Operator Name</Text>
                      <TextInput style={styles.input} value={formData.bus_travels_name} onChangeText={(t) => setFormData({...formData, bus_travels_name: t})} placeholder="e.g. Dilip Travels" />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Driver Name</Text>
                      <TextInput style={styles.input} value={formData.bus_driver_name} onChangeText={(t) => setFormData({...formData, bus_driver_name: t})} placeholder="e.g. John Doe" />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Driver Contact Number</Text>
                      <TextInput style={styles.input} value={formData.bus_driver_number} onChangeText={(t) => setFormData({...formData, bus_driver_number: t})} placeholder="e.g. 9876543210" />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Bus Plate Number</Text>
                      <TextInput style={styles.input} value={formData.bus_number} onChangeText={(t) => setFormData({...formData, bus_number: t})} placeholder="e.g. OR 11 A 1234" />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Departure/Arrival Date</Text>
                      {Platform.OS === 'web' ? (
                        <input
                          type="date"
                          value={formData.bus_date}
                          onChange={(e) => setFormData({...formData, bus_date: e.target.value})}
                          style={webDatePickerStyle}
                        />
                      ) : (
                        <TextInput style={styles.input} value={formData.bus_date} onChangeText={(t) => setFormData({...formData, bus_date: t})} placeholder="YYYY-MM-DD" />
                      )}
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Scheduled Departure Time</Text>
                      <TextInput style={styles.input} value={formData.scheduled_time} onChangeText={(t) => setFormData({...formData, scheduled_time: t})} placeholder="e.g. 10:30 AM" />
                    </View>
                  </View>
                </>
              )}

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Items / JSON Details Array</Text>
                  <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    multiline
                    value={formData.details}
                    onChangeText={(t) => setFormData({...formData, details: t})}
                    placeholder='e.g. [{"itemName":"Product A","itemCode":"P1","Qty":10,"rate":100}]'
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateSubmit}>
                <Text style={styles.saveBtnText}>Submit Order</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* VIEW ORDER DETAILS & LOGS & NOTES MODAL */}
      {selectedOrder && (
        <Modal visible={viewModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isDesktop ? 900 : '95%', maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>PO Detailed Specifications</Text>
                <TouchableOpacity onPress={() => { setViewModalVisible(false); setSelectedOrder(null); }}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                  
                  {/* Left Column: Spec Sheet */}
                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.sectionHeader}>Reference Spec sheet</Text>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Wholesaler:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.custname}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Code:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.custcode || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Order Ident:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.prefix}{selectedOrder.year}{selectedOrder.srno}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Supplier Ref:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.refname} (Code: {selectedOrder.refcode || '-'})</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Amount:</Text>
                      <Text style={[styles.detailValue, { fontWeight: '700', color: '#10b981' }]}>₹{selectedOrder.total}</Text>
                    </View>
                    <View style={{ marginVertical: 6 }}>
                      <Text style={styles.detailLabel}>Delivery Mode:</Text>
                      <View style={[styles.dropdownWrapper, { marginTop: 4, height: 35, width: '100%', justifyContent: 'center' }]}>
                        <Picker
                          selectedValue={selectedOrder.delivery_type || 'Local'}
                          onValueChange={(val) => setSelectedOrder({ ...selectedOrder, delivery_type: val })}
                          style={styles.picker}
                        >
                          <Picker.Item label="Store Pickup" value="Store" />
                          <Picker.Item label="Local Pickup/Delivery" value="Local" />
                          <Picker.Item label="Bus Transport" value="Bus" />
                        </Picker>
                      </View>
                    </View>

                    {selectedOrder.delivery_type === 'Local' && (
                      <View style={{ marginTop: 8, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>Pickup Details</Text>
                        <TextInput 
                          style={[styles.input, { marginBottom: 8, fontSize: 13, padding: 8 }]} 
                          value={editAddress} 
                          onChangeText={setEditAddress}
                          placeholder="Edit Pickup/Delivery Address"
                        />
                        
                        {selectedOrder.gps_location ? (
                          <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}
                            onPress={() => window.open(selectedOrder.gps_location, '_blank')}
                          >
                            <Navigation size={14} color="#2563eb" />
                            <Text style={{ fontSize: 12, color: '#2563eb', textDecorationLine: 'underline' }}>Open Maps URL Coordinates</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    )}

                    {selectedOrder.delivery_type === 'Bus' && selectedOrder.bus_details && (
                      <View style={{ marginTop: 8, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>Bus Consignment Details</Text>
                        {(() => {
                          let bd: any = {};
                          try {
                            bd = typeof selectedOrder.bus_details === 'string' ? JSON.parse(selectedOrder.bus_details) : selectedOrder.bus_details;
                          } catch(e) {}
                          return (
                            <View style={{ gap: 4 }}>
                              <Text style={{ fontSize: 12, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Travels:</Text> {bd.bus_travels_name || bd.bus_name || '-'}</Text>
                              <Text style={{ fontSize: 12, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Plate:</Text> {bd.bus_number || '-'}</Text>
                              <Text style={{ fontSize: 12, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Driver:</Text> {bd.bus_driver_name || '-'} ({bd.bus_driver_number || '-'})</Text>
                              <Text style={{ fontSize: 12, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Departure Time:</Text> {bd.scheduled_time || '-'}</Text>
                              <Text style={{ fontSize: 12, color: '#475569' }}><Text style={{ fontWeight: '600' }}>Date:</Text> {bd.bus_date || '-'}</Text>
                            </View>
                          );
                        })()}
                      </View>
                    )}

                    <TouchableOpacity style={[styles.saveBtn, { paddingVertical: 8, marginTop: 12 }]} onPress={handleSaveAddress}>
                      <Text style={{ fontSize: 13, color: '#fff', fontWeight: 'bold' }}>Save Updates</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Right Column: Items and Notes */}
                  <View style={{ flex: 1.5, gap: 16 }}>
                    {/* Items Section */}
                    <View>
                      <Text style={styles.sectionHeader}>Line Items Array List</Text>
                      <View style={styles.itemsTable}>
                        {(() => {
                          let items: any[] = [];
                          try {
                            items = typeof selectedOrder.details === 'string' ? JSON.parse(selectedOrder.details) : selectedOrder.details;
                          } catch(e) {}

                          if (!Array.isArray(items) || items.length === 0) {
                            return <Text style={{ fontSize: 13, color: '#64748b', padding: 12 }}>No items details recorded.</Text>;
                          }

                          return items.map((itm, idx) => (
                            <View key={idx} style={styles.itemRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e293b' }}>{itm.itemName || itm.name}</Text>
                                <Text style={{ fontSize: 11, color: '#64748b' }}>Code: {itm.itemCode || itm.code || '-'}</Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#4338ca' }}>Qty: {itm.Qty || itm.quantity}</Text>
                                <Text style={{ fontSize: 11, color: '#64748b' }}>Rate: ₹{itm.rate}</Text>
                              </View>
                            </View>
                          ));
                        })()}
                      </View>
                    </View>

                    {/* Notes & Audit Trails */}
                    <View>
                      <Text style={styles.sectionHeader}>Action Logs & Notes</Text>
                      
                      {/* Notes list */}
                      <View style={{ maxHeight: 150, marginBottom: 10 }}>
                        {selectedOrder.notes && selectedOrder.notes.length > 0 ? (
                          selectedOrder.notes.map((n: any, idx: number) => (
                            <View key={idx} style={styles.noteItem}>
                              <Text style={{ fontSize: 12, color: '#334155', fontWeight: '500' }}>{n.text}</Text>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                <Text style={{ fontSize: 10, color: '#94a3b8' }}>By: {n.author}</Text>
                                <Text style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(n.date).toLocaleDateString()}</Text>
                              </View>
                            </View>
                          ))
                        ) : (
                          <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', paddingVertical: 6 }}>No comments logged yet.</Text>
                        )}
                      </View>

                      {/* Add note input */}
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          style={[styles.input, { flex: 1, padding: 8, fontSize: 13 }]}
                          placeholder="Log notes / delivery coordinates..."
                          value={newNote}
                          onChangeText={setNewNote}
                        />
                        <TouchableOpacity style={[styles.saveBtn, { paddingHorizontal: 16, marginTop: 0 }]} onPress={handleAddNote}>
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Add Log</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* RIDER ASSIGNMENT MODAL (IDENTICAL TO ORDER-ASSIGN TAB) */}
      {assignOrder && (
        <Modal visible={assignModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isDesktop ? 500 : '90%', height: isDesktop ? undefined : 520, maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { fontSize: isDesktop ? 20 : 16, flex: 1 }]} numberOfLines={1}>Assign Rider (PO #{assignOrder.prefix || ''}{assignOrder.year || ''}{assignOrder.srno || ''})</Text>
                <TouchableOpacity onPress={() => { setAssignModalVisible(false); setAssignOrder(null); }}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
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
                <View style={[styles.dropdownWrapper, { marginBottom: 12, width: '100%', maxWidth: '100%', overflow: 'hidden' }]}>
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
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#ef4444', marginRight: 8, paddingHorizontal: 16 }]} onPress={() => { setAssignModalVisible(false); setAssignOrder(null); }}>
                  <Text style={styles.saveBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { paddingHorizontal: 16 }]} onPress={handleAssignSubmit}>
                  <Text style={styles.saveBtnText}>Confirm Assignment</Text>
                </TouchableOpacity>
              </View>
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
  filters: { flexDirection: 'row', gap: 10, flex: 1, flexWrap: 'wrap', alignItems: 'center', zIndex: 100, elevation: 10, position: 'relative' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, height: 32, width: 210 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, height: '100%', outlineStyle: 'none' as any, fontSize: 13, color: '#334155' },
  dropdownWrapper: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff', height: 32, justifyContent: 'center', minWidth: 140, maxWidth: '100%', overflow: 'hidden' },
  picker: { height: 32, width: '100%', maxWidth: '100%', borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 6, ...Platform.select({ web: { outlineStyle: 'none' } }) as any, fontSize: 13, color: '#334155' },
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
  creatorTabsWrapper: { backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 12, borderRadius: 8 },
  creatorTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0', marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  creatorTabActive: { backgroundColor: '#4338ca' },
  creatorTabText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  creatorTabTextActive: { color: '#fff' },
  tableContainer: { flex: 1, minHeight: 400, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  cell: { paddingRight: 8 },
  cellText: { fontSize: 13, color: '#334155' },
  cellTextBold: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  cellSubText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#fff', textTransform: 'capitalize' },
  pickerWrapper: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, backgroundColor: '#fff', height: 28, justifyContent: 'center' },
  actionBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '95%', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  modalBody: { flex: 1 },
  formRow: { flexDirection: 'row', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  formCol: { flex: 1, minWidth: 200 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 2, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 8, fontSize: 13 },
  pickerContainer: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, height: 35, justifyContent: 'center', backgroundColor: '#fff' },
  formPicker: { height: 35, borderWidth: 0, backgroundColor: 'transparent' },
  saveBtn: { backgroundColor: '#4338ca', paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  modalFooter: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16, marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end' },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 6, marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  detailValue: { fontSize: 12, color: '#0f172a' },
  itemsTable: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  noteItem: { backgroundColor: '#f8fafc', padding: 8, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#4338ca', marginBottom: 6 },
  emptyContainer: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { marginTop: 10, color: '#94a3b8', fontSize: 14 },
  paginationContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 8, marginTop: 8, alignSelf: 'flex-end' },
  pageButton: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: '#4338ca', justifyContent: 'center', alignItems: 'center' },
  pageButtonDisabled: { backgroundColor: '#e2e8f0' },
  pageButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  pageButtonTextDisabled: { color: '#94a3b8' },
  pageInfoText: { fontSize: 12, color: '#64748b', fontWeight: '500', marginHorizontal: 4 }
});
