import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Platform } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Menu, X } from 'lucide-react-native';
import PatientSidebar from '../../components/ui/PatientSidebar';
import { Colors } from '../../constants/Colors';
import { useResponsive } from '../../hooks/useResponsive';
import { TopHeader } from '../../components/ui/TopHeader';

export default function DashboardLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useResponsive();
  
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const patientData = await AsyncStorage.getItem('patientUser');
        if (!patientData) {
          router.replace('/login');
        } else {
          setPatient(JSON.parse(patientData));
        }
      } catch (err) {
        console.error('Dashboard auth check error:', err);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!patient) return null;

  const patientName = patient.name || 'Patient';

  // Desktop side-by-side layout
  if (!isMobile) {
    return (
      <View style={styles.container}>
        <PatientSidebar patientName={patientName} />
        <View style={styles.mainContent}>
          <TopHeader title="Patient Portal" userType="patient" />
          <View style={styles.slotWrapper}>
            <Slot />
          </View>
        </View>
      </View>
    );
  }

  // Mobile layout with topbar and collapsible menu drawer
  return (
    <View style={styles.mobileContainer}>
      {/* Mobile Top Header */}
      <View style={styles.mobileHeader}>
        <TouchableOpacity onPress={toggleMobileMenu} style={styles.menuBtn}>
          {mobileMenuOpen ? <X size={24} color="#0f172a" /> : <Menu size={24} color="#0f172a" />}
        </TouchableOpacity>
        <Text style={styles.mobileTitle}>Bharat Medical</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mobileSlotWrapper}>
        <Slot />
      </View>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <View style={styles.mobileDrawerContainer}>
          <TouchableOpacity style={styles.mobileDrawerBackdrop} onPress={toggleMobileMenu} />
          <View style={styles.mobileDrawerContent}>
            <PatientSidebar onClose={toggleMobileMenu} patientName={patientName} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    height: Platform.OS === 'web' ? '100vh' as any : '100%',
    width: Platform.OS === 'web' ? '100vw' as any : '100%',
    backgroundColor: Colors.light.background,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    marginLeft: 260, // Width of sidebar
    height: '100%',
    overflow: 'hidden',
  },
  slotWrapper: {
    flex: 1,
    overflow: Platform.OS === 'web' ? 'auto' as any : 'scroll',
  },
  // Mobile styles
  mobileContainer: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Colors.light.background,
    height: '100%',
  },
  mobileHeader: {
    height: 64,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  menuBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  mobileSlotWrapper: {
    flex: 1,
  },
  mobileDrawerContainer: {
    position: 'absolute',
    top: 64,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: 'row',
  },
  mobileDrawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  mobileDrawerContent: {
    width: 260,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
