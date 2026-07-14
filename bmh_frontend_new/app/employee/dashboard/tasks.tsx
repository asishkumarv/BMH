import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CheckSquare, Plus, Clock, User } from 'lucide-react-native';

export default function EmployeeTasksScreen() {
  const { isDesktop } = useResponsive();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [directRejectTask, setDirectRejectTask] = useState<any>(null);
  const [directRejectText, setDirectRejectText] = useState('');
  const [showDirectRejectModal, setShowDirectRejectModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [reassignDropdownOpen, setReassignDropdownOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'assigned_to_me' | 'assigned_by_me'>('assigned_to_me');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeType, setAssigneeType] = useState('employee');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Moderate');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');

  // Status update state
  const [statusNotes, setStatusNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const [globalUsers, setGlobalUsers] = useState<any[]>([]);

  const [empUser, setEmpUser] = useState<any>({ id: 1, full_name: 'Employee', department: '' });

  useEffect(() => {
    const loadInit = async () => {
      let userStr = null;
      if (Platform.OS === 'web') {
        userStr = localStorage.getItem('employeeUser');
      } else {
        userStr = await AsyncStorage.getItem('employeeUser');
      }
      let userObj = { id: 1, full_name: 'Employee', department: '' };
      if (userStr) {
        userObj = JSON.parse(userStr);
        setEmpUser(userObj);
      }
      await fetchInitData(userObj);
    };
    loadInit();
  }, []);

  const fetchInitData = async (user = empUser) => {
    try {
      const [taskRes, usersRes] = await Promise.all([
        axios.get(`https://napi.bharatmedicalhallplus.com/tasks?user_type=employee&user_id=${user.id}`),
        axios.get('https://napi.bharatmedicalhallplus.com/employees/all-users')
      ]);

      if (taskRes.data.success) setTasks(taskRes.data.data);
      if (usersRes.data.success) {
        setGlobalUsers(usersRes.data.data);
      }
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!title) return Alert.alert('Error', 'Title is required.');
    
    let finalAssigneeId = assigneeId;
    let finalAssigneeType = assigneeType;
    let finalDept = empUser.department;
    
    if (assigneeType === 'self') {
      finalAssigneeId = String(empUser.id);
      finalAssigneeType = 'employee';
    } else {
      if (!assigneeId) return Alert.alert('Error', 'Assignee is required.');
      const selectedUser = globalUsers.find(u => String(u.id) === String(assigneeId));
      if (selectedUser) {
        finalAssigneeType = selectedUser.type; // 'employee' or 'department_admin'
        finalDept = selectedUser.department;
      }
    }

    try {
      await axios.post('https://napi.bharatmedicalhallplus.com/tasks', {
        title,
        description,
        assigner_type: 'employee',
        assigner_id: empUser.id,
        assignee_type: finalAssigneeType,
        assignee_id: finalAssigneeId.startsWith('SA-') ? parseInt(finalAssigneeId.replace('SA-', '')) : parseInt(finalAssigneeId),
        department: finalDept,
        due_date: dueDate ? new Date(dueDate.replace(' ', 'T')).toISOString() : null,
        priority
      });
      setShowCreateModal(false);
      fetchInitData();
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('Moderate');
      Alert.alert('Success', 'Task assigned successfully');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to assign task');
    }
  };

  const formatTaskDate = (dateVal: any) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      const pad = (n: number) => n.toString().padStart(2, '0');
      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = pad(d.getMinutes());
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${day}-${month}-${year}, ${hours}:${minutes} ${ampm}`;
    } catch (e) {
      return dateVal;
    }
  };

  const getDurationString = (startVal: any, endVal: any) => {
    if (!startVal || !endVal) return null;
    try {
      const start = new Date(startVal);
      const end = new Date(endVal);
      const diffMs = end.getTime() - start.getTime();
      if (diffMs <= 0) return '0m';
      
      const diffMins = Math.floor(diffMs / 60000);
      const days = Math.floor(diffMins / 1440);
      const hours = Math.floor((diffMins % 1440) / 60);
      const mins = diffMins % 60;
      
      let parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
      
      return parts.join(' ');
    } catch (e) {
      return null;
    }
  };

  const handleDirectAccept = async (task: any) => {
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/tasks/${task.id}/status`, {
        status: 'accepted',
        rejection_reason: '',
        notes: task.notes || '',
        updater_type: 'employee',
        updater_id: empUser.id
      });
      fetchInitData();
      Alert.alert('Success', 'Task accepted successfully');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to accept task');
    }
  };

  const handleDirectRejectSubmit = async () => {
    if (!directRejectTask) return;
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/tasks/${directRejectTask.id}/status`, {
        status: 'rejected',
        rejection_reason: directRejectText || '',
        notes: directRejectTask.notes || '',
        updater_type: 'employee',
        updater_id: empUser.id
      });
      setShowDirectRejectModal(false);
      setDirectRejectTask(null);
      fetchInitData();
      Alert.alert('Success', 'Task rejected successfully');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to reject task');
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/tasks/${selectedTask.id}/status`, {
        status: newStatus,
        rejection_reason: rejectionReason,
        notes: statusNotes,
        updater_type: 'employee',
        updater_id: empUser.id
      });
      setShowStatusModal(false);
      fetchInitData();
      Alert.alert('Success', `Task marked as ${newStatus}`);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  const handleReassign = async () => {
    if (!assigneeId) return Alert.alert('Error', 'Please select a new assignee.');
    const selectedUser = globalUsers.find((u: any) => String(u.id) === String(assigneeId));
    const newType = selectedUser?.type || 'employee';
    const newDept = selectedUser?.department || empUser.department;
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/tasks/${selectedTask.id}/reassign`, {
        assignee_type: newType,
        assignee_id: parseInt(assigneeId),
        department: newDept
      });
      setShowReassignModal(false);
      setAssigneeId('');
      fetchInitData();
      Alert.alert('Success', 'Task reassigned successfully');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to reassign task');
    }
  };

  const filteredTasks = activeTab === 'assigned_to_me' 
    ? tasks.filter(t => t.assignee_type === 'employee' && t.assignee_id === empUser.id)
    : tasks.filter(t => t.assigner_type === 'employee' && t.assigner_id === empUser.id);

  const myWorkload = tasks.filter(t => t.assignee_type === 'employee' && t.assignee_id === empUser.id);
  const stats = {
    total: myWorkload.length,
    completed: myWorkload.filter(t => t.status === 'completed').length,
    high: myWorkload.filter(t => t.priority === 'High').length,
    moderate: myWorkload.filter(t => t.priority === 'Moderate' || !t.priority).length,
    low: myWorkload.filter(t => t.priority === 'Low').length,
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
        <View>
          <Text style={styles.title}>My Tasks</Text>
          <Text style={styles.subtitle}>Manage your workload and assign tasks to co-workers</Text>
        </View>
        <Pressable style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
          <Plus color="#FFF" size={20} />
          <Text style={styles.createBtnText}>Assign Task</Text>
        </Pressable>
      </View>

      <View style={[styles.tabsContainer, !isDesktop && styles.tabsContainerMobile]}>
        <Pressable style={[styles.tab, activeTab === 'assigned_to_me' && styles.activeTab]} onPress={() => setActiveTab('assigned_to_me')}>
          <Text style={[styles.tabText, activeTab === 'assigned_to_me' && styles.activeTabText]}>Assigned to Me</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'assigned_by_me' && styles.activeTab]} onPress={() => setActiveTab('assigned_by_me')}>
          <Text style={[styles.tabText, activeTab === 'assigned_by_me' && styles.activeTabText]}>Assigned by Me</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: isDesktop ? 32 : 16 }}>
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}>
              <Text style={styles.statLabel}>Total Tasks</Text>
              <Text style={styles.statValue}>{stats.total}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
              <Text style={styles.statLabel}>Completed</Text>
              <Text style={styles.statValue}>{stats.completed}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#EF4444' }]}>
              <Text style={styles.statLabel}>High</Text>
              <Text style={styles.statValue}>{stats.high}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
              <Text style={styles.statLabel}>Moderate</Text>
              <Text style={styles.statValue}>{stats.moderate}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#0EA5E9' }]}>
              <Text style={styles.statLabel}>Low</Text>
              <Text style={styles.statValue}>{stats.low}</Text>
            </View>
          </View>

          {filteredTasks.length === 0 ? (
            <Text style={{ textAlign: 'center', color: Colors.light.icon, marginTop: 40 }}>No tasks found.</Text>
          ) : (
            filteredTasks.map(task => (
              <View key={task.id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>{task.status.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: task.priority === 'High' ? '#fee2e2' : task.priority === 'Moderate' ? '#fef3c7' : '#e0f2fe' }]}>
                      <Text style={[styles.statusText, { color: task.priority === 'High' ? '#ef4444' : task.priority === 'Moderate' ? '#f59e0b' : '#0ea5e9' }]}>{task.priority || 'Moderate'}</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.taskDesc}>{task.description}</Text>
                
                <View style={styles.taskMeta}>
                  <View style={styles.metaItem}>
                    <User color={Colors.light.icon} size={16} />
                    <Text style={styles.metaText}>Assigner: {task.assigner_name || 'Unknown'} ({task.assigner_type.replace('_', ' ')} #{task.assigner_id})</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <User color={Colors.light.icon} size={16} />
                    <Text style={styles.metaText}>Assignee: {task.assignee_name || 'Unknown'} ({task.assignee_type.replace('_', ' ')} #{task.assignee_id}) - {task.department || 'N/A'}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock color={Colors.light.icon} size={16} />
                    <Text style={styles.metaText}>Created: {formatTaskDate(task.created_at)}</Text>
                  </View>
                  {task.due_date && (
                    <View style={styles.metaItem}>
                      <Clock color={Colors.light.icon} size={16} />
                      <Text style={styles.metaText}>Due: {formatTaskDate(task.due_date)}</Text>
                    </View>
                  )}
                </View>

                {task.status === 'rejected' && (
                  <View style={styles.rejectionBox}>
                    <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
                    <Text style={styles.rejectionText}>{task.rejection_reason}</Text>
                  </View>
                )}

                {task.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesTitle}>Latest Notes:</Text>
                    <Text style={styles.notesText}>{task.notes}</Text>
                  </View>
                ) : null}

                {task.status === 'completed' && (
                  <View style={{ backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#10b981' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#15803d', marginBottom: 4 }}>Completion Metrics:</Text>
                    {getDurationString(task.created_at, task.completed_at) && (
                      <Text style={{ fontSize: 13, color: '#166534' }}>
                        🕒 Assigned to Completed: <Text style={{ fontWeight: '600' }}>{getDurationString(task.created_at, task.completed_at)}</Text>
                      </Text>
                    )}
                    {getDurationString(task.accepted_at, task.completed_at) && (
                      <Text style={{ fontSize: 13, color: '#166534', marginTop: 2 }}>
                        🤝 Accepted to Completed: <Text style={{ fontWeight: '600' }}>{getDurationString(task.accepted_at, task.completed_at)}</Text>
                      </Text>
                    )}
                  </View>
                )}

                <View style={[styles.taskActions, { gap: 8, flexDirection: 'row', flexWrap: 'wrap' }]}>
                    {(task.status === 'assigned' || task.status === 'pending') && task.assignee_type === 'employee' && String(task.assignee_id) === String(empUser.id) && (
                      <>
                        <Pressable 
                          style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                          onPress={() => handleDirectAccept(task)}
                        >
                          <Text style={[styles.actionBtnText, { color: '#fff' }]}>Accept</Text>
                        </Pressable>
                        <Pressable 
                          style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                          onPress={() => {
                            setDirectRejectTask(task);
                            setDirectRejectText('');
                            setShowDirectRejectModal(true);
                          }}
                        >
                          <Text style={[styles.actionBtnText, { color: '#fff' }]}>Reject</Text>
                        </Pressable>
                      </>
                    )}
                    <Pressable 
                      style={styles.actionBtn}
                      onPress={() => {
                        setSelectedTask(task);
                        setStatusNotes(task.notes || '');
                        setRejectionReason(task.rejection_reason || '');
                        setShowStatusModal(true);
                      }}
                    >
                      <Text style={styles.actionBtnText}>Update Status</Text>
                    </Pressable>
                   {task.status === 'rejected' &&
                    task.assigner_type === 'employee' &&
                    String(task.assigner_id) === String(empUser.id) && (
                     <Pressable
                       style={[styles.actionBtn, { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fb923c' }]}
                       onPress={() => { setSelectedTask(task); setAssigneeId(''); setShowReassignModal(true); }}
                     >
                       <Text style={[styles.actionBtnText, { color: '#ea580c' }]}>Reassign</Text>
                     </Pressable>
                   )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Create Task Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 500 }]}>
            <Text style={styles.modalTitle}>Assign New Task</Text>
            
            <ScrollView style={{ maxHeight: isDesktop ? 600 : 500 }} showsVerticalScrollIndicator={false}>
              <View style={{ paddingBottom: 8 }}>
                <Text style={styles.label}>Title</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Task Title" />
                
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, { height: 50 }]} multiline value={description} onChangeText={setDescription} placeholder="Task Details..." />

                <Text style={styles.label}>Assignee Type</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                  {['employee', 'self'].map(type => (
                    <Pressable key={type} style={[styles.radioBtn, assigneeType === type && styles.radioActive]} onPress={() => { setAssigneeType(type); setAssigneeId(''); }}>
                      <Text style={{ color: assigneeType === type ? '#FFF' : Colors.light.text }}>{type.replace('_', ' ')}</Text>
                    </Pressable>
                  ))}
                </View>

                {assigneeType !== 'self' && (
                  <>
                    <Text style={styles.label}>Select Assignee</Text>
                    <View style={{ position: 'relative', zIndex: 9999, marginBottom: 16 }}>
                      <Pressable 
                        style={{ 
                          borderWidth: 1, 
                          borderColor: Colors.light.border, 
                          borderRadius: 8, 
                          backgroundColor: Colors.light.background,
                          padding: 12,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onPress={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                      >
                        <Text style={{ fontSize: 15, color: assigneeId ? Colors.light.text : Colors.light.icon }}>
                          {assigneeId 
                            ? (globalUsers.find(u => String(u.id) === String(assigneeId))
                                ? `${globalUsers.find(u => String(u.id) === String(assigneeId)).full_name} - ${globalUsers.find(u => String(u.id) === String(assigneeId)).department} (${globalUsers.find(u => String(u.id) === String(assigneeId)).role})`
                                : '-- Choose Assignee --')
                            : '-- Choose Assignee --'}
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
                            placeholder="Search employee..."
                            value={assigneeSearchQuery}
                            onChangeText={setAssigneeSearchQuery}
                            autoFocus
                          />
                          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true}>
                            <Pressable 
                              style={{ padding: 10, borderRadius: 6 }}
                              onPress={() => {
                                setAssigneeId('');
                                setAssigneeDropdownOpen(false);
                                setAssigneeSearchQuery('');
                              }}
                            >
                              <Text style={{ fontSize: 14, color: Colors.light.text }}>-- Choose Assignee --</Text>
                            </Pressable>
                            {globalUsers.filter(u => 
                              u.full_name?.toLowerCase().includes(assigneeSearchQuery.toLowerCase()) ||
                              u.department?.toLowerCase().includes(assigneeSearchQuery.toLowerCase()) ||
                              u.role?.toLowerCase().includes(assigneeSearchQuery.toLowerCase())
                            ).map(u => (
                              <Pressable 
                                key={u.id}
                                style={{ 
                                  padding: 10, 
                                  borderRadius: 6, 
                                  backgroundColor: String(assigneeId) === String(u.id) ? '#f1f5f9' : 'transparent',
                                  marginTop: 2
                                }}
                                onPress={() => {
                                  setAssigneeId(String(u.id));
                                  setAssigneeDropdownOpen(false);
                                  setAssigneeSearchQuery('');
                                }}
                              >
                                <Text style={{ fontSize: 14, color: Colors.light.text }}>
                                  {u.full_name} - {u.department} ({u.role})
                                </Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </>
                )}

                <Text style={styles.label}>Priority</Text>
                <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, marginBottom: 8 }}>
                  {Platform.OS === 'web' ? (
                    <select 
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Moderate">Moderate</option>
                      <option value="High">High</option>
                    </select>
                  ) : (
                    <Picker
                      selectedValue={priority}
                      onValueChange={(val: any) => setPriority(val)}
                      style={{ width: '100%', height: 50 }}
                    >
                      <Picker.Item label="Low" value="Low" />
                      <Picker.Item label="Moderate" value="Moderate" />
                      <Picker.Item label="High" value="High" />
                    </Picker>
                  )}
                </View>

                <Text style={styles.label}>Due Date & Time</Text>
                <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, backgroundColor: Colors.light.background }}>
                  {Platform.OS === 'web' ? (
                    <input 
                      type="datetime-local"
                      style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: Colors.light.text, fontFamily: 'inherit', fontSize: '15px', boxSizing: 'border-box' }}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  ) : (
                    <>
                      <Pressable onPress={() => { setDatePickerMode('date'); setShowDatePicker(true); }}>
                        <View pointerEvents="none">
                          <TextInput style={{ padding: 14, fontSize: 15, color: Colors.light.text }} value={dueDate} editable={false} placeholder="YYYY-MM-DD HH:MM" placeholderTextColor={Colors.light.icon} />
                        </View>
                      </Pressable>
                      {showDatePicker && (
                        <DateTimePicker
                          value={dueDate ? new Date(dueDate) : new Date()}
                          mode={datePickerMode}
                          display="default"
                          onChange={(event: any, date?: Date) => {
                            if (Platform.OS === 'android') {
                              setShowDatePicker(false);
                            }
                            if (date) {
                              const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                              const isoString = offsetDate.toISOString();
                              if (datePickerMode === 'date') {
                                setDueDate(isoString.split('T')[0] + (dueDate ? ' ' + dueDate.split(' ')[1] : ' 00:00'));
                                if (Platform.OS === 'android') {
                                  setDatePickerMode('time');
                                  setShowDatePicker(true);
                                }
                              } else {
                                setDueDate((dueDate ? dueDate.split(' ')[0] : isoString.split('T')[0]) + ' ' + isoString.split('T')[1].substring(0, 5));
                              }
                            }
                          }}
                        />
                      )}
                    </>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleCreateTask}>
                <Text style={styles.saveBtnText}>Assign Task</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <Modal visible={showStatusModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 500 }]}>
            <Text style={styles.modalTitle}>Update Task Status</Text>
            
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, { height: 80 }]} multiline value={statusNotes} onChangeText={setStatusNotes} placeholder="Add progress notes..." />



            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>

              {selectedTask?.assignee_type === 'employee' && String(selectedTask?.assignee_id) === String(empUser.id) && (selectedTask?.status === 'pending' || selectedTask?.status === 'assigned' || selectedTask?.status === 'accepted' || selectedTask?.status === 'in_progress') ? (
                <>
                  <Pressable style={[styles.saveBtn, { backgroundColor: '#3B82F6' }]} onPress={() => handleUpdateStatus('in_progress')}>
                    <Text style={styles.saveBtnText}>Mark In Progress</Text>
                  </Pressable>
                  <Pressable style={[styles.saveBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => handleUpdateStatus('completed')}>
                    <Text style={styles.saveBtnText}>Complete</Text>
                  </Pressable>
                  <Pressable style={[styles.saveBtn, { backgroundColor: '#64748B' }]} onPress={() => handleUpdateStatus('terminated')}>
                    <Text style={styles.saveBtnText}>Terminate</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable style={[styles.saveBtn, { backgroundColor: Colors.light.primary }]} onPress={() => handleUpdateStatus(selectedTask?.status)}>
                  <Text style={styles.saveBtnText}>Save Notes</Text>
                </Pressable>
              )}
            </View>

            <View style={[styles.modalActions, { marginTop: 24 }]}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowStatusModal(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reassign Task Modal */}
      <Modal visible={showReassignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 500 }]}>
            <Text style={styles.modalTitle}>Reassign Task</Text>
            {selectedTask && (
              <Text style={{ fontSize: 14, color: Colors.light.icon, marginBottom: 16 }}>
                Reassigning: "{selectedTask.title}"
              </Text>
            )}

            <Text style={styles.label}>Select New Assignee</Text>
            <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, marginBottom: 8 }}>
              {Platform.OS === 'web' ? (
                <select
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">-- Choose New Assignee --</option>
                  {globalUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name} - {u.department} ({u.role})</option>
                  ))}
                </select>
              ) : (
                <Picker
                  selectedValue={assigneeId}
                  onValueChange={(val: any) => setAssigneeId(val)}
                  style={{ width: '100%', height: 50 }}
                >
                  <Picker.Item label="-- Choose New Assignee --" value="" />
                  {globalUsers.map((u: any) => (
                    <Picker.Item key={u.id} label={`${u.full_name} - ${u.department} (${u.role})`} value={u.id} />
                  ))}
                </Picker>
              )}
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => { setShowReassignModal(false); setAssigneeId(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, { backgroundColor: '#ea580c' }]} onPress={handleReassign}>
                <Text style={styles.saveBtnText}>Reassign Task</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

          {/* Direct Rejection Reason Modal */}
      {directRejectTask && (
        <Modal visible={showDirectRejectModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isDesktop ? 450 : '90%', padding: 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Rejection Reason</Text>
                <Pressable onPress={() => { setShowDirectRejectModal(false); setDirectRejectTask(null); }}>
                  <Text style={{ fontSize: 20, color: '#64748b' }}>✕</Text>
                </Pressable>
              </View>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top', marginVertical: 15, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8 }]}
                placeholder="Enter rejection reason (optional)..."
                value={directRejectText}
                onChangeText={setDirectRejectText}
                multiline
                autoFocus
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <Pressable style={[styles.cancelBtn, { backgroundColor: '#ef4444' }]} onPress={() => { setShowDirectRejectModal(false); setDirectRejectTask(null); }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, { backgroundColor: '#1e293b' }]} onPress={handleDirectRejectSubmit}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
</View>
  );
}

const getStatusColor = (status: string) => {
  switch(status) {
    case 'assigned': return '#3B82F6';
    case 'accepted': return '#06B6D4';
    case 'in_progress': return '#F59E0B';
    case 'completed': return '#10B981';
    case 'rejected': return '#EF4444';
    case 'terminated': return '#64748B';
    default: return '#64748B';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { padding: 32, backgroundColor: Colors.light.card, borderBottomWidth: 1, borderBottomColor: Colors.light.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16, padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.light.text },
  subtitle: { fontSize: 14, color: Colors.light.icon, marginTop: 4 },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 32, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  tabsContainerMobile: { paddingHorizontal: 16 },
  tab: { paddingVertical: 12, paddingHorizontal: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: Colors.light.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: Colors.light.icon },
  activeTabText: { color: Colors.light.primary },
  taskCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.border },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  taskTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text, flex: 1, marginRight: 16 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  taskDesc: { fontSize: 15, color: Colors.light.icon, marginBottom: 20, lineHeight: 22 },
  taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, color: Colors.light.icon, fontWeight: '500' },
  rejectionBox: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#FCA5A5' },
  rejectionTitle: { fontSize: 13, fontWeight: '700', color: '#B91C1C', marginBottom: 4 },
  rejectionText: { fontSize: 14, color: '#991B1B' },
  notesBox: { backgroundColor: Colors.light.secondary, padding: 16, borderRadius: 8, marginBottom: 16 },
  notesTitle: { fontSize: 13, fontWeight: '700', color: Colors.light.primary, marginBottom: 4 },
  notesText: { fontSize: 14, color: Colors.light.text },
  taskActions: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.light.border },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: Colors.light.secondary, borderRadius: 8 },
  actionBtnText: { color: Colors.light.primary, fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: Colors.light.card, borderRadius: 24, padding: 16, width: '100%', maxHeight: '95%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.light.text, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.light.text, marginBottom: 2, marginTop: 6 },
  input: { backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, padding: 8, fontSize: 14, color: Colors.light.text },
  radioBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.border },
  radioActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 32 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: Colors.light.background },
  cancelBtnText: { color: Colors.light.icon, fontWeight: '600', fontSize: 15 },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: Colors.light.primary },
  saveBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
      default: {
        elevation: 1,
      }
    })
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
});
