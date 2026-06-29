import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  SafeAreaView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from 'expo-router';
const API_BASE = "https://hospitaldatabasemanagement.onrender.com/ecogreen";

const PurchaseOrderListScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [orderDelivery, setOrderDelivery] = useState({});
  const [search, setSearch] = useState("");
  const [trackModal, setTrackModal] = useState(false);
  const [liveLocation, setLiveLocation] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [LeafletComponents, setLeafletComponents] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryBoyFilter, setDeliveryBoyFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
const [date, setDate] = useState(new Date());
const [showDatePicker, setShowDatePicker] = useState(false);
  const intervalRef = useRef(null);
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
const router = useRouter();
  const [clientLocation, setClientLocation] = useState({
    latitude: 21.930424,
    longitude: 86.726709,
  });

  const toISTDate = (isoString) => {
  if (!isoString) return null;

  const d = new Date(isoString);
  return d.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  }); // YYYY-MM-DD
};

  // ------------------ DYNAMIC IMPORT LEAFLET ------------------
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
        } catch (err) {
          console.error("Leaflet load error:", err);
        }
      }
    }
    loadLeaflet();
  }, []);

  // ------------------ FETCH DATA ------------------
  useEffect(() => {
    fetchOrders();
    fetchDeliveryBoys();
    return () => clearInterval(intervalRef.current);
  }, []);

  const fetchDeliveryBoys = async () => {
    try {
      const res = await fetch(`https://hospitaldatabasemanagement.onrender.com/employee/all`);
      const json = await res.json();
      const hdDeliveryBoys = (json.employees || []).filter((emp) => emp.role === "Hd delivery");
      setDeliveryBoys(hdDeliveryBoys);
    } catch (err) {
      console.log("Error fetching delivery boys:", err);
    }
  };

  const getDateOnly = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const isInRange = (date, type) => {
    const now = new Date();
    const d = getDateOnly(date);
    if (!d) return false;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (type === "daily") return d.getTime() === today.getTime();
    if (type === "weekly") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return d >= weekStart && d <= today;
    }
    if (type === "monthly") {
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }
    return true;
  };

 const filteredForStats = orders.filter((o) => {
  const orderDate = toISTDate(o.createdatetime);

  if (selectedDate) return orderDate === selectedDate;

  if (filterType !== "all") {
    if (!o.createdatetime) return false;
    return isInRange(o.createdatetime, filterType);
  }

  return true;
});

const totalPO = filteredForStats.length;

const totalAmount = filteredForStats.reduce(
  (sum, o) => sum + (parseFloat(o.total) || 0),
  0
);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/ecogreenpurchase_orders`);
      const json = await res.json();
      setOrders(json.data || []);
    } catch (err) {
      console.log("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const assignDeliveryBoy = async (orderId, deliveryBoyId) => {
    if (!deliveryBoyId) return;
    try {
      const res = await fetch(`${API_BASE}/assign_delivery_boy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, delivery_boy: deliveryBoyId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Delivery boy assigned successfully!");
        setOrderDelivery((prev) => ({ ...prev, [orderId]: deliveryBoyId }));
        fetchOrders();
      } else {
        alert("Failed to assign delivery boy: " + data.message);
      }
    } catch (err) {
      console.error("Error assigning delivery boy:", err);
    }
  };

  const fetchLiveLocation = async (deliveryBoyId) => {
    try {
      const res = await fetch(`${API_BASE}/delivery_boy_location/${deliveryBoyId}`);
      const json = await res.json();
      if (json.success) {
        setLiveLocation({
          latitude: parseFloat(json.data.latitude),
          longitude: parseFloat(json.data.longitude),
        });
      }
    } catch (err) {
      console.error("Location error:", err);
    }
  };

  const openTracking = (order) => {
    clearInterval(intervalRef.current);
    const deliveryBoyId = order.delivery_boy || orderDelivery[order.id];
    if (!deliveryBoyId) return alert("No delivery boy assigned");

    setTrackingOrder(order);
    setTrackModal(true);
    fetchLiveLocation(deliveryBoyId);
    intervalRef.current = setInterval(() => fetchLiveLocation(deliveryBoyId), 5000);
  };

  const closeTracking = () => {
    clearInterval(intervalRef.current);
    setTrackModal(false);
    setLiveLocation(null);
    setTrackingOrder(null);
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const getDeliveryBoyName = (order) => {
    const id = order.delivery_boy || orderDelivery[order.id];
    const boy = deliveryBoys.find((b) => b.id.toString() === id?.toString());
    return boy?.full_name || "";
  };

const filteredOrders = orders
  .filter((o) => {
    const orderDate = toISTDate(o.createdatetime);

    // ✅ DATE FILTER (highest priority)
    if (selectedDate) {
      return orderDate === selectedDate;
    }

    // ✅ RANGE FILTER (only when no date selected)
    if (filterType !== "all") {
      if (!o.createdatetime) return false;
      return isInRange(o.createdatetime, filterType);
    }

    return true;
  })
  .filter((o) => {
    const keyword = search.toLowerCase();

    const cust = o.custname?.toLowerCase() || "";
    const prefix = o.prefix?.toLowerCase() || "";
    const srno = o.srno?.toString() || "";
    const deliveryBoyName = getDeliveryBoyName(o).toLowerCase();

    const matchesSearch =
      cust.includes(keyword) ||
      prefix.includes(keyword) ||
      srno.includes(keyword) ||
      deliveryBoyName.includes(keyword);

    const matchesDeliveryBoy =
      deliveryBoyFilter === "all" ||
      o.delivery_boy?.toString() === deliveryBoyFilter;

    return matchesSearch && matchesDeliveryBoy;
  });
  const renderOrderRow = ({ item, index }) => (
    <View style={styles.tableBodyRow}>
      <Text style={[styles.bodyCell, { width: 60, color: COLORS.textMuted }]}>{index + 1}</Text>
      <Text style={[styles.bodyCell, { width: 180, fontWeight: "600", color: COLORS.text }]}>
        {item.custname}
      </Text>
      <Text style={[styles.bodyCell, { width: 140, fontWeight: '500' }]}>
        {item.srno}
      </Text>
      <Text style={[styles.bodyCell, { width: 100, color: COLORS.success, fontWeight: '700' }]}>{`₹ ${item.total}`}</Text>
      <Text style={[styles.bodyCell, { width: 140 }]}>
        {new Date(item.createdatetime).toLocaleDateString()}
      </Text>
      <Text style={[styles.bodyCell, { width: 140, fontWeight: "500" }]}>
        {item.createuser}
      </Text>
      <Text style={[styles.bodyCell, { width: 140, fontWeight: "500" }]}>
        {item.modifieduser}
      </Text>

      <View style={[styles.bodyCell, { width: 140 }]}>
        {isWeb ? (
          <select
            style={webSelectStyle}
            value={(orderDelivery[item.id] || item.delivery_boy || "").toString()}
            onChange={(e) => {
              const selectedBoy = e.target.value;
              setOrderDelivery(prev => ({ ...prev, [item.id]: selectedBoy }));
              assignDeliveryBoy(item.id, selectedBoy);
            }}
          >
            <option value="">Select</option>
            {deliveryBoys.map(boy => (
              <option key={boy.id} value={boy.id.toString()}>{boy.full_name}</option>
            ))}
          </select>
        ) : (
          <Text style={styles.readOnlyText}>{deliveryBoys.find(b => b.id === item.delivery_boy)?.full_name || "Not assigned"}</Text>
        )}
      </View>

      <View style={[styles.actionCell, { width: 120 }]}>
        <TouchableOpacity
          style={[styles.iconCircle, { backgroundColor: "#ecfdf5" }]}
          onPress={() => openTracking(item)}
        >
          <Feather name="map-pin" size={16} color={COLORS.success} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.bodyCell, { width: 160, color: COLORS.textMuted }]}>
        {item.assigned_by_name || "—"}
      </Text>

      <View style={[styles.actionCell, { width: 100 }]}>
        <TouchableOpacity
          style={[styles.iconCircle, { backgroundColor: "#eff6ff" }]}
          onPress={() => openDetails(item)}
        >
          <Feather name="eye" size={16} color={COLORS.primaryLight} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItemRow = ({ item, index }) => (
    <View style={styles.tableBodyRow}>
      <Text style={[styles.bodyCell, { width: 60 }]}>{index + 1}</Text>
      <Text style={[styles.bodyCell, { width: 220, fontWeight: "600", color: COLORS.text }]}>
        {item.itemName}
      </Text>
      <Text style={[styles.bodyCell, { width: 140 }]}>{item.itemCode}</Text>
      <Text style={[styles.bodyCell, { width: 80, fontWeight: '700' }]}>{item.Qty}</Text>
      <Text style={[styles.bodyCell, { width: 100 }]}>{item.schemeQty}</Text>
      <Text style={[styles.bodyCell, { width: 100 }]}>
        {Number(item.rate).toFixed(2)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.mainTitle}>Purchase Orders</Text>
            <Text style={styles.subTitle}>Manage and track your pharmaceutical inventory</Text>
          </View>
        </View>

        <View style={styles.headerRightControls}>
          <View style={styles.datePickerContainer}>
            <Feather name="calendar" size={18} color="#fff" />
            {isWeb ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={webDateInputStyle}
              />
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.datePickerBtn}
                >
                  <Text style={styles.datePickerBtnText}>
                    {selectedDate ? selectedDate : "Select Date"}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={(event, selected) => {
                      setShowDatePicker(false);
                      if (selected) {
                        setDate(selected);
                        setSelectedDate(selected.toISOString().split("T")[0]);
                      }
                    }}
                  />
                )}
              </>
            )}
          </View>

          <View style={styles.searchBox}>
            <Feather name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search orders..."
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.filterWrapper}>
            <View style={styles.filterRow}>
              {["all", "daily", "weekly", "monthly"].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setFilterType(type)}
                  style={[styles.filterBtn, filterType === type && styles.filterBtnActive]}
                >
                  <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
              
              <View style={styles.pickerContainer}>
                {isWeb ? (
                  <select
                    value={deliveryBoyFilter}
                    onChange={(e) => setDeliveryBoyFilter(e.target.value)}
                    style={webSelectStyleSmall}
                  >
                    <option value="all">All Delivery Boys</option>
                    {deliveryBoys.map((boy) => (
                      <option key={boy.id} value={boy.id.toString()}>
                        {boy.full_name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={[styles.card, shadow, { borderLeftColor: COLORS.primaryLight, borderLeftWidth: 4 }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Total Orders</Text>
                  <Feather name="shopping-bag" size={16} color={COLORS.primaryLight} />
                </View>
                <Text style={styles.cardValue}>{totalPO}</Text>
              </View>

              <View style={[styles.card, shadow, { borderLeftColor: COLORS.success, borderLeftWidth: 4 }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Total Revenue</Text>
                  <Feather name="dollar-sign" size={16} color={COLORS.success} />
                </View>
                <Text style={styles.cardValue}>₹ {totalAmount.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loaderText}>Syncing Database...</Text>
            </View>
          ) : (
            <View style={[styles.tableCard, shadow]}>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.headerCell, { width: 60 }]}>S.No</Text>
                    <Text style={[styles.headerCell, { width: 180 }]}>Supplier Name</Text>
                    <Text style={[styles.headerCell, { width: 140 }]}>Order No</Text>
                    <Text style={[styles.headerCell, { width: 100 }]}>Total</Text>
                    <Text style={[styles.headerCell, { width: 140 }]}>Date</Text>
                    <Text style={[styles.headerCell, { width: 140 }]}>CreatedBy</Text>
                    <Text style={[styles.headerCell, { width: 140 }]}>ModifiedBy</Text>
                    <Text style={[styles.headerCell, { width: 140 }]}>Delivery Boy</Text>
                    <Text style={[styles.headerCell, { width: 140 }]}>Track</Text>
                    <Text style={[styles.headerCell, { width: 160 }]}>Assigned By</Text>
                    <Text style={[styles.headerCell, { width: 100, textAlign: "center" }]}>Items</Text>
                  </View>

                  <FlatList
                    data={filteredOrders}
                    renderItem={renderOrderRow}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                  />
                </View>
              </ScrollView>
            </View>
          )}

        </ScrollView>
      </View>

      {/* Items Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 1000 }]}>
            <View style={styles.modalHeader}>
              <View>
                  <Text style={styles.modalTitleText}>Order Manifest</Text>
                  <Text style={styles.modalSubtitle}>{selectedOrder?.custname} • {selectedOrder?.srno}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeIconButton}>
                <Feather name="x" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={[styles.tableCard, { elevation: 0, borderWidth: 1, borderColor: COLORS.border, shadowColor: "transparent" }]}>
                <View style={[styles.tableHeaderRow, { backgroundColor: "#F8FAFC" }]}>
                  <Text style={[styles.headerCell, { width: 60 }]}>S.No</Text>
                  <Text style={[styles.headerCell, { width: 220 }]}>Item Name</Text>
                  <Text style={[styles.headerCell, { width: 140 }]}>Item Code</Text>
                  <Text style={[styles.headerCell, { width: 80 }]}>Qty</Text>
                  <Text style={[styles.headerCell, { width: 100 }]}>Scheme Qty</Text>
                  <Text style={[styles.headerCell, { width: 100 }]}>Rate</Text>
                </View>
                <FlatList
                  data={selectedOrder?.details || []}
                  renderItem={renderItemRow}
                  keyExtractor={(item, index) => index.toString()}
                  scrollEnabled={false}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Tracking Modal */}
      <Modal visible={trackModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { height: SCREEN_HEIGHT - 100, width: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitleText}>Live Transit Map</Text>
              <TouchableOpacity onPress={closeTracking} style={styles.closeIconButton}>
                <Feather name="x" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.mapContainer}>
              {isWeb && LeafletComponents && liveLocation ? (
                <LeafletComponents.MapContainer
                  center={[liveLocation.latitude, liveLocation.longitude]}
                  zoom={13}
                  style={{ height: "100%", width: "100%", borderRadius: 12 }}
                >
                  <LeafletComponents.TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LeafletComponents.Marker position={[clientLocation.latitude, clientLocation.longitude]}>
                    <LeafletComponents.Popup>Destination</LeafletComponents.Popup>
                  </LeafletComponents.Marker>
                  <LeafletComponents.Marker position={[liveLocation.latitude, liveLocation.longitude]}>
                    <LeafletComponents.Popup>Agent</LeafletComponents.Popup>
                  </LeafletComponents.Marker>
                  <LeafletComponents.Polyline
                    positions={[[clientLocation.latitude, clientLocation.longitude], [liveLocation.latitude, liveLocation.longitude]]}
                    pathOptions={{ color: COLORS.primaryLight, weight: 4, dashArray: '10, 10' }}
                  />
                </LeafletComponents.MapContainer>
              ) : (
                <View style={styles.loaderContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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

const webSelectStyle = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: `1px solid ${COLORS.border}`,
  backgroundColor: COLORS.surface,
  fontSize: "13px",
  color: COLORS.text,
  outlineWidth: 0,
  width: "100%"
};

const webSelectStyleSmall = {
  ...webSelectStyle,
  padding: "8px 12px",
  minWidth: "180px",
  borderRadius: "10px",
};

const webDateInputStyle = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "none",
  outlineWidth: 0,
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  color: "#fff",
  fontSize: "14px",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 48,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16
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
  mainTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  subTitle: { color: "rgba(255, 255, 255, 0.8)", fontSize: 13, marginTop: 2 },

  headerRightControls: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  datePickerContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: "rgba(255, 255, 255, 0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  datePickerBtn: { backgroundColor: "rgba(255, 255, 255, 0.2)", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  datePickerBtnText: { color: "#fff", fontSize: 14 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    width: 250,
    height: 44,
  },
  searchInput: { paddingVertical: 10, marginLeft: 10, flex: 1, fontSize: 14, color: COLORS.text, ...Platform.select({ web: { outlineWidth: 0 } }) },

  mainContent: { flex: 1 },
  scrollContent: { padding: 20 },

  filterWrapper: { marginBottom: 24 },
  filterRow: { flexDirection: "row", gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' },
  filterBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontWeight: "600", color: COLORS.textMuted, fontSize: 12 },
  filterTextActive: { color: "#fff" },
  pickerContainer: { marginLeft: 'auto' },

  summaryRow: { flexDirection: "row", gap: 20, flexWrap: 'wrap' },
  card: {
    flex: 1,
    minWidth: 200,
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase' },
  cardValue: { fontSize: 28, fontWeight: "800", color: COLORS.text },

  tableCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCell: { fontSize: 11, fontWeight: "800", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  tableBodyRow: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: "center",
  },
  bodyCell: { fontSize: 14, color: COLORS.text },
  readOnlyText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  actionCell: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", minHeight: 300 },
  loaderText: { marginTop: 16, color: COLORS.textMuted, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalBox: { backgroundColor: COLORS.surface, width: "100%", borderRadius: 24, padding: 32, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
  modalTitleText: { fontSize: 24, fontWeight: "800", color: COLORS.text },
  modalSubtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: 4 },
  closeIconButton: { padding: 8, backgroundColor: COLORS.bg, borderRadius: 12 },
  mapContainer: { flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border }
});

export default PurchaseOrderListScreen;