import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, Image, useWindowDimensions, Platform, SafeAreaView, ActivityIndicator
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";

const BRAND = {
  deep: '#1E3A8A', primary: '#2456C7', bg: '#F4F7FC', surface: '#FFFFFF',
  ink: '#0F1F3D', muted: '#6B7A99', border: '#E3E9F4',
  danger: '#E54848', success: '#10B981', warn: '#F59E0B', gold: '#C9A646',
};
export default function OrderForm() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pinCode, setPinCode] = useState("");

 const [orderItems, setOrderItems] = useState([
  { id: Date.now(), medicineId: "", name: "", quantity: "1", mrp: "", rate: "" },
]);

  const [paymentMode, setPaymentMode] = useState("cod");
  const [deliveryType, setDeliveryType] = useState("local");
  const [loading, setLoading] = useState(false);
     const [loadingCount, setLoadingCount] = useState(0);

  const [prescriptionRequired, setPrescriptionRequired] = useState(false);
  const [prescriptionImage, setPrescriptionImage] = useState(null);
  const [customFields, setCustomFields] = useState([]);
const [customValues, setCustomValues] = useState({});
const { width: SCREEN_WIDTH } = useWindowDimensions();
  // Thresholds for responsiveness
  const isDesktop = SCREEN_WIDTH > 800;
  const isMobile = SCREEN_WIDTH <= 800;

  const MAX_CONTENT_WIDTH = 1100;


  const [medicines, setMedicines] = useState([]);

useEffect(() => {
  const fetchMedicines = async () => {
    try {
      const res = await fetch(
        "https://napi.bharatmedicalhallplus.com/medicine/all"
      );
      const data = await res.json();

      if (Array.isArray(data)) {
        // Optional: show only medicines with stock > 0
        const available = data.filter((m) => m.stock > 0);
        setMedicines(available);
      }
    } catch (err) {
      console.log("Medicine fetch error", err);
    }
  };

  fetchMedicines();
}, []);
useEffect(() => {
  const fetchCustomFields = async () => {
    try {
      const res = await fetch("https://napi.bharatmedicalhallplus.com/CreateSalesorderfields/all");
      const data = await res.json();
      if (data.success) {
        setCustomFields(data.fields || []);

        // Initialize values as empty string
        const initialValues = {};
        data.fields.forEach(f => { initialValues[f.field_key] = ""; });
        setCustomValues(initialValues);
      }
    } catch (err) {
      console.error("Error fetching custom fields:", err);
    }
  };

  fetchCustomFields();
}, []);
 const showAlert = (title, message, buttons) => {
   if (Platform.OS === "web") {
     const confirmDelete = window.confirm(`${title}\n\n${message}`);
     if (confirmDelete && buttons?.[1]?.onPress) {
       buttons[1].onPress();
     }
   } else {
     Alert.alert(title, message, buttons);
   }
 };

 useEffect(() => {
             let interval;
             if (loading) {
               setLoadingCount(0);
               interval = setInterval(() => setLoadingCount((c) => c + 1), 1000);
             } else clearInterval(interval);
             return () => clearInterval(interval);
           }, [loading]);
  const addOrderItem = () => {
    setOrderItems([
      ...orderItems,
      { id: Date.now(), name: "", quantity: "1", mrp: "", rate: "" },
    ]);
  };

  const removeOrderItem = (id) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((i) => i.id !== id));
    }
  };
const handleMobileChange = (text) => {
  // Remove any non-digits
  const cleaned = text.replace(/[^0-9]/g, "");
  
  // Limit to 10 digits
  const limited = cleaned.slice(0, 10);
  
  // Update state
  setMobile(limited);
};
 const updateOrderItem = (id, field, value) => {
  setOrderItems(prevItems =>
    prevItems.map(item => item.id === id ? { ...item, [field]: value } : item)
  );
};

  const pickPrescription = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPrescriptionImage(result.assets[0].uri);
    }
  };

  /* GRAND TOTAL */
  const grandTotal = orderItems.reduce((sum, i) => {
    let qty = Number(i.quantity || 0);
    let rate = Number(i.rate || 0);
    return sum + qty * rate;
  }, 0);

const handleSubmit = async () => {
  if (!customerName || !mobile || !address || !pinCode) {
    showAlert("Missing Information", "Please fill all required fields.");
    return;
  }

  if (orderItems.some((i) => !i.name.trim())) {
    showAlert("Missing Items", "Add at least one valid order item.");
    return;
  }

  try {
    const formData = new FormData();

    formData.append("customer_name", customerName);
    formData.append("mobile", mobile);
    formData.append("address", address);
    formData.append("landmark", landmark);
    formData.append("pincode", pinCode);
    formData.append("payment_mode", paymentMode);
    formData.append("delivery_type", deliveryType);
    formData.append("prescription_required", String(prescriptionRequired));

    // FORMAT ITEMS
    const formattedItems = orderItems.map((i) => ({
      medicine_id: i.medicineId || null, // null if not selected
      item_name: i.name || "",           // always send name
      quantity: Number(i.quantity || 0),
      mrp: Number(i.mrp || 0),
      rate: Number(i.rate || 0),
      total: Number(i.quantity || 0) * Number(i.rate || 0),
    }));

    formData.append("items", JSON.stringify(formattedItems));
    formData.append("total_amount", String(grandTotal));

    if (prescriptionRequired && prescriptionImage) {
      formData.append("prescription", {
        uri: prescriptionImage,
        name: "prescription.jpg",
        type: "image/jpeg",
      });
    }

    const res = await fetch(
      "https://napi.bharatmedicalhallplus.com/salesorders/create",
      {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      }
    );

    const data = await res.json();

    if (data.success) {
      showAlert("Success", "Order Created Successfully!");
      // Reset form
      setCustomerName("");
      setMobile("");
      setAddress("");
      setLandmark("");
      setPinCode("");
      setOrderItems([{ id: Date.now(), name: "", medicineId: null, quantity: "1", mrp: "", rate: "" }]);
      setPaymentMode("cod");
      setDeliveryType("local");
      setPrescriptionRequired(false);
      setPrescriptionImage(null);
      router.back();
    } else {
      showAlert("Error", data.error || "Something went wrong");
    }
  } catch (error) {
    console.error("API Error:", error);
    showAlert("Error", "Could not create order.");
  }
};
  if (loading)
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading{loadingCount}s</Text>
      </View>
    );
return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainWrapper, { maxWidth: MAX_CONTENT_WIDTH }]}>
          
          {/* HEADER */}
          <LinearGradient colors={['#0B1F4F', '#152E6E', '#1E3A8A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerContainer}>
            <TouchableOpacity onPress={() => router.back()} style={styles.circleBack}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Create Sales Order</Text>
              <Text style={styles.headerSub}>Generate new invoice for medicine/services</Text>
            </View>
          </LinearGradient>

          {/* SECTION 1: CUSTOMER & ADDRESS */}
          <View style={isDesktop ? styles.desktopGrid : styles.mobileStack}>
            <View style={styles.gridColumn}>
              <View style={styles.sectionHeader}>
                <Feather name="user" size={18} color="#2563eb" />
                <Text style={styles.sectionTitle}>Customer Information</Text>
              </View>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput style={styles.input} placeholder="John Doe" value={customerName} onChangeText={setCustomerName} />
              
              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <View style={[styles.input, styles.phoneInputRow]}>
                <Text style={styles.prefix}>+91 </Text>
                <TextInput
                  style={styles.flexInput}
                  placeholder="00000 00000"
                  value={mobile}
                  onChangeText={handleMobileChange}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.gridColumn}>
              <View style={styles.sectionHeader}>
                <Feather name="map-pin" size={18} color="#2563eb" />
                <Text style={styles.sectionTitle}>Delivery Details</Text>
              </View>
              <Text style={styles.fieldLabel}>Complete Address</Text>
              <TextInput style={styles.input} placeholder="House No, Street..." value={address} onChangeText={setAddress} />
              
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Landmark</Text>
                  <TextInput style={styles.input} placeholder="Near..." value={landmark} onChangeText={setLandmark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Pin Code</Text>
                  <TextInput style={styles.input} placeholder="000000" value={pinCode} keyboardType="number-pad" onChangeText={setPinCode} />
                </View>
              </View>
            </View>
          </View>

          {customFields.map((field) => (
  <View key={field.id} style={{ marginBottom: 15 }}>
    <Text style={styles.fieldLabel}>
      {field.label} {field.required ? "*" : ""}
    </Text>

    {field.type === "text" && (
      <TextInput
        style={styles.input}
        placeholder={field.label}
        value={customValues[field.field_key]}
        onChangeText={(text) =>
          setCustomValues({ ...customValues, [field.field_key]: text })
        }
      />
    )}

    {field.type === "number" && (
      <TextInput
        style={styles.input}
        placeholder={field.label}
        value={customValues[field.field_key]}
        keyboardType="numeric"
        onChangeText={(text) =>
          setCustomValues({ ...customValues, [field.field_key]: text })
        }
      />
    )}

    {field.type === "date" && (
      <TextInput
        style={styles.input}
        placeholder={field.label}
        value={customValues[field.field_key]}
        onFocus={() => {/* show date picker */}}
      />
    )}
  </View>
))}

          {/* SECTION 2: ORDER ITEMS */}
          <View style={[styles.sectionHeader, { marginTop: 10 }]}>
            <Feather name="shopping-cart" size={18} color="#2563eb" />
            <Text style={styles.sectionTitle}>Order Items</Text>
          </View>

          {orderItems.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <Text style={styles.itemBadge}>ITEM #{index + 1}</Text>
                {orderItems.length > 1 && (
                  <TouchableOpacity onPress={() => removeOrderItem(item.id)} style={styles.removeBtn}>
                    <Feather name="trash-2" size={18} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={isDesktop ? styles.itemInputsGrid : styles.mobileStack}>
                <View style={{ flex: 2 }}>
                   <Text style={styles.fieldLabel}>Medicine/Item Name</Text>
<Picker
  selectedValue={item.medicineId || ""}  // use null instead of ""
  onValueChange={(value) => {
    const selectedMedicine = medicines.find((m) => String(m.id) === value);
    updateOrderItem(item.id, "medicineId", value ?? ""); // store string or empty
    updateOrderItem(item.id, "name", selectedMedicine ? selectedMedicine.name : "");
        console.log("Selected medicine ID:", value);

  }}
  style={[styles.input, { paddingVertical: 0 }]}
>
  <Picker.Item label="Select medicine..." value={null} />  {/* null, not "" */}
  {medicines.map((med) => (
    <Picker.Item
      key={med.id}
      label={`${med.name} (Stock: ${med.stock})`}
      value={String(med.id)}
    />
  ))}
</Picker>
     </View>
                <View style={{ flex: 0.5 }}>
                   <Text style={styles.fieldLabel}>Qty</Text>
                   <TextInput style={styles.input} placeholder="1" keyboardType="number-pad" value={item.quantity} onChangeText={(t) => updateOrderItem(item.id, "quantity", t)} />
                </View>
                <View style={{ flex: 0.8 }}>
                   <Text style={styles.fieldLabel}>MRP</Text>
                   <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={item.mrp} onChangeText={(t) => updateOrderItem(item.id, "mrp", t)} />
                </View>
                <View style={{ flex: 0.8 }}>
                   <Text style={styles.fieldLabel}>Rate</Text>
                   <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={item.rate} onChangeText={(t) => updateOrderItem(item.id, "rate", t)} />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addItemButton} onPress={addOrderItem}>
            <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
            <Text style={styles.addItemText}>Add Another Item</Text>
          </TouchableOpacity>

          {/* SECTION 3: OPTIONS */}
          <View style={[isDesktop ? styles.desktopGrid : styles.mobileStack, { marginTop: 20 }]}>
            <View style={styles.gridColumn}>
                <Text style={styles.optionHeading}>Payment Mode</Text>
                <View style={styles.optionsWrapper}>
                  {["cod", "online", "upi"].map((mode) => (
                      <TouchableOpacity key={mode} style={styles.radioRow} onPress={() => setPaymentMode(mode)}>
                          <View style={styles.radioOuter}>{paymentMode === mode && <View style={styles.radioInner} />}</View>
                          <Text style={styles.radioLabel}>{mode.toUpperCase()}</Text>
                      </TouchableOpacity>
                  ))}
                </View>
            </View>

            <View style={styles.gridColumn}>
                <Text style={styles.optionHeading}>Delivery Method</Text>
                <View style={styles.optionsWrapper}>
                  {["local", "outside", "bus"].map((type) => (
                      <TouchableOpacity key={type} style={styles.radioRow} onPress={() => setDeliveryType(type)}>
                          <View style={styles.radioOuter}>{deliveryType === type && <View style={styles.radioInner} />}</View>
                          <Text style={styles.radioLabel}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                      </TouchableOpacity>
                  ))}
                </View>
            </View>
          </View>

          {/* FOOTER: TOTAL & SUBMIT */}
          <View style={[styles.footerContainer, isMobile && { flexDirection: "column", gap: 16 }]}>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalAmount}>₹{grandTotal.toLocaleString('en-IN')}</Text>
            </View>

            <TouchableOpacity style={[styles.submitBtn, isMobile && { width: "100%" }]} onPress={handleSubmit}>
              <MaterialCommunityIcons name="file-document-check-outline" size={22} color="#fff" />
              <Text style={styles.submitText}>Confirm & Create Order</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND.bg },
  scrollContainer: { flexGrow: 1, paddingVertical: 20, paddingHorizontal: 16 },
  mainWrapper: { alignSelf: "center", width: "100%", backgroundColor: BRAND.surface, borderRadius: 20, borderWidth: 1, borderColor: BRAND.border, elevation: 3, overflow: 'hidden' },
  
  headerContainer: { flexDirection: "row", alignItems: "center", padding: 24, gap: 15 },
  circleBack: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  desktopGrid: { flexDirection: "row", gap: 30, paddingHorizontal: 24, paddingVertical: 20 },
  mobileStack: { flexDirection: "column", paddingHorizontal: 20, paddingTop: 20, gap: 20 },
  gridColumn: { flex: 1 },
  
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 15, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: BRAND.ink, textTransform: "uppercase", letterSpacing: 0.5 },

  fieldLabel: { fontSize: 11, fontWeight: "800", color: BRAND.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 },
  input: { backgroundColor: BRAND.bg, borderWidth: 1, borderColor: BRAND.border, borderRadius: 10, paddingHorizontal: 15, height: 46, fontSize: 14, color: BRAND.ink, marginBottom: 15, ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}) },
  phoneInputRow: { flexDirection: "row", alignItems: "center", ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}) },
  prefix: { color: BRAND.muted, fontWeight: "700", fontSize: 14 },
  flexInput: { flex: 1, color: BRAND.ink, ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}) },

  itemCard: { backgroundColor: BRAND.surface, padding: 18, borderRadius: 12, marginBottom: 15, marginHorizontal: 24, borderWidth: 1, borderColor: BRAND.border, elevation: 1 },
  itemCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  itemBadge: { fontSize: 10, fontWeight: "800", color: BRAND.primary, backgroundColor: '#EBF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  itemInputsGrid: { flexDirection: "row", gap: 12 },
  removeBtn: { padding: 4 },

  addItemButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 24 },
  addItemText: { color: BRAND.primary, fontWeight: "700", fontSize: 14 },

  optionHeading: { fontSize: 13, fontWeight: "800", color: BRAND.ink, marginBottom: 12, textTransform: 'uppercase' },
  optionsWrapper: { flexDirection: "row", gap: 20, marginBottom: 20 },
  radioRow: { flexDirection: "row", alignItems: "center" },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: BRAND.border, justifyContent: "center", alignItems: "center", marginRight: 8 },
  radioInner: { width: 9, height: 9, backgroundColor: BRAND.primary, borderRadius: 4.5 },
  radioLabel: { fontSize: 13, color: BRAND.muted, fontWeight: "700" },

  footerContainer: { marginTop: 20, padding: 24, borderTopWidth: 1, borderTopColor: BRAND.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: '#FAFCFF' },
  totalBox: { backgroundColor: '#F0FDF4', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#DCFCE7' },
  totalLabel: { fontSize: 11, fontWeight: "800", color: '#166534', textTransform: "uppercase" },
  totalAmount: { fontSize: 24, fontWeight: "900", color: '#14532D' },

  submitBtn: { backgroundColor: BRAND.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, paddingHorizontal: 30, borderRadius: 12 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: BRAND.bg },
  loaderText: { marginTop: 15, color: BRAND.muted, fontWeight: "600" }
});
