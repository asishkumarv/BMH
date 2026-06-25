import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import axios from 'axios';
import { CheckSquare, Plus, Clock, User, CheckCircle, XCircle } from 'lucide-react-native';

export default function AdminTasksScreen() {
  const { isDesktop } = useResponsive();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'super_admins' | 'department_admins' | 'employees'>('all');

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

  const adminUser = typeof window !== 'undefined' && localStorage.getItem('superAdminUser') 
    ? JSON.parse(localStorage.getItem('superAdminUser') || '{}') 
    : { id: 1, full_name: 'Super Admin' };

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get('https://bmh-eitu.onrender.com/tasks?user_type=super_admin');
      if (res.data.success) {
        setTasks(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const [empRes, adminRes, superAdminRes, deptRes] = await Promise.all([
        axios.get('https://bmh-eitu.onrender.com/employees'),
        axios.get('https://bmh-eitu.onrender.com/admin/department-admins'),
        axios.get('https://bmh-eitu.onrender.com/admin/super-admins'),
        axios.get('https://bmh-eitu.onrender.com/department')
      ]);
      setUsers({
        emps: empRes.data.success ? empRes.data.data : [],
        admins: adminRes.data.success ? adminRes.data.data : [],
        superAdmins: superAdminRes.data.success ? superAdminRes.data.data : [],
        depts: deptRes.data.success ? deptRes.data.data : []
      });
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
        const admin = users.admins.find(a => String(a.id) === assigneeId);
        if (admin) {
           const d = users.depts.find(d => d.id === admin.department_id);
           if (d) finalDept = d.name;
        }
      } else if (assigneeType === 'super_admin') {
        finalDept = 'Admin';
      }
    }

    try {
      await axios.post('https://bmh-eitu.onrender.com/tasks', {
        title,
        description,
        assigner_type: 'super_admin',
        assigner_id: adminUser.id || 1,
        assignee_type: finalAssigneeType,
        assignee_id: parseInt(finalAssigneeId),
        department: finalDept,
        due_date: dueDate || null
      });
      setShowCreateModal(false);
      fetchTasks();
      setTitle('');
      setDescription('');
      setDueDate('');
      Alert.alert('Success', 'Task created successfully');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to create task');
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await axios.put(`https://bmh-eitu.onrender.com/tasks/${selectedTask.id}/status`, {
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


  const renderTaskCard = (task: any) => (
    <View key={task.id} style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>{task.status.toUpperCase()}</Text>
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
            <Text style={styles.metaText}>Due: {new Date(task.due_date).toLocaleString()}</Text>
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

      <View style={styles.taskActions}>
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
            { id: 'employees', label: 'Employees' }
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
          {getTasksForTab().length === 0 ? (
            <Text style={{ textAlign: 'center', color: Colors.light.icon, marginTop: 40 }}>No tasks found.</Text>
          ) : (
            getTasksForTab().map(renderTaskCard)
          )}
        </ScrollView>
      )}

      {/* Create Task Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 500 }]}>
            <Text style={styles.modalTitle}>Create New Task</Text>
            
            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
              <View style={{ paddingBottom: 8 }}>
                <Text style={styles.label}>Title</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Task Title" />
                
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, { height: 80 }]} multiline value={description} onChangeText={setDescription} placeholder="Task Details..." />

            <Text style={styles.label}>Assignee Type</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              {['employee', 'department_admin', 'super_admin', 'self'].map(type => (
                <Pressable key={type} style={[styles.radioBtn, assigneeType === type && styles.radioActive]} onPress={() => { setAssigneeType(type); setAssigneeId(''); setSelectedDeptId(''); }}>
                  <Text style={{ color: assigneeType === type ? '#FFF' : Colors.light.text }}>{type.replace('_', ' ')}</Text>
                </Pressable>
              ))}
            </View>

            {(assigneeType === 'employee' || assigneeType === 'department_admin') && (
              <>
                <Text style={styles.label}>Select Department</Text>
                <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, marginBottom: 16 }}>
                  <select 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                    value={selectedDeptId}
                    onChange={(e) => { setSelectedDeptId(e.target.value); setAssigneeId(''); }}
                  >
                    <option value="">-- Choose Department --</option>
                    {users.depts.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </View>
              </>
            )}

            {assigneeType !== 'self' && (
              <>
                <Text style={styles.label}>Select Assignee</Text>
                <View style={{ borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, marginBottom: 16 }}>
                  <select 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">-- Choose Assignee --</option>
                    {assigneeType === 'employee' && users.emps
                      .filter(e => {
                        if (!selectedDeptId) return true;
                        const d = users.depts.find(dept => String(dept.id) === String(selectedDeptId));
                        return d && e.department === d.name;
                      })
                      .map(e => (
                        <option key={e.id} value={e.id}>{e.full_name} ({e.email})</option>
                      ))}

                    {assigneeType === 'department_admin' && users.admins
                      .filter(a => {
                        if (!selectedDeptId) return true;
                        return String(a.department_id) === String(selectedDeptId);
                      })
                      .map(a => (
                        <option key={a.id} value={a.id}>{a.full_name} ({a.email})</option>
                      ))}

                    {assigneeType === 'super_admin' && users.superAdmins.map(sa => (
                      <option key={sa.id} value={sa.id}>{sa.full_name} ({sa.email})</option>
                    ))}
                  </select>
                </View>
              </>
            )}

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
                <TextInput style={{ padding: 14, fontSize: 15, color: Colors.light.text }} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD HH:MM" />
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

            {selectedTask?.status === 'assigned' && selectedTask?.assignee_type === 'super_admin' && String(selectedTask?.assignee_id) === String(adminUser.id) && (
              <>
                <Text style={styles.label}>Rejection Reason (only if rejecting)</Text>
                <TextInput style={[styles.input, { height: 80 }]} multiline value={rejectionReason} onChangeText={setRejectionReason} placeholder="Reason for rejection..." />
              </>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
              {selectedTask?.status === 'assigned' && selectedTask?.assignee_type === 'super_admin' && String(selectedTask?.assignee_id) === String(adminUser.id) && (
                <>
                  <Pressable style={[styles.saveBtn, { backgroundColor: '#10B981' }]} onPress={() => handleUpdateStatus('accepted')}>
                    <Text style={styles.saveBtnText}>Accept</Text>
                  </Pressable>
                  <Pressable style={[styles.saveBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleUpdateStatus('rejected')}>
                    <Text style={styles.saveBtnText}>Reject</Text>
                  </Pressable>
                </>
              )}
              {selectedTask?.assignee_type === 'super_admin' && String(selectedTask?.assignee_id) === String(adminUser.id) && (selectedTask?.status === 'accepted' || selectedTask?.status === 'in_progress') ? (
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
  modalContent: { backgroundColor: Colors.light.card, borderRadius: 24, padding: 32, width: '100%', maxHeight: '90%' },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, padding: 16, fontSize: 15, color: Colors.light.text },
  radioBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.border },
  radioActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 32 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: Colors.light.background },
  cancelBtnText: { color: Colors.light.icon, fontWeight: '600', fontSize: 15 },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: Colors.light.primary },
  saveBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 }
});
