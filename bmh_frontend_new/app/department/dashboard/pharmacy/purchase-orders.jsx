import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  SafeAreaView,
  useWindowDimensions,
  FlatList,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from 'expo-router';

const BASE_URL = "https://napi.bharatmedicalhallplus.com";

const BRAND = {
  deep: '#1E3A8A',
  primary: '#004990',
  light: '#6BA4E7',
  gold: '#C9A646',
  goldSoft: '#E9D27A',
  bg: '#F4F7FC',
  surface: '#FFFFFF',
  ink: '#0F1F3D',
  muted: '#6B7A99',
  border: '#E3E9F4',
  danger: '#E54848',
  success: '#10B981',
  warn: '#F59E0B',
};

export default function AdminPurchaseOrder() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isMobile = SCREEN_WIDTH < 768;

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [newPO, setNewPO] = useState({ supplier: "", delivery_type: "", received_date: "" });
  const [itemInputs, setItemInputs] = useState([{ medicine_id: "", stock: "", unitPrice: "" }]);
  const [medicines, setMedicines] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});

  // ========== ALERT ==========
  const showAlert = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      alert(`${title}\n\n${message}`);
    }
  };

  // ========== FETCH DATA ==========
  const fetchMedicines = async () => {
    try {
      const res = await fetch(`${BASE_URL}/medicine/all`);
      const data = await res.json();
      setMedicines(data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchPOs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/purchase-orders/all`);
      const data = await res.json();
      if (data.success) setPurchaseOrders(data.data);
    } catch (err) {
      showAlert("Error", "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryBoys = async () => {
    try {
      const res = await fetch(`${BASE_URL}/employee/all`);
      const data = await res.json();
      if (data.success) {
        const deliveryBoysData = data.employees
          .filter((e) => e.role?.toLowerCase() === "hd delivery")
          .map((e) => ({ id: e.id, name: e.full_name }));
        setDeliveryBoys(deliveryBoysData);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const res = await fetch(`${BASE_URL}/purchaseorderfields/all`);
      const data = await res.json();
      if (data.success) {
        setCustomFields(data.fields || []);
        const initialValues = {};
        (data.fields || []).forEach((f) => (initialValues[f.field_name] = ""));
        setCustomFieldValues(initialValues);
      }
    } catch (err) {
      console.error("Failed to fetch custom fields:", err);
    }
  };

  useEffect(() => {
    fetchPOs();
    fetchMedicines();
    fetchDeliveryBoys();
    fetchCustomFields();
  }, []);

  // ========== INPUT ROWS ==========
  const removeInputRow = (index) => setItemInputs(itemInputs.filter((_, i) => i !== index));
  const addInputRow = () => setItemInputs([...itemInputs, { medicine_id: "", stock: "", unitPrice: "" }]);
  const updateInputRow = (index, field, value) => {
    const updated = [...itemInputs];
    updated[index][field] = value;
    setItemInputs(updated);
  };

  // ========== CREATE SINGLE PO ==========
  const handleAddPO = async () => {
    const filledItems = itemInputs
      .filter(item => item.medicine_id !== "")
      .map((item) => {
        const selectedMedicine = medicines.find((med) => String(med.id) === String(item.medicine_id));
        return {
          medicine_id: parseInt(item.medicine_id, 10),
          name: selectedMedicine?.name || "",
          stock: parseInt(item.stock, 10) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
        };
      });

    if (!newPO.supplier || !newPO.delivery_type || filledItems.length === 0) {
      showAlert("Validation", "Supplier, delivery type, and at least one item are required");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/purchase-orders/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: newPO.supplier,
          delivery_type: newPO.delivery_type,
          received_date: newPO.received_date,
          assignedto: newPO.delivery_boy || null,
          status: "Pending",
          items: filledItems,
          custom_fields: customFieldValues,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setModalVisible(false);
        setNewPO({ supplier: "", delivery_type: "", received_date: "" });
        setItemInputs([{ medicine_id: "", stock: "", unitPrice: "" }]);
        fetchPOs();
        showAlert("Success", "Purchase Order created");
      } else {
        showAlert("Error", "Failed: " + (data.message || ""));
      }
    } catch (err) {
      console.error(err);
      showAlert("Error", "Failed to create purchase order");
    }
  };

  // ========== RECEIVE PO ==========
  const handleReceivePO = async (po) => {
    try {
      if (!po.purchase_items || po.purchase_items.length === 0) {
        showAlert("Error", "No items in this PO to receive.");
        return;
      }
      const stockUpdates = po.purchase_items.map((item) => ({
        medicine_id: item.medicine_id,
        stock: item.stock,
      }));

      const res = await fetch(`${BASE_URL}/purchase-orders/receive/${po.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          received_date: new Date().toISOString(),
          items: stockUpdates,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showAlert("Success", "Purchase order received and stock updated.");
        fetchPOs();
        fetchMedicines();
      } else {
        showAlert("Error", data.message || "Failed to receive PO");
      }
    } catch (err) {
      console.error(err);
      showAlert("Error", "Something went wrong while receiving PO");
    }
  };

  // ========== WEB EXCEL FILE UPLOAD ==========
  const handleFileUpload = async (e) => {
    if (Platform.OS !== "web") return;
    const file = e.target.files[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const formattedOrders = sheetData.map((row) => {
          let formattedDate = row.received_date;
          if (row.received_date instanceof Date) {
            formattedDate = row.received_date.toISOString();
          } else if (!row.received_date) {
            formattedDate = new Date().toISOString();
          }
          return {
            supplier: String(row.supplier || "Unknown"),
            delivery_type: String(row.delivery_type || "Standard"),
            received_date: formattedDate,
            assignedto: row.delivery_boy ? String(row.delivery_boy) : null,
            status: "Pending",
            purchase_items: [{
              medicine_id: parseInt(row.medicine_id, 10),
              stock: parseInt(row.stock, 10) || 0,
              unitPrice: parseFloat(row.unitPrice) || 0,
              name: String(row.medicine_name || "")
            }]
          };
        });

        try {
          const res = await fetch(`${BASE_URL}/purchase-orders/bulk-add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ purchaseOrders: formattedOrders }),
          });
          const result = await res.json();
          if (result.success) {
            showAlert("Success", "Bulk purchase orders inserted successfully");
            fetchPOs();
          } else {
            showAlert("Error", "Server Error: " + (result.detail || result.message));
          }
        } catch (err) {
          console.error("Upload Error:", err);
          showAlert("Error", "Network error: Could not reach the server.");
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error("XLSX load error:", err);
      showAlert("Error", "Excel processing failed.");
    }
  };

  const getStatusColor = (status) => {
    return status === "Received"
      ? { bg: '#D1FAE5', text: '#065F46', dot: BRAND.success }
      : { bg: '#FEF3C7', text: '#92400E', dot: BRAND.warn };
  };

  // ========== RENDER MOBILE CARD ==========
  const renderMobileCard = ({ item }) => {
    const sc = getStatusColor(item.status);
    const itemsText = item.purchase_items?.map((i) => `${i.name} (x${i.stock})`).join(", ") || "No items";

    return (
      <View style={S.mobileCard}>
        <View style={S.mobileCardHeader}>
          <View style={S.mobileAvatarWrap}>
            <Text style={S.mobileAvatarText}>{(item.supplier || "?").charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={S.mobileName}>{item.supplier}</Text>
            <Text style={S.mobileSub}>PO: {item.purchase_no}</Text>
          </View>
          <View style={[S.statusPill, { backgroundColor: sc.bg }]}>
            <View style={[S.statusDot, { backgroundColor: sc.dot }]} />
            <Text style={[S.statusPillText, { color: sc.text }]}>{item.status}</Text>
          </View>
        </View>

        <View style={S.mobileCardBody}>
          <View style={S.mobileInfoRow}>
            <Feather name="truck" size={13} color={BRAND.muted} />
            <Text style={S.mobileInfoText}>Delivery: {item.delivery_type}</Text>
          </View>
          {item.received_date ? (
            <View style={S.mobileInfoRow}>
              <Feather name="calendar" size={13} color={BRAND.muted} />
              <Text style={S.mobileInfoText}>Expected: {new Date(item.received_date).toLocaleDateString()}</Text>
            </View>
          ) : null}
          <View style={S.mobileInfoRow}>
            <Feather name="package" size={13} color={BRAND.muted} />
            <Text style={S.mobileInfoText} numberOfLines={2}>{itemsText}</Text>
          </View>
        </View>

        {item.status !== "Received" && (
          <View style={S.mobileActions}>
            <TouchableOpacity style={S.receiveBtnMobile} onPress={() => handleReceivePO(item)}>
              <Feather name="check-square" size={14} color="#fff" />
              <Text style={S.receiveBtnMobileText}>Mark as Received</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ========== RENDER DESKTOP ROW ==========
  const renderTableRow = ({ item, index }) => {
    const sc = getStatusColor(item.status);
    const itemsText = item.purchase_items?.map((i) => `${i.name} (x${i.stock})`).join(", ") || "—";
    return (
      <View style={[S.tableRow, { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }]}>
        <Text style={[S.cell, { flex: 0.8, fontWeight: '700', color: BRAND.ink }]}>{item.purchase_no}</Text>
        <Text style={[S.cell, { flex: 1.5 }]} numberOfLines={1}>{item.supplier}</Text>
        <Text style={[S.cell, { flex: 1.2 }]} numberOfLines={1}>{item.delivery_type}</Text>
        <View style={[S.cell, { flex: 1 }]}>
          <View style={[S.statusPill, { backgroundColor: sc.bg }]}>
            <View style={[S.statusDot, { backgroundColor: sc.dot }]} />
            <Text style={[S.statusPillText, { color: sc.text }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={[S.cell, { flex: 2.2 }]} numberOfLines={2}>{itemsText}</Text>
        <View style={[S.cell, { flex: 1, alignItems: 'flex-end' }]}>
          {item.status !== "Received" ? (
            <TouchableOpacity style={S.receiveActionBtn} onPress={() => handleReceivePO(item)}>
              <Text style={S.receiveActionBtnText}>Receive</Text>
            </TouchableOpacity>
          ) : (
            <Feather name="check" size={18} color={BRAND.success} style={{ marginRight: 15 }} />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={S.root}>
      {/* HEADER */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>Purchase Orders</Text>
          <Text style={S.headerSub}>Manage vendor procurements and inventory intake</Text>
        </View>
        <TouchableOpacity style={S.createBtn} onPress={() => setModalVisible(true)}>
          <Feather name="plus" size={15} color="#fff" />
          <Text style={S.createBtnText}>Create PO</Text>
        </TouchableOpacity>
      </View>

      {/* STATS STRIP */}
      <View style={S.statsStrip}>
        <View style={S.statItem}>
          <Text style={S.statLabel}>Total Orders</Text>
          <Text style={S.statValue}>{purchaseOrders.length}</Text>
        </View>
        <View style={S.statDivider} />
        <View style={[S.statItem]}>
          <Text style={S.statLabel}>Pending Intake</Text>
          <Text style={[S.statValue, { color: BRAND.warn }]}>
            {purchaseOrders.filter((po) => po.status !== "Received").length}
          </Text>
        </View>
        <View style={S.statDivider} />
        <View style={[S.statItem]}>
          <Text style={S.statLabel}>Received POs</Text>
          <Text style={[S.statValue, { color: BRAND.success }]}>
            {purchaseOrders.filter((po) => po.status === "Received").length}
          </Text>
        </View>
      </View>

      {/* CSV/EXCEL IMPORT FOR WEB */}
      {Platform.OS === "web" && (
        <View style={S.importPanel}>
          <Text style={S.importLabel}>Bulk Import Orders (Excel/CSV)</Text>
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileUpload}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              color: BRAND.ink,
              border: `1px solid ${BRAND.border}`,
              borderRadius: 8,
              backgroundColor: '#fff',
              cursor: 'pointer',
              marginTop: 6,
            }}
          />
        </View>
      )}

      {/* CONTENT LIST */}
      {loading ? (
        <View style={S.loaderContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={S.loaderText}>Loading purchase orders...</Text>
        </View>
      ) : isMobile ? (
        <FlatList
          data={purchaseOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMobileCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={S.emptyState}>
              <MaterialCommunityIcons name="clipboard-outline" size={48} color={BRAND.border} />
              <Text style={S.emptyTitle}>No Purchase Orders</Text>
              <Text style={S.emptySubtitle}>Click "Create PO" to log an order</Text>
            </View>
          }
        />
      ) : (
        <View style={S.tableCard}>
          {/* Table Header */}
          <View style={S.tableHeader}>
            <Text style={[S.headerCell, { flex: 0.8 }]}>PO #</Text>
            <Text style={[S.headerCell, { flex: 1.5 }]}>Supplier</Text>
            <Text style={[S.headerCell, { flex: 1.2 }]}>Delivery Type</Text>
            <Text style={[S.headerCell, { flex: 1 }]}>Status</Text>
            <Text style={[S.headerCell, { flex: 2.2 }]}>Items Summary</Text>
            <Text style={[S.headerCell, { flex: 1, textAlign: 'right', paddingRight: 15 }]}>Action</Text>
          </View>
          <FlatList
            data={purchaseOrders}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTableRow}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <View style={S.emptyState}>
                <MaterialCommunityIcons name="clipboard-outline" size={48} color={BRAND.border} />
                <Text style={S.emptyTitle}>No Purchase Orders found</Text>
              </View>
            }
          />
        </View>
      )}

      {/* CREATE PO MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={S.modalOverlay}>
          <View style={[S.modalCard, { width: Math.min(640, SCREEN_WIDTH - 32) }]}>
            <View style={S.modalHeader}>
              <View>
                <Text style={S.modalTitle}>New Purchase Order</Text>
                <Text style={S.modalSubTitle}>procurement log registration</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={S.modalCloseBtn}>
                <Ionicons name="close" size={20} color={BRAND.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={S.modalBody}>
                
                {/* Form Fields */}
                <Text style={S.fieldLabel}>Supplier Name *</Text>
                <TextInput
                  style={S.input}
                  placeholder="Enter supplier/vendor name"
                  placeholderTextColor={BRAND.muted}
                  value={newPO.supplier}
                  onChangeText={(t) => setNewPO({ ...newPO, supplier: t })}
                />

                <Text style={S.fieldLabel}>Delivery Type *</Text>
                <TextInput
                  style={S.input}
                  placeholder="e.g. Courier, Local Transport, Bus"
                  placeholderTextColor={BRAND.muted}
                  value={newPO.delivery_type}
                  onChangeText={(t) => setNewPO({ ...newPO, delivery_type: t })}
                />

                <Text style={S.fieldLabel}>Expected Received Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={S.input}
                  placeholder="e.g. 2026-06-15"
                  placeholderTextColor={BRAND.muted}
                  value={newPO.received_date}
                  onChangeText={(t) => setNewPO({ ...newPO, received_date: t })}
                />

                <Text style={S.fieldLabel}>Assign Delivery Boy</Text>
                <View style={S.pickerWrapper}>
                  <Picker
                    selectedValue={newPO.delivery_boy || ""}
                    onValueChange={(v) => setNewPO({ ...newPO, delivery_boy: v })}
                    style={{ height: 44, color: BRAND.ink }}
                  >
                    <Picker.Item label="Select Delivery Agent" value="" />
                    {deliveryBoys.map((boy) => (
                      <Picker.Item key={boy.id} label={boy.name} value={boy.id} />
                    ))}
                  </Picker>
                </View>

                {/* Custom Fields */}
                {customFields.map((field) => (
                  <View key={field.field_name}>
                    <Text style={S.fieldLabel}>
                      {field.field_name} {field.is_required ? "*" : ""}
                    </Text>
                    <TextInput
                      style={S.input}
                      placeholder={`Enter ${field.field_name.toLowerCase()}`}
                      placeholderTextColor={BRAND.muted}
                      value={customFieldValues[field.field_name] || ""}
                      onChangeText={(t) =>
                        setCustomFieldValues({ ...customFieldValues, [field.field_name]: t })
                      }
                    />
                  </View>
                ))}

                {/* Order Items */}
                <View style={S.itemsHeaderRow}>
                  <Text style={S.itemsTitle}>PO Items</Text>
                  <TouchableOpacity onPress={addInputRow} style={S.addItemBtn}>
                    <Feather name="plus-circle" size={14} color={BRAND.primary} />
                    <Text style={S.addItemBtnText}>Add Row</Text>
                  </TouchableOpacity>
                </View>

                {itemInputs.map((item, index) => (
                  <View key={index} style={S.itemRow}>
                    <View style={[S.pickerWrapper, { flex: 2.2, marginRight: 8 }]}>
                      <Picker
                        selectedValue={item.medicine_id}
                        onValueChange={(v) => updateInputRow(index, "medicine_id", v)}
                        style={{ height: 42, color: BRAND.ink }}
                      >
                        <Picker.Item label="Medicine" value="" />
                        {medicines.map((med) => (
                          <Picker.Item key={med.id} label={med.name} value={med.id} />
                        ))}
                      </Picker>
                    </View>
                    <TextInput
                      style={[S.input, { flex: 0.8, marginRight: 8, height: 42, marginBottom: 0 }]}
                      placeholder="Qty"
                      keyboardType="numeric"
                      value={item.stock}
                      onChangeText={(t) => updateInputRow(index, "stock", t)}
                    />
                    <TextInput
                      style={[S.input, { flex: 1, marginRight: 8, height: 42, marginBottom: 0 }]}
                      placeholder="Price"
                      keyboardType="numeric"
                      value={item.unitPrice}
                      onChangeText={(t) => updateInputRow(index, "unitPrice", t)}
                    />
                    {itemInputs.length > 1 && (
                      <TouchableOpacity onPress={() => removeInputRow(index)} style={S.itemRemoveBtn}>
                        <Feather name="trash-2" size={16} color={BRAND.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

              </View>
            </ScrollView>

            <View style={S.modalFooter}>
              <TouchableOpacity style={S.modalCloseAction} onPress={() => setModalVisible(false)}>
                <Text style={S.modalCloseActionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.submitBtn} onPress={handleAddPO}>
                <Text style={S.submitBtnText}>Create PO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 50 : 14,
    backgroundColor: BRAND.primary,
    gap: 12
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Stats Strip
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.surface,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    justifyContent: 'space-around'
  },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '700', color: BRAND.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '800', color: BRAND.ink, marginTop: 4 },
  statDivider: { width: 1, height: 26, backgroundColor: BRAND.border },

  // Import Panel (Web)
  importPanel: {
    padding: 16,
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    flexDirection: 'column'
  },
  importLabel: { fontSize: 12, fontWeight: '700', color: BRAND.ink },

  // Loader
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, color: BRAND.muted, fontWeight: '600' },

  // Mobile Card
  mobileCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  mobileCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: BRAND.bg },
  mobileAvatarWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#EBF2FF', justifyContent: 'center', alignItems: 'center' },
  mobileAvatarText: { fontSize: 17, fontWeight: '800', color: BRAND.primary },
  mobileName: { fontSize: 15, fontWeight: '700', color: BRAND.ink },
  mobileSub: { fontSize: 12, color: BRAND.muted, marginTop: 2 },
  mobileCardBody: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  mobileInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileInfoText: { fontSize: 13, color: BRAND.muted, flex: 1 },
  mobileActions: { padding: 12, borderTopWidth: 1, borderTopColor: BRAND.border },
  receiveBtnMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.primary,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  receiveBtnMobileText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Status/Badge styles
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },

  // Desktop Table
  tableCard: {
    flex: 1,
    backgroundColor: BRAND.surface,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    overflow: 'hidden',
    elevation: 2
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border
  },
  headerCell: { fontSize: 11, fontWeight: '800', color: BRAND.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: BRAND.bg },
  cell: { fontSize: 13, color: '#475569' },
  receiveActionBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  receiveActionBtnText: { color: BRAND.primary, fontSize: 12, fontWeight: '700' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: BRAND.ink, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: BRAND.muted, marginTop: 4 },

  // Modal styling
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: BRAND.surface, borderRadius: 20, overflow: 'hidden', elevation: 10 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: BRAND.ink },
  modalSubTitle: { fontSize: 11, fontWeight: '700', color: BRAND.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: BRAND.bg, justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 20 },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: BRAND.muted, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: BRAND.ink,
    backgroundColor: BRAND.bg,
    marginBottom: 4,
    ...Platform.select({ web: { outlineWidth: 0 } })
  },
  pickerWrapper: { borderWidth: 1, borderColor: BRAND.border, borderRadius: 10, backgroundColor: BRAND.bg, overflow: 'hidden' },
  itemsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  itemsTitle: { fontSize: 14, fontWeight: '800', color: BRAND.ink },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addItemBtnText: { color: BRAND.primary, fontSize: 13, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemRemoveBtn: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    gap: 12,
    backgroundColor: BRAND.bg
  },
  modalCloseAction: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: BRAND.border },
  modalCloseActionText: { color: BRAND.muted, fontWeight: '700', fontSize: 14 },
  submitBtn: { flex: 1.5, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: BRAND.primary },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
