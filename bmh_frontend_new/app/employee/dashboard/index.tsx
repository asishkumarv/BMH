import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, TouchableOpacity, Alert, Animated, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { Users, Clock, PlayCircle, StopCircle, Coffee, Sun, Moon, Utensils, CheckCircle2, ListTodo, ListChecks } from 'lucide-react-native';
import LeaveManagement from './leave-management';

export default function EmployeeDashboardScreen() {
  const { isDesktop } = useResponsive();
  const [user, setUser] = useState<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  
  const [cameraVisible, setCameraVisible] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [activeWorkingHours, setActiveWorkingHours] = useState<string>('0h 0m');
  const [cameraMessage, setCameraMessage] = useState<{text: string, type: 'error' | 'success'} | null>(null);
  const cameraRef = useRef<any>(null);

  // Animation values
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
    const loadUser = async () => {
      let userStr = null;
      if (Platform.OS === 'web') {
        userStr = localStorage.getItem('employeeUser');
      } else {
        userStr = await AsyncStorage.getItem('employeeUser');
      }
      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        fetchSummary(parsedUser.id);
      }
    };
    loadUser();
  }, []);

  const fetchSummary = async (empId: number) => {
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/attendance/employee-dashboard/${empId}`);
      if (res.data.success) {
        setSummary(res.data.data);
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.log("Error fetching personal attendance", err);
    }
  };

  useEffect(() => {
    if (!summary) return;
    
    const updateActiveHours = () => {
      if (summary.check_in_time && !summary.check_out_time) {
        const checkInMs = new Date(summary.check_in_time).getTime();
        const nowMs = new Date().getTime();
        let activeSeconds = Math.floor((nowMs - checkInMs) / 1000) - (summary.total_break_seconds || 0);
        if (activeSeconds < 0) activeSeconds = 0;
        
        const h = Math.floor(activeSeconds / 3600);
        const m = Math.floor((activeSeconds % 3600) / 60);
        setActiveWorkingHours(`${h}h ${m}m`);
      } else if (summary.check_in_time && summary.check_out_time) {
         const checkInMs = new Date(summary.check_in_time).getTime();
         const checkOutMs = new Date(summary.check_out_time).getTime();
         let activeSeconds = Math.floor((checkOutMs - checkInMs) / 1000) - (summary.total_break_seconds || 0);
         if (activeSeconds < 0) activeSeconds = 0;
         const h = Math.floor(activeSeconds / 3600);
         const m = Math.floor((activeSeconds % 3600) / 60);
         setActiveWorkingHours(`${h}h ${m}m`);
      } else {
         setActiveWorkingHours('0h 0m');
      }
    };

    updateActiveHours();
    const interval = setInterval(updateActiveHours, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [summary]);

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
    if (!cameraRef.current) return;
    setLoadingAction(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      const location = await Location.getCurrentPositionAsync({});

      // Verify Location first
      const locRes = await axios.post('https://napi.bharatmedicalhallplus.com/attendance/verify-location', {
        employeeId: user.id,
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
        locationVerified: isLocationVerified
      };

      if (actionType === 'login' || actionType === 'logout') {
        payload.action = actionType;
        const res = await axios.post('https://napi.bharatmedicalhallplus.com/attendance/verify-face', payload);
        if (res.data.success) {
          setCameraMessage({ text: res.data.message, type: 'success' });
          setTimeout(() => setCameraVisible(false), 2000);
        } else {
          setCameraMessage({ text: res.data.message, type: 'error' });
        }
      } else {
        payload.breakType = actionType;
        const breakRes = await axios.post('https://napi.bharatmedicalhallplus.com/attendance/break', payload);
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

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

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

      <ScrollView style={[styles.container, !isDesktop && styles.containerMobile]} contentContainerStyle={{ paddingBottom: 50 }}>


      <View style={styles.header}>
        <Text style={styles.title}>Welcome back, {user.full_name}</Text>
        <Text style={styles.subtitle}>{user.role} | {user.department}</Text>
      </View>

      <View style={{ gap: 24 }}>
        {/* Row 1: Status & Tasks */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe' }]}>
            <Clock color="#4f46e5" size={28} style={{ marginBottom: 12 }} />
            <Text style={[styles.statTitle, { color: '#4f46e5' }]}>Attendance</Text>
            <Text style={[styles.statValue, { color: '#3730a3', fontSize: 20 }]}>{summary ? summary.status_string : "Off Duty"}</Text>
            <Text style={styles.statSub}>
              {summary 
                ? (summary.check_out_time 
                    ? `Checked out: ${new Date(summary.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
                    : (summary.check_in_time ? `Checked in: ${new Date(summary.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : "Start your day!")) 
                : "Start your day!"}
            </Text>
            {summary && summary.check_in_time && (
               <Text style={[styles.statSub, {marginTop: 4, fontWeight: 'bold', color: '#4338ca'}]}>Active: {activeWorkingHours}</Text>
            )}
          </View>

          <View style={[styles.statCard, { backgroundColor: '#f3e8ff', borderColor: '#e9d5ff' }]}>
            <ListTodo color="#9333ea" size={28} style={{ marginBottom: 12 }} />
            <Text style={[styles.statTitle, { color: '#9333ea' }]}>Total Tasks</Text>
            <Text style={[styles.statValue, { color: '#6b21a8' }]}>{summary ? summary.total_tasks : 0}</Text>
            <Text style={styles.statSub}>Assigned to you</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
            <Clock color="#d97706" size={28} style={{ marginBottom: 12 }} />
            <Text style={[styles.statTitle, { color: '#d97706' }]}>Pending</Text>
            <Text style={[styles.statValue, { color: '#b45309' }]}>{summary ? summary.pending_tasks : 0}</Text>
            <Text style={styles.statSub}>Needs attention</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }]}>
            <ListChecks color="#059669" size={28} style={{ marginBottom: 12 }} />
            <Text style={[styles.statTitle, { color: '#059669' }]}>Completed</Text>
            <Text style={[styles.statValue, { color: '#047857' }]}>{summary ? summary.completed_tasks : 0}</Text>
            <Text style={styles.statSub}>Great job!</Text>
          </View>
        </View>

        {/* Row 2: Actions */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>What would you like to do?</Text>
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
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: '#f8fafc' },
  containerMobile: { padding: 16 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statCard: { flex: 1, minWidth: 160, padding: 24, borderRadius: 20, borderWidth: 2 },
  statTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 36, fontWeight: '900', marginBottom: 8 },
  statSub: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  actionSection: { marginTop: 16, backgroundColor: '#ffffff', padding: 32, borderRadius: 24, shadowColor: '#cbd5e1', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: {width: 0, height: 10}, elevation: 5 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 24 },
  cuteActionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center' },
  cuteActionBtn: { padding: 24, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: {width: 0, height: 4}, elevation: 3 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  cuteActionText: { color: 'white', fontWeight: '900', fontSize: 18, marginBottom: 4 },
  cuteActionSub: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 14 },
  allDoneBox: { alignItems: 'center', justifyContent: 'center', padding: 40, width: '100%' },
  allDoneText: { fontSize: 24, fontWeight: '800', color: '#10b981' },
  allDoneSub: { fontSize: 16, color: '#6b7280', marginTop: 8 },
  cameraOverlay: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20 },
  captureBtn: { backgroundColor: Colors.light.primary, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, elevation: 5 },
  captureBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
