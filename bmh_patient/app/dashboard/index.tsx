import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Users, Calendar, ShoppingBag, Clock, Plus, BookOpen, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { useResponsive } from '../../hooks/useResponsive';
import axios from 'axios';

export default function PatientDashboard() {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Stats states
  const [specialistsCount, setSpecialistsCount] = useState(15);
  const [upcomingVisitsCount, setUpcomingVisitsCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const patientData = await AsyncStorage.getItem('patientUser');
        if (patientData) {
          const p = JSON.parse(patientData);
          setPatient(p);

          // 1. Fetch doctors count
          const docRes = await axios.get('https://napi.bharatmedicalhallplus.com/doctors');
          if (docRes.data.success && docRes.data.data) {
            setSpecialistsCount(docRes.data.data.length);
          }

          // 2. Fetch upcoming visits
          const bookingsRes = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings?patient_id=${p.id}`);
          if (bookingsRes.data.success && bookingsRes.data.data) {
            const activeBookings = bookingsRes.data.data.filter((b: any) => 
              b.status === 'Booked' || b.status === 'Waiting' || b.status === 'Current'
            );
            setUpcomingVisitsCount(activeBookings.length);
          }
          // 3. Fetch active online orders
          const ordersRes = await axios.get(`https://napi.bharatmedicalhallplus.com/online-orders/patient/${p.id}`);
          if (ordersRes.data.success && ordersRes.data.data) {
            const activeOrders = ordersRes.data.data.filter((o: any) => o.status === 'PENDING');
            setActiveOrdersCount(activeOrders.length);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  const patientName = patient?.name?.split(' ')[0] || 'Patient';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Welcome Banner */}
      <View style={[styles.banner, isMobile && styles.bannerMobile]}>
        <View style={[styles.bannerContent, isMobile && styles.bannerContentMobile]}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>OVERVIEW</Text>
          </View>
          <Text style={[styles.bannerTitle, isMobile && { fontSize: 24 }]}>Welcome back, {patientName}</Text>
          <Text style={styles.bannerSubtitle}>
            A clear snapshot of your health activity and upcoming care.
          </Text>
        </View>
        <View style={[styles.bannerActions, isMobile && styles.bannerActionsMobile]}>
          <TouchableOpacity 
            style={[styles.bannerBtnSecondary, isMobile && styles.bannerBtnMobile]} 
            onPress={() => router.push('/dashboard/appointments')}
          >
            <Clock size={16} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.bannerBtnSecondaryText}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.bannerBtnPrimary, isMobile && styles.bannerBtnMobile]} 
            onPress={() => router.push('/dashboard/doctors')}
          >
            <Plus size={16} color="#1e293b" style={{ marginRight: 8 }} />
            <Text style={styles.bannerBtnPrimaryText}>Book Appointment</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Card 1: On-call Specialists */}
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Users size={20} color="#3B82F6" />
          </View>
          <Text style={styles.statLabel}>On-call Specialists</Text>
          <Text style={styles.statValue}>{specialistsCount}</Text>
          <Text style={styles.statSubtext}>Available across departments</Text>
        </View>

        {/* Card 2: Active Orders */}
        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/dashboard/my-orders' as any)}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
            <ShoppingBag size={20} color="#F59E0B" />
          </View>
          <Text style={styles.statLabel}>Active Orders</Text>
          <Text style={styles.statValue}>{activeOrdersCount}</Text>
          <Text style={styles.statSubtext}>
            {activeOrdersCount > 0 ? 'Pending pharmacy delivery' : 'No active orders'}
          </Text>
          {activeOrdersCount > 0 && (
            <View style={styles.liveIndicator}>
              <Text style={styles.liveIndicatorText}>Live</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Card 3: Upcoming Visits */}
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <Calendar size={20} color="#10B981" />
          </View>
          <Text style={styles.statLabel}>Upcoming Visits</Text>
          <Text style={styles.statValue}>{upcomingVisitsCount}</Text>
          <Text style={styles.statSubtext}>
            {upcomingVisitsCount > 0 ? `${upcomingVisitsCount} visits scheduled` : 'No scheduled visits'}
          </Text>
        </View>
      </View>

      {/* Shortcuts Section */}
      <Text style={styles.sectionTitle}>Dashboard Shortcuts</Text>
      <Text style={styles.sectionSubtitle}>Jump straight into the things you do most</Text>

      <View style={styles.shortcutsGrid}>
        {/* Shortcut 1: Book Appointment */}
        <TouchableOpacity style={styles.shortcutCard} onPress={() => router.push('/dashboard/doctors')}>
          <View style={styles.shortcutIconWrapper}>
            <Calendar size={22} color="#3B82F6" />
          </View>
          <View style={styles.shortcutTextWrapper}>
            <Text style={styles.shortcutTitle}>Book Appointment</Text>
            <Text style={styles.shortcutDesc}>Reserve a slot with a specialist</Text>
          </View>
          <ChevronRight size={18} color={Colors.light.icon} />
        </TouchableOpacity>

        {/* Shortcut 2: Buy Medicines */}
        <TouchableOpacity 
          style={styles.shortcutCard} 
          onPress={() => Alert.alert('EcoGreen Medicine Store', 'The Medicine Store module is currently under development and will be released soon.')}
        >
          <View style={[styles.shortcutIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <ShoppingBag size={22} color="#10B981" />
          </View>
          <View style={styles.shortcutTextWrapper}>
            <Text style={styles.shortcutTitle}>Buy Medicines (Soon)</Text>
            <Text style={styles.shortcutDesc}>Browse the full pharmacy catalog</Text>
          </View>
          <ChevronRight size={18} color={Colors.light.icon} />
        </TouchableOpacity>

        {/* Shortcut 3: Order History */}
        <TouchableOpacity 
          style={styles.shortcutCard}
          onPress={() => Alert.alert('Orders History', 'The Pharmacy Orders module is currently under development and will be released soon.')}
        >
          <View style={[styles.shortcutIconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
            <BookOpen size={22} color="#F59E0B" />
          </View>
          <View style={styles.shortcutTextWrapper}>
            <Text style={styles.shortcutTitle}>Order History (Soon)</Text>
            <Text style={styles.shortcutDesc}>Track current and past orders</Text>
          </View>
          <ChevronRight size={18} color={Colors.light.icon} />
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    backgroundColor: Colors.light.background,
  },
  contentContainer: {
    padding: 24,
  },
  banner: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 24,
    marginBottom: 32,
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
      }
    })
  },
  bannerMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 20,
    gap: 20,
  },
  bannerContent: {
    flex: 1,
    minWidth: 280,
  },
  bannerContentMobile: {
    minWidth: 0,
    width: '100%',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1,
  },
  bannerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  bannerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  bannerActionsMobile: {
    flexDirection: 'column-reverse',
    width: '100%',
    gap: 10,
  },
  bannerBtnMobile: {
    width: '100%',
    justifyContent: 'center',
  },
  bannerBtnPrimary: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    fontWeight: '700',
  },
  bannerBtnPrimaryText: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 14,
  },
  bannerBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  bannerBtnSecondaryText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
    marginBottom: 40,
  },
  statCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 24,
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
      }
    })
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textMuted,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  liveIndicator: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginBottom: 20,
  },
  shortcutsGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
  },
  shortcutIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  shortcutTextWrapper: {
    flex: 1,
  },
  shortcutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  shortcutDesc: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
});
