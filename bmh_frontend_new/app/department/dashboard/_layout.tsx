import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, ActivityIndicator, Pressable, Text, Modal } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { Menu } from 'lucide-react-native';
import { SubAdminSidebar } from '../../../components/ui/SubAdminSidebar';
import { TopHeader } from '../../../components/ui/TopHeader';
import { useResponsive } from '../../../hooks/useResponsive';
import { Colors } from '../../../constants/Colors';

export default function SubAdminLayout() {
  const { isDesktop } = useResponsive();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Basic auth check
    if (Platform.OS === 'web') {
      const user = localStorage.getItem('subAdminUser');
      if (!user) {
        router.replace('/department/login');
      } else {
        setLoading(false);
      }
    } else {
      // For mobile we skip strict auth check for now or implement AsyncStorage
      setLoading(false);
    }
  }, []);

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
          <Slot />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
