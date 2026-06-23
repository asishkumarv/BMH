import React, { useState } from 'react';
import {  View, Text, StyleSheet, Pressable, Platform, TextInput, KeyboardAvoidingView, ScrollView, ActivityIndicator, Alert , Image } from 'react-native';
import { ArrowLeft, CheckCircle2, Camera, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';
import { useResponsive } from '../../hooks/useResponsive';

export default function SubAdminRegisterScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registering, setRegistering] = useState(false);

  React.useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await axios.get('http://localhost:5000/department');
        if (res.data.success) {
          setDepartments(res.data.data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchDepts();
  }, []);

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      if (result.assets[0].base64) {
        setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      } else {
        setPhoto(result.assets[0].uri);
      }
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !selectedDept || !password) {
      Alert.alert('Error', 'Please fill in all required fields and select a department.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setRegistering(true);
    try {
      const res = await axios.post('http://localhost:5000/admin/department-admins', {
        full_name: fullName,
        email,
        password,
        department_id: selectedDept,
        profile_data: {
          photo,
          phone,
          joiningDate
        }
      });
      if (res.data.success) {
        Alert.alert('Success', 'Registered successfully!');
        router.replace('/department/login' as any);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Left Branding Side */}
      {isDesktop && (
        <View style={styles.leftPanel}>
          <View style={styles.logoBox}>
             <Image source={require('../../assets/Logo.jpg')} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
          <Text style={styles.brandTitle}>Welcome Sub-Admin</Text>
          <Text style={styles.brandDesc}>
            Set up your sub-administrative account to coordinate departments, manage staff shifts, and ensure smooth hospital workflow.
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <CheckCircle2 color="#34D399" size={20} />
              <Text style={styles.featureText}>Department & Resource Coordination</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle2 color="#34D399" size={20} />
              <Text style={styles.featureText}>Real-Time Token & Appointment Scheduling</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle2 color="#34D399" size={20} />
              <Text style={styles.featureText}>Staff Shift & Break Tracking Systems</Text>
            </View>
          </View>
        </View>
      )}

      {/* Right Form Side */}
      <View style={[styles.rightPanel, !isDesktop && styles.rightPanelMobile]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            
                        <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', marginBottom: 32 }]}>
              <Pressable style={[styles.backBtn, { marginBottom: 0 }]} onPress={() => router.back()}>
                <ArrowLeft color="#1E40AF" size={16} />
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
              
              <View style={{ flex: 1, alignItems: 'center', marginRight: 60 }}>
                <Image source={require('../../assets/CompanyLogo.jpg')} style={{ width: 220, height: 60 }} resizeMode="contain" />
              </View>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.formTitleRow}>
                <View>
                  <Text style={styles.pageTitle}>Sub Admin Register</Text>
                  <Text style={styles.pageSubtitle}>Fill in details to create your admin account.</Text>
                </View>
                <Pressable style={styles.photoUpload} onPress={handlePickImage}>
                  {photo ? (
                    <View style={{ width: '100%', height: '100%', borderRadius: 35, overflow: 'hidden' }}>
                      <Image source={{ uri: photo }} style={{ width: '100%', height: '100%'}} resizeMode="cover" />
                    </View>
                  ) : (
                    <>
                      <Camera color="#3B82F6" size={24} />
                      <Text style={styles.photoText}>PHOTO</Text>
                    </>
                  )}
                </Pressable>
              </View>

              <View style={styles.gridContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput style={styles.input} placeholder="John Doe" placeholderTextColor="#94A3B8" value={fullName} onChangeText={setFullName} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address *</Text>
                  <TextInput style={styles.input} placeholder="name@hospital.com" keyboardType="email-address" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} />
                </View>

                {/* Select Department Section */}
                <View style={[styles.inputGroup, { width: '100%' }]}>
                  <Text style={styles.label}>Assign to Department *</Text>
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.light.primary} />
                  ) : (
                    <View style={styles.deptOptionsGrid}>
                      {departments.length === 0 && <Text style={{ color: '#94A3B8' }}>No departments available. Create one from Super Admin.</Text>}
                      {departments.map(dept => (
                        <Pressable 
                          key={dept.id}
                          style={[styles.deptOption, selectedDept === dept.id && styles.deptOptionSelected]}
                          onPress={() => setSelectedDept(dept.id)}
                        >
                          <Text style={[styles.deptOptionText, selectedDept === dept.id && styles.deptOptionTextSelected]}>
                            {dept.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput style={styles.input} placeholder="10-digit number" keyboardType="numeric" maxLength={10} placeholderTextColor="#94A3B8" value={phone} onChangeText={setPhone} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Joining Date</Text>
                  {Platform.OS === 'web' ? (
                    <input type="date" style={styles.webInput} value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
                  ) : (
                    <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8" value={joiningDate} onChangeText={setJoiningDate} />
                  )}
                </View>


                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password *</Text>
                  <View style={styles.passwordWrapper}>
                    <TextInput style={styles.inputPassword} placeholder="••••••••" secureTextEntry={!showPassword} placeholderTextColor="#94A3B8" value={password} onChangeText={setPassword} />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      {showPassword ? <EyeOff color="#94A3B8" size={18} /> : <Eye color="#94A3B8" size={18} />}
                    </Pressable>
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password *</Text>
                  <View style={styles.passwordWrapper}>
                    <TextInput style={styles.inputPassword} placeholder="••••••••" secureTextEntry={!showConfirmPassword} placeholderTextColor="#94A3B8" value={confirmPassword} onChangeText={setConfirmPassword} />
                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                      {showConfirmPassword ? <EyeOff color="#94A3B8" size={18} /> : <Eye color="#94A3B8" size={18} />}
                    </Pressable>
                  </View>
                </View>
              </View>

              <Pressable style={[styles.submitBtn, registering && { opacity: 0.7 }]} onPress={handleRegister} disabled={registering}>
                <Text style={styles.submitBtnText}>{registering ? 'Registering...' : 'Register Account →'}</Text>
              </Pressable>

              <View style={styles.loginLinkRow}>
                <Text style={styles.loginLinkText}>Already have an account? </Text>
                <Pressable onPress={() => router.push('/department/login')}>
                  <Text style={styles.loginLinkAction}>Sign In</Text>
                </Pressable>
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#FFFFFF' },
  leftPanel: { flex: 1, backgroundColor: '#1E40AF', justifyContent: 'center', alignItems: 'center', padding: 60 },
  logoBox: { width: 100, height: 100, backgroundColor: '#FFFFFF', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  logoBadgeText: { fontSize: 40, fontWeight: '900', color: '#1E40AF', letterSpacing: -2 },
  brandTitle: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginBottom: 16, textAlign: 'center' },
  brandDesc: { fontSize: 15, color: '#BFDBFE', textAlign: 'center', lineHeight: 24, maxWidth: 400, marginBottom: 40 },
  featuresList: { width: '100%', maxWidth: 400, gap: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e3a8a', padding: 16, borderRadius: 12 },
  featureText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 12 },
  
  rightPanel: { flex: 1.2, backgroundColor: '#FFFFFF' },
  rightPanelMobile: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 40, alignItems: 'center' },
  
  header: { width: '100%', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 40, maxWidth: 600 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtnText: { color: '#1E40AF', fontWeight: '700', fontSize: 14, marginLeft: 4 },
  headerLogo: { flexDirection: 'row', alignItems: 'center' },
  headerLogoIcon: { color: '#3B82F6', fontWeight: '900', fontSize: 18, marginRight: 8 },
  headerLogoText: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  
  formContainer: { width: '100%', maxWidth: 600 },
  formTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#64748B' },
  photoUpload: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderColor: '#BFDBFE', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  photoText: { fontSize: 10, fontWeight: '700', color: '#3B82F6', marginTop: 4 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 32 },
  inputGroup: { width: Platform.OS === 'web' ? '48%' : '100%', minWidth: 200 },
  label: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 14, fontSize: 14, color: '#1E293B', ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  webInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 14, fontSize: 14, color: '#1E293B', width: '100%', fontFamily: 'inherit', ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF' },
  inputPassword: { flex: 1, padding: 14, fontSize: 14, color: '#1E293B', ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  eyeIcon: { padding: 14 },
  
  submitBtn: { backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginBottom: 24 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  
  loginLinkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginLinkText: { color: '#64748B', fontSize: 14 },
  loginLinkAction: { color: '#1E40AF', fontSize: 14, fontWeight: '700' },

  deptOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  deptOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  deptOptionSelected: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  deptOptionText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  deptOptionTextSelected: { color: '#3B82F6', fontWeight: '700' },
});
