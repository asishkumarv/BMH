import React from 'react';
import {  View, Text, StyleSheet, Pressable, Platform, ScrollView , Image } from 'react-native';
import { ArrowLeft, User, Briefcase, Building, ShieldCheck, Stethoscope, Truck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useResponsive } from '../hooks/useResponsive';

export default function RolesScreen() {
  const router = useRouter();
  const { isMobile } = useResponsive();

  const ROLES = [
    { id: 'patient', icon: User, title: 'Patient Login', desc: 'Book appointments, order medicines', route: '/patient/login' },
    { id: 'employee', icon: Briefcase, title: 'Employee Login', desc: 'Attendance, tasks, payroll', route: '/employee/login' },
    { id: 'deptadmin', icon: Building, title: 'Dept. Admin Login', desc: 'Department management', route: '/department/login' },
    { id: 'superadmin', icon: ShieldCheck, title: 'Super Admin Login', desc: 'Full system access', route: '/admin/login' },
    { id: 'doctor', icon: Stethoscope, title: 'Doctor Login', desc: 'Appointments, patients', route: '/doctor/login' },
    { id: 'delivery', icon: Truck, title: 'Delivery Boy Login', desc: 'Order deliveries', route: '/delivery/login' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
      <View style={styles.backgroundBlob1} />

      <View style={[styles.card, isMobile && styles.cardMobile]}>
        
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color="#64748B" size={20} />
          </Pressable>
          
          <View style={{ alignItems: 'center', flex: 1, marginRight: 40 }}>
            <Image source={require('../assets/CompanyLogo.jpg')} style={{ width: 220, height: 60 }} resizeMode="contain" />
          </View>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Identify your role to access the workspace</Text>
        </View>

        <View style={styles.rolesGrid}>
          {ROLES.map((role) => (
            <Pressable 
              key={role.id} 
              style={({ pressed }) => [
                styles.roleCard, 
                isMobile && styles.roleCardMobile,
                pressed && styles.roleCardPressed
              ]}
              onPress={() => router.push(role.route as any)}
            >
              <View style={styles.iconWrapper}>
                <role.icon color="#3B82F6" size={24} />
              </View>
              <Text style={styles.roleTitle}>{role.title}</Text>
              <Text style={styles.roleDesc}>{role.desc}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.continueButton} disabled>
            <Text style={styles.continueText}>Select a role to continue</Text>
          </Pressable>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backgroundBlob1: {
    position: 'absolute',
    top: -200,
    right: -200,
    width: 800,
    height: 800,
    borderRadius: 400,
    backgroundColor: '#F0FDF4',
    opacity: 0.4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 48,
    width: '100%',
    maxWidth: 900,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.01)',
      },
      default: {
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
      }
    })
  },
  cardMobile: {
    padding: 24,
    borderRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E6F2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoPlus: {
    color: '#3B82F6',
    fontWeight: '900',
    fontSize: 16,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  roleCard: {
    width: '31%',
    minWidth: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }
    })
  },
  roleCardMobile: {
    width: '100%',
  },
  roleCardPressed: {
    borderColor: '#3B82F6',
    backgroundColor: '#FAFAFA',
    transform: [{ scale: 0.98 }],
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E6F2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  roleDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  continueText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 15,
  }
});
