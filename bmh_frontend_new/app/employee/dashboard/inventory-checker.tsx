import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert as AlertRN, TextInput, Platform, Modal } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { CheckSquare, AlertTriangle, ChevronRight, X, ArrowLeft, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Alert = {
  alert: (title: string, message?: string) => {
    if (Platform.OS === 'web') {
      alert(message ? `${title}: ${message}` : title);
    } else {
      AlertRN.alert(title, message);
    }
  }
};

export default function EmployeeInventoryChecker() {
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Tasks and selected task states
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [verificationsMap, setVerificationsMap] = useState<Record<number, any>>({});
  const [loadingMeds, setLoadingMeds] = useState(false);

  // Verification Modal States
  const [verModalVisible, setVerModalVisible] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);

  // Input states
  const [verifiedName, setVerifiedName] = useState('');
  const [verifiedBatch, setVerifiedBatch] = useState('');
  const [verifiedExpiry, setVerifiedExpiry] = useState('');
  const [verifiedQty, setVerifiedQty] = useState('');
  const [verifiedSellingPrice, setVerifiedSellingPrice] = useState('');
  const [verifiedPurchasePrice, setVerifiedPurchasePrice] = useState('');
  const [verifiedMrp, setVerifiedMrp] = useState('');
  const [verifiedMrpBox, setVerifiedMrpBox] = useState('');
  const [verifiedPackSize, setVerifiedPackSize] = useState('');
  const [purchaseEntryEmployee, setPurchaseEntryEmployee] = useState('');
  const [stockAvailability, setStockAvailability] = useState('Available');
  const [submittingVer, setSubmittingVer] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: any;
    if (selectedTask && selectedTask.status === 'In Progress' && selectedTask.start_time) {
      const startMs = new Date(selectedTask.start_time).getTime();
      interval = setInterval(() => {
        const diffSecs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setElapsedSeconds(diffSecs);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [selectedTask]);

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${secs}s`;
  };

  const handleStartTask = async () => {
    if (!selectedTask) return;
    setUpdatingStatus(true);
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/inventory-checker/task/${selectedTask.id}/status`, {
        status: 'In Progress'
      });
      Alert.alert('Success', 'Task started!');
      setSelectedTask({ ...selectedTask, status: 'In Progress', start_time: new Date().toISOString() });
      loadUserAndTasks();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to start task.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    loadUserAndTasks();
  }, []);

  const loadUserAndTasks = async () => {
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
        
        const uniqueId = parsedUser.role === 'Sub Admin' ? `SA-${parsedUser.id}` : parsedUser.id.toString();
        const res = await axios.get(`https://napi.bharatmedicalhallplus.com/inventory-checker/tasks?assigned_to=${uniqueId}`);
        if (res.data.success) {
          setTasks(res.data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTask = async (task: any) => {
    setSelectedTask(task);
    setLoadingMeds(true);
    try {
      // 1. Fetch medicines in task's rack
      const medsRes = await axios.get(`https://napi.bharatmedicalhallplus.com/rack-checker/rack-medicines/${task.rack_number}`);
      // 2. Fetch already verified items in this task
      const verRes = await axios.get(`https://napi.bharatmedicalhallplus.com/inventory-checker/verifications`);
      
      const meds = medsRes.data.medicines || [];
      const vers = verRes.data.data || [];
      
      // Filter verifications for this task and map by medicine_id
      const taskVers = vers.filter((v: any) => String(v.task_id) === String(task.id));
      const vMap: Record<number, any> = {};
      taskVers.forEach((v: any) => {
        vMap[v.medicine_id] = v;
      });

      setMedicines(meds);
      setVerificationsMap(vMap);
    } catch (error) {
      console.error('Error loading medicines for task:', error);
      Alert.alert('Error', 'Failed to load task details.');
    } finally {
      setLoadingMeds(false);
    }
  };

  const openVerificationModal = (med: any) => {
    setSelectedMed(med);
    
    // Set initial values to current values in DB
    setVerifiedName(med.itemname || '');
    setVerifiedBatch(med.batchno || '');
    setVerifiedExpiry(med.expirydate || '');
    setVerifiedQty(med.stockbalqty?.toString() || '0');
    setVerifiedSellingPrice(med.salerate?.toString() || '0');
    setVerifiedPurchasePrice(med.purchaserate?.toString() || '0');
    setVerifiedMrp(med.mrp?.toString() || '0');
    setVerifiedMrpBox(med.mrpbox?.toString() || '0');
    setVerifiedPackSize(med.pack_size?.toString() || med.packsize?.toString() || '');
    setPurchaseEntryEmployee('');
    setStockAvailability(med.stockbalqty > 0 ? 'Available' : 'Out of Stock');
    
    setVerModalVisible(true);
  };

  const handleSaveVerification = async () => {
    if (!selectedMed) return;
    
    // Calculate mismatches
    const mismatchDetails: Record<string, { current: any, verified: any }> = {};
    let isMismatch = false;

    if (verifiedName !== selectedMed.itemname) {
      mismatchDetails['product_name'] = { current: selectedMed.itemname, verified: verifiedName };
      isMismatch = true;
    }
    if (verifiedBatch !== selectedMed.batchno) {
      mismatchDetails['batch_number'] = { current: selectedMed.batchno, verified: verifiedBatch };
      isMismatch = true;
    }
    if (verifiedExpiry !== selectedMed.expirydate) {
      mismatchDetails['expiry_date'] = { current: selectedMed.expirydate, verified: verifiedExpiry };
      isMismatch = true;
    }
    if (parseFloat(verifiedQty) !== parseFloat(selectedMed.stockbalqty)) {
      mismatchDetails['quantity'] = { current: selectedMed.stockbalqty, verified: parseFloat(verifiedQty) };
      isMismatch = true;
    }
    if (parseFloat(verifiedMrp) !== parseFloat(selectedMed.mrp)) {
      mismatchDetails['mrp'] = { current: selectedMed.mrp, verified: parseFloat(verifiedMrp) };
      isMismatch = true;
    }
    if (parseFloat(verifiedMrpBox) !== parseFloat(selectedMed.mrpbox || 0)) {
      mismatchDetails['mrpbox'] = { current: selectedMed.mrpbox || 0, verified: parseFloat(verifiedMrpBox) };
      isMismatch = true;
    }
    const currentPack = selectedMed.pack_size || selectedMed.packsize || '';
    if (verifiedPackSize !== currentPack) {
      mismatchDetails['pack_size'] = { current: currentPack, verified: verifiedPackSize };
      isMismatch = true;
    }

    setSubmittingVer(true);
    try {
      await axios.post('https://napi.bharatmedicalhallplus.com/inventory-checker/verification', {
        task_id: selectedTask.id,
        medicine_id: selectedMed.id,
        product_name: verifiedName,
        batch_number: verifiedBatch,
        expiry_date: verifiedExpiry || null,
        quantity: parseFloat(verifiedQty),
        selling_price: parseFloat(selectedMed.salerate) || 0,
        purchase_price: parseFloat(selectedMed.purchaserate) || 0,
        mrp: parseFloat(verifiedMrp),
        mrpbox: parseFloat(verifiedMrpBox),
        stock_availability: stockAvailability,
        is_mismatch: isMismatch,
        mismatch_details: mismatchDetails,
        purchase_entry_employee: purchaseEntryEmployee,
        purchase_entry_error: purchaseEntryEmployee.trim().length > 0,
        pack_size: verifiedPackSize
      });

      Alert.alert('Success', 'Verification details submitted successfully!');
      setVerModalVisible(false);
      
      // Refresh task details
      handleSelectTask(selectedTask);
    } catch (error) {
      console.error('Failed to submit verification:', error);
      Alert.alert('Error', 'Failed to submit verification details.');
    } finally {
      setSubmittingVer(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (selectedTask) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedTask(null); loadUserAndTasks(); }}>
          <ArrowLeft size={20} color={Colors.light.primary} style={{ marginRight: 6 }} />
          <Text style={styles.backBtnText}>Back to Tasks</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Inventory Rack Task: {selectedTask.rack_number}</Text>
          <Text style={styles.subtitle}>
            Inspect all attributes for medicines listed. Capture mismatches and track correctness.
          </Text>
        </View>

        {/* Task Start / Timed Flow Panel */}
        <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={{ fontSize: 13, color: '#64748b', fontWeight: 'bold' }}>TASK STATUS</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: selectedTask.status === 'completed' ? '#10b981' : selectedTask.status === 'In Progress' ? '#3b82f6' : '#f59e0b', marginTop: 4 }}>
              {selectedTask.status.toUpperCase()}
            </Text>
            {selectedTask.status === 'completed' && selectedTask.duration && (
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Duration: {formatElapsed(selectedTask.duration)}</Text>
            )}
          </View>
          
          <View>
            {selectedTask.status === 'pending' && (
              <TouchableOpacity 
                style={[styles.submitVerBtn, { marginTop: 0, paddingHorizontal: 20 }]} 
                onPress={handleStartTask}
                disabled={updatingStatus}
              >
                <Text style={styles.submitVerBtnText}>Start Task</Text>
              </TouchableOpacity>
            )}
            {selectedTask.status === 'In Progress' && (
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#4b5563' }}>⏱️ Active Time: {formatElapsed(elapsedSeconds)}</Text>
            )}
          </View>
        </View>

        {/* Medicines list */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Medicines inside Rack</Text>
          {loadingMeds ? (
            <ActivityIndicator size="small" color={Colors.light.primary} />
          ) : (
            <View>
              {isDesktop ? (
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                  <View style={{ minWidth: 920 }}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { width: 90 }]}>Item Code</Text>
                      <Text style={[styles.th, { width: 200 }]}>Medicine Name</Text>
                      <Text style={[styles.th, { width: 110 }]}>Batch No</Text>
                      <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>Qty</Text>
                      <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>MRP</Text>
                      <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>MRP Box</Text>
                      <Text style={[styles.th, { width: 110, textAlign: 'center' }]}>Expiry Date</Text>
                      <Text style={[styles.th, { width: 150, textAlign: 'center' }]}>Status</Text>
                      <Text style={[styles.th, { width: 100, textAlign: 'center' }]}>Action</Text>
                    </View>
                    {medicines.map((med) => {
                      const ver = verificationsMap[med.id];
                      const isVerified = !!ver;
                      const hasMismatch = ver?.is_mismatch;

                      return (
                        <View key={med.id} style={styles.tableRow}>
                          <Text style={[styles.td, { width: 90, color: '#64748b' }]} numberOfLines={1}>
                            {med.c_item_code || '-'}
                          </Text>
                          <Text style={[styles.td, { width: 200, fontWeight: '700' }]} numberOfLines={2}>
                            {med.itemname}
                          </Text>
                          <Text style={[styles.td, { width: 110, color: '#64748b' }]} numberOfLines={1}>
                            {med.batchno || '-'}
                          </Text>
                          <Text style={[styles.td, { width: 80, textAlign: 'right', fontWeight: 'bold' }]}>
                            {med.stockbalqty}
                          </Text>
                          <Text style={[styles.td, { width: 80, textAlign: 'right', fontWeight: 'bold' }]}>
                            {med.mrp || '-'}
                          </Text>
                          <Text style={[styles.td, { width: 80, textAlign: 'right', fontWeight: 'bold' }]}>
                            {med.mrpbox || '-'}
                          </Text>
                          <Text style={[styles.td, { width: 110, textAlign: 'center', color: '#64748b' }]}>
                            {med.expirydate || '-'}
                          </Text>
                          <View style={{ width: 150, alignItems: 'center' }}>
                            {isVerified ? (
                              hasMismatch ? (
                                <View style={styles.badgeMismatch}>
                                  <AlertTriangle size={12} color="#ef4444" style={{ marginRight: 4 }} />
                                  <Text style={styles.badgeMismatchText}>Mismatch Pending</Text>
                                </View>
                              ) : (
                                <View style={styles.badgeVerified}>
                                  <Check size={12} color="#10b981" style={{ marginRight: 4 }} />
                                  <Text style={styles.badgeVerifiedText}>Verified</Text>
                                </View>
                              )
                            ) : (
                              <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Pending Check</Text>
                            )}
                          </View>
                          <View style={{ width: 100, alignItems: 'center' }}>
                            <TouchableOpacity 
                              style={{ backgroundColor: Colors.light.primary, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 6 }}
                              onPress={() => {
                                if (selectedTask.status === 'pending') {
                                  Alert.alert('Warning', 'Please click "Start Task" before verifying items.');
                                  return;
                                }
                                openVerificationModal(med);
                              }}
                            >
                              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Verify</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              ) : (
                <View>
                  {medicines.map((med) => {
                    const ver = verificationsMap[med.id];
                    const isVerified = !!ver;
                    const hasMismatch = ver?.is_mismatch;

                    return (
                      <TouchableOpacity 
                        key={med.id} 
                        style={styles.verificationRow}
                        onPress={() => {
                          if (selectedTask.status === 'pending') {
                            Alert.alert('Warning', 'Please click "Start Task" before verifying items.');
                            return;
                          }
                          openVerificationModal(med);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.medName}>{med.itemname}</Text>
                          <Text style={styles.medSub}>
                            Batch: {med.batchno || '-'} • Qty: {med.stockbalqty} • MRP: {med.mrp}
                          </Text>
                        </View>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          {isVerified ? (
                            hasMismatch ? (
                              <View style={styles.badgeMismatch}>
                                <AlertTriangle size={12} color="#ef4444" style={{ marginRight: 4 }} />
                                <Text style={styles.badgeMismatchText}>Mismatch Pending</Text>
                              </View>
                            ) : (
                              <View style={styles.badgeVerified}>
                                <Check size={12} color="#10b981" style={{ marginRight: 4 }} />
                                <Text style={styles.badgeVerifiedText}>Verified</Text>
                              </View>
                            )
                          ) : (
                            <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Pending Check</Text>
                          )}
                          <ChevronRight size={18} color="#94a3b8" />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {medicines.length === 0 && (
                <Text style={styles.emptyText}>No medicines in this rack.</Text>
              )}
            </View>
          )}
        </View>

        {/* Verification Form Modal */}
        <Modal visible={verModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Verify Product Details</Text>
                <TouchableOpacity onPress={() => setVerModalVisible(false)}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {selectedMed && (
                  <View style={styles.infoBox}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>
                      Current Db Records:
                    </Text>
                    <Text style={styles.infoText}>Name: {selectedMed.itemname}</Text>
                    <Text style={styles.infoText}>Batch: {selectedMed.batchno || '-'}</Text>
                    <Text style={styles.infoText}>Expiry: {selectedMed.expirydate || '-'}</Text>
                    <Text style={styles.infoText}>Qty: {selectedMed.stockbalqty} • MRP: {selectedMed.mrp} • MRP Box: {selectedMed.mrpbox || '-'}</Text>
                  </View>
                )}

                <Text style={styles.modalLabel}>Product Name</Text>
                <TextInput style={styles.textInput} value={verifiedName} onChangeText={setVerifiedName} />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Batch Number</Text>
                    <TextInput style={styles.textInput} value={verifiedBatch} onChangeText={setVerifiedBatch} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Pack Size (Qty/Box)</Text>
                    <TextInput style={styles.textInput} value={verifiedPackSize} onChangeText={setVerifiedPackSize} />
                  </View>
                </View>

                <Text style={styles.modalLabel}>Expiry Date</Text>
                <TextInput style={styles.textInput} placeholder="YYYY-MM-DD" value={verifiedExpiry} onChangeText={setVerifiedExpiry} />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Quantity</Text>
                    <TextInput style={styles.textInput} keyboardType="numeric" value={verifiedQty} onChangeText={setVerifiedQty} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>MRP</Text>
                    <TextInput style={styles.textInput} keyboardType="numeric" value={verifiedMrp} onChangeText={setVerifiedMrp} />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>MRP Box</Text>
                    <TextInput style={styles.textInput} keyboardType="numeric" value={verifiedMrpBox} onChangeText={setVerifiedMrpBox} />
                  </View>
                </View>

                <Text style={styles.modalLabel}>Purchase Entry Employee Name (if mismatch is due to entry error)</Text>
                <TextInput style={styles.textInput} placeholder="e.g. Amit Kumar" value={purchaseEntryEmployee} onChangeText={setPurchaseEntryEmployee} />

                <Text style={styles.modalLabel}>Stock Availability</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  {['Available', 'Out of Stock', 'Damaged'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => setStockAvailability(status)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        alignItems: 'center',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: stockAvailability === status ? Colors.light.primary : '#cbd5e1',
                        backgroundColor: stockAvailability === status ? `${Colors.light.primary}10` : '#f8fafc',
                      }}
                    >
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: stockAvailability === status ? Colors.light.primary : '#475569',
                      }}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity 
                  style={[styles.submitVerBtn, submittingVer && { opacity: 0.7 }]} 
                  onPress={handleSaveVerification}
                  disabled={submittingVer}
                >
                  {submittingVer ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.submitVerBtnText}>Save & Submit</Text>}
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
        <Text style={styles.title}>My Assigned Inventory Tasks</Text>
        <Text style={styles.subtitle}>Verify product names, batches, expiries, quantities, prices and availability.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tasks List</Text>
        {tasks.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.taskItem} 
            onPress={() => handleSelectTask(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>Verification Task: Rack {item.rack_number}</Text>
              <Text style={styles.taskDesc}>Assigned by: {item.assigned_by}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: item.status === 'completed' ? '#10b981' : '#f59e0b', textTransform: 'capitalize' }}>
                {item.status}
              </Text>
              <ChevronRight size={18} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        ))}
        {tasks.length === 0 && (
          <Text style={styles.emptyText}>You have no assigned inventory tasks.</Text>
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
  
  taskItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  taskTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  taskDesc: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  
  emptyText: { textAlign: 'center', color: '#94a3b8', padding: 20, fontStyle: 'italic' },

  verificationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  medName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  medSub: { fontSize: 12, color: '#64748b', marginTop: 4 },

  badgeVerified: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  badgeVerifiedText: { fontSize: 11, color: '#065f46', fontWeight: 'bold' },

  badgeMismatch: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  badgeMismatchText: { fontSize: 11, color: '#991b1b', fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 550, maxHeight: '90%', backgroundColor: 'white', borderRadius: 16, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 12, marginBottom: 6 },
  
  infoBox: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 12 },
  infoText: { fontSize: 12, color: '#475569', marginTop: 2 },
 
  selectContainer: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, overflow: 'hidden', backgroundColor: '#f8fafc', marginBottom: 16 },
  selectInput: { width: '100%', padding: 12, fontSize: 14, color: '#334155', borderWidth: 0, backgroundColor: 'transparent' } as any,
  textInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#334155', backgroundColor: '#f8fafc', marginBottom: 16 },
  submitVerBtn: { backgroundColor: Colors.light.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  submitVerBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  th: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  td: { fontSize: 14, color: '#334155' }
});
