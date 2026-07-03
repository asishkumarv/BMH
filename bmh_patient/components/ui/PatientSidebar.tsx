import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image, ScrollView, Alert } from 'react-native';
import { LayoutDashboard, Users, CalendarDays, User, LogOut, ShoppingCart, ShoppingBag } from 'lucide-react-native';
import { Link, usePathname, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PatientSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      if (onClose) onClose();
      await AsyncStorage.clear();
      router.replace('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleComingSoon = (moduleName: string) => {
    if (onClose) onClose();
    Alert.alert(
      `${moduleName} (Soon)`,
      `The ${moduleName} module is currently under development and will be released soon.`
    );
  };

  const renderNavItem = (name: string, IconComponent: any, route: string) => {
    const isActive = pathname === route || (route !== '/dashboard' && pathname.startsWith(route));
    return (
      <Link key={name} href={route as any} asChild>
        <Pressable 
          style={StyleSheet.flatten([styles.navItem, isActive && styles.navItemActive])}
          onPress={() => {
            if (onClose) onClose();
          }}
        >
          <IconComponent 
            color={isActive ? '#0F172A' : '#94A3B8'} 
            size={20} 
            strokeWidth={isActive ? 2.5 : 2}
          />
          <Text style={StyleSheet.flatten([styles.navText, isActive && styles.navTextActive])}>
            {name}
          </Text>
          {isActive && <View style={styles.activeDot} />}
        </Pressable>
      </Link>
    );
  };

  const renderDummyNavItem = (name: string, IconComponent: any) => {
    return (
      <Pressable 
        key={name}
        style={styles.navItem}
        onPress={() => handleComingSoon(name)}
      >
        <IconComponent 
          color='#94A3B8' 
          size={20} 
          strokeWidth={2}
        />
        <Text style={styles.navText}>
          {name}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Logo Container */}
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/Logo.jpg')} style={styles.logoImg} resizeMode="contain" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.logoText}>Bharat Medical</Text>
          <Text style={styles.logoSubtext}>Patient Portal</Text>
        </View>
      </View>

      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        {/* WORKSPACE SECTION */}
        <Text style={styles.sectionHeader}>WORKSPACE</Text>
        
        {renderNavItem('Dashboard', LayoutDashboard, '/dashboard')}
        {renderNavItem('Find Doctor', Users, '/dashboard/doctors')}
        {renderNavItem('Appointments', CalendarDays, '/dashboard/appointments')}
        {renderNavItem('Medicine Store', ShoppingCart, '/dashboard/medicine-store')}
        {renderNavItem('My Orders', ShoppingBag, '/dashboard/my-orders')}

        {/* ACCOUNT SECTION */}
        <Text style={[styles.sectionHeader, { marginTop: 24 }]}>ACCOUNT</Text>
        
        {renderNavItem('Profile Settings', User, '/dashboard/profile')}
        
        <Pressable style={styles.navItem} onPress={handleLogout}>
          <LogOut color="#F87171" size={20} />
          <Text style={[styles.navText, { color: '#F87171' }]}>Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    backgroundColor: '#090d16', // Premium very dark slate background
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: '#151F32', // Subtle dark border
    paddingVertical: 24,
    paddingHorizontal: 16,
    ...Platform.select({
      web: {
        position: 'fixed',
        left: 0,
        top: 0,
      }
    })
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  logoImg: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  logoSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: -2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  navContainer: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: '#FFFFFF',
  },
  navText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  navTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  activeDot: {
    position: 'absolute',
    right: 16,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  }
});
