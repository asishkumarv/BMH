import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, SafeAreaView, StatusBar } from 'react-native';
import { Slot, router, usePathname } from 'expo-router';
import { LayoutDashboard, Users, LogOut, Activity, Calendar } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useResponsive } from '../../../hooks/useResponsive';

export default function DoctorLayout() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const { isMobile } = useResponsive();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      const role = await AsyncStorage.getItem('userRole');
      
      if (!token || role !== 'Doctor') {
        router.replace('/doctor/login');
        return;
      }
      
      if (userData) {
        setUser(JSON.parse(userData));
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('userRole');
    router.replace('/doctor/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, route: '/doctor/dashboard' },
    { name: 'My Schedule', icon: Calendar, route: '/doctor/dashboard/schedule' },
    { name: 'Patients', icon: Users, route: '/doctor/dashboard/patients' },
    { name: 'Wallet', icon: Activity, route: '/doctor/dashboard/wallet' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, isMobile && { flexDirection: 'column' }]}>
      {!isMobile && (
        <View style={styles.sidebar}>
          <View style={styles.logoContainer}>
            <Activity color="#3b82f6" size={32} />
            <Text style={styles.logoText}>Doctor Portal</Text>
          </View>
          
          <View style={styles.navContainer}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.route;
              return (
                <TouchableOpacity 
                  key={item.route}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => router.push(item.route as any)}
                >
                  <Icon size={20} color={isActive ? '#3b82f6' : '#64748b'} />
                  <Text style={[styles.navText, isActive && styles.navTextActive]}>{item.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.userContainer}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Dr. {user?.full_name?.split(' ')[0]}</Text>
              <Text style={styles.userRole}>{user?.department}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.content}>
        {isMobile && (
          <View style={styles.mobileHeader}>
            <Text style={styles.mobileTitle}>Doctor Portal</Text>
            <TouchableOpacity onPress={handleLogout}>
              <LogOut size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
        <Slot />
      </View>
      
      {isMobile && (
        <View style={styles.bottomNav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.route;
            return (
              <TouchableOpacity 
                key={item.route}
                style={styles.bottomNavItem}
                onPress={() => router.push(item.route as any)}
              >
                <Icon size={24} color={isActive ? '#3b82f6' : '#64748b'} />
                <Text style={[styles.bottomNavText, isActive && styles.navTextActive]}>{item.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#f8fafc' },
  sidebar: { width: 250, backgroundColor: 'white', borderRightWidth: 1, borderColor: '#e2e8f0', display: 'flex', flexDirection: 'column' },
  logoContainer: { padding: 24, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  logoText: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginLeft: 12 },
  navContainer: { flex: 1, padding: 16 },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 4 },
  navItemActive: { backgroundColor: '#eff6ff' },
  navText: { fontSize: 15, color: '#64748b', marginLeft: 12, fontWeight: '500' },
  navTextActive: { color: '#3b82f6', fontWeight: 'bold' },
  userContainer: { padding: 16, borderTopWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  userRole: { fontSize: 12, color: '#64748b' },
  logoutBtn: { padding: 8 },
  content: { flex: 1, overflow: 'hidden' },
  mobileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  mobileTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  bottomNav: { flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderColor: '#e2e8f0', paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  bottomNavItem: { flex: 1, alignItems: 'center', padding: 12 },
  bottomNavText: { fontSize: 10, color: '#64748b', marginTop: 4 },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});
