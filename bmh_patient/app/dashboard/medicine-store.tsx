import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Search, ShoppingCart, Plus, Minus } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function MedicineStoreScreen() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Cart is managed locally for simplicity, though a global state/context would be better for a full app.
  // We'll store it in localStorage on web to pass to the cart page.
  const [cart, setCart] = useState({});

  useEffect(() => {
    if (Platform.OS === 'web') {
      const savedCart = localStorage.getItem('bmh_patient_cart');
      if (savedCart) {
        try { setCart(JSON.parse(savedCart)); } catch(e) {}
      }
    }
  }, []);

  const saveCart = (newCart) => {
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

  const addToCart = (item) => {
    const newCart = { ...cart };
    if (newCart[item.c_item_code]) {
      newCart[item.c_item_code].qty += 1;
    } else {
      newCart[item.c_item_code] = { ...item, qty: 1 };
    }
    saveCart(newCart);
  };

  const removeFromCart = (itemCode) => {
    const newCart = { ...cart };
    if (newCart[itemCode]) {
      newCart[itemCode].qty -= 1;
      if (newCart[itemCode].qty <= 0) {
        delete newCart[itemCode];
      }
    }
    saveCart(newCart);
  };

  const cartTotalItems = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);

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
        data={items}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        onEndReached={() => {
          if (currentPage < totalPages && !loading) {
            setCurrentPage(p => p + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#3B82F6" style={{margin: 20}} /> : null}
        renderItem={({item}) => {
          const cartItem = cart[item.c_item_code];
          return (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <Text style={styles.itemDesc}>Batch: {item.batchNo} | Exp: {item.expiryDate}</Text>
                <Text style={styles.itemPrice}>₹{item.saleRate}</Text>
              </View>
              
              <View style={styles.cardActions}>
                {cartItem ? (
                  <View style={styles.qtyContainer}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.c_item_code)}>
                      <Minus size={16} color="#3B82F6" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{cartItem.qty}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item)}>
                      <Plus size={16} color="#3B82F6" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                    <Text style={styles.addBtnText}>Add to Cart</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
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
    backgroundColor: '#3B82F6',
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
    outlineStyle: 'none'
  },
  listContainer: {
    padding: 16
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  cardInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4
  },
  itemDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981'
  },
  cardActions: {
    minWidth: 100,
    alignItems: 'flex-end'
  },
  addBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3B82F6'
  },
  addBtnText: {
    color: '#3B82F6',
    fontWeight: 'bold'
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3B82F6'
  },
  qtyBtn: {
    padding: 8
  },
  qtyText: {
    paddingHorizontal: 8,
    fontWeight: 'bold',
    color: '#1E293B'
  }
});
