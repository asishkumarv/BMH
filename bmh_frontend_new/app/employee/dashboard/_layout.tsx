import React, { useState } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, Pressable, Text, Modal, StatusBar, DeviceEventEmitter } from 'react-native';
import { Slot, useRouter, useRootNavigationState } from 'expo-router';
import { Menu } from 'lucide-react-native';
import { EmployeeSidebar } from '../../../components/ui/EmployeeSidebar';
import { TopHeader } from '../../../components/ui/TopHeader';
import { useResponsive } from '../../../hooks/useResponsive';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAttendanceReminder } from '../../../hooks/useAttendanceReminder';
import { ActivityIndicator } from 'react-native';
import { registerForPushNotificationsAsync } from '../../../utils/pushNotifications';
import axios from 'axios';

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

  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  React.useEffect(() => {
    if (!rootNavigationState?.key) return;

    const checkAuth = async () => {
      try {
        let userDataStr = null;
        if (Platform.OS === 'web') {
          userDataStr = localStorage.getItem('employeeUser');
        } else {
          userDataStr = await AsyncStorage.getItem('employeeUser');
        }

        if (!userDataStr) {
          setTimeout(() => {
            router.replace('/employee/login');
          }, 0);
        } else {
          const u = JSON.parse(userDataStr);
          if (u.department === 'Delivery') {
            setTimeout(() => {
              router.replace('/delivery/dashboard');
            }, 0);
          } else {
            setUser(u);
            setLoading(false);

            // Refresh push token in background on mobile devices
            if (Platform.OS !== 'web') {
              registerForPushNotificationsAsync().then((token) => {
                if (token && token !== u.push_token) {
                  axios.post('https://napi.bharatmedicalhallplus.com/employees/update-push-token', {
                    employee_id: u.id,
                    pushToken: token,
                    user_type: 'employee'
                  }).then(() => {
                    console.log("Refreshed employee push token on server:", token);
                    u.push_token = token;
                    AsyncStorage.setItem('employeeUser', JSON.stringify(u)).catch((err: any) => {
                      console.log("Error saving updated user data:", err);
                    });
                  }).catch((err: any) => {
                    console.log("Error updating employee push token on server:", err?.response?.data || err.message);
                  });
                }
              }).catch((err: any) => {
                console.log("Error during employee push token auto-refresh:", err);
              });
            }
          }
        }
      } catch (e) {
        setTimeout(() => {
          router.replace('/employee/login');
        }, 0);
      }
    };
    checkAuth();
  }, [rootNavigationState?.key]);

  useAttendanceReminder(user);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </SafeAreaView>
    );
  }

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
