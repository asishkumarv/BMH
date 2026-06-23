import React from 'react';
import { View, StyleSheet, Platform, SafeAreaView } from 'react-native';
import { Slot } from 'expo-router';
import { EmployeeSidebar } from '../../../components/ui/EmployeeSidebar';
import { useResponsive } from '../../../hooks/useResponsive';
import { Colors } from '../../../constants/Colors';

export default function EmployeeLayout() {
  const { isDesktop } = useResponsive();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* On desktop, show the fixed sidebar */}
        {isDesktop && <EmployeeSidebar />}
        
        {/* Main Content Area */}
        <View style={[
          styles.contentWrapper, 
          isDesktop && { marginLeft: 260 } // Offset for fixed sidebar on web
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
