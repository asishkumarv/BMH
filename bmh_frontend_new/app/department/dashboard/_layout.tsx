import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, ActivityIndicator } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { SubAdminSidebar } from '../../../components/ui/SubAdminSidebar';
import { useResponsive } from '../../../hooks/useResponsive';
import { Colors } from '../../../constants/Colors';

export default function SubAdminLayout() {
  const { isDesktop } = useResponsive();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

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
      <View style={styles.container}>
        {isDesktop && <SubAdminSidebar />}
        
        <View style={[
          styles.contentWrapper, 
          isDesktop && { marginLeft: 260 }
        ]}>
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
  }
});
