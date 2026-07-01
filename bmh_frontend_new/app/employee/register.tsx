import React, { useState } from 'react';
import {  View, Text, StyleSheet, Pressable, Platform, TextInput, KeyboardAvoidingView, ScrollView, ActivityIndicator, Alert , Image } from 'react-native';
import { ArrowLeft, CheckCircle2, Camera, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';
import { useResponsive } from '../../hooks/useResponsive';

export default function EmployeeRegisterScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamic Data
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [roles, setRoles] = useState<{id: string, name: string, departmentId: string}[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Extended Profile State
  const [mobile, setMobile] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [pan, setPan] = useState('');
  const [esi, setEsi] = useState('');
  const [manager, setManager] = useState('');
  const [salary, setSalary] = useState('');
  const [empType, setEmpType] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [shiftIn, setShiftIn] = useState('');
  const [shiftOut, setShiftOut] = useState('');
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');
  const [tempAddr1, setTempAddr1] = useState('');
  const [tempCity, setTempCity] = useState('');
  const [tempState, setTempState] = useState('');
  const [permAddr1, setPermAddr1] = useState('');
  const [permCity, setPermCity] = useState('');
  const [permState, setPermState] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [accountNo, setAccountNo] = useState('');
  
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [registering, setRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, roleRes] = await Promise.all([
          axios.get('https://napi.bharatmedicalhallplus.com/department'),
          axios.get('https://napi.bharatmedicalhallplus.com/roles')
        ]);
        if (deptRes.data.success) setDepartments(deptRes.data.data);
        if (roleRes.data.success) setRoles(roleRes.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Filter roles to show only those matching the selected department OR global ('all')
  const availableRoles = roles.filter(r => r.departmentId === 'all' || r.departmentId === String(selectedDept));

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

  const validatePassword = (pass: string) => {
    const hasCapital = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const isLongEnough = pass.length >= 6;
    if (!hasCapital || !hasNumber || !hasSpecial || !isLongEnough) {
        return 'Password must be at least 6 characters long and include a capital letter, a number, and a special character.';
    }
    return null;
  }

  const handleRegister = async () => {
    setErrorMessage('');
    setPasswordError('');
    setSuccessMessage('');
    
    if (!fullName || !email || !selectedDept || !selectedRole || !password) {
      setErrorMessage('Please fill in required fields, select a department, and a role.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    const passErr = validatePassword(password);
    if (passErr) {
      setPasswordError(passErr);
      return;
    }

    setRegistering(true);
    try {
      const selectedDeptObj = departments.find(d => String(d.id) === String(selectedDept));
      const selectedRoleObj = roles.find(r => String(r.id) === String(selectedRole));

      const profile_data = {
        mobile, emergencyContact, age, bloodGroup, aadhaar, pan, esi, manager, salary, empType, jobDesc, shiftIn, shiftOut, breakStart, breakEnd, tempAddr1, tempCity, tempState, permAddr1, permCity, permState, ifsc, bankName, branch, accountNo, photo
      };

      const res = await axios.post('https://napi.bharatmedicalhallplus.com/employees', {
        full_name: fullName,
        email,
        password,
        department: selectedDeptObj?.name || selectedDept,
        role: selectedRoleObj?.name || selectedRole,
        profile_data
      });
      if (res.data.success) {
        setSuccessMessage('Successfully registered! You can login after admin approval.');
        setTimeout(() => {
          router.replace('/employee/login' as any);
        }, 3000);
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Registration failed');
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
          <Text style={styles.brandTitle}>Staff Registration</Text>
          <Text style={styles.brandDesc}>
            Create a unified, enterprise-grade profile across healthcare systems.
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <CheckCircle2 color="#34D399" size={20} />
              <Text style={styles.featureText}>Unified Corporate Profile</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle2 color="#34D399" size={20} />
              <Text style={styles.featureText}>Secure Compliance & Payroll Data</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle2 color="#34D399" size={20} />
              <Text style={styles.featureText}>Seamless Shift & Attendance Tracking</Text>
            </View>
          </View>
        </View>
      )}

      {/* Right Form Side */}
      <View style={[styles.rightPanel, !isDesktop && styles.rightPanelMobile]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
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
                  <Text style={styles.pageTitle}>Employee Register</Text>
                  <Text style={styles.pageSubtitle}>Please complete all 6 sections below.</Text>
                </View>
                <Pressable style={styles.photoUpload} onPress={handlePickImage}>
                  {photo ? (
                    <View style={{ width: '100%', height: '100%', borderRadius: 35, overflow: 'hidden' }}>
                      <Image source={{ uri: photo }} style={{ width: '100%', height: '100%'}} resizeMode="cover" />
                    </View>
                  ) : (
                    <>
                      <Camera color="#3B82F6" size={24} />
                      <Text style={styles.photoText}>UPLOAD PIC</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* 1. Personal Identification Data */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>1. Personal Identification Data</Text>
                <View style={styles.gridContainer}>
                  <View style={styles.inputGroup}><Text style={styles.label}>Full Name *</Text><TextInput style={styles.input} placeholder="Rahul Sharma" placeholderTextColor="#94A3B8" value={fullName} onChangeText={setFullName} /></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>Email Address *</Text><TextInput style={styles.input} placeholder="rahul@example.com" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} /></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>Mobile Number</Text><TextInput style={styles.input} placeholder="10-digit Mobile" placeholderTextColor="#94A3B8" value={mobile} onChangeText={setMobile} /></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>Emergency Contact</Text><TextInput style={styles.input} placeholder="Family Contact" placeholderTextColor="#94A3B8" value={emergencyContact} onChangeText={setEmergencyContact} /></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>Age</Text><TextInput style={styles.input} placeholder="Years" placeholderTextColor="#94A3B8" value={age} onChangeText={setAge} /></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>Blood Group</Text><TextInput style={styles.input} placeholder="O+" placeholderTextColor="#94A3B8" value={bloodGroup} onChangeText={setBloodGroup} /></View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Secure Password *</Text>
                    <View style={styles.passwordWrapper}>
                      <TextInput style={styles.inputPassword} placeholder="••••••••" secureTextEntry={!showPassword} placeholderTextColor="#94A3B8" value={password} onChangeText={setPassword} />
                      <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>{showPassword ? <EyeOff color="#94A3B8" size={18} /> : <Eye color="#94A3B8" size={18} />}</Pressable>
                    </View>
                    {passwordError && !confirmPassword ? <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>{passwordError}</Text> : null}
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm Password *</Text>
                    <View style={styles.passwordWrapper}>
                      <TextInput style={styles.inputPassword} placeholder="••••••••" secureTextEntry={!showConfirmPassword} placeholderTextColor="#94A3B8" value={confirmPassword} onChangeText={setConfirmPassword} />
                      <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>{showConfirmPassword ? <EyeOff color="#94A3B8" size={18} /> : <Eye color="#94A3B8" size={18} />}</Pressable>
                    </View>
                    {passwordError && confirmPassword ? <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>{passwordError}</Text> : null}
                  </View>
                </View>
              </View>

              {/* 2. Statutory Documentation & Compliance */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>2. Statutory Documentation & Compliance</Text>
                <View style={styles.gridContainer}>
                  <View style={styles.inputGroup}><Text style={styles.label}>Aadhaar ID Card</Text><TextInput style={styles.input} placeholder="12-digit Aadhaar" placeholderTextColor="#94A3B8" value={aadhaar} onChangeText={setAadhaar} /></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>PAN Card</Text><TextInput style={styles.input} placeholder="ABCDE1234F" placeholderTextColor="#94A3B8" value={pan} onChangeText={setPan} /></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>ESI Insurance ID</Text><TextInput style={styles.input} placeholder="Enter Insurance No." placeholderTextColor="#94A3B8" value={esi} onChangeText={setEsi} /></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>Reporting Manager</Text><TextInput style={styles.input} placeholder="Supervisor Name" placeholderTextColor="#94A3B8" value={manager} onChangeText={setManager} /></View>
                </View>
              </View>

              {errorMessage ? (
                <View style={{ padding: 12, backgroundColor: '#FEE2E2', borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ color: '#DC2626', fontWeight: '500', textAlign: 'center' }}>{errorMessage}</Text>
                </View>
              ) : null}
              {successMessage ? (
                <View style={{ padding: 12, backgroundColor: '#D1FAE5', borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ color: '#059669', fontWeight: '500', textAlign: 'center' }}>{successMessage}</Text>
                </View>
              ) : null}

              {/* 3. Organizational & Payroll Allocation */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>3. Organizational & Payroll Allocation</Text>
                <View style={styles.gridContainer}>
                  <View style={[styles.inputGroup, { width: '100%' }]}>
                    <Text style={styles.label}>Department *</Text>
                    {loadingData ? <ActivityIndicator size="small" /> : (
                      <View style={styles.optionsGrid}>
                        {departments.length === 0 && <Text style={{ color: '#94A3B8' }}>No departments available.</Text>}
                        {departments.map(dept => (
                          <Pressable key={dept.id} style={[styles.optionBadge, String(selectedDept) === String(dept.id) && styles.optionBadgeSelected]} onPress={() => { setSelectedDept(String(dept.id)); setSelectedRole(''); }}>
                            <Text style={[styles.optionBadgeText, String(selectedDept) === String(dept.id) && styles.optionBadgeTextSelected]}>{dept.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  {selectedDept ? (
                    <View style={[styles.inputGroup, { width: '100%' }]}>
                      <Text style={styles.label}>Role *</Text>
                      {availableRoles.length === 0 ? (
                        <Text style={{ color: '#94A3B8', fontSize: 13, paddingVertical: 10 }}>No roles available for this department. Please contact Admin.</Text>
                      ) : (
                        <View style={styles.optionsGrid}>
                          {availableRoles.map(role => (
                            <Pressable key={role.id} style={[styles.optionBadge, selectedRole === role.id && styles.optionBadgeSelected]} onPress={() => setSelectedRole(role.id)}>
                              <Text style={[styles.optionBadgeText, selectedRole === role.id && styles.optionBadgeTextSelected]}>{role.name}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  ) : null}

                  <View style={styles.inputGroup}><Text style={styles.label}>Monthly Base Salary (₹)</Text><TextInput style={styles.input} placeholder="Amount in INR" placeholderTextColor="#94A3B8" value={salary} onChangeText={setSalary} /></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>Employment Type</Text><TextInput style={styles.input} placeholder="Full-time" placeholderTextColor="#94A3B8" value={empType} onChangeText={setEmpType} /></View>
                  <View style={[styles.inputGroup, { width: '100%' }]}><Text style={styles.label}>Job Description</Text><TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline placeholder="Detail operational responsibilities..." placeholderTextColor="#94A3B8" value={jobDesc} onChangeText={setJobDesc} /></View>
                </View>
              </View>

              {/* 4. Shift Architecture */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>4. Shift Architecture & Operational Timings</Text>
                <View style={styles.gridContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Shift Clock-In</Text>
                    {Platform.OS === 'web' ? (
                      <input type="time" style={styles.webInput} value={shiftIn} onChange={(e) => setShiftIn(e.target.value)} />
                    ) : (
                      <TextInput style={styles.input} placeholder="09:00" placeholderTextColor="#94A3B8" value={shiftIn} onChangeText={setShiftIn} />
                    )}
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Shift Clock-Out</Text>
                    {Platform.OS === 'web' ? (
                      <input type="time" style={styles.webInput} value={shiftOut} onChange={(e) => setShiftOut(e.target.value)} />
                    ) : (
                      <TextInput style={styles.input} placeholder="17:00" placeholderTextColor="#94A3B8" value={shiftOut} onChangeText={setShiftOut} />
                    )}
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Break Commences</Text>
                    {Platform.OS === 'web' ? (
                      <input type="time" style={styles.webInput} value={breakStart} onChange={(e) => setBreakStart(e.target.value)} />
                    ) : (
                      <TextInput style={styles.input} placeholder="13:00" placeholderTextColor="#94A3B8" value={breakStart} onChangeText={setBreakStart} />
                    )}
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Break Concludes</Text>
                    {Platform.OS === 'web' ? (
                      <input type="time" style={styles.webInput} value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} />
                    ) : (
                      <TextInput style={styles.input} placeholder="14:00" placeholderTextColor="#94A3B8" value={breakEnd} onChangeText={setBreakEnd} />
                    )}
                  </View>
                </View>
              </View>

              {/* 5. Geographic Residence */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>5. Geographic Residence Verification</Text>
                <Text style={styles.subSectionLabel}>Temporary Address</Text>
                <View style={styles.gridContainer}>
                  <View style={[styles.inputGroup, { width: '100%' }]}><TextInput style={styles.input} placeholder="Street Address / Block Location" placeholderTextColor="#94A3B8" value={tempAddr1} onChangeText={setTempAddr1} /></View>
                  <View style={styles.inputGroup}><TextInput style={styles.input} placeholder="City Locality" placeholderTextColor="#94A3B8" value={tempCity} onChangeText={setTempCity} /></View>
                  <View style={styles.inputGroup}><TextInput style={styles.input} placeholder="State Region" placeholderTextColor="#94A3B8" value={tempState} onChangeText={setTempState} /></View>
                </View>
                <Text style={[styles.subSectionLabel, { marginTop: 16 }]}>Permanent Address</Text>
                <View style={styles.gridContainer}>
                  <View style={[styles.inputGroup, { width: '100%' }]}><TextInput style={styles.input} placeholder="Street Address / Block Location" placeholderTextColor="#94A3B8" value={permAddr1} onChangeText={setPermAddr1} /></View>
                  <View style={styles.inputGroup}><TextInput style={styles.input} placeholder="City Locality" placeholderTextColor="#94A3B8" value={permCity} onChangeText={setPermCity} /></View>
                  <View style={styles.inputGroup}><TextInput style={styles.input} placeholder="State Region" placeholderTextColor="#94A3B8" value={permState} onChangeText={setPermState} /></View>
                </View>
              </View>

              {/* 6. Banking & Disbursement */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>6. Banking & Payroll Routing</Text>
                <View style={styles.gridContainer}>
                  <View style={styles.inputGroup}><Text style={styles.label}>IFSC Code</Text><TextInput style={styles.input} placeholder="SBIN0001234" placeholderTextColor="#94A3B8" value={ifsc} onChangeText={setIfsc} /></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>Bank Name</Text><TextInput style={styles.input} placeholder="State Bank of India" placeholderTextColor="#94A3B8" value={bankName} onChangeText={setBankName} /></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>Branch Name</Text><TextInput style={styles.input} placeholder="Main Hub Branch" placeholderTextColor="#94A3B8" value={branch} onChangeText={setBranch} /></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>Account Number</Text><TextInput style={styles.input} placeholder="Enter Account Number" placeholderTextColor="#94A3B8" value={accountNo} onChangeText={setAccountNo} /></View>
                </View>
              </View>

              <View style={styles.complianceBox}>
                <Text style={styles.complianceText}>I hereby verify that all operational records provided match my active credentials and align with the standard parameters of Bharat Medical Hall corporate compliance policies.</Text>
              </View>

              <Pressable style={[styles.submitBtn, registering && { opacity: 0.7 }]} onPress={handleRegister} disabled={registering}>
                <Text style={styles.submitBtnText}>{registering ? 'Registering...' : 'Finalize Account Registration →'}</Text>
              </Pressable>

              <View style={styles.loginLinkRow}>
                <Text style={styles.loginLinkText}>Already authenticated within our logs? </Text>
                <Pressable onPress={() => router.push('/employee/login')}>
                  <Text style={styles.loginLinkAction}>Access System Login</Text>
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
  leftPanel: { flex: 1, backgroundColor: '#1E40AF', justifyContent: 'center', alignItems: 'center', padding: 60, position: 'fixed', top: 0, left: 0, bottom: 0 },
  logoBox: { width: 100, height: 100, backgroundColor: '#FFFFFF', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  logoBadgeText: { fontSize: 40, fontWeight: '900', color: '#1E40AF', letterSpacing: -2 },
  brandTitle: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginBottom: 16, textAlign: 'center' },
  brandDesc: { fontSize: 15, color: '#BFDBFE', textAlign: 'center', lineHeight: 24, maxWidth: 400, marginBottom: 40 },
  featuresList: { width: '100%', maxWidth: 400, gap: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e3a8a', padding: 16, borderRadius: 12 },
  featureText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 12 },
  
  rightPanel: { flex: 1.5, backgroundColor: '#FFFFFF', marginLeft: Platform.OS === 'web' ? '40%' : 0 },
  rightPanelMobile: { flex: 1, marginLeft: 0 },
  scrollContent: { flexGrow: 1, padding: 40, alignItems: 'center' },
  
  header: { width: '100%', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 40, maxWidth: 800 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtnText: { color: '#1E40AF', fontWeight: '700', fontSize: 14, marginLeft: 4 },
  headerLogo: { flexDirection: 'row', alignItems: 'center' },
  headerLogoIcon: { color: '#3B82F6', fontWeight: '900', fontSize: 18, marginRight: 8 },
  headerLogoText: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  
  formContainer: { width: '100%', maxWidth: 800 },
  formTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#64748B' },
  photoUpload: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderColor: '#BFDBFE', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  photoText: { fontSize: 10, fontWeight: '700', color: '#3B82F6', marginTop: 4 },
  
  sectionCard: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 24, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E40AF', marginBottom: 20, paddingLeft: 12, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  subSectionLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  inputGroup: { width: Platform.OS === 'web' ? '48%' : '100%', minWidth: 200, flexGrow: 1 },
  label: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 14, fontSize: 14, color: '#1E293B', ...Platform.select({ web: { outlineWidth: 0 as any } }) },
  webInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 14, fontSize: 14, color: '#1E293B', width: '100%', fontFamily: 'inherit', ...Platform.select({ web: { outlineWidth: 0 as any } }) },
  
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF' },
  inputPassword: { flex: 1, padding: 14, fontSize: 14, color: '#1E293B', ...Platform.select({ web: { outlineWidth: 0 as any } }) },
  eyeIcon: { padding: 14 },
  
  complianceBox: { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, marginBottom: 24 },
  complianceText: { fontSize: 13, color: '#1E40AF', lineHeight: 20 },
  
  submitBtn: { backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginBottom: 24 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  
  loginLinkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 40 },
  loginLinkText: { color: '#64748B', fontSize: 14 },
  loginLinkAction: { color: '#1E40AF', fontSize: 14, fontWeight: '700' },

  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  optionBadge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  optionBadgeSelected: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  optionBadgeText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  optionBadgeTextSelected: { color: '#3B82F6', fontWeight: '700' },
});
