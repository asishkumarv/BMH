import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";

const API_URL =
  "https://napi.bharatmedicalhallplus.com/ecogreen/local-customer/all";

export default function AdminLocalMasterScreen() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // 👉 FILTER STATES
  const [mobileFilter, setMobileFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  
  const router = useRouter();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      const json = await res.json();
      const data = json?.data || [];
      setCustomers(data);
      setFiltered(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (mobile, date) => {
    let data = [...customers];

    // 📱 Mobile filter
    if (mobile) {
      data = data.filter((item) =>
        item.mobile_no?.toString().includes(mobile)
      );
    }

    // 📅 Single date filter
    if (date) {
      data = data.filter((item) => {
        if (!item.added_date) return false;
        const itemDate = new Date(item.added_date)
          .toISOString()
          .split("T")[0];
        return itemDate === date;
      });
    }

    setFiltered(data);
  };

  const handleMobileSearch = (text) => {
    setMobileFilter(text);
    applyFilters(text, selectedDate);
  };

  const handleDateChange = (text) => {
    setSelectedDate(text);
    applyFilters(mobileFilter, text);
  };

  const toggleSelect = (item) => {
    const exists = selected.find((c) => c.id === item.id);
    if (exists) {
      setSelected(selected.filter((c) => c.id !== item.id));
    } else {
      setSelected([...selected, item]);
    }
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected([...filtered]);
    }
  };

  const isSelected = (item) =>
    selected.some((c) => c.id === item.id);

  const sendWhatsApp = async () => {
    if (!message.trim()) {
      return alert("Enter message first");
    }

    const numbers = selected
      .map((c) => String(c.mobile_no || "").replace(/\D/g, ""))
      .filter((n) => n.length === 10);

    if (!numbers.length) {
      return alert("Select customers with valid 10-digit mobile numbers");
    }

    try {
      const res = await fetch("https://napi.bharatmedicalhallplus.com/ecogreen/send-bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numbers,
          message,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Messages sent: ${data.sent}`);
      } else {
        alert(data.error || "Failed to send messages");
      }
    } catch (err) {
      console.log(err);
      alert("Server error");
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loaderText}>Loading customers...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.page}
      >
        {/* HEADER BAR */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Customer Master</Text>
        </View>

        {/* CONTROLS CONTAINER */}
        <View style={styles.controlsContainer}>
          {/* SEARCH ROW */}
          <View style={styles.searchRow}>
            <View style={[styles.inputContainer, { marginRight: 8 }]}>
              <Ionicons name="search" size={16} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                placeholder="Search Mobile..."
                value={mobileFilter}
                onChangeText={handleMobileSearch}
                style={styles.searchInput}
                keyboardType="numeric"
              />
            </View>

            {Platform.OS === "web" ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                style={styles.webDatePicker}
              />
            ) : (
              <View style={styles.inputContainer}>
                <Ionicons name="calendar" size={16} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  placeholder="YYYY-MM-DD"
                  value={selectedDate}
                  onChangeText={handleDateChange}
                  style={styles.searchInput}
                />
              </View>
            )}
          </View>

          {/* MESSAGE BOX */}
          <View style={styles.messageContainer}>
            <TextInput
              placeholder="Type WhatsApp message here..."
              value={message}
              onChangeText={setMessage}
              style={styles.messageBox}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.selectAllBtn} 
              onPress={toggleSelectAll}
            >
              <Text style={styles.selectAllText}>
                {selected.length === filtered.length && filtered.length > 0
                  ? "Deselect All"
                  : `Select All (${filtered.length})`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!selected.length || !message.trim()) && styles.sendBtnDisabled,
              ]}
              onPress={sendWhatsApp}
              disabled={!selected.length || !message.trim()}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.sendText}>Send ({selected.length})</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CUSTOMER LIST */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => (item.id ? item.id.toString() : Math.random().toString())}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No customers found matching the criteria.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const active = isSelected(item);
            
            // Get optional dynamic fields, filtering out known or layout-heavy fields
            const extraKeys = Object.keys(item).filter(
              (key) => key !== "id" && key !== "mobile_no" && key !== "added_date"
            );

            return (
              <TouchableOpacity
                onPress={() => toggleSelect(item)}
                style={[styles.card, active && styles.cardSelected]}
                activeOpacity={0.7}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Ionicons
                      name={active ? "checkbox" : "square-outline"}
                      size={22}
                      color={active ? "#10B981" : "#9CA3AF"}
                    />
                    <Text style={styles.idText}>ID: {item.id || "N/A"}</Text>
                  </View>
                  {item.added_date && (
                    <Text style={styles.dateText}>
                      {new Date(item.added_date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </Text>
                  )}
                </View>

                {/* Card Body */}
                <View style={styles.cardBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mobile</Text>
                    <Text style={styles.detailValue}>{item.mobile_no || "-"}</Text>
                  </View>

                  {/* Render additional dynamic keys if they exist */}
                  {extraKeys.map((key) => (
                    <View key={key} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{key}</Text>
                      <Text style={styles.detailValue} numberOfLines={2}>
                        {item[key] !== null && item[key] !== undefined
                          ? String(item[key])
                          : "-"}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  page: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  controlsContainer: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 40,
  },
  inputIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    padding: 0, 
  },
  webDatePicker: {
    flex: 1,
    paddingHorizontal: 8,
    height: 40,
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    backgroundColor: "#F9FAFB",
    fontSize: "14px",
    color: "#374151",
    outlineWidth: 0,
  },
  messageContainer: {
    marginBottom: 10,
  },
  messageBox: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: "#374151",
    textAlignVertical: "top",
    minHeight: 60,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectAllBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  sendBtn: {
    flexDirection: "row",
    backgroundColor: "#25D366",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  sendText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardSelected: {
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 8,
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  idText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 8,
  },
  dateText: {
    fontSize: 12,
    color: "#6B7280",
  },
  cardBody: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    textTransform: "capitalize",
    flex: 0.4,
  },
  detailValue: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "600",
    flex: 0.6,
    textAlign: "right",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    color: "#4B5563",
  },
});
