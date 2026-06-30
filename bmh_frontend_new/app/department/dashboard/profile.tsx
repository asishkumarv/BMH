import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import {  View, Text, StyleSheet, Platform, TextInput, Pressable, Alert, ScrollView , Image } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { Building, Lock, Mail, Phone, Calendar, Eye, EyeOff, User, Camera } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';
import * as ImagePicker from 'expo-image-picker';
import { Edit2 } from 'lucide-react-native';
import { Modal } from 'react-native';

export default function SubAdminProfileScreen() {
  const { isDesktop } = useResponsive();
  const [user, setUser] = useState<any>(null);
  const [pd, setPd] = useState<any>({});
  const [departmentName, setDepartmentName] = useState<string>('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [requestingUpdate, setRequestingUpdate] = useState(false);

  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      let userStr = null;
      if (Platform.OS === 'web') {
        userStr = localStorage.getItem('subAdminUser');
      } else {
        userStr = await AsyncStorage.getItem('subAdminUser');
      }
      if (userStr) {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        if (parsed.profile_data) {
          try { setPd(JSON.parse(parsed.profile_data)); } catch (e) {}
        }
        if (parsed.department_id) {
          axios.get('https://napi.bharatmedicalhallplus.com/department').then(res => {
            if (res.data.success) {
              const dept = res.data.data.find((d: any) => String(d.id) === String(parsed.department_id));
              if (dept) setDepartmentName(dept.name);
            }
          }).catch(console.error);
        }
        fetchMyRequests(parsed.id);
      }
    };
    init();
  }, []);

  const fetchMyRequests = async (empId: number) => {
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/profile/my-requests/sub_admin/${empId}`);
      if (res.data.success) {
        setMyRequests(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching my requests', err);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (!user) return;

    setUpdating(true);
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/admin/department-admins/${user.id}/password`, {
        oldPassword,
        newPassword
      });
      if (res.data.success) {
        Alert.alert('Success', 'Password updated successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update password');
    } finally {
      setUpdating(false);
    }
  };

  const openEditModal = () => {
    setEditForm({
      mobile: user.mobile || pd.phone || pd.mobile || '',
      bloodGroup: pd.bloodGroup || '',
      emergencyContact: pd.emergencyContact || '',
      address: pd.address || '',
      aadhaar: pd.aadhaar || '',
      pan: pd.pan || '',
      esi: pd.esi || '',
      bankName: pd.bankName || '',
      accountNo: pd.accountNo || '',
      ifsc: pd.ifsc || '',
      shiftIn: user.schedule_in || pd.shiftIn || '',
      shiftOut: user.schedule_in || pd.shiftOut || ''
    });
    setEditModalVisible(true);
  };

  const handleRequestProfileUpdate = async () => {
    setRequestingUpdate(true);
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/profile/request-update', {
        user_type: 'sub_admin',
        user_id: user.id,
        department_name: departmentName || user.department_id,
        requested_data: editForm
      });
      if (res.data.success) {
        Alert.alert('Success', 'Profile update requested! Waiting for admin approval.');
        setEditModalVisible(false);
        fetchMyRequests(user.id);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to request update');
    } finally {
      setRequestingUpdate(false);
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
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const newPd = { ...pd, photo: base64Image };
        
        setUpdating(true);
        const res = await axios.put(`https://napi.bharatmedicalhallplus.com/admin/department-admins/${user.id}/profile`, {
          profile_data: newPd
        });
        
        if (res.data.success) {
          setPd(newPd);
          const updatedUser = { ...user, profile_data: JSON.stringify(newPd) };
          setUser(updatedUser);
          if (Platform.OS === 'web') {
            localStorage.setItem('subAdminUser', JSON.stringify(updatedUser));
          }
          Alert.alert('Success', 'Profile photo updated successfully!');
        }
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile photo');
    } finally {
      setUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: isDesktop ? 32 : 16 }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.title}>Sub Admin Profile</Text>
            <Text style={styles.subtitle}>Manage your department administration account</Text>
          </View>
          <Pressable style={styles.editBtn} onPress={openEditModal}>
            <Edit2 size={16} color={Colors.light.primary} />
            <Text style={styles.editBtnText}>Edit Details</Text>
          </Pressable>
        </View>
      </View>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Profile Update</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              <View>
                <Text style={styles.label}>Mobile Number</Text>
                <TextInput style={styles.modalInput} value={editForm.mobile} onChangeText={(t) => setEditForm({...editForm, mobile: t})} />
              </View>
              <View>
                <Text style={styles.label}>Emergency Contact</Text>
                <TextInput style={styles.modalInput} value={editForm.emergencyContact} onChangeText={(t) => setEditForm({...editForm, emergencyContact: t})} />
              </View>
              <View>
                <Text style={styles.label}>Blood Group</Text>
                <TextInput style={styles.modalInput} value={editForm.bloodGroup} onChangeText={(t) => setEditForm({...editForm, bloodGroup: t})} />
              </View>
              <View>
                <Text style={styles.label}>Aadhaar Number</Text>
                <TextInput style={styles.modalInput} value={editForm.aadhaar} onChangeText={(t) => setEditForm({...editForm, aadhaar: t})} />
              </View>
              <View>
                <Text style={styles.label}>PAN Card</Text>
                <TextInput style={styles.modalInput} value={editForm.pan} onChangeText={(t) => setEditForm({...editForm, pan: t})} />
              </View>
              <View>
                <Text style={styles.label}>ESI ID</Text>
                <TextInput style={styles.modalInput} value={editForm.esi} onChangeText={(t) => setEditForm({...editForm, esi: t})} />
              </View>
              <View>
                <Text style={styles.label}>Address</Text>
                <TextInput style={[styles.modalInput, { height: 60 }]} multiline value={editForm.address} onChangeText={(t) => setEditForm({...editForm, address: t})} />
              </View>
              <View>
                <Text style={styles.label}>Bank Name</Text>
                <TextInput style={styles.modalInput} value={editForm.bankName} onChangeText={(t) => setEditForm({...editForm, bankName: t})} />
              </View>
              <View>
                <Text style={styles.label}>Account No</Text>
                <TextInput style={styles.modalInput} value={editForm.accountNo} onChangeText={(t) => setEditForm({...editForm, accountNo: t})} />
              </View>
              <View>
                <Text style={styles.label}>IFSC Code</Text>
                <TextInput style={styles.modalInput} value={editForm.ifsc} onChangeText={(t) => setEditForm({...editForm, ifsc: t})} />
              </View>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Shift In</Text>
                  <TextInput style={styles.modalInput} placeholder="09:00" value={editForm.shiftIn} onChangeText={(t) => setEditForm({...editForm, shiftIn: t})} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Shift Out</Text>
                  <TextInput style={styles.modalInput} placeholder="17:00" value={editForm.shiftOut} onChangeText={(t) => setEditForm({...editForm, shiftOut: t})} />
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.submitBtnModal} onPress={handleRequestProfileUpdate} disabled={requestingUpdate}>
                <Text style={styles.submitBtnText}>{requestingUpdate ? 'Submitting...' : 'Request Update'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.card, !isDesktop && styles.cardMobile]}>
        <Pressable style={styles.profileHeaderRow} onPress={handlePickImage} disabled={updating}>
          {pd.photo && pd.photo.length > 5 && pd.photo !== 'null' ? (
            <View style={[styles.avatar, { overflow: 'hidden' }]}>
              <Image source={{ uri: pd.photo }} style={{ width: '100%', height: '100%'}} resizeMode="cover" />
              <View style={styles.editAvatarOverlay}>
                <Camera size={14} color="#FFF" />
              </View>
            </View>
          ) : (
            <View style={styles.avatar}>
              <User size={32} color="#1E40AF" />
              <View style={styles.editAvatarOverlay}>
                <Camera size={14} color="#FFF" />
              </View>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.full_name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Building size={14} color={Colors.light.primary} style={{ marginRight: 6 }} />
              <Text style={styles.profileRole}>Dept: {departmentName || user.department_id}</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.detailsGrid}>
          {/* Column 1: Basic Info */}
          <View style={styles.infoCol}>
            <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Basic Info</Text>
            <View style={styles.infoSection}>
              <View style={styles.infoRow}><Mail size={16} color={Colors.light.icon} /><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoVal}>{user.email}</Text></View>
              <View style={styles.infoRow}><Phone size={16} color={Colors.light.icon} /><Text style={styles.infoLabel}>Mobile</Text><Text style={styles.infoVal}>{user.mobile || pd.phone || pd.mobile || 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Blood Group</Text><Text style={styles.infoVal}>{pd.bloodGroup || 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Emergency</Text><Text style={styles.infoVal}>{pd.emergencyContact || 'N/A'}</Text></View>
            </View>
          </View>

          {/* Column 2: Compliance & Identity */}
          <View style={styles.infoCol}>
            <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Compliance & Identity</Text>
            <View style={styles.infoSection}>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Aadhaar</Text><Text style={styles.infoVal}>{pd.aadhaar || 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>PAN Card</Text><Text style={styles.infoVal}>{pd.pan || 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>ESI ID</Text><Text style={styles.infoVal}>{pd.esi || 'N/A'}</Text></View>
            </View>
          </View>

          {/* Column 3: Payroll & Shifts */}
          <View style={styles.infoCol}>
            <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Payroll & Shifts</Text>
            <View style={styles.infoSection}>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Bank Name</Text><Text style={styles.infoVal}>{pd.bankName || 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Account No</Text><Text style={styles.infoVal}>{pd.accountNo || 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>IFSC</Text><Text style={styles.infoVal}>{pd.ifsc || 'N/A'}</Text></View>
              
              <View style={[styles.infoRow, { marginTop: 8 }]}><Text style={styles.infoLabel}>Shift In</Text><Text style={styles.infoVal}>{user.schedule_in || pd.shiftIn || 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Shift Out</Text><Text style={styles.infoVal}>{user.schedule_out || pd.shiftOut || 'N/A'}</Text></View>

              <View style={[styles.infoRow, { marginTop: 8 }]}><Text style={styles.infoLabel}>Status</Text><Text style={styles.infoVal}>{user.status}</Text></View>
              {pd.joiningDate && (
                <View style={[styles.infoRow, { marginTop: 8 }]}><Calendar size={16} color={Colors.light.icon} /><Text style={styles.infoLabel}>Joined</Text><Text style={styles.infoVal}>{pd.joiningDate}</Text></View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Change Password</Text>
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={16} color={Colors.light.icon} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                secureTextEntry={!showOld} 
                placeholder="••••••••"
                value={oldPassword}
                onChangeText={setOldPassword}
              />
              <Pressable onPress={() => setShowOld(!showOld)} style={styles.eyeIcon}>
                {showOld ? <EyeOff color={Colors.light.icon} size={18} /> : <Eye color={Colors.light.icon} size={18} />}
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={16} color={Colors.light.icon} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                secureTextEntry={!showNew} 
                placeholder="••••••••"
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Pressable onPress={() => setShowNew(!showNew)} style={styles.eyeIcon}>
                {showNew ? <EyeOff color={Colors.light.icon} size={18} /> : <Eye color={Colors.light.icon} size={18} />}
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={16} color={Colors.light.icon} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                secureTextEntry={!showConfirm} 
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon}>
                {showConfirm ? <EyeOff color={Colors.light.icon} size={18} /> : <Eye color={Colors.light.icon} size={18} />}
              </Pressable>
            </View>
          </View>

          <Pressable 
            style={[styles.submitBtn, updating && { opacity: 0.7 }]} 
            onPress={handleChangePassword}
            disabled={updating}
          >
            <Text style={styles.submitBtnText}>{updating ? 'Updating...' : 'Update Password'}</Text>
          </Pressable>
        </View>
      </View>

      {/* My Requests Section */}
      <View style={[styles.card, !isDesktop && styles.cardMobile, { marginTop: 32 }]}>
        <Text style={styles.sectionTitle}>My Update Requests</Text>
        {myRequests.length === 0 ? (
          <Text style={{ color: Colors.light.icon, fontStyle: 'italic' }}>No update requests found.</Text>
        ) : (
          <View style={{ gap: 16 }}>
            {myRequests.map((req, index) => {
              let reqData = req.requested_data;
              if (typeof reqData === 'string') {
                try { reqData = JSON.parse(reqData); } catch (e) {}
              }
              const keys = Object.keys(reqData).filter(k => reqData[k] !== undefined && reqData[k] !== '');
              
              let statusColor = '#94A3B8';
              let statusBg = '#F1F5F9';
              if (req.status === 'Approved') { statusColor = '#059669'; statusBg = '#D1FAE5'; }
              else if (req.status === 'Rejected') { statusColor = '#DC2626'; statusBg = '#FEE2E2'; }
              else if (req.status === 'Pending') { statusColor = '#D97706'; statusBg = '#FEF3C7'; }

              return (
                <View key={req.id || index} style={styles.requestItem}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: Colors.light.icon }}>Requested on: {new Date(req.created_at).toLocaleDateString()}</Text>
                    <View style={{ backgroundColor: statusBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 }}>
                      <Text style={{ color: statusColor, fontSize: 12, fontWeight: '700' }}>{req.status}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {keys.map(k => (
                      <View key={k} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, minWidth: 120, flex: 1, borderWidth: 1, borderColor: Colors.light.border }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.light.primary, marginBottom: 4, textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.light.text }}>{reqData[k]}</Text>
                      </View>
                    ))}
                  </View>
                  {req.rejection_reason ? (
                    <Text style={{ marginTop: 12, fontSize: 13, color: '#DC2626', backgroundColor: '#FEE2E2', padding: 8, borderRadius: 8 }}>
                      <Text style={{ fontWeight: '700' }}>Reason:</Text> {req.rejection_reason}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// Just importing CheckSquare for icon above
import { CheckSquare } from 'lucide-react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    ...Platform.select({ web: { boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' } })
  },
  cardMobile: {
    padding: 24,
  },
  
  profileHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 20, position: 'relative' },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#1E40AF' },
  editAvatarOverlay: { position: 'absolute', bottom: -2, right: -2, backgroundColor: Colors.light.primary, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  profileRole: { fontSize: 14, color: Colors.light.primary, fontWeight: '600' },
  
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 32 },
  infoCol: { flex: 1, minWidth: 280 },
  detailItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: Colors.light.border },
  detailText: { fontSize: 14, fontWeight: '600', color: Colors.light.text },

  infoSection: { gap: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 14, fontWeight: '600', color: Colors.light.icon, marginLeft: 8, width: 100 },
  infoVal: { fontSize: 14, fontWeight: '700', color: Colors.light.text, flex: 1, textAlign: 'right' },

  divider: { height: 1, backgroundColor: Colors.light.border, marginVertical: 32 },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text, marginBottom: 20 },
  formContainer: { gap: 20 },
  inputGroup: { width: '100%' },
  label: { fontSize: 13, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, backgroundColor: '#FFF' },
  inputIcon: { paddingHorizontal: 16 },
  input: { flex: 1, paddingVertical: 14, paddingRight: 14, fontSize: 14, color: Colors.light.text, ...Platform.select({ web: { outlineWidth: 0 as any } }) },
  eyeIcon: { padding: 14 },
  
  submitBtn: { backgroundColor: Colors.light.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100 },
  editBtnText: { color: Colors.light.primary, fontSize: 14, fontWeight: '700', marginLeft: 8 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 32, width: '100%', maxWidth: 500, maxHeight: '80%', ...Platform.select({ web: { boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' } }) },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginBottom: 24 },
  modalInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, padding: 14, fontSize: 14, color: Colors.light.text, ...Platform.select({ web: { outlineWidth: 0 as any } }) },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: Colors.light.icon, fontWeight: '700', fontSize: 15 },
  submitBtnModal: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  requestItem: { padding: 20, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.light.border, ...Platform.select({ web: { boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.05)' } }) },
});
