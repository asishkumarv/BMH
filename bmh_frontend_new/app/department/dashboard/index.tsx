import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Alert, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Users, FileText, CheckCircle, Clock, Sun, Moon, Utensils, CheckCircle2 } from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

export default function SubAdminDashboard() {
  const { isDesktop } = useResponsive();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    presentCount: 0,
    absentCount: 0,
    pendingTasks: 0,
    completedTasks: 0
  });

  const [summary, setSummary] = useState<any>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  
  const [cameraVisible, setCameraVisible] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [cameraMessage, setCameraMessage] = useState<{text: string, type: 'error' | 'success'} | null>(null);
  const cameraRef = useRef<any>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
      ])
    ).start();
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        if (Platform.OS === 'web') {
          const userStr = localStorage.getItem('subAdminUser');
          if (userStr) {
            const parsedUser = JSON.parse(userStr);
            setUser(parsedUser);
            fetchSummary(parsedUser.id);
            fetchMetrics(parsedUser.department_id);
          }
        }
      } catch (error) {
        console.error('Initialization error', error);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
  }, []);

  const fetchMetrics = async (departmentId: number) => {
    try {
      const res = await axios.get(`https://bmh-eitu.onrender.com/admin/department-admins/${departmentId}/metrics`);
      if (res.data.success) {
        setMetrics(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching metrics', error);
    }
  };

  const fetchSummary = async (empId: number) => {
    try {
      const res = await axios.get(`https://bmh-eitu.onrender.com/attendance/employee-dashboard/${empId}?userType=sub_admin`);
      if (res.data.success) {
        setSummary(res.data.data);
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.log("Error fetching personal attendance", err);
    }
  };

  const handleAction = async (type: string) => {
    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') return Alert.alert('Camera permission required.');
    }
    if (!locationPermission?.granted) {
      const { status } = await requestLocationPermission();
      if (status !== 'granted') return Alert.alert('Location permission required.');
    }

    setActionType(type);
    setCameraMessage(null);
    setCameraVisible(true);
  };

  const takePictureAndSubmit = async () => {
    if (!cameraRef.current || !user) return;
    setLoadingAction(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      const location = await Location.getCurrentPositionAsync({});

      // Verify Location
      const locRes = await axios.post('https://bmh-eitu.onrender.com/attendance/verify-location', {
        employeeId: user.id,
        userType: 'sub_admin',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      const isLocationVerified = locRes.data.success && locRes.data.locationVerified;
      
      if (!isLocationVerified && (actionType === 'login' || actionType === 'logout')) {
         setCameraMessage({ text: locRes.data.message || "Outside allowed area.", type: 'error' });
         setLoadingAction(false);
         return;
      }

      const payload: any = {
        base64Image: photo.base64,
        employeeId: user.id,
        userType: 'sub_admin',
        locationVerified: isLocationVerified
      };

      if (actionType === 'login' || actionType === 'logout') {
        payload.action = actionType;
        const res = await axios.post('https://bmh-eitu.onrender.com/attendance/verify-face', payload);
        if (res.data.success) {
          setCameraMessage({ text: res.data.message, type: 'success' });
          setTimeout(() => setCameraVisible(false), 2000);
        } else {
          setCameraMessage({ text: res.data.message, type: 'error' });
        }
      } else {
        payload.breakType = actionType;
        const breakRes = await axios.post('https://bmh-eitu.onrender.com/attendance/break', payload);
        if (breakRes.data.success) {
           setCameraMessage({ text: breakRes.data.message, type: 'success' });
           setTimeout(() => setCameraVisible(false), 2000);
        } else {
           setCameraMessage({ text: breakRes.data.message, type: 'error' });
        }
      }

      fetchSummary(user.id);
    } catch (error: any) {
      console.error(error);
      setCameraMessage({ text: error.response?.data?.message || "Something went wrong.", type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const animateButton = (action: () => void) => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start(() => action());
  };

  if (loading) {
    return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;
  }

  const STATS = [
    { label: 'Total Employees', value: metrics.totalEmployees.toString(), icon: Users, color: '#3B82F6' },
    { label: 'Present Today', value: metrics.presentCount.toString(), icon: CheckCircle, color: '#10B981' },
    { label: 'Absent Today', value: metrics.absentCount.toString(), icon: Users, color: '#EF4444' },
    { label: 'Pending Tasks', value: metrics.pendingTasks.toString(), icon: Clock, color: '#F59E0B' },
    { label: 'Completed Tasks', value: metrics.completedTasks.toString(), icon: FileText, color: '#8B5CF6' },
  ];

  return (
    <View style={{flex: 1}}>
      {cameraVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 400, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>Confirm {actionType}</Text>
            <View style={{ width: '100%', height: 300, borderRadius: 12, overflow: 'hidden', marginBottom: 15 }}>
              <CameraView style={{ flex: 1 }} ref={cameraRef} facing="front" />
            </View>
            
            {cameraMessage && (
              <View style={{ padding: 12, backgroundColor: cameraMessage.type === 'error' ? '#FEE2E2' : '#D1FAE5', borderRadius: 8, marginBottom: 15 }}>
                <Text style={{ color: cameraMessage.type === 'error' ? '#DC2626' : '#059669', textAlign: 'center', fontWeight: '500' }}>
                  {cameraMessage.text}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.captureBtn, { flex: 1 }]} onPress={takePictureAndSubmit} disabled={loadingAction}>
                {loadingAction ? <ActivityIndicator color="#fff" /> : <Text style={styles.captureBtnText}>Capture & Submit</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.captureBtn, { flex: 1, backgroundColor: '#ef4444' }]} onPress={() => setCameraVisible(false)}>
                <Text style={styles.captureBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView style={styles.container} contentContainerStyle={[styles.content, !isDesktop && styles.contentMobile]}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Department Overview 👋</Text>
          <Text style={styles.subtitle}>Here is what's happening in your department today.</Text>
        </View>

        {/* My Attendance Actions */}
        <View style={styles.actionSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>My Attendance</Text>
            <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                Status: {summary ? summary.status_string : "Off Duty"}
              </Text>
            </View>
          </View>
          <View style={styles.cuteActionGrid}>
            {!summary || summary.can_check_in ? (
              <Animated.View style={{ transform: [{ scale: pulseAnim }], width: isDesktop ? '30%' : '48%', minWidth: 200 }}>
                <TouchableOpacity style={[styles.cuteActionBtn, { backgroundColor: '#10b981', borderColor: '#34d399' }]} onPress={() => animateButton(() => handleAction('login'))}>
                  <View style={styles.iconCircle}>
                    <Sun color="#10b981" size={32} />
                  </View>
                  <Text style={styles.cuteActionText}>Morning Check In</Text>
                  <Text style={styles.cuteActionSub}>Start your shift</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {summary && summary.can_check_out ? (
              <Animated.View style={{ transform: [{ scale: pulseAnim }], width: isDesktop ? '30%' : '48%', minWidth: 200 }}>
                <TouchableOpacity style={[styles.cuteActionBtn, { backgroundColor: '#f43f5e', borderColor: '#fb7185' }]} onPress={() => animateButton(() => handleAction('logout'))}>
                  <View style={styles.iconCircle}>
                    <Moon color="#f43f5e" size={32} />
                  </View>
                  <Text style={styles.cuteActionText}>Evening Check Out</Text>
                  <Text style={styles.cuteActionSub}>End your day</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {summary && summary.can_break_in ? (
              <Animated.View style={{ transform: [{ scale: pulseAnim }], width: isDesktop ? '30%' : '48%', minWidth: 200 }}>
                <TouchableOpacity style={[styles.cuteActionBtn, { backgroundColor: '#f59e0b', borderColor: '#fbbf24' }]} onPress={() => animateButton(() => handleAction('Break In'))}>
                  <View style={styles.iconCircle}>
                    <Utensils color="#f59e0b" size={32} />
                  </View>
                  <Text style={styles.cuteActionText}>Take a Break</Text>
                  <Text style={styles.cuteActionSub}>Grab some food</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {summary && summary.can_break_out ? (
              <Animated.View style={{ transform: [{ scale: pulseAnim }], width: isDesktop ? '30%' : '48%', minWidth: 200 }}>
                <TouchableOpacity style={[styles.cuteActionBtn, { backgroundColor: '#3b82f6', borderColor: '#60a5fa' }]} onPress={() => animateButton(() => handleAction('Break Out'))}>
                  <View style={styles.iconCircle}>
                    <CheckCircle2 color="#3b82f6" size={32} />
                  </View>
                  <Text style={styles.cuteActionText}>Back to Work</Text>
                  <Text style={styles.cuteActionSub}>Resume your shift</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}
            
            {summary && !summary.can_check_in && !summary.can_check_out && !summary.can_break_in && !summary.can_break_out ? (
              <View style={styles.allDoneBox}>
                <CheckCircle2 color="#10b981" size={48} style={{ marginBottom: 12 }} />
                <Text style={styles.allDoneText}>You're all done for today!</Text>
                <Text style={styles.allDoneSub}>Have a wonderful rest of your day.</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.statsGrid, !isDesktop && styles.statsGridMobile]}>
          {STATS.map((stat, i) => (
            <View key={i} style={[styles.statCard, !isDesktop && styles.statCardMobile]}>
              <View style={[styles.iconBox, { backgroundColor: stat.color + '1A' }]}>
                <stat.icon color={stat.color} size={24} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.chartSection, !isDesktop && styles.chartSectionMobile]}>
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>Recent Tasks Overview</Text>
            <View style={styles.chartPlaceholder}>
              <Text style={styles.placeholderText}>Task metrics visualization</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 32,
  },
  contentMobile: {
    padding: 16,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    marginTop: 8,
  },
  actionSection: { marginBottom: 32, backgroundColor: '#ffffff', padding: 24, borderRadius: 24, shadowColor: '#cbd5e1', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: {width: 0, height: 10}, elevation: 5 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  cuteActionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center' },
  cuteActionBtn: { padding: 24, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: {width: 0, height: 4}, elevation: 3 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  cuteActionText: { color: 'white', fontWeight: '900', fontSize: 18, marginBottom: 4 },
  cuteActionSub: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 14 },
  allDoneBox: { alignItems: 'center', justifyContent: 'center', padding: 24, width: '100%' },
  allDoneText: { fontSize: 20, fontWeight: '800', color: '#10b981' },
  allDoneSub: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    marginBottom: 32,
  },
  statsGridMobile: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
      },
      default: {
        elevation: 2,
      }
    })
  },
  statCardMobile: {
    width: '100%',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.light.icon,
    fontWeight: '500',
  },
  chartSection: {
    flexDirection: 'row',
    gap: 24,
  },
  chartSectionMobile: {
    flexDirection: 'column',
  },
  chartCard: {
    flex: 2,
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
      }
    }),
    minHeight: 300,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 20,
  },
  chartPlaceholder: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: Colors.light.icon,
    fontWeight: '500',
  },
  captureBtn: { backgroundColor: Colors.light.primary, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, elevation: 5, alignItems: 'center' },
  captureBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
