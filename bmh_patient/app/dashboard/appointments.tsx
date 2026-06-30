import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar, Clock, Printer, FileText, ChevronRight, X, HeartPulse, Shield, CheckCircle } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '../../constants/Colors';
import { useResponsive } from '../../hooks/useResponsive';
import axios from 'axios';

export default function MyAppointments() {
  const { isMobile } = useResponsive();
  const [patient, setPatient] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const fetchBookings = async (patientId: number) => {
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings?patient_id=${patientId}`);
      if (res.data.success && res.data.data) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch bookings', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const patientData = await AsyncStorage.getItem('patientUser');
        if (patientData) {
          const p = JSON.parse(patientData);
          setPatient(p);
          await fetchBookings(p.id);
        }
      } catch (err) {
        console.error('Failed to load user', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handlePrintReceipt = async (b: any) => {
    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 28px; font-weight: bold; color: #0f172a; margin-bottom: 5px; }
            .subtitle { font-size: 16px; color: #64748b; }
            .token-box { text-align: center; margin: 30px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .token-label { font-size: 18px; color: #475569; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
            .token-number { font-size: 64px; font-weight: bold; color: #10b981; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .detail-item { background: #f1f5f9; padding: 15px; border-radius: 8px; }
            .detail-label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
            .detail-value { font-size: 16px; font-weight: 600; color: #0f172a; }
            .footer { margin-top: 40px; text-align: center; font-size: 14px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">BMH Hospital</div>
            <div class="subtitle">Official Patient Booking Receipt</div>
          </div>
          <div class="token-box">
            <div class="token-label">Token Number</div>
            <div class="token-number">#${b.token_number}</div>
          </div>
          <div class="details-grid">
            <div class="detail-item">
              <div class="detail-label">Patient Name</div>
              <div class="detail-value">${b.patient_name}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Doctor</div>
              <div class="detail-value">Dr. ${b.doctor_name} <br/><span style="font-size: 13px; color: #64748b; font-weight: normal">${b.department || 'General'}</span></div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Date & Time</div>
              <div class="detail-value">${new Date(b.date).toLocaleDateString()} | ${b.start_time}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Fee & Payment</div>
              <div class="detail-value">₹${b.fee} (${b.payment_mode})</div>
            </div>
          </div>
          <div class="footer">
            Thank you for choosing BMH Hospital. Please wait in the lobby until your token number is called.
          </div>
        </body>
      </html>
    `;
    try {
      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.contentDocument?.write(html);
        iframe.contentDocument?.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 250);
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri);
      }
    } catch (err) {
      console.error('Error printing receipt', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  // Active appointments vs Past/Completed
  const activeBookings = bookings.filter((b: any) => b.status === 'Booked' || b.status === 'Waiting' || b.status === 'Current');
  const pastBookings = bookings.filter((b: any) => b.status === 'Completed' || b.status === 'Cancelled');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>My Appointments</Text>
        <Text style={styles.subtitle}>View your upcoming tokens, download digital receipts, and track consult history.</Text>
      </View>

      {/* Main Content Area split on desktop */}
      <View style={[styles.mainSplit, isMobile && { flexDirection: 'column' }]}>
        
        {/* Left Column: Appointments list */}
        <View style={styles.listColumn}>
          <Text style={styles.sectionHeader}>Upcoming Care & Visits ({activeBookings.length})</Text>
          <View style={styles.listGroup}>
            {activeBookings.map((b: any, i: number) => (
              <TouchableOpacity 
                key={i} 
                style={[
                  styles.bookingCard, 
                  selectedBooking?.booking_id === b.booking_id && styles.bookingCardSelected
                ]} 
                onPress={() => setSelectedBooking(b)}
              >
                <View style={styles.bookingRow}>
                  <View style={styles.avatarMini}>
                    <Text style={styles.avatarMiniText}>#{b.token_number}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.bookingDocName}>Dr. {b.doctor_name}</Text>
                    <Text style={styles.bookingDept}>{b.department || 'General'}</Text>
                    <View style={styles.timeRow}>
                      <Calendar size={12} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.timeText}>{new Date(b.date).toLocaleDateString()}</Text>
                      <Clock size={12} color="#64748b" style={{ marginLeft: 12, marginRight: 4 }} />
                      <Text style={styles.timeText}>{b.start_time}</Text>
                    </View>
                  </View>
                  <View style={styles.badgeColumn}>
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: b.status === 'Current' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)' }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText, 
                        { color: b.status === 'Current' ? Colors.light.success : Colors.light.primary }
                      ]}>
                        {b.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {activeBookings.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No upcoming appointments scheduled.</Text>
              </View>
            )}
          </View>

          <Text style={[styles.sectionHeader, { marginTop: 32 }]}>Past & Completed Consultations ({pastBookings.length})</Text>
          <View style={styles.listGroup}>
            {pastBookings.map((b: any, i: number) => (
              <TouchableOpacity 
                key={i} 
                style={[
                  styles.bookingCard,
                  selectedBooking?.booking_id === b.booking_id && styles.bookingCardSelected,
                  { opacity: 0.8 }
                ]} 
                onPress={() => setSelectedBooking(b)}
              >
                <View style={styles.bookingRow}>
                  <View style={[styles.avatarMini, { backgroundColor: '#e2e8f0' }]}>
                    <Text style={[styles.avatarMiniText, { color: '#475569' }]}>#{b.token_number}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.bookingDocName}>Dr. {b.doctor_name}</Text>
                    <Text style={styles.bookingDept}>{b.department || 'General'}</Text>
                    <View style={styles.timeRow}>
                      <Calendar size={12} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.timeText}>{new Date(b.date).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <View style={styles.badgeColumn}>
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: b.status === 'Completed' ? '#F1F5F9' : 'rgba(239, 68, 68, 0.1)' }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText, 
                        { color: b.status === 'Completed' ? '#475569' : Colors.light.error }
                      ]}>
                        {b.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {pastBookings.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No past history records found.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Right Column: Digital Receipt detail panel */}
        <View style={styles.detailColumn}>
          {selectedBooking ? (
            <View style={styles.receiptPanel}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptPanelTitle}>Digital Token Receipt</Text>
                <TouchableOpacity onPress={() => handlePrintReceipt(selectedBooking)} style={styles.printIconBtn}>
                  <Printer size={16} color={Colors.light.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.receiptTokenBox}>
                <Text style={styles.receiptTokenLabel}>Token ID</Text>
                <Text style={styles.receiptTokenNum}>#{selectedBooking.token_number}</Text>
                <View style={[
                  styles.statusBadgeBig, 
                  { 
                    backgroundColor: selectedBooking.status === 'Completed' ? 'rgba(16, 185, 129, 0.08)' : 
                                     selectedBooking.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.08)'
                  }
                ]}>
                  <Text style={[
                    styles.statusBadgeBigText, 
                    { 
                      color: selectedBooking.status === 'Completed' ? Colors.light.success : 
                             selectedBooking.status === 'Cancelled' ? Colors.light.error : Colors.light.primary
                    }
                  ]}>
                    Status: {selectedBooking.status}
                  </Text>
                </View>
              </View>

              <View style={styles.receiptGrid}>
                <View style={styles.receiptGridItem}>
                  <Text style={styles.receiptGridLabel}>Patient</Text>
                  <Text style={styles.receiptGridValue}>{selectedBooking.patient_name}</Text>
                </View>
                <View style={styles.receiptGridItem}>
                  <Text style={styles.receiptGridLabel}>Doctor Name</Text>
                  <Text style={styles.receiptGridValue}>Dr. {selectedBooking.doctor_name}</Text>
                  <Text style={styles.receiptGridSub}>{selectedBooking.department || 'General'}</Text>
                </View>
                <View style={styles.receiptGridItem}>
                  <Text style={styles.receiptGridLabel}>Appt Date</Text>
                  <Text style={styles.receiptGridValue}>{new Date(selectedBooking.date).toLocaleDateString()}</Text>
                </View>
                <View style={styles.receiptGridItem}>
                  <Text style={styles.receiptGridLabel}>Time Slot</Text>
                  <Text style={styles.receiptGridValue}>{selectedBooking.start_time}</Text>
                </View>
                <View style={styles.receiptGridItem}>
                  <Text style={styles.receiptGridLabel}>Fee Amount</Text>
                  <Text style={styles.receiptGridValue}>₹{selectedBooking.fee}</Text>
                </View>
                <View style={styles.receiptGridItem}>
                  <Text style={styles.receiptGridLabel}>Payment Mode</Text>
                  <Text style={styles.receiptGridValue}>{selectedBooking.payment_mode}</Text>
                </View>
              </View>

              {selectedBooking.reason_for_visit && (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonBoxLabel}>Reason for Visit:</Text>
                  <Text style={styles.reasonBoxText}>{selectedBooking.reason_for_visit}</Text>
                </View>
              )}

              {/* Mock QR Code representation */}
              <View style={styles.qrCodeContainer}>
                <View style={styles.qrCodeBorder}>
                  {/* Styled blocks creating a premium mock QR code */}
                  <View style={styles.qrGrid}>
                    <View style={styles.qrCornerBlock} />
                    <View style={styles.qrSpacer} />
                    <View style={styles.qrCornerBlock} />
                    <View style={styles.qrSpacer} />
                    <View style={styles.qrCenterDot} />
                    <View style={styles.qrSpacer} />
                    <View style={styles.qrCornerBlock} />
                    <View style={styles.qrSpacer} />
                    <View style={styles.qrCornerBlock} />
                  </View>
                </View>
                <Text style={styles.qrSubtext}>Scan at reception to check-in</Text>
              </View>

              <TouchableOpacity style={styles.printFullBtn} onPress={() => handlePrintReceipt(selectedBooking)}>
                <Printer size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.printFullBtnText}>Print Ticket Receipt</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.placeholderPanel}>
              <FileText size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
              <Text style={styles.placeholderTitle}>No Selection</Text>
              <Text style={styles.placeholderDesc}>Select an appointment from the list to view your digital ticket receipt and scan credentials.</Text>
            </View>
          )}
        </View>

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
  mainSplit: {
    flexDirection: 'row',
    gap: 24,
  },
  listColumn: {
    flex: 1.2,
  },
  detailColumn: {
    flex: 1,
    minWidth: 320,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 16,
  },
  listGroup: {
    flexDirection: 'column',
    gap: 12,
  },
  bookingCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
  },
  bookingCardSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.02)',
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMini: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMiniText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.success,
  },
  bookingDocName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  bookingDept: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  timeText: {
    fontSize: 12,
    color: Colors.light.textMuted,
    fontWeight: '600',
  },
  badgeColumn: {
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  // Receipt Panel Styles
  receiptPanel: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 24,
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 24,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
      }
    })
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  receiptPanelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  printIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  receiptTokenBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  receiptTokenLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  receiptTokenNum: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.light.text,
    marginVertical: 4,
  },
  statusBadgeBig: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeBigText: {
    fontSize: 11,
    fontWeight: '700',
  },
  receiptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  receiptGridItem: {
    width: '45%',
    minWidth: 110,
  },
  receiptGridLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
  },
  receiptGridValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 2,
  },
  receiptGridSub: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  reasonBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 24,
  },
  reasonBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  reasonBoxText: {
    fontSize: 13,
    color: Colors.light.textMuted,
    lineHeight: 18,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCodeBorder: {
    padding: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
  },
  qrGrid: {
    width: 100,
    height: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  qrCornerBlock: {
    width: 28,
    height: 28,
    backgroundColor: '#0f172a',
    borderRadius: 4,
  },
  qrSpacer: {
    width: 8,
    height: 28,
  },
  qrCenterDot: {
    width: 28,
    height: 28,
    backgroundColor: '#3b82f6',
    borderRadius: 14,
  },
  qrSubtext: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 8,
    fontWeight: '500',
  },
  printFullBtn: {
    backgroundColor: Colors.light.primary,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  printFullBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  placeholderPanel: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    height: 350,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  placeholderDesc: {
    fontSize: 13,
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
