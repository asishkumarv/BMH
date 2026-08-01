import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Platform, Modal } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { CheckSquare, AlertTriangle, ChevronRight, X, ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EmployeeRackChecker() {
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Racks and selected rack states
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loadingMeds, setLoadingMeds] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Discrepancy Modal States
  const [discModalVisible, setDiscModalVisible] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [discrepancyType, setDiscrepancyType] = useState('missing stock');
  const [reportedQty, setReportedQty] = useState('');
  const [description, setDescription] = useState('');
  const [submittingDisc, setSubmittingDisc] = useState(false);

  useEffect(() => {
    loadUserAndAssignments();
  }, []);

  const loadUserAndAssignments = async () => {
    setLoading(true);
    try {
      let userStr = null;
      if (Platform.OS === 'web') {
        userStr = localStorage.getItem('employeeUser') || localStorage.getItem('subAdminUser');
      } else {
        userStr = await AsyncStorage.getItem('employeeUser') || await AsyncStorage.getItem('subAdminUser');
      }

      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        
        // Fetch assignments for this user
        const uniqueId = parsedUser.role === 'Sub Admin' ? `SA-${parsedUser.id}` : parsedUser.id.toString();
        const res = await axios.get(`https://napi.bharatmedicalhallplus.com/rack-checker/assignments?assigned_to=${uniqueId}`);
        if (res.data.success) {
          setAssignments(res.data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAssignment = async (assign: any) => {
    setSelectedAssignment(assign);
    setLoadingMeds(true);
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/rack-checker/rack-medicines/${assign.rack_number}`);
      if (res.data.success) {
        setMedicines(res.data.medicines || []);
      }
    } catch (error) {
      console.error('Error fetching medicines:', error);
      Alert.alert('Error', 'Failed to load medicines inside rack.');
    } finally {
      setLoadingMeds(false);
    }
  };

  const handleStatusChange = async (newStatus: 'Checked' | 'Not Checked') => {
    if (!selectedAssignment) return;
    setUpdatingStatus(true);
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/rack-checker/assignment/${selectedAssignment.id}/status`, {
        status: newStatus
      });
      Alert.alert('Success', `Rack marked as ${newStatus}`);
      setSelectedAssignment({ ...selectedAssignment, status: newStatus });
      // Refresh list
      loadUserAndAssignments();
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('Error', 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSubmitDiscrepancy = async () => {
    if (!selectedMedicineId) {
      Alert.alert('Validation Error', 'Please select a medicine.');
      return;
    }
    if (!reportedQty) {
      Alert.alert('Validation Error', 'Please specify the actual stock quantity.');
      return;
    }

    const selectedMed = medicines.find(m => m.id.toString() === selectedMedicineId);
    if (!selectedMed) return;

    setSubmittingDisc(true);
    try {
      await axios.post('https://napi.bharatmedicalhallplus.com/rack-checker/discrepancy', {
        assignment_id: selectedAssignment.id,
        reported_by: user.role === 'Sub Admin' ? `SA-${user.id}` : user.id.toString(),
        reported_by_name: user.full_name,
        medicine_id: selectedMed.id,
        product_name: selectedMed.itemname,
        discrepancy_type: discrepancyType,
        reported_qty: parseInt(reportedQty),
        description: description
      });

      Alert.alert('Success', 'Correction request submitted to Admin.');
      setDiscModalVisible(false);
      setSelectedMedicineId('');
      setReportedQty('');
      setDescription('');
    } catch (error) {
      console.error('Error reporting discrepancy:', error);
      Alert.alert('Error', 'Failed to submit correction request.');
    } finally {
      setSubmittingDisc(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (selectedAssignment) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedAssignment(null)}>
          <ArrowLeft size={20} color={Colors.light.primary} style={{ marginRight: 6 }} />
          <Text style={styles.backBtnText}>Back to Assignments</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Verify Rack: {selectedAssignment.rack_number}</Text>
          <Text style={styles.subtitle}>
            Review the list of medicines below, verify their count, and submit discrepancies.
          </Text>
        </View>

        {/* Action Panel */}
        <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={{ fontSize: 13, color: '#64748b', fontWeight: 'bold' }}>CURRENT STATUS</Text>
            <Text style={{ fontSize: 18, color: selectedAssignment.status === 'Checked' ? '#10b981' : '#f59e0b', fontWeight: 'bold', marginTop: 4 }}>
              {selectedAssignment.status}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity 
              style={[styles.reportBtn, { backgroundColor: '#fef3c7', borderColor: '#b45309' }]}
              onPress={() => setDiscModalVisible(true)}
            >
              <AlertTriangle size={16} color="#b45309" style={{ marginRight: 6 }} />
              <Text style={{ color: '#b45309', fontWeight: 'bold', fontSize: 13 }}>Report Discrepancy</Text>
            </TouchableOpacity>

            {selectedAssignment.status !== 'Checked' ? (
              <TouchableOpacity 
                style={[styles.statusBtn, { backgroundColor: '#10b981' }]} 
                onPress={() => handleStatusChange('Checked')}
                disabled={updatingStatus}
              >
                <Text style={styles.statusBtnText}>Mark Checked</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.statusBtn, { backgroundColor: '#ef4444' }]} 
                onPress={() => handleStatusChange('Not Checked')}
                disabled={updatingStatus}
              >
                <Text style={styles.statusBtnText}>Mark Unchecked</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Medicines List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Medicines inside Rack</Text>
          {loadingMeds ? (
            <ActivityIndicator size="small" color={Colors.light.primary} />
          ) : (
            <View>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>Medicine Name</Text>
                <Text style={[styles.th, { flex: 1 }]}>Batch No</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Stock Bal Qty</Text>
              </View>
              {medicines.map((med) => (
                <View key={med.id} style={styles.tableRow}>
                  <Text style={[styles.td, { flex: 2, fontWeight: '700' }]}>{med.itemname}</Text>
                  <Text style={[styles.td, { flex: 1, color: '#64748b' }]}>{med.batchno || '-'}</Text>
                  <Text style={[styles.td, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>
                    {med.stockbalqty}
                  </Text>
                </View>
              ))}
              {medicines.length === 0 && (
                <Text style={styles.emptyText}>No medicines assigned to this rack in system database.</Text>
              )}
            </View>
          )}
        </View>

        {/* Discrepancy Modal */}
        <Modal visible={discModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Submit Correction Request</Text>
                <TouchableOpacity onPress={() => setDiscModalVisible(false)}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalLabel}>Select Medicine</Text>
                <View style={styles.selectContainer}>
                  <select 
                    value={selectedMedicineId} 
                    onChange={(e) => setSelectedMedicineId(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="">-- Choose Medicine --</option>
                    {medicines.map(m => (
                      <option key={m.id} value={m.id}>{m.itemname} (Batch: {m.batchno || 'N/A'})</option>
                    ))}
                  </select>
                </View>

                <Text style={styles.modalLabel}>Discrepancy Type</Text>
                <View style={styles.selectContainer}>
                  <select 
                    value={discrepancyType} 
                    onChange={(e) => setDiscrepancyType(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="missing stock">Missing Stock</option>
                    <option value="excess stock">Excess Stock</option>
                    <option value="wrong item">Wrong Item</option>
                    <option value="damaged item">Damaged Item</option>
                    <option value="other">Other</option>
                  </select>
                </View>

                <Text style={styles.modalLabel}>Actual Verified Quantity</Text>
                <TextInput 
                  style={styles.textInput}
                  placeholder="Enter observed quantity"
                  keyboardType="numeric"
                  value={reportedQty}
                  onChangeText={setReportedQty}
                />

                <Text style={styles.modalLabel}>Describe Discrepancy / Comments</Text>
                <TextInput 
                  style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                  placeholder="Provide details about the mismatch..."
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />

                <TouchableOpacity 
                  style={[styles.submitDiscBtn, submittingDisc && { opacity: 0.7 }]} 
                  onPress={handleSubmitDiscrepancy}
                  disabled={submittingDisc}
                >
                  {submittingDisc ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.submitDiscBtnText}>Submit to Admin</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Assigned Racks</Text>
        <Text style={styles.subtitle}>Below are the racks currently assigned to you for verification.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Racks List</Text>
        {assignments.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.assignmentItem} 
            onPress={() => handleSelectAssignment(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.assignmentTitle}>Rack {item.rack_number}</Text>
              <Text style={styles.assignmentDesc}>Assigned by: {item.assigned_by}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: item.status === 'Checked' ? '#10b981' : '#f59e0b' }}>
                {item.status}
              </Text>
              <ChevronRight size={18} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        ))}
        {assignments.length === 0 && (
          <Text style={styles.emptyText}>You have no assigned racks to verify.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtnText: { color: Colors.light.primary, fontWeight: '600', fontSize: 14 },
  
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  
  card: { backgroundColor: 'white', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 24 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  
  assignmentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  assignmentTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  assignmentDesc: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  
  emptyText: { textAlign: 'center', color: '#94a3b8', padding: 20, fontStyle: 'italic' },
  
  statusBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statusBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  reportBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },

  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  th: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  td: { fontSize: 14, color: '#334155' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 500, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 12, marginBottom: 6 },
  selectContainer: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, overflow: 'hidden', backgroundColor: '#f8fafc', marginBottom: 16 },
  selectInput: { width: '100%', padding: 12, fontSize: 14, color: '#334155', border: 'none', background: 'transparent', outline: 'none' as any },
  textInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#334155', backgroundColor: '#f8fafc', outlineStyle: 'none' as any, marginBottom: 16 },
  submitDiscBtn: { backgroundColor: Colors.light.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  submitDiscBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
