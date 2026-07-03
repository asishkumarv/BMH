import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { ItemMasterModal } from './ItemMasterModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';

const printBill = (orderData, items) => {
  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `
      <html>
        <head>
          <title>Bill - Bharat Medical Hall</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h2 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; }
            .details { margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .details p { margin: 2px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { text-align: left; padding: 4px 2px; }
            th { border-bottom: 1px dashed #000; }
            .total { text-align: right; font-weight: bold; margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>BHARAT MEDICAL HALL</h2>
            <p>Receipt</p>
          </div>
          <div class="details">
            <p><strong>Ref No:</strong> ${orderData.refNo}</p>
            <p><strong>Date:</strong> ${orderData.ordDate} ${orderData.ordTime}</p>
            <p><strong>Customer:</strong> ${orderData.patientName}</p>
            <p><strong>Mobile:</strong> ${orderData.mobileNo}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amt</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td>${i.itemName}</td>
                  <td>${i.totalLooseQty}</td>
                  <td>${i.saleRate}</td>
                  <td>${((parseFloat(i.saleRate)||0) * (parseInt(i.totalLooseQty)||0)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <p>Discount: ${orderData.orderDiscPer}%</p>
            <p>Total Payable: Rs. ${orderData.orderTotal}</p>
          </div>
          <div style="text-align:center; margin-top: 20px; font-size: 12px;">
            <p>Thank you! Visit again.</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  }
};

export default function SalesOrder() {
  const router = useRouter();
  
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAutocomplete, setFilteredAutocomplete] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setAutocompleteLoading(true);
        try {
          const res = await axios.post('https://napi.bharatmedicalhallplus.com/pharmacy/stock', {
            page: 1, limit: 50, search: searchQuery
          });
          if (res.data && res.data.data) {
             setFilteredAutocomplete(res.data.data);
          }
        } catch (err) {}
        finally { setAutocompleteLoading(false); }
      } else {
        setFilteredAutocomplete([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  
  useEffect(() => {
    const fetchPatientByMobile = async () => {
      if (formData.mobileNo && formData.mobileNo.length === 10) {
        try {
          const res = await axios.get(`https://napi.bharatmedicalhallplus.com/patient/by-mobile/${formData.mobileNo}`);
          if (res.data && res.data.success && res.data.patient) {
            const p = res.data.patient;
            setFormData(prev => ({
              ...prev,
              patientName: p.name || prev.patientName,
              patientEmail: p.email || prev.patientEmail,
              patientAddress: p.address || p.city || prev.patientAddress,
              orderDiscPer: "10"
            }));
            // Calculate with 10% discount
            recalculateTotal(items, "10");
          }
        } catch (err) {
          console.log("Patient fetch error:", err.message);
        }
      }
    };
    fetchPatientByMobile();
  }, [formData.mobileNo]);

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

  const itemsRef = React.useRef(items);
  const formDataRef = React.useRef(formData);
  const handleSubmitRef = React.useRef(null);
  
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { formDataRef.current = formData; }, [formData]);

  const handleKeyDown = useCallback((e) => {
    if (e.altKey && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      e.stopPropagation();
      setItemMasterVisible(true);
    } else if (e.altKey && e.key === '-') {
      e.preventDefault();
      e.stopPropagation();
      const currentItems = itemsRef.current;
      if (currentItems.length > 0) {
        const newItems = currentItems.slice(0, -1);
        setItems(newItems);
        recalculateTotal(newItems, formDataRef.current.orderDiscPer);
      }
    } else if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      if (handleSubmitRef.current) handleSubmitRef.current();
    } else if (e.key === 'F7') {
      e.preventDefault();
      e.stopPropagation();
      setItems([]);
      setFormData(prev => ({
        ...prev,
        ipNo: "", mobileNo: "", patientName: "", patientAddress: "", patientEmail: "",
        orderTotal: "0.00", orderDiscPer: "0.00",
        refNo: Math.floor(Math.random() * 10000), orderId: Math.floor(Math.random() * 1000)
      }));
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Use capture phase to ensure it triggers before input fields handle it
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [handleKeyDown]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'orderDiscPer') {
      recalculateTotal(items, value);
    }
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

  const recalculateTotal = (currentItems, discPerOverride) => {
    let grossTotal = 0;
    currentItems.forEach(item => {
      grossTotal += (parseFloat(item.saleRate) || 0) * (parseInt(item.totalLooseQty) || 0);
    });
    
    const discPer = parseFloat(discPerOverride !== undefined ? discPerOverride : formData.orderDiscPer) || 0;
    const finalTotal = grossTotal - (grossTotal * discPer / 100);
    
    setFormData(prev => ({ ...prev, orderTotal: finalTotal.toFixed(2) }));
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
      if (Platform.OS === 'web' && window.confirm("Do you want to print the bill?")) {
        printBill(formData, items);
      }
      router.push('/employee/dashboard/pharmacy/sales-order-list');
    } catch (err) {
      console.error(err);
      alert("Failed to save sales order. The endpoint might not exist yet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

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
            <View style={[styles.fieldRow, { marginTop: 15 }]}>
              <Text style={styles.fieldLabel}>Order Disc (%)</Text>
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                keyboardType="numeric"
                value={formData.orderDiscPer} 
                onChangeText={t => updateField('orderDiscPer', t)} 
              />
            </View>
            <View style={styles.paymentModes}>
              <Text style={styles.paymentRadio}>◉ CASH</Text>
              <Text style={styles.paymentRadio}>○ CARD</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Meta Info Bar (Right side of Screenshot 1) */}
      <View style={styles.metaBar}>
        <View style={styles.metaRow}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 'auto'}}>
            <Text style={styles.metaLabel}>Ref ID</Text>
            <TextInput style={[styles.input, {width: 60, backgroundColor: '#ff0'}]} value={formData.refNo.toString()} editable={false} />
            <TextInput style={[styles.input, {width: 20, backgroundColor: '#ff0'}]} value="0" editable={false} />
            <TextInput style={[styles.input, {width: 60, backgroundColor: '#ff0', marginRight: 10}]} editable={false} />
            <Text style={styles.metaLabel}>Modi DateTime</Text>
            <TextInput style={[styles.input, {width: 70, color: 'red'}]} value={formData.ordDate} editable={false} />
            <TextInput style={[styles.input, {width: 70, color: 'red'}]} value={formData.ordTime} editable={false} />
          </View>
        </View>
        <View style={[styles.metaRow, {marginTop: 4}]}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 'auto'}}>
            <Text style={styles.metaLabel}>Disc. in Amt</Text>
            <TextInput style={[styles.input, {width: 50}]} value={(parseFloat(formData.orderTotal) * parseFloat(formData.orderDiscPer || 0) / 100).toFixed(2) || ".00"} editable={false} />
            <Text style={styles.metaLabel}>Advance Amt</Text>
            <TextInput style={[styles.input, {width: 50}]} value=".00" editable={false} />
            <Text style={styles.metaLabel}>USER</Text>
            <TextInput style={[styles.input, {width: 70}]} value={formData.userId} editable={false} />
            <Text style={styles.metaLabel}>SMan</Text>
            <TextInput style={[styles.input, {width: 70}]} value={formData.userId} editable={false} />
            <Text style={styles.metaLabel}>Modified</Text>
            <TextInput style={[styles.input, {width: 70, color: 'red'}]} value={formData.userId} editable={false} />
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

      {/* Item Search and Totals Footer */}
      <View style={[styles.itemSearchFooter, { zIndex: 999 }]}>
        <View style={{flexDirection: 'row', alignItems: 'center', position: 'relative', zIndex: 999}}>
          <TouchableOpacity style={styles.plusMinusBtn} onPress={() => setItemMasterVisible(true)}><Text>+</Text></TouchableOpacity>
          <TouchableOpacity style={styles.plusMinusBtn}><Text>-</Text></TouchableOpacity>
          <Text style={[styles.metaLabel, {marginLeft: 5}]}>Item Search:</Text>
          <View style={{position: 'relative', zIndex: 1000}}>
            <TextInput 
              style={[styles.input, {width: 250, backgroundColor: '#fff'}]} 
              value={searchQuery}
              placeholder="Type to search..."
              onChangeText={(txt) => {
                 setSearchQuery(txt);
                 setHighlightedIndex(0);
              }}
              onKeyDown={(e) => {
                 if (e.key === 'ArrowDown') {
                   e.preventDefault();
                   setHighlightedIndex(prev => Math.min(filteredAutocomplete.length - 1, prev + 1));
                 } else if (e.key === 'ArrowUp') {
                   e.preventDefault();
                   setHighlightedIndex(prev => Math.max(0, prev - 1));
                 } else if (e.key === 'Enter') {
                   e.preventDefault();
                   if (filteredAutocomplete.length > 0) {
                     handleItemSelect(filteredAutocomplete[highlightedIndex]);
                     setSearchQuery('');
                     setFilteredAutocomplete([]);
                   }
                 } else if (e.key === 'Escape') {
                   setFilteredAutocomplete([]);
                 }
              }}
              onFocus={() => {
                 // Trigger search again if needed
                 if (searchQuery.trim().length > 1 && filteredAutocomplete.length === 0) {
                     setSearchQuery(searchQuery + ' ');
                     setTimeout(() => setSearchQuery(searchQuery.trim()), 0);
                 }
              }}
            />
            {filteredAutocomplete.length > 0 && (
              <ScrollView style={{
                position: 'absolute', 
                bottom: 25, 
                left: 0,
                width: 400,
                maxHeight: 250,
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: '#000',
                zIndex: 1000,
                elevation: 10
              }}
              keyboardShouldPersistTaps="handled"
              >
                {filteredAutocomplete.map((item, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={{
                      padding: 8, 
                      borderBottomWidth: 1, 
                      borderBottomColor: '#eee',
                      backgroundColor: idx === highlightedIndex ? '#e6f7ff' : '#fff',
                      flexDirection: 'row',
                      justifyContent: 'space-between'
                    }}
                    onPress={() => {
                      handleItemSelect(item);
                      setSearchQuery('');
                      setFilteredAutocomplete([]);
                    }}
                  >
                    <Text style={{fontWeight: 'bold', fontSize: 12, flex: 1}}>{item.itemName}</Text>
                    <Text style={{fontSize: 12, color: '#666', width: 150, textAlign: 'right'}}>Rate: {item.saleRate} | Qty: {item.stockBalQty}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
          {autocompleteLoading && <ActivityIndicator size="small" color="#000" style={{marginLeft: 10}} />}
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TextInput style={[styles.input, {width: 50, textAlign: 'right', backgroundColor: '#fff'}]} value={items.length.toString()} editable={false} />
          <TextInput style={[styles.input, {width: 40, textAlign: 'right', backgroundColor: '#fff'}]} value={items.reduce((sum, item) => sum + (parseInt(item.totalLooseQty)||0), 0).toString()} editable={false} />
          <TextInput style={[styles.input, {width: 40, textAlign: 'right', backgroundColor: '#fff'}]} value="0" editable={false} />
        </View>
        <TextInput style={[styles.input, {width: 100, textAlign: 'right', backgroundColor: '#fff', fontWeight: 'bold'}]} value={formData.orderTotal} editable={false} />
      </View>

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
  metaBar: {
    paddingHorizontal: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#777'
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  metaLabel: {
    fontSize: 11,
    color: '#333',
    marginRight: 4,
    marginLeft: 8
  },
  itemSearchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 5,
    backgroundColor: '#b5d09b',
    borderTopWidth: 1,
    borderTopColor: '#777',
    borderBottomWidth: 1,
    borderBottomColor: '#777'
  },
  plusMinusBtn: {
    width: 20,
    height: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#777',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2
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