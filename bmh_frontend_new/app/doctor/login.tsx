import React, { useState } from 'react';
import {  View, Text, StyleSheet, Pressable, Platform, TextInput, KeyboardAvoidingView, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { ArrowLeft, ShieldCheck, Eye, EyeOff, Activity, Stethoscope } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useResponsive } from '../../hooks/useResponsive';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DoctorLoginScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!emailOrId || !password) {
      if (Platform.OS === 'web') {
        window.alert('Please fill all required fields');
      } else {
        Alert.alert('Error', 'Please fill all required fields');
      }
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post('https://bmh-eitu.onrender.com/doctors/login', {
        emailOrId,
        password,
      });

      if (response.data.success) {
        await AsyncStorage.setItem('userToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.doctor));
        await AsyncStorage.setItem('userRole', 'Doctor');
        router.replace('/doctor/dashboard');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Login failed. Please try again.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
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
          <Text style={styles.brandTitle}>Doctor Portal</Text>
          <Text style={styles.brandDesc}>
            Access your consultation schedule, manage patient queue efficiently, and view your revenue securely.
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Stethoscope color="#34D399" size={20} />
              <Text style={styles.featureText}>Live Patient Queue Tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <ShieldCheck color="#60A5FA" size={20} />
              <Text style={styles.featureText}>Secure Appointments</Text>
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
                  <Text style={styles.pageTitle}>Doctor Sign In</Text>
                  <Text style={styles.pageSubtitle}>Enter your Doctor ID or Email to access your dashboard.</Text>
                </View>
              </View>

              <View style={styles.gridContainer}>
                <View style={[styles.inputGroup, { width: '100%' }]}>
                  <Text style={styles.label}>Doctor ID or Email Address</Text>
                  <TextInput style={styles.input} placeholder="e.g. CARDD1 or doctor@bmh.com" autoCapitalize="none" placeholderTextColor="#94A3B8" value={emailOrId} onChangeText={setEmailOrId} />
                </View>

                <View style={[styles.inputGroup, { width: '100%' }]}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordWrapper}>
                    <TextInput style={styles.inputPassword} placeholder="••••••••" secureTextEntry={!showPassword} placeholderTextColor="#94A3B8" value={password} onChangeText={setPassword} />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 14 }}>
                      {showPassword ? <EyeOff color="#94A3B8" size={18} /> : <Eye color="#94A3B8" size={18} />}
                    </Pressable>
                  </View>
                </View>
              </View>

              <Pressable style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitBtnText}>Sign In →</Text>}
              </Pressable>

              <View style={styles.loginLinkRow}>
                <Text style={styles.loginLinkText}>Don't have an account? </Text>
                <Pressable onPress={() => router.push('/doctor/register')}>
                  <Text style={styles.loginLinkAction}>Register Here</Text>
                </Pressable>
              </View>
              
              <View style={[styles.loginLinkRow, { marginTop: 20 }]}>
                <Pressable onPress={() => router.push('/employee/login' as any)}>
                  <Text style={styles.loginLinkText}>Go to Employee Portal</Text>
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
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 14, fontSize: 14, color: '#1E293B', ...Platform.select({ web: { outlineWidth: 0 as any } }) },
  
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF' },
  inputPassword: { flex: 1, padding: 14, fontSize: 14, color: '#1E293B', ...Platform.select({ web: { outlineWidth: 0 as any } }) },
  
  submitBtn: { backgroundColor: Colors.light.primary, paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginBottom: 24 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  
  loginLinkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginLinkText: { color: '#64748B', fontSize: 14 },
  loginLinkAction: { color: Colors.light.primary, fontSize: 14, fontWeight: '700' }
});
