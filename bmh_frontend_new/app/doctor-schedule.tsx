import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Image, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Sun, Moon, PhoneCall, Clock, RotateCcw, RotateCw } from 'lucide-react-native';
import axios from 'axios';

interface Slide {
  type: 'Daily' | 'Weekly' | 'Monthly';
  page: number;
  totalPages: number;
  items: any[];
}

export default function DoctorScheduleTV() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Layout states
  const [screenRotation, setScreenRotation] = useState<'0' | '90R' | '90L'>('0'); // CSS Rotation

  const { width, height } = useWindowDimensions();

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cycleTimer = useRef<any>(null);

  const CYCLE_TIME = 10000; // 10 seconds per slide

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
  }, []);

  // Build slides whenever schedules or active grid mode changes
  useEffect(() => {
    if (schedules.length > 0) {
      buildSlides(schedules);
    }
  }, [schedules, activeIsPortrait]);

  // Cycle slides automatically
  useEffect(() => {
    if (slides.length > 0) {
      startCycle();
    }
    return () => stopCycle();
  }, [slides, currentSlideIndex]);

  const fetchSchedules = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/doctor-schedules');
      if (res.data.success) {
        const allDocs = res.data.data || [];
        setSchedules(allDocs);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const buildSlides = (allDocs: any[]) => {
    const daily = allDocs.filter((d: any) => d.schedule_type === 'Daily');
    const weekly = allDocs.filter((d: any) => d.schedule_type === 'Weekly');
    const monthly = allDocs.filter((d: any) => d.schedule_type === 'Monthly');

    const tempSlides: Slide[] = [];
    const chunkSize = 6; // Max 6 doctors per slide page

    const addChunkedSlides = (list: any[], type: 'Daily' | 'Weekly' | 'Monthly') => {
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

    addChunkedSlides(daily, 'Daily');
    addChunkedSlides(weekly, 'Weekly');
    addChunkedSlides(monthly, 'Monthly');

    setSlides(tempSlides);
    setCurrentSlideIndex(0);
  };

  const startCycle = () => {
    stopCycle();

    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: CYCLE_TIME,
      useNativeDriver: false,
    }).start();

    cycleTimer.current = setTimeout(() => {
      handleSlideTransition();
    }, CYCLE_TIME);
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

  // Vibrant, category-colored badge indicators for the active slide badge in header
  const headerBadgeTheme = {
    Daily: {
      bg: isDarkMode ? '#064E3B' : '#D1FAE5',
      text: isDarkMode ? '#34D399' : '#047857',
    },
    Weekly: {
      bg: isDarkMode ? '#1E3A8A' : '#DBEAFE',
      text: isDarkMode ? '#60A5FA' : '#1D4ED8',
    },
    Monthly: {
      bg: isDarkMode ? '#78350F' : '#FEF3C7',
      text: isDarkMode ? '#F59E0B' : '#B45309',
    }
  };

  // Colorful cycling accent templates for doctor cards to keep them visually distinct
  const cardAccentColors = [
    { bg: '#D1FAE5', text: '#065F46', border: '#10B981', darkBg: '#064E3B', darkText: '#34D399', darkBorder: '#10B981' }, // Emerald
    { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6', darkBg: '#1E3A8A', darkText: '#60A5FA', darkBorder: '#3B82F6' }, // Royal Blue
    { bg: '#F3E8FF', text: '#6B21A8', border: '#A855F7', darkBg: '#581C87', darkText: '#D8B4FE', darkBorder: '#A855F7' }, // Purple
    { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B', darkBg: '#78350F', darkText: '#F59E0B', darkBorder: '#F59E0B' }, // Amber
    { bg: '#E0F2FE', text: '#0369A1', border: '#0EA5E9', darkBg: '#0C4A6E', darkText: '#38BDF8', darkBorder: '#0EA5E9' }, // Sky
    { bg: '#FCE7F3', text: '#9D174D', border: '#EC4899', darkBg: '#831843', darkText: '#F9A8D4', darkBorder: '#EC4899' }, // Pink
    { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444', darkBg: '#7F1D1D', darkText: '#FCA5A5', darkBorder: '#EF4444' }, // Crimson
  ];

  // Progress Bar width calculation
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Calculate card layout styling dynamically based on Portrait/Landscape
  const getCardWidth = () => {
    if (Platform.OS !== 'web') return '100%';
    return activeIsPortrait ? '48%' : '31%'; // 2 columns in portrait, 3 columns in landscape
  };

  // Compact card height to fit content perfectly and remove empty space
  const getCardHeight = () => {
    if (Platform.OS !== 'web') return 'auto';
    return activeIsPortrait ? 220 : 270; // 220px in Portrait, 270px in Landscape
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
        <View style={[styles.header, { backgroundColor: theme.headerBg, borderColor: theme.border }]}>
          {/* Controls Bar (Left) - Icon only to save space in Portrait */}
          <View style={styles.controlsBar}>
            {/* Theme Toggle */}
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: theme.toggleBg, borderColor: theme.border }]} 
              onPress={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <Sun color="#F59E0B" size={16} /> : <Moon color="#94A3B8" size={16} />}
            </TouchableOpacity>

            {/* Rotate Left Button */}
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: theme.toggleBg, borderColor: theme.border }]} 
              onPress={handleRotateLeft}
              title="Rotate 90° Left"
            >
              <RotateCcw color={screenRotation === '90L' ? '#10B981' : '#E11D48'} size={16} />
            </TouchableOpacity>

            {/* Rotate Right Button */}
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: theme.toggleBg, borderColor: theme.border }]} 
              onPress={handleRotateRight}
              title="Rotate 90° Right"
            >
              <RotateCw color={screenRotation === '90R' ? '#10B981' : '#E11D48'} size={16} />
            </TouchableOpacity>
          </View>

          {/* Centered Logo & Brand Name */}
          <View style={styles.brandContainer}>
            <Image source={require('../assets/CompanyLogo.jpg')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.brandText, { color: theme.brandText }]}>BHARAT HEALTH CARE</Text>
          </View>

          {/* Right: Active Tab Indicator & Live Clock */}
          <View style={styles.rightHeaderContainer}>
            {currentSlide && (
              <View style={[styles.activeTabBadge, { backgroundColor: headerBadgeTheme[currentSlide.type].bg }]}>
                <Text style={[styles.activeTabBadgeText, { color: headerBadgeTheme[currentSlide.type].text }]}>
                  {currentSlide.type === 'Daily' ? 'DAILY' : currentSlide.type === 'Weekly' ? 'WEEKLY' : 'MONTHLY'}
                  {currentSlide.totalPages > 1 ? ` (${currentSlide.page}/${currentSlide.totalPages})` : ''}
                </Text>
              </View>
            )}

            <View style={styles.verticalDivider} />

            <View style={styles.clockBox}>
              <Text style={[styles.clockTime, { color: theme.text }]}>{currentTime}</Text>
            </View>
          </View>
        </View>

        {/* Main Grid Content */}
        <View style={styles.bodyContainer}>
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
                <View style={styles.grid}>
                  {currentSlide.items.map((doc, idx) => {
                    // Assign visual accents dynamically by rotating through color array
                    const accent = cardAccentColors[idx % cardAccentColors.length];
                    const badgeBg = isDarkMode ? accent.darkBg : accent.bg;
                    const badgeText = isDarkMode ? accent.darkText : accent.text;
                    const borderAccentColor = isDarkMode ? accent.darkBorder : accent.border;

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
                            height: getCardHeight(),
                          }
                        ]}
                      >
                        {/* Upper Section */}
                        <View style={styles.cardUpper}>
                          <View style={styles.cardHeader}>
                            <View style={[styles.deptBadge, { backgroundColor: badgeBg }]}>
                              <Text style={[styles.deptBadgeText, { color: badgeText }]}>
                                {doc.department || 'Specialist'}
                              </Text>
                            </View>
                          </View>

                          {/* Highlight doctor name in card color accent */}
                          <Text style={[styles.docName, { color: borderAccentColor }]} numberOfLines={1}>
                            {doc.name}
                          </Text>
                          <Text style={[styles.qualification, { color: theme.textSecondary }]} numberOfLines={2}>
                            {doc.qualification}
                          </Text>
                        </View>

                        {/* Timing Block (Shaded callout box at bottom of card) */}
                        <View style={[styles.timingBlock, { backgroundColor: theme.toggleBg }]}>
                          <Clock color={isDarkMode ? '#60A5FA' : '#1E40AF'} size={16} style={styles.timingIcon} />
                          <View style={styles.timingContent}>
                            <Text style={styles.timingLabel}>CONSULTING HOURS</Text>
                            <Text style={[styles.timingValue, { color: theme.text }]} numberOfLines={2}>
                              {doc.timing || 'By appointment only'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          )}
        </View>

        {/* Premium blue footer based on theme color definition */}
        <View style={[styles.footer, { backgroundColor: theme.headerBg, borderColor: theme.border }]}>
          <View style={styles.footerCalloutContainer}>
            <PhoneCall color={theme.brandColor} size={20} style={{ marginRight: 8 }} />
            <Text style={[styles.footerText, { color: theme.footerTextAccent }]}>
              FOR APPOINTMENTS & ENQUIRIES — CALL OR WHATSAPP:{' '}
              <Text style={[styles.footerPhoneHighlight, { color: theme.brandColor }]}>
                8093110888
              </Text>
            </Text>
          </View>
          <Text style={[styles.footerNote, { color: theme.footerTextAccent }]}>
            Please share: Name • Age • Gender • Mobile • Doctor • Preferred Date
          </Text>
        </View>
      </View>
    </View>
  );
}

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
    flex: 1,
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
});
