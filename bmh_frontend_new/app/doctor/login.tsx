import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';

export default function DoctorLogin() {
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!emailOrId || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Doctor Portal</Text>
          <Text style={styles.subtitle}>Sign in to manage your appointments</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.inputContainer}>
          <Mail size={20} color="#64748b" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Doctor ID or Email"
            value={emailOrId}
            onChangeText={setEmailOrId}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock size={20} color="#64748b" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={{marginTop: 15, alignItems: 'center'}} onPress={() => router.push('/doctor/register')}>
          <Text style={{color: Colors.light.primary, fontWeight: '500'}}>Don't have an account? Register</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={{marginTop: 25, alignItems: 'center'}} onPress={() => router.push('/login')}>
          <Text style={{color: '#6b7280', fontSize: 13}}>Go to Employee Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 20 },
  card: { backgroundColor: 'white', padding: 40, borderRadius: 20, width: '100%', maxWidth: 450, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginBottom: 16, paddingHorizontal: 16, height: 55 },
  icon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1e293b' },
  button: { backgroundColor: Colors.light.primary, height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 15, backgroundColor: '#fef2f2', padding: 10, borderRadius: 8 },
});
