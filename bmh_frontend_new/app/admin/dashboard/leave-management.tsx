import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, TextInput, Alert, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { API_URL } from '@/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, User, CalendarDays, CheckCircle2, XCircle, Clock, Save, Building } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';

const formatDateToDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateStr;
  }
};

export default function AdminLeaveManagement() {
  const { isMobile, isDesktop } = useResponsive();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'settings' | 'holidays'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Action Popup State
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const formatDateTimeToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch (e) {
      return dateStr;
    }
  };
  
  // Settings State
  const [deptSettings, setDeptSettings] = useState<any[]>([]);
  const [employeeSettings, setEmployeeSettings] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Forms State
  const [dDept, setDDept] = useState('');
  const [dLimit, setDLimit] = useState('2');
  
  // Holiday Form State
  const [hDept, setHDept] = useState('All');
  const [hDate, setHDate] = useState('');
  const [hDesc, setHDesc] = useState('');
  
  const [rEmployeeId, setREmployeeId] = useState('');
  const [rLeaves, setRLeaves] = useState('27');
  const [rExtraPen, setRExtraPen] = useState('0');
  const [rLateLim, setRLateLim] = useState('3');
  const [rLatePen, setRLatePen] = useState('0');
  const [rEarlyLim, setREarlyLim] = useState('3');
  const [rEarlyPen, setREarlyPen] = useState('0');

  useEffect(() => {
    fetchRequests();
    fetchSettings();
    fetchDropdownData();
    fetchHolidays();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [deptRes, empRes, adminRes] = await Promise.all([
        axios.get(`https://napi.bharatmedicalhallplus.com/department`),
        axios.get(`${API_URL}/employees`),
        axios.get(`${API_URL}/admin/department-admins`).catch(() => ({ data: { data: [] } }))
      ]);
      if (deptRes.data && deptRes.data.success) {
        const depts = deptRes.data.data;
        setDepartments(depts);
        if (depts.length > 0) {
          setDDept(depts[0].name);
        }
      }
      let allUser: any[] = [];
      if (empRes.data && empRes.data.success) {
        const emps = (empRes.data.data || []).map((e: any) => ({
          ...e,
          user_type: (e.role === 'Delivery Boy' || e.department === 'Delivery') ? 'delivery_boy' : 'employee'
        }));
        allUser = [...allUser, ...emps];
      }
      if (adminRes.data && adminRes.data.data) {
        const admins = (adminRes.data.data || []).map((a: any) => {
          let deptName = 'Dept';
          if (deptRes.data && deptRes.data.success) {
            const match = deptRes.data.data.find((d: any) => d.id === a.department_id);
            if (match) deptName = match.name;
          }
          return {
            ...a,
            department: deptName,
            role: 'Sub Admin',
            user_type: 'sub_admin'
          };
        });
        allUser = [...allUser, ...admins];
      }
      setEmployees(allUser);
    } catch (error) {
      console.error("Dropdown fetch error:", error);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/leave/requests`);
      if (res.ok) setRequests(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchHolidays = async () => {
    try {
      const res = await fetch(`${API_URL}/holidays`);
      if (res.ok) setHolidays(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/leave/settings`);
      if (res.ok) {
        const data = await res.json();
        setDeptSettings(data.departmentSettings || []);
        setEmployeeSettings(data.employeeSettings || []);
      }
    } catch (e) { console.error(e); }
  };

  const openActionPopup = (req: any, type: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setActionType(type);
    setRejectionReason('');
    setActionModalVisible(true);
  };

  const handleActionSubmit = async () => {
    if (!selectedRequest) return;
    
    if (actionType === 'reject' && !rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      if (Platform.OS === 'web') window.alert('Please provide a reason for rejection');
      return;
    }
    
    setLoading(true);
    setActionModalVisible(false);
    
    try {
      const adminStr = Platform.OS === 'web' 
        ? localStorage.getItem('superAdminUser')
        : await AsyncStorage.getItem('superAdminUser');
      const admin = adminStr ? JSON.parse(adminStr) : { id: 1, full_name: 'Super Admin' };

      const status = actionType === 'approve' ? 'approved' : 'rejected';

      const res = await fetch(`${API_URL}/leave/request/${selectedRequest.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          approved_by_id: admin.id || 1,
          approved_by_type: 'super_admin',
          approved_by_name: admin.full_name || admin.name || 'Super Admin',
          approved_by_dept: 'Management',
          rejection_reason: actionType === 'reject' ? rejectionReason : null
        })
      });
      if (res.ok) {
        Alert.alert('Success', `Leave request ${status}`);
        if (Platform.OS === 'web') window.alert(`Leave request processed successfully!`);
        fetchRequests();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.message || 'Failed to update status');
        if (Platform.OS === 'web') window.alert(data.message || 'Failed to update status');
      }
    } catch (e) { 
      console.error(e); 
      Alert.alert('Error', 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const saveDeptSetting = async () => {
    try {
      const res = await fetch(`${API_URL}/leave/settings/department`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: dDept, max_employees_leave_per_day: parseInt(dLimit) })
      });
      if (res.ok) {
        Alert.alert('Success', 'Department setting saved');
        fetchSettings();
      }
    } catch (e) { console.error(e); }
  };

  const saveEmployeeSetting = async () => {
    try {
      if (!rEmployeeId) {
        Alert.alert('Error', 'Please select an employee');
        return;
      }
      const [uType, empIdStr] = rEmployeeId.split('-');
      const userType = uType || 'employee';
      
      const res = await fetch(`${API_URL}/leave/settings/employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: parseInt(empIdStr),
          user_type: userType,
          leaves_per_month: parseInt(rLeaves), extra_leave_penalty: parseFloat(rExtraPen),
          late_checkin_limit: parseInt(rLateLim), late_checkin_penalty: parseInt(rLatePen),
          early_checkout_limit: parseInt(rEarlyLim), early_checkout_penalty: parseInt(rEarlyPen)
        })
      });
      if (res.ok) {
        Alert.alert('Success', 'Employee setting saved');
        if (Platform.OS === 'web') window.alert('Employee policy saved!');
        fetchSettings();
      } else {
        Alert.alert('Error', 'Failed to save policy');
        if (Platform.OS === 'web') window.alert('Failed to save policy');
      }
    } catch (e) { 
      console.error(e); 
      Alert.alert('Error', 'An error occurred while saving.');
      if (Platform.OS === 'web') window.alert('An error occurred while saving.');
    }
  };

  const saveHoliday = async () => {
    try {
      if (!hDate || !hDesc) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }
      const res = await fetch(`${API_URL}/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: hDept, date: hDate, description: hDesc })
      });
      if (res.ok) {
        Alert.alert('Success', 'Holiday saved');
        fetchHolidays();
        setHDate('');
        setHDesc('');
      } else {
        const data = await res.json();
        Alert.alert('Error', data.message || 'Failed to save holiday');
      }
    } catch (e) { console.error(e); }
  };

  const deleteHoliday = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/holidays/${id}`, { method: 'DELETE' });
      if (res.ok) {
        Alert.alert('Success', 'Holiday deleted');
        fetchHolidays();
      }
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.light.primary} />
    </View>
  );

  return (
    <ScrollView style={[styles.container, !isDesktop && { padding: 16 }]}>
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Settings size={28} color={Colors.light.primary} />
        </View>
        <View>
          <Text style={styles.title}>Global Leave Settings</Text>
          <Text style={styles.subtitle}>Configure rules and manage requests across all departments</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={{flexGrow: 1}}>
        <Pressable style={[styles.tab, activeTab === 'requests' && styles.activeTab]} onPress={() => setActiveTab('requests')}>
          <User size={18} color={activeTab === 'requests' ? Colors.light.primary : Colors.light.icon} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Leave Requests</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'settings' && styles.activeTab]} onPress={() => setActiveTab('settings')}>
          <Settings size={18} color={activeTab === 'settings' ? Colors.light.primary : Colors.light.icon} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>Rule Configuration</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'holidays' && styles.activeTab]} onPress={() => setActiveTab('holidays')}>
          <CalendarDays size={18} color={activeTab === 'holidays' ? Colors.light.primary : Colors.light.icon} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'holidays' && styles.activeTabText]}>Holidays</Text>
        </Pressable>
      </ScrollView>

      {/* Approve / Reject Confirmation Modal */}
      <Modal visible={actionModalVisible} transparent animationType="fade" onRequestClose={() => setActionModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Confirm Leave {actionType === 'approve' ? 'Approval' : 'Rejection'}
            </Text>
            
            <View style={{ marginVertical: 16, gap: 10 }}>
              <Text style={{ fontSize: 15, color: '#334155', fontWeight: '500' }}>
                Employee: <Text style={{ fontWeight: '700' }}>{selectedRequest?.full_name}</Text>
              </Text>
              <Text style={{ fontSize: 15, color: '#334155', fontWeight: '500' }}>
                Dept / Role: <Text style={{ fontWeight: '700' }}>{selectedRequest?.department} • {selectedRequest?.role}</Text>
              </Text>
              <Text style={{ fontSize: 15, color: '#334155', fontWeight: '500' }}>
                Leave Type: <Text style={{ fontWeight: '700' }}>
                  {selectedRequest?.request_type === 'late_checkin' ? 'Late Check-in' : selectedRequest?.request_type === 'early_checkout' ? 'Early Checkout' : (selectedRequest?.is_half_day ? 'Half Day' : 'Full Day')}
                </Text>
              </Text>
              <Text style={{ fontSize: 15, color: '#334155', fontWeight: '500' }}>
                Dates: <Text style={{ fontWeight: '700' }}>
                  {selectedRequest && formatDateToDDMMYYYY(selectedRequest.start_date)} {selectedRequest && selectedRequest.end_date !== selectedRequest.start_date && `to ${formatDateToDDMMYYYY(selectedRequest.end_date)}`}
                </Text>
              </Text>
              <Text style={{ fontSize: 15, color: '#334155', fontWeight: '500' }}>
                Reason: <Text style={{ fontWeight: '600', fontStyle: 'italic' }}>"{typeof selectedRequest?.reason === 'object' ? (selectedRequest?.reason?.text || JSON.stringify(selectedRequest?.reason)) : selectedRequest?.reason}"</Text>
              </Text>
              
              {actionType === 'reject' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.light.text }}>Rejection Reason (visible to employee)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Provide reason for rejection..."
                    value={rejectionReason}
                    onChangeText={setRejectionReason}
                    multiline
                  />
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <Pressable 
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f1f5f9' }} 
                onPress={() => setActionModalVisible(false)}
              >
                <Text style={{ color: '#475569', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: actionType === 'approve' ? '#10B981' : '#EF4444' }} 
                onPress={handleActionSubmit}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                  Confirm {actionType === 'approve' ? 'Approve' : 'Reject'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {activeTab === 'requests' && (() => {
        const filteredRequests = requests.filter(req => {
          if (selectedEmployeeId) {
            const [uType, empIdStr] = selectedEmployeeId.split('-');
            const empId = parseInt(empIdStr);
            if (req.employee_id !== empId || req.user_type !== uType) {
              return false;
            }
          }

          if (filterDepartment && filterDepartment !== 'All') {
            if (req.department !== filterDepartment) {
              return false;
            }
          }

          const reqStart = req.start_date ? req.start_date.split('T')[0] : '';
          const reqEnd = req.end_date ? req.end_date.split('T')[0] : reqStart;

          if (filterFromDate && reqEnd < filterFromDate) {
            return false;
          }
          if (filterToDate && reqStart > filterToDate) {
            return false;
          }

          return true;
        });

        const pendingCount = requests.filter(r => r.status === 'pending').length;
        const filteredEmployeesForDropdown = employees.filter(emp => {
          const term = employeeSearchQuery.toLowerCase();
          const nameMatch = emp.full_name ? emp.full_name.toLowerCase().includes(term) : false;
          const emailMatch = emp.email ? emp.email.toLowerCase().includes(term) : false;
          const phoneMatch = emp.mobile ? emp.mobile.includes(term) : (emp.phone ? emp.phone.includes(term) : false);
          return nameMatch || emailMatch || phoneMatch;
        });

        return (
          <View>
            {/* Filters on Top */}
            <View style={{ backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderColor: Colors.light.border, borderWidth: 1, marginBottom: 20, gap: 16 }}>
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                
                {/* Searchable Dropdown */}
                <View style={{ flex: 1.5, minWidth: 250, gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.light.text }}>Filter by Employee / Sub Admin</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      style={[styles.filterInput, { flex: 1 }]}
                      placeholder="Search name, email, phone..."
                      value={employeeSearchQuery}
                      onChangeText={setEmployeeSearchQuery}
                    />
                    {Platform.OS === 'web' ? (
                      <select
                        value={selectedEmployeeId}
                        onChange={(e: any) => setSelectedEmployeeId(e.target.value)}
                        style={styles.webSelectStyle}
                      >
                        <option value="">All Employees / Sub Admins</option>
                        {filteredEmployeesForDropdown.map(emp => (
                          <option key={`${emp.user_type}-${emp.id}`} value={`${emp.user_type}-${emp.id}`}>
                            {emp.full_name} ({emp.department} - {emp.role || 'Sub Admin'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10, flex: 1, height: 42, justifyContent: 'center' }}>
                        <Picker
                          selectedValue={selectedEmployeeId}
                          onValueChange={(val: any) => setSelectedEmployeeId(val)}
                          style={{ width: '100%', height: '100%' }}
                        >
                          <Picker.Item label="All" value="" />
                          {filteredEmployeesForDropdown.map(emp => (
                            <Picker.Item key={`${emp.user_type}-${emp.id}`} label={`${emp.full_name} (${emp.role})`} value={`${emp.user_type}-${emp.id}`} />
                          ))}
                        </Picker>
                      </View>
                    )}
                  </View>
                </View>

                {/* Department Filter */}
                <View style={{ flex: 1, minWidth: 150, gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.light.text }}>Department</Text>
                  {Platform.OS === 'web' ? (
                    <select
                      value={filterDepartment}
                      onChange={(e: any) => setFilterDepartment(e.target.value)}
                      style={{ ...styles.webSelectStyle, width: '100%', height: 42 } as any}
                    >
                      <option value="">All Departments</option>
                      {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  ) : (
                    <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10, height: 42, justifyContent: 'center' }}>
                      <Picker
                        selectedValue={filterDepartment}
                        onValueChange={(val: any) => setFilterDepartment(val)}
                        style={{ width: '100%', height: '100%' }}
                      >
                        <Picker.Item label="All Departments" value="" />
                        {departments.map(d => <Picker.Item key={d.id} label={d.name} value={d.name} />)}
                      </Picker>
                    </View>
                  )}
                </View>

                {/* From Date to To Date */}
                <View style={{ flex: 1.5, minWidth: 250, gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.light.text }}>Date Range</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      {Platform.OS === 'web' ? (
                        <input
                          type="date"
                          value={filterFromDate}
                          onChange={(e: any) => setFilterFromDate(e.target.value)}
                          style={{ ...styles.filterInput, height: 42, paddingHorizontal: 8, boxSizing: 'border-box', width: '100%' } as any}
                        />
                      ) : (
                        <>
                          <Pressable onPress={() => setShowFromPicker(true)}>
                            <View pointerEvents="none">
                              <TextInput style={[styles.filterInput, { height: 42 }]} value={filterFromDate} placeholder="From Date" editable={false} />
                            </View>
                          </Pressable>
                          {showFromPicker && (
                            <DateTimePicker
                              value={filterFromDate ? new Date(filterFromDate) : new Date()}
                              mode="date"
                              display="default"
                              onChange={(event: any, selectedDate?: Date) => {
                                setShowFromPicker(false);
                                if (selectedDate) setFilterFromDate(selectedDate.toISOString().split('T')[0]);
                              }}
                            />
                          )}
                        </>
                      )}
                    </View>
                    <Text style={{ color: Colors.light.icon }}>to</Text>
                    <View style={{ flex: 1 }}>
                      {Platform.OS === 'web' ? (
                        <input
                          type="date"
                          value={filterToDate}
                          onChange={(e: any) => setFilterToDate(e.target.value)}
                          style={{ ...styles.filterInput, height: 42, paddingHorizontal: 8, boxSizing: 'border-box', width: '100%' } as any}
                        />
                      ) : (
                        <>
                          <Pressable onPress={() => setShowToPicker(true)}>
                            <View pointerEvents="none">
                              <TextInput style={[styles.filterInput, { height: 42 }]} value={filterToDate} placeholder="To Date" editable={false} />
                            </View>
                          </Pressable>
                          {showToPicker && (
                            <DateTimePicker
                              value={filterToDate ? new Date(filterToDate) : new Date()}
                              mode="date"
                              display="default"
                              onChange={(event: any, selectedDate?: Date) => {
                                setShowToPicker(false);
                                if (selectedDate) setFilterToDate(selectedDate.toISOString().split('T')[0]);
                              }}
                            />
                          )}
                        </>
                      )}
                    </View>
                  </View>
                </View>

              </View>
            </View>

            {/* Total Pending Count Badge */}
            <View style={styles.pendingBadgeContainer}>
              <Clock size={18} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={styles.pendingBadgeText}>Total Pending Requests: {pendingCount}</Text>
            </View>

            {/* Table layout with horizontal scrolling */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={[styles.table, { minWidth: 1300 }]}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>S.No.</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2.0 }]}>Name</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.8 }]}>Applied Date & Time</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>From Date to Date</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'center' }]}>Taken / Permitted</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Leave Type</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>Overlap Applied</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>Overlap Approved</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>Status</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2.2, textAlign: 'center' }]}>Action</Text>
                </View>
                {filteredRequests.map((req, idx) => (
                  <View key={req.id} style={styles.tableRow}>
                    <Text style={[styles.tableRowCell, { flex: 0.5 }]}>{idx + 1}</Text>
                    <View style={{ flex: 2.0 }}>
                      <Text style={styles.cellTextBold}>{req.full_name}</Text>
                      <Text style={styles.cellTextSmall}>{req.role} • {req.department}</Text>
                    </View>
                    <Text style={[styles.tableRowCell, { flex: 1.8 }]}>{formatDateTimeToDDMMYYYY(req.created_at)}</Text>
                    <View style={{ flex: 2.2 }}>
                      <Text style={styles.cellTextBold}>
                        {formatDateToDDMMYYYY(req.start_date)} {req.is_half_day ? `(Half Day)` : (req.request_type && req.request_type !== 'leave' ? '' : `to ${formatDateToDDMMYYYY(req.end_date)}`)}
                      </Text>
                      {req.reason ? <Text style={[styles.cellTextSmall, { fontStyle: 'italic' }]}>"{typeof req.reason === 'object' ? (req.reason?.text || JSON.stringify(req.reason)) : req.reason}"</Text> : null}
                    </View>
                    <Text style={[styles.tableRowCell, { flex: 1.5, textAlign: 'center', fontWeight: '600' }]}>
                      {req.taken_leaves} / {req.permitted_leaves}
                    </Text>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.cellText}>
                        {req.request_type === 'late_checkin' ? 'Late Check-in' : req.request_type === 'early_checkout' ? 'Early Checkout' : (req.is_half_day ? 'Half Day' : 'Full Day')}
                      </Text>
                      {req.is_half_day && <Text style={styles.cellTextSmall}>{req.half_day_session === 'first_half' ? 'First Half' : 'Second Half'}</Text>}
                    </View>
                    <Text style={[styles.tableRowCell, { flex: 1.2, textAlign: 'center' }]}>{req.applied_overlap_count ?? 0}</Text>
                    <Text style={[styles.tableRowCell, { flex: 1.2, textAlign: 'center' }]}>{req.approved_overlap_count ?? 0}</Text>
                    <View style={{ flex: 1.2, alignItems: 'center' }}>
                      <View style={[styles.statusCellBadge, req.status === 'approved' ? styles.statusApproved : req.status === 'rejected' ? styles.statusRejected : styles.statusPending]}>
                        <Text style={styles.statusCellText}>{req.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 2.2, justifyContent: 'center' }}>
                      {req.status === 'pending' ? (
                        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                          <Pressable style={[styles.tableActionBtn, { backgroundColor: '#10B981', flex: 1 }]} onPress={() => openActionPopup(req, 'approve')}>
                            <Text style={styles.tableActionBtnText}>Approve</Text>
                          </Pressable>
                          <Pressable style={[styles.tableActionBtn, { backgroundColor: '#EF4444', flex: 1 }]} onPress={() => openActionPopup(req, 'reject')}>
                            <Text style={styles.tableActionBtnText}>Reject</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 11, color: Colors.light.icon }}>
                            {req.status === 'approved' ? 'Approved' : 'Rejected'} by {req.approved_by_name || 'Admin'}
                          </Text>
                          {req.status === 'rejected' && req.rejection_reason && (
                            <Text style={{ fontSize: 11, color: '#EF4444', fontStyle: 'italic', marginTop: 2, textAlign: 'center' }} numberOfLines={1}>
                              "{req.rejection_reason}"
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
                {filteredRequests.length === 0 && (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <CalendarDays size={48} color={Colors.light.border} />
                    <Text style={{ color: Colors.light.icon, marginTop: 12, fontSize: 15, fontWeight: '500' }}>No leave requests match the filters.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        );
      })()}

      {activeTab === 'settings' && (
        <View style={[styles.layout, isDesktop && { flexDirection: 'row', gap: 24 }]}>
          {/* Department Concurrency Settings */}
          <View style={[styles.section, isDesktop && { flex: 1 }]}>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Building size={20} color={Colors.light.primary} style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Daily Concurrency Limit</Text>
              </View>
              <Text style={styles.helperText}>Maximum number of employees allowed to take leave on the same day in a department.</Text>
              
              <Text style={styles.label}>Department</Text>
              {Platform.OS === 'web' ? (
                <select 
                  value={dDept} 
                  onChange={(e: any) => setDDept(e.target.value)} 
                  style={{...styles.input, backgroundColor: Colors.light.background, color: Colors.light.text, border: `1px solid ${Colors.light.border}`}}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              ) : (
                <View style={[styles.input, { paddingHorizontal: 0, justifyContent: 'center' }]}>
                  <Picker selectedValue={dDept} onValueChange={setDDept} style={{ width: '100%', height: 50 }}>
                    <Picker.Item label="Select Department" value="" />
                    {departments.map(d => <Picker.Item key={d.id} label={d.name} value={d.name} />)}
                  </Picker>
                </View>
              )}
              
              <Text style={styles.label}>Max Concurrent Leaves</Text>
              <TextInput style={styles.input} value={dLimit} onChangeText={setDLimit} keyboardType="numeric" />
              
              <Pressable style={styles.saveBtn} onPress={saveDeptSetting}>
                <Save size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Rule</Text>
              </Pressable>

              <View style={styles.existingRules}>
                <Text style={styles.rulesHeading}>Active Department Rules</Text>
                {deptSettings.filter(ds => ds.department !== 'All').map((ds, i) => (
                  <View key={i} style={styles.ruleItem}>
                    <Text style={styles.ruleName}>{ds.department}</Text>
                    <Text style={styles.ruleVal}>{ds.max_employees_leave_per_day} leaves/day</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Role Deductions Settings */}
          <View style={[styles.section, isDesktop && { flex: 1.5 }]}>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Clock size={20} color={Colors.light.primary} style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Monthly Allowances & Penalties</Text>
              </View>
              
              <View style={[{ flexDirection: 'row', gap: 16 }, !isDesktop && { flexDirection: 'column' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Employee</Text>
                  {Platform.OS === 'web' ? (
                    <select 
                      value={rEmployeeId} 
                      onChange={(e: any) => { 
                        const [uType, eIdStr] = e.target.value.split('-');
                        setREmployeeId(e.target.value);
                        const existing = employeeSettings.find(es => es.employee_id == eIdStr && es.user_type === uType);
                        if (existing) {
                          setRLeaves(existing.leaves_per_month.toString());
                          setRExtraPen(existing.extra_leave_penalty.toString());
                          setRLateLim(existing.late_checkin_limit.toString());
                          setRLatePen(existing.late_checkin_penalty.toString());
                          setREarlyLim(existing.early_checkout_limit.toString());
                          setREarlyPen(existing.early_checkout_penalty.toString());
                        } else {
                          setRLeaves('27'); setRExtraPen('0'); setRLateLim('3'); setRLatePen('0'); setREarlyLim('3'); setREarlyPen('0');
                        }
                      }} 
                      style={{...styles.input, backgroundColor: Colors.light.background, color: Colors.light.text, border: `1px solid ${Colors.light.border}`}}
                    >
                      <option value="">Select an Option</option>
                      <option value="employee-0" style={{ fontWeight: 'bold', color: Colors.light.primary }}>[All Employees]</option>
                      <option value="sub_admin-0" style={{ fontWeight: 'bold', color: Colors.light.primary }}>[All Sub Admins]</option>
                      <option value="delivery_boy-0" style={{ fontWeight: 'bold', color: Colors.light.primary }}>[All Delivery Boys]</option>
                      {employees.map(emp => <option key={`${emp.user_type}-${emp.id}`} value={`${emp.user_type}-${emp.id}`}>{emp.full_name} ({emp.department} - {emp.role || 'Sub Admin'})</option>)}
                    </select>
                  ) : (
                    <View style={[styles.input, { paddingHorizontal: 0, justifyContent: 'center' }]}>
                      <Picker 
                        selectedValue={rEmployeeId} 
                        onValueChange={(val) => {
                          const [uType, eIdStr] = val.split('-');
                          setREmployeeId(val);
                          const existing = employeeSettings.find(es => es.employee_id == eIdStr && es.user_type === uType);
                          if (existing) {
                            setRLeaves(existing.leaves_per_month.toString());
                            setRExtraPen(existing.extra_leave_penalty.toString());
                            setRLateLim(existing.late_checkin_limit.toString());
                            setRLatePen(existing.late_checkin_penalty.toString());
                            setREarlyLim(existing.early_checkout_limit.toString());
                            setREarlyPen(existing.early_checkout_penalty.toString());
                          } else {
                            setRLeaves('27'); setRExtraPen('0'); setRLateLim('3'); setRLatePen('0'); setREarlyLim('3'); setREarlyPen('0');
                          }
                        }}
                        style={{ width: '100%', height: 50 }}
                      >
                        <Picker.Item label="Select an Option" value="" />
                        <Picker.Item label="[All Employees]" value="employee-0" color={Colors.light.primary} />
                        <Picker.Item label="[All Sub Admins]" value="sub_admin-0" color={Colors.light.primary} />
                        <Picker.Item label="[All Delivery Boys]" value="delivery_boy-0" color={Colors.light.primary} />
                        {employees.map(emp => <Picker.Item key={`${emp.user_type}-${emp.id}`} label={`${emp.full_name} (${emp.department})`} value={`${emp.user_type}-${emp.id}`} />)}
                      </Picker>
                    </View>
                  )}
                </View>
              </View>

              <View style={[{ flexDirection: 'row', gap: 16, marginTop: 16 }, !isDesktop && { flexDirection: 'column' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Required Working Days / Month</Text>
                  <TextInput style={styles.input} value={rLeaves} onChangeText={setRLeaves} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Extra Leave Penalty (₹)</Text>
                  <TextInput style={styles.input} value={rExtraPen} onChangeText={setRExtraPen} keyboardType="numeric" />
                </View>
              </View>

              <View style={[{ flexDirection: 'row', gap: 16, marginTop: 16 }, !isDesktop && { flexDirection: 'column' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Late Limits / Month</Text>
                  <TextInput style={styles.input} value={rLateLim} onChangeText={setRLateLim} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Late Penalty (₹)</Text>
                  <TextInput style={styles.input} value={rLatePen} onChangeText={setRLatePen} keyboardType="numeric" />
                </View>
              </View>

              <View style={[{ flexDirection: 'row', gap: 16, marginTop: 16 }, !isDesktop && { flexDirection: 'column' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Early Check-out Limits</Text>
                  <TextInput style={styles.input} value={rEarlyLim} onChangeText={setREarlyLim} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Early Penalty (₹)</Text>
                  <TextInput style={styles.input} value={rEarlyPen} onChangeText={setREarlyPen} keyboardType="numeric" />
                </View>
              </View>
              
              <Pressable style={styles.saveBtn} onPress={saveEmployeeSetting}>
                <Save size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Policy</Text>
              </Pressable>

              <View style={styles.existingRules}>
                <Text style={styles.rulesHeading}>Active Employee Policies</Text>
                {employeeSettings.map((es, i) => (
                  <View key={i} style={styles.ruleItem}>
                    <View>
                      <Text style={styles.ruleName}>{es.employee_name} ({es.department} - {es.role})</Text>
                      <Text style={[styles.ruleVal, { fontSize: 13, marginTop: 4 }]}>
                        {es.leaves_per_month} req. working days | ₹{es.extra_leave_penalty} extra | {es.late_checkin_limit} late/₹{es.late_checkin_penalty} | {es.early_checkout_limit} early/₹{es.early_checkout_penalty}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      {activeTab === 'holidays' && (
        <View style={[styles.layout, isDesktop && { flexDirection: 'row' }]}>
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add Holiday</Text>
              <Text style={styles.helperText}>Declare holidays. Use "All" to apply to all departments.</Text>
              
              <Text style={styles.label}>Department</Text>
              <View style={styles.pickerContainer}>
                {Platform.OS === 'web' ? (
                  <select style={styles.webSelect} value={hDept} onChange={(e) => setHDept(e.target.value)}>
                    <option value="All">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                ) : (
                  <View style={[styles.input, { paddingHorizontal: 0, justifyContent: 'center' }]}>
                    <Picker selectedValue={hDept} onValueChange={setHDept} style={{ width: '100%', height: 50 }}>
                      <Picker.Item label="All Departments" value="All" />
                      {departments.map(d => <Picker.Item key={d.id} label={d.name} value={d.name} />)}
                    </Picker>
                  </View>
                )}
              </View>

              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              {Platform.OS === 'web' ? (
                <input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} style={{...(styles.input as any), width: '100%', boxSizing: 'border-box'}} />
              ) : (
                <>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <View pointerEvents="none">
                      <TextInput style={styles.input} value={hDate} placeholder="e.g. 2026-12-25" editable={false} />
                    </View>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker 
                      value={hDate ? new Date(hDate) : new Date()} 
                      mode="date" 
                      display="default" 
                      onChange={(event: any, selectedDate: any) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          setHDate(selectedDate.toISOString().split('T')[0]);
                        }
                      }} 
                    />
                  )}
                </>
              )}

              <Text style={styles.label}>Description</Text>
              <TextInput style={styles.input} value={hDesc} onChangeText={setHDesc} placeholder="e.g. Christmas Day" />

              <Pressable style={styles.saveBtn} onPress={saveHoliday}>
                <Save size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Holiday</Text>
              </Pressable>
            </View>
          </View>
          
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Declared Holidays</Text>
              <Text style={styles.helperText}>List of all upcoming holidays</Text>
              
              <View style={styles.existingRules}>
                {holidays.map((h, i) => (
                  <View key={i} style={styles.ruleItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ruleName}>{new Date(h.date).toLocaleDateString()} - {h.description}</Text>
                      <Text style={[styles.ruleVal, { fontSize: 13, marginTop: 4 }]}>Department: {h.department}</Text>
                    </View>
                    <Pressable onPress={() => deleteHoliday(h.id)} style={{ padding: 8 }}>
                      <XCircle size={20} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
                {holidays.length === 0 && (
                  <Text style={styles.emptyStateText}>No holidays declared.</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: Colors.light.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.light.icon, marginTop: 4 },
  tabs: { flexDirection: 'row', marginBottom: 32, borderBottomWidth: 2, borderBottomColor: Colors.light.border },
  tab: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent', marginBottom: -2 },
  activeTab: { borderBottomColor: Colors.light.primary },
  tabText: { fontSize: 16, color: Colors.light.icon, fontWeight: '600' },
  activeTabText: { color: Colors.light.primary, fontWeight: '700' },
  layout: { gap: 24 },
  section: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { backgroundColor: Colors.light.card, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: Colors.light.text },
  helperText: { fontSize: 14, color: Colors.light.icon, marginBottom: 20, lineHeight: 20 },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  reqName: { fontSize: 18, fontWeight: '800', color: Colors.light.text },
  reqRole: { fontSize: 14, color: Colors.light.primary, fontWeight: '600', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  statusApproved: { backgroundColor: '#D1FAE5' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 12, fontWeight: '800' },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 },
  reqDates: { fontSize: 14, color: Colors.light.text, fontWeight: '600' },
  reqReason: { fontSize: 15, color: Colors.light.icon, fontStyle: 'italic', marginBottom: 20 },
  actionRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: Colors.light.border, paddingTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  actionBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10, padding: 14, backgroundColor: Colors.light.background, fontSize: 15, marginBottom: 16 },
  pickerContainer: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10, backgroundColor: Colors.light.background, marginBottom: 16, overflow: 'hidden' },
  webSelect: { width: '100%', padding: 14, fontSize: 15, backgroundColor: 'transparent', border: 'none' } as any,
  saveBtn: { flexDirection: 'row', backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 48, backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, borderStyle: 'dashed' },
  emptyStateText: { color: Colors.light.icon, marginTop: 12, fontSize: 15, fontWeight: '500' },
  existingRules: { marginTop: 32, borderTopWidth: 1, borderTopColor: Colors.light.border, paddingTop: 20 },
  rulesHeading: { fontSize: 15, fontWeight: '700', color: Colors.light.text, marginBottom: 12 },
  ruleItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  ruleName: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  ruleVal: { fontSize: 14, color: Colors.light.icon, fontWeight: '500' },
  table: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border, overflow: 'hidden', marginTop: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  tableHeaderCell: { color: Colors.light.text, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border, alignItems: 'center', backgroundColor: '#FFF' },
  tableRowCell: { color: Colors.light.text, fontSize: 14 },
  cellText: { color: Colors.light.text, fontSize: 14 },
  cellTextBold: { color: Colors.light.text, fontSize: 14, fontWeight: '700' },
  cellTextSmall: { color: Colors.light.icon, fontSize: 12, marginTop: 2 },
  statusCellBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, alignItems: 'center', justifyContent: 'center', width: 90 },
  statusCellText: { fontSize: 11, fontWeight: '800' },
  tableActionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  tableActionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  filterInput: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, backgroundColor: '#FFF', color: Colors.light.text },
  webSelectStyle: { padding: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.light.border, fontSize: 14, height: 42, backgroundColor: '#FFF', color: Colors.light.text, minWidth: 200 } as any,
  pendingBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9E6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#FFE499', alignSelf: 'flex-start', marginBottom: 16 },
  pendingBadgeText: { color: '#B25E00', fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '90%', maxWidth: 500, backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.light.text, marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: '#FFF', color: Colors.light.text, height: 80, textAlignVertical: 'top', marginTop: 8 }
});
