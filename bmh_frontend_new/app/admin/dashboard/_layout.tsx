import React, { useState } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, Pressable, Text, Modal, StatusBar, DeviceEventEmitter } from 'react-native';
import { Slot, useRouter, useRootNavigationState } from 'expo-router';
import { Menu } from 'lucide-react-native';
import { AdminSidebar } from '../../../components/ui/AdminSidebar';
import { TopHeader } from '../../../components/ui/TopHeader';
import { useResponsive } from '../../../hooks/useResponsive';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator } from 'react-native';

export default function AdminLayout() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  React.useEffect(() => {
    if (!rootNavigationState?.key) return;

    const checkAuth = async () => {
      try {
        let userStr = null;
        if (Platform.OS === 'web') {
          userStr = localStorage.getItem('superAdminUser');
        } else {
          userStr = await AsyncStorage.getItem('superAdminUser');
        }
        if (!userStr) {
          router.replace('/admin/login');
        } else {
          setLoading(false);
        }
      } catch (e) {
        router.replace('/admin/login');
      }
    };
    checkAuth();
  }, [rootNavigationState?.key]);

  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener('global_refresh', () => {
      setRefreshKey(prev => prev + 1);
    });
    return () => sub.remove();
  }, []);
  const { isDesktop } = useResponsive();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Mobile/Tablet Header is handled by TopHeader */}

      {/* Mobile/Tablet Sidebar Overlay */}
      {!isDesktop && isMobileSidebarOpen && (
        <Modal transparent visible={isMobileSidebarOpen} animationType="fade">
          <View style={styles.overlay}>
            <Pressable style={styles.overlayBackground} onPress={() => setIsMobileSidebarOpen(false)} />
            <View style={styles.drawerContainer}>
              <AdminSidebar onClose={() => setIsMobileSidebarOpen(false)} />
            </View>
          </View>
        </Modal>
      )}

      <View style={styles.container}>
        {/* On desktop, show the fixed sidebar */}
        {isDesktop && <AdminSidebar />}
        
        {/* Main Content Area */}
        <View style={[
          styles.contentWrapper, 
          isDesktop && { marginLeft: 260 } // Offset for fixed sidebar on web
        ]}>
          <TopHeader 
            userType="super_admin" 
            title={!isDesktop ? "BMH Admin" : undefined}
            onMenuPress={!isDesktop ? () => setIsMobileSidebarOpen(true) : undefined}
          />
          <View key={refreshKey} style={{flex: 1}}><Slot /></View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    width: 260,
    height: '100%',
    backgroundColor: Colors.light.card,
  }
});
