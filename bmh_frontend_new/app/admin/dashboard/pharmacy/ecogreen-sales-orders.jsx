import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
  StatusBar,
  Animated,
  SafeAreaView
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const BASE_URL = "https://napi.bharatmedicalhallplus.com/ecogreen";

const COLORS = {
  primary: "#004990",
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

export default function EcogreenSalesOrderData() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [idFilter, setIdFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [patientModalVisible, setPatientModalVisible] = useState(false);
  const [pharmacyModalVisible, setPharmacyModalVisible] = useState(false);

  const [isFocused, setIsFocused] = useState(false);
  const [toast, setToast] = useState({ visible: false, title: "", message: "", type: "success" });
  const slideAnim = useRef(new Animated.Value(400)).current;

  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const MAX_WIDTH = 1200;
  const containerWidth = SCREEN_WIDTH > MAX_WIDTH ? MAX_WIDTH : SCREEN_WIDTH - 20;

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

  const showAlert = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      alert(`${title}\n\n${message}`);
    }
  };

  const formatISTDateTime = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return "-";
    }
  };

  // API Call - Unchanged
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/sales-orders`);
      const data = await res.json();
      setOrders(data);
      setFilteredOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
      showToast('error', 'Sync Failure', 'Failed to retrieve sales records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter bindings - Unchanged
  useEffect(() => {
    let filtered = [...orders];

    if (search.trim()) {
      const lower = search.toLowerCase();
      filtered = filtered.filter((o) => {
        return (
          (o.order_no && o.order_no.toLowerCase().includes(lower)) ||
          (o.id && o.id.toString().includes(lower)) ||
          (o.order_id && o.order_id.toString().includes(lower)) ||
          (o.invoice_id && o.invoice_id.toLowerCase().includes(lower)) ||
          (o.payment_status && o.payment_status.toLowerCase().includes(lower))
        );
      });
    }

    if (idFilter.trim()) {
      filtered = filtered.filter((o) => {
        return (
          o.id?.toString().includes(idFilter) ||
          o.order_id?.toString().includes(idFilter) ||
          o.order_no?.toString().includes(idFilter)
        );
      });
    }

    if (selectedDate) {
      filtered = filtered.filter((o) => {
        if (!o.created_at_system) return false;
        const orderDate = new Date(o.created_at_system)
          .toISOString()
          .split("T")[0];
        return orderDate === selectedDate;
      });
    }

    setFilteredOrders(filtered);
  }, [search, idFilter, selectedDate, orders]);

  const openViewModal = (order) => {
    setViewOrder(order);
    setViewModalVisible(true);
  };

  const openPatientModal = (order) => {
    setViewOrder(order);
    setPatientModalVisible(true);
  };

  const openPharmacyModal = (order) => {
    setViewOrder(order);
    setPharmacyModalVisible(true);
  };

  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, order) => {
    const price = parseFloat(order.total_price) || 0;
    return sum + price;
  }, 0);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Syncing Sales Orders...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
            <Text style={toast.type === 'error' ? styles.toastTitleError : styles.toastTitle}>{toast.title}</Text>
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
          <Text style={styles.mainTitle}>Sales Orders Master</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* DATE FILTER CARD */}
          <View style={[styles.dateFilterCard, shadow]}>
            <View style={styles.dateLeft}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              <Text style={styles.dateLabel}>Filter by System Date</Text>
            </View>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={webDateFilterStyle}
            />
          </View>

          {/* SUMMARY GRID CARDS */}
          <View style={styles.summaryGrid}>
            <View style={[styles.kpiCard, shadow, { borderLeftColor: COLORS.primary }]}>
              <Ionicons name="receipt-outline" size={20} color={COLORS.primary} />
              <Text style={styles.kpiTitle}>Total Orders</Text>
              <Text style={styles.kpiValue}>{totalOrders}</Text>
            </View>

            <View style={[styles.kpiCard, shadow, { borderLeftColor: COLORS.success }]}>
              <Ionicons name="cash-outline" size={20} color={COLORS.success} />
              <Text style={styles.kpiTitle}>Total Revenue</Text>
              <Text style={styles.kpiValue}>₹ {totalRevenue.toFixed(2)}</Text>
            </View>
          </View>

          {/* SEARCH CARD */}
          <View style={[styles.searchBox, shadow, isFocused && { borderColor: COLORS.primaryLight }]}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInputWeb}
              placeholder="Search by order, invoice, payment..."
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoComplete="off"
            />
          </View>

          {/* DATA SCROLLABLE TABLE CONTAINER */}
          <View style={[styles.card, shadow, { marginTop: 10, padding: 0 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.tableWrapper}>

                {/* TABLE HEADERS */}
                <View style={styles.tableHeaderRow}>
                  {[
                    { label: "ID", width: 70 },
                    { label: "Order ID", width: 120 },
                    { label: "Order No", width: 140 },
                    { label: "Invoice", width: 160 },
                    { label: "Type", width: 120 },
                    { label: "Created At", width: 180 },
                    { label: "Created User", width: 160 },
                    { label: "For", width: 120 },
                    { label: "Deliveredby", width: 120 },
                    { label: "Payment", width: 140 },
                    { label: "Total", width: 120 },
                    { label: "Discount", width: 120 },
                    { label: "Shipping", width: 120 },
                    { label: "Patient Name", width: 160 },
                    { label: "Contact No", width: 140 },
                    { label: "Patient Details", width: 120 },
                    { label: "Pharmacy Details", width: 120 },
                    { label: "Items count", width: 80 },
                    { label: "Action", width: 80 }
                  ].map((col, idx) => (
                    <Text key={idx} style={[styles.headerCell, { width: col.width }]}>{col.label}</Text>
                  ))}
                </View>

                {/* TABLE ROWS */}
                {filteredOrders.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No registered sales orders located.</Text>
                  </View>
                ) : (
                  filteredOrders.map((item, index) => (
                    <View
                      key={item.id.toString()}
                      style={[
                        styles.tableRow,
                        index % 2 === 0 ? styles.rowEven : styles.rowOdd,
                      ]}
                    >
                      <Text style={[styles.cell, { width: 70 }]}>{item.id}</Text>
                      <Text style={[styles.cell, { width: 120 }]}>{item.order_id || "-"}</Text>
                      <Text style={[styles.cell, { width: 140 }]}>{item.order_no || "-"}</Text>
                      <Text style={[styles.cell, { width: 160 }]}>{item.invoice_id || "-"}</Text>
                      <Text style={[styles.cell, { width: 120 }]}>{item.order_type || "-"}</Text>
                      <Text style={[styles.cell, { width: 180 }]} numberOfLines={1}>
                        {formatISTDateTime(item.created_at_system)}
                      </Text>
                      <Text style={[styles.cell, { width: 160 }]}>{item.createduser || "-"}</Text>
                      <Text style={[styles.cell, { width: 120 }]}>{item.order_for || "-"}</Text>
                      <Text style={[styles.cell, { width: 120 }]}>{item.delivered_by || "-"}</Text>
                      <Text style={[styles.cell, { width: 140, fontWeight: '700' }]}>{item.payment_status || "-"}</Text>
                      <Text style={[styles.cell, { width: 120, color: COLORS.primary, fontWeight: '800' }]}>₹{item.total_price || "0"}</Text>
                      <Text style={[styles.cell, { width: 120 }]}>{item.total_discount || "0"}</Text>
                      <Text style={[styles.cell, { width: 120 }]}>{item.shipping_charge || "0"}</Text>
                      <Text style={[styles.cell, { width: 160 }]} numberOfLines={1}>{item.patient_name || "-"}</Text>
                      <Text style={[styles.cell, { width: 140 }]}>{item.patient_contact_no || "-"}</Text>

                      {/* Patient Actions */}
                      <Text style={[styles.cell, { width: 120 }]}>
                        <Text style={styles.linkText} onPress={() => openPatientModal(item)}>
                          View Details
                        </Text>
                      </Text>

                      {/* Pharmacy Actions */}
                      <Text style={[styles.cell, { width: 120 }]}>
                        <Text style={[styles.linkText, { color: COLORS.success }]} onPress={() => openPharmacyModal(item)}>
                          {item.pharmacy?.pharmacy_name ? "View Pharmacy" : "View"}
                        </Text>
                      </Text>

                      <Text style={[styles.cell, { width: 80, fontWeight: '700' }]}>
                        {item.order_items?.length || 0}
                      </Text>

                      {/* Action Cell */}
                      <View style={{ width: 80, alignItems: 'center' }}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => openViewModal(item)}
                        >
                          <Feather name="eye" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}

              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* VIEW ORDER ITEMS MODAL OVERLAY */}
      <Modal visible={viewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: containerWidth }]}>
            <View style={styles.modalHeaderTitle}>
              <Text style={styles.modalTitle}>Order Item Ledger</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {viewOrder && (
              <ScrollView style={{ maxHeight: "75%" }} showsVerticalScrollIndicator={false}>
                <View style={styles.viewContainer}>
                  <View style={styles.metaInfoGrid}>
                    <MetaInfoRow label="Order No" value={viewOrder.order_no || "-"} />
                    <MetaInfoRow label="Invoice ID" value={viewOrder.invoice_id || "-"} />
                    <MetaInfoRow label="Payment Status" value={viewOrder.payment_status || "-"} />
                    <MetaInfoRow label="Total Price" value={`₹ ${viewOrder.total_price}`} />
                    <MetaInfoRow label="Patient Delivery" value={viewOrder.patient_address?.deliver_name || viewOrder.patient_address?.address || "-"} />
                    <MetaInfoRow label="Pharmacy Name" value={viewOrder.pharmacy?.pharmacy_name || viewOrder.pharmacy?.address || "-"} />
                  </View>

                  <Text style={[styles.viewLabel, { marginTop: 16 }]}>Order Items List</Text>

                  {viewOrder.order_items?.length ? (
                    <View style={styles.itemsTableWrapper}>
                      <View style={[styles.itemsRow, { backgroundColor: COLORS.lightBg }]}>
                        <Text style={[styles.itemCell, { flex: 2, fontWeight: '800' }]}>Name</Text>
                        <Text style={[styles.itemCell, { flex: 1, fontWeight: '800' }]}>Qty</Text>
                        <Text style={[styles.itemCell, { flex: 1, fontWeight: '800' }]}>Price</Text>
                        <Text style={[styles.itemCell, { flex: 1, fontWeight: '800' }]}>Subtotal</Text>
                      </View>
                      {viewOrder.order_items.map((itm, idx) => (
                        <View key={idx} style={styles.itemsRow}>
                          <Text style={[styles.itemCell, { flex: 2, fontWeight: '600' }]} numberOfLines={1}>{itm.medicine_name}</Text>
                          <Text style={[styles.itemCell, { flex: 1 }]}>{itm.quantity}</Text>
                          <Text style={[styles.itemCell, { flex: 1 }]}>₹{itm.selling_price}</Text>
                          <Text style={[styles.itemCell, { flex: 1, fontWeight: '700', color: COLORS.primary }]}>₹{itm.sub_total}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.viewValue}>No items linked to this record.</Text>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setViewModalVisible(false)}
              >
                <Text style={styles.btnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PATIENT DETAILS MODAL OVERLAY */}
      <Modal visible={patientModalVisible} transparent animationType="fade">
        <View style={styles.bigModalOverlay}>
          <View style={styles.bigModalBox}>
            <View style={styles.bigModalHeader}>
              <Text style={styles.bigModalTitle}>Patient Profile Details</Text>
              <TouchableOpacity onPress={() => setPatientModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.bigCard}>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>Name</Text><Text style={styles.bigValue}>{viewOrder?.patient_name || "-"}</Text></View>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>Address</Text><Text style={styles.bigValue}>{viewOrder?.patient_address?.address || "-"}</Text></View>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>Locality</Text><Text style={styles.bigValue}>{viewOrder?.patient_address?.locality || "-"}</Text></View>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>Landmark</Text><Text style={styles.bigValue}>{viewOrder?.patient_address?.landmark || "-"}</Text></View>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>City</Text><Text style={styles.bigValue}>{viewOrder?.patient_address?.city || "-"}</Text></View>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>State</Text><Text style={styles.bigValue}>{viewOrder?.patient_address?.state || "-"}</Text></View>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>Country</Text><Text style={styles.bigValue}>{viewOrder?.patient_address?.country || "-"}</Text></View>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>Pincode</Text><Text style={styles.bigValue}>{viewOrder?.patient_address?.pincode || "-"}</Text></View>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>Type</Text><Text style={styles.bigValue}>{viewOrder?.patient_address?.type || "-"}</Text></View>
              </View>
            </ScrollView>

            <View style={styles.modalFooterPlain}>
              <TouchableOpacity
                style={styles.bigCloseBtn}
                onPress={() => setPatientModalVisible(false)}
              >
                <Text style={styles.bigCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PHARMACY DETAILS MODAL OVERLAY */}
      <Modal visible={pharmacyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.bigModalHeader}>
              <Text style={styles.bigModalTitle}>Pharmacy Registry Details</Text>
              <TouchableOpacity onPress={() => setPharmacyModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.bigCard}>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>Name</Text><Text style={styles.bigValue}>{viewOrder?.pharmacy?.pharmacy_name || "-"}</Text></View>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>Address</Text><Text style={styles.bigValue}>{viewOrder?.pharmacy?.address || "-"}</Text></View>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>Locality</Text><Text style={styles.bigValue}>{viewOrder?.pharmacy?.locality || "-"}</Text></View>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>City</Text><Text style={styles.bigValue}>{viewOrder?.pharmacy?.city || "-"}</Text></View>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>State</Text><Text style={styles.bigValue}>{viewOrder?.pharmacy?.state || "-"}</Text></View>
                <View style={styles.bigRow}><Text style={styles.bigLabel}>Pincode</Text><Text style={styles.bigValue}>{viewOrder?.pharmacy?.pincode || "-"}</Text></View>
              </View>
            </ScrollView>

            <View style={styles.modalFooterPlain}>
              <TouchableOpacity
                style={styles.bigCloseBtn}
                onPress={() => setPharmacyModalVisible(false)}
              >
                <Text style={styles.bigCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const MetaInfoRow = ({ label, value }) => (
  <View style={styles.metaRow}>
    <Text style={styles.metaLabel}>{label}</Text>
    <Text style={styles.metaValue}>{value}</Text>
  </View>
);

const webDateFilterStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: `1.5px solid ${COLORS.border}`,
  backgroundColor: '#FFFFFF',
  fontSize: '13px',
  outlineWidth: 0,
  color: COLORS.text,
  fontFamily: 'inherit'
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    backgroundColor: COLORS.primary,
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
  mainTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },

  mainContent: { flex: 1 },
  scrollContent: { padding: 20 },

  // Filter Registry styling
  dateFilterCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  dateLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateLabel: { fontSize: 13, fontWeight: "700", color: COLORS.text },

  // Summary Metrics Grid Cards
  summaryGrid: { flexDirection: "row", gap: 12, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiTitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, fontWeight: "700", textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: "850", color: COLORS.text, marginTop: 4 },

  // Search input wrapper
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 46,
  },
  searchInputWeb: { marginLeft: 8, flex: 1, fontSize: 14, color: COLORS.text, ...Platform.select({ web: { outlineWidth: 0 } }) },

  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },

  // Full-width Dynamic Table structure
  tableWrapper: { backgroundColor: COLORS.surface, borderRadius: 16, overflow: "hidden" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: COLORS.primary, paddingVertical: 14 },
  headerCell: { color: "#FFFFFF", fontWeight: "800", fontSize: 12, textAlign: "center", textTransform: 'uppercase' },
  tableRow: { flexDirection: "row", paddingVertical: 14, alignItems: "center", borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowEven: { backgroundColor: "#FFFFFF" },
  rowOdd: { backgroundColor: "#F8FAFC" },
  cell: { fontSize: 13, textAlign: "center", color: COLORS.text, paddingHorizontal: 4, fontWeight: '500' },
  linkText: { color: COLORS.primaryLight, fontWeight: "700", textDecorationLine: "underline" },

  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },

  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  loaderText: { marginTop: 12, color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },

  // Custom Modal setups (Overlays & Headers)
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalBox: { backgroundColor: COLORS.surface, width: "100%", maxWidth: 640, borderRadius: 16, padding: 18, maxHeight: "85%" },
  modalHeaderTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1.5, borderBottomColor: COLORS.border, paddingBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },
  viewContainer: { marginBottom: 10 },
  viewLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: "800", textTransform: "uppercase", marginTop: 10, marginBottom: 8 },
  viewValue: { fontSize: 15, color: COLORS.text, marginBottom: 5 },

  metaInfoGrid: { gap: 10, backgroundColor: COLORS.lightBg, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  metaLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  metaValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },

  // Items table inside the Modal view
  itemsTableWrapper: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden', marginTop: 8 },
  itemsRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  itemCell: { fontSize: 13, color: COLORS.text, textAlign: "center" },

  modalFooter: { borderTopWidth: 1.5, borderTopColor: COLORS.border, paddingTop: 14, alignItems: "flex-end" },
  modalFooterPlain: { paddingVertical: 14, alignItems: 'stretch' },
  cancelModalBtn: { backgroundColor: COLORS.danger, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  btnText: { color: "#FFFFFF", fontWeight: "750", fontSize: 13 },

  // Big Modals (for Patient profiles)
  bigModalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  bigModalBox: { width: "100%", maxWidth: 640, height: "85%", backgroundColor: COLORS.surface, borderRadius: 16, padding: 18 },
  bigModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1.5, borderBottomColor: COLORS.border, paddingBottom: 12 },
  bigModalTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },
  bigCard: { backgroundColor: COLORS.lightBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  bigRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  bigLabel: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted },
  bigValue: { fontSize: 13, fontWeight: "600", color: COLORS.text, maxWidth: "60%", textAlign: "right" },
  bigCloseBtn: { backgroundColor: COLORS.danger, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  bigCloseText: { color: "#FFFFFF", fontWeight: "750", fontSize: 14 },

  // Custom Toast Banner
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
  toastTitleError: { fontSize: 14, fontWeight: '700', color: COLORS.danger, marginBottom: 2 },
  toastMessage: { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },
});
