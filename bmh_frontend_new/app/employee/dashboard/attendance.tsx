import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EmployeeAttendance() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [actionType, setActionType] = useState(null); // 'login', 'logout', 'Break In', 'Break Out'
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      if (!user) return;

      const res = await axios.get('http://localhost:5000/attendance/summary?employeeId=' + user.id);
      if (res.data.success) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.log("Error fetching summary", err);
    }
  };

  const handleAction = async (type) => {
    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') return Alert.alert('Camera permission required.');
    }
    if (!locationPermission?.granted) {
      const { status } = await requestLocationPermission();
      if (status !== 'granted') return Alert.alert('Location permission required.');
    }

    setActionType(type);
    setCameraVisible(true);
  };

  const takePictureAndSubmit = async () => {
    if (!cameraRef.current) return;
    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      const location = await Location.getCurrentPositionAsync({});
      
      const userStr = await AsyncStorage.getItem('user');
      const user = JSON.parse(userStr);

      // Verify Location first
      const locRes = await axios.post('http://localhost:5000/attendance/verify-location', {
        employeeId: user.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      const isLocationVerified = locRes.data.success && locRes.data.locationVerified;
      
      if (!isLocationVerified && (actionType === 'login' || actionType === 'logout')) {
         Alert.alert("Location Error", locRes.data.message || "Outside allowed area.");
         setCameraVisible(false);
         setLoading(false);
         return;
      }

      // Prepare JSON payload for Face Verification / Attendance
      const payload = {
        base64Image: photo.base64,
        employeeId: user.id,
        locationVerified: isLocationVerified
      };

      if (actionType === 'login' || actionType === 'logout') {
        payload.action = actionType;
        const res = await axios.post('http://localhost:5000/attendance/verify-face', payload);

        if (res.data.success) {
          Alert.alert("Success", res.data.message);
        } else {
          Alert.alert("Error", res.data.message);
        }
      } else {
        // Break
        payload.breakType = actionType;
        
        const breakRes = await axios.post('http://localhost:5000/attendance/break', payload);

        if (breakRes.data.success) {
           Alert.alert("Success", breakRes.data.message);
        }
      }

      setCameraVisible(false);
      fetchSummary();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong.");
      setCameraVisible(false);
    } finally {
      setLoading(false);
    }
  };

  if (cameraVisible) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} ref={cameraRef} facing="front" />
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.captureButton} onPress={takePictureAndSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify & {actionType}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.captureButton, {backgroundColor: 'red'}]} onPress={() => setCameraVisible(false)}>
             <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>My Attendance</Text>
      
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={[styles.actionCard, {backgroundColor: '#4CAF50'}]} onPress={() => handleAction('login')}>
          <Text style={styles.actionText}>Check In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, {backgroundColor: '#f44336'}]} onPress={() => handleAction('logout')}>
          <Text style={styles.actionText}>Check Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, {backgroundColor: '#FF9800'}]} onPress={() => handleAction('Break In')}>
          <Text style={styles.actionText}>Break In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, {backgroundColor: '#2196F3'}]} onPress={() => handleAction('Break Out')}>
          <Text style={styles.actionText}>Break Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subHeader}>Today's Status</Text>
      <View style={styles.summaryContainer}>
         <Text>Total Present: {summary?.total_present || 0}</Text>
         <Text>Late Check-ins: {summary?.total_late || 0}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  subHeader: { fontSize: 20, fontWeight: 'bold', marginVertical: 15 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  actionCard: { width: '47%', padding: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  summaryContainer: { padding: 15, backgroundColor: 'white', borderRadius: 8, elevation: 2 },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  buttonContainer: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'space-around' },
  captureButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 50, minWidth: 120, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' }
});
