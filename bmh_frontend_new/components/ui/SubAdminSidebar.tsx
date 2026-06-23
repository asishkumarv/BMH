import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LayoutDashboard, Users, LogOut, CheckSquare } from 'lucide-react-native';
import { Link, usePathname, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';

const NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, route: '/department/dashboard' },
  { name: 'Employees', icon: Users, route: '/department/dashboard/employees' },
  { name: 'Profile', icon: Users, route: '/department/dashboard/profile' },
];

export const SubAdminSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <CheckSquare color="#fff" size={24} />
        </View>
        <Text style={styles.logoText}>Sub Admin</Text>
      </View>

      <View style={styles.navContainer}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.route || (item.route !== '/department/dashboard' && pathname.startsWith(item.route));
          
          return (
            <Link key={item.name} href={item.route as any} asChild>
              <Pressable style={StyleSheet.flatten([styles.navItem, isActive && styles.navItemActive])}>
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
      </View>

      <Pressable style={styles.logoutBtn} onPress={() => {
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
