import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, Modal, TextInput, Alert, ScrollView, Image } from 'react-native';
import { Package, Plus, Minus, ShoppingCart, Clock, Eye, Upload, X, Calendar, DollarSign, Trash2, Check, Edit2 } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useResponsive } from '../../../hooks/useResponsive';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';

type StationaryItem = { id: string; name: string; stock: number; image: string; status: string; created_at: string; };
type RequestHistory = { id: string; status: string; notes: string; created_at: string; approved_by?: string; approved_by_name?: string; approved_by_role?: string; approved_by_dept?: string; items: { id: string; item_id: string; name: string; requested_qty: number; approved_qty: number; }[]; };

const formatDate = (dateStr: any) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${pad(hours)}:${minutes} ${ampm}`;
  return `${day}-${month}-${year}, ${timeStr}`;
};

export default function EmployeeStationaryScreen() {
  const { isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState<'inventory' | 'my_requests' | 'my_tasks' | 'task_assigning' | 'fillups'>('inventory');
  
  const [items, setItems] = useState<StationaryItem[]>([]);
  const [requests, setRequests] = useState<RequestHistory[]>([]);
  const [refills, setRefills] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart & request states
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [notes, setNotes] = useState('');
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeUser, setEmployeeUser] = useState<any>(null);

  // Access Permission State
  const [hasRefillAccess, setHasRefillAccess] = useState(false);

  // Task Assigning States
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedRefill, setSelectedRefill] = useState<any>(null);
  const [employeesAndSubAdmins, setEmployeesAndSubAdmins] = useState<any[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [qtyToBuy, setQtyToBuy] = useState('');
  const [assigningTask, setAssigningTask] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);

  // Task Completion Modal States
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completingRefillId, setCompletingRefillId] = useState<string | null>(null);
  const [billAmount, setBillAmount] = useState('');
  const [billImage, setBillImage] = useState('');
  const [completingTask, setCompletingTask] = useState(false);

  const [isNewVendor, setIsNewVendor] = useState(false);
  const [completeNewVendorName, setCompleteNewVendorName] = useState('');
  const [completeNewVendorAddress, setCompleteNewVendorAddress] = useState('');
  const [qtyPurchased, setQtyPurchased] = useState('');
  const [pricePerPiece, setPricePerPiece] = useState('');

  // Preview Bill Image
  const [previewBillImage, setPreviewBillImage] = useState<string | null>(null);

  // Vendor Management States
  const [vendors, setVendors] = useState<any[]>([]);
  const [manageVendorsModalOpen, setManageVendorsModalOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorAddress, setNewVendorAddress] = useState('');
  const [selectedPredefinedVendor, setSelectedPredefinedVendor] = useState('');
  const [taskPriority, setTaskPriority] = useState('Moderate');
  const [taskDueDate, setTaskDueDate] = useState('');

  useEffect(() => {
    fetchData();
    fetchVendors();
  }, [activeTab]);

  const getCurrentUser = () => {
    return employeeUser ? { ...employeeUser, type: 'employee', label: 'Employee' } : null;
  };

  const checkRefillAccess = async (user: any) => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/settings');
      if (res.data && res.data.success && res.data.settings) {
        let access = res.data.settings.stationary_refill_access || {};
        if (typeof access === 'string') {
          try { access = JSON.parse(access); } catch (e){}
        }
        const stringId = user.id.toString();
        setHasRefillAccess(!!access[stringId]);
      }
    } catch (e) {
      console.log('Error checking access:', e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let empId = null;
      let userStr = null;
      if (Platform.OS === 'web') {
        userStr = localStorage.getItem('employeeUser');
      } else {
        userStr = await AsyncStorage.getItem('employeeUser');
      }
      if (userStr) {
        const user = JSON.parse(userStr);
        empId = user.id;
        setEmployeeId(empId);
        setEmployeeUser(user);
        await checkRefillAccess(user);
      }

      if (activeTab === 'inventory') {
        const itemsRes = await axios.get('https://napi.bharatmedicalhallplus.com/stationary/items');
        if (itemsRes.data.success) {
          const activeItems = itemsRes.data.data.filter((i: StationaryItem) => i.status !== 'hold');
          setItems(activeItems);
        }
      } else if (activeTab === 'my_requests') {
        if (empId) {
          const reqRes = await axios.get(`https://napi.bharatmedicalhallplus.com/stationary/requests?employee_id=${empId}`);
          if (reqRes.data.success) {
            setRequests(reqRes.data.data);
          }
        }
      } else if (activeTab === 'task_assigning' || activeTab === 'fillups') {
        const res = await axios.get('https://napi.bharatmedicalhallplus.com/stationary/refills');
        if (res.data.success) setRefills(res.data.data);
      } else if (activeTab === 'my_tasks') {
        if (empId) {
          const res = await axios.get(`https://napi.bharatmedicalhallplus.com/stationary/refills?assigned_to_id=${empId}&assigned_to_type=employee`);
          if (res.data.success) setMyTasks(res.data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching stationary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/stationary/vendors');
      if (res.data.success) {
        setVendors(res.data.data);
      }
    } catch (e) {
      console.log('Error fetching vendors:', e);
    }
  };

  const handleAddVendor = async () => {
    if (!newVendorName) return Alert.alert('Error', 'Vendor name is required');
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/stationary/vendors', {
        name: newVendorName,
        address: newVendorAddress
      });
      if (res.data.success) {
        setNewVendorName('');
        setNewVendorAddress('');
        fetchVendors();
        Alert.alert('Success', 'Vendor added successfully!');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to add vendor');
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    try {
      const res = await axios.delete(`https://napi.bharatmedicalhallplus.com/stationary/vendors/${vendorId}`);
      if (res.data.success) {
        fetchVendors();
        Alert.alert('Success', 'Vendor deleted successfully!');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to delete vendor');
    }
  };

  const handleUpdateVendor = async (vendorId: string, updatedData: any) => {
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/stationary/vendors/${vendorId}`, updatedData);
      if (res.data.success) {
        fetchVendors();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update vendor');
    }
  };

  const handleRejectRefill = async (refillId: string) => {
    const executeReject = async () => {
      try {
        const u = getCurrentUser();
        const res = await axios.put(`https://napi.bharatmedicalhallplus.com/stationary/refills/${refillId}/reject`, {
          rejected_by_name: u ? u.full_name : 'Employee',
          rejected_by_role: u ? u.role || u.label : 'Employee',
          rejected_by_dept: u ? u.department || 'N/A' : 'N/A'
        });
        if (res.data.success) {
          Alert.alert('Success', 'Refill request rejected successfully.');
          fetchData();
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to reject refill request.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to reject this refill request?")) {
        executeReject();
      }
    } else {
      Alert.alert(
        "Reject Request",
        "Are you sure you want to reject this refill request?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Reject", style: "destructive", onPress: executeReject }
        ]
      );
    }
  };

  const handleSelectPredefinedVendor = (vendorId: string) => {
    setSelectedPredefinedVendor(vendorId);
    if (vendorId === '') {
      setShopName('');
      setShopAddress('');
    } else {
      const selected = vendors.find(v => String(v.id) === String(vendorId));
      if (selected) {
        setShopName(selected.name);
        setShopAddress(selected.address || '');
      }
    }
  };

  const fetchUsersForAssignment = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/employees/all-users');
      if (res.data.success) {
        const nonDoctors = (res.data.data || []).filter((u: any) => u.type !== 'doctor' && u.role !== 'doctor');
        const formatted = nonDoctors.map((u: any) => ({
          id: u.id.toString(),
          name: u.full_name,
          type: u.type === 'department_admin' ? 'sub_admin' : 'employee',
          department: u.department || 'N/A',
          role: u.type === 'department_admin' ? 'Sub Admin' : (u.role || 'Employee')
        }));
        setEmployeesAndSubAdmins(formatted);
      }
    } catch (err) {
      console.log('Error fetching users:', err);
    }
  };

  const updateCart = (itemId: string, qtyDelta: number) => {
    setCart(prev => {
      const newQty = (prev[itemId] || 0) + qtyDelta;
      if (newQty <= 0) {
        const newCart = { ...prev };
        delete newCart[itemId];
        return newCart;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  const submitRequest = async () => {
    if (Object.keys(cart).length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }
    if (!employeeId) return;

    setSubmitting(true);
    try {
      const payloadItems = Object.keys(cart).map(itemId => ({
        item_id: itemId,
        requested_qty: cart[itemId]
      }));

      const res = await axios.post('https://napi.bharatmedicalhallplus.com/stationary/requests', {
        employee_id: employeeId,
        notes,
        items: payloadItems,
        requester_type: 'employee',
        requester_id: employeeId
      });

      if (res.data.success) {
        Alert.alert('Success', 'Stationary request submitted successfully!');
        setCart({});
        setNotes('');
        setCartModalVisible(false);
        fetchData();
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignModal = (refill: any) => {
    setSelectedRefill(refill);
    setSelectedAssignee('');
    setTaskNotes('');
    setShopName('');
    setShopAddress('');
    setQtyToBuy(refill.qty_to_buy ? refill.qty_to_buy.toString() : '');
    setTaskPriority('Moderate');
    setTaskDueDate('');
    setSelectedPredefinedVendor('');
    setAssignModalVisible(true);
    fetchUsersForAssignment();
  };

  const handleAssignTask = async () => {
    if (!selectedRefill || !selectedAssignee || !shopName || !qtyToBuy) {
      Alert.alert('Error', 'Please fill in assignee, shop name, and quantity to buy.');
      return;
    }
    const assigneeObj = employeesAndSubAdmins.find(e => e.id === selectedAssignee);
    if (!assigneeObj) return;

    const u = getCurrentUser();
    let assignerId = u ? u.id : 1;
    let assignerType = u ? u.type : 'employee';

    setAssigningTask(true);
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/stationary/refills/${selectedRefill.id}/assign`, {
        assigned_to_id: parseInt(assigneeObj.id),
        assigned_to_type: assigneeObj.type,
        task_notes: taskNotes,
        shop_name: shopName,
        shop_address: shopAddress,
        qty_to_buy: parseInt(qtyToBuy) || 0,
        due_date: taskDueDate || null,
        priority: taskPriority || 'Moderate',
        assigner_type: assignerType,
        assigner_id: assignerId
      });
      if (res.data.success) {
        Alert.alert('Success', 'Refill task assigned successfully!');
        setAssignModalVisible(false);
        setTaskPriority('Moderate');
        setTaskDueDate('');
        fetchData();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to assign refill task.');
    } finally {
      setAssigningTask(false);
    }
  };

  const handleFillupSubmit = async (refillId: string, initialQty: number) => {
    const executeFillup = async (qty: string) => {
      const parsedQty = parseInt(qty, 10);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        Alert.alert('Error', 'Please enter a valid stock count.');
        return;
      }
      try {
        const u = getCurrentUser();
        const res = await axios.put(`https://napi.bharatmedicalhallplus.com/stationary/refills/${refillId}/fillup`, {
          quantity: parsedQty,
          approved_by_name: u ? u.full_name : 'Employee (Authorized)',
          approved_by_role: u ? u.role || u.label : 'Employee',
          approved_by_dept: u ? u.department || 'N/A' : 'N/A'
        });
        if (res.data.success) {
          Alert.alert('Success', 'Stock filled up successfully!');
          fetchData();
        }
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to fill up stock.');
      }
    };

    if (Platform.OS === 'web') {
      const qty = window.prompt("Enter the number of stock to fill up:", initialQty.toString());
      if (qty !== null) {
        executeFillup(qty);
      }
    } else {
      Alert.prompt(
        "Fillup Stock",
        "Enter the number of stock to fill up:",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Fillup", onPress: (text?: string) => executeFillup(text || "") }
        ],
        "plain-text",
        initialQty.toString()
      );
    }
  };
  const openCompleteTaskModal = (refillId: string) => {
    setCompletingRefillId(refillId);
    setBillAmount('');
    setBillImage('');
    
    // Find matching refill task to get the target qty_to_buy
    const matched = myTasks.find(t => String(t.id) === String(refillId));
    if (matched) {
      setQtyPurchased(matched.qty_to_buy ? matched.qty_to_buy.toString() : '');
    } else {
      setQtyPurchased('');
    }
    
    setIsNewVendor(false);
    setCompleteNewVendorName('');
    setCompleteNewVendorAddress('');
    setPricePerPiece('');
    setCompleteModalVisible(true);
  };

  const handlePickBillImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.2,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        setBillImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCompleteTaskSubmit = async () => {
    if (!completingRefillId || !billAmount) {
      Alert.alert('Error', 'Please enter the bill amount.');
      return;
    }
    const amt = parseFloat(billAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Please enter a valid bill amount.');
      return;
    }

    const qtyP = parseInt(qtyPurchased);
    if (isNaN(qtyP) || qtyP <= 0) {
      Alert.alert('Error', 'Please enter a valid purchased quantity.');
      return;
    }

    if (isNewVendor && !completeNewVendorName) {
      Alert.alert('Error', 'Please enter the new vendor name.');
      return;
    }

    setCompletingTask(true);
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/stationary/refills/${completingRefillId}/complete`, {
        bill_amount: amt,
        bill_image: billImage || null,
        is_new_vendor: isNewVendor,
        new_vendor_name: isNewVendor ? completeNewVendorName : null,
        new_vendor_address: isNewVendor ? completeNewVendorAddress : null,
        qty_purchased: qtyP,
        price_per_piece: pricePerPiece ? parseFloat(pricePerPiece) : (amt / qtyP)
      });
      if (res.data.success) {
        Alert.alert('Success', 'Refill task completed and submitted for review!');
        setCompleteModalVisible(false);
        setCompletingRefillId(null);
        setBillAmount('');
        setBillImage('');
        fetchData();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to complete refill task.');
    } finally {
      setCompletingTask(false);
    }
  };
  const cartItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const renderItemCard = ({ item }: { item: StationaryItem }) => {
    const qtyInCart = cart[item.id] || 0;
    const parts = item.name.split(' | ');
    const baseName = parts[0];
    const details = parts.slice(1);

    return (
      <View style={[styles.itemCard, !isDesktop && styles.itemCardMobile]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <View style={[styles.itemImage, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
            <Package size={32} color={Colors.light.icon} />
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{baseName}</Text>
          {details.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, marginBottom: 4 }}>
              {details.map((d, i) => (
                <View key={i} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, color: Colors.light.icon, fontWeight: '600' }}>{d}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.itemStock}>Available: {item.stock}</Text>
          
          <View style={styles.qtyContainer}>
            <Pressable 
              style={[styles.qtyBtn, qtyInCart === 0 && { opacity: 0.5 }]} 
              onPress={() => updateCart(item.id, -1)}
              disabled={qtyInCart === 0}
            >
              <Minus size={16} color={Colors.light.primary} />
            </Pressable>
            <Text style={styles.qtyText}>{qtyInCart}</Text>
            <Pressable 
              style={[styles.qtyBtn, (qtyInCart >= item.stock) && { opacity: 0.5 }]} 
              onPress={() => updateCart(item.id, 1)}
              disabled={qtyInCart >= item.stock}
            >
              <Plus size={16} color={Colors.light.primary} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderRequestItem = ({ item }: { item: RequestHistory }) => (
    <View style={styles.requestRow}>
      <View style={{ flex: 1.5 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.light.text }}>Request ID: #{item.id}</Text>
        <Text style={{ fontSize: 13, color: Colors.light.icon, marginTop: 4 }}>Date: {formatDate(item.created_at)}</Text>
        {item.notes ? <Text style={{ fontSize: 13, color: Colors.light.icon, fontStyle: 'italic', marginTop: 4 }}>"{item.notes}"</Text> : null}
      </View>
      <View style={{ flex: 1.5 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.light.text }}>Items Requested:</Text>
        {item.items?.map((t, idx) => (
          <Text key={idx} style={{ fontSize: 13, color: '#475569' }}>- {t.name} (Qty: {t.requested_qty})</Text>
        ))}
      </View>
      <View style={{ width: 120, alignItems: 'center' }}>
        <View style={[styles.statusBadge, (styles as any)[`status_${item.status}`] || styles.status_pending]}>
          <Text style={[styles.statusText, (styles as any)[`text_${item.status}`] || styles.text_pending]}>{item.status.replace('_', ' ')}</Text>
        </View>
        {item.approved_by_name && (
          <Text style={{ fontSize: 10, color: Colors.light.icon, marginTop: 4, textAlign: 'center' }}>By: {item.approved_by_name}</Text>
        )}
      </View>
    </View>
  );

  const renderRefillItem = ({ item }: { item: any }) => {
    const statusColor = item.status === 'Filled' ? '#10b981' : item.status === 'Completed' ? '#3b82f6' : item.status === 'Assigned' ? '#f59e0b' : item.status === 'Rejected' ? '#ef4444' : '#64748b';
    return (
      <View style={[styles.requestRow, { flexDirection: 'column', alignItems: 'stretch', gap: 12, marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {item.item_image ? (
              <Image source={{ uri: item.item_image }} style={{ width: 44, height: 44, borderRadius: 8 }} />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }}>
                <Package size={20} color="#94a3b8" />
              </View>
            )}
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>{item.item_name?.split(' | ')[0]}</Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>Current Stock: {item.current_stock}</Text>
            </View>
          </View>
          <View style={{ backgroundColor: statusColor + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: 'bold' }}>{item.status}</Text>
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: 'bold' }}>REQUEST DETAILS</Text>
            <Text style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>By: {item.requester_name || 'Sub Admin'}</Text>
            <Text style={{ fontSize: 12, color: '#64748b' }}>Dept: {item.requested_by_dept || 'N/A'} • Role: {item.requested_by_role || 'N/A'}</Text>
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>On: {formatDate(item.created_at)}</Text>
            {item.notes ? <Text style={{ fontSize: 13, color: '#475569', fontStyle: 'italic', marginTop: 4 }}>Notes: "{item.notes}"</Text> : null}
          </View>

          {item.status !== 'Requested' && (
            <View style={{ flex: 1, minWidth: 180 }}>
              <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: 'bold' }}>ASSIGNED TASK DETAILS</Text>
              <Text style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>To: {item.assignee_name || 'N/A'}</Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>Role: {item.assigned_to_role || 'N/A'}</Text>
              <Text style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>🏪 Shop: {item.shop_name || 'N/A'}</Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>📍 Address: {item.shop_address || 'N/A'}</Text>
              <Text style={{ fontSize: 13, color: '#1e293b', fontWeight: '600', marginTop: 4 }}>🛒 Buy Target: {item.qty_to_buy} items</Text>
            </View>
          )}

          {(item.status === 'Completed' || item.status === 'Filled') && (
            <View style={{ flex: 1, minWidth: 150 }}>
              <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: 'bold' }}>RECEIPT & BILL SPENT</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#10b981', marginTop: 2 }}>Amount: ₹{item.bill_amount || '0.00'}</Text>
              
              {item.qty_purchased !== undefined && item.qty_purchased !== null ? (
                <Text style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Bought Qty: <Text style={{ fontWeight: '700' }}>{item.qty_purchased} items</Text></Text>
              ) : null}
              {item.price_per_piece ? (
                <Text style={{ fontSize: 12, color: '#64748b' }}>Price/pc: ₹{parseFloat(item.price_per_piece).toFixed(2)}</Text>
              ) : null}

              {item.is_new_vendor && (
                <View style={{ marginTop: 6, padding: 6, backgroundColor: '#EFF6FF', borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, color: '#1e3a8a', fontWeight: 'bold' }}>NEW VENDOR INFO</Text>
                  <Text style={{ fontSize: 11, color: '#1e40af' }}>Name: {item.new_vendor_name}</Text>
                  {item.new_vendor_address ? <Text style={{ fontSize: 10, color: '#3b82f6' }}>Addr: {item.new_vendor_address}</Text> : null}
                </View>
              )}

              {item.bill_image ? (
                <Pressable 
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start' }}
                  onPress={() => setPreviewBillImage(item.bill_image)}
                >
                  <Eye size={14} color="#475569" />
                  <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>View Receipt</Text>
                </Pressable>
              ) : (
                <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 }}>No receipt uploaded</Text>
              )}
            </View>
          )}
        {item.status === 'Rejected' && (
          <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, backgroundColor: '#fef2f2', padding: 10, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: 'bold' }}>REJECTED AUDIT TRAIL</Text>
            <Text style={{ fontSize: 13, color: '#991b1b', marginTop: 2 }}>Rejected By: {item.rejected_by_name} ({item.rejected_by_role})</Text>
            {item.rejected_at && <Text style={{ fontSize: 12, color: '#b91c1c' }}>Rejected On: {formatDate(item.rejected_at)}</Text>}
          </View>
        )}
        </View>

        {item.status === 'Filled' && (
          <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, color: '#64748b', fontWeight: 'bold' }}>APPROVAL & AUDIT TRAIL</Text>
            <Text style={{ fontSize: 13, color: '#1e293b', marginTop: 2 }}>Filled Qty: +{item.fillup_qty} items added to stock</Text>
            <Text style={{ fontSize: 12, color: '#475569' }}>Approved By: {item.approved_by_name} ({item.approved_by_role})</Text>
            {item.approved_at && <Text style={{ fontSize: 12, color: '#94a3b8' }}>Approved On: {formatDate(item.approved_at)}</Text>}
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 }}>
          {hasRefillAccess && item.status === 'Requested' && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleRejectRefill(item.id)}>
                <Text style={{ color: '#DC2626', fontWeight: '700' }}>Reject Request</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => openAssignModal(item)}>
                <Text style={{ color: Colors.light.primary, fontWeight: '700' }}>Approve & Assign Task</Text>
              </Pressable>
            </View>
          )}
          {hasRefillAccess && item.status === 'Completed' && (
            <Pressable style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => handleFillupSubmit(item.id, item.qty_purchased || item.qty_to_buy || 0)}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Approve & Fillup Stock</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderMyTasksItem = ({ item }: { item: any }) => (
    <View style={[styles.requestRow, { flexDirection: 'column', alignItems: 'stretch', gap: 12, marginBottom: 16 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: Colors.light.text }}>{item.item_name?.split(' | ')[0]}</Text>
        <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ color: '#D97706', fontSize: 12, fontWeight: 'bold' }}>{item.status}</Text>
        </View>
      </View>

      <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, gap: 6 }}>
        <Text style={{ fontSize: 13, color: '#475569' }}>🏪 <Text style={{ fontWeight: '700' }}>Shop Name:</Text> {item.shop_name}</Text>
        <Text style={{ fontSize: 13, color: '#475569' }}>📍 <Text style={{ fontWeight: '700' }}>Address:</Text> {item.shop_address}</Text>
        <Text style={{ fontSize: 13, color: '#1e293b' }}>🛒 <Text style={{ fontWeight: '700' }}>Target Quantity to Buy:</Text> {item.qty_to_buy} items</Text>
        {item.task_notes ? <Text style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>Instructions: "{item.task_notes}"</Text> : null}
      </View>

      {item.status === 'Assigned' && (
        <View style={{ alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 }}>
          <Pressable style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]} onPress={() => openCompleteTaskModal(item.id)}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Complete & Submit Bill</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
        <View>
          <Text style={styles.title}>Stationary Center</Text>
          <Text style={styles.subtitle}>Order stationary items and track refill tasks.</Text>
        </View>

        {activeTab === 'inventory' && (
          <Pressable style={styles.cartBtn} onPress={() => setCartModalVisible(true)}>
            <View style={styles.cartIconWrapper}>
              <ShoppingCart size={20} color="#FFF" />
              {cartItemsCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartItemsCount}</Text>
                </View>
              )}
            </View>
            {isDesktop && <Text style={styles.cartBtnText}>View Cart</Text>}
          </Pressable>
        )}

        {hasRefillAccess && activeTab === 'task_assigning' && (
          <View style={styles.headerButtons}>
            <Pressable style={styles.secondaryBtn} onPress={() => setManageVendorsModalOpen(true)}>
              <Plus size={18} color={Colors.light.primary} />
              <Text style={styles.secondaryBtnText}>Manage Vendors</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={{ borderBottomWidth: 1, borderBottomColor: Colors.light.border, marginBottom: 24 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer} style={{ width: '100%' }}>
          <Pressable style={[styles.tab, activeTab === 'inventory' && styles.activeTab]} onPress={() => setActiveTab('inventory')}>
            <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>Browse Catalog</Text>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === 'my_requests' && styles.activeTab]} onPress={() => setActiveTab('my_requests')}>
            <Text style={[styles.tabText, activeTab === 'my_requests' && styles.activeTabText]}>My Requests</Text>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === 'my_tasks' && styles.activeTab]} onPress={() => setActiveTab('my_tasks')}>
            <Text style={[styles.tabText, activeTab === 'my_tasks' && styles.activeTabText]}>My Assigned Tasks</Text>
          </Pressable>
          {hasRefillAccess && (
            <>
              <Pressable style={[styles.tab, activeTab === 'task_assigning' && styles.activeTab]} onPress={() => setActiveTab('task_assigning')}>
                <Text style={[styles.tabText, activeTab === 'task_assigning' && styles.activeTabText]}>Task Assigning</Text>
              </Pressable>
              <Pressable style={[styles.tab, activeTab === 'fillups' && styles.activeTab]} onPress={() => setActiveTab('fillups')}>
                <Text style={[styles.tabText, activeTab === 'fillups' && styles.activeTabText]}>Fillups & History</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>

      <View style={styles.contentArea}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
        ) : activeTab === 'inventory' ? (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            numColumns={isDesktop ? 5 : 2}
            key={isDesktop ? 'desktop' : 'mobile'}
            columnWrapperStyle={styles.gridRow}
            renderItem={renderItemCard}
            ListEmptyComponent={<Text style={styles.emptyText}>No stationary items available right now.</Text>}
          />
        ) : activeTab === 'my_requests' ? (
          <FlatList
            data={requests}
            keyExtractor={item => item.id}
            renderItem={renderRequestItem}
            ListEmptyComponent={<Text style={styles.emptyText}>You haven't requested any stationary yet.</Text>}
          />
        ) : activeTab === 'task_assigning' ? (
          <FlatList
            data={refills.filter(r => r.status === 'Requested' || r.status === 'Assigned')}
            keyExtractor={item => item.id.toString()}
            renderItem={renderRefillItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No active refill tasks to assign.</Text>}
          />
        ) : activeTab === 'fillups' ? (
          <FlatList
            data={refills.filter(r => r.status === 'Completed' || r.status === 'Filled')}
            keyExtractor={item => item.id.toString()}
            renderItem={renderRefillItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No filled or completed refills.</Text>}
          />
        ) : (
          <FlatList
            data={myTasks}
            keyExtractor={item => item.id.toString()}
            renderItem={renderMyTasksItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No refill tasks assigned to you right now.</Text>}
          />
        )}
      </View>

      {/* Cart Modal */}
      <Modal visible={cartModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 500 }]}>
            <Text style={styles.modalTitle}>Your Cart</Text>
            
            <ScrollView style={{ maxHeight: 300, marginBottom: 20 }} showsVerticalScrollIndicator={true}>
              {Object.keys(cart).length === 0 ? (
                <Text style={{ textAlign: 'center', color: Colors.light.icon, marginVertical: 20 }}>Your cart is empty.</Text>
              ) : (
                Object.keys(cart).map(itemId => {
                  const item = items.find(i => String(i.id) === String(itemId));
                  if (!item) return null;
                  return (
                    <View key={itemId} style={styles.cartItemRow}>
                      <Text style={styles.cartItemName}>{item.name.split(' | ')[0]}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Pressable style={{ padding: 6, backgroundColor: '#EFF6FF', borderRadius: 4 }} onPress={() => updateCart(item.id, -1)}>
                          <Minus size={14} color={Colors.light.primary} />
                        </Pressable>
                        <Text style={styles.cartItemQty}>{cart[itemId]}</Text>
                        <Pressable 
                          style={[{ padding: 6, backgroundColor: '#EFF6FF', borderRadius: 4 }, cart[itemId] >= item.stock && { opacity: 0.5 }]} 
                          onPress={() => updateCart(item.id, 1)}
                          disabled={cart[itemId] >= item.stock}
                        >
                          <Plus size={14} color={Colors.light.primary} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput style={[styles.input, { height: 80 }]} placeholder="Why do you need these items?" multiline value={notes} onChangeText={setNotes} />

            <View style={styles.modalActions}>
              <Pressable style={[styles.cancelBtn, { backgroundColor: '#F1F5F9' }]} onPress={() => setCartModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              {Object.keys(cart).length > 0 && (
                <Pressable style={styles.submitBtn} onPress={submitRequest} disabled={submitting}>
                  <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit Request'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Refill Task Assign Modal */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 450 }, { maxHeight: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>Assign Refill Task</Text>
              <Pressable onPress={() => setAssignModalVisible(false)}><X size={24} color={Colors.light.icon}/></Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <Text style={styles.label}>Select Assignee (Employee / Sub Admin)</Text>
              <View style={{ position: 'relative', zIndex: 9999, marginBottom: 16 }}>
                <Pressable 
                  style={{ 
                    borderWidth: 1, 
                    borderColor: Colors.light.border, 
                    borderRadius: 8, 
                    backgroundColor: '#FFF',
                    padding: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onPress={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                >
                  <Text style={{ fontSize: 15, color: selectedAssignee ? Colors.light.text : Colors.light.icon }}>
                    {selectedAssignee 
                      ? (() => {
                          const found = employeesAndSubAdmins.find(u => String(u.id) === String(selectedAssignee));
                          return found ? `${found.name} (${found.role} | Dept: ${found.department})` : '-- Choose User --';
                        })()
                      : '-- Choose User --'}
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.light.icon }}>▼</Text>
                </Pressable>

                {assigneeDropdownOpen && (
                  <View style={{
                    position: 'absolute',
                    top: 50,
                    left: 0,
                    right: 0,
                    backgroundColor: '#FFF',
                    borderWidth: 1,
                    borderColor: Colors.light.border,
                    borderRadius: 8,
                    maxHeight: 250,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 4,
                    padding: 8,
                    zIndex: 10000
                  }}>
                    <TextInput
                      style={{ 
                        borderWidth: 1, 
                        borderColor: Colors.light.border, 
                        borderRadius: 6, 
                        padding: 8, 
                        fontSize: 14,
                        marginBottom: 8,
                        backgroundColor: '#f8fafc'
                      }}
                      placeholder="Search assignee..."
                      value={assigneeSearchQuery}
                      onChangeText={setAssigneeSearchQuery}
                      autoFocus
                    />
                    <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true}>
                      <Pressable 
                        style={{ padding: 10, borderRadius: 6 }}
                        onPress={() => {
                          setSelectedAssignee('');
                          setAssigneeDropdownOpen(false);
                          setAssigneeSearchQuery('');
                        }}
                      >
                        <Text style={{ color: Colors.light.icon }}>-- Choose User --</Text>
                      </Pressable>
                      {employeesAndSubAdmins
                        .filter(u => {
                          const q = assigneeSearchQuery.toLowerCase();
                          return !assigneeSearchQuery || 
                                 u.name?.toLowerCase().includes(q) || 
                                 u.department?.toLowerCase().includes(q) ||
                                 u.role?.toLowerCase().includes(q);
                        })
                        .map(u => (
                          <Pressable 
                            key={`${u.type}-${u.id}`}
                            style={{ padding: 10, borderRadius: 6, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' }}
                            onPress={() => {
                              setSelectedAssignee(u.id);
                              setAssigneeDropdownOpen(false);
                              setAssigneeSearchQuery('');
                            }}
                          >
                            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.text }}>{u.name}</Text>
                            <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{u.role} | Dept: {u.department}</Text>
                          </Pressable>
                        ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <Text style={styles.label}>Predefined Vendor (Optional)</Text>
              <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, marginBottom: 16 }}>
                {Platform.OS === 'web' ? (
                  <select 
                    style={{ width: '100%', height: 40, border: 'none', backgroundColor: 'transparent', paddingLeft: 8, paddingRight: 8 }}
                    value={selectedPredefinedVendor} onChange={(e) => handleSelectPredefinedVendor(e.target.value)}
                  >
                    <option value="">-- Choose Predefined Vendor / Custom --</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                ) : (
                  <Picker selectedValue={selectedPredefinedVendor} onValueChange={(v) => handleSelectPredefinedVendor(v)}>
                    <Picker.Item label="-- Choose Predefined Vendor / Custom --" value="" />
                    {vendors.map(v => <Picker.Item key={v.id} label={v.name} value={v.id} />)}
                  </Picker>
                )}
              </View>

              <Text style={styles.label}>Vendor Shop Name</Text>
              <TextInput style={styles.input} placeholder="e.g. Starlight Stationeries" value={shopName} onChangeText={setShopName} />

              <Text style={styles.label}>Vendor Shop Address</Text>
              <TextInput style={styles.input} placeholder="e.g. 5th Cross, Gandhi Bazar" value={shopAddress} onChangeText={setShopAddress} />

              <Text style={styles.label}>Number of Items to Buy</Text>
              <TextInput style={styles.input} placeholder="e.g. 50" value={qtyToBuy} onChangeText={setQtyToBuy} keyboardType="numeric" />

              <Text style={styles.label}>Task Instructions / Notes</Text>
              <TextInput style={styles.input} placeholder="e.g. Buy high quality A4 papers" value={taskNotes} onChangeText={setTaskNotes} />

              <Text style={styles.label}>Task Priority</Text>
              <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, marginBottom: 16 }}>
                {Platform.OS === 'web' ? (
                  <select 
                    style={{ width: '100%', height: 40, border: 'none', backgroundColor: 'transparent', paddingLeft: 8, paddingRight: 8 }}
                    value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}
                  >
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </select>
                ) : (
                  <Picker selectedValue={taskPriority} onValueChange={(v) => setTaskPriority(v)}>
                    <Picker.Item label="Low" value="Low" />
                    <Picker.Item label="Moderate" value="Moderate" />
                    <Picker.Item label="High" value="High" />
                  </Picker>
                )}
              </View>

              <Text style={styles.label}>Due Date</Text>
              {Platform.OS === 'web' ? (
                <input 
                  type="date"
                  style={{ 
                    width: '100%', 
                    height: 40, 
                    border: '1px solid #cbd5e1', 
                    borderRadius: 8, 
                    paddingLeft: 8, 
                    paddingRight: 8, 
                    fontSize: 14, 
                    color: Colors.light.text,
                    backgroundColor: '#FFF',
                    marginBottom: 20
                  }}
                  value={taskDueDate} 
                  onChange={(e) => setTaskDueDate(e.target.value)} 
                />
              ) : (
                <TextInput 
                  style={styles.input} 
                  placeholder="YYYY-MM-DD" 
                  value={taskDueDate} 
                  onChangeText={setTaskDueDate} 
                />
              )}

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setAssignModalVisible(false)}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
                <Pressable style={styles.submitBtn} onPress={handleAssignTask} disabled={assigningTask}><Text style={styles.submitBtnText}>{assigningTask ? 'Assigning...' : 'Assign Task'}</Text></Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Complete Task Modal */}
      <Modal visible={completeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 400 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>Complete Refill Task</Text>
              <Pressable onPress={() => setCompleteModalVisible(false)}><X size={24} color={Colors.light.icon}/></Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400, marginBottom: 15 }}>
              <Pressable 
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 }} 
                onPress={() => setIsNewVendor(!isNewVendor)}
              >
                <View style={{ width: 20, height: 20, borderWidth: 2, borderColor: Colors.light.primary, borderRadius: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: isNewVendor ? Colors.light.primary : 'transparent' }}>
                  {isNewVendor && <Check size={14} color="#FFF" />}
                </View>
                <Text style={{ fontSize: 14, color: Colors.light.text }}>Bought from a new vendor</Text>
              </Pressable>

              {isNewVendor && (
                <View style={{ gap: 4 }}>
                  <Text style={styles.label}>New Vendor Name</Text>
                  <TextInput style={styles.input} placeholder="Vendor Shop Name" value={completeNewVendorName} onChangeText={setCompleteNewVendorName} />
                  <Text style={styles.label}>New Vendor Address (Optional)</Text>
                  <TextInput style={styles.input} placeholder="Vendor Address" value={completeNewVendorAddress} onChangeText={setCompleteNewVendorAddress} />
                </View>
              )}

              <Text style={styles.label}>Actual Quantity Purchased</Text>
              <TextInput style={styles.input} placeholder="e.g. 10" value={qtyPurchased} onChangeText={setQtyPurchased} keyboardType="numeric" />

              <Text style={styles.label}>Price per piece (Optional)</Text>
              <TextInput style={styles.input} placeholder="e.g. 12.5" value={pricePerPiece} onChangeText={setPricePerPiece} keyboardType="numeric" />

              <Text style={styles.label}>Enter Bill Amount Spent (₹)</Text>
              <TextInput style={styles.input} placeholder="e.g. 1250" value={billAmount} onChangeText={setBillAmount} keyboardType="numeric" />

              <Text style={styles.label}>Upload Bill Image (Optional)</Text>
              <Pressable style={[styles.imagePicker, { width: '100%', height: 150, borderRadius: 8, marginBottom: 10 }]} onPress={handlePickBillImage}>
                {billImage ? (
                  <Image source={{ uri: billImage }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="contain" />
                ) : (
                  <>
                    <Upload size={24} color={Colors.light.icon} />
                    <Text style={{ marginTop: 8, color: Colors.light.icon, fontSize: 13 }}>Choose Photo</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setCompleteModalVisible(false)}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
              <Pressable style={styles.submitBtn} onPress={handleCompleteTaskSubmit} disabled={completingTask}><Text style={styles.submitBtnText}>{completingTask ? 'Submitting...' : 'Complete Task'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bill Image Preview Modal */}
      {previewBillImage && (
        <Modal visible={!!previewBillImage} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
            <View style={{ width: '90%', height: '80%', justifyContent: 'center', alignItems: 'center' }}>
              <Image source={{ uri: previewBillImage }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              <Pressable style={{ position: 'absolute', top: -40, right: 10, padding: 10 }} onPress={() => setPreviewBillImage(null)}>
                <X size={32} color="#FFF" />
              </Pressable>
            </View>
          </View>
        </Modal>
      )}



      <PredefinedVendorsModal
        vendors={vendors}
        open={manageVendorsModalOpen}
        onClose={() => setManageVendorsModalOpen(false)}
        name={newVendorName}
        setName={setNewVendorName}
        addr={newVendorAddress}
        setAddr={setNewVendorAddress}
        onAdd={handleAddVendor}
        onDel={handleDeleteVendor}
        isDesktop={isDesktop}
        allItems={items}
        onUpdateVendor={handleUpdateVendor}
      />
    </View>
  );
}

const PredefinedVendorsModal = ({
  vendors,
  open,
  onClose,
  name,
  setName,
  addr,
  setAddr,
  onAdd,
  onDel,
  isDesktop,
  allItems,
  onUpdateVendor
}: {
  vendors: any[],
  open: boolean,
  onClose: () => void,
  name: string,
  setName: (v: string) => void,
  addr: string,
  setAddr: (v: string) => void,
  onAdd: () => void,
  onDel: (id: string) => void,
  isDesktop: boolean,
  allItems: any[],
  onUpdateVendor: (id: string, data: any) => Promise<void>
}) => {
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [productPrice, setProductPrice] = useState<string>('');
  const [packageQty, setPackageQty] = useState<string>('1');

  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddr, setEditAddr] = useState('');

  return (
    <Modal visible={open} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isDesktop && { width: 500 }, { maxHeight: '90%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={styles.modalTitle}>Manage Predefined Vendors</Text>
            <Pressable onPress={onClose}><X size={24} color={Colors.light.icon}/></Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <Text style={[styles.label, { fontSize: 15, marginBottom: 12 }]}>Add New Vendor</Text>
            <TextInput style={styles.input} placeholder="Vendor Shop Name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Vendor Shop Address" value={addr} onChangeText={setAddr} />
            <Pressable style={[styles.submitBtn, { marginBottom: 24, alignSelf: 'flex-start' }]} onPress={onAdd}>
              <Text style={styles.submitBtnText}>Add Vendor</Text>
            </Pressable>

            <Text style={[styles.label, { fontSize: 15, marginBottom: 12 }]}>Predefined Vendors List</Text>
            {vendors.length === 0 ? (
              <Text style={styles.emptyText}>No predefined vendors added yet.</Text>
            ) : (
              vendors.map(v => (
                <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  {editingVendorId === v.id ? (
                    <View style={{ flex: 1, marginRight: 12, gap: 8 }}>
                      <TextInput value={editName} onChangeText={setEditName} style={[styles.input, { marginBottom: 8 }]} placeholder="Edit Vendor Name" />
                      <TextInput value={editAddr} onChangeText={setEditAddr} style={[styles.input, { marginBottom: 8 }]} placeholder="Edit Vendor Address" />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable style={styles.actionBtn} onPress={async () => {
                          await onUpdateVendor(v.id, { name: editName, address: editAddr, products: v.products });
                          setEditingVendorId(null);
                        }}>
                          <Text style={{ fontWeight: '700', color: Colors.light.primary }}>Save</Text>
                        </Pressable>
                        <Pressable style={styles.actionBtn} onPress={() => setEditingVendorId(null)}>
                          <Text style={{ color: Colors.light.icon }}>Cancel</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.text }}>{v.name}</Text>
                      <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>📍 {v.address || 'No Address'}</Text>
                      
                      <View style={{ marginTop: 10, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Supplied Products:</Text>
                        {(!v.products || v.products.length === 0) ? (
                          <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No products mapped yet</Text>
                        ) : (
                          v.products.map((p: any, idx: number) => (
                            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 }}>
                              <Text style={{ fontSize: 13, color: '#334155', flex: 1 }} numberOfLines={1}>
                                • {p.item_name}
                              </Text>
                              <Text style={{ fontSize: 12, color: '#475569', marginHorizontal: 8 }}>
                                ₹{p.price} / pack of {p.package_qty}
                              </Text>
                              <Pressable onPress={async () => {
                                const updated = v.products.filter((item: any) => item.item_id !== p.item_id);
                                await onUpdateVendor(v.id, { name: v.name, address: v.address, products: updated });
                              }}>
                                <X size={14} color="#ef4444" />
                              </Pressable>
                            </View>
                          ))
                        )}

                        {selectedVendorId === v.id ? (
                          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 8, gap: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Add Product Supply:</Text>
                            <View style={styles.dropdownWrapper}>
                              <Picker
                                selectedValue={selectedItemId}
                                onValueChange={setSelectedItemId}
                                style={styles.picker}
                              >
                                <Picker.Item label="Select Stationary Product" value="" />
                                {allItems.map(item => (
                                  <Picker.Item key={item.id} label={item.name.split(' | ')[0]} value={item.id} />
                                ))}
                              </Picker>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <TextInput 
                                placeholder="Price (₹)" 
                                keyboardType="numeric" 
                                value={productPrice} 
                                onChangeText={setProductPrice} 
                                style={[styles.input, { flex: 1, marginBottom: 0, paddingVertical: 8 }]} 
                              />
                              <TextInput 
                                placeholder="Pkg Qty" 
                                keyboardType="numeric" 
                                value={packageQty} 
                                onChangeText={setPackageQty} 
                                style={[styles.input, { flex: 1, marginBottom: 0, paddingVertical: 8 }]} 
                              />
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                              <Pressable style={styles.actionBtn} onPress={() => setSelectedVendorId(null)}>
                                <Text style={{ color: Colors.light.icon }}>Cancel</Text>
                              </Pressable>
                              <Pressable style={[styles.actionBtn, { backgroundColor: Colors.light.primary }]} onPress={async () => {
                                if (!selectedItemId || !productPrice) return Alert.alert('Error', 'Product and Price are required.');
                                const updated = [...(v.products || []), { 
                                  item_id: parseInt(selectedItemId), 
                                  price: parseFloat(productPrice), 
                                  package_qty: parseInt(packageQty) || 1 
                                }];
                                await onUpdateVendor(v.id, { name: v.name, address: v.address, products: updated });
                                setSelectedVendorId(null);
                                setSelectedItemId('');
                                setProductPrice('');
                                setPackageQty('1');
                              }}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <Pressable 
                            style={{ marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#EFF6FF', borderRadius: 6 }} 
                            onPress={() => {
                              setSelectedVendorId(v.id);
                              setSelectedItemId('');
                              setProductPrice('');
                              setPackageQty('1');
                            }}
                          >
                            <Text style={{ fontSize: 12, color: Colors.light.primary, fontWeight: '700' }}>+ Add Product Supply</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  )}
                  <View style={{ gap: 8, justifyContent: 'center' }}>
                    <Pressable onPress={() => {
                      setEditingVendorId(v.id);
                      setEditName(v.name);
                      setEditAddr(v.address || '');
                    }} style={{ padding: 8, backgroundColor: '#e2e8f0', borderRadius: 6 }}>
                      <Edit2 size={16} color="#475569" />
                    </Pressable>
                    <Pressable onPress={() => onDel(v.id)} style={{ padding: 8, backgroundColor: '#fee2e2', borderRadius: 6 }}>
                      <Trash2 size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, padding: 32 },
  containerMobile: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  headerButtons: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 15 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  secondaryBtnText: { color: Colors.light.primary, fontWeight: '700', marginLeft: 8, fontSize: 15 },
  
  tabsContainer: { flexDirection: 'row', gap: 8 },
  tab: { paddingVertical: 12, paddingHorizontal: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: Colors.light.primary },
  tabText: { fontSize: 16, fontWeight: '600', color: Colors.light.icon },
  activeTabText: { color: Colors.light.primary, fontWeight: '700' },

  contentArea: { flex: 1 },
  gridRow: { gap: 16, paddingHorizontal: 4, paddingBottom: 16 },
  itemCard: { flex: 1, maxWidth: 220, backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.light.border, alignItems: 'center' },
  itemCardMobile: { flexBasis: '47%' },
  itemImage: { width: 100, height: 100, borderRadius: 12, marginBottom: 12 },
  itemName: { fontSize: 15, fontWeight: '700', color: Colors.light.text, textAlign: 'center' },
  itemStock: { fontSize: 13, color: Colors.light.icon, marginTop: 4 },

  requestRow: { backgroundColor: Colors.light.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#EFF6FF', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  status_pending: { backgroundColor: '#FEF3C7' }, text_pending: { color: '#D97706' },
  status_approved: { backgroundColor: '#D1FAE5' }, text_approved: { color: '#059669' },
  status_partially_approved: { backgroundColor: '#DBEAFE' }, text_partially_approved: { color: '#2563EB' },
  status_rejected: { backgroundColor: '#FEE2E2' }, text_rejected: { color: '#DC2626' },

  emptyText: { color: Colors.light.icon, fontSize: 15, fontStyle: 'italic', textAlign: 'center', marginTop: 40 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 32, width: '100%', ...Platform.select({ web: { boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' } }) },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginBottom: 24 },
  imagePicker: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: Colors.light.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%' },
  label: { fontSize: 13, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, padding: 14, fontSize: 14, color: Colors.light.text, marginBottom: 20, ...Platform.select({ web: { outlineWidth: 0 as any } }) },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: Colors.light.icon, fontWeight: '700', fontSize: 15 },
  submitBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  tableHeader: {},
  statusToggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: '#FFF' },
  statusToggleText: { fontWeight: '700', color: Colors.light.icon },
  statusToggleActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  statusToggleActiveText: { color: Colors.light.primary },
  statusToggleActiveHold: { backgroundColor: '#FEF08A', borderColor: '#FDE047' },
  statusToggleActiveHoldText: { color: '#854D0E' },
  
  cartBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  cartIconWrapper: { position: 'relative' },
  cartBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: Colors.light.error, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  cartBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 15 },
  itemInfo: { gap: 4, width: '100%' },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 4, width: '100%' },
  qtyBtn: { padding: 8, backgroundColor: '#EFF6FF', borderRadius: 6 },
  qtyText: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  cartItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  cartItemName: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  cartItemQty: { fontSize: 16, fontWeight: '700', color: Colors.light.primary },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  dropdownWrapper: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFF', marginBottom: 20 },
  picker: { width: '100%', height: 50, color: Colors.light.text },
});
