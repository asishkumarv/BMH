import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, ScrollView, useWindowDimensions, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Package, Search, X, CheckCircle, User, Phone, MapPin, ClipboardList, ShieldCheck } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';

export default function SubAdminStoreDeliveryScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'delivered'>('pending');

  // OTP Verification Modal
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [otpValue, setOtpValue] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online' | null>(null);
  const [transactionId, setTransactionId] = useState('');

  const openOtpModal = (order: any) => {
    setSelectedOrder(order);
    setOtpValue('');
    setPaymentMethod(null);
    setTransactionId('');
  };

  // PO Received / Submission Modal
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submittingPO, setSubmittingPO] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let userDataStr = Platform.OS === 'web' ? localStorage.getItem('subAdminUser') : await AsyncStorage.getItem('subAdminUser');
      if (!userDataStr) {
        alert('User session not found. Please log in again.');
        return;
      }
      const u = JSON.parse(userDataStr);
      const userId = u.id?.toString();

      if (!userId) return;

      // Prefix with SA- for sub admin context matching settings and backend
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/employees/store-delivery/assigned?userId=SA-${userId}`);
      if (res.data && res.data.success) {
        setOrders(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching store orders:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!selectedOrder || !otpValue.trim()) {
      alert('Please enter OTP');
      return;
    }

    const isPOD = selectedOrder.payment_mode?.toUpperCase() === 'POD';
    if (isPOD) {
      if (!paymentMethod) {
        alert('Please select a payment method (Cash or Online)');
        return;
      }
      if (paymentMethod === 'Online' && !transactionId.trim()) {
        alert('Please enter transaction ID');
        return;
      }
    }

    setVerifying(true);
    try {
      let url = '';
      let payload: any = { status: 'Delivered', delivery_otp: otpValue };
      if (isPOD) {
        payload.pod_payment_mode = paymentMethod;
        payload.payment_txn_id = paymentMethod === 'Online' ? transactionId.trim() : null;
      }

      if (selectedOrder.type === 'online_order') {
        url = `https://napi.bharatmedicalhallplus.com/online-orders/${selectedOrder.id}/status`;
      } else if (selectedOrder.type === 'sales_order') {
        url = `https://napi.bharatmedicalhallplus.com/sales-order/${selectedOrder.id}/status`;
      } else if (selectedOrder.type === 'sales_invoice') {
        url = `https://napi.bharatmedicalhallplus.com/sales-invoice-list/${selectedOrder.id}/status`;
      } else if (selectedOrder.type === 'manual_order') {
        url = `https://napi.bharatmedicalhallplus.com/manual-orders/${selectedOrder.id}`;
      }

      await axios.put(url, payload);
      alert('Order delivered successfully!');
      setSelectedOrder(null);
      setOtpValue('');
      setPaymentMethod(null);
      setTransactionId('');
      fetchOrders();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert('Verification Failed: ' + msg);
    } finally {
      setVerifying(false);
    }
  };

  const openPOModal = async (po: any) => {
    setSelectedPO(po);
    setUsersSearch('');
    setLoadingUsers(true);
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/employees/all-users');
      if (res.data && res.data.success) {
        setUsersList(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmitPO = async (user: any) => {
    if (!selectedPO) return;
    setSubmittingPO(true);
    try {
      await axios.post(`https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/status/${selectedPO.id}`, {
        status: 'Delivered',
        submitted_to_id: user.id,
        submitted_to_name: user.full_name,
        submitted_to_role: user.role,
        submitted_to_dept: user.department
      });
      alert('Purchase Order marked as Received!');
      setSelectedPO(null);
      fetchOrders();
    } catch (err: any) {
      alert('Error updating PO: ' + err.message);
    } finally {
      setSubmittingPO(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const isCompleted = ['delivered', 'completed', 'received'].includes(o.status?.toLowerCase());
    const matchesTab = activeTab === 'delivered' ? isCompleted : !isCompleted;

    if (!matchesTab) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        o.id?.toString().includes(query) ||
        o.patient_name?.toLowerCase().includes(query) ||
        o.mobile_no?.toLowerCase().includes(query) ||
        o.order_no?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'online_order': return '#f59e0b';
      case 'sales_order': return '#3b82f6';
      case 'sales_invoice': return '#10b981';
      case 'purchase_order': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'online_order': return 'Online Order';
      case 'sales_order': return 'Sales Order';
      case 'sales_invoice': return 'Sales Invoice';
      case 'purchase_order': return 'Purchase Order';
      default: return type.replace('_', ' ');
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#f8fafc' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Store Delivery & Pickups</Text>
        <Text style={styles.subtitle}>Manage your assigned store orders and pickups</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('pending')}
          style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>Pending Deliveries</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('delivered')}
          style={[styles.tabBtn, activeTab === 'delivered' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'delivered' && styles.tabTextActive]}>Delivered History</Text>
        </TouchableOpacity>
      </View>

      {/* Search Filter */}
      <View style={styles.searchBox}>
        <Search size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ID, Customer name or Mobile..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Orders Grid/List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={item => `${item.type}-${item.id}`}
        contentContainerStyle={styles.listContainer}
        numColumns={isDesktop ? 3 : isTablet ? 2 : 1}
        key={isDesktop ? 3 : isTablet ? 2 : 1}
        renderItem={({ item }) => (
          <View style={[styles.card, isDesktop || isTablet ? { flex: 1, margin: 8 } : { marginBottom: 16 }]}>
            <View style={[styles.cardHeader, { borderBottomColor: getBadgeColor(item.type) }]}>
              <View style={styles.typeBadge}>
                <View style={[styles.typeBadgeDot, { backgroundColor: getBadgeColor(item.type) }]} />
                <Text style={[styles.typeBadgeText, { color: getBadgeColor(item.type) }]}>{getLabel(item.type)}</Text>
              </View>
              <Text style={styles.orderId}>#{item.order_no || item.id}</Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.infoRow}>
                <User size={16} color="#64748b" style={styles.infoIcon} />
                <Text style={styles.customerName}>{item.patient_name || 'N/A'}</Text>
              </View>

              {item.mobile_no && (
                <View style={styles.infoRow}>
                  <Phone size={16} color="#64748b" style={styles.infoIcon} />
                  <Text style={styles.mobileText}>{item.mobile_no}</Text>
                </View>
              )}

              {item.address && (
                <View style={styles.infoRow}>
                  <MapPin size={16} color="#64748b" style={styles.infoIcon} />
                  <Text style={styles.addressText}>{item.address}</Text>
                </View>
              )}

              <View style={styles.statusRow}>
                <Text style={styles.amountText}>₹{item.total_amount || '0'}</Text>
                <View style={[styles.statusTag, { backgroundColor: activeTab === 'delivered' ? '#ecfdf5' : '#fffbeb' }]}>
                  <Text style={[styles.statusTagText, { color: activeTab === 'delivered' ? '#10b981' : '#f59e0b' }]}>
                    {item.status || 'PENDING'}
                  </Text>
                </View>
              </View>
            </View>

            {activeTab === 'pending' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: item.type === 'purchase_order' ? '#8b5cf6' : '#0ea5e9' }]}
                onPress={() => item.type === 'purchase_order' ? openPOModal(item) : openOtpModal(item)}
              >
                {item.type === 'purchase_order' ? (
                  <ClipboardList size={18} color="#fff" style={{ marginRight: 6 }} />
                ) : (
                  <CheckCircle size={18} color="#fff" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.actionBtnText}>
                  {item.type === 'purchase_order' ? 'Mark Received' : 'Deliver Order'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
      />

      {/* OTP Delivery Verification Modal */}
      {selectedOrder && (
        <Modal transparent animationType="fade" visible={!!selectedOrder}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Confirm Store Delivery</Text>
                <TouchableOpacity onPress={() => { setSelectedOrder(null); setOtpValue(''); setPaymentMethod(null); setTransactionId(''); }}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {selectedOrder.payment_mode?.toUpperCase() === 'POD' && (
                  <View style={{ width: '100%', marginBottom: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, textAlign: 'center' }}>
                      POD Payment Collected:
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: paymentMethod === 'Cash' ? Colors.light.primary : '#cbd5e1',
                          backgroundColor: paymentMethod === 'Cash' ? `${Colors.light.primary}10` : '#fff',
                          alignItems: 'center'
                        }}
                        onPress={() => setPaymentMethod('Cash')}
                      >
                        <Text style={{ fontWeight: 'bold', color: paymentMethod === 'Cash' ? Colors.light.primary : '#64748b' }}>Cash</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: paymentMethod === 'Online' ? Colors.light.primary : '#cbd5e1',
                          backgroundColor: paymentMethod === 'Online' ? `${Colors.light.primary}10` : '#fff',
                          alignItems: 'center'
                        }}
                        onPress={() => setPaymentMethod('Online')}
                      >
                        <Text style={{ fontWeight: 'bold', color: paymentMethod === 'Online' ? Colors.light.primary : '#64748b' }}>Online</Text>
                      </TouchableOpacity>
                    </View>
                    {paymentMethod === 'Online' && (
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          height: 40,
                          fontSize: 14,
                          color: '#1e293b',
                          marginTop: 6,
                          outlineStyle: 'none' as any
                        }}
                        placeholder="Enter Transaction ID"
                        placeholderTextColor="#94a3b8"
                        value={transactionId}
                        onChangeText={setTransactionId}
                      />
                    )}
                  </View>
                )}

                <Text style={styles.modalDesc}>
                  Enter the 4-digit OTP generated when this order was assigned to you to confirm delivery.
                </Text>

                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter 4-Digit OTP"
                  placeholderTextColor="#94a3b8"
                  value={otpValue}
                  onChangeText={setOtpValue}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                />

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleVerifyOtp}
                  disabled={verifying}
                >
                  {verifying ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Verify OTP & Complete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Purchase Order "Received" Submitted To Modal */}
      {selectedPO && (
        <Modal transparent animationType="slide" visible={!!selectedPO}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '80%', maxWidth: 500 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Submitted To (PO #{selectedPO.order_no || selectedPO.id})</Text>
                <TouchableOpacity onPress={() => { setSelectedPO(null); setUsersSearch(''); }}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchBox}>
                <Search size={18} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search employees or sub admins..."
                  value={usersSearch}
                  onChangeText={setUsersSearch}
                />
              </View>

              <ScrollView style={{ flex: 1, padding: 20 }}>
                {loadingUsers ? (
                  <ActivityIndicator size="small" color={Colors.light.primary} />
                ) : (
                  usersList
                    .filter(u => u.full_name?.toLowerCase().includes(usersSearch.toLowerCase()))
                    .map((user) => (
                      <TouchableOpacity
                        key={user.id}
                        style={styles.userRow}
                        onPress={() => handleSubmitPO(user)}
                        disabled={submittingPO}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName}>{user.full_name}</Text>
                          <Text style={styles.userSub}>{user.role} • {user.department || 'N/A'}</Text>
                        </View>
                        <CheckCircle size={20} color="#cbd5e1" />
                      </TouchableOpacity>
                    ))
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
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#64748b' },
  
  tabContainer: { flexDirection: 'row', gap: 12, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  tabBtn: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: Colors.light.primary },
  tabText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: Colors.light.primary },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 20 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#1e293b', outlineStyle: 'none' as any },

  listContainer: { paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, marginBottom: 12 },
  typeBadge: { flexDirection: 'row', alignItems: 'center' },
  typeBadgeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  typeBadgeText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  orderId: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  cardBody: { gap: 8, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoIcon: { marginTop: 2, marginRight: 8 },
  customerName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  mobileText: { fontSize: 14, color: '#475569' },
  addressText: { fontSize: 13, color: '#64748b', flex: 1, lineHeight: 18 },

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 8, borderRadius: 8, marginTop: 4 },
  amountText: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusTagText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#94a3b8', fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '90%', maxWidth: 450, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  modalBody: { padding: 20, alignItems: 'center' },
  modalDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 20 },

  otpInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 18, textAlign: 'center', color: '#1e293b', width: '80%', marginBottom: 20, fontWeight: 'bold', outlineStyle: 'none' as any },
  submitBtn: { backgroundColor: Colors.light.primary, paddingVertical: 12, borderRadius: 10, width: '80%', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  userName: { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 2 },
  userSub: { fontSize: 13, color: '#94a3b8' }
});
