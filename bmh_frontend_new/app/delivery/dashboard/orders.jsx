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
  Platform,
  useWindowDimensions,
  Modal,
  Linking,
  Dimensions
} from "react-native";
import { DB_BASE } from "./DeliveryBoyTheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getEmployeeId } from "../utils/storage";
import { useRouter } from 'expo-router';
import * as Location from "expo-location";
import CrossPlatformMap from "./CrossPlatformMap";
const BASE_URL = "https://hospitaldatabasemanagement.onrender.com";
const GOOGLE_MAPS_API_KEY = "AIzaSyDqHcDP19qW9nuD5UO5M7f3v8eEUN9c5do";

export default function DeliveryBoyOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const [employeeId, setEmployeeId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("total");
const [mapPoints, setMapPoints] = useState([]);
const [deliveryBoyLocation, setDeliveryBoyLocation] = useState(null);
const [prevLocation, setPrevLocation] = useState(null);
const [selectedOrder, setSelectedOrder] = useState(null);
const [editingBus, setEditingBus] = useState(null);

const [busForm, setBusForm] = useState({
  bus_no: "",
  driver_name: "",
  driver_contact: "",
});
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isDesktop = SCREEN_WIDTH > 768;

  const locationSubscriptionRef = useRef(null);
  const orderIdRef = useRef(null);


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

  // Loading counter for UI
  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingCount(0);
      interval = setInterval(() => setLoadingCount((c) => c + 1), 1000);
    } else clearInterval(interval);
    return () => clearInterval(interval);
  }, [loading]);

  // Get employeeId from storage
  useEffect(() => {
    (async () => {
      const id = await getEmployeeId();
      if (id) setEmployeeId(id);
      else showAlert("Error", "No delivery boy ID found in storage");
    })();
  }, []);

  // Fetch orders when employeeId is available
  useEffect(() => {
    if (employeeId) fetchAssignedOrders(employeeId);
  }, [employeeId]);
const formatInvoiceAddress = (address) => {
  if (!address) return "";

  return address
    .split(",")
    .map(part => part.trim())
    .filter(part => part !== "")
    .join(", ");
};
useEffect(() => {
  if (editingBus?.bus_details) {
    setBusForm({
      bus_no: editingBus.bus_details.bus_no || "",
      driver_name: editingBus.bus_details.driver_name || "",
      driver_contact: editingBus.bus_details.driver_contact || "",
    });
  }
}, [editingBus]);
const geocodeCache = useRef({});

const getOrderAddress = (order) => {
  if (!order) return "";

  if (order.isInvoice) return order.address || "";

  if (order.isSales) return order.address || "";

  if (order.isPurchase) return order.supplier_address || "";

  if (order.isEcoGreen) return order.supplier_address || "";

  if (order.isSalesStatus) return "";

  return order.address
    ? `${order.address.flat || ""}, ${order.address.street || ""}, ${order.address.city || ""}`
    : "";
};



const geocodeAddress = async (address) => {
  if (!address) return null;

  if (geocodeCache.current[address]) {
    return geocodeCache.current[address];
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${GOOGLE_MAPS_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK") {
      const loc = data.results[0].geometry.location;

      const point = {
        lat: loc.lat,
        lng: loc.lng,
      };

      geocodeCache.current[address] = point;
      return point;
    }

    console.warn("Geocoding failed:", data.status);
    return null;
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
};

useEffect(() => {
  if (!employeeId) return;

  const interval = setInterval(async () => {
    try {
      const res = await fetch(
        `${BASE_URL}/deliveryboy/location/live?boyId=${employeeId}`
      );
      const data = await res.json();

      if (data.success && data.location) {
        setDeliveryBoyLocation({
          lat: parseFloat(data.location.latitude),
          lng: parseFloat(data.location.longitude),
        });
      }
    } catch (err) {
      console.log("Live location fetch error:", err);
    }
  }, 5000);

  return () => clearInterval(interval);
}, [employeeId]);
const openNavigation = (lat, lng) => {
  const url = Platform.select({
    ios: `maps://app?daddr=${lat},${lng}`,
    android: `google.navigation:q=${lat},${lng}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  });

  Linking.openURL(url);
};
useEffect(() => {
  const loadMap = async () => {
    if (!filteredOrders.length) return;

    const points = await Promise.all(
      filteredOrders.map(async (o) => {
      const address = getOrderAddress(o);

        const geo = await geocodeAddress(address);

        if (!geo) return null;

        return {
          id: o.id,
          name:
            o.customer_name ||
            o.supplier_name ||
            o.patient_name ||
            "Order",
          address,
          lat: geo.lat,
          lng: geo.lng,
        };
      })
    );

    setMapPoints(points.filter(Boolean));
  };

  loadMap();
}, [filteredOrders]);
  // Fetch Sales Orders
  const fetchSalesAssignedOrders = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/salesorders/by-deliveryboy/${id}`);
      const data = await res.json();
      if (res.ok && data.success) return data.orders.map(o => ({ ...o, isSales: true }));
      return [];
    } catch (err) {
      console.log("Sales Fetch Error:", err);
      return [];
    }
  };

  // Fetch Purchase Orders
const fetchPurchaseAssignedOrders = async (id) => {
  try {
    const res = await fetch(`${BASE_URL}/purchase-orders/by-delivery-boy/${id}`);
    const data = await res.json();
    if (res.ok && data.success) {
      // Map to consistent field names
      return data.data.map(o => ({
        ...o,
        isPurchase: true,
        supplier_name: o.supplier,              // map supplier
        supplier_address: o.address || "",      // if API has address
        supplier_mobile: o.mobile || "",        // if API has mobile
        purchase_items: o.purchase_items.map(i => ({
          ...i,
          quantity: i.stock                       // map stock to quantity for display
        }))
      }));
    }
    return [];
  } catch (err) {
    console.log("Purchase Fetch Error:", err);
    return [];
  }
};

// Fetch EcoGreen Orders
const fetchEcoGreenOrders = async (id) => {
  try {
    const res = await fetch(
      `${BASE_URL}/ecogreen/delivery_boy/ecogreenpurchase_orders?delivery_boy=${id}`
    );

    const data = await res.json();

    if (res.ok && data.success) {
      return data.data.map((order) => {
        // ✅ safe parse for JSON/string/null
        let busDetails = null;

        if (order.bus_details) {
          try {
            busDetails =
              typeof order.bus_details === "string"
                ? JSON.parse(order.bus_details)
                : order.bus_details;
          } catch (e) {
            console.log("Bus details parse error:", e);
            busDetails = null;
          }
        }

        return {
          ...order,
          isEcoGreen: true,

          supplier_name: order.custname,
          supplier_address: "",
          supplier_mobile: "",

          // ✅ normalized bus details
          bus_details: busDetails,

          // (optional) flatten for easier UI usage
          bus_no: busDetails?.bus_no || null,
          driver_name: busDetails?.driver_name || null,
          driver_contact: busDetails?.driver_contact || null,

          purchase_items: (order.details || []).map((item) => ({
            ...item,
            quantity: item.Qty,
            unitPrice: item.rate,
            name: item.itemName,
            itemCode: item.itemCode,
          })),
        };
      });
    }

    return [];
  } catch (err) {
    console.log("EcoGreen Fetch Error:", err);
    return [];
  }
};
const updateBusDetails = async (orderId, busForm) => {
  try {
    const res = await fetch(
      `${BASE_URL}/ecogreen/update-bus-details/${orderId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(busForm),
      }
    );

    // ✅ 1. Parse response FIRST
    const data = await res.json();

    // ✅ 2. Add THIS CHECK RIGHT HERE (important)
    if (!res.ok || !data.success) {
window.alert(data.message || "Update failed");
      return; // ❌ stop here, don't update UI
    }

    // ✅ 3. Only run if backend is successful
    setOrders((prev) =>
      prev.map((o) =>
        String(o.id || o.order_id) === String(orderId)
          ? {
              ...o,
              bus_details: {
                ...(o.bus_details || {}),
                ...busForm,
              },
            }
          : o
      )
    );

    setFilteredOrders((prev) =>
      prev.map((o) =>
        String(o.id || o.order_id) === String(orderId)
          ? {
              ...o,
              bus_details: {
                ...(o.bus_details || {}),
                ...busForm,
              },
            }
          : o
      )
    );
  } catch (err) {
    console.log("Bus update error:", err);
    Alert.alert("Error", "Network error");
  }
};
// Fetch EcoGreen Sales Order Status Orders
const fetchSalesOrderStatus = async (id) => {
  try {
    const res = await fetch(`${BASE_URL}/ecogreen/delivery-boy/${id}`);
    const data = await res.json();

    if (res.ok && data.success) {
      return data.orders.map((order) => ({
        id: order.order_id,          // keep string
        ...order,
        isSalesStatus: true,
        status: order.status || "Pending",
        supplier_name: "Sales Order",
        purchase_items: order.product_names
          ? order.product_names.split(",").map((name) => ({
              name: name.trim(),
              quantity: 1,
            }))
          : [],
        total: Number(order.total_amount) || 0, // convert amount to number
      }));
    }

    return [];
  } catch (err) {
    console.log("Sales Status Fetch Error:", err);
    return [];
  }
};
// Update fetchAssignedOrders to include EcoGreen
const fetchAssignedOrders = async (id) => {
  setLoading(true);
  try {
    const res = await fetch(`${BASE_URL}/deliveryboy/${id}`);
    const normalOrders = await res.json();

    const salesOrders = await fetchSalesAssignedOrders(id);
    const purchaseOrders = await fetchPurchaseAssignedOrders(id);
    const ecoGreenOrders = await fetchEcoGreenOrders(id);
    const salesStatusOrders = await fetchSalesOrderStatus(id);
    const invoiceOrders = await fetchInvoiceOrders(id); // ✅ NEW

    const merged = [
      ...normalOrders,
      ...salesOrders,
      ...purchaseOrders,
      ...ecoGreenOrders,
      ...salesStatusOrders,
      ...invoiceOrders, // ✅ ADD HERE
    ];

    setOrders(merged);
    setFilteredOrders(merged);
  } catch (error) {
    console.error(error);
    showAlert("Error", "Unable to fetch assigned deliveries.");
  } finally {
    setLoading(false);
  }
};
const markEcoGreenDelivered = async (orderId) => {
  if (!employeeId) return;

  try {
    // Optimistic UI update
    setOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.id === orderId ? { ...o, status: "Delivered", receivedby: employeeId, delivered_date: new Date() } : o
      )
    );
    setFilteredOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.id === orderId ? { ...o, status: "Delivered", receivedby: employeeId, delivered_date: new Date() } : o
      )
    );

    const res = await fetch(`${BASE_URL}/ecogreen/mark-delivered/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receivedby: employeeId }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      console.log("Failed backend update:", data);
      // Revert UI if failed
      setOrders((prevOrders) =>
        prevOrders.map((o) => (o.id === orderId ? { ...o, status: "Pending", receivedby: null } : o))
      );
      setFilteredOrders((prevOrders) =>
        prevOrders.map((o) => (o.id === orderId ? { ...o, status: "Pending", receivedby: null } : o))
      );
    }
  } catch (err) {
    console.log("Mark EcoGreen delivered error:", err);
    setOrders((prevOrders) =>
      prevOrders.map((o) => (o.id === orderId ? { ...o, status: "Pending", receivedby: null } : o))
    );
    setFilteredOrders((prevOrders) =>
      prevOrders.map((o) => (o.id === orderId ? { ...o, status: "Pending", receivedby: null } : o))
    );
  }
};
const fetchInvoiceOrders = async (id) => {
  try {
    const res = await fetch(
      `${BASE_URL}/ecogreen/sales-invoice/by-delivery-boy/${id}`
    );
    const data = await res.json();

    if (res.ok && data.success) {
      return data.data.map((inv) => ({
        id: inv.id,
        order_id: inv.order_id,
        order_no: inv.order_no,
  invoice_id: inv.invoice_id,

        isInvoice: true,

        status: inv.payment_status || "Pending",

        supplier_name: inv.patient_name, // display name

        total: Number(inv.total_price || 0),

address: inv.patient_address
    ? [
        inv.patient_address.address,
        inv.patient_address.locality,
        inv.patient_address.landmark,
        inv.patient_address.city,
        inv.patient_address.state,
        inv.patient_address.pincode,
        inv.patient_address.country
      ]
        .filter(Boolean)
        .join(", ")
    : "",
        purchase_items: (inv.order_items || []).map((i) => ({
          name: i.medicine_name,
          quantity: i.quantity,
          unitPrice: i.selling_price,
          total: i.sub_total,
        })),
      }));
    }

    return [];
  } catch (err) {
    console.log("Invoice Fetch Error:", err);
    return [];
  }
}; // Search & filter
  const handleSearch = (text) => {
    setSearchText(text);
    const q = text.toLowerCase();
    const filtered = orders.filter((order) => {
      const name = order.isSales
        ? order.customer_name?.toLowerCase()
        : order.isPurchase
        ? order.supplier_name?.toLowerCase()
        : order.address?.name?.toLowerCase();
      const city = order.isSales
        ? order.landmark?.toLowerCase()
        : order.isPurchase
        ? order.supplier_city?.toLowerCase()
        : order.address?.city?.toLowerCase();
      const phone = order.isSales
        ? order.mobile?.toLowerCase()
        : order.isPurchase
        ? order.supplier_mobile?.toLowerCase()
        : order.address?.mobile?.toLowerCase();
      return name?.includes(q) || city?.includes(q) || phone?.includes(q);
    });
    applyFilter(activeFilter, filtered);
  };

  const applyFilter = (filter, orderList = orders) => {
    setActiveFilter(filter);
    const filtered = orderList.filter((o) => {
      const status = o.status?.trim().toLowerCase() || "";
      if (filter === "completed") return status === "delivered";
      if (filter === "pending") return status !== "delivered";
      return true;
    });
    setFilteredOrders(filtered);
  };

  // Location tracking
  const startTrackingLocation = async (orderId) => {
    if (!employeeId) return;
    stopTrackingLocation();
    orderIdRef.current = orderId;

    if (Platform.OS === "web") {
      if (!navigator.geolocation) return;
      locationSubscriptionRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
            setDeliveryBoyLocation({ lat: latitude, lng: longitude }); // 👈 ADD THIS

          try {
            if (!orderIdRef.current) return;
            await fetch(`${BASE_URL}/deliveryboy/order/update-location`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: orderIdRef.current,
                deliveryBoyId: employeeId,
                latitude,
                longitude,
              }),
            });
          } catch (err) {}
        });
      }, 5000);
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 5000, distanceInterval: 5 },
        async (loc) => {
          const { latitude, longitude } = loc.coords;
          try {
            if (!orderIdRef.current) return;
           await fetch(`${BASE_URL}/deliveryboy/order/update-location`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    deliveryBoyId: employeeId,
    latitude,
    longitude,
    status: "moving", // or "online" / "offline" based on your logic
  }),
});
          } catch (err) {}
        }
      );
    }
  };

  const stopTrackingLocation = () => {
    if (Platform.OS === "web") {
      if (locationSubscriptionRef.current) {
        clearInterval(locationSubscriptionRef.current);
        locationSubscriptionRef.current = null;
      }
    } else {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    }
    orderIdRef.current = null;
  };
const markPurchaseDelivered = async (orderId) => {
  if (!employeeId) return;

  try {
    // Optimistic UI update
    setOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.id === orderId ? { ...o, status: "Delivered", receivedby: employeeId, delivered_date: new Date() } : o
      )
    );
    setFilteredOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.id === orderId ? { ...o, status: "Delivered", receivedby: employeeId, delivered_date: new Date() } : o
      )
    );

    const res = await fetch(`${BASE_URL}/purchase-orders/mark-delivered/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receivedby: employeeId }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      console.log("Failed backend update:", data);
      // Revert UI if failed
      setOrders((prevOrders) =>
        prevOrders.map((o) => (o.id === orderId ? { ...o, status: "Pending", receivedby: null } : o))
      );
      setFilteredOrders((prevOrders) =>
        prevOrders.map((o) => (o.id === orderId ? { ...o, status: "Pending", receivedby: null } : o))
      );
    }
  } catch (err) {
    console.log("Mark delivered error:", err);
    setOrders((prevOrders) =>
      prevOrders.map((o) => (o.id === orderId ? { ...o, status: "Pending", receivedby: null } : o))
    );
    setFilteredOrders((prevOrders) =>
      prevOrders.map((o) => (o.id === orderId ? { ...o, status: "Pending", receivedby: null } : o))
    );
  }
};
  const totalCount = orders.length;
  const completedCount = orders.filter((o) => o.status === "Delivered").length;
  const pendingCount = totalCount - completedCount;
  const linePositions = mapPoints.map(p => [p.lat, p.lng]);
// Mark EcoGreen Sales Status Orders as Delivered
// Inside your component
const markSalesStatusDelivered = async (orderId) => {
  if (!orderId) {
    console.error("No orderId provided");
    return;
  }

  try {
    // Optimistic UI update
    setOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.id === orderId ? { ...o, status: "Delivered" } : o
      )
    );
    setFilteredOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.id === orderId ? { ...o, status: "Delivered" } : o
      )
    );

    // Call backend
    const res = await fetch(
      `${BASE_URL}/ecogreen/salesstatus/mark-sales-delivered/${orderId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = await res.json();
    console.log("Backend response:", data);

    if (!res.ok || !data.success) {
      // Revert UI if update failed
      console.error("Failed to mark delivered:", data.message || data);
      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o.id === orderId ? { ...o, status: "Pending" } : o
        )
      );
      setFilteredOrders((prevOrders) =>
        prevOrders.map((o) =>
          o.id === orderId ? { ...o, status: "Pending" } : o
        )
      );
    }
  } catch (error) {
    console.error("Error marking delivered:", error);

    // Revert UI on error
    setOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.id === orderId ? { ...o, status: "Pending" } : o
      )
    );
    setFilteredOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.id === orderId ? { ...o, status: "Pending" } : o
      )
    );
  }
};
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ marginTop: 10, color: "#64748b" }}>
          Fetching Orders {loadingCount}s
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, DB_BASE.page]}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Logistics</Text>
        <TouchableOpacity onPress={() => fetchAssignedOrders(employeeId)} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.mainWrapper, isDesktop && styles.desktopContainer]}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Filter by customer, city, or phone..."
              value={searchText}
              onChangeText={handleSearch}
              placeholderTextColor="#94a3b8"
            />
          </View>
{mapPoints.length > 0 ? (
  <CrossPlatformMap
    mapPoints={mapPoints}
    deliveryBoyLocation={deliveryBoyLocation}
    onMarkerPress={(p) => {
      setSelectedOrder?.(p);
      openNavigation(p.lat, p.lng);
    }}
    linePositions={linePositions}
  />
) : null}
          <View style={styles.filterRow}>
            {[
              { id: "total", label: "All Orders", count: totalCount, icon: "list", color: "#0ea5e9" },
              { id: "pending", label: "In Progress", count: pendingCount, icon: "time", color: "#f59e0b" },
              { id: "completed", label: "Delivered", count: completedCount, icon: "checkmark-circle", color: "#10b981" },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.filterCard,
                  activeFilter === item.id && { borderColor: item.color, borderBottomWidth: 3 },
                ]}
                onPress={() => applyFilter(item.id)}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={activeFilter === item.id ? item.color : "#94a3b8"}
                />
                <Text style={[styles.filterLabel, activeFilter === item.id && { color: item.color }]}>
                  {item.label}
                </Text>
                <View style={[styles.badge, { backgroundColor: item.color }]}>
                  <Text style={styles.badgeText}>{item.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.gridWrapper}>
            {filteredOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={60} color="#cbd5e1" />
                <Text style={styles.noOrders}>No orders found for this selection.</Text>
              </View>
            ) : (
              filteredOrders.map((order, index) => {
                const total = order.isSales
                  ? order.items?.reduce((sum, item) => sum + item.total, 0)
                  : order.isPurchase
                  ? order.purchase_items?.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
                  : order.total;

                const key = order.id
                  ? `${order.isSales ? "sales" : order.isPurchase ? "purchase" : "normal"}-${order.id}`
                  : `order-${index}`;

                return (
                  <View key={key} style={[styles.card, isDesktop && styles.desktopCard]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.customerInfo}>
                      <Text style={styles.customerName} numberOfLines={1}>
  {order.isInvoice
    ? order.patient_name || order.supplier_name
    : order.isEcoGreen
    ? order.supplier_name
    : order.isSales
    ? order.customer_name
    : order.supplier_name}
</Text>
                       <Text style={styles.orderTypeTag}>
  {order.isInvoice
    ? "Invoice"
    : order.isSales
    ? "Sales Rep"
    : order.isPurchase
    ? "Purchase"
    : "Direct"}
</Text>
                      </View>

                
                      <Text style={styles.textPrice}>₹{total}</Text>
                    </View>
{order.isInvoice && (
  <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
    Invoice ID: {order.invoice_id}
  </Text>
)}
                     {order.isEcoGreen && order.bus_details && (
  <View style={styles.busCard}>
    
    <View style={styles.busHeader}>
      <Ionicons name="bus-outline" size={18} color="#0ea5e9" />
      <Text style={styles.busTitle}>BUS DETAILS</Text>
    </View>

    <View style={styles.busRow}>
      <Text style={styles.busLabel}>Bus No</Text>
      <Text style={styles.busValue}>
        {order.bus_details.bus_no || "N/A"}
      </Text>
    </View>

    <View style={styles.busRow}>
      <Text style={styles.busLabel}>Driver</Text>
      <Text style={styles.busValue}>
        {order.bus_details.driver_name || "N/A"}
      </Text>
    </View>

    <View style={styles.busRow}>
      <Text style={styles.busLabel}>Contact</Text>
      <Text style={styles.busValue}>
        {order.bus_details.driver_contact || "N/A"}
      </Text>
    </View>
<TouchableOpacity
  style={{
    marginTop: 10,
    backgroundColor: "#0ea5e9",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  }}
  onPress={() => setEditingBus(order)}
>
  <Text style={{ color: "white", fontWeight: "bold" }}>
    Edit Bus Details
  </Text>
</TouchableOpacity>
  </View>
  
)}
{!order.isPurchase && !order.isSalesStatus && !order.isEcoGreen && (
  <View style={styles.addressBox}>
  <View style={styles.infoRow}>
    <Ionicons name="location-sharp" size={16} color="#0ea5e9" />
    <Text style={styles.addressText}>
      {getOrderAddress(order) || "No address available"}
    </Text>
  </View>

  {!order.isInvoice && (
    <View style={styles.infoRow}>
      <Ionicons name="call" size={14} color="#64748b" />
      <Text style={styles.phoneText}>
        {order.isSales
          ? order.mobile
          : order.isPurchase
          ? order.supplier_mobile
          : order.address?.mobile}
      </Text>
    </View>
  )}
</View>
)}



                <View style={styles.itemsBox}>
  <Text style={styles.itemsTitle}>ORDER SUMMARY</Text>

  {(order.isInvoice
  ? order.purchase_items
  : order.isSalesStatus
  ? order.purchase_items
  : order.isEcoGreen
  ? order.purchase_items
  : order.isSales
  ? order.items
  : order.order_summary // <-- use order_summary for normal orders
  )?.map((item, idx) => (
    <Text key={idx} style={styles.itemText} numberOfLines={1}>
      • {order.isSales || order.isEcoGreen ? item.item_name || item.name : item.name}{" "}
      <Text style={{ color: "#c7cfda" }}>(x{item.quantity})</Text>
    </Text>
  ))}
</View>
                    <Text style={styles.customerName} numberOfLines={1}>
  {order.isEcoGreen ? order.supplier_name : order.isSales ? order.customer_name : order.supplier_name}
</Text>

{/* <View style={styles.itemsBox}>
  <Text style={styles.itemsTitle}>ORDER SUMMARY</Text>
  {(order.isEcoGreen ? order.purchase_items : order.isSales ? order.items : order.purchase_items)?.map(
    (item, idx) => (
      <Text key={idx} style={styles.itemText} numberOfLines={1}>
        • {item.name} <Text style={{ color: "#94a3b8" }}>(x{item.quantity})</Text>
      </Text>
    )
  )}
</View> */}

                    <View style={styles.cardFooter}>
                      <View
                        style={[
                          styles.statusBadge,
                          order.status === "Delivered"
                            ? styles.bgDelivered
                            : order.status === "Cancelled"
                            ? styles.bgCancelled
                            : styles.bgPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            order.status === "Delivered"
                              ? styles.txtDelivered
                              : order.status === "Cancelled"
                              ? styles.txtCancelled
                              : styles.txtPending,
                          ]}
                        >
                          {order.status}
                        </Text>
                      </View>
                    </View>
{/* Hide Deliver & Bus buttons for Purchase Orders */}
{/* Action Buttons Logic */}
<View style={styles.buttonRow}>
  {(!order.isPurchase && !order.isSalesStatus && !order.isEcoGreen ) ? (
    <>
      {/* Standard Delivery Buttons */}
      <TouchableOpacity
        style={styles.btnPrimary}
        onPress={async () => {
router.push("IndividualOrderScreen", {
  orderId: order.id,                     // always internal DB order id
  invoiceId:order.invoice_id,  // ONLY for invoice
  orderNo: order.order_no,

  orderType: order.isInvoice
    ? "invoice"
    : order.isSales
    ? "sales"
    : order.isEcoGreen
    ? "ecogreen"
    : "normal",

  deliveryBoyId: employeeId,
  deliveryType: "local",

  orderDetails: {
    ...order,
    type: order.isInvoice ? "invoice" : "normal",
  },
});
          await startTrackingLocation(order.id);
        }}
      >
        <Ionicons name="navigate-outline" size={18} color="white" style={{ marginRight: 8 }} />
        <Text style={styles.btnText}>Deliver</Text>
      </TouchableOpacity>

      {/* <TouchableOpacity
        style={styles.btnSecondary}
        onPress={() =>
          router.push("BusDeliveryScreen", {
            orderId: order.id,
            deliveryType: "bus",
            orderType: order.isSales ? "sales" : "normal",
          })
        }
      >
        <Ionicons name="bus-outline" size={18} color="#475569" style={{ marginRight: 8 }} />
        <Text style={styles.btnTextSecondary}>Bus</Text>
      </TouchableOpacity> */}
    </>
  ) : (
    /* Integrated Mark Delivered Button for specific order types */
    order.status !== "Delivered" && (
      <TouchableOpacity
        style={styles.markDeliveredBtn}
        onPress={() => {
          if (order.isEcoGreen) markEcoGreenDelivered(order.id);
          else if (order.isPurchase) markPurchaseDelivered(order.id);
          else markSalesStatusDelivered(String(order.id));
        }}
      >
        <Ionicons name="checkmark-done-outline" size={20} color="white" style={{ marginRight: 8 }} />
        <Text style={styles.btnText}>Mark Delivered</Text>
      </TouchableOpacity>
    )
  )}
</View>


{/* {order.isPurchase && order.isSalesStatus && order.status !== "Delivered" && (
  <TouchableOpacity
    style={{
      flex: 1,
      backgroundColor: "#10b981",
      paddingVertical: 12,
      borderRadius: 10,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    }}
    onPress={() => markPurchaseDelivered(order.id)}
  >
    <Ionicons
      name="checkmark-done-outline"
      size={18}
      color="white"
      style={{ marginRight: 5 }}
    />
    <Text style={{ color: "white", fontWeight: "bold", fontSize: 14 }}>
      Mark Delivered
    </Text>
  </TouchableOpacity>

)}

{order.isEcoGreen && order.status !== "Delivered" && (
  <TouchableOpacity
    style={{
      flex: 1,
      backgroundColor: "#10b981",
      paddingVertical: 12,
      borderRadius: 10,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    }}
    onPress={() => markEcoGreenDelivered(order.id)}
  >
    <Ionicons
      name="checkmark-done-outline"
      size={18}
      color="white"
      style={{ marginRight: 5 }}
    />
    <Text style={{ color: "white", fontWeight: "bold", fontSize: 14 }}>
      Mark Delivered
    </Text>
  </TouchableOpacity>
  
)} */}

{/* {order.isInvoice && order.status !== "Delivered" && (
  <TouchableOpacity
    style={{
      flex: 1,
      backgroundColor: "#10b981",
      paddingVertical: 12,
      borderRadius: 10,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    }}
onPress={() => markSalesStatusDelivered(String(order.id))}  >
    <Ionicons
      name="checkmark-done-outline"
      size={18}
      color="white"
      style={{ marginRight: 5 }}
    />
    <Text style={{ color: "white", fontWeight: "bold", fontSize: 14 }}>
      Mark Delivered
    </Text>
  </TouchableOpacity>
)} */}


{/* 
{order.isSalesStatus && order.status !== "Delivered" && (
  <TouchableOpacity
    style={{
      flex: 1,
      backgroundColor: "#10b981",
      paddingVertical: 12,
      borderRadius: 10,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    }}
onPress={() => markSalesStatusDelivered(String(order.id))}  >
    <Ionicons
      name="checkmark-done-outline"
      size={18}
      color="white"
      style={{ marginRight: 5 }}
    />
    <Text style={{ color: "white", fontWeight: "bold", fontSize: 14 }}>
      Mark Delivered
    </Text>
  </TouchableOpacity>
)} */}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    <Modal
  visible={!!editingBus}
  transparent
  animationType="fade"
  onRequestClose={() => setEditingBus(null)}
>
  <View
    style={{
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    }}
  >
    <View
      style={{
        width: "100%",
        maxWidth: 500,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: "#0f172a",
          }}
        >
          Edit Bus Details
        </Text>

        <TouchableOpacity onPress={() => setEditingBus(null)}>
          <Ionicons name="close" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Bus Number */}
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: "#475569",
          marginBottom: 6,
        }}
      >
        Bus Number
      </Text>

      <TextInput
        value={busForm.bus_no}
        onChangeText={(text) =>
          setBusForm({ ...busForm, bus_no: text })
        }
        placeholder="Enter Bus Number"
        style={{
          borderWidth: 1,
          borderColor: "#cbd5e1",
          borderRadius: 10,
          padding: 12,
          marginBottom: 15,
        }}
      />

      {/* Driver Name */}
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: "#475569",
          marginBottom: 6,
        }}
      >
        Driver Name
      </Text>

      <TextInput
        value={busForm.driver_name}
        onChangeText={(text) =>
          setBusForm({ ...busForm, driver_name: text })
        }
        placeholder="Enter Driver Name"
        style={{
          borderWidth: 1,
          borderColor: "#cbd5e1",
          borderRadius: 10,
          padding: 12,
          marginBottom: 15,
        }}
      />

      {/* Driver Contact */}
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: "#475569",
          marginBottom: 6,
        }}
      >
        Driver Contact
      </Text>

      <TextInput
        value={busForm.driver_contact}
        onChangeText={(text) =>
          setBusForm({ ...busForm, driver_contact: text })
        }
        placeholder="Enter Driver Contact"
        keyboardType="phone-pad"
        style={{
          borderWidth: 1,
          borderColor: "#cbd5e1",
          borderRadius: 10,
          padding: 12,
          marginBottom: 25,
        }}
      />

      {/* Buttons */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => setEditingBus(null)}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 10,
            backgroundColor: "#f1f5f9",
          }}
        >
          <Text
            style={{
              color: "#475569",
              fontWeight: "600",
            }}
          >
            Cancel
          </Text>
        </TouchableOpacity>

       <TouchableOpacity
 onPress={async () => {
  const orderId = editingBus?.id || editingBus?.order_id;

  console.log("Updating bus for ID:", orderId);

  if (!orderId) {
    console.log("❌ No order ID found");
    return;
  }

  await updateBusDetails(orderId, busForm);
  setEditingBus(null);
}}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 10,
            backgroundColor: "#10b981",
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontWeight: "700",
            }}
          >
            Save Changes
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  backBtn: { padding: 5 },
  refreshBtn: { padding: 5, backgroundColor: '#f1f5f9', borderRadius: 8 },
  scrollContent: { padding: 20 },
  mainWrapper: { width: "100%" },
  desktopContainer: { maxWidth: 1200, alignSelf: "center" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  searchInput: { flex: 1, fontSize: 15, marginLeft: 10, color: '#1e293b',outlineStyle: "none" },

  filterRow: { flexDirection: "row", justifyContent: 'space-between', marginBottom: 25, backgroundColor: '#fff', padding: 10, borderRadius: 12 },
  filterCard: { flex: 1, alignItems: "center", paddingVertical: 10, flexDirection: 'row', justifyContent: 'center' },
  filterLabel: { fontSize: 13, fontWeight: "600", color: "#64748b", marginHorizontal: 6 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  gridWrapper: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 10,
    width: Platform.OS === 'web' ? 'calc(100% - 20px)' : Dimensions.get("window").width - 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  desktopCard: { width: "calc(33.33% - 20px)" },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 17, fontWeight: 'bold', color: '#1e293b' },
  orderTypeTag: { fontSize: 10, color: '#0ea5e9', fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 },
  textPrice: { fontSize: 18, fontWeight: '800', color: '#0f172a' },

  addressBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  addressText: { flex: 1, fontSize: 13, color: '#475569', marginLeft: 8 },
  phoneText: { fontSize: 13, color: '#64748b', marginLeft: 8, fontWeight: '500' },

  itemsBox: { marginBottom: 15 },
  itemsTitle: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', letterSpacing: 1, marginBottom: 8 },
  itemText: { fontSize: 13, color: '#334155', marginBottom: 4 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  bgDelivered: { backgroundColor: '#dcfce7' },
  txtDelivered: { color: '#15803d' },
  bgPending: { backgroundColor: '#fef3c7' },
  txtPending: { color: '#b45309' },
  bgCancelled: { backgroundColor: '#fee2e2' },
  txtCancelled: { color: '#b91c1c' },

  buttonRow: { flexDirection: "row", gap: 10 },
  btnPrimary: { flex: 2, backgroundColor: "#0ea5e9", paddingVertical: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnSecondary: { flex: 1, backgroundColor: "#f1f5f9", paddingVertical: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  btnTextSecondary: { color: "#475569", fontWeight: "bold", fontSize: 14 },

  emptyState: { width: '100%', alignItems: 'center', paddingVertical: 60 },
  noOrders: { color: "#94a3b8", marginTop: 15, fontSize: 15, fontWeight: '500' },
  // Add or update these specific styles
markDeliveredBtn: {
  flex: 1,
  backgroundColor: "#10b981", // Emerald Green
  paddingVertical: 14,
  borderRadius: 12,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#10b981",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 5,
  elevation: 3, // For Android depth
},
buttonRow: { 
  flexDirection: "row", 
  gap: 10, 
  marginTop: 10,
  width: '100%' 
},
btnPrimary: { 
  flex: 2, 
  backgroundColor: "#0ea5e9", 
  paddingVertical: 12, 
  borderRadius: 12, 
  flexDirection: 'row', 
  justifyContent: 'center', 
  alignItems: 'center' 
},
btnSecondary: { 
  flex: 1, 
  backgroundColor: "#f1f5f9", 
  paddingVertical: 12, 
  borderRadius: 12, 
  flexDirection: 'row', 
  justifyContent: 'center', 
  alignItems: 'center' 
},
busCard: {
  backgroundColor: "#ecfeff",
  borderWidth: 1,
  borderColor: "#bae6fd",
  borderRadius: 14,
  padding: 14,
  marginBottom: 15,
},

busHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
},

busTitle: {
  fontSize: 12,
  fontWeight: "800",
  color: "#0ea5e9",
  marginLeft: 6,
  letterSpacing: 1,
},

busRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 6,
  borderBottomWidth: 1,
  borderBottomColor: "#dbeafe",
},

busLabel: {
  fontSize: 13,
  color: "#64748b",
  fontWeight: "500",
},

busValue: {
  fontSize: 13,
  color: "#0f172a",
  fontWeight: "700",
},
});