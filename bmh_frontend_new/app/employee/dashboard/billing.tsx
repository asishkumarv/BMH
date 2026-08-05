import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { ArrowLeft, RefreshCw, X, DollarSign, Receipt, BadgeDollarSign, FileSpreadsheet, RotateCcw, ShieldAlert, HeartHandshake } from 'lucide-react-native';
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
    appointmentsScheduledCount: 0,
    appointmentsScheduledAmount: 0,
    appointmentsBookedCount: 0,
    appointmentsBookedAmount: 0,
    manualOrdersGeneratedCount: 0,
    manualOrdersGeneratedAmount: 0,
    manualOrdersDeliveredCount: 0,
    manualOrdersDeliveredAmount: 0,
    salesInvoicesCount: 0,
    salesInvoicesAmount: 0,
    refundAmount: 0,
    pendingCredit: 0
  });

  const [lists, setLists] = useState<any>({
    todayCollectionsList: [],
    appointmentsList: [],
    appointmentsBookedList: [],
    manualOrdersGeneratedList: [],
    manualOrdersDeliveredList: [],
    salesInvoicesList: [],
    refundList: [],
    pendingCreditList: []
  });

  // Modal details overlay state
  const [viewingListType, setViewingListType] = useState<string | null>(null);

  // Filters state
  const [modalFilter, setModalFilter] = useState<'All' | 'Booking' | 'Manual' | 'Invoice'>('All');
  const [recentFilter, setRecentFilter] = useState<'All' | 'Booking' | 'Manual' | 'Invoice'>('All');

  // Load billing & financial collections data
  const loadBillingData = async (dateStr: string) => {
    setLoading(true);
    try {
      const billingRes = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings/billing-stats?date=${dateStr}`);
      if (billingRes.data.success) {
        setStats(billingRes.data.stats);
        setLists(billingRes.data.lists);
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
    const rawList = lists[viewingListType] || [];
    if (modalFilter === 'Booking') {
      return rawList.filter((item: any) => item.type === 'Booking Consultation' || item.token_number !== undefined);
    }
    if (modalFilter === 'Manual') {
      return rawList.filter((item: any) => item.type === 'Manual Order' || (item.order_no !== undefined && item.invoice_no === undefined));
    }
    if (modalFilter === 'Invoice') {
      return rawList.filter((item: any) => item.type === 'Sales Invoice' || item.invoice_no !== undefined);
    }
    return rawList;
  };

  const getViewingListTitle = () => {
    switch (viewingListType) {
      case 'todayCollectionsList': return "Today's Collections";
      case 'appointmentsList': return "Today's Scheduled Appointments (Slot Date)";
      case 'appointmentsBookedList': return "Today's Booked Appointments (Booking Date)";
      case 'manualOrdersGeneratedList': return "Today's Generated Manual Orders";
      case 'manualOrdersDeliveredList': return "Today's Delivered Manual Orders";
      case 'salesInvoicesList': return "Today's Generated Sales Invoices";
      case 'refundList': return "Today's Appointments Refunds";
      case 'pendingCreditList': return "Pending Credits (Manual Orders)";
      default: return 'Transaction List';
    }
  };

  const getFilteredRecentTransactions = () => {
    const rawList = lists.todayCollectionsList || [];
    if (recentFilter === 'Booking') {
      return rawList.filter((item: any) => item.type === 'Booking Consultation');
    }
    if (recentFilter === 'Manual') {
      return rawList.filter((item: any) => item.type === 'Manual Order');
    }
    if (recentFilter === 'Invoice') {
      return rawList.filter((item: any) => item.type === 'Sales Invoice');
    }
    return rawList;
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
              <Text style={styles.subtitle}>Track today's patient consult fees, EcoGreen sales invoices, and manual orders collections.</Text>
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
          {/* Stats cards row */}
          <View style={styles.gridContainer}>
            {/* Card 1: Today's Collections */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}
              onPress={() => { setModalFilter('All'); setViewingListType('todayCollectionsList'); }}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#ecfdf5' }]}>
                <DollarSign size={20} color="#10b981" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>₹{parseFloat(stats.todayCollections).toLocaleString('en-IN')}</Text>
                <Text style={styles.kpiLabel}>Total Collection (Today)</Text>
              </View>
            </TouchableOpacity>

            {/* Card 2: Appointments Scheduled */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#3b82f6' }]}
              onPress={() => { setModalFilter('All'); setViewingListType('appointmentsList'); }}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#eff6ff' }]}>
                <Receipt size={20} color="#3b82f6" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>{(stats.appointmentsScheduledCount || 0)} (₹{parseFloat(stats.appointmentsScheduledAmount || 0).toLocaleString('en-IN')})</Text>
                <Text style={styles.kpiLabel}>Scheduled Appointments</Text>
              </View>
            </TouchableOpacity>

            {/* Card 3: Appointments Booked Today */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#06b6d4' }]}
              onPress={() => { setModalFilter('All'); setViewingListType('appointmentsBookedList'); }}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#ecfeff' }]}>
                <HeartHandshake size={20} color="#06b6d4" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>{(stats.appointmentsBookedCount || 0)} (₹{parseFloat(stats.appointmentsBookedAmount || 0).toLocaleString('en-IN')})</Text>
                <Text style={styles.kpiLabel}>Appointments Booked Today</Text>
              </View>
            </TouchableOpacity>

            {/* Card 4: Manual Orders Generated */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#8b5cf6' }]}
              onPress={() => { setModalFilter('All'); setViewingListType('manualOrdersGeneratedList'); }}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#f5f3ff' }]}>
                <BadgeDollarSign size={20} color="#8b5cf6" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>{(stats.manualOrdersGeneratedCount || 0)} (₹{parseFloat(stats.manualOrdersGeneratedAmount || 0).toLocaleString('en-IN')})</Text>
                <Text style={styles.kpiLabel}>Manual Orders Generated</Text>
              </View>
            </TouchableOpacity>

            {/* Card 5: Manual Orders Delivered */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#a855f7' }]}
              onPress={() => { setModalFilter('All'); setViewingListType('manualOrdersDeliveredList'); }}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#fae8ff' }]}>
                <BadgeDollarSign size={20} color="#a855f7" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>{(stats.manualOrdersDeliveredCount || 0)} (₹{parseFloat(stats.manualOrdersDeliveredAmount || 0).toLocaleString('en-IN')})</Text>
                <Text style={styles.kpiLabel}>Manual Orders Delivered</Text>
              </View>
            </TouchableOpacity>

            {/* Card 6: Sales Invoices Generated */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#f59e0b' }]}
              onPress={() => { setModalFilter('All'); setViewingListType('salesInvoicesList'); }}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#fffbeb' }]}>
                <FileSpreadsheet size={20} color="#f59e0b" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>₹{parseFloat(stats.salesInvoicesAmount || 0).toLocaleString('en-IN')} ({stats.salesInvoicesCount})</Text>
                <Text style={styles.kpiLabel}>Sales Invoices Generated</Text>
              </View>
            </TouchableOpacity>

            {/* Card 7: Refund of Appointments Amount */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#ef4444' }]}
              onPress={() => { setModalFilter('All'); setViewingListType('refundList'); }}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#fee2e2' }]}>
                <RotateCcw size={20} color="#ef4444" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>₹{parseFloat(stats.refundAmount).toLocaleString('en-IN')}</Text>
                <Text style={styles.kpiLabel}>Appointments Refunded</Text>
              </View>
            </TouchableOpacity>

            {/* Card 8: Pending Credit */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#64748b' }]}
              onPress={() => { setModalFilter('All'); setViewingListType('pendingCreditList'); }}
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

          {/* Side-by-Side Content Layout */}
          <View style={[styles.portalLayout, !isDesktop && styles.portalLayoutMobile]}>
            
            {/* COLUMN 1: Pending Bills (Today) */}
            <View style={[styles.portalColumn, { flex: 1.2 }]}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Pending Bills (Today)</Text>
                
                <ScrollView style={{ maxHeight: 500, marginTop: 12 }}>
                  {lists.appointmentsList && lists.appointmentsList.filter((b: any) => b.status === 'Waiting' || b.status === 'Booked').map((b: any) => (
                    <View key={b.booking_id} style={styles.pendingBillCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#334155' }}>{b.patient_name}</Text>
                        <Text style={{ fontWeight: 'bold', fontSize: 13, color: Colors.light.primary }}>₹{b.amount || 500}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Doctor: Dr. {b.doctor_name} • Token #{b.token_number}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ fontSize: 10, color: '#94a3b8' }}>Status: {b.status}</Text>
                      </View>
                    </View>
                  ))}
                  {(!lists.appointmentsList || lists.appointmentsList.filter((b: any) => b.status === 'Waiting' || b.status === 'Booked').length === 0) && (
                    <Text style={styles.emptyText}>No pending checks-in or waiting bills for today.</Text>
                  )}
                </ScrollView>
              </View>
            </View>

            {/* COLUMN 2: Recent Transactions & Payments Today */}
            <View style={[styles.portalColumn, { flex: 1.8 }]}>
              <View style={styles.card}>
                <View style={[styles.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }]}>
                  <Text style={styles.cardTitle}>Recent Transactions Today</Text>
                  
                  {/* Inline Filter tabs */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[
                      { key: 'All', label: 'All' },
                      { key: 'Booking', label: 'Bookings' },
                      { key: 'Manual', label: 'Manual Orders' },
                      { key: 'Invoice', label: 'Sales Invoices' }
                    ].map((btn) => (
                      <TouchableOpacity
                        key={btn.key}
                        style={[styles.miniTabBtn, recentFilter === btn.key && styles.miniTabBtnActive]}
                        onPress={() => setRecentFilter(btn.key as any)}
                      >
                        <Text style={[styles.miniTabText, recentFilter === btn.key && { color: 'white' }]}>{btn.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                  <View style={{ minWidth: 600, marginTop: 10 }}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { flex: 1.5 }]}>Ref / Token</Text>
                      <Text style={[styles.th, { flex: 3 }]}>Patient / Customer</Text>
                      <Text style={[styles.th, { flex: 2 }]}>Type / Mode</Text>
                      <Text style={[styles.th, { flex: 1.5 }]}>Amount</Text>
                      <Text style={[styles.th, { flex: 1.5 }]}>Status</Text>
                    </View>

                    {getFilteredRecentTransactions().slice(0, 10).map((item: any, idx: number) => (
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
                        </View>

                        <View style={{ flex: 2 }}>
                          <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                            {item.type || 'Collection'}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#94a3b8' }}>
                            {item.payment_mode || 'Cash'}
                          </Text>
                        </View>

                        <Text style={{ flex: 1.5, fontSize: 13, color: '#0f172a', fontWeight: 'bold' }}>
                          ₹{parseFloat(item.amount || item.cash_amount || 0).toLocaleString('en-IN')}
                        </Text>

                        <View style={{ flex: 1.5 }}>
                          <View style={[styles.statusTag, styles.statusTagCompleted]}>
                            <Text style={[styles.statusTagText, { color: '#065f46' }]}>Completed</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                    {getFilteredRecentTransactions().length === 0 && (
                      <Text style={styles.emptyText}>No matching transactions processed today.</Text>
                    )}
                  </View>
                </ScrollView>
              </View>
            </View>

          </View>

        </>
      )}

      {/* KPI Details Modal overlay with Type Filters */}
      <Modal visible={viewingListType !== null} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setViewingListType(null)}>
          <View style={[styles.modalContent, { width: '85%', maxWidth: 850, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{getViewingListTitle()}</Text>
                
                {/* Horizontal Filter tabs inside modal */}
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                  {[
                    { key: 'All', label: 'All' },
                    { key: 'Booking', label: 'Bookings' },
                    { key: 'Manual', label: 'Manual Orders' },
                    { key: 'Invoice', label: 'Sales Invoices' }
                  ].map((btn) => (
                    <TouchableOpacity
                      key={btn.key}
                      style={[styles.miniTabBtn, modalFilter === btn.key && styles.miniTabBtnActive]}
                      onPress={() => setModalFilter(btn.key as any)}
                    >
                      <Text style={[styles.miniTabText, modalFilter === btn.key && { color: 'white' }]}>
                        {btn.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity onPress={() => setViewingListType(null)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ padding: 20 }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 1.5 }]}>Ref / Token</Text>
                <Text style={[styles.th, { flex: 3 }]}>Patient / Customer Name</Text>
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
                      {item.type || (item.invoice_no ? 'Sales Invoice' : 'Manual Order')}
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
                <Text style={[styles.emptyText, { padding: 40 }]}>No transactions or records match this filter query.</Text>
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

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  
  kpiCard: { minWidth: 240, flex: 1, backgroundColor: 'white', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 5, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  kpiIconContainer: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  kpiValue: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  kpiLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 4, textTransform: 'uppercase' },

  portalLayout: { flexDirection: 'row', gap: 16, marginTop: 16 },
  portalLayoutMobile: { flexDirection: 'column' },
  portalColumn: { gap: 16 },

  pendingBillCard: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', marginBottom: 10 },

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

  card: { backgroundColor: 'white', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  cardHeader: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10, marginBottom: 10 },

  miniTabBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  miniTabBtnActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  miniTabText: { fontSize: 10, fontWeight: '700', color: '#475569' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' }
});
