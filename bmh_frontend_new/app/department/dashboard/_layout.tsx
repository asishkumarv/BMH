import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, ActivityIndicator, Pressable, Text, Modal, StatusBar, DeviceEventEmitter } from 'react-native';
import { Slot, useRouter, useRootNavigationState } from 'expo-router';
import { Menu } from 'lucide-react-native';
import { SubAdminSidebar } from '../../../components/ui/SubAdminSidebar';
import { TopHeader } from '../../../components/ui/TopHeader';
import { useResponsive } from '../../../hooks/useResponsive';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAttendanceReminder } from '../../../hooks/useAttendanceReminder';

export default function SubAdminLayout() {
  const [refreshKey, setRefreshKey] = useState(0);

  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener('global_refresh', () => {
      setRefreshKey(prev => prev + 1);
    });
    return () => sub.remove();
  }, []);
  const { isDesktop } = useResponsive();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    // Basic auth check
    const init = async () => {
      if (Platform.OS === 'web') {
        const userStr = localStorage.getItem('subAdminUser');
        if (!userStr) {
          router.replace('/department/login');
        } else {
          setUser(JSON.parse(userStr));
          setLoading(false);
        }
      } else {
        const userStr = await AsyncStorage.getItem('subAdminUser');
        if (userStr) {
          setUser(JSON.parse(userStr));
        }
        setLoading(false);
      }
    };
    init();
  }, [rootNavigationState?.key]);

  useAttendanceReminder(user);

  if (loading) {
    return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator /></View>;
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
              <SubAdminSidebar onClose={() => setIsMobileSidebarOpen(false)} />
            </View>
          </View>
        </Modal>
      )}

      <View style={styles.container}>
        {isDesktop && <SubAdminSidebar />}
        
        <View style={[
          styles.contentWrapper, 
          isDesktop && { marginLeft: 260 } 
        ]}>
          <TopHeader 
            userType="department_admin" 
            title={!isDesktop ? "Department Portal" : undefined}
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
