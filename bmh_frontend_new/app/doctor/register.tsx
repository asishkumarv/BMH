import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { User, Mail, Lock, Phone, Stethoscope, Briefcase } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../constants/Colors';

export default function DoctorRegister() {
  const [form, setForm] = useState({
    id: '',
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    department: '',
    experience: '',
    gender: '',
    description: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    if (!form.id || !form.full_name || !form.email || !form.password || !form.department) {
      setError('Please fill in all required fields (*)');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('https://bmh-eitu.onrender.com/doctors/register', form);
      if (response.data.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={[styles.header, {marginBottom: 20}]}>
            <Text style={styles.title}>Registration Submitted</Text>
            <Text style={[styles.subtitle, {textAlign: 'center', marginTop: 10}]}>
              Your doctor profile has been created and is currently pending approval from the administration. You will be able to log in once approved.
            </Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/doctor/login')}>
            <Text style={styles.buttonText}>Return to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Doctor Registration</Text>
          <Text style={styles.subtitle}>Apply for a doctor portal account</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.inputContainer}>
          <Briefcase size={20} color="#64748b" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Requested Doctor ID *" value={form.id} onChangeText={(t) => setForm({...form, id: t})} />
        </View>
        <View style={styles.inputContainer}>
          <User size={20} color="#64748b" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Full Name *" value={form.full_name} onChangeText={(t) => setForm({...form, full_name: t})} />
        </View>
        <View style={styles.inputContainer}>
          <Mail size={20} color="#64748b" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Email Address *" value={form.email} onChangeText={(t) => setForm({...form, email: t})} autoCapitalize="none" keyboardType="email-address" />
        </View>
        <View style={styles.inputContainer}>
          <Lock size={20} color="#64748b" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Password *" value={form.password} onChangeText={(t) => setForm({...form, password: t})} secureTextEntry />
        </View>
        <View style={styles.inputContainer}>
          <Phone size={20} color="#64748b" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Phone Number" value={form.phone_number} onChangeText={(t) => setForm({...form, phone_number: t})} keyboardType="phone-pad" />
        </View>
        <View style={styles.inputContainer}>
          <Stethoscope size={20} color="#64748b" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Department *" value={form.department} onChangeText={(t) => setForm({...form, department: t})} />
        </View>
        
        <View style={{flexDirection: 'row', gap: 10, width: '100%'}}>
          <View style={[styles.inputContainer, {flex: 1}]}>
             <TextInput style={styles.input} placeholder="Experience (Yrs)" value={form.experience} onChangeText={(t) => setForm({...form, experience: t})} keyboardType="numeric" />
          </View>
          <View style={[styles.inputContainer, {flex: 1}]}>
             <TextInput style={styles.input} placeholder="Gender" value={form.gender} onChangeText={(t) => setForm({...form, gender: t})} />
          </View>
        </View>

        <View style={[styles.inputContainer, {height: 100, alignItems: 'flex-start', paddingTop: 10}]}>
          <TextInput style={[styles.input, {textAlignVertical: 'top'}]} placeholder="Short Description / Bio" value={form.description} onChangeText={(t) => setForm({...form, description: t})} multiline />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Submit Registration</Text>}
        </TouchableOpacity>
        
        <TouchableOpacity style={{marginTop: 20, alignItems: 'center'}} onPress={() => router.push('/doctor/login')}>
          <Text style={{color: '#6b7280', fontWeight: '500'}}>Already approved? Sign in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 20 },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 20 },
  card: { backgroundColor: 'white', padding: 40, borderRadius: 20, width: '100%', maxWidth: 500, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginBottom: 16, paddingHorizontal: 16, height: 55 },
  icon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1e293b' },
  button: { backgroundColor: Colors.light.primary, height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 15, backgroundColor: '#fef2f2', padding: 10, borderRadius: 8 },
});
