import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Phone, Mail, Home, Shield, Lock, Save, CheckCircle } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { useResponsive } from '../../hooks/useResponsive';
import axios from 'axios';

export default function ProfileSettings() {
  const { isMobile } = useResponsive();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [guardianName, setGuardianName] = useState('');
  
  // Password states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const patientData = await AsyncStorage.getItem('patientUser');
        if (patientData) {
          const p = JSON.parse(patientData);
          setPatient(p);
          setName(p.name || '');
          setEmail(p.email || '');
          setAge(p.age ? p.age.toString() : '');
          setGender(p.gender || 'Male');
          setBloodGroup(p.blood_group || '');
          setCity(p.city || '');
          setPinCode(p.pin_code || '');
          setGuardianName(p.guardian_name || '');
        }
      } catch (err) {
        console.error('Failed to load patient profile', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !age.trim()) {
      Alert.alert('Required Fields', 'Name and Age are required');
      return;
    }

    if (password && password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    setSaving(true);
    setSuccess(false);
    try {
      const payload = {
        name,
        email,
        age: parseInt(age),
        gender,
        blood_group: bloodGroup,
        city,
        pin_code: pinCode,
        guardian_name: guardianName,
        ...(password ? { password, confirm_password: confirmPassword } : {})
      };

      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/patient/profile/${patient.id}`, payload);
      if (res.data.success && res.data.patient) {
        // Update local patient state and AsyncStorage
        const updatedPatient = { ...patient, ...res.data.patient };
        setPatient(updatedPatient);
        await AsyncStorage.setItem('patientUser', JSON.stringify(updatedPatient));
        setSuccess(true);
        setPassword('');
        setConfirmPassword('');
        
        setTimeout(() => {
          setSuccess(false);
        }, 3000);

        if (Platform.OS === 'web') {
          window.alert('Profile updated successfully!');
        } else {
          Alert.alert('Success', 'Profile updated successfully!');
        }
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Update Failed', err.response?.data?.message || 'Server error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile Settings</Text>
        <Text style={styles.subtitle}>Update your personal health details, contact information, and manage credentials.</Text>
      </View>

      <View style={[styles.profileSplit, isMobile && { flexDirection: 'column' }]}>
        
        {/* Left Card: General Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeader}>Personal & Contact Details</Text>
          
          <View style={styles.formGrid}>
            <View style={styles.inputGroup}>
              <Text style={styles.formLabel}>Full Name *</Text>
              <View style={styles.inputWrapper}>
                <User size={16} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Full Name"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.formLabel}>Mobile Number (Username)</Text>
              <View style={[styles.inputWrapper, styles.disabledWrapper]}>
                <Phone size={16} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={patient?.mobile}
                  editable={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.formLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={16} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.formLabel}>Age *</Text>
                <TextInput
                  style={styles.simpleInput}
                  value={age}
                  onChangeText={setAge}
                  placeholder="Age"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Gender</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, gender === 'Male' && styles.toggleBtnActive]} 
                    onPress={() => setGender('Male')}
                  >
                    <Text style={[styles.toggleText, gender === 'Male' && styles.toggleTextActive]}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, gender === 'Female' && styles.toggleBtnActive]} 
                    onPress={() => setGender('Female')}
                  >
                    <Text style={[styles.toggleText, gender === 'Female' && styles.toggleTextActive]}>Female</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.formLabel}>Blood Group</Text>
                <TextInput
                  style={styles.simpleInput}
                  value={bloodGroup}
                  onChangeText={setBloodGroup}
                  placeholder="e.g. O+"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Guardian Name</Text>
                <TextInput
                  style={styles.simpleInput}
                  value={guardianName}
                  onChangeText={setGuardianName}
                  placeholder="Guardian Name"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.formLabel}>City</Text>
                <TextInput
                  style={styles.simpleInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Pin Code</Text>
                <TextInput
                  style={styles.simpleInput}
                  value={pinCode}
                  onChangeText={setPinCode}
                  placeholder="Postal Code"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Right Column: Security & Update Action */}
        <View style={styles.securityColumn}>
          
          {/* Card 2: Security & Password */}
          <View style={styles.securityCard}>
            <Text style={styles.cardHeader}>Change Password</Text>
            <Text style={styles.cardSub}>Leave these fields blank if you do not wish to change your password.</Text>
            
            <View style={styles.formGrid}>
              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>Confirm New Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    secureTextEntry
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Success / Saving indicators */}
          {success && (
            <View style={styles.successBox}>
              <CheckCircle size={16} color={Colors.light.success} style={{ marginRight: 8 }} />
              <Text style={styles.successText}>Changes saved successfully!</Text>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveBtn, saving && { opacity: 0.8 }]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Save size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Profile Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginTop: 6,
  },
  profileSplit: {
    flexDirection: 'row',
    gap: 24,
  },
  infoCard: {
    flex: 1.3,
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 24,
  },
  securityColumn: {
    flex: 1,
    flexDirection: 'column',
    gap: 24,
  },
  securityCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 24,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginBottom: 20,
    lineHeight: 16,
  },
  formGrid: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  disabledWrapper: {
    backgroundColor: '#F8FAFC',
    borderColor: Colors.light.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    padding: 0,
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },
  disabledInput: {
    color: Colors.light.textMuted,
  },
  simpleInput: {
    height: 40,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#FFF',
    color: Colors.light.text,
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  toggleRow: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  toggleBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.light.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  toggleTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: Colors.light.primary,
    height: 46,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.success,
  },
});
