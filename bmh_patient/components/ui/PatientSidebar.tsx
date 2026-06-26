import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image, ScrollView } from 'react-native';
import { LayoutDashboard, Users, CalendarDays, User, LogOut, HeartPulse } from 'lucide-react-native';
import { Link, usePathname, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';

const NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
  { name: 'Find Doctor', icon: Users, route: '/dashboard/doctors' },
  { name: 'Appointments', icon: CalendarDays, route: '/dashboard/appointments' },
  { name: 'Profile Settings', icon: User, route: '/dashboard/profile' },
];

export default function PatientSidebar({ onClose, patientName }: { onClose?: () => void; patientName?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      if (onClose) onClose();
      await AsyncStorage.removeItem('patientUser');
      router.replace('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/Logo.jpg')} style={{ width: 36, height: 36 }} resizeMode="contain" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.logoText}>Bharat Medical</Text>
          <Text style={styles.logoSubtext}>Patient Portal</Text>
        </View>
      </View>

      {patientName && (
        <View style={styles.patientProfileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.patientName} numberOfLines={1}>{patientName}</Text>
            <Text style={styles.patientBadge}>Verified Patient</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.route || (item.route !== '/dashboard' && pathname.startsWith(item.route));
          
          return (
            <Link key={item.name} href={item.route as any} asChild>
              <Pressable 
                style={StyleSheet.flatten([styles.navItem, isActive && styles.navItemActive])}
                onPress={() => {
                  if (onClose && !isActive) onClose();
                }}
              >
                <item.icon 
                  color={isActive ? Colors.light.primary : Colors.light.icon} 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <Text style={[styles.navText, isActive && styles.navTextActive]}>
                  {item.name}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut color={Colors.light.error} size={20} />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    backgroundColor: Colors.light.card,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: Colors.light.border,
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
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  logoSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textMuted,
    marginTop: -2,
  },
  patientProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 24,
    marginHorizontal: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  patientBadge: {
    fontSize: 10,
    color: Colors.light.success,
    fontWeight: '600',
  },
  navContainer: {
    flex: 1,
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: Colors.light.secondary,
  },
  navText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.icon,
  },
  navTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 'auto',
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.error,
  }
});
