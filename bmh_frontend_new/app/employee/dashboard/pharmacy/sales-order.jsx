import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { ItemMasterModal } from './ItemMasterModal';
import { useTokenManager } from './useTokenManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';

export default function SalesOrder() {
  const router = useRouter();
  const apiKey = useTokenManager();
  
  const [itemMasterVisible, setItemMasterVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    ipNo: "",
    mobileNo: "",
    patientName: "",
    patientAddress: "",
    patientEmail: "",
    counterSale: "1",
    ordDate: new Date().toISOString().split('T')[0],
    ordTime: new Date().toTimeString().split(' ')[0],
    userId: "",
    actCode: "GC01",
    actName: "",
    drCode: "GD01",
    drName: "",
    drAddress: "",
    drRegNo: "",
    drOfficeCode: "-",
    dmanCode: "-",
    orderTotal: "0.00",
    orderDiscPer: "0.00",
    refNo: Math.floor(Math.random() * 10000),
    orderId: Math.floor(Math.random() * 1000),
    remark: "",
    urgentFlag: 0,
    ordConversionFlag: 0,
    dcConversionFlag: 0,
    ordRefNo: 0,
    sysName: "BMH-SYS",
    sysIp: "127.0.0.1",
    sysUser: ""
  });

  const [items, setItems] = useState([]);
  
  useEffect(() => {
    const fetchUser = async () => {
      let userDataStr = null;
      if (Platform.OS === 'web') {
        userDataStr = localStorage.getItem('employeeUser');
      } else {
        userDataStr = await AsyncStorage.getItem('employeeUser');
      }
      if (userDataStr) {
        const u = JSON.parse(userDataStr);
        setFormData(prev => ({ ...prev, userId: u.name || "Employee", sysUser: u.name || "Employee" }));
      }
    };
    fetchUser();
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.altKey && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      setItemMasterVisible(true);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemSelect = (item) => {
    const newItem = {
      itemSeq: items.length + 1,
      itemcode: item.c_item_code,
      itemName: item.itemName,
      batchNo: item.batchNo,
      pack: item.itemQtyPerBox || 1,
      totalLooseQty: 1, // Default to 1 pack/loose
      totalLooseSchQty: 0,
      serviceQty: 0,
      saleRate: item.saleRate || 0,
      discPer: "0.00",
      schDiscPer: "0.00",
      mrp: item.mrp || 0
    };
    setItems([...items, newItem]);
    setItemMasterVisible(false);
    recalculateTotal([...items, newItem]);
  };

  const updateItemQty = (index, qty) => {
    const newItems = [...items];
    newItems[index].totalLooseQty = parseInt(qty) || 0;
    setItems(newItems);
    recalculateTotal(newItems);
  };

  const recalculateTotal = (currentItems) => {
    let total = 0;
    currentItems.forEach(item => {
      total += (parseFloat(item.saleRate) || 0) * (parseInt(item.totalLooseQty) || 0);
    });
    setFormData(prev => ({ ...prev, orderTotal: total.toFixed(2) }));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      alert("Please add at least one item to the sales order.");
      return;
    }

    setLoading(true);
    
    // Format items to match payload exactly
    const materialInfo = items.map(item => ({
      itemSeq: item.itemSeq,
      itemcode: item.itemcode,
      totalLooseQty: item.totalLooseQty,
      totalLooseSchQty: item.totalLooseSchQty,
      serviceQty: item.serviceQty,
      saleRate: item.saleRate.toString(),
      discPer: item.discPer,
      schDiscPer: item.schDiscPer
    }));

    const payload = {
      ...formData,
      materialInfo
    };

    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/sales-order', payload);
      alert("Sales order saved successfully!");
      router.push('/employee/dashboard/pharmacy/sales-order-list');
    } catch (err) {
      console.error(err);
      alert("Failed to save sales order. The endpoint might not exist yet.");
    } finally {
      setLoading(false);
    }
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    recalculateTotal(newItems);
  };

  return (
    <View style={styles.container}>
      <ItemMasterModal 
        visible={itemMasterVisible} 
        onClose={() => setItemMasterVisible(false)}
        onSelectItem={handleItemSelect}
        apiKey={apiKey}
      />

      {/* Top Orange Bar */}
      <View style={styles.topBar}>
        <View style={styles.searchRow}>
          <Text style={styles.topText}>Search for Srno. </Text>
          <TextInput style={[styles.input, styles.compactInput, { width: 50 }]} value="001" editable={false} />
          <TextInput style={[styles.input, styles.compactInput, { width: 40 }]} value="26" editable={false} />
          <TextInput style={[styles.input, styles.compactInput, { width: 40 }]} value="6" editable={false} />
          <TextInput style={[styles.input, styles.compactInput, { width: 60 }]} value={formData.refNo.toString()} editable={false} />
        </View>
        <Text style={styles.viewModeText}>V I E W   M O D E</Text>
      </View>

      {/* Main Header (Teal) */}
      <View style={styles.mainHeader}>
        <Text style={styles.mainTitle}>Sales Order</Text>
        <Text style={styles.headerValue}>1</Text>
        <View style={styles.headerInfoGroup}>
          <Text style={styles.headerLabel}>Date </Text>
          <TextInput style={[styles.input, styles.compactInput, { width: 80, backgroundColor: '#d1d5db' }]} value={formData.ordDate} editable={false} />
          <TextInput style={[styles.input, styles.compactInput, { width: 60, backgroundColor: '#d1d5db' }]} value={formData.ordTime} editable={false} />
        </View>
        <View style={styles.headerInfoGroup}>
          <Text style={styles.headerLabel}>Tran. No. </Text>
          <Text style={styles.headerValueLight}>001/26/6/{formData.refNo}</Text>
        </View>
      </View>

      {/* Form Area with Watermark */}
      <View style={styles.formArea}>
        <View style={styles.watermarkContainer}>
          <Text style={styles.watermarkText}>BMH</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.colLeft}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Customer</Text>
              <TextInput style={[styles.input, {width: 60}]} value={formData.actCode} onChangeText={t => updateField('actCode', t)} />
              <TextInput style={[styles.input, {flex: 1}]} value={formData.patientName} onChangeText={t => updateField('patientName', t)} placeholder="Name" />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Branch</Text>
              <TextInput style={[styles.input, {flex: 1}]} value="BHARAT MEDICAL HALL [001]" editable={false} />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput style={[styles.input, {flex: 1}]} value={formData.patientAddress} onChangeText={t => updateField('patientAddress', t)} />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput style={[styles.input, {flex: 1}]} />
              <Text style={[styles.fieldLabel, {width: 50, textAlign: 'right', paddingRight: 5}]}>Mobile</Text>
              <TextInput style={[styles.input, {flex: 1}]} value={formData.mobileNo} onChangeText={t => updateField('mobileNo', t)} />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>E-mail</Text>
              <TextInput style={[styles.input, {flex: 1}]} value={formData.patientEmail} onChangeText={t => updateField('patientEmail', t)} />
            </View>
          </View>
          
          <View style={styles.colMiddle}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Professional</Text>
              <TextInput style={[styles.input, {width: 50}]} value={formData.drCode} onChangeText={t => updateField('drCode', t)} />
              <Text style={styles.fieldLabel}>Rep By</Text>
              <TextInput style={[styles.input, {flex: 1}]} value={formData.drName} onChangeText={t => updateField('drName', t)} />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Office Location</Text>
              <TextInput style={[styles.input, {flex: 1}]} value={formData.drOfficeCode} onChangeText={t => updateField('drOfficeCode', t)} />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Reg. No.</Text>
              <TextInput style={[styles.input, {width: 80}]} value={formData.drRegNo} onChangeText={t => updateField('drRegNo', t)} />
              <Text style={[styles.fieldLabel, {marginLeft: 10}]}>Ref Dt</Text>
              <TextInput style={[styles.input, {flex: 1}]} placeholder="00-00-0000" />
            </View>
          </View>

          <View style={styles.colRight}>
            <View style={styles.approxValueBox}>
              <Text style={styles.approxValueTitle}>Approx Value</Text>
              <Text style={styles.approxValueAmt}>{formData.orderTotal}</Text>
            </View>
            <View style={styles.paymentModes}>
              <Text style={styles.paymentRadio}>◉ CASH</Text>
              <Text style={styles.paymentRadio}>○ CARD</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { width: 60 }]}>Item Code</Text>
        <Text style={[styles.th, { flex: 2 }]}>Item Name</Text>
        <Text style={[styles.th, { width: 50 }]}>Pack</Text>
        <Text style={[styles.th, { width: 80 }]}>Batch No</Text>
        <Text style={[styles.th, { width: 50 }]}>Qty[P]</Text>
        <Text style={[styles.th, { width: 70 }]}>Pack Rate</Text>
        <Text style={[styles.th, { width: 50 }]}>Dis%</Text>
        <Text style={[styles.th, { width: 80 }]}>Aprx Amt.</Text>
        <Text style={[styles.th, { width: 30 }]}>Del</Text>
      </View>

      {/* Items List */}
      <ScrollView style={styles.itemsScroll}>
        {items.map((item, idx) => {
          const approxAmt = ((parseFloat(item.saleRate) || 0) * (parseInt(item.totalLooseQty) || 0)).toFixed(2);
          return (
            <View key={idx} style={styles.itemRow}>
              <Text style={[styles.td, { width: 60 }]}>{item.itemcode}</Text>
              <Text style={[styles.td, { flex: 2 }]}>{item.itemName}</Text>
              <Text style={[styles.td, { width: 50 }]}>{item.pack}</Text>
              <Text style={[styles.td, { width: 80 }]}>{item.batchNo}</Text>
              <View style={{ width: 50 }}>
                <TextInput 
                  style={styles.qtyInput} 
                  value={item.totalLooseQty.toString()}
                  onChangeText={(val) => updateItemQty(idx, val)}
                  keyboardType="numeric"
                />
              </View>
              <Text style={[styles.td, { width: 70, textAlign: 'right' }]}>{item.saleRate}</Text>
              <Text style={[styles.td, { width: 50, textAlign: 'right' }]}>{item.discPer}</Text>
              <Text style={[styles.td, { width: 80, textAlign: 'right' }]}>{approxAmt}</Text>
              <TouchableOpacity style={{ width: 30, alignItems: 'center' }} onPress={() => removeItem(idx)}>
                <Text style={{ color: 'red', fontWeight: 'bold' }}>X</Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <Text style={styles.shortcutText}>F1 - Search   ALT + (+) - Add Item   F8 - Edit   F9 - Save</Text>
        
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>SAVE ORDER (F9)</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#b5d09b', // Main background from screenshot
    ...(Platform.OS === 'web' ? { fontFamily: 'monospace' } : {})
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F4A460', // Orange-ish top bar
    padding: 4,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#000'
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  topText: {
    fontWeight: 'bold',
    fontSize: 12
  },
  compactInput: {
    height: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#777',
    paddingHorizontal: 2,
    fontSize: 12,
    marginRight: 4
  },
  viewModeText: {
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 2,
    marginRight: 20
  },
  mainHeader: {
    flexDirection: 'row',
    backgroundColor: '#008080', // Teal
    padding: 4,
    alignItems: 'center'
  },
  mainTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 20
  },
  headerValue: {
    color: '#ff0', // Yellow
    fontWeight: 'bold',
    marginRight: 20
  },
  headerInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20
  },
  headerLabel: {
    color: '#fff',
    fontSize: 12
  },
  headerValueLight: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  formArea: {
    padding: 10,
    position: 'relative'
  },
  watermarkContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
    pointerEvents: 'none'
  },
  watermarkText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: 'rgba(100, 150, 100, 0.2)',
    letterSpacing: 10
  },
  row: {
    flexDirection: 'row',
    zIndex: 1
  },
  colLeft: {
    flex: 2,
    paddingRight: 10
  },
  colMiddle: {
    flex: 1.5,
    paddingRight: 10
  },
  colRight: {
    flex: 1
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  fieldLabel: {
    width: 80,
    fontSize: 12,
    color: '#333'
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#777',
    height: 22,
    paddingHorizontal: 4,
    fontSize: 12,
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {})
  },
  approxValueBox: {
    backgroundColor: '#000',
    padding: 5,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    marginBottom: 5
  },
  approxValueTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  approxValueAmt: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  paymentModes: {
    flexDirection: 'row',
    backgroundColor: '#8FBC8F',
    padding: 5,
    borderWidth: 1,
    borderColor: '#777'
  },
  paymentRadio: {
    fontSize: 10,
    marginRight: 10,
    fontWeight: 'bold'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#006400',
    paddingVertical: 4,
    paddingHorizontal: 5
  },
  th: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 2
  },
  itemsScroll: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderTopWidth: 1,
    borderColor: '#006400'
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    alignItems: 'center'
  },
  td: {
    fontSize: 12,
    color: '#000',
    paddingHorizontal: 2
  },
  qtyInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    height: 20,
    fontSize: 12,
    paddingHorizontal: 2,
    textAlign: 'center',
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {})
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F4A460',
    padding: 5,
    borderTopWidth: 1,
    borderTopColor: '#000'
  },
  shortcutText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#000'
  },
  submitBtn: {
    backgroundColor: '#006400',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 4
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  }
});