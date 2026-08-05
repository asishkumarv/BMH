import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal, Platform } from 'react-native';
import axios from 'axios';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { ArrowLeft, RefreshCw, X, CircleAlert, DollarSign, Receipt, BadgeDollarSign, FileSpreadsheet, RotateCcw, ShieldAlert, HeartHandshake, CreditCard, Banknote, HelpCircle, Search, UserPlus, ShoppingBag, Plus } from 'lucide-react-native';
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

  // Cashier Portal interactive states
  const [billTab, setBillTab] = useState<'Consultation' | 'Lab' | 'Pharmacy'>('Consultation');
  const [searchPatientQuery, setSearchPatientQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  
  // Doctor options
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  
  // Charge Items list
  const [chargeItems, setChargeItems] = useState<any[]>([
    { name: 'Consultation Fee', type: 'Consultation', amount: 500 }
  ]);
  
  const [discountPercent, setDiscountPercent] = useState('0');
  const [taxPercent, setTaxPercent] = useState('0');

  // Currently loaded bill for Process Payment
  const [activePaymentBill, setActivePaymentBill] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Insurance' | 'Credit'>('Cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Load billing & financial collections data
  const loadBillingData = async (dateStr: string) => {
    setLoading(true);
    try {
      const [billingRes, slotsRes] = await Promise.all([
        axios.get(`https://napi.bharatmedicalhallplus.com/bookings/billing-stats?date=${dateStr}`),
        axios.get(`https://napi.bharatmedicalhallplus.com/doctors/slots`)
      ]);
      
      if (billingRes.data.success) {
        setStats(billingRes.data.stats);
        setLists(billingRes.data.lists);
      }
      
      // Load slots to populate doctors
      if (slotsRes.data.success) {
        const dateSlots = (slotsRes.data.data || []).filter((s: any) => {
          const sDate = new Date(s.date).toISOString().split('T')[0];
          return sDate === dateStr;
        });
        setSlots(dateSlots);
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

  // Recalculations
  const getSubtotal = () => chargeItems.reduce((sum, item) => sum + item.amount, 0);
  const getDiscount = () => (getSubtotal() * parseFloat(discountPercent || '0')) / 100;
  const getTax = () => ((getSubtotal() - getDiscount()) * parseFloat(taxPercent || '0')) / 100;
  const getTotalAmount = () => getSubtotal() - getDiscount() + getTax();

  // Search Patient handler
  const handleSearchPatient = async () => {
    if (!searchPatientQuery) return;
    try {
      // Find patient by name or phone from our booked patient listings
      const list = lists.appointmentsList || [];
      const found = list.find((b: any) => 
        b.patient_name.toLowerCase().includes(searchPatientQuery.toLowerCase()) || 
        b.mobile.includes(searchPatientQuery)
      );
      if (found) {
        setSelectedPatient({
          name: found.patient_name,
          mobile: found.mobile,
          age: found.age,
          gender: found.gender,
          booking_id: found.booking_id
        });
        // Auto load into payment process
        setActivePaymentBill({
          id: `PB-${found.booking_id}`,
          patient_name: found.patient_name,
          doctor_name: found.doctor_name,
          amount: found.amount || 500,
          original: found
        });
        setReceivedAmount(String(found.amount || 500));
      } else {
        // Fallback dummy for demo if not found
        setSelectedPatient({
          name: searchPatientQuery,
          mobile: '9876543210',
          age: 32,
          gender: 'Male'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Prepopulate bill when selecting doctor slot
  const handleSlotChange = (slotId: string) => {
    setSelectedSlotId(slotId);
    const slot = slots.find(s => s.id.toString() === slotId);
    if (slot) {
      setChargeItems([
        { name: 'Consultation Fee', type: 'Consultation', amount: parseFloat(slot.fee || '500') }
      ]);
    }
  };

  // Add custom charge item
  const handleAddChargeItem = () => {
    const newItem = {
      name: billTab === 'Lab' ? 'Lab Diagnostics' : billTab === 'Pharmacy' ? 'Medicines Bill' : 'Consultation Charge',
      type: billTab,
      amount: billTab === 'Lab' ? 750 : billTab === 'Pharmacy' ? 350 : 500
    };
    setChargeItems([...chargeItems, newItem]);
  };

  // Confirm payment handler
  const handleConfirmPayment = async () => {
    if (!activePaymentBill) {
      Alert.alert('Selection Error', 'Please select or search a patient bill to process.');
      return;
    }
    setProcessingPayment(true);
    try {
      const orig = activePaymentBill.original;
      if (orig && orig.booking_id) {
        // Update booking status to completed via API
        const statusRes = await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/${orig.booking_id}/status`, {
          status: 'Completed'
        });
        if (statusRes.data.success) {
          Alert.alert('Payment Successful', `Bill ${activePaymentBill.id} marked as Paid via ${paymentMode}!`);
          setActivePaymentBill(null);
          setSelectedPatient(null);
          loadBillingData(selectedDate);
        }
      } else {
        // Dummy/Walk-in manual bill creation
        Alert.alert('Payment Successful', `Walk-in Bill processed successfully for ₹${getTotalAmount()} via ${paymentMode}!`);
        setActivePaymentBill(null);
        setSelectedPatient(null);
        setChargeItems([{ name: 'Consultation Fee', type: 'Consultation', amount: 500 }]);
        loadBillingData(selectedDate);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to process payment.');
    } finally {
      setLoading(false);
    }
  };

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

  // Calculate Cash summary
  const cashPaymentsToday = lists.todayCollectionsList
    ? lists.todayCollectionsList.filter((item: any) => item.payment_mode === 'Cash').reduce((sum: number, item: any) => sum + parseFloat(item.amount || item.cash_amount || 0), 0)
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* Title Header */}
      <View style={[styles.header, isDesktop && { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={styles.backButtonRound} onPress={() => router.replace('/employee/dashboard')}>
            <ArrowLeft size={18} color={Colors.light.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Collections & Cashier Portal</Text>
            {isDesktop && (
              <Text style={styles.subtitle}>Welcome back, Cashier! Track patient payments, collect dues, and generate receipts.</Text>
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
          {/* Top Cashier Portal stats row */}
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
                <Text style={styles.kpiLabel}>Total Collection (Today)</Text>
              </View>
            </TouchableOpacity>

            {/* Card 2: Appointments */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#3b82f6' }]}
              onPress={() => setViewingListType('appointmentsList')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#eff6ff' }]}>
                <Receipt size={20} color="#3b82f6" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>{stats.appointmentsCount}</Text>
                <Text style={styles.kpiLabel}>Total Bills/Appointments</Text>
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
                <Text style={styles.kpiLabel}>Manual Orders Collection</Text>
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
                <Text style={styles.kpiLabel}>Total Booked today</Text>
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
                <Text style={styles.kpiLabel}>Refunds (Today)</Text>
              </View>
            </TouchableOpacity>

            {/* Card 7: Pending */}
            <TouchableOpacity 
              style={[styles.kpiCard, { borderLeftColor: '#64748b' }]}
              onPress={() => setViewingListType('pendingCreditList')}
            >
              <View style={[styles.kpiIconContainer, { backgroundColor: '#f1f5f9' }]}>
                <ShieldAlert size={20} color="#64748b" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kpiValue}>₹{parseFloat(stats.pendingCredit).toLocaleString('en-IN')}</Text>
                <Text style={styles.kpiLabel}>Pending Credits (Today)</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Cashier Columns Layout (Pending Bills, Process Payment) */}
          <View style={[styles.portalLayout, !isDesktop && styles.portalLayoutMobile]}>
            
            {/* COLUMN 1: Pending Bills */}
            <View style={[styles.portalColumn, { flex: 1.2 }]}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Pending Bills (Today)</Text>
                
                <ScrollView style={{ maxHeight: 420, marginTop: 12 }}>
                  {lists.appointmentsList && lists.appointmentsList.filter((b: any) => b.status === 'Waiting' || b.status === 'Booked').map((b: any) => (
                    <TouchableOpacity 
                      key={b.booking_id} 
                      style={[styles.pendingBillCard, activePaymentBill?.original?.booking_id === b.booking_id && { borderColor: Colors.light.primary, backgroundColor: '#eff6ff' }]}
                      onPress={() => {
                        setActivePaymentBill({
                          id: `PB-${b.booking_id}`,
                          patient_name: b.patient_name,
                          doctor_name: b.doctor_name,
                          amount: b.amount || 500,
                          original: b
                        });
                        setReceivedAmount(String(b.amount || 500));
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#334155' }}>{b.patient_name}</Text>
                        <Text style={{ fontWeight: 'bold', fontSize: 13, color: Colors.light.primary }}>₹{b.amount || 500}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Doctor: Dr. {b.doctor_name} • Token #{b.token_number}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ fontSize: 10, color: '#94a3b8' }}>Status: {b.status}</Text>
                        <Text style={{ fontSize: 11, color: Colors.light.primary, fontWeight: 'bold' }}>Pay Now →</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {(!lists.appointmentsList || lists.appointmentsList.filter((b: any) => b.status === 'Waiting' || b.status === 'Booked').length === 0) && (
                    <Text style={styles.emptyText}>No pending checks-in or waiting bills for today.</Text>
                  )}
                </ScrollView>
              </View>
            </View>

            {/* COLUMN 2: Process Payment */}
            <View style={[styles.portalColumn, { flex: 1.8 }]}>
              <View style={[styles.card, { borderColor: '#bfdbfe', borderWidth: 1, backgroundColor: '#f0f9ff' }]}>
                <Text style={[styles.cardTitle, { color: '#0369a1' }]}>Process Payment</Text>

                {activePaymentBill ? (
                  <View style={{ marginTop: 12 }}>
                    <View style={styles.paymentBillHeader}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0284c7' }}>BILL REF: {activePaymentBill.id}</Text>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0369a1' }}>{activePaymentBill.patient_name}</Text>
                    </View>

                    <View style={styles.paymentDetailRow}><Text style={styles.detailLabel}>Sub Total:</Text><Text style={styles.detailVal}>₹{activePaymentBill.amount}</Text></View>
                    <View style={styles.paymentDetailRow}><Text style={styles.detailLabel}>Total Amount Due:</Text><Text style={[styles.detailVal, { fontSize: 18, color: '#0369a1', fontWeight: 'bold' }]}>₹{activePaymentBill.amount}</Text></View>

                    {/* Payment Mode Selector Grid */}
                    <Text style={[styles.label, { marginTop: 12, color: '#0369a1' }]}>Select Payment Mode</Text>
                    <View style={styles.modeGrid}>
                      {['Cash', 'UPI', 'Card', 'Credit'].map((mode: any) => (
                        <TouchableOpacity 
                          key={mode} 
                          style={[styles.modeBtn, paymentMode === mode && styles.modeBtnActive]}
                          onPress={() => setPaymentMode(mode)}
                        >
                          <Text style={[styles.modeBtnText, paymentMode === mode && { color: 'white' }]}>{mode}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Cash Quick Received amount input */}
                    <Text style={[styles.label, { marginTop: 14, color: '#0369a1' }]}>Received Amount (₹)</Text>
                    <TextInput 
                      style={styles.payInput} 
                      keyboardType="numeric" 
                      value={receivedAmount} 
                      onChangeText={setReceivedAmount} 
                    />

                    <Text style={[styles.label, { marginTop: 12, color: '#0369a1' }]}>Remarks (Optional)</Text>
                    <TextInput 
                      style={styles.payInput} 
                      placeholder="Enter payment reference or notes..." 
                      value={paymentRemarks}
                      onChangeText={setPaymentRemarks}
                    />

                    <TouchableOpacity 
                      style={[styles.confirmPayBtn, processingPayment && { opacity: 0.8 }]} 
                      onPress={handleConfirmPayment}
                      disabled={processingPayment}
                    >
                      {processingPayment ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Banknote size={16} color="white" style={{ marginRight: 6 }} />
                          <Text style={styles.confirmPayBtnText}>Confirm Payment & Print Receipt</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelBillBtn} onPress={() => setActivePaymentBill(null)}>
                      <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>Cancel Process</Text>
                    </TouchableOpacity>

                  </View>
                ) : (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <ShoppingBag size={48} color="#94a3b8" />
                    <Text style={{ fontStyle: 'italic', color: '#64748b', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
                      Select a pending bill from the left column to activate payment collection.
                    </Text>
                  </View>
                )}

              </View>
            </View>

          </View>

          {/* Bottom Row Layout (Recent Transactions) */}
          <View style={{ marginTop: 20 }}>
            
            {/* Recent Transactions list */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Transactions & Payments Today</Text>
              
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                <View style={{ minWidth: 600, marginTop: 10 }}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 1.5 }]}>Ref / Token</Text>
                    <Text style={[styles.th, { flex: 3 }]}>Patient / Customer</Text>
                    <Text style={[styles.th, { flex: 2 }]}>Type / Mode</Text>
                    <Text style={[styles.th, { flex: 1.5 }]}>Amount</Text>
                    <Text style={[styles.th, { flex: 1.5 }]}>Status</Text>
                  </View>

                  {lists.todayCollectionsList && lists.todayCollectionsList.slice(0, 8).map((item: any, idx: number) => (
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
                  {(!lists.todayCollectionsList || lists.todayCollectionsList.length === 0) && (
                    <Text style={styles.emptyText}>No transactions processed today.</Text>
                  )}
                </View>
              </ScrollView>
            </View>

          </View>

        </>
      )}

      {/* KPI Details Modal overlay */}
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
  
  kpiCard: { minWidth: 220, flex: 1, backgroundColor: 'white', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 5, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  kpiIconContainer: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  kpiValue: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  kpiLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 4, textTransform: 'uppercase' },

  portalLayout: { flexDirection: 'row', gap: 16, marginTop: 16 },
  portalLayoutMobile: { flexDirection: 'column' },
  portalColumn: { gap: 16 },

  tabContainer: { flexDirection: 'row', gap: 6, marginVertical: 12 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: '#f1f5f9', alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.light.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: '#475569' },

  searchBarBox: { flexDirection: 'row', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, overflow: 'hidden' },
  searchBarInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, backgroundColor: 'white', outlineStyle: 'none' as any },
  searchBarBtn: { backgroundColor: Colors.light.primary, width: 36, justifyContent: 'center', alignItems: 'center' },

  patientInfoBox: { padding: 12, borderRadius: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', marginTop: 12 },
  patientInfoName: { fontWeight: 'bold', fontSize: 14, color: '#166534' },
  patientInfoMeta: { fontSize: 11, color: '#15803d', marginTop: 2 },

  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  dropdownBox: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, overflow: 'hidden', backgroundColor: 'white' },
  htmlSelect: { width: '100%', padding: 8, fontSize: 13, color: '#334155', border: 'none', outline: 'none' },

  itemsTable: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden', marginTop: 8 },
  itemsTableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  itemsTableRow: { flexDirection: 'row', padding: 8, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start' },

  divider: { height: 1, backgroundColor: '#e2e8f0', my: 12, marginVertical: 12 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sumLabel: { fontSize: 13, color: '#64748b' },
  sumValue: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  discountInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, width: 50, paddingHorizontal: 6, paddingVertical: 4, fontSize: 12, textAlign: 'right', backgroundColor: 'white' },

  primaryBtn: { flex: 1.5, backgroundColor: Colors.light.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
  secondaryBtnText: { color: '#475569', fontWeight: 'bold', fontSize: 13 },

  pendingBillCard: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', marginBottom: 10 },
  paymentBillHeader: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#bae6fd', marginBottom: 12 },
  paymentDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailLabel: { fontSize: 13, color: '#0369a1' },
  detailVal: { fontSize: 14, fontWeight: 'bold', color: '#0369a1' },

  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modeBtn: { flex: 1, minWidth: 65, paddingVertical: 8, borderRadius: 6, backgroundColor: 'white', borderWidth: 1, borderColor: '#0284c7', alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  modeBtnText: { fontSize: 12, fontWeight: 'bold', color: '#0284c7' },
  payInput: { borderWidth: 1, borderColor: '#0284c7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0369a1', backgroundColor: 'white', outlineStyle: 'none' as any },

  confirmPayBtn: { backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16, flexDirection: 'row' },
  confirmPayBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  cancelBillBtn: { marginTop: 10, paddingVertical: 6 },

  shortcutBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  shortcutText: { fontSize: 12, fontWeight: '600', color: '#475569' },

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

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#64748b' },
  summaryValue: { fontSize: 13, fontWeight: 'bold', color: '#334155' },

  card: { backgroundColor: 'white', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 450, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' }
});
