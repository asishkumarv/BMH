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

  // Discrepancy Modal & List States
  const [discModalVisible, setDiscModalVisible] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [discrepancyType, setDiscrepancyType] = useState('missing stock');
  const [discrepancyList, setDiscrepancyList] = useState<any[]>([]);

  // Individual Form Fields based on Type
  const [missingQty, setMissingQty] = useState('');
  const [excessQty, setExcessQty] = useState('');
  const [damagedQty, setDamagedQty] = useState('');
  const [expiredQty, setExpiredQty] = useState('');
  const [totalStock, setTotalStock] = useState('');
  const [reportedMrp, setReportedMrp] = useState('');
  const [description, setDescription] = useState('');

  // Wrong Item search states
  const [wrongItemSearch, setWrongItemSearch] = useState('');
  const [wrongItemStock, setWrongItemStock] = useState('');
  const [selectedWrongMed, setSelectedWrongMed] = useState<any>(null);
  const [wrongMedResults, setWrongMedResults] = useState<any[]>([]);
  const [wrongDropdownOpen, setWrongDropdownOpen] = useState(false);

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

  const handleSearchWrongMed = async (query: string) => {
    setWrongItemSearch(query);
    if (query.trim().length > 1) {
      try {
        const res = await axios.get(`https://napi.bharatmedicalhallplus.com/rack-checker/search-medicines?q=${query}`);
        if (res.data.success) {
          setWrongMedResults(res.data.medicines || []);
          setWrongDropdownOpen(true);
        }
      } catch (error) {
        console.error('Error searching wrong medicine:', error);
      }
    } else {
      setWrongMedResults([]);
      setWrongDropdownOpen(false);
    }
  };

  const handleAddDiscrepancy = () => {
    if (!selectedMedicineId) {
      Alert.alert('Validation Error', 'Please select a medicine.');
      return;
    }

    const selectedMed = medicines.find(m => m.id.toString() === selectedMedicineId);
    if (!selectedMed) return;

    let reported_qty: number | null = null;
    let reported_mrp_val: number | null = null;
    let finalDescription = '';

    // Validate inputs based on discrepancy type
    if (discrepancyType === 'missing stock') {
      if (!missingQty || !totalStock) {
        Alert.alert('Validation Error', 'Please specify missing quantity and total stock of batch.');
        return;
      }
      reported_qty = parseInt(totalStock) - parseInt(missingQty);
      finalDescription = `${description} (Missing: ${missingQty}, Total: ${totalStock})`;
    } else if (discrepancyType === 'excess stock') {
      if (!excessQty || !totalStock) {
        Alert.alert('Validation Error', 'Please specify excess quantity and total stock of batch.');
        return;
      }
      reported_qty = parseInt(totalStock) + parseInt(excessQty);
      finalDescription = `${description} (Excess: ${excessQty}, Total: ${totalStock})`;
    } else if (discrepancyType === 'wrong item') {
      if (!selectedWrongMed || !wrongItemStock) {
        Alert.alert('Validation Error', 'Please search/select actual medicine and observed stock.');
        return;
      }
      reported_qty = null;
      finalDescription = JSON.stringify({
        actual_item_id: selectedWrongMed.id,
        actual_item_name: selectedWrongMed.itemname,
        actual_item_stock: parseInt(wrongItemStock)
      });
    } else if (discrepancyType === 'damaged item') {
      if (!damagedQty || !totalStock) {
        Alert.alert('Validation Error', 'Please specify damaged quantity and total stock.');
        return;
      }
      reported_qty = parseInt(totalStock) - parseInt(damagedQty);
      finalDescription = `${description} (Damaged: ${damagedQty}, Total: ${totalStock})`;
    } else if (discrepancyType === 'expired') {
      if (!expiredQty || !totalStock) {
        Alert.alert('Validation Error', 'Please specify expired quantity and total stock.');
        return;
      }
      reported_qty = parseInt(totalStock) - parseInt(expiredQty);
      finalDescription = `${description} (Expired: ${expiredQty}, Total: ${totalStock})`;
    } else if (discrepancyType === 'mrp') {
      if (!reportedMrp) {
        Alert.alert('Validation Error', 'Please specify verified MRP.');
        return;
      }
      reported_qty = null;
      reported_mrp_val = parseFloat(reportedMrp);
      finalDescription = `${description} (New MRP: ${reportedMrp})`;
    } else { // other
      if (!description) {
        Alert.alert('Validation Error', 'Please provide details about the mismatch.');
        return;
      }
      reported_qty = null;
      finalDescription = description;
    }

    const newDisc = {
      id: Date.now().toString(),
      medicine_id: selectedMed.id,
      product_name: selectedMed.itemname,
      discrepancy_type: discrepancyType,
      reported_qty,
      reported_mrp: reported_mrp_val,
      description: finalDescription,
      display_text: `${discrepancyType.toUpperCase()}: ${
        discrepancyType === 'wrong item'
          ? `Replace with "${selectedWrongMed.itemname}" (Stock: ${wrongItemStock})`
          : discrepancyType === 'mrp'
          ? `MRP corrected to ${reportedMrp}`
          : `Stock adjusted (System updated to: ${reported_qty})`
      }`
    };

    setDiscrepancyList([...discrepancyList, newDisc]);

    // Clear item inputs
    setMissingQty('');
    setExcessQty('');
    setDamagedQty('');
    setExpiredQty('');
    setTotalStock('');
    setReportedMrp('');
    setDescription('');
    setWrongItemSearch('');
    setWrongItemStock('');
    setSelectedWrongMed(null);
    setWrongMedResults([]);
  };

  const handleRemoveDiscrepancy = (id: string) => {
    setDiscrepancyList(discrepancyList.filter(item => item.id !== id));
  };

  const handleSubmitDiscrepancy = async () => {
    if (discrepancyList.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one discrepancy request.');
      return;
    }

    setSubmittingDisc(true);
    try {
      // Loop through all items and post them to backend
      const posts = discrepancyList.map(disc => {
        return axios.post('https://napi.bharatmedicalhallplus.com/rack-checker/discrepancy', {
          assignment_id: selectedAssignment.id,
          reported_by: user.role === 'Sub Admin' ? `SA-${user.id}` : user.id.toString(),
          reported_by_name: user.full_name,
          medicine_id: disc.medicine_id,
          product_name: disc.product_name,
          discrepancy_type: disc.discrepancy_type,
          reported_qty: disc.reported_qty,
          reported_mrp: disc.reported_mrp,
          description: disc.description
        });
      });

      await Promise.all(posts);

      Alert.alert('Success', 'All correction requests submitted successfully to Admin.');
      setDiscModalVisible(false);
      setSelectedMedicineId('');
      setDiscrepancyList([]);
    } catch (error) {
      console.error('Error reporting discrepancies:', error);
      Alert.alert('Error', 'Failed to submit correction requests.');
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
        <View style={[
          styles.card, 
          { 
            flexDirection: isDesktop ? 'row' : 'column', 
            justifyContent: 'space-between', 
            alignItems: isDesktop ? 'center' : 'stretch',
            gap: 12
          }
        ]}>
          <View style={!isDesktop && { marginBottom: 4 }}>
            <Text style={{ fontSize: 13, color: '#64748b', fontWeight: 'bold' }}>CURRENT STATUS</Text>
            <Text style={{ fontSize: 18, color: selectedAssignment.status === 'Checked' ? '#10b981' : '#f59e0b', fontWeight: 'bold', marginTop: 4 }}>
              {selectedAssignment.status}
            </Text>
          </View>
          
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10, width: isDesktop ? 'auto' : '100%' }}>
            <TouchableOpacity 
              style={[styles.reportBtn, { backgroundColor: '#fef3c7', borderColor: '#b45309', width: isDesktop ? 'auto' : '100%', height: 45 }]}
              onPress={() => setDiscModalVisible(true)}
            >
              <AlertTriangle size={16} color="#b45309" style={{ marginRight: 6 }} />
              <Text style={{ color: '#b45309', fontWeight: 'bold', fontSize: 13 }}>Report Discrepancy</Text>
            </TouchableOpacity>

            {selectedAssignment.status !== 'Checked' ? (
              <TouchableOpacity 
                style={[styles.statusBtn, { backgroundColor: '#10b981', width: isDesktop ? 'auto' : '100%', height: 45 }]} 
                onPress={() => handleStatusChange('Checked')}
                disabled={updatingStatus}
              >
                <Text style={styles.statusBtnText}>Mark Checked</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.statusBtn, { backgroundColor: '#ef4444', width: isDesktop ? 'auto' : '100%', height: 45 }]} 
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
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
              <View style={{ minWidth: isDesktop ? '100%' : 610 }}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 90 }]}>Item Code</Text>
                  <Text style={[styles.th, { width: 220 }]}>Medicine Name</Text>
                  <Text style={[styles.th, { width: 110 }]}>Batch No</Text>
                  <Text style={[styles.th, { width: 110, textAlign: 'right' }]}>Stock Bal Qty</Text>
                  <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>MRP</Text>
                </View>
                {medicines.map((med) => (
                  <View key={med.id} style={styles.tableRow}>
                    <Text style={[styles.td, { width: 90, color: '#64748b' }]} numberOfLines={1} ellipsizeMode="tail">
                      {med.c_item_code || '-'}
                    </Text>
                    <Text style={[styles.td, { width: 220, fontWeight: '700' }]} numberOfLines={2} ellipsizeMode="tail">
                      {med.itemname}
                    </Text>
                    <Text style={[styles.td, { width: 110, color: '#64748b' }]} numberOfLines={1} ellipsizeMode="tail">
                      {med.batchno || '-'}
                    </Text>
                    <Text style={[styles.td, { width: 110, textAlign: 'right', fontWeight: 'bold' }]}>
                      {med.stockbalqty}
                    </Text>
                    <Text style={[styles.td, { width: 80, textAlign: 'right', fontWeight: 'bold' }]}>
                      {med.mrp || '-'}
                    </Text>
                  </View>
                ))}
                {medicines.length === 0 && (
                  <Text style={styles.emptyText}>No medicines assigned to this rack in system database.</Text>
                )}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Discrepancy Modal */}
        <Modal visible={discModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Submit Correction Request</Text>
                <TouchableOpacity onPress={() => {
                  setDiscModalVisible(false);
                  setDiscrepancyList([]);
                }}>
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

                {/* Added Discrepancies list */}
                {discrepancyList.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[styles.modalLabel, { color: Colors.light.primary }]}>Added Corrections ({discrepancyList.length})</Text>
                    {discrepancyList.map(item => (
                      <View key={item.id} style={styles.discListItem}>
                        <Text style={styles.discListText}>
                          {item.product_name} - {item.display_text}
                        </Text>
                        <TouchableOpacity style={styles.removeDiscBtn} onPress={() => handleRemoveDiscrepancy(item.id)}>
                          <X size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

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
                    <option value="expired">Expired</option>
                    <option value="mrp">MRP Mismatch</option>
                    <option value="other">Other</option>
                  </select>
                </View>

                {/* Dynamic fields based on type */}
                {discrepancyType === 'missing stock' && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Qty Missing</Text>
                      <TextInput 
                        style={styles.textInput}
                        placeholder="Enter missing qty"
                        keyboardType="numeric"
                        value={missingQty}
                        onChangeText={setMissingQty}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Total Stock of Batch</Text>
                      <TextInput 
                        style={styles.textInput}
                        placeholder="Expected stock"
                        keyboardType="numeric"
                        value={totalStock}
                        onChangeText={setTotalStock}
                      />
                    </View>
                  </View>
                )}

                {discrepancyType === 'excess stock' && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Qty Excess</Text>
                      <TextInput 
                        style={styles.textInput}
                        placeholder="Enter excess qty"
                        keyboardType="numeric"
                        value={excessQty}
                        onChangeText={setExcessQty}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Total Stock of Batch</Text>
                      <TextInput 
                        style={styles.textInput}
                        placeholder="Expected stock"
                        keyboardType="numeric"
                        value={totalStock}
                        onChangeText={setTotalStock}
                      />
                    </View>
                  </View>
                )}

                {discrepancyType === 'wrong item' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.modalLabel}>Search Wrong Medicine (Actual Item)</Text>
                    {selectedWrongMed ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 12 }}>
                        <Text style={{ fontSize: 13, color: '#1e293b', fontWeight: '700', flex: 1 }}>
                          {selectedWrongMed.itemname} (Batch: {selectedWrongMed.batchno || 'N/A'})
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedWrongMed(null)}>
                          <X size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ position: 'relative', zIndex: 99, marginBottom: 12 }}>
                        <TextInput 
                          style={styles.textInput}
                          placeholder="Type item name to search..."
                          value={wrongItemSearch}
                          onChangeText={handleSearchWrongMed}
                        />
                        {wrongDropdownOpen && wrongMedResults.length > 0 && (
                          <View style={{ position: 'absolute', top: 45, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, maxHeight: 150, overflowY: 'auto' as any, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 3 }}>
                            {wrongMedResults.map(m => (
                              <TouchableOpacity 
                                key={m.id} 
                                style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                                onPress={() => {
                                  setSelectedWrongMed(m);
                                  setWrongDropdownOpen(false);
                                }}
                              >
                                <Text style={{ fontSize: 13, color: '#334155' }}>{m.itemname} (Batch: {m.batchno || 'N/A'})</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                    <Text style={styles.modalLabel}>Actual observed stock of this medicine</Text>
                    <TextInput 
                      style={styles.textInput}
                      placeholder="Enter actual qty"
                      keyboardType="numeric"
                      value={wrongItemStock}
                      onChangeText={setWrongItemStock}
                    />
                  </View>
                )}

                {discrepancyType === 'damaged item' && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Qty Damaged</Text>
                      <TextInput 
                        style={styles.textInput}
                        placeholder="Enter damaged qty"
                        keyboardType="numeric"
                        value={damagedQty}
                        onChangeText={setDamagedQty}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Total Stock of Batch</Text>
                      <TextInput 
                        style={styles.textInput}
                        placeholder="Total stock"
                        keyboardType="numeric"
                        value={totalStock}
                        onChangeText={setTotalStock}
                      />
                    </View>
                  </View>
                )}

                {discrepancyType === 'expired' && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Qty Expired</Text>
                      <TextInput 
                        style={styles.textInput}
                        placeholder="Enter expired qty"
                        keyboardType="numeric"
                        value={expiredQty}
                        onChangeText={setExpiredQty}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Total Stock of Batch</Text>
                      <TextInput 
                        style={styles.textInput}
                        placeholder="Total stock"
                        keyboardType="numeric"
                        value={totalStock}
                        onChangeText={setTotalStock}
                      />
                    </View>
                  </View>
                )}

                {discrepancyType === 'mrp' && (
                  <View>
                    <Text style={styles.modalLabel}>Observed Actual MRP</Text>
                    <TextInput 
                      style={styles.textInput}
                      placeholder="Enter actual mrp"
                      keyboardType="numeric"
                      value={reportedMrp}
                      onChangeText={setReportedMrp}
                    />
                  </View>
                )}

                <Text style={styles.modalLabel}>Comments / Remarks</Text>
                <TextInput 
                  style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Provide any comments..."
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />

                <TouchableOpacity 
                  style={styles.addDiscBtn} 
                  onPress={handleAddDiscrepancy}
                >
                  <Text style={styles.addDiscBtnText}>+ Add to Correction List</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.submitDiscBtn, submittingDisc && { opacity: 0.7 }]} 
                  onPress={handleSubmitDiscrepancy}
                  disabled={submittingDisc}
                >
                  {submittingDisc ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitDiscBtnText}>
                      Submit Correction Request ({discrepancyList.length})
                    </Text>
                  )}
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
  submitDiscBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  
  addDiscBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12, marginBottom: 20 },
  addDiscBtnText: { color: '#334155', fontWeight: 'bold', fontSize: 13 },
  discListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 8 },
  discListText: { fontSize: 13, color: '#334155', fontWeight: '600', flex: 1 },
  removeDiscBtn: { marginLeft: 12, padding: 4 }
});
