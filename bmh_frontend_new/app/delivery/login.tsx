import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, TextInput, Image, KeyboardAvoidingView, ScrollView } from 'react-native';
import { ArrowLeft, Clock, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { registerForPushNotificationsAsync } from '../../utils/pushNotifications';
import { useResponsive } from '../../hooks/useResponsive';

export default function EmployeePortal() {
  const router = useRouter();
  const { isDesktop } = useResponsive();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }
    setLoggingIn(true);
    try {
      const response = await axios.post('https://napi.bharatmedicalhallplus.com/employees/login', {
        email,
        password
      });
      if (response.data.success) {
        if (response.data.data.department !== 'Delivery') {
           alert('Access Denied. You are not registered as Delivery Staff.');
           setLoggingIn(false);
           return;
        }
        if (Platform.OS === 'web') {
          localStorage.setItem('employeeUser', JSON.stringify(response.data.data));
        } else {
          await AsyncStorage.setItem('employeeUser', JSON.stringify(response.data.data));
        }
        router.replace('/delivery/dashboard' as any);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Left Branding Side (Only visible on larger screens) */}
      {isDesktop && (
        <View style={styles.leftPanel}>
          <View style={styles.logoBox}>
             <Image source={require('../../assets/Logo.jpg')} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
          <Text style={styles.brandTitle}>Bharat Medical Hall</Text>
          <Text style={styles.brandDesc}>
            Connecting medical professionals and internal workflows seamlessly. Manage your workspace shifts and digital operational records in one secure portal environment.
          </Text>
          <View style={styles.dots}>
            <View style={styles.dotActive} />
            <View style={styles.dot} />
            <View style={styles.dot} />
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
              <Text style={styles.pageTitle}>Delivery Boy Portal</Text>
              <Text style={styles.pageSubtitle}>Sign in to access your deliveries and tasks.</Text>

              {/* Toggle Buttons */}
              <View style={styles.toggleContainer}>
                <Pressable 
                  style={styles.toggleBtnOutline}
                  onPress={() => router.push('/delivery/register' as any)}
                >
                  <Text style={styles.toggleBtnTextOutline}>Register</Text>
                </Pressable>
                <Pressable style={styles.toggleBtnSolid}>
                  <Text style={styles.toggleBtnTextSolid}>Login</Text>
                </Pressable>
              </View>

              {/* Login Form */}
              <View style={styles.loginForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput style={styles.input} placeholder="name@hospital.com" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} autoCapitalize="none" />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF' }}>
                    <TextInput style={[styles.input, { borderWidth: 0, flex: 1, backgroundColor: 'transparent' }]} placeholder="••••••••" secureTextEntry={!showPassword} placeholderTextColor="#94A3B8" value={password} onChangeText={setPassword} />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 14 }}>
                      {showPassword ? <EyeOff color="#94A3B8" size={18} /> : <Eye color="#94A3B8" size={18} />}
                    </Pressable>
                  </View>
                </View>
                <Pressable style={styles.loginBtn} onPress={handleLogin} disabled={loggingIn}>
                  <Text style={styles.loginBtnText}>{loggingIn ? 'Logging in...' : 'Secure Login'}</Text>
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
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  leftPanel: {
    flex: 1,
    backgroundColor: '#1E40AF', // Deep blue from screenshot
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  logoBox: {
    width: 120,
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    ...Platform.select({
      web: { boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }
    })
  },
  logoBadgeText: {
    fontSize: 50,
    fontWeight: '900',
    color: '#1E40AF',
    letterSpacing: -2,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  brandDesc: {
    fontSize: 15,
    color: '#BFDBFE',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 400,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 40,
  },
  dotActive: { width: 24, height: 4, backgroundColor: '#FFFFFF', borderRadius: 2 },
  dot: { width: 4, height: 4, backgroundColor: '#60A5FA', borderRadius: 2 },
  
  rightPanel: {
    flex: 1.2,
    backgroundColor: '#FFFFFF',
  },
  rightPanelMobile: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 40,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 60,
    maxWidth: 500,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  backBtnText: {
    color: '#1E40AF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 4,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoIcon: {
    color: '#3B82F6',
    fontWeight: '900',
    fontSize: 16,
    marginRight: 8,
  },
  headerLogoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  formContainer: {
    width: '100%',
    maxWidth: 500,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 40,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  toggleBtnOutline: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  toggleBtnTextOutline: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 15,
  },
  toggleBtnSolid: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
  },
  toggleBtnTextSolid: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  loginForm: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#1E293B',
    ...Platform.select({ web: { outlineWidth: 0 as any } })
  },
  loginBtn: {
    backgroundColor: '#1E40AF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  attendanceSection: {
    width: '100%',
  },
  attendanceBtns: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  dutyOnBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6', // Lighter blue
    paddingVertical: 14,
    borderRadius: 8,
  },
  dutyOffBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#475569', // Dark gray
    paddingVertical: 14,
    borderRadius: 8,
  },
  dutyBtnText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 15,
  }
});
