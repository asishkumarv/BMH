import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../constants/Colors';
import { API_URL } from '../../../config';
import { Download, FileText, CheckCircle } from 'lucide-react-native';
import { useResponsive } from '../../../hooks/useResponsive';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
      let empData = null;
      if (Platform.OS === 'web') {
        empData = localStorage.getItem('subAdminUser');
      } else {
        empData = await AsyncStorage.getItem('subAdminUser');
      }

      if (!empData) return;
      const emp = JSON.parse(empData);
      setEmployee(emp);

      const res = await fetch(`${API_URL}/leave/payslips?employee_id=${emp.id}&user_type=sub_admin`);
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
        body: JSON.stringify({ user_type: "sub_admin",
          employee_id: employee.id,
          month: selectedMonth + '-SA'
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

  const downloadPayslip = async (payslip: any) => {
    let d = payslip.details;
    if (typeof d === 'string') {
      try { d = JSON.parse(d); } catch(e){}
    }

    const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          h1 { text-align: center; color: #2563EB; margin-bottom: 5px; }
          h3 { text-align: center; color: #64748B; margin-top: 0; }
          .header { border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; margin-bottom: 30px; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-box { background: #F8FAFC; padding: 15px; border-radius: 8px; width: 45%; line-height: 1.6; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .table th, .table td { padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: left; }
          .table th { background: #F1F5F9; color: #475569; }
          .amount { text-align: right !important; font-family: monospace; font-size: 1.1em; }
          .total-row { font-weight: bold; font-size: 1.2em; background: #EFF6FF; }
          .total-row td { border-top: 2px solid #2563EB; }
          .deduction { color: #EF4444; }
          .details { font-size: 0.85em; color: #64748B; display: block; margin-top: 4px; }
          .footer { text-align: center; margin-top: 50px; font-size: 0.9em; color: #94A3B8; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BMH Employee Portal</h1>
          <h3>Payslip for Month: ${payslip.month.replace('-SA', '')}</h3>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <strong>Employee Name:</strong> ${employee?.full_name || 'N/A'}<br/>
            <strong>Employee ID:</strong> ${employee?.employee_id || employee?.id || 'N/A'}<br/>
            <strong>Department:</strong> ${employee?.department || 'N/A'}
          </div>
          <div class="info-box">
            <strong>Role:</strong> ${employee?.role || 'N/A'}<br/>
            <strong>Base Salary:</strong> ₹${payslip.base_salary}<br/>
            <strong>Net Salary:</strong> ₹${payslip.net_salary}
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="amount">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Base Salary</strong></td>
              <td class="amount">${payslip.base_salary}</td>
            </tr>
            <tr>
              <td><strong>Appreciation Amount</strong></td>
              <td class="amount" style="color: #10B981">+ ${payslip.appreciation_amount || 0}</td>
            </tr>
            <tr>
              <td><strong>Extra Working Amount</strong></td>
              <td class="amount" style="color: #10B981">+ ${payslip.extra_working_amount || 0}</td>
            </tr>
            <tr>
              <td><strong>Total Worked Hours</strong></td>
              <td class="amount">${d?.total_worked_hours !== undefined ? `${d.total_worked_hours} / 270h` : 'N/A'}</td>
            </tr>
            ${d ? `
            <tr>
              <td>
                <strong>Extra Leave Deduction</strong>
                <span class="details">${d.leaves?.total_taken} taken, ${d.leaves?.free_limit} free, ${d.leaves?.penalized} penalized @ ₹${d.leaves?.penalty_per_day}/day</span>
              </td>
              <td class="amount deduction">- ${d.leaves?.total_deduction || 0}</td>
            </tr>
            <tr>
              <td>
                <strong>Late Check-in Deduction</strong>
                <span class="details">${d.late_checkins?.total_occurrences} late, ${d.late_checkins?.free_limit} free, ${d.late_checkins?.penalized} penalized @ ₹${d.late_checkins?.penalty_per_instance}/instance</span>
              </td>
              <td class="amount deduction">- ${d.late_checkins?.total_deduction || 0}</td>
            </tr>
            <tr>
              <td>
                <strong>Early Check-out Deduction</strong>
                <span class="details">${d.early_checkouts?.total_occurrences} early, ${d.early_checkouts?.free_limit} free, ${d.early_checkouts?.penalized} penalized @ ₹${d.early_checkouts?.penalty_per_instance}/instance</span>
              </td>
              <td class="amount deduction">- ${d.early_checkouts?.total_deduction || 0}</td>
            </tr>
            ` : `
            <tr>
              <td><strong>Extra Leave Deduction</strong></td>
              <td class="amount deduction">- ${payslip.extra_leave_deduction}</td>
            </tr>
            <tr>
              <td><strong>Late Check-in Deduction</strong></td>
              <td class="amount deduction">- ${payslip.late_checkin_deduction}</td>
            </tr>
            <tr>
              <td><strong>Early Check-out Deduction</strong></td>
              <td class="amount deduction">- ${payslip.early_checkout_deduction}</td>
            </tr>
            `}
            <tr class="total-row">
              <td>NET SALARY</td>
              <td class="amount">₹${payslip.net_salary}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          This is a computer generated payslip and does not require a signature.
        </div>
      </body>
    </html>
    `;

    try {
      if (Platform.OS === 'web') {
        // On web, open a new window to print just the payslip HTML
        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        } else {
          window.alert('Please allow pop-ups to print payslips');
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: `Payslip_${payslip.month.replace('-SA', '')}` });
        } else {
          Alert.alert("Success", "PDF generated at: " + uri);
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
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
    <ScrollView style={[styles.container, !isDesktop && { padding: 16 }]}>
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <FileText size={28} color={Colors.light.primary} />
        </View>
        <View>
          <Text style={styles.title}>Payslips & Salary</Text>
          <Text style={styles.subtitle}>View your monthly earnings and deductions</Text>
        </View>
      </View>

      <View style={[styles.layout, isDesktop && { flexDirection: 'row', gap: 24 }]}>
        <View style={[styles.section, isDesktop && { flex: 1 }]}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Generate / Fetch Payslip</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Month (YYYY-MM)</Text>
              <View style={[styles.row, !isDesktop && { flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}>
                <TextInput
                  style={[styles.input, isDesktop && { flex: 1, marginRight: 12 }]}
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

        <View style={[styles.section, isDesktop && { flex: 1.5 }]}>
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
                    <Text style={styles.psMonth}>Payslip for {ps.month.replace('-SA', '')}</Text>
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
                               <View style={{ alignItems: 'flex-end', flex: 1, paddingLeft: 16 }}>
                                 <Text style={[styles.psValue, { color: Colors.light.error }]}>- ₹{d.leaves?.total_deduction || 0}</Text>
                                 <Text style={styles.psSubtext}>
                                   {d.leaves?.total_taken} taken, {d.leaves?.free_limit} free, {d.leaves?.penalized} penalized @ ₹{d.leaves?.penalty_per_day}/day
                                 </Text>
                               </View>
                             </View>

                             <View style={styles.psRow}>
                               <Text style={styles.psLabel}>Late Check-in Deduction:</Text>
                               <View style={{ alignItems: 'flex-end', flex: 1, paddingLeft: 16 }}>
                                 <Text style={[styles.psValue, { color: Colors.light.error }]}>- ₹{d.late_checkins?.total_deduction || 0}</Text>
                                 <Text style={styles.psSubtext}>
                                   {d.late_checkins?.total_occurrences} late, {d.late_checkins?.free_limit} free, {d.late_checkins?.penalized} penalized @ ₹{d.late_checkins?.penalty_per_instance}/instance
                                 </Text>
                               </View>
                             </View>

                             <View style={styles.psRow}>
                               <Text style={styles.psLabel}>Early Check-out Deduction:</Text>
                               <View style={{ alignItems: 'flex-end', flex: 1, paddingLeft: 16 }}>
                                 <Text style={[styles.psValue, { color: Colors.light.error }]}>- ₹{d.early_checkouts?.total_deduction || 0}</Text>
                                 <Text style={styles.psSubtext}>
                                   {d.early_checkouts?.total_occurrences} early, {d.early_checkouts?.free_limit} free, {d.early_checkouts?.penalized} penalized @ ₹{d.early_checkouts?.penalty_per_instance}/instance
                                 </Text>
                               </View>
                             </View>
                              <View style={styles.psRow}>
                                <Text style={styles.psLabel}>Total Worked Hours:</Text>
                                <View style={{ alignItems: 'flex-end', flex: 1, paddingLeft: 16 }}>
                                  <Text style={styles.psValue}>{d.total_worked_hours !== undefined ? `${d.total_worked_hours}h / 270h` : 'N/A'}</Text>
                                </View>
                              </View>

                              <View style={styles.psRow}>
                                <Text style={styles.psLabel}>Appreciation / Extra Work:</Text>
                                <View style={{ alignItems: 'flex-end', flex: 1, paddingLeft: 16 }}>
                                  <Text style={[styles.psValue, { color: '#10B981' }]}>+ ₹{parseFloat(ps.appreciation_amount || 0) + parseFloat(ps.extra_working_amount || 0)}</Text>
                                  <Text style={styles.psSubtext}>Appreciation: ₹{ps.appreciation_amount || 0}, Extra: ₹{ps.extra_working_amount || 0}</Text>
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
  psRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap', marginBottom: 8 },
  psLabel: { fontSize: 15, color: Colors.light.icon, fontWeight: '500' },
  psValue: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  psTotalRow: { marginTop: 8, paddingTop: 16, borderTopWidth: 2, borderTopColor: Colors.light.background },
  psTotalLabel: { fontSize: 16, fontWeight: '800', color: Colors.light.text },
  psTotalValue: { fontSize: 24, fontWeight: '800', color: Colors.light.primary },
  psSubtext: { fontSize: 12, color: Colors.light.icon, marginTop: 4, textAlign: 'right', flexWrap: 'wrap' },
});
