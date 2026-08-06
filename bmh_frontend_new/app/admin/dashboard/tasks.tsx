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

  // Category and Predefined Tasks States
  const [categories, setCategories] = useState<any[]>([]);
  const [predefinedTasks, setPredefinedTasks] = useState<any[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [recurringFrequencyFilter, setRecurringFrequencyFilter] = useState('all');

  // Category management UI
  const [showManageCatsModal, setShowManageCatsModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Predefined tasks management UI
  const [showManagePredefModal, setShowManagePredefModal] = useState(false);
  const [predefTitle, setPredefTitle] = useState('');
  const [predefDesc, setPredefDesc] = useState('');
  const [predefCategory, setPredefCategory] = useState('General');
  const [predefPriority, setPredefPriority] = useState('Moderate');

  // Switching toggle: All Tasks Table vs Assignee-wise Summary View
  const [viewMode, setViewMode] = useState<'table' | 'summary'>('table');
  const [selectedUserSummary, setSelectedUserSummary] = useState<any | null>(null);
  const [selectedUserTab, setSelectedUserTab] = useState<'normal' | 'recurring'>('normal');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeType, setAssigneeType] = useState('employee');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [department, setDepartment] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isGroupTask, setIsGroupTask] = useState(false);
  const [groupAssigneeIds, setGroupAssigneeIds] = useState<string[]>([]);
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const [dueTimeType, setDueTimeType] = useState('default');
  const [dueTimeHours, setDueTimeHours] = useState('0');
  const [dueTimeDays, setDueTimeDays] = useState('0');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editPriority, setEditPriority] = useState('Moderate');
  const [editCategory, setEditCategory] = useState('General');
  const [editDueTimeType, setEditDueTimeType] = useState('default');
  const [editDueTimeHours, setEditDueTimeHours] = useState('0');
  const [editDueTimeDays, setEditDueTimeDays] = useState('0');
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

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
    fetchCategories();
    fetchPredefinedTasks();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/tasks/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPredefinedTasks = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/tasks/predefined');
      if (res.data.success) {
        setPredefinedTasks(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName) return Alert.alert('Error', 'Name is required');
    try {
      await axios.post('https://napi.bharatmedicalhallplus.com/tasks/categories', { name: newCatName });
      setNewCatName('');
      fetchCategories();
      Alert.alert('Success', 'Category added');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await axios.delete(`https://napi.bharatmedicalhallplus.com/tasks/categories/${id}`);
      fetchCategories();
      Alert.alert('Success', 'Category deleted');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to delete category');
    }
  };

  const handleAddPredefTask = async () => {
    if (!predefTitle) return Alert.alert('Error', 'Title is required');
    try {
      await axios.post('https://napi.bharatmedicalhallplus.com/tasks/predefined', {
        title: predefTitle,
        description: predefDesc,
        category: predefCategory,
        priority: predefPriority
      });
      setPredefTitle('');
      setPredefDesc('');
      setPredefCategory('General');
      setPredefPriority('Moderate');
      fetchPredefinedTasks();
      Alert.alert('Success', 'Predefined task added');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add predefined task');
    }
  };

  const handleDeletePredefTask = async (id: number) => {
    try {
      await axios.delete(`https://napi.bharatmedicalhallplus.com/tasks/predefined/${id}`);
      fetchPredefinedTasks();
      Alert.alert('Success', 'Predefined task deleted');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to delete predefined task');
    }
  };

  const handleLoadPredefTask = (task: any) => {
    setTitle(task.title);
    setDescription(task.description);
    setSelectedCategory(task.category);
    setPriority(task.priority);
  };

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
        axios.get('https://napi.bharatmedicalhallplus.com/employees/all-users')
      ]);
      setUsers({
        emps: empRes.data.success ? empRes.data.data : [],
        admins: adminRes.data.success ? adminRes.data.data : [],
        superAdmins: superAdminRes.data.success ? superAdminRes.data.data : [],
        depts: deptRes.data.success ? deptRes.data.data : []
      });
      if (globalRes.data.success) {
        const nonDoctors = globalRes.data.data.filter((u: any) => u.type !== 'doctor' && u.role !== 'doctor');
        setGlobalUsers(nonDoctors);
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
      if (!isGroupTask && !assigneeId) return Alert.alert('Error', 'Assignee is required.');
      if (isGroupTask && groupAssigneeIds.length === 0) return Alert.alert('Error', 'Please select at least one assignee for the group task.');

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

    // Resolve group assignees list
    let resolvedGroupAssignees: any[] = [];
    if (isGroupTask) {
      resolvedGroupAssignees = groupAssigneeIds.map(id => {
        let name = 'User';
        let dept = '';
        let role = '';
        if (assigneeType === 'super_admin') {
          const sa = users.superAdmins.find(x => String(x.id) === String(id));
          if (sa) { name = sa.full_name; dept = 'Admin'; role = 'Super Admin'; }
        } else if (assigneeType === 'department_admin') {
          const admin = users.admins.find(x => String(x.id) === String(id));
          if (admin) {
            name = admin.full_name;
            const d = users.depts.find(dept => dept.id === admin.department_id);
            if (d) dept = d.name;
            role = admin.role || 'Department Admin';
          }
        } else if (assigneeType === 'employee') {
          const emp = users.emps.find(x => String(x.id) === String(id));
          if (emp) { name = emp.full_name; dept = emp.department; role = emp.role || 'Employee'; }
        }
        if (dept && !finalDept) {
          finalDept = dept;
        }
        return {
          assignee_id: parseInt(id),
          assignee_type: assigneeType,
          assignee_name: name,
          department: dept,
          role: role,
          status: 'assigned'
        };
      });
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
          priority, frequency, specific_days: parsedDays,
          due_time_type: dueTimeType,
          due_time_hours: parseInt(dueTimeHours) || 0,
          due_time_days: parseInt(dueTimeDays) || 0,
          category: selectedCategory
        });
        fetchTasks();
      } else {
        await axios.post('https://napi.bharatmedicalhallplus.com/tasks', {
          title,
          description,
          assigner_type: 'super_admin',
          assigner_id: adminUser.id || 1,
          assignee_type: finalAssigneeType,
          assignee_id: isGroupTask ? 0 : parseInt(finalAssigneeId),
          department: finalDept,
          due_date: dueDate ? new Date(dueDate.replace(' ', 'T')).toISOString() : null,
          priority,
          is_group_task: isGroupTask,
          group_assignees: resolvedGroupAssignees,
          category: selectedCategory
        });
      }
      setShowCreateModal(false);
      fetchTasks();
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('Moderate');
      setSelectedCategory('General');
      setIsRecurring(false);
      setFrequency('daily');
      setSpecificDays('');
      setIsGroupTask(false);
      setGroupAssigneeIds([]);
      setDeptSearchQuery('');
      setDeptDropdownOpen(false);
      setAssigneeSearchQuery('');
      setAssigneeDropdownOpen(false);
      setDueTimeType('default');
      setDueTimeHours('0');
      setDueTimeDays('0');
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
    if (!directRejectText || directRejectText.trim().length < 6) {
      return Alert.alert('Error', 'Rejection reason is required and must be at least 6 characters.');
    }
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/tasks/${directRejectTask.id}/status`, {
        status: 'rejected',
        rejection_reason: directRejectText,
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
    if (newStatus === 'rejected') {
      if (!rejectionReason || rejectionReason.trim().length < 6) {
        return Alert.alert('Error', 'Rejection reason is required and must be at least 6 characters.');
      }
    }
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

  const handleOpenEditModal = (task: any, isRec: boolean) => {
    setEditTaskId(task.id);
    setEditIsRecurring(isRec);
    setEditTitle(task.title || '');
    setEditDescription(task.description || '');
    setEditCategory(task.category || 'General');
    if (isRec) {
      setEditPriority(task.priority || 'Moderate');
      setEditDueTimeType(task.due_time_type || 'default');
      setEditDueTimeHours(String(task.due_time_hours || '0'));
      setEditDueTimeDays(String(task.due_time_days || '0'));
    } else {
      setEditDueDate(task.due_date ? new Date(task.due_date).toISOString() : '');
    }
    setShowEditModal(true);
  };

  const handleUpdateTask = async () => {
    if (!editTitle) return Alert.alert('Error', 'Title is required');
    try {
      if (editIsRecurring) {
        await axios.put(`https://napi.bharatmedicalhallplus.com/tasks/recurring/${editTaskId}`, {
          title: editTitle,
          description: editDescription,
          priority: editPriority,
          due_time_type: editDueTimeType,
          due_time_hours: parseInt(editDueTimeHours) || 0,
          due_time_days: parseInt(editDueTimeDays) || 0,
          category: editCategory
        });
      } else {
        await axios.put(`https://napi.bharatmedicalhallplus.com/tasks/${editTaskId}`, {
          title: editTitle,
          description: editDescription,
          due_date: editDueDate ? new Date(editDueDate).toISOString() : null,
          category: editCategory
        });
      }
      setShowEditModal(false);
      fetchTasks();
      Alert.alert('Success', 'Task updated successfully');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update task');
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
              if (Platform.OS === 'web') {
                const confirmed = window.confirm('Are you sure you want to delete this schedule?');
                if (confirmed) {
                  try {
                    await axios.delete(`https://napi.bharatmedicalhallplus.com/tasks/recurring/${task.id}`);
                    fetchTasks();
                  } catch(e) {
                    alert('Failed to delete schedule');
                  }
                }
              } else {
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
                ]);
              }
            }}
          >
            <Text style={styles.actionBtnText}>Delete</Text>
          </Pressable>
          <Pressable 
            style={[styles.actionBtn, { backgroundColor: '#e0f2fe', marginLeft: 8 }]}
            onPress={() => handleOpenEditModal(task, true)}
          >
            <Text style={[styles.actionBtnText, { color: '#0369a1' }]}>Edit</Text>
          </Pressable>
      </View>
    </View>
  );

  const isUserGroupAssignee = (task: any, userId: number, userType: string) => {
    if (!task.is_group_task) return false;
    const members = typeof task.group_assignees === 'string' ? JSON.parse(task.group_assignees) : (task.group_assignees || []);
    return members.some((m: any) => Number(m.assignee_id) === Number(userId) && m.assignee_type === userType);
  };

  const renderTaskCard = (task: any) => (
    <View key={task.id} style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>{task.status.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: task.priority === 'High' ? '#fee2e2' : task.priority === 'Moderate' ? '#fef3c7' : '#e0f2fe' }]}>
            <Text style={[styles.statusText, { color: task.priority === 'High' ? '#ef4444' : task.priority === 'Moderate' ? '#f59e0b' : '#0ea5e9' }]}>{task.priority || 'Moderate'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: task.is_recurring ? '#e0e7ff' : '#f1f5f9' }]}>
            <Text style={[styles.statusText, { color: task.is_recurring ? '#4338ca' : '#475569' }]}>
              {task.is_recurring ? 'Recurring' : 'One-time'}
            </Text>
          </View>
          {task.is_group_task && (
            <View style={[styles.statusBadge, { backgroundColor: '#fae8ff' }]}>
              <Text style={[styles.statusText, { color: '#d946ef' }]}>Group</Text>
            </View>
          )}
        </View>
      </View>
      
      <Text style={styles.taskDesc}>{task.description}</Text>
      
      <View style={styles.taskMeta}>
        <View style={styles.metaItem}>
          <User color={Colors.light.icon} size={16} />
          <Text style={styles.metaText}>Assigner: {task.assigner_name || 'Unknown'} ({task.assigner_type.replace('_', ' ')} #{task.assigner_id})</Text>
        </View>
        {task.is_group_task ? (
          <View style={{ marginTop: 8, padding: 8, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: '#334155', marginBottom: 4 }}>Group Members Status:</Text>
            {(() => {
              const members = typeof task.group_assignees === 'string' ? JSON.parse(task.group_assignees) : (task.group_assignees || []);
              return members.map((m: any, idx: number) => {
                let statusColor = '#6b7280';
                if (m.status === 'accepted') statusColor = '#3b82f6';
                if (m.status === 'in_progress') statusColor = '#f59e0b';
                if (m.status === 'completed') statusColor = '#10b981';
                if (m.status === 'rejected') statusColor = '#ef4444';

                const foundUser = globalUsers.find(u => {
                  const targetId = m.assignee_type === 'department_admin' ? `SA-${m.assignee_id}` : String(m.assignee_id);
                  return String(u.id) === targetId;
                });
                const dept = m.department || foundUser?.department || '';
                const role = m.role || foundUser?.role || '';
                const label = dept || role ? ` (${dept}${dept && role ? ' - ' : ''}${role})` : ` (${m.assignee_type.replace('_', ' ')})`;

                return (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: idx < members.length - 1 ? 0.5 : 0, borderBottomColor: '#cbd5e1' }}>
                    <Text style={{ fontSize: 12, color: '#475569' }}>{m.assignee_name}{label}</Text>
                    <Text style={{ fontSize: 12, color: statusColor, fontWeight: 'bold' }}>{m.status.toUpperCase()}</Text>
                  </View>
                );
              });
            })()}
          </View>
        ) : (
          (() => {
            const foundUser = globalUsers.find(u => {
              const targetId = task.assignee_type === 'department_admin' ? `SA-${task.assignee_id}` : String(task.assignee_id);
              return String(u.id) === targetId;
            });
            const role = foundUser?.role || task.assignee_type.replace('_', ' ');
            const dept = task.department || foundUser?.department || 'N/A';
            return (
              <View style={styles.metaItem}>
                <User color={Colors.light.icon} size={16} />
                <Text style={styles.metaText}>Assignee: {task.assignee_name || 'Unknown'} ({role} #{task.assignee_id}) - {dept}</Text>
              </View>
            );
          })()
        )}
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
                    {(() => {
                      const userStatus = task.is_group_task
                        ? (task.group_assignees?.find((ga: any) => String(ga.assignee_id) === String(adminUser.id) && ga.assignee_type === 'super_admin')?.status || 'assigned')
                        : task.status;
                      const isAssignee = (!task.is_group_task && task.assignee_type === 'super_admin' && String(task.assignee_id) === String(adminUser.id)) ||
                                         (task.is_group_task && isUserGroupAssignee(task, adminUser.id, 'super_admin'));
                      
                      return (userStatus === 'assigned' || userStatus === 'pending') && isAssignee ? (
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
                      ) : null;
                    })()}
                    {(() => {
                      const userStatus = task.is_group_task
                        ? (task.group_assignees?.find((ga: any) => String(ga.assignee_id) === String(adminUser.id) && ga.assignee_type === 'super_admin')?.status || 'assigned')
                        : task.status;
                      const isAssignee = (!task.is_group_task && task.assignee_type === 'super_admin' && String(task.assignee_id) === String(adminUser.id)) ||
                                         (task.is_group_task && isUserGroupAssignee(task, adminUser.id, 'super_admin'));
                      
                      return isAssignee && userStatus !== 'assigned' && userStatus !== 'pending' && userStatus !== 'rejected' && userStatus !== 'completed' && userStatus !== 'terminated' ? (
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
                      ) : null;
                    })()}
          {task.status === 'rejected' &&
           !task.is_group_task &&
           task.assigner_type === 'super_admin' &&
           String(task.assigner_id) === String(adminUser.id || 1) && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fb923c' }]}
              onPress={() => { setSelectedTask(task); setAssigneeId(''); setShowReassignModal(true); }}
            >
              <Text style={[styles.actionBtnText, { color: '#ea580c' }]}>Reassign</Text>
            </Pressable>
          )}
          {task.assigner_type === 'super_admin' && String(task.assigner_id) === String(adminUser.id || 1) && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#e0f2fe', marginLeft: 8 }]}
              onPress={() => handleOpenEditModal(task, false)}
            >
              <Text style={[styles.actionBtnText, { color: '#0369a1' }]}>Edit</Text>
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
    if (selectedEmployeeId.startsWith('SA-')) {
      const id = selectedEmployeeId.replace('SA-', '');
      return t.assignee_type === 'department_admin' && String(t.assignee_id) === id;
    }
    if (selectedEmployeeId.startsWith('ADMIN-')) {
      const id = selectedEmployeeId.replace('ADMIN-', '');
      return t.assignee_type === 'super_admin' && String(t.assignee_id) === id;
    }
    if (selectedEmployeeId.startsWith('DOC-')) {
      const id = selectedEmployeeId.replace('DOC-', '');
      return t.assignee_type === 'doctor' && String(t.assignee_id) === id;
    }
    return t.assignee_type === 'employee' && String(t.assignee_id) === String(selectedEmployeeId);
  };

  const matchesCategory = (t: any) => {
    if (selectedCategoryFilter === 'all') return true;
    return t.category === selectedCategoryFilter;
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
    if (selectedStatFilter === 'pending') return !['completed', 'terminated', 'rejected'].includes(t.status);
    if (selectedStatFilter === 'rejected') return t.status === 'rejected';
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
    return tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && matchesStat(t) && matchesCategory(t));
  };

  const getFilteredRecurringTasks = () => {
    return recurringTasks.filter(t => {
      if (!matchesEmployee(t)) return false;
      if (!matchesCategory(t)) return false;
      if (recurringFrequencyFilter !== 'all' && t.frequency !== recurringFrequencyFilter) return false;
      return true;
    });
  };

  const tabTasks = getTasksForTab();

  const getStatCounts = () => {
    const totalFiltered = tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && matchesCategory(t)).length;
    const totalOverall = tabTasks.length;
    
    const completedFiltered = tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && matchesCategory(t) && t.status === 'completed').length;
    const completedOverall = tabTasks.filter(t => t.status === 'completed').length;
    
    const pendingFiltered = tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && matchesCategory(t) && !['completed', 'terminated', 'rejected'].includes(t.status)).length;
    const pendingOverall = tabTasks.filter(t => !['completed', 'terminated', 'rejected'].includes(t.status)).length;

    const rejectedFiltered = tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && matchesCategory(t) && t.status === 'rejected').length;
    const rejectedOverall = tabTasks.filter(t => t.status === 'rejected').length;
    
    const highPendingFiltered = tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && matchesCategory(t) && t.priority === 'High' && !['completed', 'terminated', 'rejected'].includes(t.status)).length;
    const highOverall = tabTasks.filter(t => t.priority === 'High').length;
    
    const moderatePendingFiltered = tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && matchesCategory(t) && (t.priority === 'Moderate' || !t.priority) && !['completed', 'terminated', 'rejected'].includes(t.status)).length;
    const moderateOverall = tabTasks.filter(t => t.priority === 'Moderate' || !t.priority).length;
    
    const lowPendingFiltered = tabTasks.filter(t => matchesEmployee(t) && matchesDate(t) && matchesCategory(t) && t.priority === 'Low' && !['completed', 'terminated', 'rejected'].includes(t.status)).length;
    const lowOverall = tabTasks.filter(t => t.priority === 'Low').length;
    
    return {
      total: { filtered: totalFiltered, overall: totalOverall },
      completed: { filtered: completedFiltered, overall: completedOverall },
      pending: { filtered: pendingFiltered, overall: pendingOverall },
      rejected: { filtered: rejectedFiltered, overall: rejectedOverall },
      high: { filtered: highPendingFiltered, overall: highOverall },
      moderate: { filtered: moderatePendingFiltered, overall: moderateOverall },
      low: { filtered: lowPendingFiltered, overall: lowOverall }
    };
  };

  const getUserTaskStats = (user: any) => {
    let targetId = String(user.id);
    let targetType = user.type;
    if (targetId.startsWith('SA-')) {
      targetId = targetId.replace('SA-', '');
      targetType = 'department_admin';
    } else if (targetId.startsWith('ADMIN-')) {
      targetId = targetId.replace('ADMIN-', '');
      targetType = 'super_admin';
    } else if (targetId.startsWith('DOC-')) {
      targetId = targetId.replace('DOC-', '');
      targetType = 'doctor';
    }

    const userTasks = tasks.filter(t => {
      if (t.is_group_task) {
        const members = typeof t.group_assignees === 'string' ? JSON.parse(t.group_assignees) : (t.group_assignees || []);
        return members.some((m: any) => String(m.assignee_id) === targetId && m.assignee_type === targetType);
      }
      return String(t.assignee_id) === targetId && t.assignee_type === targetType;
    });

    const total = userTasks.length;
    const completed = userTasks.filter(t => t.status === 'completed').length;
    const pending = userTasks.filter(t => !['completed', 'terminated', 'rejected'].includes(t.status)).length;
    
    const highPending = userTasks.filter(t => t.priority === 'High' && !['completed', 'terminated', 'rejected'].includes(t.status)).length;
    const moderatePending = userTasks.filter(t => (t.priority === 'Moderate' || !t.priority) && !['completed', 'terminated', 'rejected'].includes(t.status)).length;
    const lowPending = userTasks.filter(t => t.priority === 'Low' && !['completed', 'terminated', 'rejected'].includes(t.status)).length;

    const todayStr = new Date().toDateString();
    const todayDuePending = userTasks.filter(t => {
      if (!t.due_date || ['completed', 'terminated', 'rejected'].includes(t.status)) return false;
      return new Date(t.due_date).toDateString() === todayStr;
    }).length;

    const userRecurring = recurringTasks.filter(t => {
      return String(t.assignee_id) === targetId && t.assignee_type === targetType;
    });

    return {
      total,
      completed,
      pending,
      highPending,
      moderatePending,
      lowPending,
      todayDuePending,
      userTasks,
      userRecurring
    };
  };

  const renderTasksTable = (taskList: any[], isRecurringList: boolean) => {
    return (
      <View style={styles.tableCard}>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
          <View style={{ minWidth: 1200 }}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.headerCell, { width: 50 }]}>S.No</Text>
              <Text style={[styles.headerCell, { width: 150 }]}>Created Date & Time</Text>
              <Text style={[styles.headerCell, { width: 180 }]}>Title</Text>
              <Text style={[styles.headerCell, { width: 220 }]}>Description</Text>
              <Text style={[styles.headerCell, { width: 140 }]}>Assigned By</Text>
              <Text style={[styles.headerCell, { width: 140 }]}>Assigned To</Text>
              <Text style={[styles.headerCell, { width: 140 }]}>{isRecurringList ? 'Schedule' : 'Due Date'}</Text>
              <Text style={[styles.headerCell, { width: 100 }]}>Category</Text>
              <Text style={[styles.headerCell, { width: 90 }]}>Type</Text>
              <Text style={[styles.headerCell, { width: 100 }]}>Status</Text>
              <Text style={[styles.headerCell, { width: 120, textAlign: 'right' }]}>Actions</Text>
            </View>

            {taskList.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: Colors.light.icon }}>No tasks found.</Text>
              </View>
            ) : (
              taskList.map((task, index) => {
                const sn = index + 1;
                const createdDate = formatTaskDate(task.created_at || task.created_date);
                
                let assignedByStr = 'System';
                if (task.assigner_type) {
                  assignedByStr = `${task.assigner_name || 'Admin'} (${task.assigner_type.replace('_', ' ')})`;
                }
                
                let assignedToStr = 'N/A';
                if (task.is_group_task) {
                  const members = typeof task.group_assignees === 'string' ? JSON.parse(task.group_assignees) : (task.group_assignees || []);
                  assignedToStr = `Group (${members.length} members)`;
                } else {
                  assignedToStr = `${task.assignee_name || 'Unknown'} (${task.assignee_type ? task.assignee_type.replace('_', ' ') : 'employee'})`;
                }

                let typeStr = 'Single';
                if (isRecurringList || task.is_recurring) typeStr = 'Recurring';
                else if (task.is_group_task) typeStr = 'Group';

                const statusColor = getStatusColor(task.status);

                return (
                  <View key={task.id} style={styles.tableRow}>
                    <Text style={[styles.cell, { width: 50 }]}>{sn}</Text>
                    <Text style={[styles.cell, { width: 150 }]}>{createdDate}</Text>
                    <Text style={[styles.cell, { width: 180, fontWeight: '700' }]}>{task.title}</Text>
                    <Text style={[styles.cell, { width: 220 }]} numberOfLines={2}>{task.description}</Text>
                    <Text style={[styles.cell, { width: 140 }]}>{assignedByStr}</Text>
                    <Text style={[styles.cell, { width: 140 }]}>{assignedToStr}</Text>
                    <Text style={[styles.cell, { width: 140 }]}>
                      {isRecurringList 
                        ? `${task.frequency.toUpperCase()} ${task.specific_days ? '(' + (Array.isArray(task.specific_days) ? task.specific_days : JSON.parse(task.specific_days)).join(', ') + ')' : ''}`
                        : formatTaskDate(task.due_date) || 'No Due Date'}
                    </Text>
                    <Text style={[styles.cell, { width: 100 }]}>
                      <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>{task.category || 'General'}</Text>
                      </View>
                    </Text>
                    <Text style={[styles.cell, { width: 90 }]}>
                      <View style={{ backgroundColor: typeStr === 'Recurring' ? '#e0e7ff' : typeStr === 'Group' ? '#fae8ff' : '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ fontSize: 12, color: typeStr === 'Recurring' ? '#4338ca' : typeStr === 'Group' ? '#d946ef' : '#475569', fontWeight: '600' }}>{typeStr}</Text>
                      </View>
                    </Text>
                    <Text style={[styles.cell, { width: 100 }]}>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{task.status.toUpperCase()}</Text>
                      </View>
                    </Text>
                    <View style={[styles.cell, { width: 120, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }]}>
                      {isRecurringList ? (
                        <>
                          <Pressable
                            style={{ backgroundColor: task.status === 'active' ? '#f59e0b' : '#10b981', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 }}
                            onPress={async () => {
                              try {
                                const newStatus = task.status === 'active' ? 'paused' : 'active';
                                await axios.put(`https://napi.bharatmedicalhallplus.com/tasks/recurring/${task.id}/status`, { status: newStatus });
                                fetchTasks();
                                Alert.alert('Success', `Schedule ${newStatus}`);
                              } catch(e) {
                                Alert.alert('Error', 'Failed to update status');
                              }
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{task.status === 'active' ? 'Pause' : 'Resume'}</Text>
                          </Pressable>
                          <Pressable
                            style={{ backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 }}
                            onPress={async () => {
                              if (Platform.OS === 'web') {
                                const confirmed = window.confirm('Are you sure you want to delete this schedule?');
                                if (confirmed) {
                                  try {
                                    await axios.delete(`https://napi.bharatmedicalhallplus.com/tasks/recurring/${task.id}`);
                                    fetchTasks();
                                  } catch(e) {
                                    alert('Failed to delete schedule');
                                  }
                                }
                              } else {
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
                                ]);
                              }
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Delete</Text>
                          </Pressable>
                          <Pressable
                            style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 }}
                            onPress={() => handleOpenEditModal(task, true)}
                          >
                            <Text style={{ color: '#0369a1', fontSize: 10, fontWeight: '700' }}>Edit</Text>
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <Pressable
                            style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                            onPress={() => handleOpenEditModal(task, false)}
                          >
                            <Text style={{ color: '#0369a1', fontSize: 11, fontWeight: '700' }}>Edit</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderUserSummary = () => {
    return (
      <View style={styles.tableCard}>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
          <View style={{ minWidth: 1100 }}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.headerCell, { width: 50 }]}>S.No</Text>
              <Text style={[styles.headerCell, { width: 200 }]}>Assigned To Name</Text>
              <Text style={[styles.headerCell, { width: 150 }]}>Role</Text>
              <Text style={[styles.headerCell, { width: 150 }]}>Department</Text>
              <Text style={[styles.headerCell, { width: 90, textAlign: 'center' }]}>Total Tasks</Text>
              <Text style={[styles.headerCell, { width: 90, textAlign: 'center' }]}>Completed</Text>
              <Text style={[styles.headerCell, { width: 90, textAlign: 'center' }]}>Pending</Text>
              <Text style={[styles.headerCell, { width: 100, textAlign: 'center' }]}>High Pending</Text>
              <Text style={[styles.headerCell, { width: 100, textAlign: 'center' }]}>Mod Pending</Text>
              <Text style={[styles.headerCell, { width: 100, textAlign: 'center' }]}>Low Pending</Text>
              <Text style={[styles.headerCell, { width: 120, textAlign: 'center' }]}>Today Due Pending</Text>
            </View>

            {globalUsers.map((user, index) => {
              const stats = getUserTaskStats(user);
              return (
                <Pressable
                  key={user.id}
                  style={({ pressed }) => [styles.tableRow, pressed && { backgroundColor: '#f1f5f9' }]}
                  onPress={() => setSelectedUserSummary(user)}
                >
                  <Text style={[styles.cell, { width: 50 }]}>{index + 1}</Text>
                  <Text style={[styles.cell, { width: 200, fontWeight: '700', color: Colors.light.primary }]}>{user.full_name}</Text>
                  <Text style={[styles.cell, { width: 150 }]}>{user.role}</Text>
                  <Text style={[styles.cell, { width: 150 }]}>{user.department}</Text>
                  <Text style={[styles.cell, { width: 90, textAlign: 'center' }]}>{stats.total}</Text>
                  <Text style={[styles.cell, { width: 90, textAlign: 'center', color: '#10b981', fontWeight: 'bold' }]}>{stats.completed}</Text>
                  <Text style={[styles.cell, { width: 90, textAlign: 'center', color: '#f59e0b', fontWeight: 'bold' }]}>{stats.pending}</Text>
                  <Text style={[styles.cell, { width: 100, textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }]}>{stats.highPending}</Text>
                  <Text style={[styles.cell, { width: 100, textAlign: 'center', color: '#ea580c' }]}>{stats.moderatePending}</Text>
                  <Text style={[styles.cell, { width: 100, textAlign: 'center', color: '#3b82f6' }]}>{stats.lowPending}</Text>
                  <Text style={[styles.cell, { width: 120, textAlign: 'center', color: '#ef4444', fontWeight: 'bold', backgroundColor: stats.todayDuePending > 0 ? '#fee2e2' : 'transparent', borderRadius: 4 }]}>
                    {stats.todayDuePending}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const stats = getStatCounts();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
        <View>
          <Text style={styles.title}>Task Management</Text>
          <Text style={styles.subtitle}>Oversee all tasks across the organization</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Pressable style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
            <Plus color="#FFF" size={20} />
            <Text style={styles.createBtnText}>New Task</Text>
          </Pressable>
        </View>
      </View>

      {/* Quick Management Buttons & Toggle Toolbar */}
      <View style={{ paddingHorizontal: isDesktop ? 32 : 16, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <Pressable 
            style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' }}
            onPress={() => setShowManageCatsModal(true)}
          >
            <Text style={{ fontWeight: '600', color: Colors.light.primary }}>Manage Categories</Text>
          </Pressable>
          <Pressable 
            style={{ backgroundColor: '#F5F3FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#DDD6FE' }}
            onPress={() => setShowManagePredefModal(true)}
          >
            <Text style={{ fontWeight: '600', color: '#7C3AED' }}>Manage Predefined Tasks</Text>
          </Pressable>
        </View>
        
        {/* Toggle Mode Selector */}
        <View style={styles.userTypeToggle}>
          <Pressable 
            style={[styles.toggleBtn, viewMode === 'table' && styles.toggleBtnActive]} 
            onPress={() => setViewMode('table')}
          >
            <Text style={[styles.toggleText, viewMode === 'table' && styles.toggleTextActive]}>All Tasks Table</Text>
          </Pressable>
          <Pressable 
            style={[styles.toggleBtn, viewMode === 'summary' && styles.toggleBtnActive]} 
            onPress={() => setViewMode('summary')}
          >
            <Text style={[styles.toggleText, viewMode === 'summary' && styles.toggleTextActive]}>Assignee Summary</Text>
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
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
          
          {/* Stats Grid - Kept Same */}
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
                { borderLeftColor: '#DC2626' },
                selectedStatFilter === 'rejected' && { borderColor: '#DC2626', borderWidth: 2, backgroundColor: '#fef2f2' }
              ]}
              onPress={() => handleStatCardPress('rejected')}
            >
              <Text style={styles.statLabel}>Rejected</Text>
              <Text style={styles.statValue}>{stats.rejected.filtered}</Text>
              <Text style={styles.statSubValue}>Total: {stats.rejected.overall}</Text>
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

          {/* Unified Filters Section */}
          <View style={[styles.filterSection, !isDesktop && styles.filterSectionMobile]}>
            {/* Employee/Sub-Admin Autocomplete Search */}
            <View style={[styles.filterItem, { zIndex: 100 }]}>
              <Text style={styles.filterLabel}>Assigned To Name</Text>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search employee / sub admin..."
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
                        setEmployeeSearchQuery('All Users');
                        setShowEmployeeDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { fontWeight: '700' }]}>-- All Users --</Text>
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

            {/* Category Filter */}
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Category Filter</Text>
              <View style={styles.dateSelectContainer}>
                {Platform.OS === 'web' ? (
                  <select
                    style={styles.webSelect}
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                ) : (
                  <Picker
                    selectedValue={selectedCategoryFilter}
                    onValueChange={(val: string) => setSelectedCategoryFilter(val)}
                    style={{ height: 44, color: Colors.light.text }}
                  >
                    <Picker.Item label="All Categories" value="all" />
                    {categories.map(cat => (
                      <Picker.Item key={cat.id} label={cat.name} value={cat.name} />
                    ))}
                  </Picker>
                )}
              </View>
            </View>

            {/* Conditional Filter: Date Filter (for Normal Tasks) OR Frequency Filter (for Recurring Tasks) */}
            {activeTab !== 'recurring' ? (
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
                {/* Custom Date Pickers */}
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
            ) : (
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Frequency Filter</Text>
                <View style={styles.dateSelectContainer}>
                  {Platform.OS === 'web' ? (
                    <select
                      style={styles.webSelect}
                      value={recurringFrequencyFilter}
                      onChange={(e) => setRecurringFrequencyFilter(e.target.value)}
                    >
                      <option value="all">All Frequencies</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  ) : (
                    <Picker
                      selectedValue={recurringFrequencyFilter}
                      onValueChange={(val: string) => setRecurringFrequencyFilter(val)}
                      style={{ height: 44, color: Colors.light.text }}
                    >
                      <Picker.Item label="All Frequencies" value="all" />
                      <Picker.Item label="Daily" value="daily" />
                      <Picker.Item label="Weekly" value="weekly" />
                      <Picker.Item label="Monthly" value="monthly" />
                    </Picker>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Table / Summary Listing */}
          {viewMode === 'summary' ? (
            renderUserSummary()
          ) : (
            activeTab === 'recurring' 
              ? renderTasksTable(getFilteredRecurringTasks(), true) 
              : renderTasksTable(getFilteredTasks(), false)
          )}
        </ScrollView>
      )}

      {/* Category Management Modal */}
      <Modal visible={showManageCatsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 400 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Categories</Text>
              <Pressable onPress={() => setShowManageCatsModal(false)}>
                <Text style={{ fontSize: 20, color: Colors.light.icon }}>✕</Text>
              </Pressable>
            </View>
            
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TextInput 
                style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                placeholder="New Category Name" 
                value={newCatName} 
                onChangeText={setNewCatName} 
              />
              <Pressable style={[styles.saveBtn, { paddingHorizontal: 16, borderRadius: 8 }]} onPress={handleAddCategory}>
                <Text style={styles.saveBtnText}>Add</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 250 }}>
              {categories.map(cat => (
                <View key={cat.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                  <Text style={{ fontSize: 15, color: Colors.light.text }}>{cat.name}</Text>
                  <Pressable onPress={() => handleDeleteCategory(cat.id)}>
                    <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            <View style={[styles.modalActions, { marginTop: 16 }]}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowManageCatsModal(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Predefined Tasks Management Modal */}
      <Modal visible={showManagePredefModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 500, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Predefined Tasks</Text>
              <Pressable onPress={() => setShowManagePredefModal(false)}>
                <Text style={{ fontSize: 20, color: Colors.light.icon }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <Text style={{ fontWeight: '700', fontSize: 14, color: '#334155', marginBottom: 12 }}>Add New Predefined Task</Text>
                
                <Text style={styles.label}>Title</Text>
                <TextInput style={styles.input} placeholder="Task Title" value={predefTitle} onChangeText={setPredefTitle} />
                
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, { height: 60 }]} multiline placeholder="Task details..." value={predefDesc} onChangeText={setPredefDesc} />
                
                <Text style={styles.label}>Category</Text>
                <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, backgroundColor: '#fff', marginBottom: 12 }}>
                  {Platform.OS === 'web' ? (
                    <select
                      style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', backgroundColor: 'transparent' }}
                      value={predefCategory}
                      onChange={(e) => setPredefCategory(e.target.value)}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  ) : (
                    <Picker
                      selectedValue={predefCategory}
                      onValueChange={(val) => setPredefCategory(val)}
                    >
                      {categories.map(cat => (
                        <Picker.Item key={cat.id} label={cat.name} value={cat.name} />
                      ))}
                    </Picker>
                  )}
                </View>

                <Text style={styles.label}>Priority</Text>
                <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, backgroundColor: '#fff', marginBottom: 16 }}>
                  {Platform.OS === 'web' ? (
                    <select
                      style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', backgroundColor: 'transparent' }}
                      value={predefPriority}
                      onChange={(e) => setPredefPriority(e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Moderate">Moderate</option>
                      <option value="High">High</option>
                    </select>
                  ) : (
                    <Picker
                      selectedValue={predefPriority}
                      onValueChange={(val) => setPredefPriority(val)}
                    >
                      <Picker.Item label="Low" value="Low" />
                      <Picker.Item label="Moderate" value="Moderate" />
                      <Picker.Item label="High" value="High" />
                    </Picker>
                  )}
                </View>

                <Pressable style={styles.saveBtn} onPress={handleAddPredefTask}>
                  <Text style={styles.saveBtnText}>Save Predefined Task</Text>
                </Pressable>
              </View>

              <Text style={{ fontWeight: '700', fontSize: 14, color: '#334155', marginBottom: 8 }}>Existing Predefined Tasks</Text>
              {predefinedTasks.map(task => (
                <View key={task.id} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.text }}>{task.title}</Text>
                    <Pressable onPress={() => handleDeletePredefTask(task.id)}>
                      <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>Delete</Text>
                    </Pressable>
                  </View>
                  <Text style={{ fontSize: 13, color: Colors.light.icon, marginTop: 4 }}>{task.description}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 11, color: '#1d4ed8', fontWeight: '600' }}>{task.category}</Text>
                    </View>
                    <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 11, color: '#d97706', fontWeight: '600' }}>{task.priority}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={[styles.modalActions, { marginTop: 16 }]}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowManagePredefModal(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* User Detailed Summary Modal */}
      <Modal visible={!!selectedUserSummary} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%', maxWidth: 1100, maxHeight: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={[styles.modalTitle, { marginBottom: 4 }]}>{selectedUserSummary?.full_name}'s Tasks</Text>
                <Text style={{ color: Colors.light.icon, fontWeight: '600' }}>{selectedUserSummary?.role} &bull; {selectedUserSummary?.department}</Text>
              </View>
              <Pressable style={styles.cancelBtn} onPress={() => setSelectedUserSummary(null)}>
                <Text style={styles.cancelBtnText}>✕ Close</Text>
              </Pressable>
            </View>

            {/* Modal Tabs */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8 }}>
              <Pressable 
                style={[styles.tab, selectedUserTab === 'normal' && styles.activeTab]}
                onPress={() => setSelectedUserTab('normal')}
              >
                <Text style={[styles.tabText, selectedUserTab === 'normal' && styles.activeTabText]}>Assigned Tasks</Text>
              </Pressable>
              <Pressable 
                style={[styles.tab, selectedUserTab === 'recurring' && styles.activeTab]}
                onPress={() => setSelectedUserTab('recurring')}
              >
                <Text style={[styles.tabText, selectedUserTab === 'recurring' && styles.activeTabText]}>Recurring Schedules</Text>
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {(() => {
                if (!selectedUserSummary) return null;
                const userStats = getUserTaskStats(selectedUserSummary);
                if (selectedUserTab === 'normal') {
                  const sortedTasks = [...userStats.userTasks].sort((a, b) => new Date(b.created_at || b.created_date || 0).getTime() - new Date(a.created_at || a.created_date || 0).getTime());
                  return renderTasksTable(sortedTasks, false);
                } else {
                  return renderTasksTable(userStats.userRecurring, true);
                }
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Task Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 500 }]}>
            <Text style={styles.modalTitle}>Create New Task</Text>
            
            <ScrollView style={{ maxHeight: isDesktop ? 600 : 500 }} showsVerticalScrollIndicator={false}>
              <View style={{ paddingBottom: 8 }}>
                {/* Predefined Loader Dropdown */}
                {predefinedTasks.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.label}>Load Predefined Task</Text>
                    <View style={{ borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 8, backgroundColor: '#F5F3FF' }}>
                      {Platform.OS === 'web' ? (
                        <select
                          style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', backgroundColor: 'transparent', color: '#7C3AED', fontWeight: '600' }}
                          value=""
                          onChange={(e) => {
                            const selected = predefinedTasks.find(t => String(t.id) === e.target.value);
                            if (selected) handleLoadPredefTask(selected);
                          }}
                        >
                          <option value="">-- Load Predefined Template --</option>
                          {predefinedTasks.map(t => (
                            <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                          ))}
                        </select>
                      ) : (
                        <Picker
                          selectedValue=""
                          onValueChange={(val) => {
                            const selected = predefinedTasks.find(t => String(t.id) === val);
                            if (selected) handleLoadPredefTask(selected);
                          }}
                        >
                          <Picker.Item label="-- Load Predefined Template --" value="" />
                          {predefinedTasks.map(t => (
                            <Picker.Item key={t.id} label={`${t.title} (${t.category})`} value={t.id} />
                          ))}
                        </Picker>
                      )}
                    </View>
                  </View>
                )}

                <Text style={styles.label}>Title</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Task Title" />
                
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, { height: 50 }]} multiline value={description} onChangeText={setDescription} placeholder="Task Details..." />

                <Text style={styles.label}>Task Category</Text>
                <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, backgroundColor: '#fff', marginBottom: 12 }}>
                  {Platform.OS === 'web' ? (
                    <select
                      style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', backgroundColor: 'transparent' }}
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  ) : (
                    <Picker
                      selectedValue={selectedCategory}
                      onValueChange={(val) => setSelectedCategory(val)}
                    >
                      {categories.map(cat => (
                        <Picker.Item key={cat.id} label={cat.name} value={cat.name} />
                      ))}
                    </Picker>
                  )}
                </View>

            <Text style={styles.label}>Task Mode</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
              <Pressable style={[styles.radioBtn, !isGroupTask && styles.radioActive]} onPress={() => { setIsGroupTask(false); setGroupAssigneeIds([]); }}>
                <Text style={{ color: !isGroupTask ? '#FFF' : Colors.light.text }}>Single Assignee</Text>
              </Pressable>
              <Pressable style={[styles.radioBtn, isGroupTask && styles.radioActive]} onPress={() => { setIsGroupTask(true); setAssigneeId(''); }}>
                <Text style={{ color: isGroupTask ? '#FFF' : Colors.light.text }}>Group Task</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Assigned To Type</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
              {['employee', 'department_admin', 'super_admin', 'self'].map(type => (
                <Pressable key={type} style={[styles.radioBtn, assigneeType === type && styles.radioActive]} onPress={() => { setAssigneeType(type); setAssigneeId(''); setSelectedDeptId(''); setGroupAssigneeIds([]); }}>
                  <Text style={{ color: assigneeType === type ? '#FFF' : Colors.light.text }}>{type.replace('_', ' ')}</Text>
                </Pressable>
              ))}
            </View>

            {(assigneeType === 'employee' || assigneeType === 'department_admin') && (
              <>
                <Text style={styles.label}>Select Department (Optional)</Text>
                <View style={{ position: 'relative', zIndex: 99999, marginBottom: 12 }}>
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
                    onPress={() => setDeptDropdownOpen(!deptDropdownOpen)}
                  >
                    <Text style={{ fontSize: 15, color: selectedDeptId ? Colors.light.text : Colors.light.icon }}>
                      {selectedDeptId 
                        ? (users.depts.find(d => String(d.id) === String(selectedDeptId))?.name || '-- All Departments --')
                        : '-- All Departments --'}
                    </Text>
                    <Text style={{ fontSize: 12, color: Colors.light.icon }}>▼</Text>
                  </Pressable>

                  {deptDropdownOpen && (
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
                      zIndex: 100000
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
                        placeholder="Search department..."
                        value={deptSearchQuery}
                        onChangeText={setDeptSearchQuery}
                        autoFocus
                      />
                      <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true}>
                        <Pressable 
                          style={{ padding: 10, borderRadius: 6 }}
                          onPress={() => {
                            setSelectedDeptId('');
                            setDeptDropdownOpen(false);
                            setDeptSearchQuery('');
                            setAssigneeId('');
                            setGroupAssigneeIds([]);
                          }}
                        >
                          <Text style={{ fontSize: 14, color: Colors.light.text, fontWeight: 'bold' }}>-- All Departments --</Text>
                        </Pressable>
                        {users.depts.filter(d => 
                          !deptSearchQuery || d.name?.toLowerCase().includes(deptSearchQuery.toLowerCase())
                        ).map(d => (
                          <Pressable 
                            key={d.id}
                            style={{ 
                              padding: 10, 
                              borderRadius: 6, 
                              backgroundColor: String(selectedDeptId) === String(d.id) ? '#f1f5f9' : 'transparent',
                              marginTop: 2
                            }}
                            onPress={() => {
                              setSelectedDeptId(String(d.id));
                              setDeptDropdownOpen(false);
                              setDeptSearchQuery('');
                              setAssigneeId('');
                              setGroupAssigneeIds([]);
                            }}
                          >
                            <Text style={{ fontSize: 14, color: Colors.light.text }}>{d.name}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </>
            )}

            {assigneeType !== 'self' && (
              <>
                <Text style={styles.label}>{isGroupTask ? 'Select Group Members' : 'Select Assigned To User'}</Text>
                {isGroupTask ? (
                  <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, padding: 8, backgroundColor: '#f8fafc', marginBottom: 8 }}>
                    <TextInput
                      style={{ 
                        borderWidth: 1, 
                        borderColor: Colors.light.border, 
                        borderRadius: 6, 
                        padding: 8, 
                        fontSize: 14,
                        marginBottom: 8,
                        backgroundColor: '#fff'
                      }}
                      placeholder="Search users..."
                      value={assigneeSearchQuery}
                      onChangeText={setAssigneeSearchQuery}
                    />
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                      {(() => {
                        const list = (assigneeType === 'super_admin' ? users.superAdmins : globalUsers
                          .filter(u => u.type === assigneeType)
                          .filter(u => {
                            if (!selectedDeptId) return true;
                            const d = users.depts.find(dept => String(dept.id) === String(selectedDeptId));
                            return d && u.department === d.name;
                          }))
                          .filter(u => {
                            const q = assigneeSearchQuery.toLowerCase();
                            return !assigneeSearchQuery || 
                                   u.full_name?.toLowerCase().includes(q) || 
                                   u.department?.toLowerCase().includes(q) ||
                                   u.role?.toLowerCase().includes(q);
                          });
                        if (list.length === 0) return <Text style={{ color: Colors.light.icon, textAlign: 'center', padding: 12 }}>No assignees found.</Text>;
                        return list.map(u => {
                          const isSelected = groupAssigneeIds.includes(String(u.id));
                          return (
                            <Pressable 
                              key={u.id}
                              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: '#cbd5e1', backgroundColor: isSelected ? '#e0e7ff' : 'transparent', borderRadius: 6, marginBottom: 4 }}
                              onPress={() => {
                                if (isSelected) {
                                  setGroupAssigneeIds(groupAssigneeIds.filter(id => id !== String(u.id)));
                                } else {
                                  setGroupAssigneeIds([...groupAssigneeIds, String(u.id)]);
                                }
                              }}
                            >
                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={{ fontWeight: '600', color: Colors.light.text }}>{u.full_name}</Text>
                                <Text style={{ fontSize: 11, color: '#64748b' }}>{u.department || 'Admin'} - {u.role || 'Super Admin'}</Text>
                              </View>
                              <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#4338ca', justifyContent: 'center', alignItems: 'center', backgroundColor: isSelected ? '#4338ca' : 'transparent' }}>
                                {isSelected && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                              </View>
                            </Pressable>
                          );
                        });
                      })()}
                    </ScrollView>
                  </View>
                ) : (
                  <View style={{ position: 'relative', zIndex: 9998, marginBottom: 8 }}>
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
                          ? (() => {
                              const found = assigneeType === 'super_admin' 
                                ? users.superAdmins.find(sa => String(sa.id) === String(assigneeId))
                                : globalUsers.find(u => String(u.id) === String(assigneeId));
                              return found ? `${found.full_name} (${found.email || found.role || found.department || ''})` : '-- Choose User --';
                            })()
                          : '-- Choose User --'}
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
                          placeholder="Search user..."
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
                            <Text style={{ fontSize: 14, color: Colors.light.text }}>-- Choose User --</Text>
                          </Pressable>
                          {(() => {
                            const list = (assigneeType === 'super_admin' ? users.superAdmins : globalUsers
                              .filter(u => u.type === assigneeType)
                              .filter(u => {
                                if (!selectedDeptId) return true;
                                const d = users.depts.find(dept => String(dept.id) === String(selectedDeptId));
                                return d && u.department === d.name;
                              }))
                              .filter(u => {
                                const q = assigneeSearchQuery.toLowerCase();
                                return !assigneeSearchQuery || 
                                       u.full_name?.toLowerCase().includes(q) || 
                                       u.department?.toLowerCase().includes(q) ||
                                       u.role?.toLowerCase().includes(q);
                              });
                            return list.map(u => (
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
                                  {u.full_name} - {u.department || 'Admin'} ({u.role || u.email || ''})
                                </Text>
                              </Pressable>
                            ));
                          })()}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}
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

                <Text style={styles.label}>Due Date Configuration</Text>
                <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, padding: 12, backgroundColor: '#fff', marginTop: 8 }}>
                  <Text style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>Select configuration type:</Text>
                  
                  {Platform.OS === 'web' ? (
                    <select
                      style={{ width: '100%', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: '#fff', marginBottom: 12 }}
                      value={dueTimeType}
                      onChange={(e) => setDueTimeType(e.target.value)}
                    >
                      <option value="default">Default (Today 5:30 PM)</option>
                      <option value="hours">Within Hours</option>
                      <option value="days">Within Days</option>
                      <option value="days_hours">Days + Hours</option>
                    </select>
                  ) : (
                    <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 6, marginBottom: 12 }}>
                      <Picker
                        selectedValue={dueTimeType}
                        onValueChange={(val: any) => setDueTimeType(val)}
                        style={{ height: 50 }}
                      >
                        <Picker.Item label="Default (Today 5:30 PM)" value="default" />
                        <Picker.Item label="Within Hours" value="hours" />
                        <Picker.Item label="Within Days" value="days" />
                        <Picker.Item label="Days + Hours" value="days_hours" />
                      </Picker>
                    </View>
                  )}

                  {(dueTimeType === 'days' || dueTimeType === 'days_hours') && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: Colors.light.icon, marginBottom: 4 }}>Due Days</Text>
                      <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={dueTimeDays} 
                        onChangeText={setDueTimeDays} 
                        placeholder="e.g. 1" 
                      />
                    </View>
                  )}

                  {(dueTimeType === 'hours' || dueTimeType === 'days_hours') && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: Colors.light.icon, marginBottom: 4 }}>Due Hours</Text>
                      <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={dueTimeHours} 
                        onChangeText={setDueTimeHours} 
                        placeholder="e.g. 4" 
                      />
                    </View>
                  )}
                </View>
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
              {(() => {
                const isAssigneeOfTask = selectedTask && (
                  (!selectedTask.is_group_task && selectedTask.assignee_type === 'super_admin' && String(selectedTask.assignee_id) === String(adminUser.id)) ||
                  (selectedTask.is_group_task && isUserGroupAssignee(selectedTask, adminUser.id, 'super_admin'))
                );
                const currentAssigneeStatus = selectedTask
                  ? (selectedTask.is_group_task
                      ? (selectedTask.group_assignees?.find((ga: any) => String(ga.assignee_id) === String(adminUser.id) && ga.assignee_type === 'super_admin')?.status || 'assigned')
                      : selectedTask.status)
                  : 'assigned';

                return isAssigneeOfTask && (currentAssigneeStatus === 'pending' || currentAssigneeStatus === 'assigned' || currentAssigneeStatus === 'accepted' || currentAssigneeStatus === 'in_progress') ? (
                  <>
                    <Pressable style={[styles.saveBtn, { backgroundColor: '#3B82F6', marginRight: 8, marginBottom: 8 }]} onPress={() => handleUpdateStatus('in_progress')}>
                      <Text style={styles.saveBtnText}>Mark In Progress</Text>
                    </Pressable>
                    <Pressable style={[styles.saveBtn, { backgroundColor: '#8B5CF6', marginRight: 8, marginBottom: 8 }]} onPress={() => handleUpdateStatus('completed')}>
                      <Text style={styles.saveBtnText}>Complete</Text>
                    </Pressable>
                    <Pressable style={[styles.saveBtn, { backgroundColor: Colors.light.primary, marginBottom: 8 }]} onPress={() => handleUpdateStatus(currentAssigneeStatus)}>
                      <Text style={styles.saveBtnText}>Save Notes</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable style={[styles.saveBtn, { backgroundColor: Colors.light.primary }]} onPress={() => handleUpdateStatus(selectedTask?.status)}>
                    <Text style={styles.saveBtnText}>Save Notes</Text>
                  </Pressable>
                );
              })()}
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
                placeholder="Enter rejection reason (compulsory, minimum 6 characters)..."
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

      {/* Edit Task Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 500 }]}>
            <Text style={styles.modalTitle}>Edit Task Details</Text>
            
            <ScrollView style={{ maxHeight: isDesktop ? 600 : 500 }} showsVerticalScrollIndicator={false}>
              <View style={{ paddingBottom: 8 }}>
                <Text style={styles.label}>Title</Text>
                <TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} placeholder="Task Title" />
                
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, { height: 70 }]} multiline value={editDescription} onChangeText={setEditDescription} placeholder="Task Details..." />

                <Text style={styles.label}>Category</Text>
                <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, backgroundColor: '#fff', marginBottom: 12 }}>
                  {Platform.OS === 'web' ? (
                    <select
                      style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', backgroundColor: 'transparent' }}
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  ) : (
                    <Picker
                      selectedValue={editCategory}
                      onValueChange={(val) => setEditCategory(val)}
                    >
                      {categories.map(cat => (
                        <Picker.Item key={cat.id} label={cat.name} value={cat.name} />
                      ))}
                    </Picker>
                  )}
                </View>

                {editIsRecurring ? (
                  <>
                    <Text style={styles.label}>Priority</Text>
                    <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, marginBottom: 8 }}>
                      {Platform.OS === 'web' ? (
                        <select 
                          style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value)}
                        >
                          <option value="Low">Low</option>
                          <option value="Moderate">Moderate</option>
                          <option value="High">High</option>
                        </select>
                      ) : (
                        <Picker
                          selectedValue={editPriority}
                          onValueChange={(val) => setEditPriority(val)}
                          style={{ width: '100%', height: 50 }}
                        >
                          <Picker.Item label="Low" value="Low" />
                          <Picker.Item label="Moderate" value="Moderate" />
                          <Picker.Item label="High" value="High" />
                        </Picker>
                      )}
                    </View>

                    <Text style={styles.label}>Due Time Type</Text>
                    <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 6, marginBottom: 8 }}>
                      {Platform.OS === 'web' ? (
                        <select
                          style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                          value={editDueTimeType}
                          onChange={(e) => setEditDueTimeType(e.target.value)}
                        >
                          <option value="default">Default (Today 5:30 PM)</option>
                          <option value="hours">Within Hours</option>
                          <option value="days">Within Days</option>
                          <option value="days_hours">Days + Hours</option>
                        </select>
                      ) : (
                        <Picker
                          selectedValue={editDueTimeType}
                          onValueChange={(val: any) => setEditDueTimeType(val)}
                          style={{ height: 50 }}
                        >
                          <Picker.Item label="Default (Today 5:30 PM)" value="default" />
                          <Picker.Item label="Within Hours" value="hours" />
                          <Picker.Item label="Within Days" value="days" />
                          <Picker.Item label="Days + Hours" value="days_hours" />
                        </Picker>
                      )}
                    </View>

                    {(editDueTimeType === 'days' || editDueTimeType === 'days_hours') && (
                      <View style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 12, color: Colors.light.icon, marginBottom: 4 }}>Due Days</Text>
                        <TextInput 
                          style={styles.input} 
                          keyboardType="numeric" 
                          value={editDueTimeDays} 
                          onChangeText={setDueTimeDays} 
                        />
                      </View>
                    )}

                    {(editDueTimeType === 'hours' || editDueTimeType === 'days_hours') && (
                      <View style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 12, color: Colors.light.icon, marginBottom: 4 }}>Due Hours</Text>
                        <TextInput 
                          style={styles.input} 
                          keyboardType="numeric" 
                          value={editDueTimeHours} 
                          onChangeText={setEditDueTimeHours} 
                        />
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Due Date & Time</Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <TextInput 
                        style={[styles.input, { flex: 1 }]} 
                        value={editDueDate ? new Date(editDueDate).toLocaleString() : 'No due date'} 
                        editable={false} 
                      />
                      {Platform.OS === 'web' ? (
                        <input 
                          type="datetime-local" 
                          style={{ padding: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.light.border }}
                          value={editDueDate ? new Date(new Date(editDueDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                          onChange={(e) => setEditDueDate(new Date(e.target.value).toISOString())}
                        />
                      ) : (
                        <Pressable 
                          style={[styles.actionBtn, { backgroundColor: Colors.light.primary }]}
                          onPress={() => setShowEditDatePicker(true)}
                        >
                          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Change</Text>
                        </Pressable>
                      )}
                    </View>

                    {showEditDatePicker && Platform.OS !== 'web' && (
                      <DateTimePicker
                        value={editDueDate ? new Date(editDueDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event: any, date?: Date) => {
                          setShowEditDatePicker(false);
                          if (date && event.type !== 'dismissed') {
                            setEditDueDate(date.toISOString());
                          }
                        }}
                      />
                    )}
                  </>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleUpdateTask}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.light.card, borderBottomWidth: 1, borderBottomColor: Colors.light.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: 12 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  subtitle: { fontSize: 12, color: Colors.light.icon, marginTop: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6 },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  tabsContainerMobile: { paddingHorizontal: 12 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: Colors.light.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.light.icon },
  activeTabText: { color: Colors.light.primary },
  taskCard: { backgroundColor: Colors.light.card, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.light.border },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  taskTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.text, flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  taskDesc: { fontSize: 14, color: '#1e293b', fontWeight: '600', marginBottom: 10, lineHeight: 18, backgroundColor: '#f8fafc', padding: 8, borderRadius: 6, borderWidth: 0.5, borderColor: '#e2e8f0' },
  taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.light.icon, fontWeight: '500' },
  rejectionBox: { backgroundColor: '#FEF2F2', padding: 10, borderRadius: 6, marginBottom: 10, borderWidth: 1, borderColor: '#FCA5A5' },
  rejectionTitle: { fontSize: 12, fontWeight: '700', color: '#B91C1C', marginBottom: 2 },
  rejectionText: { fontSize: 13, color: '#991B1B' },
  notesBox: { backgroundColor: Colors.light.secondary, padding: 10, borderRadius: 6, marginBottom: 10 },
  notesTitle: { fontSize: 12, fontWeight: '700', color: Colors.light.primary, marginBottom: 2 },
  notesText: { fontSize: 13, color: Colors.light.text },
  taskActions: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.light.border },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: Colors.light.secondary, borderRadius: 6 },
  actionBtnText: { color: Colors.light.primary, fontWeight: '600', fontSize: 13 },
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
  tableCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 12,
    marginBottom: 20,
    ...Platform.select({
      web: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' },
      default: { elevation: 2 }
    })
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 2,
    borderBottomColor: '#cbd5e1',
    borderRadius: 6,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
  },
  cell: {
    fontSize: 14,
    color: Colors.light.text,
    paddingHorizontal: 8,
  },
  userTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    ...Platform.select({
      web: { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' },
      default: { elevation: 1 }
    })
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
});
