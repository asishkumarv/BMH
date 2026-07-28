import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Platform, Modal, Image, Linking, ScrollView } from 'react-native';
import { Search, ShoppingCart, Plus, Minus, Pill, X, Film, FileText } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../hooks/useResponsive';

export default function MedicineStoreScreen() {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // Cart is managed locally for simplicity, though a global state/context would be better for a full app.
  // We'll store it in localStorage on web to pass to the cart page.
  const [cart, setCart] = useState<any>({});

  useEffect(() => {
    if (Platform.OS === 'web') {
      const savedCart = localStorage.getItem('bmh_patient_cart');
      if (savedCart) {
        try { setCart(JSON.parse(savedCart)); } catch(e) {}
      }
    }
  }, []);

  const saveCart = (newCart: any) => {
    setCart(newCart);
    if (Platform.OS === 'web') {
      localStorage.setItem('bmh_patient_cart', JSON.stringify(newCart));
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setCurrentPage(1);
      fetchMedicines(1, searchQuery);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage > 1) {
      fetchMedicines(currentPage, searchQuery);
    }
  }, [currentPage]);

  const fetchMedicines = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const res = await fetch('https://napi.bharatmedicalhallplus.com/pharmacy/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page, limit: 20, search })
      });
      const data = await res.json();
      if (data && data.data) {
        if (page === 1) {
          setItems(data.data);
        } else {
          setItems(prev => [...prev, ...data.data]);
        }
        if (data.pagination) setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: any) => {
    const newCart = { ...cart };
    if (newCart[item.c_item_code]) {
      newCart[item.c_item_code].qty += 1;
    } else {
      newCart[item.c_item_code] = { ...item, qty: 1 };
    }
    saveCart(newCart);
  };

  const removeFromCart = (itemCode: any) => {
    const newCart = { ...cart };
    if (newCart[itemCode]) {
      newCart[itemCode].qty -= 1;
      if (newCart[itemCode].qty <= 0) {
        delete newCart[itemCode];
      }
    }
    saveCart(newCart);
  };

  const cartTotalItems = (Object.values(cart) as any[]).reduce((sum: number, item: any) => sum + item.qty, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Medicine Store</Text>
        <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/dashboard/cart')}>
          <ShoppingCart color="#fff" size={24} />
          {cartTotalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartTotalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search color="#64748B" size={20} style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search medicines..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList 
        key={isMobile ? 'mobile' : 'desktop'}
        data={items}
        numColumns={isMobile ? 2 : 4}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        onEndReached={() => {
          if (currentPage < totalPages && !loading) {
            setCurrentPage(p => p + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#3B82F6" style={{margin: 20}} /> : null}
        renderItem={({item}: {item: any}) => {
          const cartItem = cart[item.c_item_code];
          return (
            <View style={[styles.card, { width: isMobile ? '47%' : '23%' }]}>
              <TouchableOpacity onPress={() => setSelectedProduct(item)} style={{ flex: 1 }}>
                <View style={styles.imagePlaceholder}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                  ) : (
                    <Pill color="#94A3B8" size={32} />
                  )}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.itemName}</Text>
                  <Text style={styles.itemDesc} numberOfLines={1}>Exp: {item.expiryDate}</Text>
                </View>
              </TouchableOpacity>
              
              <View style={styles.cardFooter}>
                <Text style={styles.itemPrice}>₹{item.saleRate}</Text>
                <View style={styles.cardActions}>
                  {cartItem ? (
                    <View style={styles.qtyContainer}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.c_item_code)}>
                        <Minus size={14} color="#0F172A" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{cartItem.qty}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item)}>
                        <Plus size={14} color="#0F172A" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                      <Plus size={16} color="#fff" style={{marginRight: 4}} />
                      <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Product Details Modal */}
      {selectedProduct && (
        <Modal visible={!!selectedProduct} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Product Details</Text>
                <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                  <X size={24} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.modalImageContainer}>
                  {selectedProduct.image_url ? (
                    <Image source={{ uri: selectedProduct.image_url }} style={styles.modalImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.modalNoImage}>
                      <Pill color="#94A3B8" size={64} />
                      <Text style={{ marginTop: 12, color: '#94A3B8' }}>No Image Available</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.modalItemName}>{selectedProduct.itemName}</Text>
                <Text style={styles.modalItemCode}>Item Code: {selectedProduct.c_item_code}</Text>

                <View style={styles.infoGrid}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Expiry Date</Text>
                    <Text style={styles.infoValue}>{selectedProduct.expiryDate || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Batch No</Text>
                    <Text style={styles.infoValue}>{selectedProduct.batchNo || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Qty/Box</Text>
                    <Text style={styles.infoValue}>{selectedProduct.itemQtyPerBox || '1'} Units</Text>
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.infoLabel}>Maximum Retail Price (MRP)</Text>
                    <Text style={styles.modalMrp}>₹{selectedProduct.mrp}</Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>Our Special Price</Text>
                    <Text style={styles.modalSaleRate}>₹{selectedProduct.saleRate}</Text>
                  </View>
                </View>

                {selectedProduct.usage_description ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>How to Use / Usage Instructions</Text>
                    <Text style={styles.detailSectionText}>{selectedProduct.usage_description}</Text>
                  </View>
                ) : null}

                {selectedProduct.video_link ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Video Guide & Demonstration</Text>
                    <TouchableOpacity 
                      style={styles.videoBtn}
                      onPress={() => Linking.openURL(selectedProduct.video_link)}
                    >
                      <Film size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.videoBtnText}>Watch Usage Video</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedProduct(null)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0F172A',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  cartButton: {
    padding: 8,
    position: 'relative'
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  searchIcon: {
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    outlineStyle: 'none' as any
  },
  listContainer: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'column',
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  imagePlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  cardInfo: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    height: 40,
    lineHeight: 20
  },
  itemDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  qtyBtn: {
    padding: 8
  },
  qtyText: {
    paddingHorizontal: 8,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 550,
    maxHeight: '90%',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalBody: {
    padding: 20,
  },
  modalImageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalNoImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalItemCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  infoCol: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 16,
  },
  modalMrp: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  modalSaleRate: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10B981',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailSectionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  videoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  videoBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'flex-end',
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  }
});
