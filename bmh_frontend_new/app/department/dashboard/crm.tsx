import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import CRMView from '../../../components/CRMView';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../constants/Colors';
import { AlertCircle } from 'lucide-react-native';

export default function SubAdminCRM() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await axios.get('https://napi.bharatmedicalhallplus.com/settings');
        const userStr = Platform.OS === 'web' ? localStorage.getItem('subAdminUser') : await AsyncStorage.getItem('subAdminUser');
        
        if (userStr) {
          const user = JSON.parse(userStr);
          const userId = user.id?.toString();
          
          if (res.data.success && res.data.settings.crm_access) {
            let value = res.data.settings.crm_access;
            if (typeof value === 'string') value = JSON.parse(value);
            
            if (userId && value[userId] === true) {
              setHasAccess(true);
            }
          }
        }
      } catch (err) {
        console.error('Failed to check CRM access:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAccess();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={styles.center}>
        <AlertCircle size={48} color={Colors.light.error} />
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorDesc}>You do not have access to the CRM panel. Please contact the administrator.</Text>
      </View>
    );
  }

  return <CRMView userType="sub_admin" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc'
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 16
  },
  errorDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 400
  }
});
