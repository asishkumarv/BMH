import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, Modal, TextInput, Alert, ScrollView, Image } from 'react-native';
import { Package, Plus, MoreVertical, Check, X, Upload } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import * as ImagePicker from 'expo-image-picker';

type StationaryItem = { id: string; name: string; stock: number; image: string; created_at: string; };
type RequestItem = { id: string; item_id: string; name: string; requested_qty: number; approved_qty: number; };
type RequestHistory = { id: string; employee_name: string; employee_department: string; status: string; notes: string; created_at: string; items: RequestItem[]; };

export default function AdminStationaryScreen() {
  const { isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState<'inventory' | 'requests'>('inventory');
  
  const [items, setItems] = useState<StationaryItem[]>([]);
  const [requests, setRequests] = useState<RequestHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Item Modal
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemStock, setNewItemStock] = useState('0');
  const [newItemImage, setNewItemImage] = useState('');
  const [adding, setAdding] = useState(false);

  // Bulk CSV Paste Modal
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [csvText, setCsvText] = useState('');

  // Request Review Modal
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestHistory | null>(null);
  const [approvalQuantities, setApprovalQuantities] = useState<{[key: string]: string}>({});
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'inventory') {
        const res = await axios.get('https://bmh-eitu.onrender.com/stationary/items');
        if (res.data.success) setItems(res.data.data);
      } else {
        const res = await axios.get('https://bmh-eitu.onrender.com/stationary/requests');
        if (res.data.success) setRequests(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        setNewItemImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName) return Alert.alert('Error', 'Name is required');
    setAdding(true);
    try {
      const res = await axios.post('https://bmh-eitu.onrender.com/stationary/items', {
        name: newItemName,
        stock: parseInt(newItemStock) || 0,
        image: newItemImage
      });
      if (res.data.success) {
        setItems([res.data.data, ...items]);
        setAddItemModalVisible(false);
        setNewItemName(''); setNewItemStock('0'); setNewItemImage('');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add item');
    } finally {
      setAdding(false);
    }
  };

  const handleBulkAdd = async () => {
    if (!csvText) return;
    setAdding(true);
    try {
      const rows = csvText.trim().split('\n');
      const payloadItems = rows.map(row => {
        const [name, stock] = row.split(',');
        return { name: name?.trim(), stock: parseInt(stock?.trim()) || 0, image: '' };
      }).filter(i => i.name);

      const res = await axios.post('https://bmh-eitu.onrender.com/stationary/items/bulk', { items: payloadItems });
      if (res.data.success) {
        setBulkModalVisible(false);
        setCsvText('');
        fetchData();
        Alert.alert('Success', res.data.message);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to bulk add');
    } finally {
      setAdding(false);
    }
  };

  const openReviewModal = (req: RequestHistory) => {
    setSelectedRequest(req);
    const initialQty: {[key: string]: string} = {};
    req.items.forEach(i => {
      initialQty[i.item_id] = i.requested_qty.toString();
    });
    setApprovalQuantities(initialQty);
    setReviewModalVisible(true);
  };

  const handleApproveRequest = async (status: 'approved' | 'partially_approved' | 'rejected') => {
    if (!selectedRequest) return;
    setReviewing(true);
    try {
      const approved_items = Object.keys(approvalQuantities).map(itemId => ({
        item_id: itemId,
        approved_qty: parseInt(approvalQuantities[itemId]) || 0
      }));

      const res = await axios.put(`https://bmh-eitu.onrender.com/stationary/requests/${selectedRequest.id}/approve`, {
        status,
        approved_items
      });

      if (res.data.success) {
        setReviewModalVisible(false);
        fetchData();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to process request');
    } finally {
      setReviewing(false);
    }
  };

  const renderInventoryItem = ({ item }: { item: StationaryItem }) => (
    <View style={[styles.itemCard, !isDesktop && styles.itemCardMobile]}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
      ) : (
        <View style={[styles.itemImage, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
          <Package size={32} color={Colors.light.icon} />
        </View>
      )}
      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.itemStock}>Stock: {item.stock}</Text>
    </View>
  );

  const renderRequestItem = ({ item }: { item: RequestHistory }) => (
    <View style={styles.requestRow}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.light.text }}>{item.employee_name}</Text>
        <Text style={{ fontSize: 14, color: Colors.light.icon }}>Dept: {item.employee_department}</Text>
        <Text style={{ fontSize: 13, color: Colors.light.icon, marginTop: 4 }}>Date: {new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.text }}>{item.items?.length || 0} items requested</Text>
        {item.notes ? <Text style={{ fontSize: 13, color: Colors.light.icon, fontStyle: 'italic' }} numberOfLines={1}>"{item.notes}"</Text> : null}
      </View>
      <View style={{ width: 120, alignItems: 'center' }}>
        <View style={[styles.statusBadge, (styles as any)[`status_${item.status}`] || styles.status_pending]}>
          <Text style={[styles.statusText, (styles as any)[`text_${item.status}`] || styles.text_pending]}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>
      <Pressable style={styles.actionBtn} onPress={() => openReviewModal(item)}>
        <Text style={{ color: Colors.light.primary, fontWeight: '700' }}>Review</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
        <View>
          <Text style={styles.title}>Stationary Management</Text>
          <Text style={styles.subtitle}>Manage inventory and employee requests.</Text>
        </View>
        
        {activeTab === 'inventory' && (
          <View style={styles.headerButtons}>
            <Pressable style={styles.secondaryBtn} onPress={() => setBulkModalVisible(true)}>
              <Upload size={18} color={Colors.light.primary} />
              {isDesktop && <Text style={styles.secondaryBtnText}>Bulk CSV Add</Text>}
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => setAddItemModalVisible(true)}>
              <Plus size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>Add Item</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.tabsContainer}>
        <Pressable 
          style={[styles.tab, activeTab === 'inventory' && styles.activeTab]} 
          onPress={() => setActiveTab('inventory')}
        >
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>Inventory</Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]} 
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Requests</Text>
        </Pressable>
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
            renderItem={renderInventoryItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No stationary items found.</Text>}
          />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={item => item.id}
            renderItem={renderRequestItem}
            contentContainerStyle={{ gap: 12 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No requests found.</Text>}
          />
        )}
      </View>

      {/* Add Item Modal */}
      <Modal visible={addItemModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 400 }]}>
            <Text style={styles.modalTitle}>Add Stationary Item</Text>
            
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Pressable style={styles.imagePicker} onPress={handlePickImage}>
                {newItemImage ? (
                  <Image source={{ uri: newItemImage }} style={styles.imagePreview} />
                ) : (
                  <>
                    <Upload size={24} color={Colors.light.icon} />
                    <Text style={{ marginTop: 8, color: Colors.light.icon, fontSize: 13 }}>Upload Image</Text>
                  </>
                )}
              </Pressable>
            </View>

            <Text style={styles.label}>Item Name</Text>
            <TextInput style={styles.input} value={newItemName} onChangeText={setNewItemName} placeholder="e.g. A4 Paper Rim" />
            
            <Text style={styles.label}>Initial Stock</Text>
            <TextInput style={styles.input} value={newItemStock} onChangeText={setNewItemStock} keyboardType="numeric" />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setAddItemModalVisible(false)}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
              <Pressable style={styles.submitBtn} onPress={handleAddItem} disabled={adding}><Text style={styles.submitBtnText}>{adding ? 'Adding...' : 'Add'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Add Modal */}
      <Modal visible={bulkModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 500 }]}>
            <Text style={styles.modalTitle}>Bulk Add Items (CSV Paste)</Text>
            <Text style={{ fontSize: 13, color: Colors.light.icon, marginBottom: 12 }}>Format: ItemName, Stock {"\n"}Example:{"\n"}Pens, 100{"\n"}Notebooks, 50</Text>
            <TextInput 
              style={[styles.input, { height: 150, textAlignVertical: 'top' }]} 
              multiline 
              value={csvText} 
              onChangeText={setCsvText} 
              placeholder="Paste your CSV text here..." 
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setBulkModalVisible(false)}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
              <Pressable style={styles.submitBtn} onPress={handleBulkAdd} disabled={adding}><Text style={styles.submitBtnText}>{adding ? 'Adding...' : 'Upload'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Request Review Modal */}
      <Modal visible={reviewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 600 }, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>Review Request</Text>
            {selectedRequest && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.light.text }}>{selectedRequest.employee_name} ({selectedRequest.employee_department})</Text>
                  {selectedRequest.notes ? <Text style={{ fontSize: 14, color: Colors.light.icon, marginTop: 4, fontStyle: 'italic' }}>Notes: "{selectedRequest.notes}"</Text> : null}
                </View>

                <View style={[styles.tableHeader, { flexDirection: 'row', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border }]}>
                  <Text style={{ flex: 2, fontWeight: '700', color: Colors.light.icon }}>Item Name</Text>
                  <Text style={{ flex: 1, fontWeight: '700', color: Colors.light.icon, textAlign: 'center' }}>Requested</Text>
                  <Text style={{ flex: 1, fontWeight: '700', color: Colors.light.icon, textAlign: 'center' }}>Approve Qty</Text>
                </View>

                {selectedRequest.items.map(item => (
                  <View key={item.item_id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <Text style={{ flex: 2, fontSize: 15, fontWeight: '600', color: Colors.light.text }}>{item.name}</Text>
                    <Text style={{ flex: 1, fontSize: 15, color: Colors.light.text, textAlign: 'center' }}>{item.requested_qty}</Text>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      {selectedRequest.status === 'pending' ? (
                        <TextInput 
                          style={[styles.input, { marginBottom: 0, paddingVertical: 6, textAlign: 'center', width: 60 }]}
                          value={approvalQuantities[item.item_id] || ''}
                          onChangeText={(val) => setApprovalQuantities(prev => ({ ...prev, [item.item_id]: val }))}
                          keyboardType="numeric"
                        />
                      ) : (
                        <Text style={{ fontSize: 15, color: Colors.light.text, fontWeight: '700' }}>{item.approved_qty}</Text>
                      )}
                    </View>
                  </View>
                ))}

                {selectedRequest.status === 'pending' && (
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                    <Pressable style={[styles.submitBtn, { backgroundColor: Colors.light.error }]} onPress={() => handleApproveRequest('rejected')} disabled={reviewing}>
                      <Text style={styles.submitBtnText}>Reject Entirely</Text>
                    </Pressable>
                    <Pressable style={styles.submitBtn} onPress={() => handleApproveRequest('approved')} disabled={reviewing}>
                      <Text style={styles.submitBtnText}>Approve Request</Text>
                    </Pressable>
                  </View>
                )}
                {selectedRequest.status !== 'pending' && (
                  <View style={{ marginTop: 24, alignItems: 'flex-end' }}>
                    <Pressable style={styles.cancelBtn} onPress={() => setReviewModalVisible(false)}><Text style={styles.cancelBtnText}>Close</Text></Pressable>
                  </View>
                )}
              </ScrollView>
            )}
            {selectedRequest?.status === 'pending' && (
              <View style={{ position: 'absolute', top: 20, right: 20 }}>
                <Pressable onPress={() => setReviewModalVisible(false)}><X size={24} color={Colors.light.icon}/></Pressable>
              </View>
            )}
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
  headerMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  headerButtons: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 15 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  secondaryBtnText: { color: Colors.light.primary, fontWeight: '700', marginLeft: 8, fontSize: 15 },
  
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.light.border, marginBottom: 24 },
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

  requestRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#EFF6FF', borderRadius: 8 },
  
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
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, padding: 14, fontSize: 14, color: Colors.light.text, marginBottom: 20, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: Colors.light.icon, fontWeight: '700', fontSize: 15 },
  submitBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  tableHeader: {}
});
