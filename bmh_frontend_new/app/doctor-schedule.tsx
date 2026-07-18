import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Animated, Platform, Image } from 'react-native';
import { ArrowLeft, Search, Calendar, MapPin, Clock, CircleDot, Play, Pause } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Colors } from '../constants/Colors';
import { useResponsive } from '../hooks/useResponsive';

export default function DoctorScheduleScreen() {
  const router = useRouter();
  const { isMobile } = useResponsive();
  
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [autoPlay, setAutoPlay] = useState(true);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const cycleTimer = useRef<any>(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (autoPlay) {
      startAutoCycle();
    } else {
      stopAutoCycle();
    }
    return () => stopAutoCycle();
  }, [autoPlay, activeTab]);

  const fetchSchedules = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/doctor-schedules');
      if (res.data.success) {
        setSchedules(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const startAutoCycle = () => {
    stopAutoCycle();
    cycleTimer.current = setInterval(() => {
      handleTabTransition((prev) => {
        if (prev === 'Daily') return 'Weekly';
        if (prev === 'Weekly') return 'Monthly';
        return 'Daily';
      });
    }, 8000); // Cycle every 8 seconds
  };

  const stopAutoCycle = () => {
    if (cycleTimer.current) {
      clearInterval(cycleTimer.current);
      cycleTimer.current = null;
    }
  };

  const handleTabTransition = (nextTabOrFunc: 'Daily' | 'Weekly' | 'Monthly' | ((prev: 'Daily' | 'Weekly' | 'Monthly') => 'Daily' | 'Weekly' | 'Monthly')) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab((prev) => {
        const nextVal = typeof nextTabOrFunc === 'function' ? nextTabOrFunc(prev) : nextTabOrFunc;
        return nextVal;
      });
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    });
  };

  const filtered = schedules.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(search.toLowerCase()) || 
      (item.department && item.department.toLowerCase().includes(search.toLowerCase())) ||
      (item.qualification && item.qualification.toLowerCase().includes(search.toLowerCase()));
    const matchesTab = item.schedule_type === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color="#1E293B" size={24} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>BHARAT HEALTH CARE</Text>
            <Text style={styles.subtitle}>Polyclinic & Diagnostic Centre — Doctor Consultation Schedule</Text>
          </View>
        </View>

        {/* Warning Badge */}
        <View style={styles.alertBanner}>
          <CircleDot color="#D97706" size={16} />
          <Text style={styles.alertText}>
            PLEASE CHECK YOUR DOCTOR'S DAY & TIME BEFORE VISITING (Schedules may change occasionally — kindly confirm via Phone/WhatsApp)
          </Text>
        </View>
      </View>

      {/* Main Layout */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.searchTabContainer}>
          {/* Search bar */}
          <View style={styles.searchBox}>
            <Search color="#64748B" size={20} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search by doctor name or specialty..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Tab buttons */}
          <View style={styles.tabsWrapper}>
            {(['Daily', 'Weekly', 'Monthly'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  activeTab === tab && styles.tabButtonActive,
                ]}
                onPress={() => {
                  setAutoPlay(false); // Stop autoplay when clicked manually
                  handleTabTransition(tab);
                }}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}>
                  {tab === 'Daily' ? 'Daily Schedule' : tab === 'Weekly' ? 'Weekly / Bi-Weekly' : 'Monthly Schedule'}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Play/Pause Autocycle Button */}
            <TouchableOpacity 
              style={[styles.playPauseButton, autoPlay && styles.playPauseButtonActive]}
              onPress={() => setAutoPlay(!autoPlay)}
            >
              {autoPlay ? <Pause color="#FFF" size={16} /> : <Play color="#0F766E" size={16} />}
              <Text style={[styles.playPauseText, autoPlay && styles.playPauseTextActive]}>
                {autoPlay ? 'Autocycling' : 'Cycle Tabs'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#0F766E" size="large" style={{ marginTop: 40 }} />
        ) : (
          <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
            {filtered.length === 0 ? (
              <View style={styles.noResultsBox}>
                <Text style={styles.noResultsText}>No doctors found matching the filters.</Text>
              </View>
            ) : (
              <View style={[styles.grid, isMobile && styles.gridMobile]}>
                {filtered.map((doc) => (
                  <View key={doc.id} style={[styles.card, isMobile && styles.cardMobile]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.deptBadge}>
                        <Text style={styles.deptBadgeText}>{doc.department || 'Specialist'}</Text>
                      </View>
                      {doc.fee && (
                        <Text style={styles.feeLabel}>
                          {doc.fee.startsWith('₹') ? doc.fee : `Fee: ${doc.fee}`}
                        </Text>
                      )}
                    </View>

                    <Text style={styles.docName}>{doc.name}</Text>
                    <Text style={styles.qualification}>{doc.qualification}</Text>

                    <View style={styles.infoRow}>
                      <Clock color="#0F766E" size={16} style={{ marginRight: 6 }} />
                      <Text style={styles.infoText}>{doc.timing || 'By appointment only'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <MapPin color="#64748B" size={16} style={{ marginRight: 6 }} />
                      <Text style={styles.infoText}>{doc.cabin || 'Consultation Cabin'}</Text>
                    </View>

                    {doc.notes ? (
                      <View style={styles.noteBox}>
                        <Text style={styles.noteText}>{doc.notes}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Appointment Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>FOR APPOINTMENT BOOKING / TOKEN ENQUIRY — CALL OR WHATSAPP</Text>
        <Text style={styles.footerPhone}>8093110888</Text>
        <Text style={styles.footerNote}>Please share: Patient Name • Age • Gender • Mobile Number • Doctor Name • Preferred Date of Consultation • Address</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
    marginLeft: 8,
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  searchTabContainer: {
    width: '100%',
    maxWidth: 1200,
    marginBottom: 24,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    }),
  },
  searchInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 15,
  },
  tabsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFF',
  },
  playPauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: '#E0F2F1',
    borderWidth: 1,
    borderColor: '#B2DFDB',
    borderRadius: 20,
    marginLeft: 'auto',
  },
  playPauseButtonActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  playPauseText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  playPauseTextActive: {
    color: '#FFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
    maxWidth: 1200,
  },
  gridMobile: {
    flexDirection: 'column',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    width: '32%', // 3 columns for web
    minWidth: 320,
    flexGrow: 1,
    ...Platform.select({
      web: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    }),
  },
  cardMobile: {
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deptBadge: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  deptBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  feeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  docName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  qualification: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  noteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#CBD5E1',
  },
  noteText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  noResultsBox: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  footer: {
    backgroundColor: '#0F766E',
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E0F2F1',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  footerPhone: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    marginVertical: 8,
  },
  footerNote: {
    fontSize: 12,
    color: '#B2DFDB',
    textAlign: 'center',
    maxWidth: 700,
    lineHeight: 16,
  },
});
