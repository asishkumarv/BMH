import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, Modal, TextInput, Alert, ScrollView, Image } from 'react-native';
import { Package, Plus, Minus, ShoppingCart, Clock } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

type StationaryItem = {
  id: string;
  name: string;
  stock: number;
  image: string;
  status: string;
};

type RequestHistory = {
  id: string;
  status: string;
  notes: string;
  created_at: string;
  items: {
    id: string;
    item_id: string;
    name: string;
    requested_qty: number;
    approved_qty: number;
  }[];
};

export default function EmployeeStationaryScreen() {
  const { isDesktop } = useResponsive();
  const [items, setItems] = useState<StationaryItem[]>([]);
  const [requests, setRequests] = useState<RequestHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [notes, setNotes] = useState('');
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      let empId = null;
      if (Platform.OS === 'web') {
        const userStr = localStorage.getItem('employeeUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          empId = user.id;
          setEmployeeId(empId);
        }
      }

      const itemsRes = await axios.get('https://bmh-eitu.onrender.com/stationary/items');
      if (itemsRes.data.success) {
        const activeItems = itemsRes.data.data.filter((i: StationaryItem) => i.status !== 'hold');
        setItems(activeItems);
      }

      if (empId) {
        const reqRes = await axios.get(`https://bmh-eitu.onrender.com/stationary/requests?employee_id=${empId}`);
        if (reqRes.data.success) {
          setRequests(reqRes.data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching stationary data:', error);
    } finally {
      setLoading(false);
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

      const res = await axios.post('https://bmh-eitu.onrender.com/stationary/requests', {
        employee_id: employeeId,
        notes,
        items: payloadItems
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

  const cartItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const renderItemCard = ({ item }: { item: StationaryItem }) => {
    const qtyInCart = cart[item.id] || 0;
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
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
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

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
        <View>
          <Text style={styles.title}>Stationary</Text>
          <Text style={styles.subtitle}>Request stationary items for your work.</Text>
        </View>
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
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ padding: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Available Items</Text>
          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyDesc}>No stationary items available right now.</Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {items.map(item => <React.Fragment key={item.id}>{renderItemCard({item})}</React.Fragment>)}
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 40 }]}>Your Request History</Text>
          {requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyDesc}>You haven't made any requests yet.</Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {requests.map(req => (
                <View key={req.id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Clock size={16} color={Colors.light.icon} />
                      <Text style={styles.historyDate}>{new Date(req.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={[styles.statusBadge, (styles as any)[`status_${req.status}`] || styles.status_pending]}>
                      <Text style={[styles.statusText, (styles as any)[`text_${req.status}`] || styles.text_pending]}>{req.status.replace('_', ' ')}</Text>
                    </View>
                  </View>
                  
                  {req.notes ? <Text style={styles.historyNotes}>Notes: {req.notes}</Text> : null}
                  
                  <View style={styles.historyItemsList}>
                    {req.items.map(i => (
                      <View key={i.id} style={styles.historyItemRow}>
                        <Text style={styles.historyItemName}>{i.name}</Text>
                        <Text style={styles.historyItemQty}>
                          Req: {i.requested_qty} {req.status !== 'pending' && req.status !== 'rejected' && `| Appr: ${i.approved_qty}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Cart Modal */}
      <Modal visible={cartModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 500 }, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>Your Request Cart</Text>
            
            <ScrollView style={{ maxHeight: 300, marginBottom: 24 }}>
              {Object.keys(cart).length === 0 ? (
                <Text style={styles.emptyDesc}>Your cart is empty.</Text>
              ) : (
                Object.keys(cart).map(itemId => {
                  const item = items.find(i => i.id === itemId);
                  if (!item) return null;
                  return (
                    <View key={itemId} style={styles.cartItemRow}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, padding: 4 }}>
                        <Pressable style={{ padding: 6, backgroundColor: '#EFF6FF', borderRadius: 4 }} onPress={() => updateCart(item.id, -1)}>
                          <Minus size={14} color={Colors.light.primary} />
                        </Pressable>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.text, marginHorizontal: 12 }}>{cart[itemId]}</Text>
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
            <TextInput 
              style={[styles.input, { height: 80 }]} 
              placeholder="Why do you need these items?" 
              multiline 
              value={notes} 
              onChangeText={setNotes} 
            />

            <View style={styles.modalActions}>
              <Pressable style={[styles.cancelBtn, { backgroundColor: '#F1F5F9' }]} onPress={() => setCartModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, padding: 32 },
  containerMobile: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerMobile: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  cartBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  cartIconWrapper: { position: 'relative' },
  cartBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: Colors.light.error, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  cartBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 15 },
  
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  itemCard: { width: 220, backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.light.border },
  itemCardMobile: { width: '100%' },
  itemImage: { width: '100%', height: 120, borderRadius: 12, marginBottom: 12 },
  itemInfo: { gap: 4 },
  itemName: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  itemStock: { fontSize: 13, color: Colors.light.icon },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 4 },
  qtyBtn: { padding: 8, backgroundColor: '#EFF6FF', borderRadius: 6 },
  qtyText: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  
  historyCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: Colors.light.border },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyDate: { fontSize: 14, fontWeight: '600', color: Colors.light.icon },
  historyNotes: { fontSize: 14, color: Colors.light.text, marginBottom: 12, fontStyle: 'italic' },
  historyItemsList: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 12, gap: 8 },
  historyItemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  historyItemName: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  historyItemQty: { fontSize: 13, color: Colors.light.icon, fontWeight: '500' },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  status_pending: { backgroundColor: '#FEF3C7' }, text_pending: { color: '#D97706' },
  status_approved: { backgroundColor: '#D1FAE5' }, text_approved: { color: '#059669' },
  status_partially_approved: { backgroundColor: '#DBEAFE' }, text_partially_approved: { color: '#2563EB' },
  status_rejected: { backgroundColor: '#FEE2E2' }, text_rejected: { color: '#DC2626' },

  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border },
  emptyDesc: { fontSize: 15, color: Colors.light.icon },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 32, width: '100%', maxWidth: 500, ...Platform.select({ web: { boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' } }) },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginBottom: 24 },
  
  cartItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  cartItemName: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  cartItemQty: { fontSize: 16, fontWeight: '700', color: Colors.light.primary },

  label: { fontSize: 13, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, padding: 14, fontSize: 14, color: Colors.light.text, marginBottom: 20, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  cancelBtnText: { color: Colors.light.text, fontWeight: '700', fontSize: 15 },
  submitBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
