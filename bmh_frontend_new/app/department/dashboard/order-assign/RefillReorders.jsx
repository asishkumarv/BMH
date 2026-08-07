import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Modal, ScrollView, useWindowDimensions } from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { X } from 'lucide-react-native';

export default function RefillReorders() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;

  const [reorders, setReorders] = useState([]);
  const [loadingReorders, setLoadingReorders] = useState(false);
  const [selectedReorder, setSelectedReorder] = useState(null);
  const [reorderModalVisible, setReorderModalVisible] = useState(false);

  const fetchReorders = async () => {
    try {
      setLoadingReorders(true);
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/crm/reorders');
      if (res.data && res.data.success) {
        setReorders(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching reorders:', err);
    } finally {
      setLoadingReorders(false);
    }
  };

  const handleUpdateReorderStatus = async (id, status) => {
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/crm/reorders/${id}/status`, { status });
      if (res.data && res.data.success) {
        alert('Reorder status updated successfully!');
        fetchReorders();
        if (selectedReorder && selectedReorder.id === id) {
          setSelectedReorder(prev => ({ ...prev, status }));
        }
      }
    } catch (err) {
      console.log('Error updating reorder status:', err);
      alert('Error updating reorder status');
    }
  };

  useEffect(() => {
    fetchReorders();
  }, []);

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>Customer Refill Reorders</Text>
        <TouchableOpacity 
          style={{ backgroundColor: '#4f46e5', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }}
          onPress={fetchReorders}
        >
          {loadingReorders ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={isDesktop ? styles.tableContainer : { flex: 1, minHeight: 400 }}>
        {isDesktop && (
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { flex: 1 }]}>Status</Text>
            <Text style={[styles.headerText, { flex: 2 }]}>Customer Name</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>Mobile No</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>Original Invoice</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>Reminder Date</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>Requested At</Text>
            <Text style={[styles.headerText, { flex: 1.2, textAlign: 'center' }]}>Actions</Text>
          </View>
        )}

        <FlatList
          data={reorders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const statusColor = item.status === 'Created' ? '#10b981' : item.status === 'Called' ? '#f59e0b' : '#3b82f6';
            
            if (isDesktop) {
              return (
                <View style={styles.tableRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ backgroundColor: statusColor + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' }}>
                      <Text style={{ color: statusColor, fontSize: 12, fontWeight: 'bold' }}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.cellText, { flex: 2, fontWeight: '600' }]}>{item.patient_name}</Text>
                  <Text style={[styles.cellText, { flex: 1.5 }]}>{item.mobile_no}</Text>
                  <Text style={[styles.cellText, { flex: 1.5 }]}>{item.invoice_id || 'N/A'}</Text>
                  <Text style={[styles.cellText, { flex: 1.5 }]}>{item.reminder_date || 'N/A'}</Text>
                  <Text style={[styles.cellText, { flex: 1.5 }]}>{new Date(item.created_at).toLocaleString()}</Text>
                  
                  <View style={{ flex: 1.2, flexDirection: 'row', justifyContent: 'center' }}>
                    <TouchableOpacity 
                      style={{ backgroundColor: '#f1f5f9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 }}
                      onPress={() => {
                        setSelectedReorder(item);
                        setReorderModalVisible(true);
                      }}
                    >
                      <Text style={{ color: '#475569', fontSize: 13, fontWeight: '600' }}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            return (
              <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b' }}>{item.patient_name}</Text>
                  <View style={{ backgroundColor: statusColor + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: statusColor, fontSize: 11, fontWeight: 'bold' }}>{item.status}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>📞 {item.mobile_no}</Text>
                <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>📄 Invoice: {item.invoice_id || 'N/A'}</Text>
                <Text style={{ fontSize: 12, color: '#94a3b8' }}>📅 Requested: {new Date(item.created_at).toLocaleDateString()}</Text>
                <TouchableOpacity 
                  style={{ marginTop: 12, backgroundColor: '#f1f5f9', padding: 8, borderRadius: 6, alignItems: 'center' }}
                  onPress={() => {
                    setSelectedReorder(item);
                    setReorderModalVisible(true);
                  }}
                >
                  <Text style={{ color: '#475569', fontSize: 13, fontWeight: '600' }}>View Details</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: '#94a3b8', marginVertical: 40, fontSize: 14 }}>
              No customer reorders found.
            </Text>
          }
        />
      </View>

      {reorderModalVisible && selectedReorder && (
        <Modal visible={reorderModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isDesktop ? 650 : '90%', height: isDesktop ? 600 : 500, maxHeight: '85%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Refill Reorder Details</Text>
                <TouchableOpacity onPress={() => { setReorderModalVisible(false); setSelectedReorder(null); }}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 10, marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 }}>Customer Details</Text>
                  <Text style={{ fontSize: 14, color: '#334155', marginBottom: 6 }}>👦 <Text style={{ fontWeight: '600' }}>Name:</Text> {selectedReorder.patient_name}</Text>
                  <Text style={{ fontSize: 14, color: '#334155', marginBottom: 6 }}>📞 <Text style={{ fontWeight: '600' }}>Mobile:</Text> {selectedReorder.mobile_no}</Text>
                  <Text style={{ fontSize: 14, color: '#334155', marginBottom: 6 }}>🏠 <Text style={{ fontWeight: '600' }}>Address:</Text> {selectedReorder.patient_address || 'N/A'}</Text>
                  <Text style={{ fontSize: 14, color: '#334155', marginBottom: 6 }}>📄 <Text style={{ fontWeight: '600' }}>Original Invoice:</Text> {selectedReorder.invoice_id || 'N/A'}</Text>
                  <Text style={{ fontSize: 14, color: '#334155', marginBottom: 6 }}>📅 <Text style={{ fontWeight: '600' }}>Reminder Date:</Text> {selectedReorder.reminder_date || 'N/A'}</Text>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8 }}>Update Reorder Status</Text>
                  <View style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff' }}>
                    <Picker
                      selectedValue={selectedReorder.status}
                      onValueChange={(val) => handleUpdateReorderStatus(selectedReorder.id, val)}
                    >
                      <Picker.Item label="Pending" value="Pending" />
                      <Picker.Item label="Called" value="Called" />
                      <Picker.Item label="Created" value="Created" />
                    </Picker>
                  </View>
                </View>

                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 }}>Prescribed Medicines</Text>
                <View style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 10 }}>
                    <Text style={{ flex: 3, fontSize: 13, fontWeight: 'bold', color: '#475569' }}>Item Name</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: 'bold', color: '#475569', textAlign: 'center' }}>Qty</Text>
                    <Text style={{ flex: 1.2, fontSize: 13, fontWeight: 'bold', color: '#475569', textAlign: 'right' }}>Rate</Text>
                    <Text style={{ flex: 1.5, fontSize: 13, fontWeight: 'bold', color: '#475569', textAlign: 'right' }}>Total</Text>
                  </View>
                  {selectedReorder.items?.map((item) => (
                    <View key={item.id} style={{ flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff' }}>
                      <Text style={{ flex: 3, fontSize: 13, color: '#334155' }}>{item.item_name}</Text>
                      <Text style={{ flex: 1, fontSize: 13, color: '#334155', textAlign: 'center' }}>{parseInt(item.quantity)}</Text>
                      <Text style={{ flex: 1.2, fontSize: 13, color: '#334155', textAlign: 'right' }}>₹{parseFloat(item.rate).toFixed(2)}</Text>
                      <Text style={{ flex: 1.5, fontSize: 13, fontWeight: '600', color: '#0f172a', textAlign: 'right' }}>₹{(parseInt(item.quantity) * parseFloat(item.rate)).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
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
  tableContainer: { height: 420, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  cellText: { fontSize: 13, color: '#334155' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 16, marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' }
});
