import React from 'react';
import {  View, Text, StyleSheet, Pressable, Platform , Image, ScrollView } from 'react-native';
import { LayoutDashboard, Users, Activity, LogOut, Bell, Package, Wallet, CalendarDays } from 'lucide-react-native';
import { Link, usePathname, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, route: '/department/dashboard' },
  { name: 'Employees', icon: Users, route: '/department/dashboard/employees' },
  { name: 'Attendance', icon: Activity, route: '/department/dashboard/attendance' },
  { name: 'Leave', icon: CalendarDays, route: '/department/dashboard/leave-management' },
  { name: 'Tasks', icon: Activity, route: '/department/dashboard/tasks' },
  { name: 'Stationary', icon: Package, route: '/department/dashboard/stationary' },
  { name: 'Allowances', icon: Wallet, route: '/department/dashboard/allowances' },
  { name: 'Notifications', icon: Bell, route: '/department/dashboard/notifications' },
  { name: 'Profile', icon: Users, route: '/department/dashboard/profile' },
];

export const SubAdminSidebar = ({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [navItems, setNavItems] = React.useState(NAV_ITEMS);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('https://bmh-eitu.onrender.com/settings');
        if (res.data.success && res.data.settings.doctor_management_access) {
          let value = res.data.settings.doctor_management_access;
          if (typeof value === 'string') value = JSON.parse(value);
          
          const userStr = Platform.OS === 'web' ? localStorage.getItem('subAdminUser') : await AsyncStorage.getItem('subAdminUser');
          if (userStr) {
            const user = JSON.parse(userStr);
            const deptSettings = value[user.department];
            
            if ((deptSettings && deptSettings.sub_admin) || value.sub_admin === true) {
              setNavItems([...NAV_ITEMS.slice(0, 7), { name: 'Doctors', icon: Users, route: '/department/dashboard/doctors' }, ...NAV_ITEMS.slice(7)]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch settings', err);
      }
    };
    fetchSettings();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/Logo.jpg')} style={{ width: 40, height: 40}} resizeMode="contain" />
        <Text style={styles.logoText}>Sub Admin</Text>
      </View>

      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        {navItems.map((item) => {
          const isActive = pathname === item.route || (item.route !== '/department/dashboard' && pathname.startsWith(item.route));
          
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
        if (Platform.OS === 'web') {
          localStorage.removeItem('subAdminUser');
        }
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
