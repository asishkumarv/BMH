import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Image, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Sun, Moon, PhoneCall, Clock, RotateCcw, RotateCw, ArrowLeft } from 'lucide-react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useResponsive } from '../hooks/useResponsive';

// Light & Dark theme maps with premium clinic-blue header/footer backgrounds
const darkTheme = {
  bg: '#0F172A',
  headerBg: '#1E3A8A', // Premium deep royal blue
  border: '#2563EB', // Sleek blue separator border
  cardBg: '#1E293B',
  cardBorder: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  brandText: '#FFFFFF', // Header title stands out in clean white
  brandColor: '#60A5FA', // Secondary branding callout
  accentColor: '#3B82F6',
  toggleBg: '#0F172A',
  footerTextAccent: '#93C5FD', // Light sky blue accent text
};

const lightTheme = {
  bg: '#F8FAFC',
  headerBg: '#EFF6FF', // Soft, clean clinic baby blue
  border: '#DBEAFE', // Soft blue border
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  text: '#1E293B',
  textSecondary: '#64748B',
  brandText: '#1E3A8A', // Header title in royal blue
  brandColor: '#1D4ED8', // Primary branding color
  accentColor: '#2563EB',
  toggleBg: '#F1F5F9',
  footerTextAccent: '#1E40AF', // Muted royal blue accent text
};

const styles: any = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  progressBarBg: {
    height: 5,
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderBottomWidth: 1.5,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 100,
    height: 28,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rightHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  activeTabBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  activeTabBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  verticalDivider: {
    width: 1.5,
    height: 24,
    backgroundColor: '#475569',
  },
  clockBox: {
    justifyContent: 'center',
  },
  clockTime: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  bodyContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    minWidth: 280,
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  cardUpper: {
    padding: 16,
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  deptBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  deptBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tokenAvailableBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  tokenAvailableBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  docName: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4,
  },
  qualification: {
    fontSize: 15,
    lineHeight: 20,
  },
  timingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 163, 175, 0.15)',
  },
  timingIcon: {
    marginRight: 10,
  },
  timingContent: {
    flex: 1,
  },
  timingLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timingValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderTopWidth: 1.5,
    flexWrap: 'wrap',
    gap: 12,
  },
  footerCalloutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerPhoneHighlight: {
    fontWeight: '900',
    fontSize: 22,
  },
  footerNote: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerMobile: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scrollGridContent: {
    paddingBottom: 24,
  },
  footerMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  footerCalloutContainerMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  footerTextMobile: {
    fontSize: 11,
    textAlign: 'center',
  },
  footerPhoneHighlightMobile: {
    fontSize: 18,
  },
  footerNoteMobile: {
    fontSize: 10,
    textAlign: 'center',
  },
  timingBlockTop: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  timingValueBig: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginVertical: 2,
  },
  footerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    maxWidth: 650,
  },
  navButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  navDot: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  navDotText: {
    fontSize: 10,
    fontWeight: '800',
  },
  navPauseButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  footerPortrait: {
    flexDirection: 'column',
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  footerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  footerTopRowPortrait: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
  },
  footerControlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  footerControlsRowPortrait: {
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
});

interface Slide {
  type: 'Today' | 'Next Schedule' | 'Daily' | 'Weekly' | 'Monthly';
  page: number;
  totalPages: number;
  items: any[];
}

export default function DoctorScheduleTV() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Layout states
  const [screenRotation, setScreenRotation] = useState<'0' | '90R' | '90L'>('0'); // CSS Rotation

  const { width, height, isMobile, isTablet } = useResponsive();

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cycleTimer = useRef<any>(null);

  // Automatically adjust grid layout based on screen rotation:
  // Rotation (90R or 90L) forces Portrait mode, normal rotation uses Landscape mode.
  const activeIsPortrait = screenRotation !== '0';

  // Live Clock Update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Fetch Schedules
  useEffect(() => {
    fetchSchedules();
    const interval = setInterval(fetchSchedules, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Build slides whenever schedules, slots or active grid mode changes
  useEffect(() => {
    buildSlides(schedules, slots);
  }, [schedules, slots, activeIsPortrait]);

  // Cycle slides automatically
  useEffect(() => {
    if (slides.length > 0 && !isPaused) {
      startCycle();
    } else {
      stopCycle();
    }
    return () => stopCycle();
  }, [slides, currentSlideIndex, isPaused]);

  const fetchSchedules = async () => {
    try {
      const [schedRes, slotsRes] = await Promise.all([
        axios.get('https://napi.bharatmedicalhallplus.com/doctor-schedules'),
        axios.get('https://napi.bharatmedicalhallplus.com/doctors/slots')
      ]);

      let allDocs = [];
      let allSlots = [];

      if (schedRes.data.success) {
        allDocs = schedRes.data.data || [];
      }
      if (slotsRes.data.success) {
        allSlots = slotsRes.data.data || [];
      }

      setSchedules(allDocs);
      setSlots(allSlots);
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const buildSlides = (allDocs: any[], allSlots: any[]) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // Filter slots for Today
    const todaySlots = allSlots.filter((s: any) => s.date && s.date.split('T')[0] === todayStr);

    // Group Today slots by doctor_id or doctor_name
    const todayMap = new Map();
    for (const slot of todaySlots) {
      const key = slot.doctor_id || slot.doctor_name;
      if (!todayMap.has(key)) {
        todayMap.set(key, {
          ...slot,
          slotsList: [slot]
        });
      } else {
        todayMap.get(key).slotsList.push(slot);
      }
    }
    const todayGroupedList = Array.from(todayMap.values());

    // Filter slots for Next Schedules (future dates)
    const nextSlots = allSlots.filter((s: any) => s.date && s.date.split('T')[0] > todayStr);

    // Group Next Schedule slots by doctor_id and date
    const nextMap = new Map();
    for (const slot of nextSlots) {
      const dateKey = slot.date ? slot.date.split('T')[0] : '';
      const key = `${slot.doctor_id || slot.doctor_name}_${dateKey}`;
      if (!nextMap.has(key)) {
        nextMap.set(key, {
          ...slot,
          slotsList: [slot]
        });
      } else {
        nextMap.get(key).slotsList.push(slot);
      }
    }
    const nextGroupedList = Array.from(nextMap.values());

    const daily = allDocs.filter((d: any) => d.schedule_type === 'Daily');
    const weekly = allDocs.filter((d: any) => d.schedule_type === 'Weekly');
    const monthly = allDocs.filter((d: any) => d.schedule_type === 'Monthly');

    const tempSlides: Slide[] = [];
    const chunkSize = 6; // Max 6 doctors per slide page

    const addChunkedSlides = (list: any[], type: 'Today' | 'Next Schedule' | 'Daily' | 'Weekly' | 'Monthly') => {
      if (list.length === 0) return;
      const totalPages = Math.ceil(list.length / chunkSize);
      for (let i = 0; i < list.length; i += chunkSize) {
        const pageNum = Math.floor(i / chunkSize) + 1;
        tempSlides.push({
          type,
          page: pageNum,
          totalPages,
          items: list.slice(i, i + chunkSize)
        });
      }
    };

    addChunkedSlides(todayGroupedList, 'Today');
    addChunkedSlides(nextGroupedList, 'Next Schedule');
    addChunkedSlides(daily, 'Daily');
    addChunkedSlides(weekly, 'Weekly');
    addChunkedSlides(monthly, 'Monthly');

    setSlides(tempSlides);
    setCurrentSlideIndex(0);
  };

  const startCycle = () => {
    stopCycle();
    if (slides.length === 0) return;

    const currentSlide = slides[currentSlideIndex];
    const duration = currentSlide.type === 'Today' || currentSlide.type === 'Next Schedule' ? 20000 : 10000;

    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false,
    }).start();

    cycleTimer.current = setTimeout(() => {
      handleSlideTransition();
    }, duration);
  };

  const stopCycle = () => {
    if (cycleTimer.current) {
      clearTimeout(cycleTimer.current);
      cycleTimer.current = null;
    }
    progressAnim.setValue(0);
  };

  const handleSlideTransition = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  };

  const currentSlide = slides[currentSlideIndex];
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Unified royal blue active slide tab badges
  const headerBadgeTheme: any = {
    Today: {
      bg: isDarkMode ? '#1E3A8A' : '#DBEAFE',
      text: isDarkMode ? '#93C5FD' : '#1E40AF',
    },
    'Next Schedule': {
      bg: isDarkMode ? '#1E3A8A' : '#DBEAFE',
      text: isDarkMode ? '#93C5FD' : '#1E40AF',
    },
    Daily: {
      bg: isDarkMode ? '#1E3A8A' : '#DBEAFE',
      text: isDarkMode ? '#93C5FD' : '#1E40AF',
    },
    Weekly: {
      bg: isDarkMode ? '#1E3A8A' : '#DBEAFE',
      text: isDarkMode ? '#93C5FD' : '#1E40AF',
    },
    Monthly: {
      bg: isDarkMode ? '#1E3A8A' : '#DBEAFE',
      text: isDarkMode ? '#93C5FD' : '#1E40AF',
    }
  };

  // Same professional dark blue accent across all doctor cards
  const darkBlueAccent = {
    bg: '#DBEAFE',
    text: '#1E40AF',
    border: '#2563EB',
    darkBg: '#1E3A8A',
    darkText: '#93C5FD',
    darkBorder: '#3B82F6'
  };

  // Progress Bar width calculation
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Calculate card layout styling dynamically based on screen size / Portrait / Landscape
  const getCardWidth = () => {
    if (isMobile) return '100%';
    if (isTablet) return '48%';
    if (Platform.OS !== 'web') return '100%';
    return activeIsPortrait ? '48%' : '31%'; // 2 columns in portrait, 3 columns in landscape
  };

  // Dynamic card min-height to fit slot details nicely without overflow
  const getCardMinHeight = (type: string) => {
    if (isMobile) return 'auto';
    if (Platform.OS !== 'web') return 'auto';
    if (type === 'Next Schedule') return activeIsPortrait ? 240 : 280;
    return activeIsPortrait ? 210 : 250;
  };

  // Rotation Wrapper Style with perfect centering offset calculations
  const getRotationStyle = (): any => {
    if (screenRotation === '90R' || screenRotation === '90L') {
      const angle = screenRotation === '90R' ? '90deg' : '-90deg';
      return {
        width: height,
        height: width,
        position: 'absolute',
        left: (width - height) / 2,
        top: (height - width) / 2,
        transform: [{ rotate: angle }],
      };
    }
    return {
      width: '100%',
      height: '100%',
    };
  };

  const handleRotateLeft = () => {
    setScreenRotation(screenRotation === '90L' ? '0' : '90L');
  };

  const handleRotateRight = () => {
    setScreenRotation(screenRotation === '90R' ? '0' : '90R');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={getRotationStyle()}>
        {/* Dynamic Slide Progress Bar */}
        <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>

        {/* Premium blue header based on theme color definition */}
        <View style={[
          styles.header, 
          { backgroundColor: theme.headerBg, borderColor: theme.border },
          isMobile && styles.headerMobile
        ]}>
          {/* Controls Bar (Left) - Icon only to save space in Portrait */}
          <View style={styles.controlsBar}>
            {/* Back Button */}
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: theme.toggleBg, borderColor: theme.border }]} 
              onPress={() => router.replace('/')}
            >
              <ArrowLeft color={isDarkMode ? '#F8FAFC' : '#1E293B'} size={16} />
            </TouchableOpacity>

            {/* Theme Toggle */}
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: theme.toggleBg, borderColor: theme.border }]} 
              onPress={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? <Sun color="#F59E0B" size={16} /> : <Moon color="#94A3B8" size={16} />}
            </TouchableOpacity>

            {/* Rotate Left Button */}
            {!isMobile && (
              <TouchableOpacity 
                style={[styles.controlButton, { backgroundColor: theme.toggleBg, borderColor: theme.border }]} 
                onPress={handleRotateLeft}
              >
                <RotateCcw color={screenRotation === '90L' ? '#10B981' : '#E11D48'} size={16} />
              </TouchableOpacity>
            )}

            {/* Rotate Right Button */}
            {!isMobile && (
              <TouchableOpacity 
                style={[styles.controlButton, { backgroundColor: theme.toggleBg, borderColor: theme.border }]} 
                onPress={handleRotateRight}
              >
                <RotateCw color={screenRotation === '90R' ? '#10B981' : '#E11D48'} size={16} />
              </TouchableOpacity>
            )}
          </View>

          {/* Centered Logo & Brand Name */}
          <View style={styles.brandContainer}>
            <Image source={require('../assets/CompanyLogo.jpg')} style={styles.logo} resizeMode="contain" />
            {!isMobile && <Text style={[styles.brandText, { color: theme.brandText }]}>BHARAT HEALTH CARE</Text>}
          </View>

          {/* Right: Active Tab Indicator & Live Clock */}
          <View style={styles.rightHeaderContainer}>
            {currentSlide && (
              <View style={[styles.activeTabBadge, { backgroundColor: headerBadgeTheme[currentSlide.type].bg }]}>
                <Text style={[styles.activeTabBadgeText, { color: headerBadgeTheme[currentSlide.type].text }]}>
                  {currentSlide.type === 'Today' ? 'TODAY' : currentSlide.type === 'Next Schedule' ? 'NEXT SCHEDULE' : currentSlide.type.toUpperCase()}
                  {currentSlide.totalPages > 1 ? ` (${currentSlide.page}/${currentSlide.totalPages})` : ''}
                </Text>
              </View>
            )}

            {!isMobile && (
              <>
                <View style={styles.verticalDivider} />
                <View style={styles.clockBox}>
                  <Text style={[styles.clockTime, { color: theme.text }]}>{currentTime}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Main Grid Content */}
        <View style={styles.bodyContainer}>
          {currentSlide && (
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#60A5FA' : '#1E40AF' }]}>
              {currentSlide.type === 'Today' ? "TODAY'S CONSULTING SCHEDULES" :
               currentSlide.type === 'Next Schedule' ? "UPCOMING CONSULTING SCHEDULES" :
               currentSlide.type === 'Daily' ? "REGULAR DAILY TIME-TABLE" :
               currentSlide.type === 'Weekly' ? "REGULAR WEEKLY TIME-TABLE" :
               "REGULAR MONTHLY TIME-TABLE"}
            </Text>
          )}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accentColor} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading schedules...</Text>
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim, width: '100%', height: '100%' }}>
              {!currentSlide || currentSlide.items.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No schedules available for this view.</Text>
                </View>
              ) : (
                <ScrollView 
                  style={{ flex: 1 }} 
                  contentContainerStyle={styles.scrollGridContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.grid}>
                    {currentSlide.items.map((doc, idx) => {
                      const accent = darkBlueAccent;
                      const badgeBg = isDarkMode ? accent.darkBg : accent.bg;
                      const badgeText = isDarkMode ? accent.darkText : accent.text;
                      const borderAccentColor = isDarkMode ? accent.darkBorder : accent.border;

                       // Helper functions for AM/PM formatting
                      const formatTimeAMPM = (timeStr: string) => {
                        if (!timeStr) return '';
                        const parts = timeStr.split(':');
                        let hours = parseInt(parts[0], 10);
                        const minutes = parts[1] || '00';
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        const hoursStr = hours.toString().padStart(2, '0');
                        return `${hoursStr}:${minutes} ${ampm}`;
                      };

                      const formatAvailableTime = (timeStr: string) => {
                        if (!timeStr) return '';
                        if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
                          return timeStr;
                        }
                        return formatTimeAMPM(timeStr);
                      };

                      const formatScheduleTiming = (timingStr: string) => {
                        if (!timingStr) return '';
                        const rangeRegex = /^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/;
                        const match = timingStr.trim().match(rangeRegex);
                        if (match) {
                          return `${formatTimeAMPM(`${match[1]}:${match[2]}:00`)} - ${formatTimeAMPM(`${match[3]}:${match[4]}:00`)}`;
                        }
                        return timingStr;
                      };

                      // Map properties dynamically based on slide type (doctor_schedule vs doctor_slot)
                      const isSlot = currentSlide.type === 'Today' || currentSlide.type === 'Next Schedule';
                      const name = isSlot ? doc.doctor_name : doc.name;
                      const department = isSlot ? doc.doctor_department : doc.department;
                      const qualification = isSlot ? (doc.doctor_role || 'Specialist') : doc.qualification;

                      let timing = '';
                      if (isSlot) {
                        const start = doc.start_time ? formatTimeAMPM(doc.start_time) : '';
                        const end = doc.end_time ? formatTimeAMPM(doc.end_time) : '';
                        timing = `${start} - ${end}`;
                      } else {
                        timing = formatScheduleTiming(doc.timing || 'By appointment only');
                      }

                      // Format date for next schedule
                      const showDate = currentSlide.type === 'Next Schedule' && doc.date;
                      const formattedDate = showDate ? new Date(doc.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      }) : '';

                      // Token Availability Check
                      const tokensAvailable = isSlot && doc.slotsList && doc.slotsList.some((s: any) => {
                        const booked = parseInt(s.booked_count || '0', 10);
                        const total = parseInt(s.total_tokens || '0', 10);
                        return total > 0 && booked < total;
                      });

                      return (
                        <View 
                          key={doc.id} 
                          style={[
                            styles.card, 
                            { 
                              backgroundColor: theme.cardBg, 
                              borderColor: theme.cardBorder,
                              borderTopColor: borderAccentColor,
                              borderTopWidth: 6,
                              width: getCardWidth(),
                              minHeight: getCardMinHeight(currentSlide.type),
                            }
                          ]}
                        >
                          {/* Upper Section */}
                          <View style={styles.cardUpper}>
                            <View style={styles.cardHeader}>
                              <View style={[styles.deptBadge, { backgroundColor: badgeBg }]}>
                                <Text style={[styles.deptBadgeText, { color: badgeText }]}>
                                  {department || 'Specialist'}
                                </Text>
                              </View>

                              {tokensAvailable && doc.doctor_status !== 'Absent' && (
                                <View style={[
                                  styles.tokenAvailableBadge,
                                  { 
                                    backgroundColor: isDarkMode ? '#064E3B' : '#D1FAE5',
                                    borderColor: isDarkMode ? '#10B981' : '#34D399'
                                  }
                                ]}>
                                  <Text style={[
                                    styles.tokenAvailableBadgeText,
                                    { color: isDarkMode ? '#34D399' : '#065F46' }
                                  ]}>
                                    TOKEN AVAILABLE
                                  </Text>
                                </View>
                              )}

                              {doc.doctor_status === 'Delayed' && (
                                <View style={[
                                  styles.tokenAvailableBadge,
                                  { 
                                    backgroundColor: '#FEF9C3',
                                    borderColor: '#FEE2E2',
                                    borderWidth: 1
                                  }
                                ]}>
                                  <Text style={[
                                    styles.tokenAvailableBadgeText,
                                    { color: '#A16207' }
                                  ]}>
                                    DELAYED
                                  </Text>
                                </View>
                              )}

                              {doc.doctor_status === 'Absent' && (
                                <View style={[
                                  styles.tokenAvailableBadge,
                                  { 
                                    backgroundColor: '#FEE2E2',
                                    borderColor: '#FECACA',
                                    borderWidth: 1
                                  }
                                ]}>
                                  <Text style={[
                                    styles.tokenAvailableBadgeText,
                                    { color: '#B91C1C' }
                                  ]}>
                                    ABSENT
                                  </Text>
                                </View>
                              )}

                              {doc.doctor_status === 'Available' && (
                                <View style={[
                                  styles.tokenAvailableBadge,
                                  { 
                                    backgroundColor: '#DCFCE7',
                                    borderColor: '#BBF7D0',
                                    borderWidth: 1
                                  }
                                ]}>
                                  <Text style={[
                                    styles.tokenAvailableBadgeText,
                                    { color: '#15803D' }
                                  ]}>
                                    ARRIVED
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Highlight doctor name in card color accent at the top */}
                            <Text style={[styles.docName, { color: borderAccentColor }]} numberOfLines={1}>
                              {name}
                            </Text>

                            {/* Qualification / Role directly under doctor name */}
                            <Text style={[styles.qualification, { color: theme.textSecondary }]} numberOfLines={3}>
                              {qualification}
                            </Text>

                            {/* Highlighted Timing Block below qualification */}
                            <View style={[
                              styles.timingBlockTop, 
                              { 
                                backgroundColor: isDarkMode ? '#1E3A8A' : '#EFF6FF',
                                borderColor: borderAccentColor,
                                borderLeftWidth: 4,
                                marginVertical: 10
                              }
                            ]}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <Clock color={isDarkMode ? '#60A5FA' : '#1E40AF'} size={16} style={styles.timingIcon} />
                                <Text style={[styles.timingLabel, { color: isDarkMode ? '#93C5FD' : '#1D4ED8' }]}>
                                  {showDate ? `DATE & HOURS` : `CONSULTING HOURS`}
                                </Text>
                              </View>
                              
                              {isSlot && doc.slotsList ? (
                                doc.slotsList.map((s: any, sIdx: number) => {
                                  const start = s.start_time ? formatTimeAMPM(s.start_time) : '';
                                  const end = s.end_time ? formatTimeAMPM(s.end_time) : '';
                                  return (
                                    <View key={sIdx} style={{ marginBottom: 6 }}>
                                      <Text style={[
                                        styles.timingValueBig, 
                                        { color: theme.text },
                                        s.doctor_status === 'Absent' && { textDecorationLine: 'line-through', color: '#94a3b8' }
                                      ]}>
                                        {showDate ? `${formattedDate} • ${start} - ${end}` : `${start} - ${end}`}
                                      </Text>
                                      
                                      {s.doctor_status === 'Delayed' && (
                                        <View style={{ backgroundColor: '#FEF9C3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 4, borderWidth: 1, borderColor: '#FEF08A', alignSelf: 'flex-start' }}>
                                          <Text style={{ color: '#A16207', fontWeight: 'bold', fontSize: 13 }}>
                                            Delayed: Expected from {formatAvailableTime(s.doctor_available_time)}
                                          </Text>
                                        </View>
                                      )}
                                      
                                      {s.doctor_status === 'Available' && (
                                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 4, borderWidth: 1, borderColor: '#BBF7D0', alignSelf: 'flex-start' }}>
                                          <Text style={{ color: '#15803D', fontWeight: 'bold', fontSize: 13 }}>
                                            Doctor Arrived / Present
                                          </Text>
                                        </View>
                                      )}

                                      {s.doctor_status === 'Absent' && (
                                        <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 4, borderWidth: 1, borderColor: '#FECACA', alignSelf: 'flex-start' }}>
                                          <Text style={{ color: '#B91C1C', fontWeight: 'bold', fontSize: 13 }}>
                                            Doctor Absent Today
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                  );
                                })
                              ) : (
                                <Text style={[styles.timingValueBig, { color: theme.text }]}>
                                  {timing}
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </Animated.View>
          )}
        </View>

        {/* Premium blue footer based on theme color definition */}
        <View style={[
          styles.footer, 
          { backgroundColor: theme.headerBg, borderColor: theme.border },
          (isMobile || activeIsPortrait) && styles.footerPortrait
        ]}>
          {/* Top Row: Appointments & Info */}
          <View style={[
            styles.footerTopRow, 
            (isMobile || activeIsPortrait) && styles.footerTopRowPortrait
          ]}>
            <View style={styles.footerCalloutContainer}>
              <PhoneCall color={theme.brandColor} size={isMobile || activeIsPortrait ? 12 : 14} style={{ marginRight: 6 }} />
              <Text style={[
                styles.footerText, 
                { color: theme.footerTextAccent },
                (isMobile || activeIsPortrait) && { fontSize: 11 }
              ]}>
                FOR ENQUIRIES & APPOINTMENTS — CALL OR WHATSAPP:{' '}
                <Text style={[
                  styles.footerPhoneHighlight, 
                  { color: theme.brandColor },
                  (isMobile || activeIsPortrait) && { fontSize: 16 }
                ]}>
                  8093110888
                </Text>
              </Text>
            </View>

            <Text style={[
              styles.footerNote, 
              { color: theme.footerTextAccent },
              (isMobile || activeIsPortrait) && { fontSize: 9 }
            ]}>
              Share Details: Name • Age • Gender • Doctor • Date
            </Text>
          </View>

          {/* Bottom Row: Controls */}
          <View style={[
            styles.footerControlsRow,
            (isMobile || activeIsPortrait) && styles.footerControlsRowPortrait
          ]}>
            <TouchableOpacity 
              style={[styles.navButton, { borderColor: theme.border, backgroundColor: theme.toggleBg }]} 
              onPress={() => {
                stopCycle();
                setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
              }}
            >
              <Text style={{ color: theme.text, fontSize: 11, fontWeight: '800' }}>◀ PREV</Text>
            </TouchableOpacity>

            {/* Only show slide selection dots/pills if not in portrait/mobile to save space */}
            {!(isMobile || activeIsPortrait) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {slides.map((s, idx) => (
                  <TouchableOpacity 
                    key={idx}
                    style={[
                      styles.navDot, 
                      { 
                        backgroundColor: idx === currentSlideIndex ? theme.accentColor : theme.toggleBg,
                        borderColor: theme.border 
                      }
                    ]}
                    onPress={() => {
                      stopCycle();
                      setCurrentSlideIndex(idx);
                    }}
                  >
                    <Text style={[
                      styles.navDotText, 
                      { color: idx === currentSlideIndex ? '#FFFFFF' : theme.textSecondary }
                    ]}>
                      {s.type === 'Today' ? 'Today' : s.type === 'Next Schedule' ? 'Next' : s.type}
                      {s.totalPages > 1 ? ` ${s.page}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity 
              style={[styles.navButton, { borderColor: theme.border, backgroundColor: theme.toggleBg }]} 
              onPress={() => {
                stopCycle();
                setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
              }}
            >
              <Text style={{ color: theme.text, fontSize: 11, fontWeight: '800' }}>NEXT ▶</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.navPauseButton, 
                { 
                  backgroundColor: isPaused ? '#EF4444' : '#10B981',
                  borderColor: theme.border 
                }
              ]}
              onPress={() => setIsPaused(!isPaused)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 9, letterSpacing: 0.5 }}>
                {isPaused ? 'PAUSED' : 'AUTO CYCLE'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
