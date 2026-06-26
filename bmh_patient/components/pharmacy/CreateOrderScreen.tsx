import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { API_URL } from '../../config';

export default function CreateOrderScreen() {
  const now = new Date();
  const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const localTime = now.toTimeString().split(' ')[0];

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    apiKey: '',
    ipNo: '',
    mobileNo: '',
    patientName: '',
    patientAddress: '',
    patientEmail: '',
    counterSale: '',
    ordDate: localDate,
    ordTime: localTime,
    userId: '',
    actCode: '',
    actName: '',
    drCode: '',
    drName: '',
    drAddress: '',
    drRegNo: '',
    drOfficeCode: '',
    dmanCode: '',
    orderTotal: '0.00',
    orderDiscPer: '',
    refNo: '',
    orderId: '',
    ordRefNo: '',
    sysName: '',
    sysIp: '',
    sysUser: '',
    remark: '',
    urgentFlag: 0,
    ordConversionFlag: 0,
    dcConversionFlag: 0,
  });

  const [materials, setMaterials] = useState<any[]>([
    {
      itemSeq: 1,
      itemcode: '',
      totalLooseQty: '',
      totalLooseSchQty: '',
      serviceQty: '',
      saleRate: '',
      discPer: '',
      schDiscPer: '',
    },
  ]);

  const handleChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const calculateOrderTotal = (rows: any[]) => {
    return rows
      .reduce((sum, row) => {
        const rate = parseFloat(row.saleRate) || 0;
        const qty = parseFloat(row.serviceQty) || 0;
        return sum + rate * qty;
      }, 0)
      .toFixed(2);
  };

  const handleMaterialChange = (index: number, field: string, value: string) => {
    const updated = [...materials];
    updated[index][field] = value;
    
    const total = calculateOrderTotal(updated);
    setMaterials(updated);
    setForm(prev => ({ ...prev, orderTotal: total }));
  };

  const addRow = () => {
    const updated = [
      ...materials,
      {
        itemSeq: materials.length + 1,
        itemcode: '',
        totalLooseQty: '',
        totalLooseSchQty: '',
        serviceQty: '',
        saleRate: '',
        discPer: '',
        schDiscPer: '',
      },
    ];
    setMaterials(updated);
    setForm(prev => ({ ...prev, orderTotal: calculateOrderTotal(updated) }));
  };

  const removeRow = (index: number) => {
    if (materials.length <= 1) return;
    const updated = materials.filter((_, i) => i !== index).map((row, i) => ({
      ...row,
      itemSeq: i + 1
    }));
    setMaterials(updated);
    setForm(prev => ({ ...prev, orderTotal: calculateOrderTotal(updated) }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        c2Code: '03B000',
        storeId: '001',
        prodCode: '02',
        ...form,
        materialInfo: materials.map(m => ({
          itemSeq: parseInt(m.itemSeq) || 1,
          itemcode: m.itemcode,
          totalLooseQty: parseFloat(m.totalLooseQty) || 0,
          totalLooseSchQty: parseFloat(m.totalLooseSchQty) || 0,
          serviceQty: parseFloat(m.serviceQty) || 0,
          saleRate: parseFloat(m.saleRate) || 0,
          discPer: parseFloat(m.discPer) || 0,
          schDiscPer: parseFloat(m.schDiscPer) || 0,
        })),
      };

      const res = await fetch(`${API_URL}/pharmacy/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create order');
      const data = await res.json();

      setSuccess('Order created successfully!');
      
      const orderNoToTrack = data?.orderId || form.orderId;
      if (orderNoToTrack) {
        setTimeout(() => {
          router.push(`./order-status?order_no=${orderNoToTrack}`);
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while submitting the order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Sales Order</Text>
        <Text style={styles.subtitle}>
          Draft new sales orders with patient, doctor, and material specifics.
        </Text>
      </View>

      {/* Patient Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Patient Information</Text>
        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>IP No</Text>
            <TextInput
              style={styles.input}
              placeholder="IP Number"
              value={form.ipNo}
              onChangeText={val => handleChange('ipNo', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Mobile No</Text>
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
              keyboardType="phone-pad"
              value={form.mobileNo}
              onChangeText={val => handleChange('mobileNo', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Patient Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={form.patientName}
              onChangeText={val => handleChange('patientName', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Patient Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={form.patientAddress}
              onChangeText={val => handleChange('patientAddress', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Patient Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              keyboardType="email-address"
              value={form.patientEmail}
              onChangeText={val => handleChange('patientEmail', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Counter Sale</Text>
            <TextInput
              style={styles.input}
              placeholder="Counter Sale"
              value={form.counterSale}
              onChangeText={val => handleChange('counterSale', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>User ID</Text>
            <TextInput
              style={styles.input}
              placeholder="User ID"
              value={form.userId}
              onChangeText={val => handleChange('userId', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Act Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Act Code"
              value={form.actCode}
              onChangeText={val => handleChange('actCode', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Act Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Act Name"
              value={form.actName}
              onChangeText={val => handleChange('actName', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Order Date</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={form.ordDate}
                onChange={e => handleChange('ordDate', e.target.value)}
                style={styles.webDatePicker}
              />
            ) : (
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={form.ordDate}
                onChangeText={val => handleChange('ordDate', val)}
              />
            )}
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Order Time</Text>
            {Platform.OS === 'web' ? (
              <input
                type="time"
                step="1"
                value={form.ordTime}
                onChange={e => handleChange('ordTime', e.target.value)}
                style={styles.webDatePicker}
              />
            ) : (
              <TextInput
                style={styles.input}
                placeholder="HH:MM:SS"
                value={form.ordTime}
                onChangeText={val => handleChange('ordTime', val)}
              />
            )}
          </View>
        </View>
      </View>

      {/* Doctor Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Doctor Information</Text>
        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Dr Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Dr Code"
              value={form.drCode}
              onChangeText={val => handleChange('drCode', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Dr Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Dr Name"
              value={form.drName}
              onChangeText={val => handleChange('drName', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Dr Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Dr Address"
              value={form.drAddress}
              onChangeText={val => handleChange('drAddress', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Dr Reg No</Text>
            <TextInput
              style={styles.input}
              placeholder="Dr Reg No"
              value={form.drRegNo}
              onChangeText={val => handleChange('drRegNo', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Dr Office Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Dr Office Code"
              value={form.drOfficeCode}
              onChangeText={val => handleChange('drOfficeCode', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>DMAN Code</Text>
            <TextInput
              style={styles.input}
              placeholder="DMAN Code"
              value={form.dmanCode}
              onChangeText={val => handleChange('dmanCode', val)}
            />
          </View>
        </View>
      </View>

      {/* Order Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Details</Text>
        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Order Total (₹)</Text>
            <TextInput
              style={[styles.input, styles.readOnlyInput]}
              value={form.orderTotal}
              editable={false}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Order Disc %</Text>
            <TextInput
              style={styles.input}
              placeholder="Discount %"
              keyboardType="numeric"
              value={form.orderDiscPer}
              onChangeText={val => handleChange('orderDiscPer', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Ref No</Text>
            <TextInput
              style={styles.input}
              placeholder="Reference No"
              value={form.refNo}
              onChangeText={val => handleChange('refNo', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Order ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Order ID"
              value={form.orderId}
              onChangeText={val => handleChange('orderId', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Order Ref No</Text>
            <TextInput
              style={styles.input}
              placeholder="Order Ref No"
              value={form.ordRefNo}
              onChangeText={val => handleChange('ordRefNo', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Sys Name</Text>
            <TextInput
              style={styles.input}
              placeholder="System Name"
              value={form.sysName}
              onChangeText={val => handleChange('sysName', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Sys IP</Text>
            <TextInput
              style={styles.input}
              placeholder="System IP"
              value={form.sysIp}
              onChangeText={val => handleChange('sysIp', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>Sys User</Text>
            <TextInput
              style={styles.input}
              placeholder="System User"
              value={form.sysUser}
              onChangeText={val => handleChange('sysUser', val)}
            />
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.inputLabel}>API Key (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Auto-filled by server"
              value={form.apiKey}
              onChangeText={val => handleChange('apiKey', val)}
            />
          </View>
          <View style={[styles.gridCol, { width: '100%' }]}>
            <Text style={styles.inputLabel}>Remark</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Order remarks..."
              multiline
              numberOfLines={3}
              value={form.remark}
              onChangeText={val => handleChange('remark', val)}
            />
          </View>
        </View>

        {/* Flag Switches */}
        <View style={styles.switchesRow}>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Urgent Flag</Text>
            <Switch
              value={form.urgentFlag === 1}
              onValueChange={val => handleChange('urgentFlag', val ? '1' : '0')}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={form.urgentFlag === 1 ? Colors.light.primary : '#F1F5F9'}
            />
          </View>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Ord Conversion</Text>
            <Switch
              value={form.ordConversionFlag === 1}
              onValueChange={val => handleChange('ordConversionFlag', val ? '1' : '0')}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={form.ordConversionFlag === 1 ? Colors.light.primary : '#F1F5F9'}
            />
          </View>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>DC Conversion</Text>
            <Switch
              value={form.dcConversionFlag === 1}
              onValueChange={val => handleChange('dcConversionFlag', val ? '1' : '0')}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={form.dcConversionFlag === 1 ? Colors.light.primary : '#F1F5F9'}
            />
          </View>
        </View>
      </View>

      {/* Material Information Card */}
      <View style={styles.card}>
        <View style={styles.materialHeader}>
          <Text style={styles.cardTitle}>Material Details</Text>
          <TouchableOpacity style={styles.addBtn} onPress={addRow}>
            <Plus size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.addBtnText}>Add Material</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal style={{ width: '100%' }}>
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, { width: 50 }]}>Seq</Text>
              <Text style={[styles.headerCell, { width: 140 }]}>Item Code *</Text>
              <Text style={[styles.headerCell, { width: 110 }]}>Loose Qty</Text>
              <Text style={[styles.headerCell, { width: 110 }]}>Loose Sch Qty</Text>
              <Text style={[styles.headerCell, { width: 110 }]}>Service Qty</Text>
              <Text style={[styles.headerCell, { width: 110 }]}>Sale Rate</Text>
              <Text style={[styles.headerCell, { width: 90 }]}>Disc %</Text>
              <Text style={[styles.headerCell, { width: 90 }]}>Sch Disc %</Text>
              <Text style={[styles.headerCell, { width: 60, textAlign: 'center' }]}>Action</Text>
            </View>

            {/* Table Rows */}
            {materials.map((row, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.cell, { width: 50, fontWeight: '600' }]}>{row.itemSeq}</Text>
                <TextInput
                  style={[styles.tableInput, { width: 130 }]}
                  placeholder="CODE"
                  value={row.itemcode}
                  onChangeText={val => handleMaterialChange(index, 'itemcode', val)}
                />
                <TextInput
                  style={[styles.tableInput, { width: 100 }]}
                  placeholder="0"
                  keyboardType="numeric"
                  value={row.totalLooseQty}
                  onChangeText={val => handleMaterialChange(index, 'totalLooseQty', val)}
                />
                <TextInput
                  style={[styles.tableInput, { width: 100 }]}
                  placeholder="0"
                  keyboardType="numeric"
                  value={row.totalLooseSchQty}
                  onChangeText={val => handleMaterialChange(index, 'totalLooseSchQty', val)}
                />
                <TextInput
                  style={[styles.tableInput, { width: 100 }]}
                  placeholder="0"
                  keyboardType="numeric"
                  value={row.serviceQty}
                  onChangeText={val => handleMaterialChange(index, 'serviceQty', val)}
                />
                <TextInput
                  style={[styles.tableInput, { width: 100 }]}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={row.saleRate}
                  onChangeText={val => handleMaterialChange(index, 'saleRate', val)}
                />
                <TextInput
                  style={[styles.tableInput, { width: 80 }]}
                  placeholder="0%"
                  keyboardType="numeric"
                  value={row.discPer}
                  onChangeText={val => handleMaterialChange(index, 'discPer', val)}
                />
                <TextInput
                  style={[styles.tableInput, { width: 80 }]}
                  placeholder="0%"
                  keyboardType="numeric"
                  value={row.schDiscPer}
                  onChangeText={val => handleMaterialChange(index, 'schDiscPer', val)}
                />
                <View style={{ width: 60, alignItems: 'center' }}>
                  <TouchableOpacity 
                    onPress={() => removeRow(index)} 
                    disabled={materials.length <= 1}
                    style={[styles.deleteBtn, materials.length <= 1 && styles.deleteBtnDisabled]}
                  >
                    <Trash2 size={16} color={materials.length <= 1 ? '#94A3B8' : '#EF4444'} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Notifications and Submits */}
      {success && (
        <View style={styles.successBox}>
          <CheckCircle2 size={18} color={Colors.light.success} style={{ marginRight: 8 }} />
          <Text style={styles.successText}>{success}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <AlertCircle size={18} color={Colors.light.error} style={{ marginRight: 8 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Submit Sales Order</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginTop: 6,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridCol: {
    width: '100%',
    // Fallback for smaller screens, on web/desktop we flex basis
    minWidth: 200,
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
    paddingLeft: 2,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: '#fff',
  },
  readOnlyInput: {
    backgroundColor: '#F8FAFC',
    color: Colors.light.textMuted,
    fontWeight: '600',
  },
  textarea: {
    height: 80,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
  },
  webDatePicker: {
    height: 40,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: Colors.light.text,
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },
  switchesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  addBtn: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  tableContainer: {
    flexDirection: 'column',
    minWidth: 850,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    borderRadius: 6,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textMuted,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    alignItems: 'center',
  },
  cell: {
    fontSize: 13,
    color: Colors.light.text,
    paddingHorizontal: 4,
  },
  tableInput: {
    height: 34,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    backgroundColor: '#fff',
    color: Colors.light.text,
    marginHorizontal: 4,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  deleteBtnDisabled: {
    borderColor: Colors.light.border,
    backgroundColor: '#F8FAFC',
    opacity: 0.5,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 24,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.success,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.error,
  },
  submitBtn: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
