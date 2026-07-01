import React from 'react';
import {  View, Text, StyleSheet, Pressable, Platform , Image, ScrollView } from 'react-native';
import { LayoutDashboard, CheckSquare, LogOut, Bell, Package, Wallet, User, CalendarDays, FileText, Users, ChevronDown, ChevronRight } from 'lucide-react-native';
import { Link, usePathname, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, route: '/employee/dashboard' },
  { name: 'Attendance', icon: CheckSquare, route: '/employee/dashboard/attendance' },
  { name: 'Leave', icon: CalendarDays, route: '/employee/dashboard/leave-management' },
  { name: 'Tasks', icon: CheckSquare, route: '/employee/dashboard/tasks' },
  { name: 'Stationary', icon: Package, route: '/employee/dashboard/stationary' },
  { name: 'Wallet', icon: Wallet, route: '/employee/dashboard/wallet' },
  { name: 'Patient History', icon: User, route: '/employee/dashboard/patient-history' },
  { name: 'Notifications', icon: Bell, route: '/employee/dashboard/notifications' },
  { name: 'Payslips', icon: FileText, route: '/employee/dashboard/payslips' },
  { name: 'Profile', icon: User, route: '/employee/dashboard/profile' },
];

const PHARMACY_ITEMS = [
  { name: 'Purchase Orders', route: '/dashboard/pharmacy/purchase-orders' },
  { name: 'Purchase Orderlist', route: '/dashboard/pharmacy/purchase-orderlist' },
  { name: 'Sales order', route: '/dashboard/pharmacy/sales-order' },
  { name: 'Sales Invoice Manager', route: '/dashboard/pharmacy/sales-invoices' },
  { name: 'Ecogreen Sales invocie', route: '/dashboard/pharmacy/ecogreen-invoices' },
];

export const EmployeeSidebar = ({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [navItems, setNavItems] = React.useState(NAV_ITEMS);
  const [pharmacyOpen, setPharmacyOpen] = React.useState(false);

  React.useEffect(() => {
    if (pathname.includes('/dashboard/pharmacy')) {
      setPharmacyOpen(true);
    }
  }, [pathname]);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('https://napi.bharatmedicalhallplus.com/settings');
        let dynamicNavItems = [...NAV_ITEMS];
        
        if (res.data.success && res.data.settings.doctor_management_access) {
          let value = res.data.settings.doctor_management_access;
          if (typeof value === 'string') value = JSON.parse(value);
          
          // Check if any department has employee: true OR the legacy value.employee === true
          const hasAccess = value.employee === true || Object.values(value).some((dept: any) => dept && dept.employee === true);
          
          if (hasAccess) {
            dynamicNavItems.push({ name: 'Patient Booking', icon: FileText, route: '/employee/dashboard/patient-booking' });
          }
        }
        
        // Fetch user to check role for Peon Queue
        let userDataStr = null;
        if (Platform.OS === 'web') {
          userDataStr = localStorage.getItem('employeeUser');
        } else {
          userDataStr = await AsyncStorage.getItem('employeeUser');
        }
        
        if (userDataStr) {
          const u = JSON.parse(userDataStr);
          if (u.role?.toLowerCase() === 'peon' || u.role?.toLowerCase() === 'poen') {
            dynamicNavItems.splice(1, 0, { name: 'Live Queue', icon: Users, route: '/employee/dashboard/queue' });
            dynamicNavItems.splice(2, 0, { name: 'Check In', icon: User, route: '/employee/dashboard/check-in' });
          }
        }
        
        setNavItems(dynamicNavItems);
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
        <Text style={styles.logoText}>Employee Portal</Text>
      </View>

      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        {navItems.map((item) => {
          const isActive = pathname === item.route || (item.route !== '/employee/dashboard' && pathname.startsWith(item.route));
          
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

        {/* EcoGreen APIs Collapsible Menu */}
        <Pressable 
          style={[styles.navItem, pathname.includes('/dashboard/pharmacy') && styles.navItemActive]} 
          onPress={() => setPharmacyOpen(!pharmacyOpen)}
        >
          <Package color={pathname.includes('/dashboard/pharmacy') ? Colors.light.primary : Colors.light.icon} size={20} />
          <Text style={[styles.navText, pathname.includes('/dashboard/pharmacy') && styles.navTextActive]}>ECOGREEN INTEGRATION</Text>
          <View style={{ marginLeft: 'auto' }}>
            {pharmacyOpen ? (
              <ChevronDown color={pathname.includes('/dashboard/pharmacy') ? Colors.light.primary : Colors.light.icon} size={16} />
            ) : (
              <ChevronRight color={pathname.includes('/dashboard/pharmacy') ? Colors.light.primary : Colors.light.icon} size={16} />
            )}
          </View>
        </Pressable>

        {pharmacyOpen && PHARMACY_ITEMS.map((subItem) => {
          const fullRoute = `/employee${subItem.route}`;
          const isSubActive = pathname === fullRoute;
          return (
            <Link key={subItem.name} href={fullRoute as any} asChild>
              <Pressable 
                style={StyleSheet.flatten([
                  styles.subNavItem, 
                  isSubActive && styles.subNavItemActive
                ])}
                onPress={() => {
                  if (onClose && !isSubActive) onClose();
                }}
              >
                <Text style={[styles.subNavText, isSubActive && styles.subNavTextActive]}>
                  •  {subItem.name}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>

      <Pressable style={styles.logoutBtn} onPress={() => {
        if (onClose) onClose();
        if (Platform.OS === 'web') {
          localStorage.removeItem('employeeUser');
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
    fontSize: 20,
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
  },
  subNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingLeft: 36,
    borderRadius: 10,
    marginBottom: 2,
  },
  subNavItemActive: {
    backgroundColor: Colors.light.secondary,
  },
  subNavText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textMuted,
  },
  subNavTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
});
