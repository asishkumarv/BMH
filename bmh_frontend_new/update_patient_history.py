import re
import os

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-history.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'import * as Print' not in content:
    content = content.replace("import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';",
                              "import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';\nimport * as Print from 'expo-print';\nimport * as Sharing from 'expo-sharing';")

# Add Printer icon import
if 'Printer' not in content:
    content = content.replace("import { Search, Filter, Calendar } from 'lucide-react-native';",
                              "import { Search, Filter, Calendar, Printer } from 'lucide-react-native';")

# Add handlePrintReceipt function inside PatientHistoryEmployee
handle_print_code = """
  const handlePrintReceipt = async (record: any) => {
    let currentPrintCount = 1;
    const bookingId = record.booking_id;
    if (bookingId) {
      try {
        const res = await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/${bookingId}/print-count`);
        if (res.data.success) {
           currentPrintCount = res.data.print_count;
           record.print_count = currentPrintCount;
        }
      } catch(e) { console.error('Failed to update print count'); }
    }
    
    const nowStr = new Date().toLocaleString();
    const printDate = new Date(record.consultation_date).toLocaleDateString();
    
    const html = `
      <html>
        <head>
          <style>
            @page { margin: 0; size: 58mm auto; }
            body { font-family: monospace; width: 50mm; margin: 0; padding: 5px; color: #000; font-size: 11px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
            .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
            .subtitle { font-size: 10px; line-height: 1.2; }
            .token-box { text-align: center; margin: 5px 0; border: 1px dashed #000; padding: 5px; border-radius: 4px; background: #fff; color: #000; }
            .token-label { font-size: 11px; font-weight: bold; margin-bottom: 2px; }
            .token-number { font-size: 28px; font-weight: bold; line-height: 1; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
            .detail-label { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
            .footer { margin-top: 10px; text-align: center; font-size: 10px; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">BHARAT HEALTHCARE</div>
            <div class="subtitle">
              HOSPITAL ROAD, BARIPADA, MAYURBHANJ, ODISHA 757001.<br/>
              REGD NO MBJ/CE/03/2019, MOBILE NO 8093110888
            </div>
          </div>
          
          <div class="token-box">
            <div class="token-label">TOKEN NUMBER</div>
            <div class="token-number">#${record.token_number || 'N/A'}</div>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">APPT Date:</span>
            <span>${printDate} ${record.start_time || ''}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Patient:</span>
            <span>${record.name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Age/Sex, Mob:</span>
            <span>${record.age}y/${record.gender}, ${record.mobile}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Address:</span>
            <span>${record.city || 'N/A'}</span>
          </div>
          <div class="divider"></div>
          <div class="detail-row">
            <span class="detail-label">Doctor:</span>
            <span>Dr. ${record.doctor_name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Dept:</span>
            <span>${record.doctor_department}</span>
          </div>
          <div class="divider"></div>
          <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span style="font-weight:bold;">Rs. ${record.fee || 'N/A'} (${record.payment_mode || 'Cash'})</span>
          </div>
          
          <div class="footer">
            Printed: ${nowStr} (p${currentPrintCount})<br/>
            Thank you.
          </div>
        </body>
      </html>
    `;
    try {
      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.contentDocument?.write(html);
        iframe.contentDocument?.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 250);
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri);
      }
    } catch (err) {
      console.error('Error printing receipt', err);
    }
  };
"""

if 'const handlePrintReceipt' not in content:
    content = content.replace("const fetchHistory = async () => {", handle_print_code + "\n  const fetchHistory = async () => {")

# Add print button in UI
print_button_code = """<TouchableOpacity onPress={() => handlePrintReceipt(record)} style={{backgroundColor: '#e0f2fe', padding: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4}}>
                <Printer size={16} color="#0284c7" />
                <Text style={{color: '#0284c7', fontSize: 12, fontWeight: '600'}}>Print Token</Text>
              </TouchableOpacity>"""

if 'Print Token' not in content:
    content = content.replace("<View style={styles.dateBox}>", f"{print_button_code}\n              <View style={{width: 8}}/>\n              <View style={{...styles.dateBox, marginTop: 0}}>")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated patient-history.tsx")
