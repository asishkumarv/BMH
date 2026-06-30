import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TextInput, Pressable, Alert, ScrollView, Image } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../constants/Colors';
import { ShieldCheck, Lock, Eye, EyeOff, Camera } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';
import * as ImagePicker from 'expo-image-picker';

export default function SuperAdminProfileScreen() {
  const { isDesktop } = useResponsive();
  const [user, setUser] = useState<any>(null);
  const [pd, setPd] = useState<any>({});
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const init = async () => {
      let userStr = null;
      if (Platform.OS === 'web') {
        userStr = localStorage.getItem('superAdminUser');
      } else {
        userStr = await AsyncStorage.getItem('superAdminUser');
      }
      
      if (userStr) {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        if (parsed.profile_data) {
          try { setPd(JSON.parse(parsed.profile_data)); } catch (e) {}
        }
      }
    };
    init();
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
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/admin/super-admins/${user.id}/password`, {
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
        const res = await axios.put(`https://napi.bharatmedicalhallplus.com/admin/super-admins/${user.id}/profile`, {
          profile_data: newPd
        });
        
        if (res.data.success) {
          setPd(newPd);
          const updatedUser = { ...user, profile_data: JSON.stringify(newPd) };
          setUser(updatedUser);
          if (Platform.OS === 'web') {
            localStorage.setItem('superAdminUser', JSON.stringify(updatedUser));
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
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>Manage your super admin credentials</Text>
      </View>

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
              <ShieldCheck color="#1E40AF" size={32} />
              <View style={styles.editAvatarOverlay}>
                <Camera size={14} color="#FFF" />
              </View>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.email}</Text>
            <Text style={styles.profileRole}>Super Administrator</Text>
          </View>
        </Pressable>

        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, marginTop: 24 }}>
          {pd.phone && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 }}>
              <Text style={{ fontWeight: '600', color: Colors.light.icon, marginRight: 8 }}>Phone:</Text>
              <Text style={{ fontWeight: '700', color: Colors.light.text }}>{pd.phone}</Text>
            </View>
          )}
          {pd.joinDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 }}>
              <Text style={{ fontWeight: '600', color: Colors.light.icon, marginRight: 8 }}>Joined:</Text>
              <Text style={{ fontWeight: '700', color: Colors.light.text }}>{pd.joinDate}</Text>
            </View>
          )}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 32,
    maxWidth: 600,
    ...Platform.select({ web: { boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' } })
  },
  cardMobile: {
    padding: 24,
  },
  
  profileHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 20, position: 'relative' },
  editAvatarOverlay: { position: 'absolute', bottom: -2, right: -2, backgroundColor: Colors.light.primary, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  profileRole: { fontSize: 14, color: Colors.light.primary, fontWeight: '600', marginTop: 4 },
  
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
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 }
});
