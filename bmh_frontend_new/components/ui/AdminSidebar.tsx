import React from 'react';
import {  View, Text, StyleSheet, Pressable, Platform , Image, ScrollView } from 'react-native';
import { LayoutDashboard, Users, Building, Activity, Settings, LogOut, Bell, Package, Wallet, CalendarDays } from 'lucide-react-native';
import { Link, usePathname, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';

const NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, route: '/admin/dashboard' },
  { name: 'Employees', icon: Users, route: '/admin/dashboard/employees' },
  { name: 'Departments', icon: Building, route: '/admin/dashboard/departments' },
  { name: 'Attendance', icon: Activity, route: '/admin/dashboard/attendance' },
  { name: 'Leave', icon: CalendarDays, route: '/admin/dashboard/leave-management' },
  { name: 'Tasks', icon: Activity, route: '/admin/dashboard/tasks' },
  { name: 'Stationary', icon: Package, route: '/admin/dashboard/stationary' },
  { name: 'Allowances', icon: Wallet, route: '/admin/dashboard/allowances' },
  { name: 'Cash Handovers', icon: Wallet, route: '/admin/dashboard/wallet' },
  { name: 'Doctors', icon: Users, route: '/admin/dashboard/doctors' },
  { name: 'Notifications', icon: Bell, route: '/admin/dashboard/notifications' },
  { name: 'Settings', icon: Settings, route: '/admin/dashboard/settings' },
  { name: 'Profile', icon: Users, route: '/admin/dashboard/profile' },
];

export const AdminSidebar = ({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/Logo.jpg')} style={{ width: 40, height: 40}} resizeMode="contain" />
        <Text style={styles.logoText}>BMH Admin</Text>
      </View>

      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.route || (item.route !== '/admin/dashboard' && pathname.startsWith(item.route));
          
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

      <Pressable style={styles.logoutBtn} onPress={() => {
        if (onClose) onClose();
        router.replace('/roles');
      }}>
        <LogOut color={Colors.light.error} size={20} />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
};

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
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  logoIcon: {
    backgroundColor: Colors.light.primary,
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: 0.5,
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
