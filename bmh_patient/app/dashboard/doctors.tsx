import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Alert, Platform } from 'react-native';
import { Search, Calendar, Clock, HeartPulse, Shield, ChevronRight, X, Sparkles, AlertTriangle, ArrowLeft, Users, User, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { useResponsive } from '../../hooks/useResponsive';
import axios from 'axios';

export default function FindDoctor() {
  const { isMobile } = useResponsive();
  const [patient, setPatient] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  
  // Selection states for booking flow
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [doctorSlots, setDoctorSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [slotBookings, setSlotBookings] = useState<number[]>([]);
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  
  // Booking Form states
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [paymentMode, setPaymentMode] = useState('Online');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [successToken, setSuccessToken] = useState<number | null>(null);

  // Other patient states
  const [bookForOther, setBookForOther] = useState(false);
  const [otherName, setOtherName] = useState('');
  const [otherMobile, setOtherMobile] = useState('');
  const [otherAge, setOtherAge] = useState('');
  const [otherGender, setOtherGender] = useState('Male');
  const [otherBloodGroup, setOtherBloodGroup] = useState('');
  const [otherGuardian, setOtherGuardian] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const patientData = await AsyncStorage.getItem('patientUser');
        if (patientData) {
          setPatient(JSON.parse(patientData));
        }
        
        // 1. Fetch doctors
        const docRes = await axios.get('https://bmh-eitu.onrender.com/doctors');
        if (docRes.data.success && docRes.data.data) {
          setDoctors(docRes.data.data);
        }
        
        // 2. Fetch all slots
        const slotRes = await axios.get('https://bmh-eitu.onrender.com/doctors/slots');
        if (slotRes.data.success && slotRes.data.data) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const validSlots = slotRes.data.data.filter((s: any) => {
            const slotDate = new Date(s.date);
            return slotDate >= today;
          });
          setSlots(validSlots);
        }
      } catch (err) {
        console.error('Failed to load doctors or slots', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleSelectDoctor = (doc: any) => {
    setSelectedDoctor(doc);
    const docSlots = slots.filter((s: any) => s.doctor_id === doc.id);
    setDoctorSlots(docSlots);
    setSelectedSlot(null);
    setSelectedToken(null);
  };

  const handleSelectSlot = async (slot: any) => {
    setSelectedSlot(slot);
    setSelectedToken(null);
    try {
      const res = await axios.get(`https://bmh-eitu.onrender.com/bookings?slot_id=${slot.id}`);
      const bookedTokens = res.data.data.map((b: any) => b.token_number);
      setSlotBookings(bookedTokens);
    } catch (err) {
      console.error('Failed to load bookings for slot', err);
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot || !selectedToken || !patient) return;
    
    let bookingName = patient.name;
    let bookingMobile = patient.mobile;
    let bookingAge = patient.age ? parseInt(patient.age) : 30;
    let bookingGender = patient.gender || 'Male';
    let bookingBloodGroup = patient.blood_group;
    let bookingGuardian = patient.guardian_name;

    if (bookForOther) {
      if (!otherName.trim() || !otherMobile.trim() || !otherAge.trim()) {
        Alert.alert('Required Fields', 'Please fill in Patient Name, Mobile, and Age.');
        return;
      }
      bookingName = otherName;
      bookingMobile = otherMobile;
      bookingAge = parseInt(otherAge);
      bookingGender = otherGender;
      bookingBloodGroup = otherBloodGroup;
      bookingGuardian = otherGuardian;
    }
    
    setBookingLoading(true);
    try {
      const res = await axios.post('https://bmh-eitu.onrender.com/bookings/create', {
        slot_id: selectedSlot.id,
        patient_name: bookingName,
        mobile: bookingMobile,
        email: patient.email,
        age: bookingAge,
        gender: bookingGender,
        blood_group: bookingBloodGroup,
        reason_for_visit: reasonForVisit,
        city: patient.city,
        pin_code: patient.pin_code,
        guardian_name: bookingGuardian,
        booked_by: null, // Patient booked themselves
        payment_mode: paymentMode,
        token_number: selectedToken
      });
      
      if (res.data.success) {
        setSuccessToken(res.data.token_number);
      } else {
        Alert.alert('Booking Failed', res.data.message || 'Slot already taken');
      }
    } catch (err: any) {
      Alert.alert('Booking Error', err.response?.data?.message || 'Server error occurred');
    } finally {
      setBookingLoading(false);
    }
  };

  const resetBookingFlow = () => {
    setSelectedDoctor(null);
    setDoctorSlots([]);
    setSelectedSlot(null);
    setSlotBookings([]);
    setSelectedToken(null);
    setReasonForVisit('');
    setSuccessToken(null);
    setBookForOther(false);
    setOtherName('');
    setOtherMobile('');
    setOtherAge('');
    setOtherGender('Male');
    setOtherBloodGroup('');
    setOtherGuardian('');
  };

  const departments = ['All', ...Array.from(new Set(doctors.map((d: any) => d.department)))];

  const filteredDoctors = doctors.filter((doc: any) => {
    const matchesSearch = doc.full_name?.toLowerCase().includes(search.toLowerCase()) || 
                          doc.specialization?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === 'All' || doc.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  // Booking success view
  if (successToken) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centerContainer}>
        <View style={styles.successCard}>
          <View style={styles.successIconWrapper}>
            <Sparkles size={48} color="#10b981" />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>Your token number has been generated</Text>
          
          <View style={styles.tokenBox}>
            <Text style={styles.tokenLabel}>Token Number</Text>
            <Text style={styles.tokenNumber}>#{successToken}</Text>
          </View>

          <View style={styles.receiptDetails}>
            <Text style={styles.receiptText}><Text style={{ fontWeight: '700' }}>Doctor:</Text> Dr. {selectedSlot.doctor_name}</Text>
            <Text style={styles.receiptText}><Text style={{ fontWeight: '700' }}>Department:</Text> {selectedSlot.doctor_department || 'General'}</Text>
            <Text style={styles.receiptText}><Text style={{ fontWeight: '700' }}>Date & Time:</Text> {new Date(selectedSlot.date).toLocaleDateString()} | {selectedSlot.start_time}</Text>
            <Text style={styles.receiptText}><Text style={{ fontWeight: '700' }}>Fee:</Text> ₹{selectedSlot.fee} ({paymentMode})</Text>
          </View>

          <View style={styles.successActions}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/dashboard/appointments')}>
              <Text style={styles.btnPrimaryText}>View My Appointments</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={resetBookingFlow}>
              <Text style={styles.btnSecondaryText}>Book Another Appointment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Slots and token selection view
  if (selectedDoctor) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <TouchableOpacity style={styles.backLink} onPress={resetBookingFlow}>
          <ArrowLeft size={16} color={Colors.light.primary} style={{ marginRight: 6 }} />
          <Text style={styles.backLinkText}>Back to Doctors</Text>
        </TouchableOpacity>

        <View style={styles.bookingHeaderCard}>
          <View style={styles.docInfoRow}>
            {selectedDoctor.photo ? (
              <Image source={{ uri: selectedDoctor.photo }} style={styles.docBookingAvatar} />
            ) : (
              <View style={styles.docBookingAvatarFallback}>
                <Users size={32} color="#64748b" />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.docBookingName}>Dr. {selectedDoctor.full_name}</Text>
              <Text style={styles.docBookingDept}>{selectedDoctor.department} • {selectedDoctor.specialization}</Text>
              <Text style={styles.docBookingExp}>{selectedDoctor.experience || '5+'} Years Experience</Text>
            </View>
          </View>
        </View>

        {!selectedSlot ? (
          // Step 1: Select Slot
          <View>
            <Text style={styles.sectionTitle}>Select Date & Time Slot</Text>
            <View style={styles.slotsList}>
              {doctorSlots.map((s: any, i: number) => (
                <TouchableOpacity key={i} style={styles.slotCard} onPress={() => handleSelectSlot(s)}>
                  <View style={styles.slotDetailsRow}>
                    <View style={styles.slotDetailItem}>
                      <Calendar size={16} color="#64748b" style={{ marginRight: 6 }} />
                      <Text style={styles.slotDetailText}>{new Date(s.date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.slotDetailItem}>
                      <Clock size={16} color="#64748b" style={{ marginRight: 6 }} />
                      <Text style={styles.slotDetailText}>{s.start_time} - {s.end_time}</Text>
                    </View>
                  </View>
                  <View style={styles.slotFeeRow}>
                    <Text style={styles.slotFeeLabel}>Consultation Fee</Text>
                    <Text style={styles.slotFeeValue}>₹{s.fee}</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.light.icon} />
                </TouchableOpacity>
              ))}
              {doctorSlots.length === 0 && (
                <View style={styles.emptyCard}>
                  <AlertTriangle size={24} color="#f59e0b" style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyCardText}>No slots available for this doctor.</Text>
                </View>
              )}
            </View>
          </View>
        ) : !selectedToken ? (
          // Step 2: Select Token
          <View style={styles.tokenCard}>
            <TouchableOpacity style={styles.backLink} onPress={() => setSelectedSlot(null)}>
              <ArrowLeft size={14} color={Colors.light.primary} style={{ marginRight: 6 }} />
              <Text style={styles.backLinkText}>Back to Slots</Text>
            </TouchableOpacity>
            <Text style={styles.tokenCardTitle}>Select Available Token Number</Text>
            <Text style={styles.tokenCardSubtitle}>Select green numbers for booking. Red tokens are already reserved.</Text>

            <View style={styles.tokensGrid}>
              {Array.from({ length: selectedSlot.total_tokens }, (_: any, i: number) => i + 1).map((t: number) => {
                const isBooked = slotBookings.includes(t);
                return (
                  <TouchableOpacity
                    key={t}
                    disabled={isBooked}
                    style={[
                      styles.tokenSelector,
                      isBooked ? styles.tokenBooked : styles.tokenAvailable
                    ]}
                    onPress={() => setSelectedToken(t)}
                  >
                    <Text style={[styles.tokenText, isBooked ? styles.tokenTextBooked : styles.tokenTextAvailable]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          // Step 3: Confirmation and Reason
          <View style={styles.formCard}>
            <TouchableOpacity style={styles.backLink} onPress={() => setSelectedToken(null)}>
              <ArrowLeft size={14} color={Colors.light.primary} style={{ marginRight: 6 }} />
              <Text style={styles.backLinkText}>Back to Tokens</Text>
            </TouchableOpacity>
            
            <Text style={styles.tokenCardTitle}>Confirm Booking Details</Text>
            
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryLabel}>Selected Token</Text>
              <Text style={styles.summaryValue}>Token #{selectedToken}</Text>
              <Text style={styles.summarySub}>Dr. {selectedSlot.doctor_name} | {new Date(selectedSlot.date).toLocaleDateString()} | {selectedSlot.start_time}</Text>
            </View>

            <View style={styles.bookingForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>Reason for Visit (Optional)</Text>
                <TextInput
                  style={styles.textarea}
                  placeholder="Tell the doctor about your symptoms or medical concern..."
                  multiline
                  numberOfLines={4}
                  value={reasonForVisit}
                  onChangeText={setReasonForVisit}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>Payment Method</Text>
                <View style={styles.paymentToggleRow}>
                  <TouchableOpacity 
                    style={[styles.paymentToggle, paymentMode === 'Online' && styles.paymentToggleActive]} 
                    onPress={() => setPaymentMode('Online')}
                  >
                    <Text style={[styles.paymentToggleText, paymentMode === 'Online' && styles.paymentToggleTextActive]}>Online Payment</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.paymentToggle, paymentMode === 'Cash' && styles.paymentToggleActive]} 
                    onPress={() => setPaymentMode('Cash')}
                  >
                    <Text style={[styles.paymentToggleText, paymentMode === 'Cash' && styles.paymentToggleTextActive]}>Pay Cash at Desk</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Toggle: Book for Self vs Book for Other */}
              <View style={styles.togglePatientRow}>
                <TouchableOpacity 
                  style={[styles.togglePatientBtn, !bookForOther && styles.togglePatientBtnActive]}
                  onPress={() => setBookForOther(false)}
                >
                  <User size={16} color={!bookForOther ? '#3B82F6' : '#64748B'} style={{ marginRight: 6 }} />
                  <Text style={[styles.togglePatientText, !bookForOther && styles.togglePatientTextActive]}>
                    Book for Myself
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.togglePatientBtn, bookForOther && styles.togglePatientBtnActive]}
                  onPress={() => {
                    setBookForOther(true);
                    if (!otherMobile) setOtherMobile(patient.mobile || '');
                  }}
                >
                  <Plus size={16} color={bookForOther ? '#3B82F6' : '#64748B'} style={{ marginRight: 6 }} />
                  <Text style={[styles.togglePatientText, bookForOther && styles.togglePatientTextActive]}>
                    Book for Another Patient
                  </Text>
                </TouchableOpacity>
              </View>

              {bookForOther ? (
                /* Other Patient Form */
                <View style={styles.otherPatientForm}>
                  <Text style={styles.formSectionTitle}>Dependent / Other Patient Details</Text>
                  
                  {/* Row: Name & Mobile */}
                  <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
                    <View style={[{ flex: 1, marginRight: 8 }, isMobile && { marginRight: 0, marginBottom: 12 }]}>
                      <Text style={styles.formLabelSmall}>Full Name *</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Patient's full name"
                        value={otherName}
                        onChangeText={setOtherName}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelSmall}>Mobile Number *</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="10-digit mobile"
                        keyboardType="phone-pad"
                        value={otherMobile}
                        onChangeText={setOtherMobile}
                      />
                    </View>
                  </View>

                  {/* Row: Age & Gender */}
                  <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
                    <View style={[{ flex: 1, marginRight: 8 }, isMobile && { marginRight: 0, marginBottom: 12 }]}>
                      <Text style={styles.formLabelSmall}>Age *</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Age"
                        keyboardType="numeric"
                        value={otherAge}
                        onChangeText={setOtherAge}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelSmall}>Gender</Text>
                      <View style={styles.genderToggleRow}>
                        <TouchableOpacity 
                          style={[styles.genderToggleBtn, otherGender === 'Male' && styles.genderToggleBtnActive]}
                          onPress={() => setOtherGender('Male')}
                        >
                          <Text style={[styles.genderToggleText, otherGender === 'Male' && styles.genderToggleTextActive]}>Male</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.genderToggleBtn, otherGender === 'Female' && styles.genderToggleBtnActive]}
                          onPress={() => setOtherGender('Female')}
                        >
                          <Text style={[styles.genderToggleText, otherGender === 'Female' && styles.genderToggleTextActive]}>Female</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Row: Blood Group & Guardian */}
                  <View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>
                    <View style={[{ flex: 1, marginRight: 8 }, isMobile && { marginRight: 0, marginBottom: 12 }]}>
                      <Text style={styles.formLabelSmall}>Blood Group (Optional)</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="e.g. O+"
                        value={otherBloodGroup}
                        onChangeText={setOtherBloodGroup}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelSmall}>Guardian Name (Optional)</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Guardian Name"
                        value={otherGuardian}
                        onChangeText={setOtherGuardian}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                /* Patient details summary for verification */
                <View style={styles.verificationBox}>
                  <Text style={styles.verificationTitle}>Patient Information Details</Text>
                  <Text style={styles.verificationText}>Name: {patient?.name}</Text>
                  <Text style={styles.verificationText}>Phone: {patient?.mobile}</Text>
                  <Text style={styles.verificationText}>Age & Gender: {patient?.age}y, {patient?.gender}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.btnPrimary, bookingLoading && { opacity: 0.7 }]}
                onPress={handleBooking}
                disabled={bookingLoading}
              >
                {bookingLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Confirm & Book Token</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    );
  }

  // Doctor list view
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Find & Book Specialist</Text>
        <Text style={styles.subtitle}>Browse leading doctors, check availability, and book token slots instantly.</Text>
      </View>

      {/* Filter and Search Card */}
      <View style={styles.filterCard}>
        <View style={styles.searchRow}>
          <Search size={18} color={Colors.light.icon} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors by name, specialty..."
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptFilterRow}>
          {departments.map(dept => (
            <TouchableOpacity
              key={dept}
              style={[styles.deptTab, selectedDept === dept && styles.deptTabActive]}
              onPress={() => setSelectedDept(dept)}
            >
              <Text style={[styles.deptTabText, selectedDept === dept && styles.deptTabTextActive]}>{dept}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Doctors Grid */}
      <View style={styles.grid}>
        {filteredDoctors.map((doc: any) => {
          const docSlots = slots.filter((s: any) => s.doctor_id === doc.id);
          const hasSlots = docSlots.length > 0;
          return (
            <View key={doc.id} style={[styles.doctorCard, isMobile && { width: '100%' }]}>
              <View style={styles.doctorHeader}>
                {doc.photo ? (
                  <Image source={{ uri: doc.photo }} style={styles.docAvatar} />
                ) : (
                  <View style={styles.docAvatarFallback}>
                    <Users size={24} color="#64748b" />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.docName}>Dr. {doc.full_name}</Text>
                  <Text style={styles.docSpecialty}>{doc.specialization}</Text>
                  <Text style={styles.docDepartment}>{doc.department}</Text>
                </View>
              </View>

              <View style={styles.doctorBody}>
                <View style={styles.docBadgeRow}>
                  <View style={styles.docBadge}>
                    <Shield size={12} color="#3B82F6" style={{ marginRight: 4 }} />
                    <Text style={styles.docBadgeText}>{doc.experience || '5+'} Years Exp</Text>
                  </View>
                  <View style={[styles.docBadge, { backgroundColor: hasSlots ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)' }]}>
                    <Text style={[styles.docBadgeText, { color: hasSlots ? Colors.light.success : Colors.light.error }]}>
                      {hasSlots ? `${docSlots.length} Slots Available` : 'No Active Slots'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.bookBtn, !hasSlots && styles.bookBtnDisabled]}
                onPress={() => hasSlots && handleSelectDoctor(doc)}
                disabled={!hasSlots}
              >
                <Text style={[styles.bookBtnText, !hasSlots && styles.bookBtnTextDisabled]}>
                  {hasSlots ? 'Book Appointment' : 'Fully Booked'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
        {filteredDoctors.length === 0 && (
          <View style={styles.emptyContainer}>
            <Users size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Doctors Found</Text>
            <Text style={styles.emptyDesc}>Try adjusting your search filters or department selection.</Text>
          </View>
        )}
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
    paddingBottom: 48,
  },
  centerContainer: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginTop: 6,
  },
  filterCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
    marginBottom: 24,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },
  deptFilterRow: {
    flexDirection: 'row',
  },
  deptTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
  },
  deptTabActive: {
    backgroundColor: Colors.light.primary,
  },
  deptTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  deptTabTextActive: {
    color: '#FFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  doctorCard: {
    width: '31%',
    minWidth: 280,
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 20,
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: 250,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
  },
  docAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  docSpecialty: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  docDepartment: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  doctorBody: {
    marginVertical: 14,
  },
  docBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  docBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  bookBtn: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  bookBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bookBtnTextDisabled: {
    color: '#94A3B8',
  },
  // Booking flow styles
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backLinkText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  bookingHeaderCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 20,
    marginBottom: 24,
  },
  docInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docBookingAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
  },
  docBookingAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docBookingName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  docBookingDept: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  docBookingExp: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  slotsList: {
    flexDirection: 'column',
    gap: 12,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 18,
  },
  slotDetailsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
  },
  slotDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotDetailText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  slotFeeRow: {
    alignItems: 'flex-end',
    marginRight: 24,
  },
  slotFeeLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
  },
  slotFeeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  tokenCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 24,
  },
  tokenCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
  },
  tokenCardSubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginBottom: 24,
  },
  tokensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tokenSelector: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  tokenAvailable: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  tokenBooked: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    opacity: 0.5,
  },
  tokenText: {
    fontSize: 16,
    fontWeight: '700',
  },
  tokenTextAvailable: {
    color: Colors.light.success,
  },
  tokenTextBooked: {
    color: Colors.light.error,
  },
  formCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 24,
  },
  summaryBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.primary,
    marginVertical: 4,
  },
  summarySub: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  bookingForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  textarea: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.light.text,
    textAlignVertical: 'top',
    height: 100,
  },
  paymentToggleRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  paymentToggle: {
    flex: 1,
    minWidth: 150,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  paymentToggleActive: {
    borderColor: Colors.light.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.04)',
  },
  paymentToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  paymentToggleTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  verificationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 14,
  },
  verificationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  verificationText: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginBottom: 2,
  },
  btnPrimary: {
    backgroundColor: Colors.light.primary,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Success card styles
  successCard: {
    maxWidth: 450,
    width: '100%',
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 32,
    alignItems: 'center',
  },
  successIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginBottom: 24,
  },
  tokenBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  tokenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tokenNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.light.success,
    marginTop: 6,
  },
  receiptDetails: {
    width: '100%',
    gap: 6,
    marginBottom: 32,
  },
  receiptText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  btnSecondary: {
    backgroundColor: '#F1F5F9',
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    paddingVertical: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    fontSize: 14,
    color: Colors.light.textMuted,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
  },
  togglePatientRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  togglePatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  togglePatientBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: '#3B82F6',
  },
  togglePatientText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  togglePatientTextActive: {
    color: '#1E293B',
  },
  otherPatientForm: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
    marginBottom: 20,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  formLabelSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1E293B',
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },
  genderToggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    overflow: 'hidden',
    height: 38,
  },
  genderToggleBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  genderToggleBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  genderToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  genderToggleTextActive: {
    color: '#3B82F6',
  },
});
