import React, { useState, useEffect } from 'react';
import {  View, Text, StyleSheet, Platform, TextInput, Pressable, Alert, ScrollView , Image } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { Building, Lock, Mail, Phone, Clock, CreditCard } from 'lucide-react-native';

export default function EmployeeProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [pd, setPd] = useState<any>({});
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

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
      const res = await axios.put(`http://localhost:5000/employees/${user.id}/password`, {
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

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>View your corporate credentials and manage your account.</Text>
      </View>

      <View style={styles.row}>
        {/* Left Column: Password Management */}
        <View style={styles.leftCol}>
          <View style={styles.card}>
            <View style={styles.profileHeaderRow}>
              {pd.photo ? (
                <View style={[styles.avatar, { overflow: 'hidden' }]}>
                  <Image source={{ uri: pd.photo }} style={{ width: '100%', height: '100%'}} resizeMode="cover" />
                </View>
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user.full_name?.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.full_name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Building size={14} color={Colors.light.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.profileRole}>{user.role} - {user.department}</Text>
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
        <View style={styles.rightCol}>
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { marginBottom: 24 }]}>Employee Information</Text>
            
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
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  
  row: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 32, alignItems: 'flex-start' },
  leftCol: { flex: 1, minWidth: 350 },
  rightCol: { flex: 1, minWidth: 350 },

  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    ...Platform.select({ web: { boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' } })
  },
  
  profileHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#1E40AF' },
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
});
