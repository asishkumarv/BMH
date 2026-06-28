import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView 
} from "react-native";
import { DB_BASE } from "./DeliveryBoyTheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';

const BASE_URL = "https://hospitaldatabasemanagement.onrender.com";

export default function AddressChangeRequestScreen() {
  const router = useRouter();
  const route = useRoute();

  const { orderId, deliveryBoyId, currentAddress } = route.params;
  const [loading, setLoading] = useState(false);

  const [newAddress, setNewAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [reason, setReason] = useState("");
  
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isDesktop = SCREEN_WIDTH > 800;
  const CONTENT_MAX_WIDTH = 1100;

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const handleSubmit = async () => {
    if (!newAddress || !pincode) {
      return showAlert("Error", "Address and Pincode are required");
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/salesorders/delivery/address-change/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: orderId,
            delivery_boy_id: deliveryBoyId,
            old_address: currentAddress,
            new_address: newAddress,
            new_landmark: landmark,
            new_pincode: pincode,
            reason: reason,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        showAlert("Request Sent ✅", "Address change request is pending approval.");
        router.back();
      } else {
        showAlert("Error", data.error || "Failed to send request");
      }
    } catch (error) {
      console.error(error);
      showAlert("Error", "Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, DB_BASE.page]}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Address</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView contentContainerStyle={[styles.container, DB_BASE.screenContent]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.responsiveWrapper, isDesktop && { maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" }]}>
            
            <View style={[styles.mainLayout, isDesktop && styles.desktopRow]}>
              
              {/* LEFT COLUMN: Current Status */}
              <View style={[isDesktop ? { flex: 0.4 } : null]}>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="information-circle-outline" size={20} color="#0ea5e9" />
                    <Text style={styles.cardTitle}>Current Status</Text>
                  </View>
                  <Text style={styles.label}>Old Delivery Address</Text>
                  <View style={styles.currentAddressBox}>
                    <Text style={styles.currentAddressText}>{currentAddress}</Text>
                  </View>
                  <View style={styles.warningBox}>
                    <Ionicons name="alert-circle" size={16} color="#b45309" />
                    <Text style={styles.warningText}>
                      Requests are subject to approval by the admin team.
                    </Text>
                  </View>
                </View>
              </View>

              {/* RIGHT COLUMN: Entry Form */}
              <View style={[isDesktop ? { flex: 0.6 } : null]}>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="create-outline" size={20} color="#0ea5e9" />
                    <Text style={styles.cardTitle}>New Location Details</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Full Address</Text>
                    <TextInput
                      style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                      placeholder="Building, Street, Area..."
                      multiline
                      value={newAddress}
                      onChangeText={setNewAddress}
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Landmark</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Near..."
                        value={landmark}
                        onChangeText={setLandmark}
                      />
                    </View>
                    <View style={{ flex: 0.8 }}>
                      <Text style={styles.inputLabel}>Pincode</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="6 Digits"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={pincode}
                        onChangeText={setPincode}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Reason for Request</Text>
                    <TextInput
                      style={[styles.input, { height: 60 }]}
                      placeholder="Why is this change needed?"
                      value={reason}
                      onChangeText={setReason}
                    />
                  </View>

                  <TouchableOpacity 
                    style={[styles.submitButton, loading && { opacity: 0.7 }]} 
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    <Text style={styles.submitText}>
                      {loading ? "Sending..." : "Submit Request"}
                    </Text>
                    <Ionicons name="send" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  backBtn: { padding: 5, backgroundColor: '#f1f5f9', borderRadius: 8 },
  
  container: { padding: 16, flexGrow: 1 },
  responsiveWrapper: { width: "100%" },

  mainLayout: { flexDirection: "column" },
  desktopRow: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  inputRow: { flexDirection: "row", gap: 12 },

  card: { 
    backgroundColor: "#fff", 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#e2e8f0',
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },

  label: { fontSize: 13, fontWeight: "600", color: "#64748b", marginBottom: 8 },
  currentAddressBox: { 
    backgroundColor: "#f1f5f9", 
    padding: 15, 
    borderRadius: 12, 
    borderLeftWidth: 4, 
    borderLeftColor: "#cbd5e1" 
  },
  currentAddressText: { fontSize: 14, color: "#475569", lineHeight: 20 },
  
  warningBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginTop: 15, 
    padding: 12, 
    backgroundColor: '#fffbeb', 
    borderRadius: 10 
  },
  warningText: { flex: 1, fontSize: 12, color: '#b45309', fontWeight: '500' },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  input: { 
    borderWidth: 1, 
    borderColor: "#e2e8f0", 
    padding: 12, 
    borderRadius: 12, 
    backgroundColor: "#fff", 
    fontSize: 15,
    color: '#1e293b'
  },

  submitButton: { 
    backgroundColor: "#1e293b", 
    paddingVertical: 16, 
    borderRadius: 15, 
    marginTop: 10, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 10,
    shadowColor: "#1e293b",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});