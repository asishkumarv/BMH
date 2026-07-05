import React, { useState } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, Pressable, Text, Modal, StatusBar, DeviceEventEmitter } from 'react-native';
import { Slot } from 'expo-router';
import { Menu } from 'lucide-react-native';
import { EmployeeSidebar } from '../../../components/ui/EmployeeSidebar';
import { TopHeader } from '../../../components/ui/TopHeader';
import { useResponsive } from '../../../hooks/useResponsive';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAttendanceReminder } from '../../../hooks/useAttendanceReminder';

export default function EmployeeLayout() {
  const [refreshKey, setRefreshKey] = useState(0);

  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener('global_refresh', () => {
      setRefreshKey(prev => prev + 1);
    });
    return () => sub.remove();
  }, []);
  const { isDesktop } = useResponsive();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      let userDataStr = null;
      if (Platform.OS === 'web') {
        userDataStr = localStorage.getItem('employeeUser');
      } else {
        userDataStr = await AsyncStorage.getItem('employeeUser');
      }
      if (userDataStr) setUser(JSON.parse(userDataStr));
    };
    fetchUser();
  }, []);

  useAttendanceReminder(user);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Mobile/Tablet Header is now handled by TopHeader */}

      {/* Mobile/Tablet Sidebar Overlay */}
      {!isDesktop && isMobileSidebarOpen && (
        <Modal transparent visible={isMobileSidebarOpen} animationType="fade">
          <View style={styles.overlay}>
            <Pressable style={styles.overlayBackground} onPress={() => setIsMobileSidebarOpen(false)} />
            <View style={styles.drawerContainer}>
              <EmployeeSidebar onClose={() => setIsMobileSidebarOpen(false)} />
            </View>
          </View>
        </Modal>
      )}

      <View style={styles.container}>
        {/* On desktop, show the fixed sidebar */}
        {isDesktop && <EmployeeSidebar />}
        
        {/* Main Content Area */}
        <View style={[
          styles.contentWrapper, 
          isDesktop && { marginLeft: 260 } // Offset for fixed sidebar on web
        ]}>
          <TopHeader 
            userType="employee" 
            title={!isDesktop ? "Employee Portal" : undefined}
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
