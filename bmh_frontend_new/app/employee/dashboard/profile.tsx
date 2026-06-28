import React, { useState, useEffect } from 'react';
import {  View, Text, StyleSheet, Platform, TextInput, Pressable, Alert, ScrollView , Image } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { Building, Lock, Mail, Phone, Clock, CreditCard, User, Camera } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';
import * as ImagePicker from 'expo-image-picker';
import { Edit2 } from 'lucide-react-native';
import { Modal } from 'react-native';

export default function EmployeeProfileScreen() {
  const { isDesktop } = useResponsive();
  const [user, setUser] = useState<any>(null);
  const [pd, setPd] = useState<any>({});
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [requestingUpdate, setRequestingUpdate] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const userStr = localStorage.getItem('employeeUser');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        if (parsed.profile_data) {
          try { setPd(JSON.parse(parsed.profile_data)); } catch (e) {}
        }
      }
    }
  }, []);

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
      const res = await axios.put(`https://bmh-eitu.onrender.com/employees/${user.id}/password`, {
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
      mobile: pd.mobile || '',
      bloodGroup: pd.bloodGroup || '',
      emergencyContact: pd.emergencyContact || '',
      address: pd.address || '',
      bankName: pd.bankName || '',
      accountNo: pd.accountNo || '',
      ifsc: pd.ifsc || ''
    });
    setEditModalVisible(true);
  };

  const handleRequestProfileUpdate = async () => {
    setRequestingUpdate(true);
    try {
      const res = await axios.post('https://bmh-eitu.onrender.com/profile-requests', {
        user_type: 'employee',
        user_id: user.id,
        department_name: user.department,
        requested_data: editForm
      });
      if (res.data.success) {
        Alert.alert('Success', 'Profile update requested! Waiting for admin approval.');
        setEditModalVisible(false);
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
        const res = await axios.put(`https://bmh-eitu.onrender.com/employees/${user.id}/profile`, {
          profile_data: newPd
        });
        
        if (res.data.success) {
          setPd(newPd);
          const updatedUser = { ...user, profile_data: JSON.stringify(newPd) };
          setUser(updatedUser);
          if (Platform.OS === 'web') {
            localStorage.setItem('employeeUser', JSON.stringify(updatedUser));
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
    <ScrollView style={[styles.container, !isDesktop && styles.containerMobile]} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>View your corporate credentials and manage your account.</Text>
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

      <View style={[styles.row, !isDesktop && styles.rowMobile]}>
        {/* Left Column: Password Management */}
        <View style={[styles.leftCol, !isDesktop && styles.colMobile]}>
          <View style={[styles.card, !isDesktop && styles.cardMobile]}>
            <Pressable style={styles.profileHeaderRow} onPress={handlePickImage} disabled={updating}>
              {pd.photo && pd.photo.length > 5 && pd.photo !== 'null' ? (
                <View style={[styles.avatar, { overflow: 'hidden' }]}>
                  <Image source={{ uri: pd.photo }} style={{ width: '100%', height: '100%'}} resizeMode="cover" />
                  <View style={styles.editAvatarOverlay}>
                    <Camera size={16} color="#FFF" />
                  </View>
                </View>
              ) : (
                <View style={styles.avatar}>
                  <User size={40} color="#1E40AF" />
                  <View style={styles.editAvatarOverlay}>
                    <Camera size={16} color="#FFF" />
                  </View>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.full_name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Building size={14} color={Colors.light.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.profileRole}>{user.role} - {user.department}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.light.primary, backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' }}>ID: {user.employee_id || 'PENDING'}</Text>
                </View>
              </View>
            </Pressable>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Change Password</Text>
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Current Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={16} color={Colors.light.icon} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    secureTextEntry 
                    placeholder="••••••••"
                    value={oldPassword}
                    onChangeText={setOldPassword}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={16} color={Colors.light.icon} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    secureTextEntry 
                    placeholder="••••••••"
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={16} color={Colors.light.icon} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    secureTextEntry 
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
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
        </View>

        {/* Right Column: Profile Metadata */}
        <View style={[styles.rightCol, !isDesktop && styles.colMobile]}>
          <View style={[styles.card, !isDesktop && styles.cardMobile]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={styles.sectionTitle}>Employee Information</Text>
              <Pressable style={styles.editBtn} onPress={openEditModal}>
                <Edit2 size={14} color={Colors.light.primary} />
                <Text style={styles.editBtnText}>Edit Details</Text>
              </Pressable>
            </View>
            
            <View style={styles.infoSection}>
              <View style={styles.infoRow}><Mail size={16} color={Colors.light.icon} /><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoVal}>{user.email}</Text></View>
              <View style={styles.infoRow}><Phone size={16} color={Colors.light.icon} /><Text style={styles.infoLabel}>Mobile</Text><Text style={styles.infoVal}>{pd.mobile || 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Blood Group</Text><Text style={styles.infoVal}>{pd.bloodGroup || 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Emergency</Text><Text style={styles.infoVal}>{pd.emergencyContact || 'N/A'}</Text></View>
            </View>

            <View style={styles.divider} />
            <Text style={[styles.sectionTitle, { marginBottom: 24 }]}>Compliance & Identity</Text>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Aadhaar</Text><Text style={styles.infoVal}>{pd.aadhaar || 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>PAN Card</Text><Text style={styles.infoVal}>{pd.pan || 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>ESI ID</Text><Text style={styles.infoVal}>{pd.esi || 'N/A'}</Text></View>
            </View>

            <View style={styles.divider} />
            <Text style={[styles.sectionTitle, { marginBottom: 24 }]}>Payroll & Shifts</Text>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}><CreditCard size={16} color={Colors.light.icon} /><Text style={styles.infoLabel}>Base Salary</Text><Text style={styles.infoVal}>{pd.salary ? `₹${pd.salary}` : 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Bank Name</Text><Text style={styles.infoVal}>{pd.bankName || 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Account No</Text><Text style={styles.infoVal}>{pd.accountNo || 'N/A'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>IFSC</Text><Text style={styles.infoVal}>{pd.ifsc || 'N/A'}</Text></View>
              
              <View style={[styles.infoRow, { marginTop: 8 }]}><Clock size={16} color={Colors.light.icon} /><Text style={styles.infoLabel}>Shift Time</Text><Text style={styles.infoVal}>{pd.shiftIn || 'N/A'} to {pd.shiftOut || 'N/A'}</Text></View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, padding: 32 },
  containerMobile: { padding: 16 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  
  row: { flexDirection: 'row', gap: 32, alignItems: 'flex-start' },
  rowMobile: { flexDirection: 'column' },
  leftCol: { flex: 1, minWidth: 350 },
  rightCol: { flex: 1, minWidth: 350 },
  colMobile: { minWidth: '100%' },

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
  
  profileHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 20, position: 'relative' },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#1E40AF' },
  editAvatarOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.light.primary, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: '700', color: Colors.light.text },
  profileRole: { fontSize: 14, color: Colors.light.primary, fontWeight: '600' },
  
  divider: { height: 1, backgroundColor: Colors.light.border, marginVertical: 32 },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text, marginBottom: 20 },
  formContainer: { gap: 20 },
  inputGroup: { width: '100%' },
  label: { fontSize: 13, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, backgroundColor: '#FFF' },
  inputIcon: { paddingHorizontal: 16 },
  input: { flex: 1, paddingVertical: 14, paddingRight: 14, fontSize: 14, color: Colors.light.text, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  
  submitBtn: { backgroundColor: Colors.light.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  infoSection: { gap: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 14, fontWeight: '600', color: Colors.light.icon, marginLeft: 8, width: 100 },
  infoVal: { fontSize: 14, fontWeight: '700', color: Colors.light.text, flex: 1, textAlign: 'right' },
  
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  editBtnText: { color: Colors.light.primary, fontSize: 13, fontWeight: '700', marginLeft: 6 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 32, width: '100%', maxWidth: 500, maxHeight: '80%', ...Platform.select({ web: { boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' } }) },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginBottom: 24 },
  modalInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, padding: 14, fontSize: 14, color: Colors.light.text, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: Colors.light.icon, fontWeight: '700', fontSize: 15 },
  submitBtnModal: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
});
