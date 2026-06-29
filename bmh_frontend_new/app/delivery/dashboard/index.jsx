import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
  Platform,
  useWindowDimensions,
  Animated,
  Easing,
} from "react-native";
import { DB_BASE } from "./DeliveryBoyTheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getEmployeeId, clearStorage } from "../utils/storage";
import { useRouter } from 'expo-router';
import * as Location from "expo-location";

const BASE_URL = "https://hospitaldatabasemanagement.onrender.com";

/* =========================================================
   PREMIUM THEME TOKENS
   ========================================================= */
const THEME = {
  bg: "#F4F6FB",
  surface: "#FFFFFF",
  surfaceAlt: "#FAFBFE",
  ink: "#0B1220",
  inkSoft: "#475569",
  muted: "#94A3B8",
  line: "#E6EAF2",
  brand: "#4F46E5",      // indigo
  brand2: "#7C3AED",     // violet
  accent: "#06B6D4",     // cyan
  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  gold: "#F59E0B",
  shadow: "rgba(15, 23, 42, 0.08)",
};

export default function DeliveryBoyDashboard() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const [employeeId, setEmployeeId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);
  const [collections, setCollections] = useState({ total_cash: 0, total_digital: 0 });
  const [location, setLocation] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Set default opacity to 1 on Web to prevent contrast/visibility issues
  const fadeAnim = useRef(new Animated.Value(Platform.OS === "web" ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const isAvailableRef = useRef(isAvailable);

  useEffect(() => {
    isAvailableRef.current = isAvailable;
  }, [isAvailable]);

  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isDesktop = SCREEN_WIDTH > 900;
  const router = useRouter();

  /* ====================== Mount Animation ====================== */
  useEffect(() => {
    if (Platform.OS !== "web") {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  /* ====================== Drawer ====================== */
  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };
  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start(() => setDrawerOpen(false));
  };
  const navigateAndClose = (screen, params = {}) => {
    closeDrawer();
    router.push(screen, params);
  };

  /* ====================== Alert ====================== */
  const showAlert = (title, message, buttons) => {
    if (Platform.OS === "web") {
      if (buttons && buttons.length > 1) {
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed) {
          const okBtn = buttons.find((b) => b.style !== "cancel");
          okBtn?.onPress?.();
        }
      } else {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  /* ====================== Loading Counter ====================== */
  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingCount(0);
      interval = setInterval(() => setLoadingCount((c) => c + 1), 1000);
    } else clearInterval(interval);
    return () => clearInterval(interval);
  }, [loading]);

  /* ====================== Get Employee ID ====================== */
  useEffect(() => {
    (async () => {
      const id = await getEmployeeId();
      if (id) setEmployeeId(id);
      else showAlert("Error", "No delivery boy ID found");
    })();
  }, []);

  useEffect(() => {
    if (employeeId) {
      fetchAvailability(employeeId);
      fetchAssignedOrders(employeeId);
      fetchCollections(employeeId);
    }
  }, [employeeId]);

  /* ====================== Live Location ====================== */
  useEffect(() => {
    if (!employeeId) return;
    let subscription;
    let watchId;
    let active = true;

    const startWatchingLocation = async () => {
      if (Platform.OS === "web") {
        if (navigator.geolocation) {
          watchId = navigator.geolocation.watchPosition(
            async (pos) => {
              if (!active) return;
              const { latitude, longitude } = pos.coords;
              setLocation({ latitude, longitude });
              await sendLocation(latitude, longitude, isAvailable);
            },
            (err) => console.error("Web geolocation error:", err),
            { enableHighAccuracy: true, maximumAge: 5000 }
          );
        }
      } else {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") return;
          if (!active) return;
          subscription = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Highest, timeInterval: 5000, distanceInterval: 5 },
            async (pos) => {
              if (!active) return;
              const { latitude, longitude } = pos.coords;
              setLocation({ latitude, longitude });
              await sendLocation(latitude, longitude, isAvailable);
            }
          );
        } catch (err) {
          console.error("Native location error:", err);
        }
      }
    };

    startWatchingLocation();

    return () => {
      active = false;
      if (Platform.OS === "web" && watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (subscription) {
        subscription.remove();
      }
    };
  }, [employeeId, isAvailable]);

  const sendLocation = async (lat, lng, status) => {
    if (!employeeId || lat == null || lng == null) return;
    try {
      await fetch(`${BASE_URL}/deliveryboy/update-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryBoyId: employeeId,
          latitude: Number(lat),
          longitude: Number(lng),
          status: status ? "available" : "unavailable",
        }),
      });
    } catch (err) {
      console.error("Error sending location:", err);
    }
  };

  const fetchAvailability = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/deliveryboy/availability/${id}`);
      const data = await res.json();
      if (res.ok) setIsAvailable(data.available);
    } catch (error) {
      console.error(error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      if (Platform.OS === "web") {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject("Geolocation not supported");
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: true }
          );
        });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") throw new Error("Location permission not granted");
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      }
    } catch (err) {
      console.error("Failed to get location:", err);
      return null;
    }
  };

  const toggleAvailability = async () => {
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    try {
      await fetch(`${BASE_URL}/deliveryboy/update-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: employeeId, available: newStatus }),
      });
      const currentLocation = await getCurrentLocation();
      if (currentLocation) {
        setLocation(currentLocation);
        await sendLocation(currentLocation.latitude, currentLocation.longitude, newStatus);
      }
    } catch (err) {
      console.error("Availability update failed", err);
      setIsAvailable(!newStatus);
    }
  };

  const fetchCollections = async (deliveryBoyId) => {
    try {
      const date = new Date().toISOString().split("T")[0];
      const res = await fetch(`${BASE_URL}/deliveryboy/${deliveryBoyId}/collections?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setCollections({
          total_cash: data.total_cash || 0,
          total_digital: data.total_digital || 0,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSalesAssignedOrders = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/salesorders/by-deliveryboy/${id}`);
      const data = await res.json();
      if (res.ok && data.success) return Array.isArray(data.orders) ? data.orders : [];
      return [];
    } catch (err) {
      return [];
    }
  };

  const fetchInvoiceOrders = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/ecogreen/sales-invoice/by-delivery-boy/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const list = data.orders || data.data || [];
        return Array.isArray(list) ? list : [];
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  const fetchAssignedOrders = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/deliveryboy/${id}`);
      const rawNormalOrders = await res.json();
      const normalOrders = Array.isArray(rawNormalOrders) ? rawNormalOrders : [];
      const salesOrders = await fetchSalesAssignedOrders(id);
      const invoiceOrders = await fetchInvoiceOrders(id);
      const merged = [...normalOrders, ...salesOrders, ...invoiceOrders];
      setOrders(merged);
      setFilteredOrders(merged);
    } catch (error) {
      console.error(error);
      showAlert("Error", "Unable to fetch assigned deliveries.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchText(text);
    const query = text.toLowerCase();
    const filtered = orders.filter((order) => {
      const name = String(order?.address?.name || "").toLowerCase();
      const city = String(order?.address?.city || "").toLowerCase();
      const phone = String(order?.address?.mobile || "");
      return name.includes(query) || city.includes(query) || phone.includes(query);
    });
    setFilteredOrders(filtered);
  };

  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === "Delivered").length;
  const cancelledOrders = orders.filter((o) => o.status === "Cancelled").length;
  const pendingOrders = totalOrders - deliveredOrders - cancelledOrders;
  const totalCollection = Number(collections.total_cash) + Number(collections.total_digital);
  const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <LinearGradient
          colors={[THEME.brand, THEME.brand2]}
          style={styles.loaderPulse}
        >
          <ActivityIndicator size="large" color="#fff" />
        </LinearGradient>
        <Text style={styles.loaderText}>Syncing deliveries</Text>
        <Text style={styles.loaderSub}>{loadingCount}s</Text>
      </View>
    );
  }

  /* ====================== Sidebar Navigation Items ====================== */
  const navItems = [
    { icon: "grid", label: "Dashboard", active: true },
    { icon: "log-in-outline", label: "Attendance Login", screen: "DeliveryBoyAttendanceScreen" },
    { icon: "log-out-outline", label: "Attendance Logout", screen: "DeliveryBoyOffDutyScreen" },
    { icon: "cube-outline", label: "Orders", screen: "DeliverBoyOrders" },
    { icon: "bus-outline", label: "Bus Delivery", screen: "BusDeliveryScreen", params: { orderId: null } },
    { icon: "wallet-outline", label: "Payments", screen: "CashHandOverScreen", params: { deliveryBoyId: employeeId } },
    { icon: "person-outline", label: "Profile", screen: "DeliverBoyProfileScreen", params: { deliveryBoyId: employeeId } },
  ];

  /* Helper function to avoid defining nested React component definitions */
  const renderSidebar = () => (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <LinearGradient
          colors={[THEME.brand, THEME.brand2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sidebarLogo}
        >
          <Ionicons name="bicycle" size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.sidebarBrand}>Bharat Medical</Text>
          <Text style={styles.sidebarTag}>Delivery Partner</Text>
        </View>
      </View>

      {/* Middle Scrollable Section */}
      <View style={styles.sidebarContent}>
        <Text style={styles.sidebarSection}>MENU</Text>
        <ScrollView
          style={styles.sidebarScroll}
          contentContainerStyle={styles.sidebarScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {navItems.map((item, idx) => {
            const isActive = item.active;
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                style={isActive ? styles.sidebarItemActive : styles.sidebarItem}
                onPress={() => item.screen && navigateAndClose(item.screen, item.params || {})}
              >
                <View style={isActive ? styles.navIconActive : styles.navIcon}>
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={isActive ? "#fff" : THEME.inkSoft}
                  />
                </View>
                <Text style={isActive ? styles.sidebarTextActive : styles.sidebarText}>
                  {item.label}
                </Text>
                {isActive && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sidebarFooter}>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: isAvailable ? THEME.success : THEME.muted }]} />
          <Text style={styles.statusPillText}>{isAvailable ? "On Duty" : "Off Duty"}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            await clearStorage();
            navigation.reset({ index: 0, routes: [{ name: "SelectRole" }] });
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={THEME.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, DB_BASE?.page]}>
      <View style={styles.mainContainer}>
        {isDesktop ? (
          renderSidebar()
        ) : (
          drawerOpen && (
            <View style={styles.mobileOverlay}>
              <TouchableOpacity activeOpacity={1} style={styles.overlayBg} onPress={closeDrawer} />
              <Animated.View style={[styles.mobileDrawer, { transform: [{ translateX: slideAnim }] }]}>
                {renderSidebar()}
              </Animated.View>
            </View>
          )
        )}

        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.mainWrapper, isDesktop && styles.desktopWrapper, { opacity: fadeAnim }]}>
            {/* HEADER */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                {!isDesktop && (
                  <TouchableOpacity onPress={openDrawer} style={styles.hamburgerBtn}>
                    <Ionicons name="menu" size={24} color={THEME.ink} />
                  </TouchableOpacity>
                )}
                <View>
                  <Text style={styles.greeting}>Good day,</Text>
                  <Text style={styles.header}>Delivery Partner</Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                <View style={styles.toggleRow}>
                  <View style={[styles.liveDot, { backgroundColor: isAvailable ? THEME.success : THEME.muted }]} />
                  <Text style={styles.toggleLabel}>{isAvailable ? "Available" : "Offline"}</Text>
                  <Switch
                    value={isAvailable}
                    onValueChange={toggleAvailability}
                    trackColor={{ false: "#CBD5E1", true: "#A7F3D0" }}
                    thumbColor={isAvailable ? THEME.success : "#94A3B8"}
                    ios_backgroundColor="#CBD5E1"
                  />
                </View>
                <TouchableOpacity onPress={() => fetchAssignedOrders(employeeId)} style={styles.refreshBtn}>
                  <Ionicons name="refresh" size={18} color={THEME.brand} />
                </TouchableOpacity>
              </View>
            </View>

            {/* HERO COLLECTION CARD */}
            <LinearGradient
              colors={[THEME.brand, THEME.brand2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroGlow1} />
              <View style={styles.heroGlow2} />
              <View style={styles.heroContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroLabel}>TODAY'S COLLECTION</Text>
                  <Text style={styles.heroAmount}>₹{totalCollection.toLocaleString("en-IN")}</Text>
                  <View style={styles.heroSplit}>
                    <View style={styles.heroSplitItem}>
                      <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.85)" />
                      <Text style={styles.heroSplitText}>
                        Cash ₹{Number(collections.total_cash).toLocaleString("en-IN")}
                      </Text>
                    </View>
                    <View style={styles.heroDivider} />
                    <View style={styles.heroSplitItem}>
                      <Ionicons name="phone-portrait-outline" size={14} color="rgba(255,255,255,0.85)" />
                      <Text style={styles.heroSplitText}>
                        Digital ₹{Number(collections.total_digital).toLocaleString("en-IN")}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.heroProgressWrap}>
                  <View style={styles.ring}>
                    <Text style={styles.ringValue}>{deliveryRate}%</Text>
                    <Text style={styles.ringLabel}>delivered</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* SUMMARY CARDS */}
            <View style={styles.summaryContainer}>
              <SummaryCard title="Total" value={totalOrders} color={THEME.brand} icon="cube" isDesktop={isDesktop} />
              <SummaryCard title="Delivered" value={deliveredOrders} color={THEME.success} icon="checkmark-circle" isDesktop={isDesktop} />
              <SummaryCard title="Pending" value={pendingOrders} color={THEME.warn} icon="time" isDesktop={isDesktop} />
              <SummaryCard title="Cancelled" value={cancelledOrders} color={THEME.danger} icon="close-circle" isDesktop={isDesktop} />
            </View>

            {/* SEARCH */}
            <View style={[styles.searchContainer]}>
              <Ionicons name="search" size={18} color={THEME.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, city, or phone…"
                value={searchText}
                onChangeText={handleSearch}
                placeholderTextColor={THEME.muted}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch("")}>
                  <Ionicons name="close-circle" size={18} color={THEME.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* QUICK ACTIONS */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={isDesktop ? styles.actionGridDesktop : styles.actionGridMobile}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.actionPrimary}
                onPress={() => router.push("DeliverBoyOrders")}
              >
                <LinearGradient
                  colors={[THEME.brand, THEME.brand2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionPrimaryGrad}
                >
                  <View style={styles.actionIconWrap}>
                    <Ionicons name="rocket" size={22} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionPrimaryTitle}>Start Delivery</Text>
                    <Text style={styles.actionPrimarySub}>View assigned orders</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <ActionTile
                icon="bus"
                title="Bus Delivery"
                sub="Inter-city dispatch"
                color={THEME.accent}
                onPress={() => router.push("BusDeliveryScreen", { orderId: null })}
              />
              <ActionTile
                icon="wallet"
                title="Payment Settlement"
                sub="Hand over collections"
                color={THEME.gold}
                onPress={() => router.push("CashHandOverScreen", { deliveryBoyId: employeeId })}
              />
              <ActionTile
                icon="person"
                title="My Profile"
                sub="Account & details"
                color={THEME.brand2}
                onPress={() => router.push("DeliverBoyProfileScreen", { deliveryBoyId: employeeId })}
              />
            </View>

            {/* LIVE LOCATION STRIP */}
            <View style={styles.locationStrip}>
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={16} color={THEME.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationTitle}>Live Location</Text>
                <Text style={styles.locationSub}>
                  {location
                    ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                    : "Waiting for GPS signal…"}
                </Text>
              </View>
              <View style={[styles.pingDot, { backgroundColor: location ? THEME.success : THEME.muted }]} />
            </View>

            <View style={{ height: 24 }} />
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ====================== Sub-components ====================== */
const SummaryCard = ({ title, value, color, icon, isDesktop }) => (
  <View style={[styles.summaryCard, isDesktop ? { flexBasis: "23.5%" } : { flexBasis: "48%" }]}>
    <View style={[styles.summaryIcon, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryTitle}>{title}</Text>
    <View style={[styles.summaryBar, { backgroundColor: color + "20" }]}>
      <View style={[styles.summaryBarFill, { backgroundColor: color, width: "70%" }]} />
    </View>
  </View>
);

const ActionTile = ({ icon, title, sub, color, onPress }) => (
  <TouchableOpacity activeOpacity={0.85} style={styles.actionTile} onPress={onPress}>
    <View style={[styles.actionTileIcon, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.actionTileTitle}>{title}</Text>
      <Text style={styles.actionTileSub}>{sub}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={THEME.muted} />
  </TouchableOpacity>
);

/* ====================== Styles ====================== */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  mainContainer: { flex: 1, flexDirection: "row" },
  contentScroll: { flex: 1 },
  scrollContent: { padding: 20 },
  mainWrapper: { width: "100%", maxWidth: 1200, alignSelf: "center" },
  desktopWrapper: { paddingHorizontal: 12 },

  // LOADER
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: THEME.bg },
  loaderPulse: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center" },
  loaderText: { marginTop: 18, fontSize: 15, fontWeight: "700", color: THEME.ink },
  loaderSub: { marginTop: 4, fontSize: 12, color: THEME.muted },

  // SIDEBAR
  sidebar: {
    width: 270,
    backgroundColor: THEME.surface,
    borderRightWidth: 1,
    borderRightColor: THEME.line,
    paddingHorizontal: 18,
    paddingVertical: 24,
    height: "100%",
    flexDirection: "column",
  },
  sidebarHeader: { marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 12 },
  sidebarLogo: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
    shadowColor: THEME.brand, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  sidebarBrand: { fontSize: 16, fontWeight: "800", color: THEME.ink, letterSpacing: 0.2 },
  sidebarTag: { color: THEME.muted, marginTop: 2, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },
  sidebarContent: { flex: 1, flexDirection: "column" },
  sidebarSection: { fontSize: 10, fontWeight: "700", color: THEME.muted, letterSpacing: 1.2, marginBottom: 12, paddingHorizontal: 8 },
  sidebarScroll: { flex: 1 },
  sidebarScrollContent: { paddingBottom: 20 },
  sidebarItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 11, paddingHorizontal: 10,
    borderRadius: 12, marginBottom: 4,
  },
  sidebarItemActive: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 11, paddingHorizontal: 10,
    borderRadius: 12, marginBottom: 4,
    backgroundColor: THEME.brand + "10",
  },
  navIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: THEME.surfaceAlt,
    justifyContent: "center", alignItems: "center",
  },
  navIconActive: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: THEME.brand,
    justifyContent: "center", alignItems: "center",
    shadowColor: THEME.brand, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  sidebarText: { marginLeft: 12, color: THEME.inkSoft, fontWeight: "600", fontSize: 14, flex: 1 },
  sidebarTextActive: { marginLeft: 12, color: THEME.brand, fontWeight: "700", fontSize: 14, flex: 1 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.brand },
  sidebarFooter: { borderTopWidth: 1, borderTopColor: THEME.line, paddingTop: 16, gap: 10 },
  statusPill: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: THEME.surfaceAlt, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: "600", color: THEME.inkSoft },
  logoutBtn: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10 },
  logoutText: { marginLeft: 10, color: THEME.danger, fontWeight: "700", fontSize: 14 },

  // MOBILE DRAWER
  hamburgerBtn: {
    marginRight: 12, padding: 10,
    backgroundColor: THEME.surface, borderRadius: 12,
    borderWidth: 1, borderColor: THEME.line,
  },
  mobileOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999, flexDirection: "row",
  },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(11,18,32,0.5)" },
  mobileDrawer: {
    width: 280, backgroundColor: THEME.surface, height: "100%",
    elevation: 16, position: "absolute", left: 0, top: 0, bottom: 0,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 4, height: 0 },
  },

  // HEADER
  headerRow: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "space-between", alignItems: "center",
    marginBottom: 22, gap: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  greeting: { fontSize: 12, color: THEME.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  header: { fontSize: 24, fontWeight: "800", color: THEME.ink, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: THEME.surface, paddingLeft: 12, paddingRight: 6, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1, borderColor: THEME.line, gap: 8,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  toggleLabel: { fontSize: 13, fontWeight: "700", color: THEME.inkSoft },
  refreshBtn: {
    padding: 11, backgroundColor: THEME.surface, borderRadius: 12,
    borderWidth: 1, borderColor: THEME.line,
  },

  // HERO
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 22,
    overflow: "hidden",
    position: "relative",
    backgroundColor: THEME.brand, // Solid fallback color for web render engines
    shadowColor: THEME.brand,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  heroGlow1: {
    position: "absolute", top: -60, right: -40, width: 200, height: 200,
    borderRadius: 100, backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroGlow2: {
    position: "absolute", bottom: -80, left: -30, width: 180, height: 180,
    borderRadius: 90, backgroundColor: "rgba(255,255,255,0.06)",
  },
  heroContent: { flexDirection: "row", alignItems: "center", zIndex: 1 },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  heroAmount: { color: "#fff", fontSize: 36, fontWeight: "900", marginTop: 6, letterSpacing: -1 },
  heroSplit: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 12, flexWrap: "wrap" },
  heroSplitItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroSplitText: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600" },
  heroDivider: { width: 1, height: 14, backgroundColor: "rgba(255,255,255,0.3)" },
  heroProgressWrap: { marginLeft: 16 },
  ring: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 4, borderColor: "rgba(255,255,255,0.4)",
    justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  ringValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  ringLabel: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },

  // SUMMARY
  summaryContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 22, gap: 0 },
  summaryCard: {
    backgroundColor: THEME.surface, borderRadius: 18, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: THEME.line,
    shadowColor: THEME.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  summaryIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  summaryValue: { color: THEME.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  summaryTitle: { color: THEME.muted, fontSize: 12, fontWeight: "600", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.6 },
  summaryBar: { height: 4, borderRadius: 2, marginTop: 12, overflow: "hidden" },
  summaryBarFill: { height: "100%", borderRadius: 2 },

  // SEARCH
  searchContainer: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: THEME.surface, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 22, borderWidth: 1, borderColor: THEME.line, gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.ink,
    fontWeight: "500",
    ...Platform.select({
      web: { outlineWidth: 0 },
      default: {},
    }),
  },

  // SECTION
  sectionTitle: { fontSize: 13, fontWeight: "700", color: THEME.inkSoft, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 },

  // QUICK ACTIONS
  actionGridMobile: { gap: 10, marginBottom: 22 },
  actionGridDesktop: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 22 },
  actionPrimary: {
    borderRadius: 18, overflow: "hidden", width: "100%",
    shadowColor: THEME.brand, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  actionPrimaryGrad: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 18, 
    gap: 14,
    backgroundColor: THEME.brand // Solid fallback color for web render engines
  },
  actionIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  actionPrimaryTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  actionPrimarySub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2, fontWeight: "500" },

  actionTile: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: THEME.surface, borderRadius: 16,
    padding: 16, gap: 14,
    borderWidth: 1, borderColor: THEME.line,
    minWidth: 240, flexGrow: 1, flexBasis: "30%",
  },
  actionTileIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  actionTileTitle: { fontSize: 14, fontWeight: "700", color: THEME.ink },
  actionTileSub: { fontSize: 12, color: THEME.muted, marginTop: 2, fontWeight: "500" },

  // LOCATION STRIP
  locationStrip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: THEME.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: THEME.line, gap: 12,
  },
  locationIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: THEME.brand + "15",
    justifyContent: "center", alignItems: "center",
  },
  locationTitle: { fontSize: 13, fontWeight: "700", color: THEME.ink },
  locationSub: { fontSize: 11, color: THEME.muted, marginTop: 2, fontWeight: "500" },
  pingDot: { width: 10, height: 10, borderRadius: 5 },
});