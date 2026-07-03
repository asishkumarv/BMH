// screens/AdminEcoGreenStockData.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Image,
  useWindowDimensions,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

const API_BASE = "https://napi.bharatmedicalhallplus.com/ecogreen";

const AdminEcoGreenStockData = ({ navigation }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isMobile = SCREEN_WIDTH < 600;
  const isTablet = SCREEN_WIDTH >= 600 && SCREEN_WIDTH < 1024;
  const numColumns = isMobile ? 1 : isTablet ? 2 : 3;

  const [search, setSearch] = useState("");
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [editModal, setEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [form, setForm] = useState({
    c_item_code: "",
    item_name: "",
    item_qty_per_box: "",
    batch_no: "",
    stock_bal_qty: "",
    mrp: "",
    mrpbox: "",
    sale_rate: "",
    expiry_date: "",
    image: "",
    description: "",
  });

  const isWeb = Platform.OS === "web";

  const toggleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  const showAlert = (title, message) => {
    if (isWeb) window.alert(`${title}\n${message}`);
    else Alert.alert(title, message);
  };

  const CheckBoxUI = ({ value, onChange }) => {
    if (Platform.OS === "web") {
      return (
        <input
          type="checkbox"
          checked={value}
          onChange={onChange}
          style={{ transform: "scale(1.3)", cursor: "pointer" }}
        />
      );
    }
    const Checkbox = require("@react-native-community/checkbox").default;
    return <Checkbox value={value} onValueChange={onChange} />;
  };

  /* ---------------- FETCH ---------------- */
  const fetchStockItems = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/stock-details/all?page=${pageNumber}&limit=${limit}`
      );
      const data = await res.json();
      setStockItems(data.stockItems || []);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || pageNumber);
    } catch (err) {
      showAlert("Error", "Failed to fetch stock items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockItems(1);
  }, []);

  const filteredStock = stockItems.filter((i) => {
    const s = search.toLowerCase();
    const code = i.c_item_code?.toLowerCase() || "";
    const name = i.item_name?.toLowerCase() || "";
    const batch = i.batch_no?.toLowerCase() || "";
    return code.includes(s) || name.includes(s) || batch.includes(s);
  });

  /* ---------------- IMAGE ---------------- */
  const pickImage = async () => {
    if (isWeb) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled) {
      setForm((p) => ({ ...p, image: res.assets[0].uri }));
    }
  };

  const handleWebFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm((p) => ({ ...p, image: file }));
    }
  };

  const handlePrev = () => {
    if (page > 1 && !loading) fetchStockItems(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages && !loading) fetchStockItems(page + 1);
  };

  /* ---------------- EDIT ---------------- */
  const openEdit = (item) => {
    setSelectedItem(item);
    setForm({
      ...item,
      image: item.image || "",
      description: item.description || "",
    });
    setEditModal(true);
  };

  const handleUpdate = async () => {
    try {
      const formData = new FormData();
      formData.append("c_item_code", form.c_item_code || "");
      formData.append("item_name", form.item_name || "");
      formData.append("item_qty_per_box", form.item_qty_per_box || "");
      formData.append("batch_no", form.batch_no || "");
      formData.append("stock_bal_qty", form.stock_bal_qty || "");
      formData.append("expiry_date", form.expiry_date || "");
      formData.append("mrp", form.mrp || "");
      formData.append("mrpbox", form.mrpbox || "");
      formData.append("sale_rate", form.sale_rate || "");
      formData.append("description", form.description || "");

      if (form.image) {
        if (Platform.OS === "web" && form.image instanceof File) {
          formData.append("image", form.image);
        } else if (form.image.uri) {
          formData.append("image", {
            uri: form.image.uri,
            name: "photo.jpg",
            type: "image/jpeg",
          });
        }
      }

      const res = await fetch(
        `${API_BASE}/stock-details/edit/${selectedItem.id}`,
        { method: "PUT", body: formData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setEditModal(false);
      fetchStockItems();
      showAlert("Success", "Updated successfully");
    } catch (err) {
      showAlert("Error", err.message);
    }
  };

  const handleSelectStockForCustomer = async () => {
    try {
      if (selectedItems.length === 0) {
        showAlert("Info", "Select at least one stock item");
        return;
      }
      const res = await fetch(
        `https://napi.bharatmedicalhallplus.com/medicine/stock-batches/bulk-visibility`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: selectedItems,
            is_visible_to_customer: true,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStockItems((prev) =>
        prev.map((item) =>
          selectedItems.includes(item.id)
            ? { ...item, is_visible_to_customer: true }
            : item
        )
      );
      setSelectedItems([]);
      showAlert("Success", "Stock selected for customer app");
    } catch (err) {
      showAlert("Error", err.message);
    }
  };

  /* ---------------- CARD RENDER ---------------- */
  const renderCard = ({ item, index }) => {
    const isSelected = selectedItems.includes(item.id);
    return (
      <View style={[styles.stockCard, isSelected && styles.stockCardSelected]}>
        {/* Top row: checkbox + code */}
        <View style={styles.cardTopRow}>
          <View style={styles.checkboxRow}>
            <CheckBoxUI
              value={isSelected}
              onChange={() => toggleSelectItem(item.id)}
            />
            <View style={styles.indexBadge}>
              <Text style={styles.indexBadgeText}>{index + 1}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editChip} onPress={() => openEdit(item)}>
            <Feather name="edit-2" size={13} color="#fff" />
            <Text style={styles.editChipText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Item name & code */}
        <Text style={styles.cardItemName} numberOfLines={2}>{item.item_name}</Text>
        <Text style={styles.cardCode}>Code: {item.c_item_code}</Text>

        {/* Image row */}
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        ) : null}

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Qty/Box</Text>
            <Text style={styles.infoValue}>{item.item_qty_per_box || "-"}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Batch</Text>
            <Text style={styles.infoValue}>{item.batch_no || "-"}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Stock</Text>
            <Text style={[styles.infoValue, { color: "#059669" }]}>{item.stock_bal_qty || "-"}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>MRP</Text>
            <Text style={styles.infoValue}>₹{Number(item.mrp || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Rate</Text>
            <Text style={styles.infoValue}>₹{Number(item.sale_rate || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Expiry</Text>
            <Text style={styles.infoValue}>
              {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : "-"}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>EcoGreen Stock</Text>
            <Text style={styles.subtitle}>{filteredStock.length} items found</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={18} color="#94A3B8" />
            <TextInput
              placeholder="Search by code, name or batch..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>
        </View>

        {/* Action Bar */}
        {selectedItems.length > 0 && (
          <TouchableOpacity style={styles.selectForCustomerBtn} onPress={handleSelectStockForCustomer}>
            <Feather name="eye" size={16} color="#fff" />
            <Text style={styles.selectForCustomerText}>
              Show {selectedItems.length} in App
            </Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loaderText}>Loading stock...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredStock}
            renderItem={renderCard}
            keyExtractor={(i) => i.id.toString()}
            key={numColumns}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 4 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Pagination */}
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
            onPress={handlePrev}
            disabled={page === 1}
          >
            <Feather name="chevron-left" size={18} color={page === 1 ? "#94A3B8" : "#fff"} />
            <Text style={[styles.pageText, page === 1 && styles.pageTextDisabled]}>Prev</Text>
          </TouchableOpacity>

          <View style={styles.pageInfoPill}>
            <Text style={styles.pageInfoText}>{page} / {totalPages}</Text>
          </View>

          <TouchableOpacity
            style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
            onPress={handleNext}
            disabled={page === totalPages}
          >
            <Text style={[styles.pageText, page === totalPages && styles.pageTextDisabled]}>Next</Text>
            <Feather name="chevron-right" size={18} color={page === totalPages ? "#94A3B8" : "#fff"} />
          </TouchableOpacity>
        </View>

        {/* EDIT MODAL */}
        <Modal transparent visible={editModal} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { width: isMobile ? "94%" : 480 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Stock Item</Text>
                <TouchableOpacity onPress={() => setEditModal(false)}>
                  <Feather name="x" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                {Object.keys(form).map((key) => {
                  if (key === "image") return null;
                  return (
                    <View key={key} style={styles.modalInputWrap}>
                      <Text style={styles.modalLabel}>{key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Text>
                      <TextInput
                        placeholder={key}
                        placeholderTextColor="#94A3B8"
                        value={String(form[key] || "")}
                        onChangeText={(t) => setForm((p) => ({ ...p, [key]: t }))}
                        style={styles.modalInput}
                      />
                    </View>
                  );
                })}

                <Text style={styles.modalLabel}>Upload Image</Text>
                {isWeb ? (
                  <input type="file" onChange={handleWebFile} style={{ marginBottom: 12 }} />
                ) : (
                  <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                    <Feather name="upload" size={16} color="#fff" />
                    <Text style={styles.uploadBtnText}>Pick Image</Text>
                  </TouchableOpacity>
                )}

                {form.image ? (
                  <Image source={{ uri: typeof form.image === "string" ? form.image : undefined }} style={styles.preview} />
                ) : null}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setEditModal(false)}>
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveModalBtn} onPress={handleUpdate}>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.saveModalText}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default AdminEcoGreenStockData;

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 1 },

  searchRow: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: "#0F172A" },

  selectForCustomerBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  selectForCustomerText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { marginTop: 10, color: "#64748B", fontWeight: "600" },

  // Card styles
  stockCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  stockCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#F0F7FF",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  indexBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  indexBadgeText: { fontSize: 11, fontWeight: "700", color: "#64748B" },
  editChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editChipText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  cardItemName: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 2 },
  cardCode: { fontSize: 12, color: "#64748B", marginBottom: 8 },
  cardImage: { width: "100%", height: 120, borderRadius: 10, marginBottom: 10 },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  infoCell: {
    width: "30%",
    marginBottom: 8,
    minWidth: 80,
  },
  infoLabel: { fontSize: 10, color: "#94A3B8", textTransform: "uppercase", fontWeight: "600" },
  infoValue: { fontSize: 13, fontWeight: "700", color: "#1E293B", marginTop: 2 },
  cardDesc: { fontSize: 12, color: "#64748B", marginTop: 8, fontStyle: "italic" },

  // Pagination
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 12,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 4,
  },
  pageBtnDisabled: { backgroundColor: "#E2E8F0" },
  pageText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  pageTextDisabled: { color: "#94A3B8" },
  pageInfoPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pageInfoText: { fontSize: 13, fontWeight: "700", color: "#475569" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    maxHeight: "88%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  modalInputWrap: { marginBottom: 12 },
  modalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
    textTransform: "capitalize",
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  uploadBtn: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    gap: 8,
  },
  uploadBtnText: { color: "#fff", fontWeight: "600" },
  preview: { width: 80, height: 80, borderRadius: 10, marginTop: 6 },
  modalActions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 10,
  },
  cancelModalBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelModalText: { color: "#475569", fontWeight: "600" },
  saveModalBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#059669",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveModalText: { color: "#fff", fontWeight: "700" },
});
