import React from 'react';
import {  View, Text, StyleSheet, Pressable, Platform , Image, ScrollView } from 'react-native';
import { LayoutDashboard, Users, Building, Activity, Settings, LogOut, Bell, Package, Wallet, CalendarDays, ChevronDown, ChevronRight } from 'lucide-react-native';
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
  { name: 'Patient History', icon: Users, route: '/admin/dashboard/patient-history' },
  { name: 'Delivery Fleet', icon: Package, route: '/admin/dashboard/delivery-fleet' },
  { name: 'Notifications', icon: Bell, route: '/admin/dashboard/notifications' },
  { name: 'Settings', icon: Settings, route: '/admin/dashboard/settings' },
  { name: 'Profile Requests', icon: Users, route: '/admin/dashboard/profile-requests' },
  { name: 'Profile', icon: Users, route: '/admin/dashboard/profile' },
];

const PHARMACY_ITEMS = [
  { name: 'Get Item Master Data', route: '/dashboard/pharmacy/items' },
  { name: 'Get Stock Details', route: '/dashboard/pharmacy/stock' },
  { name: 'Get Customer Master Data', route: '/dashboard/pharmacy/customers' },
  { name: 'Get Purchase Order', route: '/dashboard/pharmacy/purchase-order' },
  { name: 'Create Sales Order', route: '/dashboard/pharmacy/create-order' },
  { name: 'Sales Order Status', route: '/dashboard/pharmacy/order-status' },
  { name: 'Ecogreen Sales Order Data', route: '/dashboard/pharmacy/ecogreen-sales-orders' },
  { name: 'Ecogreen Sales Invoice Data', route: '/dashboard/pharmacy/ecogreen-invoices' },
  { name: 'Sales Order List', route: '/dashboard/pharmacy/sales-list' },
  { name: 'PurchaseOrderList', route: '/dashboard/pharmacy/purchase-list' },
  { name: 'EcoGreen Stock Data', route: '/dashboard/pharmacy/ecogreen-stock' },
  { name: 'Local Master Data', route: '/dashboard/pharmacy/local-master' },
];

export const AdminSidebar = ({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [pharmacyOpen, setPharmacyOpen] = React.useState(false);

  React.useEffect(() => {
    if (pathname.includes('/dashboard/pharmacy')) {
      setPharmacyOpen(true);
    }
  }, [pathname]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/Logo.jpg')} style={{ width: 40, height: 40}} resizeMode="contain" />
        <Text style={styles.logoText}>BMH Admin</Text>
      </View>

      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.route || (item.route !== '/admin/dashboard' && pathname.startsWith(item.route) && pathname.charAt(item.route.length) === '/');
          
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
          const fullRoute = `/admin${subItem.route}`;
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
