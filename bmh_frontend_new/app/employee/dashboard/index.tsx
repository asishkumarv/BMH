import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, TouchableOpacity, Alert, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { Users, Clock, PlayCircle, StopCircle, Coffee } from 'lucide-react-native';

export default function EmployeeDashboardScreen() {
  const { isDesktop } = useResponsive();
  const [user, setUser] = useState<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  
  const [cameraVisible, setCameraVisible] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [cameraMessage, setCameraMessage] = useState<{text: string, type: 'error' | 'success'} | null>(null);
  const cameraRef = useRef<any>(null);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (Platform.OS === 'web') {
      const userStr = localStorage.getItem('employeeUser');
      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        fetchSummary(parsedUser.id);
      }
    }
  }, []);

  const fetchSummary = async (empId: number) => {
    try {
      const res = await axios.get(`https://bmh-eitu.onrender.com/attendance/employee-dashboard/${empId}`);
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
    if (!cameraRef.current) return;
    setLoadingAction(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      const location = await Location.getCurrentPositionAsync({});

      // Verify Location first
      const locRes = await axios.post('https://bmh-eitu.onrender.com/attendance/verify-location', {
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

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
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

      <View style={styles.header}>
        <Text style={styles.title}>Welcome back, {user.full_name}</Text>
        <Text style={styles.subtitle}>{user.role} | {user.department}</Text>
      </View>

      <View style={styles.grid}>
        {/* Attendance Action Card */}
        <View style={[styles.card, { flex: 2, minWidth: 300 }]}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            {!summary || summary.can_check_in ? (
              <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '48%' }}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => animateButton(() => handleAction('login'))}>
                  <PlayCircle color="white" size={24} style={{marginBottom: 8}} />
                  <Text style={styles.actionText}>Check In</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {summary && summary.can_check_out ? (
              <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '48%' }}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => animateButton(() => handleAction('logout'))}>
                  <StopCircle color="white" size={24} style={{marginBottom: 8}} />
                  <Text style={styles.actionText}>Check Out</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {summary && summary.can_break_in ? (
              <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '48%' }}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]} onPress={() => animateButton(() => handleAction('Break In'))}>
                  <Coffee color="white" size={24} style={{marginBottom: 8}} />
                  <Text style={styles.actionText}>Break In</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {summary && summary.can_break_out ? (
              <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '48%' }}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]} onPress={() => animateButton(() => handleAction('Break Out'))}>
                  <Coffee color="white" size={24} style={{marginBottom: 8}} />
                  <Text style={styles.actionText}>Break Out</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}
            
            {summary && !summary.can_check_in && !summary.can_check_out && !summary.can_break_in && !summary.can_break_out ? (
              <View style={{ width: '100%', alignItems: 'center', padding: 20 }}>
                <Text style={{ color: Colors.light.icon, fontSize: 16 }}>Your attendance for today is completed.</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Existing Status Cards */}
        <View style={styles.card}>
          <Clock color={Colors.light.primary} size={32} style={{ marginBottom: 16 }} />
          <Text style={styles.cardTitle}>Attendance Status</Text>
          <Text style={styles.cardValue}>{summary ? summary.status_string : "Off Duty"}</Text>
          <Text style={styles.cardSub}>
            {summary 
              ? (summary.check_out_time 
                  ? `Checked out at ${new Date(summary.check_out_time).toLocaleTimeString()}` 
                  : (summary.check_in_time ? `Checked in at ${new Date(summary.check_in_time).toLocaleTimeString()}` : "Mark your attendance for today.")) 
              : "Mark your attendance for today."}
          </Text>
        </View>
        <View style={styles.card}>
          <Users color={Colors.light.secondary} size={32} style={{ marginBottom: 16 }} />
          <Text style={styles.cardTitle}>Assigned Tasks</Text>
          <Text style={styles.cardValue}>{summary ? summary.pending_tasks : 0}</Text>
          <Text style={styles.cardSub}>Tasks pending completion.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: Colors.light.background },
  containerMobile: { padding: 16 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  card: { flex: 1, minWidth: 250, backgroundColor: '#fff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },
  cardValue: { fontSize: 32, fontWeight: '800', color: Colors.light.primary, marginBottom: 8 },
  cardSub: { fontSize: 13, color: Colors.light.icon },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  actionBtn: { padding: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width: 0, height: 2} },
  actionText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cameraOverlay: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20 },
  captureBtn: { backgroundColor: Colors.light.primary, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, elevation: 5 },
  captureBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
