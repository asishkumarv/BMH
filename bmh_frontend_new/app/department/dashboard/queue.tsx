import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform, Animated, Easing, Modal, Image, UIManager, LayoutAnimation, Alert } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { User, Stethoscope, ArrowRight, CheckCircle, Maximize2, Minimize2, X } from 'lucide-react-native';

export default function PeonLiveQueue() {
  const { isMobile } = useResponsive();
  const [user, setUser] = useState<any>(null);
  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [selectedSlotsForFS, setSelectedSlotsForFS] = useState<number[]>([]);
  const [showFSModal, setShowFSModal] = useState(false);
  const [docColors, setDocColors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handler = () => {
        if (!document.fullscreenElement) {
          setFullscreenMode(false);
        }
      };
      document.addEventListener('fullscreenchange', handler);
      return () => document.removeEventListener('fullscreenchange', handler);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      let userDataStr = null;
      if (Platform.OS === 'web') {
        userDataStr = localStorage.getItem('employeeUser');
      } else {
        userDataStr = await AsyncStorage.getItem('employeeUser');
      }
      
      if (userDataStr) {
        const u = JSON.parse(userDataStr);
        setUser(u);
        fetchQueues(u.id);
      } else {
        setLoading(false);
      }
      
      const storedColors = await AsyncStorage.getItem('peon_doc_colors');
      if (storedColors) {
        setDocColors(JSON.parse(storedColors));
      }
    };
    init();

    const interval = setInterval(async () => {
      let userDataStr = null;
      if (Platform.OS === 'web') {
        userDataStr = localStorage.getItem('employeeUser');
      } else {
        userDataStr = await AsyncStorage.getItem('employeeUser');
      }
      if (userDataStr) fetchQueues(JSON.parse(userDataStr).id);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueues = async (peonId: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const resSlots = await axios.get(`https://napi.bharatmedicalhallplus.com/doctors/slots`);
      const mySlots = resSlots.data.data.filter((s: any) => 
        s.date.startsWith(today)
      );

      const queueData = await Promise.all(mySlots.map(async (slot: any) => {
        const resBookings = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings?slot_id=${slot.id}`);
        return {
          slot,
          bookings: resBookings.data.data
        };
      }));

      LayoutAnimation.configureNext({
        duration: 800,
        create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
        update: { type: LayoutAnimation.Types.easeInEaseOut },
        delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      });
      setQueues(queueData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string, slot?: any) => {
    if (status === 'Current') {
      if (!slot || slot.doctor_status !== 'Available') {
        Alert.alert(
          'Doctor Not Arrived',
          'You can only mark a patient as in cabin (Call Next) after the doctor has been marked as Arrived.'
        );
        return;
      }
    }
    try {
      await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/${id}/status`, { status });
      if (user) fetchQueues(user.id);
    } catch (err) {
      alert('Error updating status');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (queues.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.noSlotBox}>
          <Text style={styles.noSlotText}>You are not assigned to any doctor slots today.</Text>
        </View>
      </View>
    );
  }

  const toggleFullscreen = (slotId: number | 'all' | null) => {
    if (slotId === 'all') {
      setShowFSModal(true);
      return;
    }
    
    if (slotId === null) {
      setFullscreenMode(false);
      setSelectedSlotsForFS([]);
    } else {
      setSelectedSlotsForFS([slotId]);
      setFullscreenMode(true);
    }
    
    if (Platform.OS === 'web') {
      if (slotId) {
        document.documentElement.requestFullscreen().catch(console.error);
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(console.error);
        }
      }
    }
  };

  const startFullscreen = () => {
    if (selectedSlotsForFS.length === 0) {
      alert("Please select at least one doctor");
      return;
    }
    setShowFSModal(false);
    setFullscreenMode(true);
    if (Platform.OS === 'web') {
      document.documentElement.requestFullscreen().catch(console.error);
    }
  };

  const toggleSlotSelection = (id: number) => {
    setSelectedSlotsForFS(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const updateDocColor = async (docId: string, color: string) => {
    const newColors = { ...docColors, [docId]: color };
    setDocColors(newColors);
    await AsyncStorage.setItem('peon_doc_colors', JSON.stringify(newColors));
  };

  if (fullscreenMode) {
    const fsQueues = queues.filter(q => selectedSlotsForFS.includes(q.slot.id));
    
    const n = fsQueues.length;
    let columns = 1;
    let rows = 1;
    if (n === 2) { columns = 2; rows = 1; }
    else if (n === 3 || n === 4) { columns = 2; rows = 2; }
    else if (n === 5 || n === 6) { columns = 3; rows = 2; }
    else if (n > 6) { columns = 3; rows = Math.ceil(n / 3); }

    const itemWidth = `${100 / columns}%`;
    const itemHeight = `${100 / rows}%`;

    return (
      <View style={styles.fullScreenContainer}>
        <View style={styles.fsTopBar}>
          <Image source={require('../../../assets/CompanyLogo.jpg')} style={styles.fsLogo} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', flex: 1 }}>
          {fsQueues.map(fsQueue => (
            <View key={fsQueue.slot.id} style={{ width: itemWidth as any, height: itemHeight as any, padding: 8 }}>
              <DoctorQueueCard 
                slot={fsQueue.slot} 
                bookings={fsQueue.bookings} 
                updateStatus={updateStatus} 
                isMobile={isMobile} 
                isFullscreen={true}
                fsGridMode={n === 1 ? 'single' : (rows === 1 ? 'row' : 'grid')}
                toggleFullscreen={toggleFullscreen}
                docColor={docColors[fsQueue.slot.doctor_id] || Colors.light.primary}
                updateDocColor={updateDocColor}
              />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Modal visible={showFSModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15}}>
              <Text style={styles.modalHeader}>Select Doctors for Fullscreen</Text>
              <TouchableOpacity onPress={() => setShowFSModal(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{maxHeight: 400}}>
              {queues.map(q => (
                <TouchableOpacity 
                  key={q.slot.id} 
                  style={[styles.fsSelectRow, selectedSlotsForFS.includes(q.slot.id) && styles.fsSelectRowActive]}
                  onPress={() => toggleSlotSelection(q.slot.id)}
                >
                  <Text style={{flex: 1, fontSize: 16, fontWeight: '500', color: selectedSlotsForFS.includes(q.slot.id) ? Colors.light.primary : '#334155'}}>
                    Dr. {q.slot.doctor_name} ({q.slot.doctor_department || 'General'})
                  </Text>
                  {selectedSlotsForFS.includes(q.slot.id) && <CheckCircle color={Colors.light.primary} size={20} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{flexDirection: 'row', gap: 10, marginTop: 20}}>
              <TouchableOpacity style={[styles.btnSecondary, {flex: 1, paddingVertical: 12}]} onPress={() => { setSelectedSlotsForFS([]); setShowFSModal(false); }}>
                <Text style={{textAlign: 'center', color: '#64748b', fontWeight: 'bold'}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, {flex: 1, paddingVertical: 12}]} onPress={startFullscreen}>
                <Text style={{textAlign: 'center', color: 'white', fontWeight: 'bold'}}>Start Fullscreen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={[styles.pageTitle, { marginBottom: 0 }]}>Today's Doctors Live Queue</Text>
        <TouchableOpacity onPress={() => toggleFullscreen('all')}>
          <Maximize2 color="#64748b" size={24} />
        </TouchableOpacity>
      </View>
      
      <View style={[styles.grid, isMobile && { flexDirection: 'column' }]}>
        {queues.map(({ slot, bookings }, index) => (
          <DoctorQueueCard 
            key={slot.id || index} 
            slot={slot} 
            bookings={bookings} 
            updateStatus={updateStatus} 
            isMobile={isMobile} 
            isFullscreen={false} 
            toggleFullscreen={toggleFullscreen} 
            docColor={docColors[slot.doctor_id] || Colors.light.primary}
            updateDocColor={updateDocColor}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function DoctorQueueCard({ slot, bookings, updateStatus, isMobile, isFullscreen, fsGridMode, toggleFullscreen, docColor, updateDocColor }: any) {
  const waiting = bookings.filter((b: any) => b.status === 'Waiting');
  const current = bookings.find((b: any) => b.status === 'Current');
  const nextPatient = waiting.length > 0 ? waiting[0] : null;
  const upcomingQueue = waiting.slice(1);
  const palette = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  const scrollAnim = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const slideUpAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Trigger swipe up transition when current patient changes
  useEffect(() => {
    if (current) {
      slideUpAnim.setValue(50);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideUpAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [current?.booking_id]);

  useEffect(() => {
    scrollAnim.setValue(0);
    
    if (upcomingQueue.length === 0 || contentHeight === 0 || containerHeight === 0) return;

    if (contentHeight <= containerHeight) return; // Fits without scrolling

    const duration = upcomingQueue.length * 2000; // 2 seconds per item

    const startAnimation = () => {
      Animated.sequence([
        Animated.timing(scrollAnim, {
          toValue: -contentHeight,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scrollAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        })
      ]).start((result) => {
        if (result.finished) {
          startAnimation();
        }
      });
    };

    startAnimation();

    return () => {
      scrollAnim.stopAnimation();
    };
  }, [upcomingQueue.length, isFullscreen, scrollAnim, contentHeight, containerHeight]);



  // Determine sizing factors based on grid mode
  const isSingle = isFullscreen && fsGridMode === 'single';
  const isRow = isFullscreen && fsGridMode === 'row';
  
  // Font multipliers
  const scale = isSingle ? 2 : (isRow ? 1.5 : 1);
  const padScale = isSingle ? 2 : (isRow ? 1.5 : 1);

  return (
    <View style={[styles.card, isMobile && { width: '100%' }, isFullscreen && styles.fsCard, isFullscreen && { borderColor: docColor }]}>
      {/* Doctor Details Header */}
      <View style={[styles.cardHeader, { backgroundColor: docColor }, isFullscreen && { paddingVertical: 15 * padScale, paddingHorizontal: 20 * padScale }]}>
        <View style={styles.docInfoRow}>
          <Stethoscope color="#ffffff" size={24 * scale} />
          <Text style={[styles.docName, { color: '#ffffff' }, isFullscreen && { fontSize: 20 * scale }]}>Dr. {slot.doctor_name}</Text>
        </View>
        <View style={[styles.badgeRow, { alignItems: 'flex-start', justifyContent: 'space-between', flex: 1 }]}>
          <View style={{flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap', paddingRight: 8}}>
            <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={[styles.badgeText, { color: '#ffffff' }, isFullscreen && { fontSize: 12 * scale }]} numberOfLines={1} ellipsizeMode="tail">{slot.doctor_role || 'Doctor'}</Text>
            </View>
            <View style={[styles.deptBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={[styles.badgeTextDept, { color: '#ffffff' }, isFullscreen && { fontSize: 12 * scale }]} numberOfLines={1} ellipsizeMode="tail">{slot.doctor_department || 'General'}</Text>
            </View>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
            {!isFullscreen && (
              <View style={{flexDirection: 'row', gap: 4, backgroundColor: 'rgba(255,255,255,0.5)', padding: 4, borderRadius: 12}}>
                {palette.map(c => (
                  <TouchableOpacity 
                    key={c} 
                    onPress={() => updateDocColor(slot.doctor_id, c)}
                    style={{width: 14, height: 14, borderRadius: 7, backgroundColor: c, borderWidth: docColor === c ? 2 : 0, borderColor: '#0f172a'}} 
                  />
                ))}
              </View>
            )}
            <TouchableOpacity onPress={() => toggleFullscreen(isFullscreen ? null : slot.id)} style={{ marginLeft: 6 }}>
              {isFullscreen ? <Minimize2 color="#ffffff" size={24} /> : <Maximize2 color="#ffffff" size={20} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Present Consulting */}
      <View style={[styles.currentSection, isFullscreen && { paddingVertical: 8 * padScale }]}>
        <Text style={[styles.sectionLabel, isFullscreen && { fontSize: 11 * scale, marginBottom: 4 * padScale }]}>PRESENT CONSULTING PATIENT</Text>
        {current ? (
          <Animated.View style={[styles.currentPatientBox, isFullscreen && { padding: 12 * padScale }, { borderColor: docColor + '40', backgroundColor: docColor + '10' }, { transform: [{ translateY: slideUpAnim }], opacity: fadeAnim }]}>
            <View style={{flex: 1}}>
              <Text style={[styles.currentToken, isFullscreen && { fontSize: 20 * scale }, { color: docColor }]}>#{current.token_number}</Text>
              <Text style={[styles.currentName, isFullscreen && { fontSize: 16 * scale }]}>{current.patient_name}</Text>
            </View>
            <TouchableOpacity style={[styles.completeBtn, isFullscreen && { paddingHorizontal: 10 * scale, paddingVertical: 6 * scale, borderRadius: 20 }]} onPress={() => updateStatus(current.booking_id, 'Completed')}>
              <CheckCircle color="white" size={14 * scale} />
              <Text style={[styles.completeBtnText, isFullscreen && { fontSize: 12 * scale }]}>In cabin</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, isFullscreen && { fontSize: 14 * scale }]}>No patient in cabin</Text>
          </View>
        )}
      </View>

      {/* Immediate Next Patient */}
      <View style={[styles.nextPatientSection, isFullscreen && { paddingVertical: 8 * padScale }]}>
        <Text style={[styles.sectionLabel, isFullscreen && { fontSize: 11 * scale, marginBottom: 4 * padScale }]}>NEXT PATIENT</Text>
        {nextPatient ? (
          <View style={[styles.nextPatientBox, isFullscreen && { paddingVertical: 8 * padScale }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
              <View style={[styles.waitingTokenBadge, isFullscreen && { paddingHorizontal: 10 * scale, paddingVertical: 4 * scale }, { backgroundColor: docColor + '20' }]}>
                <Text style={[styles.waitingTokenText, isFullscreen && { fontSize: 14 * scale }, { color: docColor }]}>#{nextPatient.token_number}</Text>
              </View>
              <Text style={[styles.waitingName, isFullscreen && { fontSize: 15 * scale }]}>{nextPatient.patient_name}</Text>
            </View>
             <TouchableOpacity style={[styles.callNextBtn, isFullscreen && { paddingHorizontal: 10 * scale, paddingVertical: 6 * scale }]} onPress={() => updateStatus(nextPatient.booking_id, 'Current', slot)}>
              <Text style={[styles.callNextBtnText, isFullscreen && { fontSize: 12 * scale }]}>Call Next</Text>
              <ArrowRight color="white" size={14 * scale} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.emptyQueueText, isFullscreen && { fontSize: 14 * scale }]}>Queue is empty</Text>
        )}
      </View>

      {/* Paginated Upcoming Tokens */}
      {upcomingQueue.length > 0 && (
        <View style={[styles.creditsBoardSection, isFullscreen && { paddingTop: 8 * padScale, paddingBottom: 16 * padScale }]}>
          <Text style={[styles.sectionLabel, isFullscreen && { fontSize: 11 * scale, marginBottom: 4 * padScale }]}>UPCOMING TOKENS ({upcomingQueue.length})</Text>
          <View 
            style={[styles.creditsContainer, isFullscreen && { flex: 1, height: undefined }, { overflow: 'hidden' }]}
            onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
          >
            <Animated.View style={{ transform: [{ translateY: scrollAnim }] }}>
              <View onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}>
                {upcomingQueue.map((w: any) => (
                  <View key={`1-${w.booking_id}`} style={[styles.creditItem, isFullscreen && { paddingVertical: 8 * scale }]}>
                    <View style={[styles.waitingTokenBadge, isFullscreen && { paddingHorizontal: 10 * scale, paddingVertical: 4 * scale }, { backgroundColor: docColor + '20' }]}>
                      <Text style={[styles.waitingTokenText, isFullscreen && { fontSize: 14 * scale }, { color: docColor }]}>#{w.token_number}</Text>
                    </View>
                    <Text style={[styles.waitingName, isFullscreen && { fontSize: 15 * scale }]}>{w.patient_name}</Text>
                  </View>
                ))}
              </View>
              {upcomingQueue.map((w: any) => (
                <View key={`2-${w.booking_id}`} style={[styles.creditItem, isFullscreen && { paddingVertical: 8 * scale }]}>
                  <View style={[styles.waitingTokenBadge, isFullscreen && { paddingHorizontal: 10 * scale, paddingVertical: 4 * scale }, { backgroundColor: docColor + '20' }]}>
                    <Text style={[styles.waitingTokenText, isFullscreen && { fontSize: 14 * scale }, { color: docColor }]}>#{w.token_number}</Text>
                  </View>
                  <Text style={[styles.waitingName, isFullscreen && { fontSize: 15 * scale }]}>{w.patient_name}</Text>
                </View>
              ))}
            </Animated.View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: Platform.select({
    web: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      backgroundColor: '#f8fafc',
    } as any,
    default: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      backgroundColor: '#f8fafc',
    }
  }),
  fsTopBar: {
    height: 80,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  fsLogo: {
    width: 250,
    height: 60,
    resizeMode: 'contain',
  },
  fsCard: {
    width: '100%',
    height: '100%',
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    elevation: 3,
    shadowOpacity: 0.05,
  },

  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 24 },
  noSlotBox: { backgroundColor: 'white', padding: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  noSlotText: { fontSize: 18, color: '#64748b' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  card: { backgroundColor: 'white', borderRadius: 16, width: 350, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  
  cardHeader: { padding: 20, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  docInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  docName: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginLeft: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  roleBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#4338ca', fontSize: 12, fontWeight: 'bold' },
  deptBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTextDept: { color: '#15803d', fontSize: 12, fontWeight: 'bold' },

  currentSection: { padding: 16, borderBottomWidth: 1, borderColor: '#f1f5f9', position: 'relative' },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748b', marginBottom: 8, textTransform: 'uppercase' },
  currentPatientBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  currentToken: { fontSize: 20, fontWeight: 'bold', color: Colors.light.primary },
  currentName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  emptyBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  emptyText: { color: '#94a3b8', fontStyle: 'italic' },

  nextPatientSection: { padding: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  nextPatientBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 8 },

  waitingTokenBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  waitingTokenText: { color: '#d97706', fontWeight: 'bold', fontSize: 14 },
  waitingName: { fontSize: 15, color: '#334155', fontWeight: '500' },
  emptyQueueText: { color: '#94a3b8', fontStyle: 'italic', fontSize: 14 },
  
  completeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4, alignSelf: 'flex-start' },
  completeBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 12, width: '90%', maxWidth: 500, maxHeight: '80%' },
  modalHeader: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  fsSelectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 8 },
  fsSelectRowActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1 },
  btnSecondary: { backgroundColor: '#f1f5f9', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: Colors.light.primary, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  callNextBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6 },
  callNextBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  creditsBoardSection: { padding: 16, borderBottomWidth: 1, borderColor: '#f1f5f9', flex: 1 },
  creditsContainer: { height: 120, justifyContent: 'flex-start' },
  creditItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
});
