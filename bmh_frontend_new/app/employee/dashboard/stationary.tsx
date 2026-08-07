import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, Modal, TextInput, Alert, ScrollView, Image } from 'react-native';
import { Package, Plus, Minus, ShoppingCart, Clock, Eye, Upload, X, Calendar, DollarSign } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useResponsive } from '../../../hooks/useResponsive';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';

type StationaryItem = { id: string; name: string; stock: number; image: string; status: string; created_at: string; };
type RequestHistory = { id: string; status: string; notes: string; created_at: string; approved_by?: string; approved_by_name?: string; approved_by_role?: string; approved_by_dept?: string; items: { id: string; item_id: string; name: string; requested_qty: number; approved_qty: number; }[]; };

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

  // Task Completion Modal States
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completingRefillId, setCompletingRefillId] = useState<string | null>(null);
  const [billAmount, setBillAmount] = useState('');
  const [billImage, setBillImage] = useState('');
  const [completingTask, setCompletingTask] = useState(false);

  // Preview Bill Image
  const [previewBillImage, setPreviewBillImage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
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

  const fetchUsersForAssignment = async () => {
    try {
      const [empRes, subAdminRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/employees'),
        axios.get('https://napi.bharatmedicalhallplus.com/admin/department-admins')
      ]);
      const emps = empRes.data.data || empRes.data || [];
      const subAdmins = subAdminRes.data.data || subAdminRes.data || [];
      const combined = [
        ...emps.map((e: any) => ({ id: e.id.toString(), name: e.full_name, type: 'employee', label: `${e.full_name} (Employee)` })),
        ...subAdmins.map((s: any) => ({ id: s.id.toString(), name: s.full_name, type: 'sub_admin', label: `${s.full_name} (Sub Admin)` }))
      ];
      setEmployeesAndSubAdmins(combined);
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

    setAssigningTask(true);
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/stationary/refills/${selectedRefill.id}/assign`, {
        assigned_to_id: parseInt(assigneeObj.id),
        assigned_to_type: assigneeObj.type,
        task_notes: taskNotes,
        shop_name: shopName,
        shop_address: shopAddress,
        qty_to_buy: parseInt(qtyToBuy) || 0
      });
      if (res.data.success) {
        Alert.alert('Success', 'Refill task assigned successfully!');
        setAssignModalVisible(false);
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

    setCompletingTask(true);
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/stationary/refills/${completingRefillId}/complete`, {
        bill_amount: amt,
        bill_image: billImage || null
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
        <Text style={{ fontSize: 13, color: Colors.light.icon, marginTop: 4 }}>Date: {new Date(item.created_at).toLocaleString()}</Text>
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
    const statusColor = item.status === 'Filled' ? '#10b981' : item.status === 'Completed' ? '#3b82f6' : item.status === 'Assigned' ? '#f59e0b' : '#64748b';
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
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>On: {new Date(item.created_at).toLocaleString()}</Text>
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
        </View>

        {item.status === 'Filled' && (
          <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, color: '#64748b', fontWeight: 'bold' }}>APPROVAL & AUDIT TRAIL</Text>
            <Text style={{ fontSize: 13, color: '#1e293b', marginTop: 2 }}>Filled Qty: +{item.fillup_qty} items added to stock</Text>
            <Text style={{ fontSize: 12, color: '#475569' }}>Approved By: {item.approved_by_name} ({item.approved_by_role})</Text>
            {item.approved_at && <Text style={{ fontSize: 12, color: '#94a3b8' }}>Approved On: {new Date(item.approved_at).toLocaleString()}</Text>}
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 }}>
          {hasRefillAccess && item.status === 'Requested' && (
            <Pressable style={styles.actionBtn} onPress={() => openAssignModal(item)}>
              <Text style={{ color: Colors.light.primary, fontWeight: '700' }}>Approve & Assign Task</Text>
            </Pressable>
          )}
          {hasRefillAccess && item.status === 'Completed' && (
            <Pressable style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => handleFillupSubmit(item.id, item.qty_to_buy || 0)}>
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
          <View style={[styles.modalContent, isDesktop && { width: 450 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>Assign Refill Task</Text>
              <Pressable onPress={() => setAssignModalVisible(false)}><X size={24} color={Colors.light.icon}/></Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Select Assignee (Employee / Sub Admin)</Text>
              <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, marginBottom: 16 }}>
                {Platform.OS === 'web' ? (
                  <select 
                    style={{ width: '100%', height: 40, border: 'none', backgroundColor: 'transparent', paddingLeft: 8, paddingRight: 8 }}
                    value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)}
                  >
                    <option value="">-- Choose User --</option>
                    {employeesAndSubAdmins.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                  </select>
                ) : (
                  <Picker selectedValue={selectedAssignee} onValueChange={(v) => setSelectedAssignee(v)}>
                    <Picker.Item label="-- Choose User --" value="" />
                    {employeesAndSubAdmins.map(u => <Picker.Item key={u.id} label={u.label} value={u.id} />)}
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

            <Text style={styles.label}>Enter Bill Amount Spent (₹)</Text>
            <TextInput style={styles.input} placeholder="e.g. 1250" value={billAmount} onChangeText={setBillAmount} keyboardType="numeric" />

            <Text style={styles.label}>Upload Bill Image (Optional)</Text>
            <Pressable style={[styles.imagePicker, { width: '100%', height: 150, borderRadius: 8, marginBottom: 20 }]} onPress={handlePickBillImage}>
              {billImage ? (
                <Image source={{ uri: billImage }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="contain" />
              ) : (
                <>
                  <Upload size={24} color={Colors.light.icon} />
                  <Text style={{ marginTop: 8, color: Colors.light.icon, fontSize: 13 }}>Choose Photo</Text>
                </>
              )}
            </Pressable>

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

    </View>
  );
}

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
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }
});
