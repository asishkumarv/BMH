import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: "#004990",     // Solid plain blue
  primaryLight: "#508AD3",
  bg: "#F4F7FC",
  surface: "#FFFFFF",
  text: "#1E293B",
  textMuted: "#64748B",
  border: "#E2E8F0",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B"
};

const shadow = Platform.select({
  ios: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 3 },
  default: {},
});

const SalesOrderStatusScreen = () => {
  const [orderNo, setOrderNo] = useState('');
  const [apiKey, setApiKey] = useState(''); // Preserve declared state
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  const [toast, setToast] = useState({ visible: false, title: "", message: "", type: "success" });
  const slideAnim = useRef(new Animated.Value(400)).current;

  const router = useRouter();

  const showToast = (type, title, message) => {
    setToast({ visible: true, title, message, type });
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();

    setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToast(prev => ({ ...prev, visible: false })));
    }, 3000);
  };

  const fetchStatus = async () => {
    if (!orderNo) {
      showToast("warning", "Missing Info", "Please enter an Order Number to track.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        'https://napi.bharatmedicalhallplus.com/ecogreen/sales-order-status',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNo }),
        }
      );

      if (!response.ok) throw new Error('Failed to fetch data from server');

      const json = await response.json();

      if (json.code === "200") {
        setData(json);
        showToast("success", "Tracking Loaded", `Sales order tracking details parsed.`);
      } else {
        showToast("error", "Error", json.message || "Order not found. Please try again.");
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Network Error", "Unable to establish connection to tracking servers.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Custom Sliding Toast Alert */}
      {toast.visible && (
        <Animated.View style={[
          styles.toastContainer,
          { transform: [{ translateX: slideAnim }], borderLeftColor: toast.type === 'error' ? COLORS.danger : '#10B981' }
        ]}>
          <View style={[styles.toastIconBox, { backgroundColor: toast.type === 'error' ? '#FEF2F2' : '#ECFDF5' }]}>
            <Ionicons name={toast.type === 'error' ? 'close-circle' : 'checkmark-circle'} size={24} color={toast.type === 'error' ? COLORS.danger : '#10B981'} />
          </View>
          <View style={styles.toastTextContainer}>
            <Text style={styles.toastTitle}>{toast.title}</Text>
            <Text style={styles.toastMessage}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      {/* PLAIN BLUE HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.mainTitle}>Sales Order Tracking</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* SEARCH CARD SECTION */}
          <View style={[styles.card, shadow]}>
            <Text style={styles.cardTitle}>Track Order Details</Text>

            <View style={styles.formGrid}>
              <View style={styles.formInputGroup}>
                <Text style={styles.label}>Order Number</Text>
                <View style={[
                  styles.inputWrapper,
                  isFocused && { borderColor: COLORS.primaryLight }
                ]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 117"
                    placeholderTextColor={COLORS.textMuted}
                    value={orderNo}
                    onChangeText={setOrderNo}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    autoComplete="off"
                  />
                </View>
              </View>
            </View>

            {/* Check Status Button */}
            <TouchableOpacity style={styles.searchBtn} onPress={fetchStatus} disabled={loading} activeOpacity={0.8}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
              >
                {loading ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <>
                    <Ionicons name="search-outline" size={16} color="#FFF" />
                    <Text style={styles.searchBtnText}>Check Status</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* RESULTS PRESENTATION SEGMENT */}
          {data && (
            <View style={styles.resultsContainer}>
              <View style={[styles.orderHeaderCard, shadow]}>
                <View style={styles.badgeLeftIndicator} />
                <View style={{ paddingLeft: 12 }}>
                  <Text style={styles.orderHeaderText}>Sales Order ID: #{data.orderId}</Text>
                  <Text style={styles.orderHeaderSub}>
                    Customer Code: {data.custCode}  |  Customer Type: {data.customerType}
                  </Text>
                </View>
              </View>

              {data.invoices?.map((inv, idx) => {
                const isPending = inv.docStatus?.toLowerCase().includes("pending");

                return (
                  <View key={idx} style={[
                    styles.invoiceCard,
                    shadow,
                    isPending && { borderLeftColor: COLORS.danger, borderLeftWidth: 4 }
                  ]}>
                    <View style={styles.invoiceHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.invoiceTitle}>Doc No: {inv.docNo}</Text>
                        <Text style={styles.invoiceSub}>Created By: {inv.createdBy || "—"}  |  Date: {inv.docDate}</Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        isPending ? { backgroundColor: '#FEF2F2' } : { backgroundColor: '#ECFDF5' }
                      ]}>
                        <Text style={[
                          styles.statusBadgeText,
                          isPending ? { color: COLORS.danger } : { color: COLORS.success }
                        ]}>
                          {inv.docStatus}
                        </Text>
                      </View>
                    </View>

                    {/* METRIC STEP TRACKING TIMELINE BAR [1] */}
                    <View style={styles.statusStepsContainer}>
                      <View style={styles.stepItem}>
                        <View style={[styles.stepDot, { backgroundColor: COLORS.success }]} />
                        <Text style={styles.stepText}>Ordered</Text>
                      </View>
                      <View style={[styles.stepLine, !isPending && { backgroundColor: COLORS.success }]} />
                      <View style={styles.stepItem}>
                        <View style={[
                          styles.stepDot,
                          { backgroundColor: isPending ? COLORS.border : COLORS.success }
                        ]} />
                        <Text style={[styles.stepText, isPending && { color: COLORS.textMuted }]}>Processed</Text>
                      </View>
                      <View style={[styles.stepLine, !isPending && { backgroundColor: COLORS.success }]} />
                      <View style={styles.stepItem}>
                        <View style={[
                          styles.stepDot,
                          { backgroundColor: isPending ? COLORS.border : COLORS.success }
                        ]} />
                        <Text style={[styles.stepText, isPending && { color: COLORS.textMuted }]}>Dispatched</Text>
                      </View>
                    </View>

                    {/* HORIZONTAL DATA OVERVIEW TABLE */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginTop: 16 }}>
                      <View>
                        {/* Table Column Headers */}
                        <View style={styles.tableHeader}>
                          {[
                            { label: "Product Name", width: 180 },
                            { label: "HSN", width: 80 },
                            { label: "Qty", width: 60 },
                            { label: "Qty/Box", width: 80 },
                            { label: "MRP", width: 70 },
                            { label: "Sale Rate", width: 90 },
                            { label: "Discount %", width: 100 },
                            { label: "Item Total", width: 100 },
                            { label: "Batch", width: 100 },
                            { label: "Expiry", width: 100 },
                            { label: "CGST %", width: 70 },
                            { label: "CGST Amt", width: 90 },
                            { label: "SGST %", width: 70 },
                            { label: "SGST Amt", width: 90 },
                            { label: "IGST %", width: 70 },
                            { label: "IGST Amt", width: 90 },
                            { label: "CESS %", width: 70 },
                            { label: "CESS Amt", width: 90 }
                          ].map((col, hIdx) => (
                            <Text key={hIdx} style={[styles.columnHeader, { width: col.width }]}>{col.label}</Text>
                          ))}
                        </View>

                        {/* Table Column Content Rows */}
                        {inv.detail?.map((item, i) => (
                          <View
                            key={i}
                            style={[
                              styles.tableRow,
                              { backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#FFFFFF" }
                            ]}
                          >
                            <Text style={[styles.cellText, { width: 180 }]} numberOfLines={1}>{item.productName}</Text>
                            <Text style={[styles.cellText, { width: 80 }]}>{item.hsnCode}</Text>
                            <Text style={[styles.cellText, { width: 60, fontWeight: '700' }]}>{item.qty}</Text>
                            <Text style={[styles.cellText, { width: 80 }]}>{item.qtyPerBox}</Text>
                            <Text style={[styles.cellText, { width: 70 }]}>₹{item.mrp}</Text>
                            <Text style={[styles.cellText, { width: 90 }]}>₹{item.saleRate}</Text>
                            <Text style={[styles.cellText, { width: 100 }]}>{item.discPer}%</Text>
                            <Text style={[styles.cellText, { width: 100, fontWeight: '700', color: COLORS.primary }]}>
                              ₹{parseFloat(item.itemTotal).toFixed(2)}
                            </Text>
                            <Text style={[styles.cellText, { width: 100 }]}>{item.batch || '-'}</Text>
                            <Text style={[styles.cellText, { width: 100 }]}>{item.expiryDate || '-'}</Text>
                            <Text style={[styles.cellText, { width: 70 }]}>{item.cgstPer}%</Text>
                            <Text style={[styles.cellText, { width: 90 }]}>₹{item.cgstAmt}</Text>
                            <Text style={[styles.cellText, { width: 70 }]}>{item.sgstPer}%</Text>
                            <Text style={[styles.cellText, { width: 90 }]}>₹{item.sgstAmt}</Text>
                            <Text style={[styles.cellText, { width: 70 }]}>{item.igstPer}%</Text>
                            <Text style={[styles.cellText, { width: 90 }]}>₹{item.igstAmt}</Text>
                            <Text style={[styles.cellText, { width: 70 }]}>{item.cessPer}%</Text>
                            <Text style={[styles.cellText, { width: 90 }]}>₹{item.cessAmt}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>

                    {/* Invoice Grand Total Summary Card */}
                    <View style={styles.totalRow}>
                      <Text style={styles.invoiceTotal}>
                        Invoice Grand Total:  <Text style={styles.invoiceTotalBold}>₹{parseFloat(inv.docTotal).toFixed(2)}</Text>
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    backgroundColor: COLORS.primary,     // Plain Blue Background
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 48,
    paddingBottom: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  mainTitle: { fontSize: 18, fontWeight: "800", color: "#fff" }, // Vertically aligned

  mainContent: { flex: 1 },
  scrollContent: { padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16, color: COLORS.text },

  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  formInputGroup: { flex: 1, minWidth: 240 },
  label: { marginBottom: 6, fontWeight: '700', color: COLORS.text, fontSize: 12 },
  inputWrapper: {
    height: 44,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: { flex: 1, color: COLORS.text, fontSize: 14, ...Platform.select({ web: { outlineWidth: 0 } }) },

  // Linear Gradient Tracking Button
  searchBtn: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: 'flex-start'
  },
  gradient: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20
  },
  searchBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

  // Tracking Output Results Layout
  resultsContainer: { marginTop: 20 },
  orderHeaderCard: {
    flexDirection: 'row',
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD'
  },
  badgeLeftIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.primaryLight
  },
  orderHeaderText: { fontSize: 15, fontWeight: '800', color: '#0369A1' },
  orderHeaderSub: { fontSize: 12, color: '#075985', marginTop: 3, fontWeight: '600' },

  // Invoice visual mapping cards
  invoiceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  invoiceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.5,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10
  },
  invoiceTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  invoiceSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 3, fontWeight: '600' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start'
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: 'uppercase'
  },

  // Steps Tracking timeline [1]
  statusStepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    backgroundColor: COLORS.bg,
    padding: 10,
    borderRadius: 10,
  },
  stepItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },

  // Responsive Table Structures
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border
  },
  columnHeader: { fontWeight: '800', color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center'
  },
  cellText: { color: COLORS.text, fontSize: 13, fontWeight: '500' },

  // Final Total Summary Panel
  totalRow: {
    marginTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    alignItems: 'flex-end'
  },
  invoiceTotal: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  invoiceTotalBold: { fontSize: 15, fontWeight: '800', color: COLORS.primary },

  // Sliding Toast Alert Layout Block
  toastContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    minWidth: 280,
    maxWidth: 350,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toastTextContainer: { flex: 1 },
  toastTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  toastMessage: { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },
});

export default SalesOrderStatusScreen;
