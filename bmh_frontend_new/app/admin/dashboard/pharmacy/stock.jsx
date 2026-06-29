import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, Alert, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

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

const StockDetailsScreen = () => {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const router = useRouter();
  const fileInputRefStock = useRef(null);

  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    inputDateTime: '', c2Code: '', storeId: '', prodCode: '', itemCodes: '',
  });

  const [newStock, setNewStock] = useState({
    c_item_code: '', item_name: '', item_qty_per_box: '', batch_no: '',
    stock_bal_qty: '', expiry_date: ''
  });

  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;

  const filteredData = stockData.filter(item =>
    item.item_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.c_item_code?.toLowerCase().includes(search.toLowerCase())
  );

  const currentItems = filteredData;

  const handleSaveStock = async () => {
    try {
      const { c_item_code, item_name, item_qty_per_box, batch_no, stock_bal_qty, expiry_date } = newStock;
      if (!c_item_code || !item_name || !item_qty_per_box || !stock_bal_qty) {
        alert('Please fill all required fields.');
        return;
      }

      const response = await fetch('https://hospitaldatabasemanagement.onrender.com/ecogreensingleapis/add-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStock),
      });

      const data = await response.json();

      if (data.success) {
        alert('Stock added successfully!');
        setShowForm(false);

        setStockData(prev => [
          ...prev,
          {
            id: data.stock.id.toString(),
            code: data.stock.c_item_code,
            name: data.stock.item_name,
            qtyBox: data.stock.item_qty_per_box,
            batch: data.stock.batch_no,
            balance: data.stock.stock_bal_qty,
            expiry: data.stock.expiry_date,
            status: null,
            expiryStatus: null
          }
        ]);

        setNewStock({
          c_item_code: '', item_name: '', item_qty_per_box: '', batch_no: '',
          stock_bal_qty: '', expiry_date: '', mrp: '', mrpbox: '', sale_rate: ''
        });
      } else {
        alert(data.error || 'Failed to add stock.');
      }
    } catch (err) {
      console.error(err);
      alert('Server error. Please try again.');
    }
  };

  const handleStockBulkUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "https://hospitaldatabasemanagement.onrender.com/ecogreenbulkupload/stockbulk-upload-csv",
        {
          method: "POST",
          body: formData,
        }
      );
      const result = await response.json();
      if (response.ok) {
        alert(`Successfully uploaded ${result.totalStocks} stock records!`);
      } else {
        alert(result.error || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
  };

  const handleFetchStock = async (page = 1) => {
    try {
      setLoading(true);

      const itemsArray = filters.itemCodes
        ? filters.itemCodes.split(',').map(c => c.trim()).filter(Boolean)
        : [];

      const requestBody = {
        c2Code: String(filters.c2Code || ""),
        storeId: String(filters.storeId || ""),
        prodCode: String(filters.prodCode || ""),
        itemCodes: itemsArray,
        inputDateTime: String(filters.inputDateTime || ""),
        page,
        limit: rowsPerPage,
      };

      const response = await fetch(
        "https://hospitaldatabasemanagement.onrender.com/ecogreen/stock-details",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      const formatted = (data.stockItems || []).map((item, index) => ({
        id: `${page}-${index}`,
        c_item_code: item.c_item_code,
        item_name: item.itemName,
        item_qty_per_box: item.itemQtyPerBox,
        batch_no: item.batchNo,
        stock_bal_qty: item.stockBalQty,
        expiry_date: item.expiryDate,
        mrp: item.mrp,
        mrpbox: item.mrpbox,
        sale_rate: item.saleRate,
      }));

      setStockData(formatted);
      setCurrentPage(page);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.totalItems || 0);

    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to fetch stock");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    handleFetchStock(newPage);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.mainTitle}>Stock Details</Text>
            <Text style={styles.subTitle}>View current stock levels and batch information</Text>
          </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* FILTERS */}
          <View style={[styles.card, shadow]}>
            <Text style={styles.cardTitle}>Filters</Text>
            <View style={styles.filterRow}>
              <FilterInput label="c2Code" placeholder="c2Code" value={filters.c2Code} onChange={val => setFilters({ ...filters, c2Code: val })} />
              <FilterInput label="storeId" placeholder="storeId" value={filters.storeId} onChange={val => setFilters({ ...filters, storeId: val })} />
              <FilterInput label="prodCode" placeholder="prodCode" value={filters.prodCode} onChange={val => setFilters({ ...filters, prodCode: val })} />
              <FilterInput label="Item Codes" placeholder="ITM001,ITM002" value={filters.itemCodes} onChange={val => setFilters({ ...filters, itemCodes: val })} />
              <FilterInput label="Input Date/Time (with seconds)" type="datetime-local" value={filters.inputDateTime} onChange={val => setFilters({ ...filters, inputDateTime: val })} step="1" />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.fetchButton} onPress={() => handleFetchStock(1)}>
                <Text style={styles.buttonText}>{loading ? "Fetching..." : "🔍 Fetch Stock"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
                <Text style={styles.buttonText}>➕ Add Stock</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bulkUploadButton} onPress={() => fileInputRefStock.current.click()}>
                <Text style={styles.buttonText}>📦 Bulk Upload</Text>
              </TouchableOpacity>
              <input type="file" accept=".xlsx,.xls,.csv" ref={fileInputRefStock} style={{ display: 'none' }} onChange={handleStockBulkUpload} />
            </View>
          </View>

          {/* STOCK TABLE */}
          <View style={[styles.card, shadow, { marginTop: 20, padding: 0 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.columnHeader, { width: 100 }]}>Item Code</Text>
                  <Text style={[styles.columnHeader, { width: 200 }]}>Item Name</Text>
                  <Text style={[styles.columnHeader, { width: 100 }]}>Qty/Box</Text>
                  <Text style={[styles.columnHeader, { width: 120 }]}>Batch No</Text>
                  <Text style={[styles.columnHeader, { width: 120 }]}>Balance</Text>
                  <Text style={[styles.columnHeader, { width: 150 }]}>Expiry Date</Text>
                  <Text style={[styles.columnHeader, { width: 150 }]}>MRP</Text>
                  <Text style={[styles.columnHeader, { width: 150 }]}>MRP Box</Text>
                  <Text style={[styles.columnHeader, { width: 150 }]}>Sales Rate</Text>
                </View>

                {currentItems.map(item => (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={[styles.cellText, { width: 100 }]}>{item.code || item.c_item_code}</Text>
                    <Text style={[styles.cellText, { width: 200 }]}>{item.name || item.item_name}</Text>
                    <Text style={[styles.cellText, { width: 100 }]}>{item.qtyBox || item.item_qty_per_box}</Text>
                    <Text style={[styles.cellText, { width: 120 }]}>{item.batch_no}</Text>
                    <View style={[styles.cellContainer, { width: 120, flexDirection: 'row' }]}>
                      <Text style={styles.cellText}>{item.balance || item.stock_bal_qty}</Text>
                    </View>
                    <Text style={[styles.cellText, { width: 150 }]}>{item.expiry || item.expiry_date}</Text>
                    <Text style={[styles.cellText, { width: 150 }]}>{item.mrp || item.mrp}</Text>
                    <Text style={[styles.cellText, { width: 150 }]}>{item.mrpbox || item.mrpbox}</Text>
                    <Text style={[styles.cellText, { width: 150 }]}>{item.sale_rate || item.sale_rate}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.paginationRow}>
              <TouchableOpacity style={styles.pageBtn} onPress={() => { if (currentPage > 1) handleFetchStock(currentPage - 1); }} disabled={currentPage === 1}>
                <Text style={styles.pageBtnText}>⬅ Prev</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>Page {currentPage} of {totalPages} ({totalItems} records)</Text>
              <TouchableOpacity style={styles.pageBtn} onPress={() => handleFetchStock(currentPage + 1)} disabled={currentPage === totalPages}>
                <Text style={styles.pageBtnText}>Next ➡</Text>
              </TouchableOpacity>
              <View style={styles.rowsPerPage}>
                <Text style={styles.pageInfo}>Rows:</Text>
                <TextInput
                  style={styles.rowsInput}
                  keyboardType="numeric"
                  value={rowsPerPage.toString()}
                  onChangeText={(val) => {
                    const num = parseInt(val) || 1;
                    setRowsPerPage(num);
                    setCurrentPage(1);
                  }}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal visible={showForm} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderTitle}>
              <Text style={styles.modalTitle}>Add Stock Entry</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Feather name="x" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <View style={styles.formGrid}>
                <FormInput label="Item Code" value={newStock.c_item_code} onChangeText={t => setNewStock({ ...newStock, c_item_code: t })} />
                <FormInput label="Item Name" value={newStock.item_name} onChangeText={t => setNewStock({ ...newStock, item_name: t })} />
                <FormInput label="Qty Per Box" keyboardType="numeric" value={newStock.item_qty_per_box} onChangeText={t => setNewStock({ ...newStock, item_qty_per_box: t })} />
                <FormInput label="Batch Number" value={newStock.batch_no} onChangeText={t => setNewStock({ ...newStock, batch_no: t })} />
                <FormInput label="Stock Balance Qty" keyboardType="numeric" value={newStock.stock_bal_qty} onChangeText={t => setNewStock({ ...newStock, stock_bal_qty: t })} />
                <FormInput label="Expiry Date" placeholder="YYYY-MM-DD" value={newStock.expiry_date} onChangeText={t => setNewStock({ ...newStock, expiry_date: t })} />
                <FormInput label="MRP" keyboardType="numeric" value={newStock.mrp} onChangeText={t => setNewStock({ ...newStock, mrp: t })} />
                <FormInput label="MRP Box" keyboardType="numeric" value={newStock.mrpbox} onChangeText={t => setNewStock({ ...newStock, mrpbox: t })} />
                <FormInput label="Sale Rate" keyboardType="numeric" value={newStock.sale_rate} onChangeText={t => setNewStock({ ...newStock, sale_rate: t })} />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowForm(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveStock}><Text style={styles.saveButtonText}>Save Stock</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const FilterInput = ({ label, placeholder, type = "text", value, onChange, step }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    {Platform.OS === 'web' && type === "datetime-local" ? (
      <input
        style={webInputStyle}
        type={type}
        step={step || "1"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChange}
      />
    )}
  </View>
);

const FormInput = ({ label, ...props }) => (
  <View style={styles.formInputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={styles.input} {...props} placeholderTextColor={COLORS.textMuted} />
  </View>
);

const webInputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1.5px solid ${COLORS.border}`,
  backgroundColor: COLORS.surface, fontSize: '14px', outlineWidth: 0, color: COLORS.text
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 48,
    paddingBottom: 20,
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

  mainContent: { flex: 1 },
  scrollContent: { padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16, color: COLORS.text },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  inputGroup: { flex: 1, minWidth: 200, marginBottom: 10 },
  label: { marginBottom: 8, fontWeight: '700', color: COLORS.text, fontSize: 13 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 16, height: 48, backgroundColor: COLORS.surface,
    color: COLORS.text, fontSize: 14,
    ...Platform.select({ web: { outlineWidth: 0 } })
  },

  buttonRow: { flexDirection: 'row', marginTop: 16, gap: 12, flexWrap: 'wrap' },
  fetchButton: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  bulkUploadButton: { backgroundColor: COLORS.warning, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  addButton: { backgroundColor: COLORS.success, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.surface, width: '90%', maxWidth: 800, maxHeight: '90%', borderRadius: 20, padding: 24 },
  modalHeaderTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  formScroll: { flex: 1 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  formInputGroup: { width: '48%', minWidth: 250, marginBottom: 10 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: "#F1F5F9", justifyContent: 'center' },
  cancelButtonText: { color: COLORS.text, fontWeight: '700' },
  saveButton: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, justifyContent: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '700' },

  tableHeader: { flexDirection: 'row', backgroundColor: "#F8FAFC", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  columnHeader: { fontWeight: '800', color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  cellText: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  cellContainer: { alignItems: 'flex-start' },

  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: COLORS.surface, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  pageBtn: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: COLORS.primary, borderRadius: 10 },
  pageBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  pageInfo: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  rowsPerPage: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowsInput: { borderWidth: 1.5, borderColor: COLORS.border, width: 50, height: 36, textAlign: 'center', borderRadius: 8, fontSize: 14, color: COLORS.text, backgroundColor: '#F8FAFC' }
});

export default StockDetailsScreen;