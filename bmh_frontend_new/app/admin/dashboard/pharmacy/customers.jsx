import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  SafeAreaView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

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

const CustomerMasterScreen = () => {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newCustomer, setNewCustomer] = useState({
    brcode: '', lc_code: '', lc_name: '', added_date: '', age: '', gender: '',
    address1: '', address2: '', address3: '', city: '', pin: '', mobile_no: '', mail_id: '',
    parent_code: '', parent_name: ''
  });

  const [filters, setFilters] = useState({
    c2Code: '',
    storeId: '',
    prodCode: '',
    securityKey: '',
    fromDate: '',
    toDate: ''
  });

  // Filter local state based on name input
  const filteredCustomers = customers.filter(c =>
    c.lcName?.toLowerCase().includes(search.toLowerCase())
  );

  // Modal input fields setup
  const customerFormFields = [
    { key: 'brcode', label: 'BR Code', placeholder: 'e.g. BR001' },
    { key: 'lc_code', label: 'LC Code', placeholder: 'e.g. LC001' },
    { key: 'lc_name', label: 'Customer Name', placeholder: 'e.g. Rajesh Sharma' },
    { key: 'added_date', label: 'Added Date', placeholder: 'YYYY-MM-DD' },
    { key: 'age', label: 'Age', placeholder: 'e.g. 45', keyboardType: 'numeric' },
    { key: 'gender', label: 'Gender', placeholder: 'e.g. Male / Female' },
    { key: 'address1', label: 'Address Line 1', placeholder: 'Street details' },
    { key: 'address2', label: 'Address Line 2', placeholder: 'Area/Apartment' },
    { key: 'address3', label: 'Address Line 3', placeholder: 'Landmark' },
    { key: 'city', label: 'City', placeholder: 'e.g. Mumbai' },
    { key: 'pin', label: 'PIN Code', placeholder: 'e.g. 400001', keyboardType: 'numeric' },
    { key: 'mobile_no', label: 'Mobile Number', placeholder: 'e.g. 9876543210', keyboardType: 'numeric' },
    { key: 'mail_id', label: 'Email ID', placeholder: 'e.g. rajesh@email.com', keyboardType: 'email-address' },
    { key: 'parent_code', label: 'Parent Code', placeholder: 'e.g. PC001' },
    { key: 'parent_name', label: 'Parent Name', placeholder: 'e.g. Sharma Enterprises' },
  ];

  // --- Single Customer Save ---
  const handleSaveCustomer = async () => {
    try {
      const { brcode, lc_code, lc_name, added_date, age, gender } = newCustomer;
      if (!lc_name || !lc_code) {
        Alert.alert('Validation Error', 'Customer Name and LC Code are required.');
        return;
      }

      setSaving(true);
      const res = await fetch('https://hospitaldatabasemanagement.onrender.com/ecogreensingleapis/local-customer/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });

      if (res.ok) {
        const savedCustomer = await res.json();
        setCustomers(prev => [...prev, savedCustomer]);
        setShowForm(false);
        setNewCustomer({
          brcode: '', lc_code: '', lc_name: '', added_date: '', age: '', gender: '',
          address1: '', address2: '', address3: '', city: '', pin: '', mobile_no: '', mail_id: '',
          parent_code: '', parent_name: ''
        });
        Alert.alert('Success', 'Customer saved successfully!');
      } else {
        Alert.alert('Error', 'Failed to save customer');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Error saving customer');
    } finally {
      setSaving(false);
    }
  };

  // --- Bulk Upload ---
  const handleBulkUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const response = await fetch(
        "https://hospitaldatabasemanagement.onrender.com/ecogreenbulkupload/local-customer/bulk",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (response.ok) {
        Alert.alert('Success', `Successfully uploaded ${result.inserted} customers!`);
      } else {
        Alert.alert('Error', result.error || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch customers from backend (POST version) ---
  const fetchCustomers = async () => {
    const { c2Code, storeId, prodCode, fromDate, toDate } = filters;

    if (!c2Code || !storeId || !prodCode || !fromDate || !toDate) {
      Alert.alert('Validation Error', "Please fill all filter fields!");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        "https://hospitaldatabasemanagement.onrender.com/ecogreen/local-customers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            c2Code,
            storeId,
            prodCode,
            fromDate,
            toDate
          })
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to fetch customers");
      }

      const data = await res.json();
      setCustomers(data);
      Alert.alert('Success', `Fetched ${data.length} customers successfully!`);
    } catch (err) {
      console.error("Fetch Customers Error:", err.message);
      Alert.alert('Error', "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER WITH COLORS.primary BACKGROUND */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.mainTitle}>Local Customer Master</Text>
            <Text style={styles.subTitle}>View customer records from Ecogreen ERP</Text>
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
              <FilterInput label="From Date" type="date" placeholder="dd-mm-yyyy" value={filters.fromDate} onChange={val => setFilters({ ...filters, fromDate: val })} />
              <FilterInput label="To Date" type="date" placeholder="dd-mm-yyyy" value={filters.toDate} onChange={val => setFilters({ ...filters, toDate: val })} />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.fetchButton} onPress={fetchCustomers}>
                <Text style={styles.buttonText}>{loading ? "Fetching..." : "🔍 Fetch Customers"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
                <Text style={styles.buttonText}>➕ Add Single Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bulkUploadButton} onPress={() => fileInputRef.current.click()}>
                <Text style={styles.buttonText}>📦 Bulk Upload</Text>
              </TouchableOpacity>
              <input type="file" accept=".xlsx,.xls,.csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleBulkUpload} />
            </View>
          </View>

          {/* SEARCH & TABLE CARD */}
          <View style={[styles.card, shadow, { marginTop: 20, padding: 0 }]}>
            <View style={styles.searchBarWrapper}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.tableSearchInput}
                placeholder="Search registry records by name..."
                placeholderTextColor={COLORS.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* FULL WIDTH HORIZONTAL SCROLL TABLE */}
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={styles.tableHeader}>
                  {[
                    { label: "BR Code", width: 100 },
                    { label: "LC Code", width: 100 },
                    { label: "Name", width: 180 },
                    { label: "Added Date", width: 120 },
                    { label: "Age", width: 80 },
                    { label: "Gender", width: 100 },
                    { label: "Address1", width: 150 },
                    { label: "Address2", width: 150 },
                    { label: "Address3", width: 150 },
                    { label: "City", width: 120 },
                    { label: "PIN", width: 100 },
                    { label: "Mobile", width: 120 },
                    { label: "Email", width: 180 },
                    { label: "Parent Code", width: 120 },
                    { label: "Parent Name", width: 180 }
                  ].map((col, i) => (
                    <Text key={i} style={[styles.columnHeader, { width: col.width }]}>{col.label}</Text>
                  ))}
                </View>

                {filteredCustomers.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No registered customer logs found.</Text>
                  </View>
                ) : (
                  filteredCustomers.map((c, i) => (
                    <View key={i} style={styles.tableRow}>
                      {[
                        { val: c.brcode, width: 100 },
                        { val: c.lcCode, width: 100 },
                        { val: c.lcName, width: 180 },
                        { val: c.addedDate, width: 120 },
                        { val: c.age, width: 80 },
                        { val: c.gender, width: 100 },
                        { val: c.address1, width: 150 },
                        { val: c.address2, width: 150 },
                        { val: c.address3, width: 150 },
                        { val: c.city, width: 120 },
                        { val: c.pin, width: 100 },
                        { val: c.mobileNo, width: 120 },
                        { val: c.mailId, width: 180 },
                        { val: c.parentCode, width: 120 },
                        { val: c.parentName, width: 180 }
                      ].map((cell, idx) => (
                        <Text key={idx} style={[styles.cellText, { width: cell.width }]} numberOfLines={1}>
                          {cell.val || "—"}
                        </Text>
                      ))}
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* SINGLE CUSTOMER ENTRY FORM MODAL */}
      <Modal visible={showForm} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderTitle}>
              <Text style={styles.modalTitle}>Add Customer Entry</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Feather name="x" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <View style={styles.formGrid}>
                {customerFormFields.map((field) => (
                  <FormInput
                    key={field.key}
                    label={field.label}
                    placeholder={field.placeholder}
                    keyboardType={field.keyboardType || 'default'}
                    value={newCustomer[field.key]}
                    onChangeText={t => setNewCustomer({ ...newCustomer, [field.key]: t })}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveCustomer} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Customer"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const FilterInput = ({ label, placeholder, type = "text", value, onChange }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    {Platform.OS === 'web' && type === "date" ? (
      <input
        style={webInputStyle}
        type={type}
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
  backgroundColor: COLORS.surface, fontSize: '14px', outline: 'none', color: COLORS.text, boxSizing: 'border-box'
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
    ...Platform.select({ web: { outlineStyle: "none" } })
  },

  buttonRow: { flexDirection: 'row', marginTop: 16, gap: 12, flexWrap: 'wrap' },
  fetchButton: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  bulkUploadButton: { backgroundColor: COLORS.warning, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  addButton: { backgroundColor: COLORS.success, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchIcon: { marginRight: 10 },
  tableSearchInput: { flex: 1, fontSize: 14, color: COLORS.text, ...Platform.select({ web: { outlineStyle: "none" } }) },

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

  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' }
});

export default CustomerMasterScreen;