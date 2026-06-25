import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { API_URL } from '../../../config';
import { Download, FileText, CheckCircle } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';

export default function Payslips() {
  const { isMobile, isDesktop } = useResponsive();
  const [employee, setEmployee] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    try {
      const empData = Platform.OS === 'web' 
        ? localStorage.getItem('employeeUser')
        : null;

      if (!empData) return;
      const emp = JSON.parse(empData);
      setEmployee(emp);

      const res = await fetch(`${API_URL}/leave/payslips?employee_id=${emp.id}`);
      if (res.ok) {
        const data = await res.json();
        setPayslips(data);
      }
    } catch (error) {
      console.error('Error fetching payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePayslip = async () => {
    if (!employee) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/leave/payslip/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          month: selectedMonth
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Payslip generated successfully');
        if (Platform.OS === 'web') window.alert('Payslip generated successfully');
        fetchPayslips();
      } else {
        Alert.alert('Error', data.message || 'Failed to generate');
        if (Platform.OS === 'web') window.alert(data.message || 'Failed to generate');
      }
    } catch (error) {
      console.error('Error generating payslip:', error);
    } finally {
      setGenerating(false);
    }
  };

  const downloadPayslip = (payslip: any) => {
    if (Platform.OS === 'web') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payslip, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `payslip_${payslip.month}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } else {
      Alert.alert('Payslip Data', JSON.stringify(payslip, null, 2));
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isMobile && { padding: 16 }]}>
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <FileText size={28} color={Colors.light.primary} />
        </View>
        <View>
          <Text style={styles.title}>Payslips & Salary</Text>
          <Text style={styles.subtitle}>View your monthly earnings and deductions</Text>
        </View>
      </View>

      <View style={[styles.layout, !isMobile && { flexDirection: 'row', gap: 24 }]}>
        <View style={[styles.section, !isMobile && { flex: 1 }]}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Generate / Fetch Payslip</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Month (YYYY-MM)</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 12 }]}
                  value={selectedMonth}
                  onChangeText={setSelectedMonth}
                  placeholder="e.g. 2026-06"
                  placeholderTextColor={Colors.light.icon}
                />
                <Pressable 
                  style={[styles.btn, generating && { opacity: 0.7 }]} 
                  onPress={generatePayslip}
                  disabled={generating}
                >
                  <Text style={styles.btnText}>{generating ? 'Generating...' : 'Generate'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.section, !isMobile && { flex: 1.5 }]}>
          <Text style={styles.sectionHeading}>Your Payslips</Text>
          {payslips.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color={Colors.light.border} />
              <Text style={styles.emptyStateText}>No payslips available.</Text>
            </View>
          ) : (
            payslips.map((ps) => (
              <View key={ps.id} style={styles.psCard}>
                <View style={styles.psHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <CheckCircle size={20} color={Colors.light.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.psMonth}>Payslip for {ps.month}</Text>
                  </View>
                  <Pressable style={styles.downloadBtn} onPress={() => downloadPayslip(ps)}>
                    <Download size={16} color="white" />
                    <Text style={styles.downloadBtnText}>Download</Text>
                  </Pressable>
                </View>
                <View style={styles.psDetails}>
                  <View style={styles.psRow}>
                    <Text style={styles.psLabel}>Base Salary:</Text>
                    <Text style={styles.psValue}>₹{ps.base_salary}</Text>
                  </View>
                  
                  {ps.details ? (
                    <>
                      {/* Detailed Breakdown from JSON */}
                      {(() => {
                         let d = ps.details;
                         if (typeof d === 'string') {
                           try { d = JSON.parse(d); } catch(e){}
                         }
                         return (
                           <>
                             <View style={styles.psRow}>
                               <Text style={styles.psLabel}>Extra Leave Deduction:</Text>
                               <View style={{ alignItems: 'flex-end' }}>
                                 <Text style={[styles.psValue, { color: Colors.light.error }]}>- ₹{d.leaves?.total_deduction || 0}</Text>
                                 <Text style={styles.psSubtext}>
                                   {d.leaves?.total_taken} taken, {d.leaves?.free_limit} free, {d.leaves?.penalized} penalized @ ₹{d.leaves?.penalty_per_day}/day
                                 </Text>
                               </View>
                             </View>

                             <View style={styles.psRow}>
                               <Text style={styles.psLabel}>Late Check-in Deduction:</Text>
                               <View style={{ alignItems: 'flex-end' }}>
                                 <Text style={[styles.psValue, { color: Colors.light.error }]}>- ₹{d.late_checkins?.total_deduction || 0}</Text>
                                 <Text style={styles.psSubtext}>
                                   {d.late_checkins?.total_occurrences} late, {d.late_checkins?.free_limit} free, {d.late_checkins?.penalized} penalized @ ₹{d.late_checkins?.penalty_per_instance}/instance
                                 </Text>
                               </View>
                             </View>

                             <View style={styles.psRow}>
                               <Text style={styles.psLabel}>Early Check-out Deduction:</Text>
                               <View style={{ alignItems: 'flex-end' }}>
                                 <Text style={[styles.psValue, { color: Colors.light.error }]}>- ₹{d.early_checkouts?.total_deduction || 0}</Text>
                                 <Text style={styles.psSubtext}>
                                   {d.early_checkouts?.total_occurrences} early, {d.early_checkouts?.free_limit} free, {d.early_checkouts?.penalized} penalized @ ₹{d.early_checkouts?.penalty_per_instance}/instance
                                 </Text>
                               </View>
                             </View>
                           </>
                         );
                      })()}
                    </>
                  ) : (
                    <>
                      {/* Fallback for old payslips without details */}
                      <View style={styles.psRow}>
                        <Text style={styles.psLabel}>Extra Leave Deduction:</Text>
                        <Text style={[styles.psValue, { color: Colors.light.error }]}>- ₹{ps.extra_leave_deduction}</Text>
                      </View>
                      <View style={styles.psRow}>
                        <Text style={styles.psLabel}>Late Check-in Deduction:</Text>
                        <Text style={[styles.psValue, { color: Colors.light.error }]}>- ₹{ps.late_checkin_deduction}</Text>
                      </View>
                      <View style={styles.psRow}>
                        <Text style={styles.psLabel}>Early Check-out Deduction:</Text>
                        <Text style={[styles.psValue, { color: Colors.light.error }]}>- ₹{ps.early_checkout_deduction}</Text>
                      </View>
                    </>
                  )}

                  <View style={[styles.psRow, styles.psTotalRow]}>
                    <Text style={styles.psTotalLabel}>Net Salary:</Text>
                    <Text style={styles.psTotalValue}>₹{ps.net_salary}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: Colors.light.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.light.icon, marginTop: 4 },
  layout: { gap: 24 },
  section: { flex: 1 },
  sectionHeading: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },
  card: { backgroundColor: Colors.light.card, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, padding: 16, fontSize: 15, backgroundColor: Colors.light.background, color: Colors.light.text },
  btn: { backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 48, backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, borderStyle: 'dashed' },
  emptyStateText: { color: Colors.light.icon, marginTop: 12, fontSize: 15, fontWeight: '500' },
  psCard: { backgroundColor: Colors.light.card, padding: 24, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  psHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.light.border, paddingBottom: 16, marginBottom: 16 },
  psMonth: { fontSize: 18, fontWeight: '800', color: Colors.light.text },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  downloadBtnText: { color: 'white', marginLeft: 6, fontSize: 13, fontWeight: '700' },
  psDetails: { gap: 12 },
  psRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  psLabel: { fontSize: 15, color: Colors.light.icon, fontWeight: '500' },
  psValue: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  psTotalRow: { marginTop: 8, paddingTop: 16, borderTopWidth: 2, borderTopColor: Colors.light.background },
  psTotalLabel: { fontSize: 16, fontWeight: '800', color: Colors.light.text },
  psTotalValue: { fontSize: 24, fontWeight: '800', color: Colors.light.primary },
  psSubtext: { fontSize: 12, color: Colors.light.icon, marginTop: 4 },
});
