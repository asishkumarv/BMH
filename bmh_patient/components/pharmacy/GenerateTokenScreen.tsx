import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Key, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { API_URL } from '../../config';

export default function GenerateTokenScreen() {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/pharmacy/generate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to generate token');
      const data = await res.json();
      
      if (data.apiKey) {
        setToken(data.apiKey);
        if (Platform.OS === 'web') {
          localStorage.setItem('authData', JSON.stringify({ apiKey: data.apiKey }));
        } else {
          await AsyncStorage.setItem('authData', JSON.stringify({ apiKey: data.apiKey }));
        }
      } else {
        throw new Error('No API key returned');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Generate Token</Text>
        <Text style={styles.subtitle}>
          Sync and authenticate your EcoGreen API credentials with the hospital network.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Key size={36} color={Colors.light.primary} />
        </View>
        <Text style={styles.cardTitle}>Automatic Token Generator</Text>
        <Text style={styles.cardDesc}>
          Click the button below to fetch a new secure API token. This token will automatically authorize all subsequent pharmacy requests.
        </Text>

        <TouchableOpacity 
          style={[styles.btn, loading && styles.btnDisabled]} 
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Generate New Token</Text>
          )}
        </TouchableOpacity>

        {token && (
          <View style={styles.successBox}>
            <View style={styles.statusHeader}>
              <CheckCircle2 size={18} color={Colors.light.success} />
              <Text style={styles.successTitle}>Token Generated Successfully</Text>
            </View>
            <Text style={styles.tokenText}>{token}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <View style={styles.statusHeader}>
              <AlertCircle size={18} color={Colors.light.error} />
              <Text style={styles.errorTitle}>Generation Failed</Text>
            </View>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: Colors.light.background,
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
    fontSize: 15,
    color: Colors.light.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
    maxWidth: 500,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: Colors.light.textMuted,
    lineHeight: 20,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  successBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.success,
  },
  tokenText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Colors.light.text,
    backgroundColor: 'rgba(255,255,255,0.6)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  errorBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.error,
  },
  errorText: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
  },
});
