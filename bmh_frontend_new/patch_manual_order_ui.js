const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/order-assign/ManualOrders.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  "payment_txn_id: ''",
  "payment_txn_id: '',\n      is_scheduled: false,\n      scheduled_date: '',\n      scheduled_time: ''"
);

c = c.replace(
  '<Picker.Item label="Counter" value="Counter" />',
  '<Picker.Item label="Counter" value="Counter" />\n                        <Picker.Item label="Schedule Delivery" value="Schedule Delivery" />'
);

const scheduleUI = `
                {formData.mode_of_delivery === 'Schedule Delivery' && (
                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Scheduled Date</Text>
                      <input 
                        type="date"
                        value={formData.scheduled_date}
                        onChange={(e) => {
                           setFormData({...formData, scheduled_date: e.target.value, is_scheduled: true})
                        }}
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', width: '100%', outline: 'none' }}
                      />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Scheduled Time</Text>
                      <input 
                        type="time"
                        value={formData.scheduled_time}
                        onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', width: '100%', outline: 'none' }}
                      />
                    </View>
                  </View>
                )}
`;

c = c.replace(
  "                <View style={styles.formRow}>\n                  <View style={styles.formCol}>\n                    <Text style={styles.label}>Notes / Instructions</Text>",
  scheduleUI + "\n                <View style={styles.formRow}>\n                  <View style={styles.formCol}>\n                    <Text style={styles.label}>Notes / Instructions</Text>"
);

fs.writeFileSync(file, c);
console.log('ManualOrders.jsx patched for scheduling UI');
