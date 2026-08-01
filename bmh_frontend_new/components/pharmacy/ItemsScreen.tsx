import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Modal, Image } from 'react-native';
import { Search, Calendar, ChevronLeft, ChevronRight, Edit2, X, Film, AlertCircle, RefreshCw, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';
import { API_URL } from '../../config';

export default function ItemsScreen() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(15);

  // Filters State
  const [search, setSearch] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [batchNoFilter, setBatchNoFilter] = useState('');

  // Editing State
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formItemName, setFormItemName] = useState('');
  const [formMrp, setFormMrp] = useState('');
  const [formSaleRate, setFormSaleRate] = useState('');
  const [formQtyPerBox, setFormQtyPerBox] = useState('');
  const [formBatchNo, setFormBatchNo] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formStockBal, setFormStockBal] = useState('');
  const [formVideoLink, setFormVideoLink] = useState('');
  const [formUsageDesc, setFormUsageDesc] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');

  const fetchMedicines = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/pharmacy/medicines-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: pageNum,
          limit,
          search,
          item_code: itemCode,
          expiry_date: expiryDate,
          batch_no: batchNoFilter
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch medicines');
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalItems(json.pagination?.totalItems || 0);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Fetch medicines error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines(1);
  }, [search, itemCode, expiryDate, batchNoFilter]);

  const handleEditPress = (item: any) => {
    setSelectedItem(item);
    setFormItemName(item.itemName || '');
    setFormMrp(String(item.mrp || '0'));
    setFormSaleRate(String(item.saleRate || '0'));
    setFormQtyPerBox(String(item.itemQtyPerBox || '1'));
    setFormBatchNo(item.batchNo || '');
    setFormExpiryDate(item.expiryDate || '');
    setFormStockBal(String(item.stockBalQty || '0'));
    setFormVideoLink(item.video_link || '');
    setFormUsageDesc(item.usage_description || '');
    setFormImageUrl(item.image_url || '');
    setEditModalVisible(true);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setFormImageUrl(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      alert('Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!formItemName.trim()) {
      alert('Medicine name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/pharmacy/medicines/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: formItemName,
          itemQtyPerBox: parseInt(formQtyPerBox) || 1,
          batchNo: formBatchNo,
          stockBalQty: parseFloat(formStockBal) || 0,
          expiryDate: formExpiryDate,
          mrp: parseFloat(formMrp) || 0,
          saleRate: parseFloat(formSaleRate) || 0,
          video_link: formVideoLink,
          usage_description: formUsageDesc,
          image_url: formImageUrl
        }),
      });

      if (!res.ok) throw new Error('Failed to save medicine');
      const json = await res.json();
      if (json.success) {
        setEditModalVisible(false);
        fetchMedicines(page);
      } else {
        alert(json.message || 'Failed to save');
      }
    } catch (err) {
      console.error('Save medicine error:', err);
      alert('Error saving medicine details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Item Master Dashboard</Text>
          <Text style={styles.subtitle}>
            Manage inventory parameters, descriptions, training videos, and upload images.
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchMedicines(1)}>
          <RefreshCw size={16} color="#fff" />
          <Text style={styles.refreshBtnText}>Reload Data</Text>
        </TouchableOpacity>
      </View>

      {/* Filters Card */}
      <View style={styles.card}>
        <View style={styles.filterGrid}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Search Medicine Name / Code</Text>
            <View style={styles.inputIconWrapper}>
              <Search size={16} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Search..."
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>

          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Filter by Item Code</Text>
            <View style={styles.inputIconWrapper}>
              <FileText size={16} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Item Code..."
                value={itemCode}
                onChangeText={setItemCode}
              />
            </View>
          </View>

          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Filter by Expiry Date</Text>
            <View style={styles.inputIconWrapper}>
              <Calendar size={16} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                value={expiryDate}
                onChangeText={setExpiryDate}
              />
            </View>
          </View>

          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Filter by Batch No</Text>
            <View style={styles.inputIconWrapper}>
              <FileText size={16} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Batch No..."
                value={batchNoFilter}
                onChangeText={setBatchNoFilter}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Main Table Card */}
      <View style={[styles.card, { marginTop: 24 }]}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loaderText}>Loading items from database...</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ minWidth: 1280 }}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, { flex: 1 }]}>Item Code</Text>
                  <Text style={[styles.headerCell, { flex: 2 }]}>Medicine Name</Text>
                  <Text style={[styles.headerCell, { flex: 0.8 }]}>Rack</Text>
                  <Text style={[styles.headerCell, { flex: 1 }]}>Batch No</Text>
                  <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>Expiry</Text>
                  <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'right' }]}>MRP</Text>
                  <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'right' }]}>Sale Rate</Text>
                  <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'center' }]}>Qty/Box</Text>
                  <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'center' }]}>Stock</Text>
                  <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'center' }]}>Custom Assets</Text>
                  <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'center' }]}>Action</Text>
                </View>

                {/* Table Body */}
                {data.length > 0 ? (
                  data.map((item) => (
                    <View key={item.id} style={styles.tableRow}>
                      <Text style={[styles.cell, { flex: 1, fontWeight: '700', color: Colors.light.primary }]}>
                        {item.c_item_code || '-'}
                      </Text>
                      <Text style={[styles.cell, { flex: 2 }]} numberOfLines={2}>{item.itemName || '-'}</Text>
                      <Text style={[styles.cell, { flex: 0.8 }]}>{item.rack || '-'}</Text>
                      <Text style={[styles.cell, { flex: 1 }]}>{item.batchNo || '-'}</Text>
                      <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>{item.expiryDate || '-'}</Text>
                      <Text style={[styles.cell, { flex: 0.8, textAlign: 'right', fontWeight: '600' }]}>₹{item.mrp}</Text>
                      <Text style={[styles.cell, { flex: 0.8, textAlign: 'right', color: '#10B981', fontWeight: '600' }]}>₹{item.saleRate}</Text>
                      <Text style={[styles.cell, { flex: 0.8, textAlign: 'center' }]}>{item.itemQtyPerBox}</Text>
                      <Text style={[styles.cell, { flex: 0.8, textAlign: 'center', fontWeight: 'bold', color: item.stockBalQty > 0 ? '#1E293B' : '#EF4444' }]}>
                        {item.stockBalQty}
                      </Text>
                      <View style={[styles.cell, { flex: 1.2, flexDirection: 'row', gap: 6, justifyContent: 'center' }]}>
                        {item.image_url ? <View style={[styles.badge, styles.badgeGreen]}><Text style={styles.badgeText}>Image</Text></View> : null}
                        {item.video_link ? <View style={[styles.badge, styles.badgeBlue]}><Text style={styles.badgeText}>Video</Text></View> : null}
                        {item.usage_description ? <View style={[styles.badge, styles.badgeGray]}><Text style={styles.badgeText}>Desc</Text></View> : null}
                        {!item.image_url && !item.video_link && !item.usage_description ? <Text style={{ color: '#94A3B8', fontSize: 12 }}>None</Text> : null}
                      </View>
                      <View style={[styles.cell, { flex: 0.8, alignItems: 'center' }]}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => handleEditPress(item)}>
                          <Edit2 size={14} color="#004990" />
                          <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    <AlertCircle size={32} color="#94A3B8" />
                    <Text style={styles.emptyText}>No medicines found in database matching criteria.</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Pagination Controls */}
            {data.length > 0 && (
              <View style={styles.paginationRow}>
                <Text style={styles.paginationText}>
                  Showing page {page} of {totalPages} ({totalItems} items total)
                </Text>
                <View style={styles.paginationBtns}>
                  <TouchableOpacity
                    style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                    disabled={page === 1}
                    onPress={() => fetchMedicines(page - 1)}
                  >
                    <ChevronLeft size={18} color={page === 1 ? '#CBD5E1' : '#1E293B'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                    disabled={page >= totalPages}
                    onPress={() => fetchMedicines(page + 1)}
                  >
                    <ChevronRight size={18} color={page >= totalPages ? '#CBD5E1' : '#1E293B'} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Edit Medicine details Modal */}
      {selectedItem && (
        <Modal visible={editModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Edit Medicine Row Details</Text>
                  <Text style={styles.modalSubtitle}>Item Code: {selectedItem.c_item_code}</Text>
                </View>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Image Section */}
                <Text style={styles.sectionTitle}>Product Image</Text>
                <View style={styles.imageSection}>
                  {formImageUrl ? (
                    <View style={styles.previewImageContainer}>
                      <Image source={{ uri: formImageUrl }} style={styles.previewImage} />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={() => setFormImageUrl('')}>
                        <Text style={styles.removeImageText}>Remove Image</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                      <Calendar size={28} color="#94A3B8" />
                      <Text style={styles.uploadBoxText}>Click to select and upload medicine image</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Properties Section */}
                <Text style={styles.sectionTitle}>Inventory Details</Text>
                <View style={styles.formGrid}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Medicine Name</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formItemName}
                      onChangeText={setFormItemName}
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Batch Number</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formBatchNo}
                      onChangeText={setFormBatchNo}
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Expiry Date</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="YYYY-MM-DD"
                      value={formExpiryDate}
                      onChangeText={setFormExpiryDate}
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>MRP (₹)</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="numeric"
                      value={formMrp}
                      onChangeText={setFormMrp}
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Sale Rate (₹)</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="numeric"
                      value={formSaleRate}
                      onChangeText={setFormSaleRate}
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Qty Per Box</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="numeric"
                      value={formQtyPerBox}
                      onChangeText={setFormQtyPerBox}
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Stock Bal Qty</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="numeric"
                      value={formStockBal}
                      onChangeText={setFormStockBal}
                    />
                  </View>
                </View>

                {/* Additional Patient Custom Columns */}
                <Text style={styles.sectionTitle}>Patient Custom Meta Assets</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Video Link (YouTube / Vimeo / Direct Video Link)</Text>
                  <View style={styles.inputIconWrapper}>
                    <Film size={16} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. https://www.youtube.com/watch?v=..."
                      value={formVideoLink}
                      onChangeText={setFormVideoLink}
                    />
                  </View>
                </View>

                <View style={[styles.formField, { marginTop: 12 }]}>
                  <Text style={styles.formLabel}>Usage Description & Instructions</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    multiline
                    numberOfLines={4}
                    placeholder="Enter instructions on how and when to consume this medicine..."
                    value={formUsageDesc}
                    onChangeText={setFormUsageDesc}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.footerBtn, styles.cancelBtn]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.footerBtn, styles.saveBtn]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  refreshBtn: {
    backgroundColor: '#004990',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  refreshBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  filterGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  filterField: {
    flex: 1,
    minWidth: 220,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    outlineStyle: 'none' as any,
  },
  loaderContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  tableContainer: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  cell: {
    fontSize: 13,
    color: '#1E293B',
    paddingRight: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
  },
  badgeBlue: {
    backgroundColor: '#EFF6FF',
  },
  badgeGray: {
    backgroundColor: '#F1F5F9',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  editBtnText: {
    color: '#004990',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  paginationText: {
    fontSize: 13,
    color: '#64748B',
  },
  paginationBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 680,
    height: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#004990',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 12,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadBox: {
    width: '100%',
    height: 120,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  uploadBoxText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  previewImageContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  removeImageBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeImageText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  formField: {
    width: '48%',
    minWidth: 200,
    flexGrow: 1,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#fff',
    outlineStyle: 'none' as any,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  footerBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#004990',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
