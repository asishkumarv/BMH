import re
import os

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-booking.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace handlePrintReceipt function
old_handle_print = re.search(r'const handlePrintReceipt = async \(\) => \{.*?catch \(err\) \{\n      console\.error\(\'Error printing receipt\', err\);\n    \}\n  \};', content, re.DOTALL).group()

new_handle_print = """const handlePrintReceipt = async (b: any = null) => {
    const printToken = b ? b.token_number : successToken;
    const printPatient = b ? (b.patient_name || b.name) : patientName;
    const printAge = b ? b.age : age;
    const printGender = b ? b.gender : gender;
    const printMobile = b ? b.mobile : mobile;
    const printCity = b ? b.city : city;
    const printDoctor = b ? b.doctor_name : selectedSlot?.doctor_name;
    const printDept = b ? b.department : (selectedSlot?.doctor_department || 'General');
    const printAmount = b ? b.fee : selectedSlot?.fee;
    const printMode = b ? b.payment_mode : paymentMode;
    const printDate = b ? new Date(b.date).toLocaleDateString() : new Date(selectedSlot?.date).toLocaleDateString();
    const printTime = b ? b.start_time : selectedSlot?.start_time;
    const bookingId = b ? (b.booking_id || b.id) : null;
    
    let currentPrintCount = 1;
    if (bookingId) {
      try {
        const res = await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/${bookingId}/print-count`);
        if (res.data.success) {
           currentPrintCount = res.data.print_count;
           if (b) { b.print_count = currentPrintCount; }
        }
      } catch(e) { console.error('Failed to update print count'); }
    }
    
    const nowStr = new Date().toLocaleString();

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
            <div class="token-number">#${printToken}</div>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">APPT Date:</span>
            <span>${printDate} ${printTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Patient:</span>
            <span>${printPatient}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Age/Sex, Mob:</span>
            <span>${printAge}y/${printGender}, ${printMobile}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Address:</span>
            <span>${printCity || 'N/A'}</span>
          </div>
          <div class="divider"></div>
          <div class="detail-row">
            <span class="detail-label">Doctor:</span>
            <span>Dr. ${printDoctor}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Dept:</span>
            <span>${printDept}</span>
          </div>
          <div class="divider"></div>
          <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span style="font-weight:bold;">Rs. ${printAmount} (${printMode})</span>
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
  };"""

content = content.replace(old_handle_print, new_handle_print)
content = content.replace('onPress={handlePrintReceipt}', 'onPress={() => handlePrintReceipt(null)}')
content = content.replace('<Text style={styles.tableCellHeader}>Status</Text>\n              </View>', 
                          '<Text style={styles.tableCellHeader}>Status</Text>\n                <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Action</Text>\n              </View>')
content = content.replace('<Text style={styles.tableCell}>{b.status}</Text>\n                </View>',
                          '<Text style={styles.tableCell}>{b.status}</Text>\n                  <TouchableOpacity onPress={() => handlePrintReceipt(b)} style={{flex: 0.5, alignItems: \'center\'}}><Printer color="#3b82f6" size={20}/></TouchableOpacity>\n                </View>')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated patient-booking.tsx")
