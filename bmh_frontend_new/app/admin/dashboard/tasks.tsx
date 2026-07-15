import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import axios from 'axios';
import { CheckSquare, Plus, Clock, User, CheckCircle, XCircle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

export default function AdminTasksScreen() {
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
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'super_admins' | 'department_admins' | 'employees' | 'recurring'>('all');
  const [recurringTasks, setRecurringTasks] = useState<any[]>([]);
  
  // Filtering states
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [customDateStr, setCustomDateStr] = useState('');
  const [selectedStatFilter, setSelectedStatFilter] = useState<string>('all');
  const [showFilterDatePicker, setShowFilterDatePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('daily');
  const [specificDays, setSpecificDays] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeType, setAssigneeType] = useState('employee');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [department, setDepartment] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Status update state
  const [statusNotes, setStatusNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const [users, setUsers] = useState<{emps: any[], admins: any[], superAdmins: any[], depts: any[]}>({ emps: [], admins: [], superAdmins: [], depts: [] });
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);
  const [priority, setPriority] = useState('Moderate');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const adminUser = typeof window !== 'undefined' && localStorage.getItem('superAdminUser') 
    ? JSON.parse(localStorage.getItem('superAdminUser') || '{}') 
    : { id: 1, full_name: 'Super Admin' };

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      const [res, recRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/tasks?user_type=super_admin'),
        axios.get('https://napi.bharatmedicalhallplus.com/tasks/recurring?user_type=super_admin')
      ]);
      if (res.data.success) {
        setTasks(res.data.data);
      }
      if (recRes.data.success) {
        setRecurringTasks(recRes.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const [empRes, adminRes, superAdminRes, deptRes, globalRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/employees'),
        axios.get('https://napi.bharatmedicalhallplus.com/admin/department-admins'),
        axios.get('https://napi.bharatmedicalhallplus.com/admin/super-admins'),
        axios.get('https://napi.bharatmedicalhallplus.com/department'),
        axios.get('https://napi.bharatmedicalhallplus.com/employees/all-users'),
        axios.get('https://napi.bharatmedicalhallplus.com/tasks/recurring?user_type=super_admin')
      ]);
      setUsers({
        emps: empRes.data.success ? empRes.data.data : [],
        admins: adminRes.data.success ? adminRes.data.data : [],
        superAdmins: superAdminRes.data.success ? superAdminRes.data.data : [],
        depts: deptRes.data.success ? deptRes.data.data : []
      });
      if (globalRes.data.success) {
        setGlobalUsers(globalRes.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async () => {
    if (!title) return Alert.alert('Error', 'Title is required.');
    
    let finalAssigneeType = assigneeType;
    let finalAssigneeId = assigneeId;
    let finalDept = department;

    if (assigneeType === 'self') {
      finalAssigneeType = 'super_admin';
      finalAssigneeId = String(adminUser.id);
      finalDept = 'Admin';
    } else {
      if (!assigneeId) return Alert.alert('Error', 'Assignee is required.');
      if (assigneeType === 'employee') {
        const emp = users.emps.find(e => String(e.id) === assigneeId);
        if (emp) finalDept = emp.department;
      } else if (assigneeType === 'department_admin') {
        const rawId = assigneeId.replace('SA-', '');
        finalAssigneeId = rawId;
        const admin = users.admins.find(a => String(a.id) === rawId);
        if (admin) {
           const d = users.depts.find(d => d.id === admin.department_id);
           if (d) finalDept = d.name;
        }
      } else if (assigneeType === 'super_admin') {
        finalDept = 'Admin';
      }
    }

    try {
      if (isRecurring) {
        let parsedDays = null;
        if (frequency === 'weekly' || frequency === 'monthly') {
          if (!specificDays) return Alert.alert('Error', 'Please specify days or dates.');
          parsedDays = specificDays.split(',').map(s => s.trim()).filter(s => s);
        }
        await axios.post('https://napi.bharatmedicalhallplus.com/tasks/recurring', {
          title, description, assigner_type: 'super_admin', assigner_id: adminUser.id || 1,
          assignee_type: finalAssigneeType, assignee_id: parseInt(finalAssigneeId), department: finalDept,
          priority, frequency, specific_days: parsedDays
        });
        fetchTasks();
      } else {
        await axios.post('https://napi.bharatmedicalhallplus.com/tasks', {
        title,
        description,
        assigner_type: 'super_admin',
        assigner_id: adminUser.id || 1,
        assignee_type: finalAssigneeType,
        assignee_id: parseInt(finalAssigneeId),
        department: finalDept,
        due_date: dueDate ? new Date(dueDate.replace(' ', 'T')).toISOString() : null,
        priority
      });
      }
      setShowCreateModal(false);
      fetchTasks();
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('Moderate');
      setIsRecurring(false);
      setFrequency('daily');
      setSpecificDays('');
      Alert.alert('Success', 'Task created successfully');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to create task');
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
        updater_type: 'super_admin',
        updater_id: adminUser.id || 1
      });
      fetchTasks();
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
        updater_type: 'super_admin',
        updater_id: adminUser.id || 1
      });
      setShowDirectRejectModal(false);
      setDirectRejectTask(null);
      fetchTasks();
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
        updater_type: 'super_admin',
        updater_id: adminUser.id || 1
      });
      setShowStatusModal(false);
      fetchTasks();
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
    const newDept = selectedUser?.department || '';
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/tasks/${selectedTask.id}/reassign`, {
        assignee_type: newType,
        assignee_id: parseInt(assigneeId),
        department: newDept
      });
      setShowReassignModal(false);
      setAssigneeId('');
      fetchTasks();
      Alert.alert('Success', 'Task reassigned successfully');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to reassign task');
    }
  };

  const renderRecurringTaskCard = (task: any) => (
    <View key={task.id} style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{task.title} (Recurring)</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[styles.statusBadge, { backgroundColor: task.status === 'active' ? '#dcfce7' : '#f3f4f6' }]}>
            <Text style={[styles.statusText, { color: task.status === 'active' ? '#16a34a' : '#6b7280' }]}>{task.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.taskDesc}>{task.description}</Text>
      
      <View style={styles.taskMeta}>
        <View style={styles.metaItem}>
          <User color={Colors.light.icon} size={16} />
          <Text style={styles.metaText}>Assignee: {task.assignee_name || 'Unknown'} - {task.department || 'N/A'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Clock color={Colors.light.icon} size={16} />
          <Text style={styles.metaText}>Schedule: {task.frequency.toUpperCase()} {task.specific_days ? '(' + (Array.isArray(task.specific_days) ? task.specific_days : JSON.parse(task.specific_days)).join(', ') + ')' : ''}</Text>
        </View>
      </View>
      
      <View style={styles.taskActions}>
          <Pressable 
            style={[styles.actionBtn, { backgroundColor: task.status === 'active' ? '#f59e0b' : '#10b981' }]}
            onPress={async () => {
              try {
                const newStatus = task.status === 'active' ? 'paused' : 'active';
                await axios.put(`https://napi.bharatmedicalhallplus.com/tasks/recurring/${task.id}/status`, { status: newStatus });
                fetchTasks();
                Alert.alert('Success', `Schedule ${newStatus}`);
              } catch(e) {
                Alert.alert('Error', 'Failed to update schedule');
              }
            }}
          >
            <Text style={styles.actionBtnText}>{task.status === 'active' ? 'Pause Schedule' : 'Resume Schedule'}</Text>
          </Pressable>
          <Pressable 
            style={[styles.actionBtn, { backgroundColor: '#ef4444', marginLeft: 8 }]}
            onPress={async () => {
              Alert.alert('Delete Schedule', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => {
                  try {
                    await axios.delete(`https://napi.bharatmedicalhallplus.com/tasks/recurring/${task.id}`);
                    fetchTasks();
                  } catch(e) {
                    Alert.alert('Error', 'Failed to delete schedule');
                  }
                }}
              ])
            }}
          >
            <Text style={styles.actionBtnText}>Delete</Text>
          </Pressable>
      </View>
    </View>
  );

  const renderTaskCard = (task: any) => (
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

      <View style={[styles.taskActions, { gap: 8, flexDirection: 'row', flexWrap: 'wrap' }]}>
                    {(task.status === 'assigned' || task.status === 'pending') && task.assignee_type === 'super_admin' && String(task.assignee_id) === String(adminUser.id) && (
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
           task.assigner_type === 'super_admin' &&
           String(task.assigner_id) === String(adminUser.id || 1) && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fb923c' }]}
              onPress={() => { setSelectedTask(task); setAssigneeId(''); setShowReassignModal(true); }}
            >
              <Text style={[styles.actionBtnText, { color: '#ea580c' }]}>Reassign</Text>
            </Pressable>
          )}
      </View>
    </View>
  );

  const getTasksForTab = () => {
    switch(activeTab) {
      case 'my': return tasks.filter(t => t.assignee_type === 'super_admin' && String(t.assignee_id) === String(adminUser.id));
      case 'super_admins': return tasks.filter(t => t.assignee_type === 'super_admin' && String(t.assignee_id) !== String(adminUser.id));
      case 'department_admins': return tasks.filter(t => t.assignee_type === 'department_admin');
      case 'employees': return tasks.filter(t => t.assignee_type === 'employee');
      default: return tasks;
    }
  };

  const matchesEmployee = (t: any) => {
    if (!selectedEmployeeId) return true;
    return String(t.assignee_id) === String(selectedEmployeeId);
  };

  const matchesDate = (t: any) => {
    if (!selectedDateFilter || selectedDateFilter === 'all') return true;
    if (!t.due_date) return false;
    
    try {
      const taskDate = new Date(t.due_date);
      const today = new Date();
      
      const tYear = taskDate.getFullYear();
      const tMonth = taskDate.getMonth();
      const tDay = taskDate.getDate();
      
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth();
      const todayDay = today.getDate();
      
      if (selectedDateFilter === 'today') {
        return tYear === todayYear && tMonth === todayMonth && tDay === todayDay;
      }
      
      if (selectedDateFilter === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tYear === tomorrow.getFullYear() && tMonth === tomorrow.getMonth() && tDay === tomorrow.getDate();
      }
      
      if (selectedDateFilter === 'this_week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0,0,0,0);
        
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() - today.getDay() + 6);
        endOfWeek.setHours(23,59,59,999);
        
        return taskDate >= startOfWeek && taskDate <= endOfWeek;
      }
      
      if (selectedDateFilter === 'overdue') {
        const now = new Date();
        return taskDate < now && !['completed', 'terminated'].includes(t.status);
      }
      
      if (selectedDateFilter === 'custom' && customDateStr) {
        const parts = customDateStr.split('-');
        if (parts.length === 3) {
          const cy = parseInt(parts[0], 10);
          const cm = parseInt(parts[1], 10) - 1;
          const cd = parseInt(parts[2], 10);
          return tYear === cy && tMonth === cm && tDay === cd;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return true;
  };

  const matchesStat = (t: any) => {
    if (!selectedStatFilter || selectedStatFilter === 'all') return true;
    if (selectedStatFilter === 'completed') return t.status === 'completed';
    if (selectedStatFilter === 'pending') return ['pending', 'assigned', 'accepted', 'in_progress'].includes(t.status);
    if (selectedStatFilter === 'High') return t.priority === 'High';
    if (selectedStatFilter === 'Moderate') return t.priority === 'Moderate' || !t.priority;
    if (selectedStatFilter === 'Low') return t.priority === 'Low';
    return true;
  };

  const handleStatCardPress = (filterType: string) => {
    if (selectedStatFilter === filterType) {
      setSelectedStatFilter('all');
    } else {
      setSelectedStatFilter(filterType);
    }
  };

  const getFilteredTasks = () => {
    const tabTasks = getTasksForTab();
    return tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && matchesStat(t));
  };

  const tabTasks = getTasksForTab();

  const getStatCounts = () => {
    const totalFiltered = tabTasks.filter(t => matchesEmployee(t) && matchesDate(t)).length;
    const totalOverall = tabTasks.length;
    
    const completedFiltered = tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && t.status === 'completed').length;
    const completedOverall = tabTasks.filter(t => t.status === 'completed').length;
    
    const pendingFiltered = tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && ['pending', 'assigned', 'accepted', 'in_progress'].includes(t.status)).length;
    const pendingOverall = tabTasks.filter(t => ['pending', 'assigned', 'accepted', 'in_progress'].includes(t.status)).length;
    
    const highFiltered = tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && t.priority === 'High').length;
    const highOverall = tabTasks.filter(t => t.priority === 'High').length;
    
    const moderateFiltered = tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && (t.priority === 'Moderate' || !t.priority)).length;
    const moderateOverall = tabTasks.filter(t => t.priority === 'Moderate' || !t.priority).length;
    
    const lowFiltered = tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && t.priority === 'Low').length;
    const lowOverall = tabTasks.filter(t => t.priority === 'Low').length;
    
    return {
      total: { filtered: totalFiltered, overall: totalOverall },
      completed: { filtered: completedFiltered, overall: completedOverall },
      pending: { filtered: pendingFiltered, overall: pendingOverall },
      high: { filtered: highFiltered, overall: highOverall },
      moderate: { filtered: moderateFiltered, overall: moderateOverall },
      low: { filtered: lowFiltered, overall: lowOverall }
    };
  };

  const stats = getStatCounts();

  return (
    <View style={styles.container}>
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
        <View>
          <Text style={styles.title}>Task Management</Text>
          <Text style={styles.subtitle}>Oversee all tasks across the organization</Text>
        </View>
        <Pressable style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
          <Plus color="#FFF" size={20} />
          <Text style={styles.createBtnText}>New Task</Text>
        </Pressable>
      </View>

      <View style={[styles.tabsContainer, !isDesktop && styles.tabsContainerMobile]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'all', label: 'All Tasks' },
            { id: 'my', label: 'My Tasks' },
            { id: 'super_admins', label: 'Super Admins' },
            { id: 'department_admins', label: 'Departments' },
            { id: 'employees', label: 'Employees' },
            { id: 'recurring', label: 'Recurring Schedules' }
          ].map(tab => (
            <Pressable key={tab.id} style={[styles.tab, activeTab === tab.id && styles.activeTab]} onPress={() => setActiveTab(tab.id as any)}>
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: isDesktop ? 32 : 16 }}>
          {/* Filters Section */}
          {activeTab !== 'recurring' && (
            <View style={[styles.filterSection, !isDesktop && styles.filterSectionMobile]}>
              {/* Employee Autocomplete Search */}
              <View style={[styles.filterItem, { zIndex: 100 }]}>
                <Text style={styles.filterLabel}>Assignee Name</Text>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search employee..."
                    value={employeeSearchQuery}
                    onChangeText={(txt) => {
                      setEmployeeSearchQuery(txt);
                      setShowEmployeeDropdown(true);
                      if (!txt) {
                        setSelectedEmployeeId(null);
                      }
                    }}
                    onFocus={() => setShowEmployeeDropdown(true)}
                  />
                  {employeeSearchQuery ? (
                    <Pressable
                      style={styles.clearBtn}
                      onPress={() => {
                        setSelectedEmployeeId(null);
                        setEmployeeSearchQuery('');
                        setShowEmployeeDropdown(false);
                      }}
                    >
                      <Text style={{ color: Colors.light.icon, fontSize: 16 }}>✕</Text>
                    </Pressable>
                  ) : null}
                </View>
                {showEmployeeDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                      <Pressable
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedEmployeeId(null);
                          setEmployeeSearchQuery('All Employees');
                          setShowEmployeeDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { fontWeight: '700' }]}>-- All Employees --</Text>
                      </Pressable>
                      {globalUsers
                        .filter(u => {
                          const q = employeeSearchQuery.toLowerCase();
                          return !employeeSearchQuery || 
                                 u.full_name?.toLowerCase().includes(q) || 
                                 u.department?.toLowerCase().includes(q) ||
                                 u.role?.toLowerCase().includes(q);
                        })
                        .map(u => (
                          <Pressable
                            key={u.id}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setSelectedEmployeeId(String(u.id));
                              setEmployeeSearchQuery(u.full_name);
                              setShowEmployeeDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{u.full_name}</Text>
                            <Text style={styles.dropdownItemSubText}>{u.department} - {u.role}</Text>
                          </Pressable>
                        ))
                      }
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Date Filter Dropdown */}
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Due Date Filter</Text>
                <View style={styles.dateSelectContainer}>
                  {Platform.OS === 'web' ? (
                    <select
                      style={styles.webSelect}
                      value={selectedDateFilter}
                      onChange={(e) => {
                        setSelectedDateFilter(e.target.value);
                        if (e.target.value !== 'custom') {
                          setCustomDateStr('');
                        }
                      }}
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today</option>
                      <option value="tomorrow">Tomorrow</option>
                      <option value="this_week">This Week</option>
                      <option value="overdue">Overdue Tasks</option>
                      <option value="custom">Custom Date...</option>
                    </select>
                  ) : (
                    <Picker
                      selectedValue={selectedDateFilter}
                      onValueChange={(val: string) => {
                        setSelectedDateFilter(val);
                        if (val !== 'custom') {
                          setCustomDateStr('');
                        }
                      }}
                      style={{ height: 44, color: Colors.light.text }}
                    >
                      <Picker.Item label="All Dates" value="all" />
                      <Picker.Item label="Today" value="today" />
                      <Picker.Item label="Tomorrow" value="tomorrow" />
                      <Picker.Item label="This Week" value="this_week" />
                      <Picker.Item label="Overdue Tasks" value="overdue" />
                      <Picker.Item label="Custom Date..." value="custom" />
                    </Picker>
                  )}
                </View>

                {selectedDateFilter === 'custom' && (
                  <View style={{ zIndex: 10 }}>
                    {Platform.OS === 'web' ? (
                      <input
                        type="date"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: `1px solid ${Colors.light.border}`,
                          backgroundColor: Colors.light.card,
                          color: Colors.light.text,
                          marginTop: 8,
                          boxSizing: 'border-box'
                        }}
                        value={customDateStr}
                        onChange={(e) => setCustomDateStr(e.target.value)}
                      />
                    ) : (
                      <>
                        <Pressable
                          style={styles.customDateBtn}
                          onPress={() => setShowFilterDatePicker(true)}
                        >
                          <Text style={{ color: customDateStr ? Colors.light.text : Colors.light.icon }}>
                            {customDateStr || 'Pick specific date'}
                          </Text>
                        </Pressable>
                        {showFilterDatePicker && (
                          <DateTimePicker
                            value={new Date()}
                            mode="date"
                            display="default"
                            onChange={(event: any, date?: Date) => {
                              setShowFilterDatePicker(false);
                              if (date && event.type !== 'dismissed') {
                                const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                setCustomDateStr(formatted);
                              }
                            }}
                          />
                        )}
                      </>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <Pressable 
              style={[
                styles.statCard, 
                { borderLeftColor: '#3B82F6' },
                selectedStatFilter === 'all' && { borderColor: '#3B82F6', borderWidth: 2, backgroundColor: '#eff6ff' }
              ]}
              onPress={() => handleStatCardPress('all')}
            >
              <Text style={styles.statLabel}>Total Tasks</Text>
              <Text style={styles.statValue}>{stats.total.filtered}</Text>
              <Text style={styles.statSubValue}>Total: {stats.total.overall}</Text>
            </Pressable>

            <Pressable 
              style={[
                styles.statCard, 
                { borderLeftColor: '#10B981' },
                selectedStatFilter === 'completed' && { borderColor: '#10B981', borderWidth: 2, backgroundColor: '#ecfdf5' }
              ]}
              onPress={() => handleStatCardPress('completed')}
            >
              <Text style={styles.statLabel}>Completed</Text>
              <Text style={styles.statValue}>{stats.completed.filtered}</Text>
              <Text style={styles.statSubValue}>Total: {stats.completed.overall}</Text>
            </Pressable>

            <Pressable 
              style={[
                styles.statCard, 
                { borderLeftColor: '#F97316' },
                selectedStatFilter === 'pending' && { borderColor: '#F97316', borderWidth: 2, backgroundColor: '#fff7ed' }
              ]}
              onPress={() => handleStatCardPress('pending')}
            >
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={styles.statValue}>{stats.pending.filtered}</Text>
              <Text style={styles.statSubValue}>Total: {stats.pending.overall}</Text>
            </Pressable>

            <Pressable 
              style={[
                styles.statCard, 
                { borderLeftColor: '#EF4444' },
                selectedStatFilter === 'High' && { borderColor: '#EF4444', borderWidth: 2, backgroundColor: '#fef2f2' }
              ]}
              onPress={() => handleStatCardPress('High')}
            >
              <Text style={styles.statLabel}>High Priority</Text>
              <Text style={styles.statValue}>{stats.high.filtered}</Text>
              <Text style={styles.statSubValue}>Total: {stats.high.overall}</Text>
            </Pressable>

            <Pressable 
              style={[
                styles.statCard, 
                { borderLeftColor: '#F59E0B' },
                selectedStatFilter === 'Moderate' && { borderColor: '#F59E0B', borderWidth: 2, backgroundColor: '#fffbeb' }
              ]}
              onPress={() => handleStatCardPress('Moderate')}
            >
              <Text style={styles.statLabel}>Moderate</Text>
              <Text style={styles.statValue}>{stats.moderate.filtered}</Text>
              <Text style={styles.statSubValue}>Total: {stats.moderate.overall}</Text>
            </Pressable>

            <Pressable 
              style={[
                styles.statCard, 
                { borderLeftColor: '#0EA5E9' },
                selectedStatFilter === 'Low' && { borderColor: '#0EA5E9', borderWidth: 2, backgroundColor: '#f0f9ff' }
              ]}
              onPress={() => handleStatCardPress('Low')}
            >
              <Text style={styles.statLabel}>Low Priority</Text>
              <Text style={styles.statValue}>{stats.low.filtered}</Text>
              <Text style={styles.statSubValue}>Total: {stats.low.overall}</Text>
            </Pressable>
          </View>

          {(activeTab === 'recurring' ? recurringTasks.length : getFilteredTasks().length) === 0 ? (
            <Text style={{ textAlign: 'center', color: Colors.light.icon, marginTop: 40 }}>No tasks found.</Text>
          ) : (
            activeTab === 'recurring' ? recurringTasks.map(renderRecurringTaskCard) : getFilteredTasks().map(renderTaskCard)
          )}
        </ScrollView>
      )}

      {/* Create Task Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 500 }]}>
            <Text style={styles.modalTitle}>Create New Task</Text>
            
            <ScrollView style={{ maxHeight: isDesktop ? 600 : 500 }} showsVerticalScrollIndicator={false}>
              <View style={{ paddingBottom: 8 }}>
                <Text style={styles.label}>Title</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Task Title" />
                
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, { height: 50 }]} multiline value={description} onChangeText={setDescription} placeholder="Task Details..." />

            <Text style={styles.label}>Assignee Type</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
              {['employee', 'department_admin', 'super_admin', 'self'].map(type => (
                <Pressable key={type} style={[styles.radioBtn, assigneeType === type && styles.radioActive]} onPress={() => { setAssigneeType(type); setAssigneeId(''); setSelectedDeptId(''); }}>
                  <Text style={{ color: assigneeType === type ? '#FFF' : Colors.light.text }}>{type.replace('_', ' ')}</Text>
                </Pressable>
              ))}
            </View>

            {(assigneeType === 'employee' || assigneeType === 'department_admin') && (
              <>
                <Text style={styles.label}>Select Department (Optional)</Text>
                <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, marginBottom: 8 }}>
                  {Platform.OS === 'web' ? (
                    <select 
                      style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                      value={selectedDeptId}
                      onChange={(e) => { setSelectedDeptId(e.target.value); setAssigneeId(''); }}
                    >
                      <option value="">-- All Departments --</option>
                      {users.depts.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  ) : (
                    <Picker
                      selectedValue={selectedDeptId}
                      onValueChange={(val: string) => { setSelectedDeptId(val); setAssigneeId(''); }}
                      style={{ height: 50, color: Colors.light.text }}
                    >
                      <Picker.Item label="-- All Departments --" value="" />
                      {users.depts.map(d => (
                        <Picker.Item key={d.id} label={d.name} value={String(d.id)} />
                      ))}
                    </Picker>
                  )}
                </View>
              </>
            )}

            {assigneeType !== 'self' && (
              <>
                <Text style={styles.label}>Select Assignee</Text>
                <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, marginBottom: 8 }}>
                  {Platform.OS === 'web' ? (
                    <select 
                      style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                    >
                      <option value="">-- Choose Assignee --</option>
                      {assigneeType === 'super_admin' && users.superAdmins.map(sa => (
                        <option key={sa.id} value={sa.id}>{sa.full_name} ({sa.email})</option>
                      ))}
                      {(assigneeType === 'employee' || assigneeType === 'department_admin') && globalUsers
                        .filter(u => u.type === assigneeType)
                        .filter(u => {
                          if (!selectedDeptId) return true;
                          const d = users.depts.find(dept => String(dept.id) === String(selectedDeptId));
                          return d && u.department === d.name;
                        })
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.full_name} - {u.department} ({u.role})</option>
                        ))}
                    </select>
                  ) : (
                    <Picker
                      selectedValue={assigneeId}
                      onValueChange={(val: string) => setAssigneeId(val)}
                      style={{ height: 50, color: Colors.light.text }}
                    >
                      <Picker.Item label="-- Choose Assignee --" value="" />
                      {assigneeType === 'super_admin' && users.superAdmins.map(sa => (
                        <Picker.Item key={sa.id} label={`${sa.full_name} (${sa.email})`} value={String(sa.id)} />
                      ))}
                      {(assigneeType === 'employee' || assigneeType === 'department_admin') && globalUsers
                        .filter(u => u.type === assigneeType)
                        .filter(u => {
                          if (!selectedDeptId) return true;
                          const d = users.depts.find(dept => String(dept.id) === String(selectedDeptId));
                          return d && u.department === d.name;
                        })
                        .map(u => (
                          <Picker.Item key={u.id} label={`${u.full_name} - ${u.department} (${u.role})`} value={String(u.id)} />
                        ))}
                    </Picker>
                  )}
                </View>
              </>
            )}

            
            <Text style={styles.label}>Schedule Type</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
              <Pressable style={[styles.radioBtn, !isRecurring && styles.radioActive]} onPress={() => setIsRecurring(false)}>
                <Text style={{ color: !isRecurring ? '#FFF' : Colors.light.text }}>One-time Task</Text>
              </Pressable>
              <Pressable style={[styles.radioBtn, isRecurring && styles.radioActive]} onPress={() => setIsRecurring(true)}>
                <Text style={{ color: isRecurring ? '#FFF' : Colors.light.text }}>Recurring Task</Text>
              </Pressable>
            </View>

            {isRecurring && (
              <View style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
                <Text style={styles.label}>Frequency</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {['daily', 'weekly', 'monthly'].map(f => (
                    <Pressable key={f} style={[styles.radioBtn, frequency === f && styles.radioActive, { flex: 1, paddingVertical: 8 }]} onPress={() => { setFrequency(f); setSpecificDays(''); }}>
                      <Text style={{ textAlign: 'center', color: frequency === f ? '#FFF' : Colors.light.text }}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                    </Pressable>
                  ))}
                </View>

                {frequency === 'weekly' && (
                  <>
                    <Text style={styles.label}>Specific Days (e.g. 1 for Mon, 7 for Sun)</Text>
                    <TextInput style={styles.input} value={specificDays} onChangeText={setSpecificDays} placeholder="1, 3, 5 (Mon, Wed, Fri)" />
                  </>
                )}
                {frequency === 'monthly' && (
                  <>
                    <Text style={styles.label}>Specific Dates (e.g. 1, 15, 30) or Ranges (1-5)</Text>
                    <TextInput style={styles.input} value={specificDays} onChangeText={setSpecificDays} placeholder="1, 15, 28" />
                  </>
                )}
              </View>
            )}

            <Text style={styles.label}>Priority</Text>
            <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, marginBottom: 8 }}>
              {Platform.OS === 'web' ? (
                <select 
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
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
                  onValueChange={(val: string) => setPriority(val)}
                  style={{ height: 50, color: Colors.light.text }}
                >
                  <Picker.Item label="Low" value="Low" />
                  <Picker.Item label="Moderate" value="Moderate" />
                  <Picker.Item label="High" value="High" />
                </Picker>
              )}
            </View>

            {!isRecurring && (
              <>
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
                  <Pressable onPress={() => { setTempDate(new Date()); setShowDatePicker(true); }} style={{ padding: 14 }}>
                    <Text style={{ fontSize: 15, color: dueDate ? Colors.light.text : Colors.light.icon }}>
                      {dueDate || 'Select Date and Time'}
                    </Text>
                  </Pressable>
                  {showDatePicker && (
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display="default"
                      onChange={(event: any, date?: Date) => {
                        setShowDatePicker(false);
                        if (date && event.type !== 'dismissed') {
                          setTempDate(date);
                          setShowTimePicker(true);
                        }
                      }}
                    />
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={tempDate}
                      mode="time"
                      display="default"
                      onChange={(event: any, date?: Date) => {
                        setShowTimePicker(false);
                        if (date && event.type !== 'dismissed') {
                          setTempDate(date);
                          const formattedStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                          setDueDate(formattedStr);
                        }
                      }}
                    />
                  )}
                </>
              )}
            </View>
              </>
            )}
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

              {selectedTask?.assignee_type === 'super_admin' && String(selectedTask?.assignee_id) === String(adminUser.id) && (selectedTask?.status === 'pending' || selectedTask?.status === 'assigned' || selectedTask?.status === 'accepted' || selectedTask?.status === 'in_progress') ? (
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
  statSubValue: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  filterSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    zIndex: 50,
  },
  filterSectionMobile: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
  },
  filterItem: {
    flex: 1,
    position: 'relative',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 4,
  },
  dropdownList: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    maxHeight: 180,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  dropdownItemSubText: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 2,
  },
  dateSelectContainer: {
    height: 44,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    justifyContent: 'center',
  },
  webSelect: {
    width: '100%',
    height: '100%',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'transparent',
    color: Colors.light.text,
    fontSize: 14,
    ...Platform.select({
      web: {
        border: 'none',
        outline: 'none',
      } as any,
      default: {}
    })
  },
  customDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 8,
  },
});
