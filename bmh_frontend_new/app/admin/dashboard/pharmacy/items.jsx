import React, { useState ,useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, Platform, SafeAreaView } from 'react-native';
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

const ItemMasterScreen = () => {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    c2Code: '', storeId: '', prodCode: '', dateTime: ''
  });
  const fileInputRef = useRef(null);

const [tableData, setTableData] = useState([]);
const [loading, setLoading] = useState(false);

  // State for the Add Item Form
  const [newItem, setNewItem] = useState({
    item_code: '', item_name: '', item_short_name: '', item_full_name: '',
    brand_code: '', brand_name: '', category_code: '', category_name: '',
    content_code: '', content_name: '', pack_code: '', pack_name: '',
    item_qty_per_box: '', item_added_date: '', item_updated_date: '',
    hsn_sac_code: '', hsn_sac_name: '',  moleculeInfo: [
    {
      moleculeCode: '',
      moleculeName: '',
      moleculeStrength: '',
      unitCode: '',
      unitName: ''
    }
  ]
  });

  // Add pagination state at the top of your component
const [currentPage, setCurrentPage] = useState(1);
const [rowsPerPage, setRowsPerPage] = useState(20); // show 20 rows per page

// Compute paginated data
const indexOfLastItem = currentPage * rowsPerPage;
const indexOfFirstItem = indexOfLastItem - rowsPerPage;
const currentItems = tableData.slice(indexOfFirstItem, indexOfLastItem);

const totalPages = Math.ceil(tableData.length / rowsPerPage);

const handleNextPage = () => {
  if (currentPage < totalPages) {
    const next = currentPage + 1;
    setCurrentPage(next);
    fetchItemMaster(next); //  fetch new page
  }
};

const handlePrevPage = () => {
  if (currentPage > 1) {
    const prev = currentPage - 1;
    setCurrentPage(prev);
    fetchItemMaster(prev);
  }
};
const handleBulkUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("https://hospitaldatabasemanagement.onrender.com/ecogreenbulkupload/upload-itemmaster", {
      method: "POST",
      body: formData
    });

    const result = await response.json();
    if (response.ok) {
      alert(`Successfully uploaded ${result.totalItems} items!`);
    } else {
      alert("Upload failed: " + result.error);
      console.error(result);
    }
  } catch (err) {
    console.error("Bulk upload error:", err);
    alert("Bulk upload failed. Check console for details.");
  }
};
const handleGoBack = () => {
  navigation.canGoBack() ? router.back() : console.log('Back pressed');
};
const handleSaveItem = async () => {
  if (!newItem.item_code) {
    alert("Item Code is required!");
    return;
  }

  try {
    const response = await fetch("https://hospitaldatabasemanagement.onrender.com/ecogreensingleapis/add-item", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newItem),
    });

    const result = await response.json();

    if (response.ok) {
      alert("Item added successfully!");
      setShowForm(false);

      setTableData(prev => [
        ...prev,
        { ...newItem, id: (prev.length + 1).toString() } // give a temporary id
      ]);

      setNewItem({
        item_code: '', item_name: '', item_short_name: '', item_full_name: '',
        brand_code: '', brand_name: '', category_code: '', category_name: '',
        content_code: '', content_name: '', pack_code: '', pack_name: '',
        item_qty_per_box: '', item_added_date: '', item_updated_date: '',
        hsn_sac_code: '', hsn_sac_name: ''
      });

    } else {
      alert("Failed to add item: " + (result.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Add Item API error:", err);
    alert("Something went wrong. Check console.");
  }
};
const fetchItemMaster = async () => {
const { c2Code, storeId, prodCode, dateTime } = filters;
  if (!c2Code || !storeId || !prodCode || !dateTime ) {
    alert("Please fill all filter fields before fetching!");
    return;
  }

  try {
    setLoading(true);

    // Split date and time
    const [date, time] = dateTime.split('T');
    let formattedTime = time;
    if (time.split(':').length === 2) formattedTime += ":00"; // add seconds if missing
    const formattedDateTime = `${date} ${formattedTime}`;

    const body = {
      c2Code,
      storeId,
      prodCode,
      inputDateTime: formattedDateTime,
    
    };

    console.log("Sending body:", body);

    const response = await fetch(
      "https://hospitaldatabasemanagement.onrender.com/ecogreen/item-master",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      alert("Failed to fetch item master. See console for details.");
      console.error(result);
      return;
    }

    // Check if vendor returned items
    let itemsArray = [];
    if (Array.isArray(result.data)) {
      itemsArray = result.data;
    } else if (Array.isArray(result.insertedItems)) {
      itemsArray = result.insertedItems;
    } else {
      console.warn("Unexpected response format:", result);
    }

    // Map API response to tableData
    const mappedData = itemsArray.map(item => ({
      id: item.itemCode || item.itemCode,
      item_code: item.itemCode || item.itemCode,
      item_name: item.itemName || item.itemName,
      item_short_name: item.itemShortName || item.itemShortName,
      item_full_name: item.itemFullName || item.itemFullName,
      brand_code: item.brandCode ||item.brandCode,
      brand_name: item.brandName || item. brandName,
      category_code: item.categoryCode || item.categoryCode,
      category_name: item.categoryName || item.categoryName,
      content_code: item.contentCode || item.contentCode,
      content_name: item.contentName || item.contentName,
      pack_code: item.packCode || item. packCode,
      pack_name: item.packName || item.packName,
      item_qty_per_box: item.itemQtyPerBox || item.itemQtyPerBox,
      item_added_date: item.itemAddedDate || item.itemAddedDate,
      item_updated_date: item.itemUpdatedDate || item. itemUpdatedDate,
      hsn_sac_code: item.hsnSacCode || item.hsnSacCode,
hsn_sac_name: item.hsnSacName || null,         
  minSaleQty: item.minSaleQty|| item.minSaleQty,

      note: item.note || item.note,
       mfacName : item.mfacName  || item.mfacName,
       mfacCode : item.mfacCode || item.mfacCode,
       packTypCode  : item.packTypCode   || item.packTypCode ,
          packTypName : item.packTypName  || item.packTypName,
           scheduleCode : item.scheduleCode || item.scheduleCode,
           scheduleName : item.scheduleName  || item.scheduleName,
          categoryHeadCode : item.categoryHeadCode  || item.categoryHeadCode,
           categoryHeadName : item.categoryHeadName || item.categoryHeadName,
          categoryClassCode : item.categoryClassCode  || item.categoryClassCode,
          categoryClassName : item.categoryClassName  || item.categoryClassName,
                   allowDisc : item.allowDisc  || item.allowDisc,
gstCode : item.gstCode  || item.gstCode,
parentItemCode : item.parentItemCode  || item.parentItemCode,
  parentItemName : item.parentItemName || item.parentItemName,

  moleculeInfo: item.moleculeInfo || []


    }));

    console.log("Mapped Data:", mappedData);
    setTableData(mappedData);

    alert(`Fetched ${mappedData.length} items successfully!`);

  } catch (err) {
    console.error("Fetch Item Master error:", err);
    alert("Error fetching item master. Check console.");
  } finally {
    setLoading(false);
  }
};
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.mainTitle}>Item Master</Text>
            <Text style={styles.subTitle}>Fetch and view item master data</Text>
          </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          
          <View style={[styles.card, shadow]}>
            <Text style={styles.cardTitle}>Filters</Text>
            <View style={styles.filterGrid}>
              <FilterInput label="c2Code" placeholder="c2Code" value={filters.c2Code} onChange={(val) => setFilters({ ...filters, c2Code: val })}/>
              <FilterInput label="storeId" placeholder="storeId" value={filters.storeId} onChange={(val) => setFilters({ ...filters, storeId: val })}/>
              <FilterInput label="prodCode" placeholder="prodCode" value={filters.prodCode} onChange={(val) => setFilters({ ...filters, prodCode: val })}/>
              <FilterInput
                label="Input Date/Time (with seconds)"
                type="datetime-local"
                value={filters.dateTime}
                onChange={(val) => setFilters({ ...filters, dateTime: val })}
                step="1"
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.fetchButton} onPress={() => fetchItemMaster(1)}>
                <Text style={styles.buttonText}>{loading ? "Fetching..." : "🔍 Fetch Items"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bulkUploadButton} onPress={() => fileInputRef.current.click()}>
                <Text style={styles.buttonText}>📥 Bulk Upload</Text>
              </TouchableOpacity>
              <input type="file" accept=".xlsx,.xls,.csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleBulkUpload} />
              <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
                <Text style={styles.buttonText}>➕ Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.card, shadow, { marginTop: 20, padding: 0 }]}>
            <View style={styles.tableSearchContainer}>
              <TextInput placeholder="Search items..." style={styles.tableSearch} placeholderTextColor={COLORS.textMuted}/>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                <View style={styles.tableHeader}>
                  <TableHeader text="Item Code" />
                  <TableHeader text="Item Name" />
                  <TableHeader text="Short Name" />
                  <TableHeader text="Full Name" width={200} />
                  <TableHeader text="Brand Code" />
                  <TableHeader text="Brand Name" />
                  <TableHeader text="Cat. Code" />
                  <TableHeader text="Category Name" />
                  <TableHeader text="Cont. Code" />
                  <TableHeader text="Content Name" />
                  <TableHeader text="Pack Code" />
                  <TableHeader text="Pack Name" />
                  <TableHeader text="Qty/Box" />
                  <TableHeader text="Added Date" />
                  <TableHeader text="Updated Date" width={150} />
                  <TableHeader text="HSN Code" />
                  <TableHeader text="HSN Name" width={250} />
                  <TableHeader text="minSaleQty" />
                  <TableHeader text="Note" />
                  <TableHeader text="mfacName" />
                  <TableHeader text="mfacCode " />
                  <TableHeader text="packTypCode" />
                  <TableHeader text="packTypName" />
                  <TableHeader text="scheduleCode" />
                  <TableHeader text="scheduleName" />
                  <TableHeader text="categoryHeadCode" />
                  <TableHeader text="categoryHeadName"width={150} />
                  <TableHeader text="categoryClassCode" width={150}/>
                  <TableHeader text="categoryClassName"width={150} />
                  <TableHeader text="allowDisc" />
                  <TableHeader text="gstCode" />
                  <TableHeader text="parentItemCode" />
                  <TableHeader text="parentItemName" />
                  <TableHeader text="Molecule Info" width={300} />
                </View>

                {currentItems.map(item => (
                  <View key={item.id} style={styles.tableRow}>
                    <TableCell text={item.item_code} />
                    <TableCell text={item.item_name} />
                    <TableCell text={item.item_short_name} />
                    <TableCell text={item.item_full_name} width={200} />
                    <TableCell text={item.brand_code} />
                    <TableCell text={item.brand_name} />
                    <TableCell text={item.category_code} />
                    <TableCell text={item.category_name} />
                    <TableCell text={item.content_code} />
                    <TableCell text={item.content_name} />
                    <TableCell text={item.pack_code} />
                    <TableCell text={item.pack_name} />
                    <TableCell text={item.item_qty_per_box} />
                    <TableCell text={item.item_added_date} />
                    <TableCell text={item.item_updated_date} width={150} />
                    <TableCell text={item.hsn_sac_code} />
                    <TableCell text={item.hsn_sac_name} width={250} />
                    <TableCell text={item.minSaleQty} />
                    <TableCell text={item.note} />
                    <TableCell text={item.mfacName} />
                    <TableCell text={item.mfacCode} />
                    <TableCell text={item.packTypCode} />
                    <TableCell text={item.packTypName} />
                    <TableCell text={item.scheduleCode} />
                    <TableCell text={item.scheduleName} />
                    <TableCell text={item.categoryHeadCode} />
                    <TableCell text={item.categoryHeadName}width={150} />
                    <TableCell text={item.categoryClassCode}width={150} />
                    <TableCell text={item.categoryClassName}  width={150}/>
                    <TableCell text={ item.allowDisc} />
                    <TableCell text={item.gstCode} />
                    <TableCell text={item.parentItemCode} />
                    <TableCell text={item.parentItemName} />
               <TableCell
  width={350}
  text={
    item.moleculeInfo?.length
      ? item.moleculeInfo
          .map(m =>
            `MolCode: ${m.moleculeCode}, Name: ${m.moleculeName}, Strength: ${m.moleculeStrength}, UnitCode: ${m.unitCode}, Unit: ${m.unitName}`
          )
          .join(' | ')
      : '-'
  }
/>
                  </View>
                ))}
              </View>
            </ScrollView>
            
            <View style={styles.paginationRow}>
              <TouchableOpacity style={styles.pageBtn} onPress={handlePrevPage} disabled={currentPage === 1}>
                <Text style={styles.pageBtnText}>⬅ Prev</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
              <TouchableOpacity style={styles.pageBtn} onPress={handleNextPage} disabled={currentPage === totalPages}>
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

      <Modal visible={showForm} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderTitle}>
              <Text style={styles.modalTitle}>Add New Item Master</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Feather name="x" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll}>
              <View style={styles.formGrid}>
                <FormInput label="Item Code *" value={newItem.item_code} onChange={(v) => setNewItem({...newItem, item_code: v})} />
                <FormInput label="Item Name" value={newItem.item_name} onChange={(v) => setNewItem({...newItem, item_name: v})} />
                <FormInput label="Short Name" value={newItem.item_short_name} onChange={(v) => setNewItem({...newItem, item_short_name: v})} />
                <FormInput label="Full Name" value={newItem.item_full_name} onChange={(v) => setNewItem({...newItem, item_full_name: v})} />
                <FormInput label="Brand Code" value={newItem.brand_code} onChange={(v) => setNewItem({...newItem, brand_code: v})} />
                <FormInput label="Brand Name" value={newItem.brand_name} onChange={(v) => setNewItem({...newItem, brand_name: v})} />
                <FormInput label="Category Code" value={newItem.category_code} onChange={(v) => setNewItem({...newItem, category_code: v})} />
                <FormInput label="Category Name" value={newItem.category_name} onChange={(v) => setNewItem({...newItem, category_name: v})} />
                <FormInput label="Content Code" value={newItem.content_code} onChange={(v) => setNewItem({...newItem, content_code: v})} />
                <FormInput label="Content Name" value={newItem.content_name} onChange={(v) => setNewItem({...newItem, content_name: v})} />
                <FormInput label="Pack Code" value={newItem.pack_code} onChange={(v) => setNewItem({...newItem, pack_code: v})} />
                <FormInput label="Pack Name" value={newItem.pack_name} onChange={(v) => setNewItem({...newItem, pack_name: v})} />
                <FormInput label="Qty Per Box" value={newItem.item_qty_per_box} onChange={(v) => setNewItem({...newItem, item_qty_per_box: v})} />
                <FormInput label="HSN Code" value={newItem.hsn_sac_code} onChange={(v) => setNewItem({...newItem, hsn_sac_code: v})} />
                <FormInput label="HSN Name" value={newItem.hsn_sac_name} onChange={(v) => setNewItem({...newItem, hsn_sac_name: v})} />
                <FormInput label="Min Sale Qty" value={newItem.minSaleQty} onChange={(v) => setNewItem({...newItem, minSaleQty: v})} />
                <FormInput label="Note" value={newItem.note} onChange={(v) => setNewItem({...newItem, note: v})} />
                <FormInput label="Mfg Name" value={newItem.mfacName} onChange={(v) => setNewItem({...newItem, mfacName: v})} />
                <FormInput label="Mfg Code" value={newItem.mfacCode} onChange={(v) => setNewItem({...newItem, mfacCode: v})} />
                <FormInput label="Pack Type Code" value={newItem.packTypCode} onChange={(v) => setNewItem({...newItem, packTypCode: v})} />
                <FormInput label="Pack Type Name" value={newItem.packTypName} onChange={(v) => setNewItem({...newItem, packTypName: v})} />
                <FormInput label="Schedule Code" value={newItem.scheduleCode} onChange={(v) => setNewItem({...newItem, scheduleCode: v})} />
                <FormInput label="Schedule Name" value={newItem.scheduleName} onChange={(v) => setNewItem({...newItem, scheduleName: v})} />
                <FormInput label="Category Head Code" value={newItem.categoryHeadCode} onChange={(v) => setNewItem({...newItem, categoryHeadCode: v})} />
                <FormInput label="Category Head Name" value={newItem.categoryHeadName} onChange={(v) => setNewItem({...newItem, categoryHeadName: v})} />
                <FormInput label="Class Code" value={newItem.categoryClassCode} onChange={(v) => setNewItem({...newItem, categoryClassCode: v})} />
                <FormInput label="Class Name" value={newItem.categoryClassName} onChange={(v) => setNewItem({...newItem, categoryClassName: v})} />
                <FormInput label="Allow Discount" value={newItem.allowDisc} onChange={(v) => setNewItem({...newItem, allowDisc: v})} />
                <FormInput label="GST Code" value={newItem.gstCode} onChange={(v) => setNewItem({...newItem, gstCode: v})} />
                <FormInput label="Parent Item Code" value={newItem.parentItemCode} onChange={(v) => setNewItem({...newItem, parentItemCode: v})} />
                <FormInput label="Parent Item Name" value={newItem.parentItemName} onChange={(v) => setNewItem({...newItem, parentItemName: v})} />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveItem}>
                <Text style={styles.saveButtonText}>Save Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const TableHeader = ({ text, width = 120 }) => (
  <Text style={[styles.headerCellText, { width }]}>{text}</Text>
);
const TableCell = ({ text, width = 120 }) => (
  <Text style={[styles.cellText, { width }]} numberOfLines={1}>{text || '-'}</Text>
);

const FormInput = ({ label, value, onChange, type = "text", ...props }) => (
  <View style={styles.formInputGroup}>
    <Text style={styles.label}>{label}</Text>
    {Platform.OS === 'web' && (type === 'date' || type === 'datetime-local') ? (
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={webInputStyle} />
    ) : (
      <TextInput style={[styles.input, props.multiline && { height: 80 }]} value={value} onChangeText={onChange} {...props} />
    )}
  </View>
);

const FilterInput = ({ label, placeholder, value, onChange, type = 'text' }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    {Platform.OS === 'web' && type === 'datetime-local' ? (
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step="1"
        style={webInputStyle}
      />
    ) : (
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={COLORS.textMuted}
      />
    )}
  </View>
);

const webInputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1.5px solid ${COLORS.border}`,
  backgroundColor: COLORS.surface, fontSize: '14px', outline: 'none', color: COLORS.text
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
  body: { padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16, color: COLORS.text },
  
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
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

  tableSearchContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableSearch: { backgroundColor: "#F8FAFC", paddingHorizontal: 16, height: 44, borderRadius: 12, width: '100%', maxWidth: 400, borderWidth: 1.5, borderColor: COLORS.border, color: COLORS.text, ...Platform.select({ web: { outlineStyle: "none" } }) },
  tableHeader: { flexDirection: 'row', backgroundColor: "#F8FAFC", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerCellText: { fontWeight: '800', color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  cellText: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: COLORS.surface, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  pageBtn: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: COLORS.primary, borderRadius: 10 },
  pageBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  pageInfo: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  rowsPerPage: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowsInput: { borderWidth: 1.5, borderColor: COLORS.border, width: 50, height: 36, textAlign: 'center', borderRadius: 8, fontSize: 14, color: COLORS.text, backgroundColor: '#F8FAFC' }
});

export default ItemMasterScreen;