const fs = require('fs');
const filePath = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/patient-booking.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add cancelBookingSelected state
if (!content.includes('cancelBookingSelected')) {
  content = content.replace(
    'const [editLoading, setEditLoading] = useState(false);',
    'const [editLoading, setEditLoading] = useState(false);\n  const [cancelBookingSelected, setCancelBookingSelected] = useState<any>(null);'
  );
}

// 2. Modify handleCancelBooking to use the inline state instead of alerts
content = content.replace(/const handleCancelBooking = async \(b: any\) => \{[\s\S]*?executeCancel = async/g, 
\`const handleCancelBooking = async (b: any) => {
    setCancelBookingSelected(b);
  };

  const executeCancel = async\`);

// 3. Replace the map logic to support inline edit/cancel
const oldMapRegex = /\{\s*allBookings\.map\(\(b, i\) => \([\s\S]*?\}\)\)/;

const newMapStr = \`{allBookings.map((b, i) => (
                <React.Fragment key={i}>
                  {editBookingSelected?.booking_id === b.booking_id ? (
                    <View style={{padding: 16, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e2e8f0'}}>
                      <Text style={{fontWeight: 'bold', marginBottom: 12, fontSize: 16}}>Edit Booking #{b.token_number}</Text>
                      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
                        <View style={{width: 150}}><Text style={styles.label}>Patient Name*</Text><TextInput style={styles.input} value={editForm.patient_name} onChangeText={(v) => setEditForm({...editForm, patient_name: v})} /></View>
                        <View style={{width: 150}}><Text style={styles.label}>Mobile*</Text><TextInput style={styles.input} value={editForm.mobile} onChangeText={(v) => setEditForm({...editForm, mobile: v})} /></View>
                        <View style={{width: 80}}><Text style={styles.label}>Age*</Text><TextInput style={styles.input} value={editForm.age} onChangeText={(v) => setEditForm({...editForm, age: v})} /></View>
                        <View style={{width: 150}}><Text style={styles.label}>Gender</Text>
                          <View style={styles.pickerContainer}>
                            <Picker selectedValue={editForm.gender} onValueChange={(v) => setEditForm({...editForm, gender: v})} style={styles.picker}>
                              <Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" />
                            </Picker>
                          </View>
                        </View>
                        <View style={{width: 200}}><Text style={styles.label}>Address</Text><TextInput style={styles.input} value={editForm.city} onChangeText={(v) => setEditForm({...editForm, city: v})} /></View>
                      </View>
                      <View style={{flexDirection: 'row', gap: 12, marginTop: 16}}>
                        <TouchableOpacity style={{backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6}} onPress={handleEditSave} disabled={editLoading}>
                          <Text style={{color: 'white', fontWeight: 'bold'}}>{editLoading ? 'Saving...' : 'Save Changes'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{backgroundColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6}} onPress={() => setEditBookingSelected(null)}>
                          <Text style={{color: '#475569', fontWeight: 'bold'}}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : cancelBookingSelected?.booking_id === b.booking_id ? (
                    <View style={{padding: 16, backgroundColor: '#fef2f2', borderBottomWidth: 1, borderColor: '#fecaca', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap'}}>
                      <Text style={{color: '#b91c1c', fontWeight: 'bold', fontSize: 16}}>Are you sure you want to cancel Token #{b.token_number} for {b.patient_name}?</Text>
                      <View style={{flexDirection: 'row', gap: 12}}>
                        <TouchableOpacity style={{backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6}} onPress={() => executeCancel(b)}>
                          <Text style={{color: 'white', fontWeight: 'bold'}}>Yes, Cancel Token</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{backgroundColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6}} onPress={() => setCancelBookingSelected(null)}>
                          <Text style={{color: '#475569', fontWeight: 'bold'}}>No, Keep It</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.tableRow}>
                      <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>#{b.token_number}</Text>
                      <View style={styles.tableCell}>
                        <Text style={{fontWeight: '500'}}>{b.patient_name}</Text>
                        <Text style={{fontSize: 12, color: '#64748b'}}>{b.mobile} | Age: {b.age}</Text>
                      </View>
                      <View style={styles.tableCell}>
                        <Text>{b.doctor_name}</Text>
                        <Text style={{fontSize: 12, color: '#64748b'}}>{new Date(b.date).toLocaleDateString('en-GB')} {b.start_time}</Text>
                      </View>
                      <View style={styles.tableCell}>
                        <Text>{b.booked_by_name}</Text>
                        <Text style={{fontSize: 12, color: '#64748b'}}>{b.booked_by_role || '-'}</Text>
                      </View>
                      <View style={styles.tableCell}>
                        <Text>₹{b.fee} ({b.payment_mode})</Text>
                        <Text style={{fontSize: 12, color: b.status === 'Cancelled' ? 'red' : 'green'}}>{b.status}</Text>
                      </View>
                      <View style={[styles.tableCell, {flex: 0.5, flexDirection: 'row', justifyContent: 'center', gap: 12}]}>
                        {b.status !== 'Cancelled' && (
                          <>
                            <TouchableOpacity onPress={() => {
                              setEditBookingSelected(b);
                              setCancelBookingSelected(null);
                              setEditForm({ patient_name: b.patient_name, mobile: b.mobile, age: String(b.age), gender: b.gender, blood_group: b.blood_group, city: b.city, pin_code: b.pin_code, guardian_name: b.guardian_name, reason_for_visit: b.reason_for_visit, reference: b.reference, pr: b.pr });
                            }}><Edit color="#eab308" size={20} /></TouchableOpacity>
                            <TouchableOpacity onPress={() => {
                              setCancelBookingSelected(b);
                              setEditBookingSelected(null);
                            }}><XCircle color="#ef4444" size={20} /></TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  )}
                </React.Fragment>
              ))\`;

content = content.replace(oldMapRegex, newMapStr);

// 4. Remove the old Edit Modal
const oldModalRegex = /\{\/\* Edit Booking Modal \*\/\}\s*\{editBookingSelected && \([\s\S]*?\}\s*\)\}/;
content = content.replace(oldModalRegex, '');

// Save
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated inline components');
