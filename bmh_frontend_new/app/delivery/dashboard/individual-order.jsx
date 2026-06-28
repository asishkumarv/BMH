import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  useWindowDimensions,
  Modal,
  TextInput
} from "react-native";
import { DB_BASE } from "./DeliveryBoyTheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";

import DeliveryMap from "./DeliveryMap"; // import the map component

const BASE_URL = "https://hospitaldatabasemanagement.onrender.com";
const GOOGLE_MAPS_API_KEY = "AIzaSyDqHcDP19qW9nuD5UO5M7f3v8eEUN9c5do";

export default function IndividualOrderScreen({ navigation }) {
  const route = useRoute();
const { 
  orderId, 
  // order_id,   //  ADD THIS
  deliveryType, 
  orderType,
  deliveryBoyId, 
  orderNo ,
  invoiceId,   // ADD THIS

} = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingCount, setLoadingCount] = useState(0);

  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [customerCoords, setCustomerCoords] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
const [otpModalVisible, setOtpModalVisible] = useState(false);
const [otpInput, setOtpInput] = useState("");
const customer =
  orderType === "sales"
    ? order
    : orderType === "invoice"
    ? {
        name: order?.patient_name,
        mobile: order?.patient_contact_no,
        address: order?.patient_address?.address,
      }
    : order?.address;
      const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isDesktop = SCREEN_WIDTH > 800;

  const showAlert = (title, message, buttons) => {
    if (Platform.OS === "web") {
      if (buttons && buttons.length > 1) {
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed) {
          const okBtn = buttons.find(b => b.style !== "cancel");
          okBtn?.onPress?.();
        }
      } else {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

const getCustomerAddressString = (order) => {
  if (!order) return "";

  if (orderType === "invoice") {
    const a = order?.patient_address;

    if (!a) return "";

    return [
      a.address,
      a.locality,
      a.landmark,
      a.city,
      a.state,
      a.pincode,
      a.country
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (!order?.address) return "";

  const addr = order.address;
  return `${addr.flat}, ${addr.street}, ${addr.city}, ${addr.state}, ${addr.pincode}, India`;
};

  // Loader timer
  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingCount(0);
      interval = setInterval(() => setLoadingCount(c => c + 1), 1000);
    } else clearInterval(interval);
    return () => clearInterval(interval);
  }, [loading]);

  // Fetch order details
  useEffect(() => {
    fetchOrderDetails();
  }, []);
const openOtpModal = () => setOtpModalVisible(true);

 const fetchOrderDetails = async () => {
  try {
    let url = "";

    if (orderType === "sales") {
      url = `${BASE_URL}/salesorders/${orderId}`;
    } 
    else if (orderType === "invoice") {
url = `${BASE_URL}/ecogreen/sales-invoice/by-order?invoiceId=${encodeURIComponent(invoiceId)}`;    } 
    else {
      url = `${BASE_URL}/order-medicine/${orderId}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (res.ok) {
      setOrder(data.data || data); // invoice returns {data: invoice}
    } else {
      showAlert("Error", data.error || "Failed to load order details");
    }
  } catch (error) {
    console.error(error);
    showAlert("Error", "Unable to fetch order details");
  } finally {
    setLoading(false);
  }
};

  // Geocode customer address
  const getCoordinatesFromAddress = async address => {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "OK") {
        const loc = data.results[0].geometry.location;
        return { latitude: loc.lat, longitude: loc.lng };
      }
      console.warn("Geocoding failed:", data.status);
      return null;
    } catch (err) {
      console.error("Geocoding error:", err);
      return null;
    }
  };

const decodePolyline = (encoded) => {
  let points = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
};

const fetchRouteFromGoogle = async (origin, destination) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&alternatives=true&key=${GOOGLE_MAPS_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.routes && data.routes.length > 0) {
      // BEST ROUTE (first one)
      const points = decodePolyline(data.routes[0].overview_polyline.points);
      setRouteCoords(points);

      console.log("Distance:", data.routes[0].legs[0].distance.text);
      console.log("Duration:", data.routes[0].legs[0].duration.text);
    }
  } catch (err) {
    console.error("Route fetch error:", err);
  }
};
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
  // Fetch customer coords
  useEffect(() => {
    if (!order) return;

    const fetchCustomerCoords = async () => {
      const addressString = getCustomerAddressString(order);
      const coords = await getCoordinatesFromAddress(addressString);
      if (coords) setCustomerCoords(coords);

      if (deliveryLocation && coords) setRouteCoords([deliveryLocation, coords]);
    };

    fetchCustomerCoords();
  }, [order, deliveryLocation]);

 // Fetch delivery boy location from server using orderId
const fetchDeliveryBoyLocation = async () => {
  try {
    const res = await fetch(`${BASE_URL}/deliveryboy/location/${orderId}`);
    const data = await res.json();

    if (data.success && data.location) {
      const loc = {
        latitude: Number(data.location.latitude),
        longitude: Number(data.location.longitude),
      };
      
      setDeliveryLocation(loc);

      // log the location to console
      console.log("Delivery Boy Location:", loc);

if (customerCoords) {
  fetchRouteFromGoogle(loc, customerCoords);
}    }
  } catch (err) {
    console.error("Error fetching delivery boy location:", err);
  }
};

  // Polling for delivery boy location every 5 seconds
  useEffect(() => {
    if (!order || !customerCoords) return;

    fetchDeliveryBoyLocation(); // initial fetch
    const interval = setInterval(fetchDeliveryBoyLocation, 5000);

    return () => clearInterval(interval);
  }, [order, customerCoords]);

 const totalAmount =
  orderType === "invoice"
    ? Number(order?.total_price ?? 0)
    : orderType === "sales"
    ? order?.items?.reduce((sum, item) => sum + Number(item.total || 0), 0)
    : Number(order?.total ?? order?.subtotal ?? 0);

const handlePayment = () => {
  router.push("PaymentCollectionScreen", {
    orderId,
    orderNo, //  ADD THIS
    amount: totalAmount,
    deliveryType,
    deliveryBoyId,
    orderType,
    invoiceId
  });
};
  const handleFinishDelivery = () => {
  if (orderType === "sales"|| orderType==="invoice") {
    // Directly complete delivery for sales orders
    completeDelivery();
  } else {
    // Show OTP modal for other order types
    setOtpModalVisible(true);
  }
};
// Add this function inside your component
const verifyOtp = async () => {
  if (!otpInput) {
    showAlert("Error ❌", "Please enter OTP");
    return;
  }

  // Check payment before OTP verification
  const amountReceived =
    orderType === "sales"
      ? Number(order?.amount_collected ?? 0)
      : Number(order?.amount_received ?? 0);

  if (amountReceived < totalAmount) {
    showAlert(
      "Payment Pending ❌",
      `Total Amount: ₹${totalAmount}\nReceived: ₹${amountReceived}\n\nPlease collect full payment before completing delivery.`
    );
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/order-medicine/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, otp: otpInput }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showAlert("Success ✅", data.message || "Delivery marked as completed!");
      setOtpModalVisible(false);
      router.back();
    } else {
      showAlert("Error ❌", data.error || "OTP verification failed");
    }
  } catch (err) {
    console.error("OTP verification error:", err);
    showAlert("Error ❌", "Unable to verify OTP. Please try again.");
  }
};
const displayOrderId =
  orderType === "invoice"
    ? order?.invoice_id || invoiceId
    : orderId?.toString().slice(-6);

  const completeDelivery = async () => {
    const amountReceived =
      orderType === "sales"
        ? Number(order?.amount_collected ?? 0)
        : Number(order?.amount_received ?? 0);

    if (amountReceived < totalAmount) {
      showAlert(
        "Payment Pending ❌",
        `Total Amount: ₹${totalAmount}\nReceived: ₹${amountReceived}\n\nPlease collect full payment before completing delivery.`
      );
      return;
    }

    showAlert("Confirm Delivery", "Are you sure you want to complete this delivery?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Complete",
        onPress: async () => {
          try {
            const url =
              orderType === "sales"
                ? `${BASE_URL}/salesorders/complete-delivery`
                : `${BASE_URL}/order-medicine/mark-delivered`;

            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId }),
            });

            const data = await res.json();
            if (res.ok) {
              showAlert("Success ✅", "Delivery marked as completed!");
              router.back();
            } else showAlert("Error", data.error || "Failed to complete delivery");
          } catch (e) {
            console.error(e);
            showAlert("Error", "Unable to complete delivery");
          }
        },
      },
    ]);
  };
const openGoogleNavigation = () => {
  if (!customerCoords) return;

  const url = `https://www.google.com/maps/dir/?api=1&destination=${customerCoords.latitude},${customerCoords.longitude}&travelmode=driving`;

  Linking.openURL(url);
};
  const callCustomer = (phone) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ marginTop: 12, color: "#64748b" }}>
          Preparing Order Data... {loadingCount}s
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, DB_BASE.page]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
<Text style={styles.headerTitle}>
 <Text>Invoice #{displayOrderId}</Text>
</Text>        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainWrapper, isDesktop && styles.desktopGrid]}>
          
          {/* LEFT COLUMN: Customer & Order Data */}
          <View style={[isDesktop ? styles.column : null]}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="person-circle-outline" size={22} color="#0ea5e9" />
                <Text style={styles.cardTitle}>Customer Details</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{customer?.name || customer?.customer_name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Phone</Text>
                <TouchableOpacity onPress={() => callCustomer(customer?.mobile)}>
                  <Text style={[styles.value, { color: '#0ea5e9', fontWeight: '700' }]}>{customer?.mobile}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.addressContainer}>
                <Ionicons name="location-outline" size={16} color="#64748b" style={{ marginTop: 2 }} />
               <Text style={styles.addressText}>
  {orderType === "sales"
    ? `${customer?.address}, ${customer?.landmark} - ${customer?.pincode}`
    : orderType === "invoice"
    ? customer?.address || "No address available"
    : `${customer?.flat}, ${customer?.street}, ${customer?.city}, ${customer?.state} - ${customer?.pincode}`}
</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="receipt-outline" size={22} color="#0ea5e9" />
                <Text style={styles.cardTitle}>Order Items</Text>
              </View>
          {(
  orderType === "sales"
    ? order.items
    : orderType === "invoice"
    ? order.order_items
    : order.order_summary
)?.map((item, index) => (
  <View key={index} style={styles.orderItem}>
    
    <View style={{ flex: 1 }}>
      <Text style={styles.itemTitle}>
        {orderType === "sales"
          ? item.item_name
          : orderType === "invoice"
          ? item.medicine_name
          : item.name}
      </Text>

      <Text style={styles.itemQty}>
        Quantity: {item.quantity}
      </Text>
    </View>

    <Text style={styles.itemPrice}>
      ₹
      {orderType === "invoice"
        ? item.sub_total
        : item.total || item.sub_total}
    </Text>

  </View>
))}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment Mode</Text>
                <Text style={styles.summaryValue}>{order.payment_mode || order.payment_method}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Bill</Text>
                <Text style={styles.totalValue}>₹{totalAmount}</Text>
              </View>
            </View>
          </View>

          {/* RIGHT COLUMN: Map & Actions */}
          <View style={[isDesktop ? styles.column : null]}>
            <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
              <View style={[styles.cardHeader, { padding: 15 }]}>
                <Ionicons name="map-outline" size={22} color="#0ea5e9" />
                <Text style={styles.cardTitle}>Live Tracking</Text>
              </View>
              <View style={isDesktop ? { height: 350 } : { height: 250 }}>
               {deliveryLocation && customerCoords ? (
  <DeliveryMap
    deliveryLocation={deliveryLocation}
    customerCoords={customerCoords}
    routeCoords={routeCoords}
  />
) : (
  <ActivityIndicator size="large" color="#0ea5e9" />
)}
           </View>
            </View>
<Modal visible={otpModalVisible} transparent animationType="fade">
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  }}>
    <View style={{
      width: isDesktop ? 400 : 300,
      backgroundColor: "#fff",
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <Text style={{ fontWeight: "700", fontSize: 18, marginBottom: 10 }}>Enter OTP</Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          padding: 10,
          marginBottom: 20,
          fontSize: 16
        }}
        keyboardType="number-pad"
        value={otpInput}
        onChangeText={setOtpInput}
        placeholder="OTP"
      />
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
        <TouchableOpacity onPress={() => setOtpModalVisible(false)} style={{ padding: 10 }}>
          <Text style={{ color: "#64748b", fontWeight: "700" }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
  onPress={verifyOtp}
          style={{ backgroundColor: "#3B82F6", padding: 10, borderRadius: 10 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Verify & Complete</Text>
        </TouchableOpacity>
      </View>
    </View>
  </div>
</Modal>

<TouchableOpacity style={{backgroundColor:"#22c55e", padding:12, borderRadius:10}} onPress={openGoogleNavigation}>
  <Text style={{color:"#fff", fontWeight:"700"}}>Start Navigation</Text>
</TouchableOpacity>
            <View style={styles.actionContainer}>
              <View style={styles.buttonGrid}>
                <TouchableOpacity style={[styles.actionButton, styles.btnCall]} onPress={() => callCustomer(customer?.mobile)}>
                  <Ionicons name="call" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, styles.btnPayment]} onPress={handlePayment}>
                  <Ionicons name="card" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Payment</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.btnAddress}
                onPress={() =>
                  router.push("AddressChangeRequestScreen", {
                    orderId,
                    deliveryBoyId,
                    currentAddress:
                      orderType === "sales"
                        ? `${customer.address}, ${customer.landmark} - ${customer.pincode}`
                        : `${customer.flat}, ${customer.street}, ${customer.city}, ${customer.state} - ${customer.pincode}`,
                  })
                }
              >
                <Ionicons name="location" size={18} color="#f59e0b" />
                <Text style={styles.btnAddressText}>Request Address Change</Text>
              </TouchableOpacity>

           <TouchableOpacity style={styles.completeButton} onPress={handleFinishDelivery}>
  <Text style={styles.completeButtonText}>Finish Delivery</Text>
  <Ionicons name="checkmark-circle" size={24} color="#fff" />
</TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  backButton: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 10 },

  scrollContainer: { flexGrow: 1, padding: 16 },
  mainWrapper: { flexDirection: 'column' },
  desktopGrid: { flexDirection: 'row', gap: 20 },
  column: { flex: 1 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: '#64748b', fontSize: 14 },
  value: { color: '#1e293b', fontSize: 14, fontWeight: '600' },
  
  addressContainer: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, gap: 8 },
  addressText: { flex: 1, color: '#475569', fontSize: 13, lineHeight: 18 },

  orderItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, alignItems: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  itemQty: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  
  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 15 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { color: '#64748b', fontSize: 14 },
  summaryValue: { color: '#1e293b', fontWeight: '600' },
  
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#0ea5e9' },

  actionContainer: { marginTop: 10 },
  buttonGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionButton: { 
    flex: 1, 
    height: 50, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8 
  },
  btnCall: { backgroundColor: '#10b981' },
  btnPayment: { backgroundColor: '#0ea5e9' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  btnAddress: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
    gap: 8,
    marginBottom: 20
  },
  btnAddressText: { color: '#b45309', fontWeight: '600', fontSize: 14 },

  completeButton: { 
    backgroundColor: "#1e293b", 
    height: 60, 
    borderRadius: 15, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12,
    shadowColor: "#1e293b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5
  },
  completeButtonText: { color: "#fff", fontWeight: "800", fontSize: 18 },
});