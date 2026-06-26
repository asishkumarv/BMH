import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, TextInput, KeyboardAvoidingView, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { ArrowLeft, ShieldCheck, Eye, EyeOff, Stethoscope } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useResponsive } from '../../hooks/useResponsive';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';

export default function DoctorRegisterScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    department: '',
    role: 'Doctor',
    experience: '',
    gender: 'Male',
    description: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get('https://bmh-eitu.onrender.com/department');
        const depts = res.data.data || [];
        setDepartments(depts);
        if (depts.length > 0 && !form.department) {
          setForm(prev => ({ ...prev, department: depts[0].name }));
        }
      } catch (err) {
        console.error('Failed to fetch departments');
      }
    };
    fetchDepartments();
  }, []);

  const handleRegister = async () => {
    if (!form.full_name || !form.email || !form.password || !form.department) {
      const msg = 'Please fill in all required fields (*)';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post('https://bmh-eitu.onrender.com/doctors/register', form);
      if (response.data.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={[styles.rightPanel, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={{ maxWidth: 500, padding: 40, backgroundColor: '#FFFFFF', borderRadius: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
            <Text style={[styles.pageTitle, { textAlign: 'center' }]}>Registration Submitted</Text>
            <Text style={[styles.pageSubtitle, { textAlign: 'center', marginTop: 16, marginBottom: 32 }]}>
              Your doctor profile has been created and is currently pending approval from the administration. You will be able to log in once approved.
            </Text>
            <Pressable style={styles.submitBtn} onPress={() => router.replace('/doctor/login')}>
              <Text style={styles.submitBtnText}>Return to Login</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Left Branding Side */}
      {isDesktop && (
        <View style={styles.leftPanel}>
          <View style={styles.logoBox}>
             <Image source={require('../../assets/Logo.jpg')} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
          <Text style={styles.brandTitle}>Doctor Portal</Text>
          <Text style={styles.brandDesc}>
            Join the BMH network. Register your profile to manage your schedules and track your patients seamlessly.
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Stethoscope color="#34D399" size={20} />
              <Text style={styles.featureText}>Streamlined Operations</Text>
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
                  <Text style={styles.pageTitle}>Doctor Registration</Text>
                  <Text style={styles.pageSubtitle}>Apply for a doctor portal account.</Text>
                </View>
              </View>

              <View style={styles.gridContainer}>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput style={styles.input} placeholder="Dr. John Doe" placeholderTextColor="#94A3B8" value={form.full_name} onChangeText={(t) => setForm({...form, full_name: t})} />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address *</Text>
                  <TextInput style={styles.input} placeholder="doctor@bmh.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#94A3B8" value={form.email} onChangeText={(t) => setForm({...form, email: t})} />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password *</Text>
                  <View style={styles.passwordWrapper}>
                    <TextInput style={styles.inputPassword} placeholder="••••••••" secureTextEntry={!showPassword} placeholderTextColor="#94A3B8" value={form.password} onChangeText={(t) => setForm({...form, password: t})} />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 14 }}>
                      {showPassword ? <EyeOff color="#94A3B8" size={18} /> : <Eye color="#94A3B8" size={18} />}
                    </Pressable>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput style={styles.input} placeholder="10-digit number" keyboardType="phone-pad" placeholderTextColor="#94A3B8" value={form.phone_number} onChangeText={(t) => setForm({...form, phone_number: t})} />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Department *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={form.department}
                      onValueChange={(itemValue) => setForm({...form, department: itemValue})}
                      style={styles.picker}
                    >
                      {departments.map((d, i) => (
                        <Picker.Item key={i} label={d.name} value={d.name} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Role *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={form.role}
                      onValueChange={(itemValue) => setForm({...form, role: itemValue})}
                      style={styles.picker}
                    >
                      <Picker.Item label="Doctor" value="Doctor" />
                      <Picker.Item label="Senior Consultant" value="Senior Consultant" />
                      <Picker.Item label="Surgeon" value="Surgeon" />
                      <Picker.Item label="Specialist" value="Specialist" />
                    </Picker>
                  </View>
                </View>

                <View style={[styles.inputGroup, { width: Platform.OS === 'web' ? '22%' : '48%', minWidth: 100 }]}>
                  <Text style={styles.label}>Experience (Yrs)</Text>
                  <TextInput style={styles.input} placeholder="e.g. 5" keyboardType="numeric" placeholderTextColor="#94A3B8" value={form.experience} onChangeText={(t) => setForm({...form, experience: t})} />
                </View>

                <View style={[styles.inputGroup, { width: Platform.OS === 'web' ? '22%' : '48%', minWidth: 100 }]}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={form.gender}
                      onValueChange={(itemValue) => setForm({...form, gender: itemValue})}
                      style={styles.picker}
                    >
                      <Picker.Item label="Male" value="Male" />
                      <Picker.Item label="Female" value="Female" />
                      <Picker.Item label="Other" value="Other" />
                    </Picker>
                  </View>
                </View>

                <View style={[styles.inputGroup, { width: '100%' }]}>
                  <Text style={styles.label}>Short Description / Bio</Text>
                  <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Brief bio..." multiline placeholderTextColor="#94A3B8" value={form.description} onChangeText={(t) => setForm({...form, description: t})} />
                </View>
              </View>

              <Pressable style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitBtnText}>Submit Registration →</Text>}
              </Pressable>

              <View style={styles.loginLinkRow}>
                <Text style={styles.loginLinkText}>Already approved? </Text>
                <Pressable onPress={() => router.push('/doctor/login')}>
                  <Text style={styles.loginLinkAction}>Sign in here</Text>
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
  leftPanel: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 60 },
  logoBox: { width: 100, height: 100, backgroundColor: '#FFFFFF', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  brandTitle: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginBottom: 16, textAlign: 'center' },
  brandDesc: { fontSize: 15, color: '#94a3b8', textAlign: 'center', lineHeight: 24, maxWidth: 400, marginBottom: 40 },
  featuresList: { width: '100%', maxWidth: 400, gap: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 16, borderRadius: 12 },
  featureText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 12 },
  
  rightPanel: { flex: 1.2, backgroundColor: '#FFFFFF' },
  rightPanelMobile: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 40, alignItems: 'center' },
  
  header: { width: '100%', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 40, maxWidth: 600 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtnText: { color: '#1E40AF', fontWeight: '700', fontSize: 14, marginLeft: 4 },
  
  formContainer: { width: '100%', maxWidth: 600 },
  formTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#64748B' },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 32 },
  inputGroup: { width: Platform.OS === 'web' ? '48%' : '100%', minWidth: 200 },
  label: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 14, fontSize: 14, color: '#1E293B', ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  pickerContainer: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' },
  picker: { padding: 14, fontSize: 14, color: '#1E293B', ...Platform.select({ web: { outlineStyle: 'none' as any, border: 'none', backgroundColor: 'transparent' } }) },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF' },
  inputPassword: { flex: 1, padding: 14, fontSize: 14, color: '#1E293B', ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  
  submitBtn: { backgroundColor: Colors.light.primary, paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginBottom: 24 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  
  loginLinkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginLinkText: { color: '#64748B', fontSize: 14 },
  loginLinkAction: { color: Colors.light.primary, fontSize: 14, fontWeight: '700' }
});
