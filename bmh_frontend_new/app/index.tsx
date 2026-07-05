import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView, Image } from 'react-native';
import { ShieldCheck, Clock, Heart, ArrowRight } from 'lucide-react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useResponsive } from '../hooks/useResponsive';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LandingPage() {
  const router = useRouter();
  const { isMobile } = useResponsive();

  const FEATURES = [
    { icon: ShieldCheck, title: 'Secure', subtitle: 'HIPAA Compliant', color: '#3B82F6', bgColor: '#EFF6FF' },
    { icon: Clock, title: '24/7', subtitle: 'Always Available', color: '#10B981', bgColor: '#ECFDF5' },
    { icon: Heart, title: 'Care', subtitle: 'Patient First', color: '#06B6D4', bgColor: '#ECFEFF' },
  ];

  const rootNavigationState = useRootNavigationState();

  React.useEffect(() => {
    if (!rootNavigationState?.key) return;

    const checkAuth = async () => {
      try {
        if (Platform.OS === 'web') {
          if (localStorage.getItem('adminUser')) {
            router.replace('/admin/dashboard');
            return;
          }
          const empStr = localStorage.getItem('employeeUser');
          if (empStr) {
            const user = JSON.parse(empStr);
            if (user.department === 'Delivery') {
              router.replace('/delivery/dashboard');
            } else {
              router.replace('/employee/dashboard');
            }
            return;
          }
        } else {
          const adminUser = await AsyncStorage.getItem('adminUser');
          if (adminUser) {
            router.replace('/admin/dashboard');
            return;
          }
          const empUser = await AsyncStorage.getItem('employeeUser');
          if (empUser) {
            const user = JSON.parse(empUser);
            if (user.department === 'Delivery') {
              router.replace('/delivery/dashboard');
            } else {
              router.replace('/employee/dashboard');
            }
            return;
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkAuth();
  }, [rootNavigationState?.key]);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
      <View style={styles.backgroundBlob1} />
      <View style={styles.backgroundBlob2} />

      <View style={[styles.card, isMobile && styles.cardMobile]}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image source={require('../assets/CompanyLogo.jpg')} style={{ width: 250, height: 70 }} resizeMode="contain" />
        </View>

        <Text style={styles.title}>
          <Text style={{ color: '#1E293B' }}>Bharat </Text>
          <Text style={{ color: '#3B82F6' }}>Medical </Text>
          <Text style={{ color: '#1E293B' }}>Hall</Text>
        </Text>
        
        <Text style={styles.subtitle}>
          Complete healthcare management solution for hospitals, doctors, and patients
        </Text>

        <Pressable 
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} 
          onPress={() => router.push('/roles')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
          <ArrowRight color="#FFF" size={20} />
        </Pressable>

        <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
          {FEATURES.map((feat, idx) => (
            <View key={idx} style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
              <View style={[styles.featureIconBox, { backgroundColor: feat.bgColor }]}>
                <feat.icon color={feat.color} size={24} />
              </View>
              <Text style={styles.featureTitle}>{feat.title}</Text>
              <Text style={styles.featureSubtitle}>{feat.subtitle}</Text>
            </View>
          ))}
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
    top: -100,
    right: -100,
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: '#E0F2FE',
    opacity: 0.5,
  },
  backgroundBlob2: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 800,
    height: 800,
    borderRadius: 400,
    backgroundColor: '#F0FDF4',
    opacity: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 48,
    width: '100%',
    maxWidth: 900,
    alignItems: 'center',
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
  logoContainer: {
    marginBottom: 32,
  },
  logoBadge: {
    width: 90,
    height: 90,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: -2,
  },
  logoIcon: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#34D399',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 500,
    lineHeight: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 48,
    ...Platform.select({
      web: {
        transition: 'transform 0.2s, box-shadow 0.2s',
      }
    })
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  featuresGrid: {
    flexDirection: 'row',
    gap: 24,
    width: '100%',
  },
  featuresGridMobile: {
    flexDirection: 'column',
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
      }
    })
  },
  featureCardMobile: {
    width: '100%',
  },
  featureIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  }
});
