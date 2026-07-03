import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Platform,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Animated
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from 'expo-router';

const API_BASE =
  "https://napi.bharatmedicalhallplus.com/ecogreen/sales-order-status";

const OFFICE_LAT = 21.930424;
const OFFICE_LNG = 86.726709;

const screenWidth = Dimensions.get("window").width;

const COLORS = {
  primary: "#004990",     // Solid plain blue [1]
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

const EcogreenSalesOrderList = () => {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [productModalVisible, setProductModalVisible] = useState(false); // Preserve declared state
  const [selectedProducts, setSelectedProducts] = useState([]); // Preserve declared state
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [filterType, setFilterType] = useState("ALL");
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [deliveryBoyFilter, setDeliveryBoyFilter] = useState("all");
  const [mapCoords, setMapCoords] = useState({
    deliveryBoy: { latitude: null, longitude: null },
    client: { latitude: OFFICE_LAT, longitude: OFFICE_LNG },
  });

  const [isFocused, setIsFocused] = useState(false);
  const [toast, setToast] = useState({ visible: false, title: "", message: "", type: "success" });
  const slideAnim = useRef(new Animated.Value(400)).current;

  const [leafletComponents, setLeafletComponents] = useState(null);
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    fetchOrders();
    fetchDeliveryBoys();
  }, []);

  useEffect(() => {
    if (isWeb) import("leaflet/dist/leaflet.css");
    async function loadLeaflet() {
      if (isWeb) {
        try {
          const leafletModule = await import("react-leaflet");
          const L = await import("leaflet");
          delete L.Icon.Default.prototype._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
            iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
          });
          setLeafletComponents({
            MapContainer: leafletModule.MapContainer,
            TileLayer: leafletModule.TileLayer,
            Marker: leafletModule.Marker,
            Popup: leafletModule.Popup,
            Polyline: leafletModule.Polyline,
          });
        } catch (err) { console.error("Leaflet error:", err); }
      }
    }
    loadLeaflet();
  }, []);

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

  const openInvoiceModal = (invoices) => {
    setSelectedInvoices(invoices || []);
    setInvoiceModalVisible(true);
  };

  const fetchDeliveryBoys = async () => {
    try {
      const res = await fetch("https://napi.bharatmedicalhallplus.com/employee/all");
      const json = await res.json();
      const hdDeliveryBoys = (json.employees || []).filter((emp) => emp.role === "Hd delivery");
      setDeliveryBoys(hdDeliveryBoys);
    } catch (err) { console.log("Error fetching delivery boys:", err); }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/all`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) { console.error("Fetch Orders Error:", error); } finally { setLoading(false); }
  };

  const getDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  };

  const isDaily = (date) => {
    const d = getDate(date);
    if (!d) return false;
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const isWeekly = (date) => {
    const d = getDate(date);
    if (!d) return false;
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - (day === 0 ? 6 : day - 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return d >= startOfWeek && d <= endOfWeek;
  };

  const isMonthly = (date) => {
    const d = getDate(date);
    if (!d) return false;
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const filteredOrders = orders
    .filter((order) => {
      const keyword = search.toLowerCase();
      return order.order_id?.includes(search) || order.cust_code?.toLowerCase()?.includes(keyword) || order.doctor_name?.toLowerCase()?.includes(keyword);
    })
    .filter((order) => {
      if (filterType === "ALL") return true;
      const date = order.completed_at;
      if (filterType === "DAILY") return isDaily(date);
      if (filterType === "WEEKLY") return isWeekly(date);
      if (filterType === "MONTHLY") return isMonthly(date);
      return true;
    })
    .filter((order) => {
      if (deliveryBoyFilter === "all") return true;
      const orderBoyId = order.delivery_boy?.toString() || order.delivery_boy_id?.toString();
      return orderBoyId === deliveryBoyFilter;
    });

  const getRevenue = () => {
    let total = 0;
    filteredOrders.forEach((order) => { order.invoices?.forEach((inv) => { total += parseFloat(inv.docTotal || 0); }); });
    return total.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };

  const totalOrders = filteredOrders.length;

  const openMapModal = (deliveryLat, deliveryLng, clientLat = OFFICE_LAT, clientLng = OFFICE_LNG) => {
    setMapCoords({
      deliveryBoy: { latitude: parseFloat(deliveryLat), longitude: parseFloat(deliveryLng) },
      client: { latitude: parseFloat(clientLat), longitude: parseFloat(clientLng) },
    });
    setMapModalVisible(true);
  };

  const renderRow = (item, index) => {
    const isDelivered = item.status === "Delivered";

    return (
      <View key={item.id?.toString() || index.toString()} style={[styles.tableBodyRow, index % 2 === 1 && { backgroundColor: '#F8FAFC' }]}>
        <Text style={[styles.bodyCell, { width: 60, color: COLORS.textMuted }]}>{index + 1}</Text>
        <Text style={[styles.bodyCell, { width: 120, fontWeight: "800", color: COLORS.text }]}>{item.order_id}</Text>
        <Text style={[styles.bodyCell, { width: 120, fontWeight: "600" }]}>{item.cust_code}</Text>
        <Text style={[styles.bodyCell, { width: 100 }]}>{item.customer_type}</Text>
        <Text style={[styles.bodyCell, { width: 150 }]} numberOfLines={1}>{item.doctor_name || "-"}</Text>
        <Text style={[styles.bodyCell, { width: 150 }]} numberOfLines={1}>{item.assigned_by_name || "-"}</Text>
        <Text style={[styles.bodyCell, { width: 150 }]} numberOfLines={1}>{item.delivery_boy_name || "-"}</Text>

        <View style={{ width: 120, alignItems: 'flex-start' }}>
          <View style={[styles.statusBadge, isDelivered ? styles.bgSuccess : styles.bgWarning]}>
            <Text style={[styles.statusText, isDelivered ? styles.textSuccess : styles.textWarning]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={{ width: 140 }}>
          {item.latitude != null ? (
            <TouchableOpacity style={styles.actionBtn} onPress={() => openMapModal(item.latitude, item.longitude, item.client_latitude, item.client_longitude)}>
              <Feather name="map-pin" size={14} color={COLORS.primary} />
              <Text style={styles.actionBtnText}>Map View</Text>
            </TouchableOpacity>
          ) : <Text style={styles.dashText}>—</Text>}
        </View>

        <View style={{ width: 120, alignItems: 'flex-start' }}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openInvoiceModal(item.invoices)}>
            <Feather name="file-text" size={14} color={COLORS.primary} />
            <Text style={styles.actionBtnText}>Invoices</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const MapViewComponent = () => {
    if (!leafletComponents) return <ActivityIndicator color={COLORS.primary} />;
    const { MapContainer, TileLayer, Marker, Popup, Polyline } = leafletComponents;
    const centerLat = (mapCoords.deliveryBoy.latitude + mapCoords.client.latitude) / 2;
    const centerLng = (mapCoords.deliveryBoy.longitude + mapCoords.client.longitude) / 2;
    return (
      <MapContainer center={[centerLat, centerLng]} zoom={13} style={{ height: "100%", width: "100%", borderRadius: 12 }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[mapCoords.deliveryBoy.latitude, mapCoords.deliveryBoy.longitude]}><Popup>Delivery Boy</Popup></Marker>
        <Marker position={[mapCoords.client.latitude, mapCoords.client.longitude]}><Popup>Client Location</Popup></Marker>
        <Polyline positions={[[mapCoords.deliveryBoy.latitude, mapCoords.deliveryBoy.longitude], [mapCoords.client.latitude, mapCoords.client.longitude]]} color={COLORS.primary} weight={3} dashArray="5, 10" />
      </MapContainer>
    );
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
      <View style={styles.headerArea}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.mainTitle}>Sales Orders List</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* SEARCH & DELIVERY FILTER CARD */}
          <View style={[styles.card, shadow, { marginBottom: 16 }]}>
            <Text style={styles.cardTitle}>Filter Orders Registry</Text>

            <View style={styles.searchContainer}>
              <View style={[styles.searchBox, isFocused && { borderColor: COLORS.primaryLight }]}>
                <Feather name="search" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search Order ID, Customer, Doctor..."
                  placeholderTextColor={COLORS.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  autoComplete="off"
                />
              </View>

              <View style={styles.agentSelect}>
                {Platform.OS === "web" ? (
                  <select value={deliveryBoyFilter} onChange={(e) => setDeliveryBoyFilter(e.target.value)} style={styles.webSelect}>
                    <option value="all">All Delivery Agents</option>
                    {deliveryBoys.map((boy) => <option key={boy.id} value={boy.id.toString()}>{boy.full_name}</option>)}
                  </select>
                ) : (
                  <Picker selectedValue={deliveryBoyFilter} onValueChange={(val) => setDeliveryBoyFilter(val)} style={{ height: 40 }}>
                    <Picker.Item label="All Agents" value="all" />
                    {deliveryBoys.map((boy) => <Picker.Item key={boy.id} label={boy.full_name} value={boy.id.toString()} />)}
                  </Picker>
                )}
              </View>
            </View>
          </View>

          {/* SUMMARY GRID CARDS */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, shadow, { borderLeftColor: COLORS.primary }]}>
              <View style={styles.statIconBox}><Feather name="shopping-bag" size={18} color={COLORS.primary} /></View>
              <View>
                <Text style={styles.statVal}>{totalOrders}</Text>
                <Text style={styles.statLab}>Total Orders</Text>
              </View>
            </View>

            <View style={[styles.statCard, shadow, { borderLeftColor: COLORS.success }]}>
              <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}><Feather name="trending-up" size={18} color={COLORS.success} /></View>
              <View>
                <Text style={styles.statVal}>₹{getRevenue()}</Text>
                <Text style={styles.statLab}>Revenue</Text>
              </View>
            </View>
          </View>

          {/* FILTER TIMEFRAME CHIPS */}
          <View style={styles.filterRow}>
            {["ALL", "DAILY", "WEEKLY", "MONTHLY"].map((type) => (
              <TouchableOpacity key={type} onPress={() => setFilterType(type)} style={[styles.filterChip, filterType === type && styles.activeChip]}>
                <Text style={[styles.filterText, filterType === type && styles.activeFilterText]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* DATA SCROLLABLE TABLE CONTAINER */}
          <View style={[styles.card, shadow, { padding: 0, overflow: 'hidden' }]}>
            {loading ? (
              <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                  <View style={styles.tableHeaderRow}>
                    {[
                      { label: "S.No", width: 60 },
                      { label: "Order ID", width: 120 },
                      { label: "Customer", width: 120 },
                      { label: "Type", width: 100 },
                      { label: "Doctor", width: 150 },
                      { label: "Assigned By", width: 150 },
                      { label: "Delivery Boy", width: 150 },
                      { label: "Status", width: 120 },
                      { label: "Tracking", width: 140 },
                      { label: "Action", width: 120 }
                    ].map((col, idx) => (
                      <Text key={idx} style={[styles.headerCell, { width: col.width }]}>{col.label}</Text>
                    ))}
                  </View>

                  {/* Table Content Rows (Rendered using safe standard map loop to prevent nesting VirtualizedList crashes) [1] */}
                  {filteredOrders.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No registered orders located.</Text>
                    </View>
                  ) : (
                    filteredOrders.map((item, index) => renderRow(item, index))
                  )}
                </View>
              </ScrollView>
            )}
          </View>

        </ScrollView>
      </View>

      {/* Invoices Details Modal */}
      <Modal visible={invoiceModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderTitle}>
              <Text style={styles.modalTitle}>Invoices Detail</Text>
              <TouchableOpacity onPress={() => setInvoiceModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: "75%" }}>
              {selectedInvoices.map((inv, idx) => (
                <View key={idx} style={styles.invoiceItemCard}>
                  <View style={styles.invTop}>
                    <Text style={styles.invNo}>Invoice #{inv.docNo}</Text>
                    <Text style={styles.invDate}>{inv.docDate}</Text>
                  </View>
                  <View style={styles.invDetails}>
                    <View style={[styles.statusBadge, inv.docStatus === "Delivered" ? styles.bgSuccess : styles.bgWarning]}>
                      <Text style={[styles.statusText, inv.docStatus === "Delivered" ? styles.textSuccess : styles.textWarning]}>
                        {inv.docStatus}
                      </Text>
                    </View>
                    <Text style={styles.invTotal}>₹{parseFloat(inv.docTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                  </View>
                  <View style={styles.prodList}>
                    {inv.detail?.map((prod, pIdx) => (
                      <View key={pIdx} style={styles.prodRow}>
                        <Text style={styles.pName}>{prod.productName}</Text>
                        <Text style={styles.pQty}>Qty: {prod.qty}  •  ₹{parseFloat(prod.itemTotal).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setInvoiceModalVisible(false)}>
                <Text style={styles.closeBtnText}>Close Ledger</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Map Dispatch Modal */}
      <Modal visible={mapModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { height: "70%", width: "85%", maxWidth: 900 }]}>
            <View style={styles.modalHeaderTitle}>
              <Text style={styles.modalTitle}>Dispatch Live Tracking</Text>
              <TouchableOpacity onPress={() => setMapModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              {isWeb ? <MapViewComponent /> : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="map-outline" size={32} color={COLORS.textMuted} />
                  <Text style={[styles.emptyText, { marginTop: 10 }]}>Mobile map tracking view not supported.</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  wrapper: { flex: 1 },

  headerArea: {
    backgroundColor: COLORS.primary,     // Solid plain blue background
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
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16, color: COLORS.text },

  // Inputs
  searchContainer: { flexDirection: "row", flexWrap: 'wrap', gap: 12 },
  searchBox: { flex: 2, flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 15, height: 45 },
  searchInput: { marginLeft: 10, flex: 1, fontSize: 14, color: COLORS.text, ...Platform.select({ web: { outlineWidth: 0 } }) },
  agentSelect: { flex: 1, minWidth: 160, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, justifyContent: "center", height: 45 },
  webSelect: { width: "100%", padding: 10, border: "none", outlineWidth: 0, backgroundColor: "transparent", fontSize: 13, fontWeight: "600", color: COLORS.text },

  // KPI Metrics
  statsContainer: { flexDirection: "row", gap: 15, marginBottom: 16 },
  statCard: { flex: 1, flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, gap: 15, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4, backgroundColor: COLORS.surface },
  statIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "850", color: COLORS.text },
  statLab: { fontSize: 12, color: COLORS.textMuted, fontWeight: "700", textTransform: 'uppercase', marginTop: 2 },

  // Segment chips
  filterRow: { flexDirection: "row", marginBottom: 16, gap: 8 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 10, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border },
  activeChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted },
  activeFilterText: { color: "#fff" },

  // Table structures
  tableHeaderRow: { flexDirection: "row", paddingVertical: 14, paddingHorizontal: 16, backgroundColor: COLORS.primary, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerCell: { fontSize: 12, fontWeight: "800", color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 0.5, textAlign: 'left' },
  tableBodyRow: { flexDirection: "row", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", alignItems: "center" },
  bodyCell: { fontSize: 14, fontWeight: "500", color: COLORS.text, textAlign: 'left' },

  statusBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 8, alignSelf: "flex-start" },
  bgSuccess: { backgroundColor: "#DCFCE7" },
  bgWarning: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 11, fontWeight: "800" },
  textSuccess: { color: "#16A34A" },
  textWarning: { color: "#D97706" },

  actionBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: COLORS.border, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, gap: 6, backgroundColor: COLORS.surface },
  actionBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
  dashText: { color: COLORS.textMuted, paddingHorizontal: 12 },

  // Modal styling blocks
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: COLORS.surface, width: "100%", maxWidth: 640, borderRadius: 16, padding: 18, maxHeight: "85%" },
  modalHeaderTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1.5, borderBottomColor: COLORS.border, paddingBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },

  invoiceItemCard: { backgroundColor: COLORS.lightBg, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  invTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  invNo: { fontWeight: "800", fontSize: 14, color: COLORS.text },
  invDate: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  invDetails: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8 },
  invTotal: { fontWeight: "800", color: COLORS.primary, fontSize: 14 },
  prodRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", marginTop: 4 },
  pName: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  pQty: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },

  closeBtn: { height: 42, backgroundColor: COLORS.primary, borderRadius: 10, alignItems: "center", justifyContent: 'center', paddingHorizontal: 20, alignSelf: 'flex-end' },
  closeBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  modalFooter: { borderTopWidth: 1.5, borderTopColor: COLORS.border, paddingTop: 14, alignItems: "stretch" },

  loader: { paddingVertical: 40, justifyContent: "center", alignItems: "center" },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },

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

export default EcogreenSalesOrderList;
