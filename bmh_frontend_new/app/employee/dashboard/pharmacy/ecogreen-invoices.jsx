import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Modal,
   Platform ,
     TextInput, // ✅ ADD THIS
 SafeAreaView, StatusBar 
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

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
export default function EcoGreenSalesInvoiceScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
const [assignModalVisible, setAssignModalVisible] = useState(false);
const [deliveryBoys, setDeliveryBoys] = useState([]);
const [selectedOrder, setSelectedOrder] = useState(null);
const [showDatePicker, setShowDatePicker] = useState(false);
const [selectedDate, setSelectedDate] = useState("");
const [searchText, setSearchText] = useState("");

const [date, setDate] = useState(new Date());
useEffect(() => {
  fetchInvoices();
  fetchDeliveryBoys();
}, []);
const formatISTDate = (date) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date).replace(/\//g, "-");
};

const onChangeDate = (event, selected) => {
  setShowDatePicker(false);

  if (selected) {
    setDate(selected);
const formatted = selected.toLocaleDateString("en-CA", {
  timeZone: "Asia/Kolkata",
});    setSelectedDate(formatted);
  }
};
const toISTDate = (isoString) => {
  if (!isoString) return null;

  return new Date(isoString).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
};

const getUTCDate = (dateString) => {
  if (!dateString) return null;
  return new Date(dateString).toISOString().split("T")[0];
};

const filteredInvoices = invoices.filter((item) => {
  const itemDate = getUTCDate(item.created_at_system);

  const matchesDate = selectedDate
    ? itemDate === selectedDate
    : true;

  const search = searchText.trim().toLowerCase();

  if (!search) return matchesDate;

  const orderId = String(item.order_id ?? "").toLowerCase();
  const orderNo = String(item.order_no ?? "").toLowerCase();
  const invoiceId = String(item.invoice_id ?? "").toLowerCase();

  const matchesSearch =
    orderId.includes(search) ||
    orderNo.includes(search) ||
    invoiceId.includes(search);

  return matchesDate && matchesSearch;
});

const totalInvoices = filteredInvoices.length;

const totalPayment = filteredInvoices.reduce((sum, item) => {
  return sum + (parseFloat(item.total_price) || 0);
}, 0);
const fetchInvoices = async () => {
  try {
    const response = await fetch(
      "https://hospitaldatabasemanagement.onrender.com/ecogreen/sales-invoice/all"
    );
    const data = await response.json();

setInvoices(data);
    // 🔥 AUTO ASSIGN CALL HERE
    autoAssignUnassignedOrders(data);

  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};
const formatPharmacy = (pharmacy) => {
  if (!pharmacy) return "-";

  let parsed = pharmacy;

  try {
    if (typeof pharmacy === "string") {
      parsed = JSON.parse(pharmacy);
    }
  } catch (e) {
    return "-";
  }

  const clean = (v) =>
    v && typeof v === "string" && v.trim() !== "" ? v.trim() : null;

  const name = clean(parsed?.pharmacy_name);

  const addressLine = [
    clean(parsed?.address),
    clean(parsed?.locality),
    clean(parsed?.city),
    clean(parsed?.state),
    clean(parsed?.pincode),
  ]
    .filter(Boolean)
    .join(", ");

  if (name && addressLine) return `${name}\n${addressLine}`;
  if (name) return name;
  if (addressLine) return addressLine;

  return "-";
};
const formatAddress = (addr) => {
  if (!addr) return "-";

  const parsed =
    typeof addr === "string" ? JSON.parse(addr) : addr;

  const addressLine = [
        parsed?.deliver_name,

    parsed?.address,
    parsed?.locality,
    parsed?.city,
    parsed?.state,
    parsed?.pincode,
        parsed?.country,

            parsed?.type,

  ]
    .map((v) => (v ? v.trim() : ""))
    .filter((v) => v && v !== "" && v !== " ")
    .join(", ");

  return addressLine || "-";
};
const fetchDeliveryBoys = async () => {
  try {
    const res = await fetch(
      "https://hospitaldatabasemanagement.onrender.com/employee/all"
    );
    const json = await res.json();

    const hdDeliveryBoys = (json?.employees || []).filter(
      (emp) => emp.role === "Hd delivery"
    );

    setDeliveryBoys(hdDeliveryBoys);
  } catch (err) {
    console.log("Error fetching delivery boys:", err);
  }
};
  const openModal = (items) => {
    setSelectedItems(items);
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedItems([]);
    setModalVisible(false);
  };
const handleAssignDeliveryBoy = async (orderId, value) => {
  try {
    let bodyData = {
      order_id: orderId,
    };

    // ONLY SEND WHEN VALID ID EXISTS
    if (value && value !== "auto") {
      const selectedBoy = deliveryBoys.find(
        (b) => b.id.toString() === value
      );

      if (selectedBoy) {
        bodyData.delivered_by_id = selectedBoy.id;
      }
    }

    const res = await fetch(
      "https://hospitaldatabasemanagement.onrender.com/ecogreen/sales-invoice/assign-delivery",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      }
    );

    const data = await res.json();
    console.log("ASSIGN RESPONSE:", data);

    fetchInvoices();

  } catch (err) {
    console.log("Assign error:", err);
  }
};
const autoAssignUnassignedOrders = async (orders) => {
  try {
    const unassigned = orders.filter(
      (o) => !o.delivered_by_id
    );

    for (let order of unassigned) {
      await fetch(
        "https://hospitaldatabasemanagement.onrender.com/ecogreen/sales-invoice/assign-delivery",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: order.order_id,
            // ❌ do NOT send delivered_by_id
            // backend will auto assign
          }),
        }
      );
    }

    // refresh after assignment
    fetchInvoices();

  } catch (err) {
    console.log("Auto assign error:", err);
  }
};
  const renderRow = ({ item }) => (
    <View style={styles.tableBodyRow}>

      <Text style={[styles.bodyCell, { width: 140 }]}>{item.order_id}</Text>
      <Text style={[styles.bodyCell, { width: 120 }]}>{item.order_no}</Text>
            <Text style={[styles.bodyCell, { width: 120 }]}>{item.invoice_id}</Text>

<Text style={[styles.bodyCell, { width: 180 }]}>
  {new Date(item.created_at_system).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  })}
</Text>

      <Text style={[styles.bodyCell, { width: 140 }]}>{item.order_type}</Text>
      <Text style={[styles.bodyCell, { width: 120 }]}>{item.payment_status}</Text>
      <Text style={[styles.bodyCell, { width: 120 }]}>{item.total_price}</Text>
      <Text style={[styles.bodyCell, { width: 120 }]}>{item.total_discount}</Text>

      <Text style={[styles.bodyCell, { width: 120 }]}>{item.order_for}</Text>
      <Text style={[styles.bodyCell, { width: 140 }]}>{item.delivered_by || "-"}</Text>
      <Text style={[styles.bodyCell, { width: 120 }]}>{item.shipping_charge}</Text>
<Text style={[styles.bodyCell, { width: 120 }]}>
  {item.createduser || "-"}
</Text>
      <Text style={[styles.bodyCell, { width: 150 }]}>{item.patient_name}</Text>
      <Text style={[styles.bodyCell, { width: 140 }]}>{item.patient_contact_no || "-"}</Text>

      <Text style={[styles.bodyCell, { width: 250 }]}>
  {formatAddress(item.patient_address)}
</Text>
<Text style={[styles.bodyCell, { width: 300 }]}>
  {formatPharmacy(item.pharmacy)}
</Text>
      <Text style={[styles.bodyCell, { width: 150 }]}>{item.store_id}</Text>
      <Text style={[styles.bodyCell, { width: 180 }]}>{item.user_email || "-"}</Text>
<Text style={[styles.bodyCell, { width: 100 }]}>
  {item.reminder_date
    ? new Date(item.reminder_date).toLocaleDateString("en-IN")
    : "-"}
</Text>

<Text style={[styles.bodyCell, { width: 100 }]}>
  {item.d_remind_date
    ? new Date(item.d_remind_date).toLocaleDateString("en-IN")
    : "-"}
</Text>
      <View style={[styles.actionCellWeb, { width: 100 }]}>
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={() => openModal(item.order_items)}
        >
          <Feather name="eye" size={16} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

       {/* ================= DELIVERY ROW ================= */}
   <View style={styles.deliveryRow}>


      <View style={styles.pickerBox}>

      <Picker
  selectedValue={item.delivered_by_id ? item.delivered_by_id.toString() : ""}
  onValueChange={(value) =>
    handleAssignDeliveryBoy(item.order_id, value)
  }
  style={{ height: 40, width: 200 }}
>
  <Picker.Item label="Select Delivery Boy" value="" />

  {deliveryBoys.map((boy) => (
    <Picker.Item
      key={boy.id}
      label={boy.full_name || boy.name}
      value={boy.id.toString()}
    />
  ))}
</Picker>

      </View>
    </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <Text>Loading invoices...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
       <View style={styles.headerArea}>
    <View style={styles.titleRow}>
      
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.mainTitle}>Sales Invoice</Text>
    </View>
  </View>
      <View style={styles.searchBox}>
  <Feather name="search" size={18} color="#64748b" />
<SafeAreaView style={{ backgroundColor: COLORS.primary }}>
  <StatusBar barStyle="light-content" />

 
</SafeAreaView>
  <TextInput
    placeholder="Search Order ID / Order No / Invoice ID"
    value={searchText}
    onChangeText={setSearchText}
    style={styles.searchInput}
    placeholderTextColor="#94a3b8"
  />
</View>
<View style={styles.topBar}>

  {/* DATE PICKER */}
<View style={styles.dateBox}>
  <Feather name="calendar" size={18} color="#0ea5e9" />

  {/* ✅ WEB DATE INPUT */}
  {Platform.OS === "web" ? (
  <input
  type="date"
  value={selectedDate}
  onChange={(e) => {
    const value = e.target.value;
    console.log("DATE SELECTED:", value);
    setSelectedDate(value);
  }}
  style={{
    flex: 1,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    outline: "none",
  }}
/>
  ) : (
    /* ✅ MOBILE DATE PICKER */
    <>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={{
          flex: 1,
          padding: 10,
          borderWidth: 1,
          borderColor: "#cbd5e1",
          borderRadius: 8,
          backgroundColor: "#fff",
        }}
      >
        <Text>
          {selectedDate ? selectedDate : "Select Date"}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onChangeDate}
        />
      )}
    </>
  )}
</View>

  {/* SUMMARY */}
  <View style={styles.summaryRow}>

    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Invoices</Text>
      <Text style={styles.summaryValue}>{totalInvoices}</Text>
    </View>

    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Total Payment</Text>
      <Text style={styles.summaryValue}>
        ₹ {totalPayment.toFixed(2)}
      </Text>
    </View>

  </View>

</View>
      {/* Back Button */}
   

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>

          {/* HEADER */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.headerCell, { width: 140 }]}>Order ID</Text>
            <Text style={[styles.headerCell, { width: 120 }]}>Order No</Text>
                        <Text style={[styles.headerCell, { width: 120 }]}>invoice id</Text>

            <Text style={[styles.headerCell, { width: 120 }]}>Date</Text>
            <Text style={[styles.headerCell, { width: 140 }]}>Order Type</Text>
            <Text style={[styles.headerCell, { width: 120 }]}>Payment</Text>
            <Text style={[styles.headerCell, { width: 120 }]}>Total</Text>
            <Text style={[styles.headerCell, { width: 120 }]}>Discount</Text>

            <Text style={[styles.headerCell, { width: 120 }]}>Order For</Text>
            <Text style={[styles.headerCell, { width: 140 }]}>Delivered By</Text>
            <Text style={[styles.headerCell, { width: 120 }]}>Shipping</Text>
<Text style={[styles.headerCell, { width: 120 }]}>Created User</Text>
            <Text style={[styles.headerCell, { width: 150 }]}>Patient</Text>
            <Text style={[styles.headerCell, { width: 140 }]}>Contact</Text>
            <Text style={[styles.headerCell, { width: 250 }]}>Address</Text>
<Text style={[styles.headerCell, { width: 300 }]}>
  Pharmacy
</Text>
            <Text style={[styles.headerCell, { width: 180 }]}>Store</Text>
            <Text style={[styles.headerCell, { width: 160 }]}>Email</Text>
<Text style={[styles.headerCell, { width: 140 }]}>
  Reminder Date
</Text>

<Text style={[styles.headerCell, { width: 140 }]}>
  Remind Date
</Text>
            <Text style={[styles.headerCell, { width: 100 }]}>Items</Text>
            <Text style={[styles.headerCell, { width: 100 }]}>AssignDeliveryBoy</Text>

          </View>

          {/* ROWS */}
         <FlatList
  data={filteredInvoices}   // ✅ FIXED
  renderItem={renderRow}
  keyExtractor={(item, index) => index.toString()}
/>
        </View>
      </ScrollView>

      {/* MODAL */}
  <Modal visible={modalVisible} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.modalBox}>

      <Text style={styles.modalTitle}>Order Items</Text>

      {/* ✅ BOTH VERTICAL + HORIZONTAL SCROLL */}
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator
      >
        <ScrollView
          style={{ maxHeight: 350 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          <View>

            {/* HEADER */}
            <View style={styles.itemHeaderRow}>
              <Text style={[styles.itemHeaderCell, { width: 120 }]}>Code</Text>
              <Text style={[styles.itemHeaderCell, { width: 250 }]}>Medicine</Text>
              <Text style={[styles.itemHeaderCell, { width: 60 }]}>Qty</Text>
              <Text style={[styles.itemHeaderCell, { width: 100 }]}>MRP</Text>
              <Text style={[styles.itemHeaderCell, { width: 120 }]}>Selling</Text>
              <Text style={[styles.itemHeaderCell, { width: 90 }]}>Disc</Text>
              <Text style={[styles.itemHeaderCell, { width: 120 }]}>Subtotal</Text>
              <Text style={[styles.itemHeaderCell, { width: 140 }]}>Type</Text>
            </View>

            {/* ROWS */}
            {selectedItems?.map((item, idx) => (
              <View key={idx} style={styles.itemRowTable}>
                <Text style={[styles.itemCell, { width: 120 }]}>{item.item_code}</Text>
                <Text style={[styles.itemCell, { width: 250 }]}>{item.medicine_name}</Text>
                <Text style={[styles.itemCell, { width: 60 }]}>{item.quantity}</Text>
                <Text style={[styles.itemCell, { width: 100 }]}>{item.maxmrp}</Text>
                <Text style={[styles.itemCell, { width: 120 }]}>{item.selling_price}</Text>
                <Text style={[styles.itemCell, { width: 90 }]}>{item.discount}</Text>
                <Text style={[styles.itemCell, { width: 120 }]}>{item.sub_total}</Text>
                <Text style={[styles.itemCell, { width: 140 }]}>{item.type}</Text>
              </View>
            ))}

          </View>
        </ScrollView>
      </ScrollView>

      {/* CLOSE BUTTON */}
      <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
        <Text style={styles.closeBtnText}>Close</Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // ---------- HEADER ----------
  headerArea: {
  backgroundColor: COLORS.primary,
  paddingHorizontal: 20,
  paddingTop: Platform.OS === "ios" ? 10 : 48,
  paddingBottom: 16,
},

titleRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
},

backBtn: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgba(255,255,255,0.15)",
  justifyContent: "center",
  alignItems: "center",
},

mainTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: "#fff",
},

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },

  // ---------- PAGE ----------
  container: {
    flex: 1,
  },

  content: {
    padding: 16,
  },

  // ---------- SEARCH ----------
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 45,
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.text,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },

  // ---------- TOP BAR ----------
  topBar: {
    marginBottom: 16,
  },

  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
  },

  // ---------- SUMMARY CARDS ----------
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },

  summaryTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "700",
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 4,
  },

  // ---------- TABLE CARD ----------
  tableCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },

  scrollWrapper: {
    borderRadius: 16,
  },

  // ---------- TABLE HEADER ----------
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },

  headerCell: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ---------- TABLE ROW ----------
  tableBodyRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    alignItems: "center",
  },

  bodyCell: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.text,
  },

  // zebra row like second UI
  rowAlt: {
    backgroundColor: "#F8FAFC",
  },

  // ---------- ACTION ----------
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
  },

  // ---------- DELIVERY ----------
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },

  pickerBox: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },

  // ---------- MODAL ----------
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    backgroundColor: COLORS.surface,
    width: "92%",
    borderRadius: 16,
    padding: 16,
    maxHeight: "85%",
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },

  closeBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  closeBtnText: {
    color: "#fff",
    fontWeight: "800",
  },

  // ---------- ITEM TABLE ----------
  itemHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    padding: 10,
  },

  itemHeaderCell: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
  },

  itemRowTable: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },

  itemCell: {
    fontSize: 13,
    color: COLORS.text,
  },

  // ---------- LOADER ----------
  loader: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});