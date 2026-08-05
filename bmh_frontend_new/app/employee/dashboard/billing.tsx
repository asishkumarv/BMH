import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { ArrowLeft, RefreshCw, X, CircleAlert, DollarSign, Receipt, BadgeDollarSign, FileSpreadsheet, RotateCcw, ShieldAlert, HeartHandshake } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function BillingDashboard() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  
  // Date filter state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Data states from backend
  const [stats, setStats] = useState<any>({
    todayCollections: 0,
    appointmentsCount: 0,
    manualOrdersCollection: 0,
    salesInvoicesCount: 0,
    totalBookedAppointments: 0,
    refundAmount: 0,
    pendingCredit: 0
  });

  const [lists, setLists] = useState<any>({
    todayCollectionsList: [],
    appointmentsList: [],
    manualOrdersList: [],
    salesInvoicesList: [],
    totalBookedList: [],
    refundList: [],
    pendingCreditList: []
  });

  // Modal details overlay state
  const [viewingListType, setViewingListType] = useState<string | null>(null);

  // Load billing & financial collections data
  const loadBillingData = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings/billing-stats?date=${dateStr}`);
      if (res.data.success) {
        setStats(res.data.stats);
        setLists(res.data.lists);
      }
    } catch (error) {
      console.error('Error loading billing dashboard:', error);
      Alert.alert('Error', 'Failed to fetch billing and collections data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData(selectedDate);
  }, []);

  const getViewingList = () => {
    if (!viewingListType) return [];
    return lists[viewingListType] || [];
  };

  const getViewingListTitle = () => {
    switch (viewingListType) {
      case 'todayCollectionsList': return "Today's Collections (Bookings + Manual Orders)";
      case 'appointmentsList': return "Today's Scheduled Appointments";
      case 'manualOrdersList': return "Today's Delivered Manual Orders Collections";
      case 'salesInvoicesList': return "Today's Generated Sales Invoices";
      case 'totalBookedList': return "Total Today Booked Appointments";
      case 'refundList': return "Today's Appointments Refunds";
      case 'pendingCreditList': return "Pending Credits (Manual Orders)";
      default: return 'Transaction List';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Title Header */}
      <View style={[styles.header, isDesktop && { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={styles.backButtonRound} onPress={() => router.replace('/employee/dashboard')}>
            <ArrowLeft size={18} color={Colors.light.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Collections & Billing Dashboard</Text>
            {isDesktop && (
              <Text style={styles.subtitle}>Monitor collections, bill counts, sales invoices, refunds, and pending credits in real time.</Text>
            )}
          </View>
        </View>

        {/* Date Filter Input */}
        <View style={[styles.dateFilterContainer, { marginTop: 0 }]}>
          <Text style={styles.dateLabel}>Select Date:</Text>
          <TextInput 
            style={styles.dateInput}
            value={selectedDate}
            placeholder="YYYY-MM-DD"
            onChangeText={(text) => {
              setSelectedDate(text);
              if (text.match(/^\d{4}-\d{2}-\d{2}$/)) {
                loadBillingData(text);
              }
            }}
          />
          <TouchableOpacity style={styles.goBtn} onPress={() => loadBillingData(selectedDate)}>
            <Text style={styles.goBtnText}>Go</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => loadBillingData(selectedDate)}>
            <RefreshCw size={16} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Text style={styles.rowTitle}>Billing & Collections Overview</Text>

          {/* Grid Layout containing the 7 cards */}
          <View style={styles.gridContainer}>
            
            {/* Card 1: Today's Collections */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}
              onPress={() => setViewingListType('todayCollectionsList')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#ecfdf5' }]}>
                <DollarSign size={20} color="#10b981" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>₹{parseFloat(stats.todayCollections).toLocaleString('en-IN')}</Text>
                <Text style={styles.kpiLabel}>Today's Collections</Text>
              </View>
            </TouchableOpacity>

            {/* Card 2: Appointments (Today Booking Date) */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#3b82f6' }]}
              onPress={() => setViewingListType('appointmentsList')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#eff6ff' }]}>
                <Receipt size={20} color="#3b82f6" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>{stats.appointmentsCount}</Text>
                <Text style={styles.kpiLabel}>Appointments Scheduled</Text>
              </View>
            </TouchableOpacity>

            {/* Card 3: Manual Orders Collection */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#8b5cf6' }]}
              onPress={() => setViewingListType('manualOrdersList')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#f5f3ff' }]}>
                <BadgeDollarSign size={20} color="#8b5cf6" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>₹{parseFloat(stats.manualOrdersCollection).toLocaleString('en-IN')}</Text>
                <Text style={styles.kpiLabel}>Manual Order Collections</Text>
              </View>
            </TouchableOpacity>

            {/* Card 4: Sales Invoices Generated */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#f59e0b' }]}
              onPress={() => setViewingListType('salesInvoicesList')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#fffbeb' }]}>
                <FileSpreadsheet size={20} color="#f59e0b" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>{stats.salesInvoicesCount}</Text>
                <Text style={styles.kpiLabel}>Sales Invoices Generated</Text>
              </View>
            </TouchableOpacity>

            {/* Card 5: Total Today Booked Appointments */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#06b6d4' }]}
              onPress={() => setViewingListType('totalBookedList')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#ecfeff' }]}>
                <HeartHandshake size={20} color="#06b6d4" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>{stats.totalBookedAppointments}</Text>
                <Text style={styles.kpiLabel}>Total Booked Appointments</Text>
              </View>
            </TouchableOpacity>

            {/* Card 6: Refund of Appointments Amount */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#ef4444' }]}
              onPress={() => setViewingListType('refundList')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#fee2e2' }]}>
                <RotateCcw size={20} color="#ef4444" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>₹{parseFloat(stats.refundAmount).toLocaleString('en-IN')}</Text>
                <Text style={styles.kpiLabel}>Appointments Refunded</Text>
              </View>
            </TouchableOpacity>

            {/* Card 7: Pending (Credit manual orders today) */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#64748b' }]}
              onPress={() => setViewingListType('pendingCreditList')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#f1f5f9' }]}>
                <ShieldAlert size={20} color="#64748b" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>₹{parseFloat(stats.pendingCredit).toLocaleString('en-IN')}</Text>
                <Text style={styles.kpiLabel}>Pending Credit Amount</Text>
              </View>
            </TouchableOpacity>

          </View>
        </>
      )}

      {/* KPI/Stats List Details Overlay Modal */}
      <Modal visible={viewingListType !== null} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setViewingListType(null)}>
          <View style={[styles.modalContent, { width: '85%', maxWidth: 850, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{getViewingListTitle()} - Count: {getViewingList().length}</Text>
              <TouchableOpacity onPress={() => setViewingListType(null)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 1.5 }]}>Order/Token</Text>
                <Text style={[styles.th, { flex: 3 }]}>Customer / Patient Name</Text>
                <Text style={[styles.th, { flex: 2 }]}>Type / Mode</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>Amount</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>Status</Text>
              </View>

              {getViewingList().map((item: any, idx: number) => (
                <View key={idx} style={styles.tableRow}>
                  <View style={[styles.tokenBadgeBox, { flex: 1.5 }]}>
                    <Text style={styles.tokenBadgeText}>
                      {item.token_number ? `#${item.token_number}` : (item.order_no || item.invoice_no || `ID: ${item.id || item.booking_id}`)}
                    </Text>
                  </View>
                  
                  <View style={{ flex: 3 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#334155' }}>
                      {item.patient_name || item.customer_name}
                    </Text>
                    {item.mobile && (
                      <Text style={{ fontSize: 11, color: '#64748b' }}>Phone: {item.mobile}</Text>
                    )}
                  </View>

                  <View style={{ flex: 2 }}>
                    <Text style={{ fontWeight: '600', fontSize: 12, color: '#334155' }}>
                      {item.type || (item.invoice_no ? 'Invoice Gen' : 'Manual Order')}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#64748b' }}>
                      {item.payment_mode || 'POD'}
                    </Text>
                  </View>

                  <Text style={{ flex: 1.5, fontSize: 13, color: '#0f172a', fontWeight: 'bold' }}>
                    ₹{parseFloat(item.amount || item.cash_amount || 0).toLocaleString('en-IN')}
                  </Text>

                  <View style={{ flex: 1.5 }}>
                    <View style={[
                      styles.statusTag,
                      (item.status === 'Completed' || item.status === 'Delivered') && styles.statusTagCompleted,
                      item.status === 'Current' && styles.statusTagCurrent,
                      item.status === 'Waiting' && styles.statusTagWaiting,
                      item.status === 'Cancelled' && styles.statusTagCancelled
                    ]}>
                      <Text style={[
                        styles.statusTagText,
                        (item.status === 'Completed' || item.status === 'Delivered') && { color: '#065f46' },
                        item.status === 'Current' && { color: '#5b21b6' },
                        item.status === 'Waiting' && { color: '#92400e' },
                        item.status === 'Cancelled' && { color: '#991b1b' }
                      ]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {getViewingList().length === 0 && (
                <Text style={[styles.emptyText, { padding: 40 }]}>No transactions or records match this query.</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { marginBottom: 16 },
  backButtonRound: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', borderWidth: 1, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },

  dateFilterContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  dateLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
  dateInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'white', color: '#334155', width: 130, fontSize: 13 },
  goBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  goBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  refreshBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },

  rowTitle: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginTop: 12, marginBottom: 12, textTransform: 'uppercase' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  
  kpiCard: { minWidth: 240, flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 5, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  kpiIconContainer: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  kpiValue: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  kpiLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 4, textTransform: 'uppercase' },

  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center' },
  th: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  tokenBadgeBox: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  tokenBadgeText: { fontSize: 11, fontWeight: '800', color: '#0369a1' },
  emptyText: { padding: 20, fontStyle: 'italic', color: '#94a3b8', textAlign: 'center' },

  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, alignSelf: 'flex-start', backgroundColor: '#f3f4f6' },
  statusTagCompleted: { backgroundColor: '#d1fae5' },
  statusTagCurrent: { backgroundColor: '#ede9fe' },
  statusTagWaiting: { backgroundColor: '#fef3c7' },
  statusTagCancelled: { backgroundColor: '#fee2e2' },
  statusTagText: { fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 450, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' }
});
