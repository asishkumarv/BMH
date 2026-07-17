import React from 'react';
import {  View, Text, StyleSheet, Pressable, Platform , Image, ScrollView } from 'react-native';
import { LayoutDashboard, Users, Activity, LogOut, Bell, Package, Wallet, CalendarDays, ChevronDown, ChevronRight, FileText, MessageSquare } from 'lucide-react-native';
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
  { name: 'My Wallet', icon: Wallet, route: '/department/dashboard/wallet' },
  { name: 'Payslips', icon: FileText, route: '/department/dashboard/payslips' },
  { name: 'Notifications', icon: Bell, route: '/department/dashboard/notifications' },
  { name: 'Profile Requests', icon: Users, route: '/department/dashboard/profile-requests' },
  { name: 'Profile', icon: Users, route: '/department/dashboard/profile' },
];

export const SubAdminSidebar = ({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [navItems, setNavItems] = React.useState(NAV_ITEMS);
  const [pharmacyOpen, setPharmacyOpen] = React.useState(false);
  const [pharmacyItems, setPharmacyItems] = React.useState<any[]>([]);

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
        const userStr = Platform.OS === 'web' ? localStorage.getItem('subAdminUser') : await AsyncStorage.getItem('subAdminUser');
        
        let hasSalesOrder = false;
        let hasPurchaseOrder = false;
        let hasOrderAssign = false;

        if (userStr) {
          const user = JSON.parse(userStr);
          const userId = user.id?.toString();

          if (res.data.success && res.data.settings.doctor_management_access) {
            let value = res.data.settings.doctor_management_access;
            if (typeof value === 'string') value = JSON.parse(value);
            
            if (userId && value[userId] === true) {
              // Add Doctors menu after Allowances (index 7)
              dynamicNavItems.splice(7, 0, { name: 'Doctors', icon: Users, route: '/department/dashboard/doctors' });
              dynamicNavItems.push({ name: 'Patient Booking', icon: Users, route: '/department/dashboard/patient-booking' });
              dynamicNavItems.push({ name: 'Patient History', icon: Users, route: '/department/dashboard/patient-history' });
            }
          }

          if (res.data.success && res.data.settings.peon_assignment_access) {
            let value = res.data.settings.peon_assignment_access;
            if (typeof value === 'string') value = JSON.parse(value);
            
            if (userId && value[userId] === true) {
              // Add Live Queue and Check In at the top
              dynamicNavItems.splice(1, 0, { name: 'Live Queue', icon: Users, route: '/department/dashboard/queue' });
              dynamicNavItems.splice(2, 0, { name: 'Check In', icon: Users, route: '/department/dashboard/check-in' });
            }
          }

          if (res.data.success && res.data.settings.sales_order_access) {
            let value = res.data.settings.sales_order_access;
            if (typeof value === 'string') value = JSON.parse(value);
            if (userId && value[userId] === true) {
              hasSalesOrder = true;
              dynamicNavItems.push({ name: 'Create Sales Order', icon: Package, route: '/department/dashboard/pharmacy/sales-order' });
              dynamicNavItems.push({ name: 'Sales Orders List', icon: FileText, route: '/department/dashboard/pharmacy/sales-order-list' });
              dynamicNavItems.push({ name: 'Create Sales Invoice', icon: Package, route: '/department/dashboard/pharmacy/sales-invoice' });
              dynamicNavItems.push({ name: 'Sales Invoices List', icon: FileText, route: '/department/dashboard/pharmacy/sales-invoice-list' });
              dynamicNavItems.push({ name: 'Online Orders', icon: Package, route: '/department/dashboard/online-orders' });
            }
          }

          if (res.data.success && res.data.settings.purchase_order_access) {
            let value = res.data.settings.purchase_order_access;
            if (typeof value === 'string') value = JSON.parse(value);
            if (userId && value[userId] === true) {
              hasPurchaseOrder = true;
              dynamicNavItems.push({ name: 'Purchase Orders', icon: Package, route: '/department/dashboard/purchase-orders' });
            }
          }

          if (res.data.success && res.data.settings.order_assign_access) {
            let value = res.data.settings.order_assign_access;
            if (typeof value === 'string') value = JSON.parse(value);
            if (userId && value[userId] === true) {
              hasOrderAssign = true;
              dynamicNavItems.push({ name: 'Order Assign', icon: Package, route: '/department/dashboard/order-assign' });
            }
          }

          if (res.data.success && res.data.settings.crm_access) {
            let value = res.data.settings.crm_access;
            if (typeof value === 'string') value = JSON.parse(value);
            if (userId && value[userId] === true) {
              dynamicNavItems.push({ name: 'CRM', icon: MessageSquare, route: '/department/dashboard/crm' });
            }
          }
        }
        
        // Build dynamic pharmacy items
        const subPharmacyItems = [];
        if (hasSalesOrder) {
          subPharmacyItems.push({ name: 'Generate Token', route: '/dashboard/pharmacy/generate-token' });
          subPharmacyItems.push({ name: 'Create Order', route: '/dashboard/pharmacy/create-order' });
          subPharmacyItems.push({ name: 'Item Master', route: '/dashboard/pharmacy/items' });
          subPharmacyItems.push({ name: 'Stock Details', route: '/dashboard/pharmacy/stock' });
          subPharmacyItems.push({ name: 'Local Customers', route: '/dashboard/pharmacy/customers' });
          subPharmacyItems.push({ name: 'Order Status', route: '/dashboard/pharmacy/order-status' });
        }
        if (hasPurchaseOrder) {
          subPharmacyItems.push({ name: 'Purchase Orders', route: '/dashboard/pharmacy/purchase-order' });
        }
        setPharmacyItems(subPharmacyItems);
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

        {/* EcoGreen APIs Collapsible Menu */}
        {pharmacyItems.length > 0 && (
          <>
            <Pressable 
              style={[styles.navItem, pathname.includes('/dashboard/pharmacy') && styles.navItemActive]} 
              onPress={() => setPharmacyOpen(!pharmacyOpen)}
            >
              <Package color={pathname.includes('/dashboard/pharmacy') ? Colors.light.primary : Colors.light.icon} size={20} />
              <Text style={[styles.navText, pathname.includes('/dashboard/pharmacy') && styles.navTextActive]}>EcoGreen APIs</Text>
              <View style={{ marginLeft: 'auto' }}>
                {pharmacyOpen ? (
                  <ChevronDown color={pathname.includes('/dashboard/pharmacy') ? Colors.light.primary : Colors.light.icon} size={16} />
                ) : (
                  <ChevronRight color={pathname.includes('/dashboard/pharmacy') ? Colors.light.primary : Colors.light.icon} size={16} />
                )}
              </View>
            </Pressable>

            {pharmacyOpen && pharmacyItems.map((subItem) => {
              const fullRoute = `/department${subItem.route}`;
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
          </>
        )}
      </ScrollView>

      <Pressable style={styles.logoutBtn} onPress={async () => {
        if (onClose) onClose();
        await AsyncStorage.clear();
        if (Platform.OS === 'web') {
          localStorage.clear();
        } else if ((global as any).localStorage) {
          (global as any).localStorage.clear();
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
