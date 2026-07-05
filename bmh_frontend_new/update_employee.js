const fs = require('fs');
const filePath = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/patient-booking.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Status Filters
if (!content.includes('<Picker.Item label="Booked" value="Booked" />')) {
  content = content.replace(
    '<Picker.Item label="Completed" value="Completed" />',
    '<Picker.Item label="Completed" value="Completed" />\n                  <Picker.Item label="Booked" value="Booked" />\n                  <Picker.Item label="Cancelled" value="Cancelled" />'
  );
}

// 2. Add Booking ID to the Search placeholder and column headers
// Search placeholder:
content = content.replace(
  'placeholder="Search patient"',
  'placeholder="Search patient or ID"'
);
// Table Headers (All Bookings block)
content = content.replace(
  '<Text style={[styles.tableCellHeader, {flex: 0.5}]}>Token</Text>',
  '<Text style={[styles.tableCellHeader, {flex: 0.5}]}>Token</Text>\n                <Text style={[styles.tableCellHeader, {flex: 0.5}]}>ID</Text>'
);

// Table Rows (All Bookings map block)
content = content.replace(
  '<Text style={[styles.tableCell, {flex: 0.5, fontWeight: \'bold\'}]}>#{b.token_number}</Text>',
  '<Text style={[styles.tableCell, {flex: 0.5, fontWeight: \'bold\'}]}>#{b.token_number}</Text>\n                      <Text style={[styles.tableCell, {flex: 0.5}]}>#{b.booking_id || b.id}</Text>'
);

// 3. Update the Inline Cancel UI block
// We need states for refund mode
if (!content.includes('const [cancelRefundMode')) {
  content = content.replace(
    'const [cancelBookingSelected, setCancelBookingSelected] = useState<any>(null);',
    'const [cancelBookingSelected, setCancelBookingSelected] = useState<any>(null);\n  const [cancelRefundMode, setCancelRefundMode] = useState(\'Cash\');\n  const [cancelRefundTnx, setCancelRefundTnx] = useState(\'\');'
  );
}

// Update the cancel inline view
const cancelInlineRegex = /<View style=\{\{padding: 16, backgroundColor: '#fef2f2'[\s\S]*?<\/View>\s*<\/View>/;
const newCancelInline = `<View style={{padding: 16, backgroundColor: '#fef2f2', borderBottomWidth: 1, borderColor: '#fecaca', flexDirection: 'column'}}>
                      <Text style={{color: '#b91c1c', fontWeight: 'bold', fontSize: 16, marginBottom: 12}}>Are you sure you want to cancel Token #{b.token_number} for {b.patient_name}?</Text>
                      
                      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16}}>
                        <Text style={styles.label}>Refund Method:</Text>
                        <View style={[styles.pickerContainer, {width: 150}]}>
                          <Picker selectedValue={cancelRefundMode} onValueChange={(v) => setCancelRefundMode(v)} style={styles.picker}>
                            <Picker.Item label="Cash" value="Cash" />
                            <Picker.Item label="Online" value="Online" />
                          </Picker>
                        </View>
                        {cancelRefundMode === 'Online' && (
                          <TextInput 
                            style={[styles.input, {width: 200}]} 
                            placeholder="Transaction ID" 
                            value={cancelRefundTnx} 
                            onChangeText={setCancelRefundTnx} 
                          />
                        )}
                      </View>

                      <View style={{flexDirection: 'row', gap: 12}}>
                        <TouchableOpacity style={{backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6}} onPress={() => {
                          if (cancelRefundMode === 'Online' && !cancelRefundTnx) {
                            alert('Please enter a transaction ID for online refund');
                            return;
                          }
                          executeCancel(b);
                        }}>
                          <Text style={{color: 'white', fontWeight: 'bold'}}>Yes, Cancel Token</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{backgroundColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6}} onPress={() => setCancelBookingSelected(null)}>
                          <Text style={{color: '#475569', fontWeight: 'bold'}}>No, Keep It</Text>
                        </TouchableOpacity>
                      </View>
                    </View>`;

content = content.replace(cancelInlineRegex, newCancelInline);

// 4. Update executeCancel function to send refund details
const oldExecuteCancel = /const executeCancel = async \([\s\S]*?cancelled_by_dept: user\.department || ''\s*\}[^]*?catch \(err\) \{/m;
content = content.replace(oldExecuteCancel, `const executeCancel = async (b: any) => {
    try {
      const res = await axios.post(\`https://napi.bharatmedicalhallplus.com/bookings/\${b.booking_id || b.id}/cancel\`, {
        cancelled_by_id: user.id,
        cancelled_by_name: user.name || user.full_name,
        cancelled_by_role: user.role,
        cancelled_by_dept: user.department || '',
        refund_type: cancelRefundMode,
        refund_tnx: cancelRefundTnx
      });
      if (res.data.success) {
        alert('Booking cancelled successfully');
        setCancelBookingSelected(null);
        setCancelRefundTnx('');
        fetchAllBookings();
      }
    } catch (err) {`);


fs.writeFileSync(filePath, content, 'utf8');
console.log('Frontend Employee Module successfully updated!');
