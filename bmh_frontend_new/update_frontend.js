const fs = require('fs');

const path = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/patient-booking.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Icons
content = content.replace(
  "Printer, Search, User } from 'lucide-react-native';",
  "Printer, Search, User, Edit, XCircle } from 'lucide-react-native';"
);

// 2. Add 'Bookings' tab
content = content.replace(
  "{['New Booking', 'My Bookings', 'Reschedule'].map(tab => (",
  "{['New Booking', 'My Bookings', 'Reschedule', 'Bookings'].map(tab => ("
);

// 3. Add new state right before: useEffect(() => { if (activeTab === 'Reschedule'
const newState = `
  // All Bookings Tab State
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [bDateFilter, setBDateFilter] = useState('');
  const [bDoctorFilter, setBDoctorFilter] = useState('');
  const [bPatientFilter, setBPatientFilter] = useState('');
  const [bEmployeeFilter, setBEmployeeFilter] = useState('');
  const [bStatusFilter, setBStatusFilter] = useState('');
  const [showBDatePicker, setShowBDatePicker] = useState(false);

  // Edit Modal State
  const [editBookingSelected, setEditBookingSelected] = useState<any>(null);
  const [editForm, setEditForm] = useState({ patient_name: '', mobile: '', age: '', gender: 'Male', blood_group: '', city: '', pin_code: '', guardian_name: '', reason_for_visit: '', reference: '', pr: '' });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'Bookings' && user) {
      fetchAllBookings();
      if (allEmployees.length === 0) fetchAllEmployees();
    }
  }, [activeTab, bDateFilter, bDoctorFilter, bPatientFilter, bEmployeeFilter, bStatusFilter, user]);

  const fetchAllBookings = async () => {
    try {
      let url = \`https://napi.bharatmedicalhallplus.com/bookings?exclude_blocked=true\`;
      if (bDateFilter) url += \`&date=\${bDateFilter}\`;
      if (bDoctorFilter) url += \`&doctor_id=\${bDoctorFilter}\`;
      if (bPatientFilter) url += \`&patient_name=\${bPatientFilter}\`;
      if (bEmployeeFilter) url += \`&booked_by=\${bEmployeeFilter}\`;
      if (bStatusFilter) url += \`&status=\${bStatusFilter}\`;
      const res = await axios.get(url);
      setAllBookings(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchAllEmployees = async () => {
    try {
      const res = await axios.get('https://napi.bharatmedicalhallplus.com/employees/all-users');
      if (res.data.success) {
        setAllEmployees(res.data.data);
      }
    } catch (err) { console.error(err); }
  };

  const handleEditSave = async () => {
    if (!editForm.patient_name || !editForm.mobile || !editForm.age) { alert('Name, mobile and age are required'); return; }
    setEditLoading(true);
    try {
      const res = await axios.put(\`https://napi.bharatmedicalhallplus.com/bookings/\${editBookingSelected.booking_id}\`, {
        ...editForm,
        modified_by_id: user.id,
        modified_by_name: user.name || user.full_name,
        modified_by_role: user.role,
        modified_by_dept: user.department || ''
      });
      if (res.data.success) {
        alert('Booking modified successfully');
        setEditBookingSelected(null);
        fetchAllBookings();
      }
    } catch(err) {
      alert('Failed to modify booking');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelBooking = async (b: any) => {
    if (Platform.OS === 'web') {
      const yes = window.confirm(\`Are you sure you want to cancel Token #\${b.token_number} for \${b.patient_name}?\`);
      if (yes) executeCancel(b);
    } else {
      Alert.alert('Cancel Token', \`Are you sure you want to cancel Token #\${b.token_number} for \${b.patient_name}?\`, [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => executeCancel(b) }
      ]);
    }
  };

  const executeCancel = async (b: any) => {
    try {
      const res = await axios.post(\`https://napi.bharatmedicalhallplus.com/bookings/\${b.booking_id}/cancel\`, {
        cancelled_by_id: user.id,
        cancelled_by_name: user.name || user.full_name,
        cancelled_by_role: user.role,
        cancelled_by_dept: user.department || ''
      });
      if (res.data.success) {
        alert('Booking cancelled successfully');
        fetchAllBookings();
      }
    } catch(err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    }
  };
`;
content = content.replace(
  "  useEffect(() => {\n    if (activeTab === 'Reschedule'",
  newState + "\n  useEffect(() => {\n    if (activeTab === 'Reschedule'"
);

// 4. Add the 'Bookings' UI before the final closing brace.
const bookingsUI = `
      ) : activeTab === 'Bookings' ? (
        <View style={styles.card}>
          <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
            <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1e293b'}}>All Patient Bookings</Text>
          </View>
          
          <View style={[styles.filterRow, isMobile && { flexDirection: 'column' }, {flexWrap: 'wrap'}]}>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Patient Name/Mobile</Text>
              <TextInput style={[styles.input, {padding: 10}]} value={bPatientFilter} onChangeText={setBPatientFilter} placeholder="Search patient" />
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Date Filter</Text>
              {Platform.OS === 'web' ? (
                <input type="date" value={bDateFilter} onChange={(e) => setBDateFilter(e.target.value)} style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', width: '100%' } as any} />
              ) : (
                <>
                  <TouchableOpacity onPress={() => setShowBDatePicker(true)}>
                    <TextInput style={styles.input} value={bDateFilter} editable={false} placeholder="Select Date" />
                  </TouchableOpacity>
                  {showBDatePicker && <DateTimePicker value={bDateFilter ? new Date(bDateFilter) : new Date()} mode="date" display="default" onChange={(e, d) => { setShowBDatePicker(false); if(d) setBDateFilter(d.toISOString().split('T')[0]); }} />}
                </>
              )}
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Doctor</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={bDoctorFilter} onValueChange={setBDoctorFilter} style={styles.picker}>
                  <Picker.Item label="All Doctors" value="" />
                  {uniqueDoctors.map((d: any) => <Picker.Item key={d.id} label={d.name} value={d.id} />)}
                </Picker>
              </View>
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Booked By</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={bEmployeeFilter} onValueChange={setBEmployeeFilter} style={styles.picker}>
                  <Picker.Item label="All Staff" value="" />
                  {allEmployees.map((e: any) => <Picker.Item key={e.id} label={e.full_name} value={e.id} />)}
                </Picker>
              </View>
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={bStatusFilter} onValueChange={setBStatusFilter} style={styles.picker}>
                  <Picker.Item label="All Status" value="" />
                  <Picker.Item label="Booked" value="Booked" />
                  <Picker.Item label="Completed" value="Completed" />
                </Picker>
              </View>
            </View>
            <View style={[styles.filterCol, {minWidth: 150, justifyContent: 'flex-end'}]}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setBDateFilter(''); setBDoctorFilter(''); setBPatientFilter(''); setBEmployeeFilter(''); setBStatusFilter(''); }}>
                <Text style={styles.clearBtnText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: isMobile ? 800 : '100%' }}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Token</Text>
                <Text style={styles.tableCellHeader}>Patient</Text>
                <Text style={styles.tableCellHeader}>Doctor/Dept</Text>
                <Text style={styles.tableCellHeader}>Date/Time</Text>
                <Text style={styles.tableCellHeader}>Booked By</Text>
                <Text style={styles.tableCellHeader}>Status</Text>
                <Text style={[styles.tableCellHeader, {flex: 1, textAlign: 'center'}]}>Actions</Text>
              </View>
              {allBookings.map((b, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>#{b.token_number}</Text>
                  <View style={styles.tableCell}>
                    <Text style={{fontWeight: '500'}}>{b.patient_name}</Text>
                    <Text style={{fontSize: 12, color: '#64748b'}}>{b.mobile} ({b.age}Y {b.gender})</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text>{b.doctor_name}</Text>
                    <Text style={{fontSize: 12, color: '#64748b'}}>{b.department}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text>{new Date(b.date).toLocaleDateString('en-GB')}</Text>
                    <Text style={{fontSize: 12, color: '#64748b'}}>{b.start_time}</Text>
                  </View>
                  <Text style={styles.tableCell}>{b.booked_by_name || '-'}</Text>
                  <View style={styles.tableCell}>
                    <Text style={{color: b.status === 'Completed' ? '#10b981' : '#3b82f6', fontWeight: 'bold'}}>{b.status}</Text>
                  </View>
                  <View style={[styles.tableCell, {flex: 1, flexDirection: 'row', gap: 12, justifyContent: 'center'}]}>
                    <TouchableOpacity onPress={() => handlePrintReceipt(b)}><Printer color="#64748b" size={18}/></TouchableOpacity>
                    <TouchableOpacity onPress={() => { setRescheduleSelectedBooking(b); setActiveTab('Reschedule'); }}><Calendar color="#3b82f6" size={18}/></TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      setEditBookingSelected(b);
                      setEditForm({ patient_name: b.patient_name, mobile: b.mobile, age: b.age?.toString()||'', gender: b.gender||'Male', blood_group: b.blood_group||'', city: b.city||'', pin_code: b.pin_code||'', guardian_name: b.guardian_name||'', reason_for_visit: b.reason_for_visit||'', reference: b.reference||'', pr: b.pr||'' });
                    }}><Edit color="#f59e0b" size={18}/></TouchableOpacity>
                    {b.status === 'Booked' && (
                      <TouchableOpacity onPress={() => handleCancelBooking(b)}><XCircle color="#ef4444" size={18}/></TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              {allBookings.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No bookings found.</Text>}
            </View>
          </ScrollView>

          {/* Edit Modal */}
          {editBookingSelected && (
            <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
              <View style={{backgroundColor: 'white', padding: 24, borderRadius: 12, width: isMobile ? '95%' : 600, maxHeight: '90%'}}>
                <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 16}}>Edit Patient Details (Token #{editBookingSelected.token_number})</Text>
                <ScrollView>
                  <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 8}}><Text style={styles.formLabel}>Name</Text><TextInput style={styles.input} value={editForm.patient_name} onChangeText={t => setEditForm({...editForm, patient_name: t})} /></View>
                    <View style={{flex: 1}}><Text style={styles.formLabel}>Mobile</Text><TextInput style={styles.input} value={editForm.mobile} onChangeText={t => setEditForm({...editForm, mobile: t})} keyboardType="phone-pad" /></View>
                  </View>
                  <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 8}}><Text style={styles.formLabel}>Age</Text><TextInput style={styles.input} value={editForm.age} onChangeText={t => setEditForm({...editForm, age: t})} keyboardType="numeric" /></View>
                    <View style={{flex: 1}}><Text style={styles.formLabel}>Gender</Text>
                      <View style={{flexDirection: 'row', gap: 8}}>
                        <TouchableOpacity style={{flex: 1, padding: 12, backgroundColor: editForm.gender==='Male'?'#e0e7ff':'#f1f5f9', borderRadius: 8, borderWidth: 1, borderColor: editForm.gender==='Male'?'#4f46e5':'transparent', alignItems: 'center'}} onPress={() => setEditForm({...editForm, gender: 'Male'})}><Text>Male</Text></TouchableOpacity>
                        <TouchableOpacity style={{flex: 1, padding: 12, backgroundColor: editForm.gender==='Female'?'#e0e7ff':'#f1f5f9', borderRadius: 8, borderWidth: 1, borderColor: editForm.gender==='Female'?'#4f46e5':'transparent', alignItems: 'center'}} onPress={() => setEditForm({...editForm, gender: 'Female'})}><Text>Female</Text></TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 8}}><Text style={styles.formLabel}>Blood Group</Text><TextInput style={styles.input} value={editForm.blood_group} onChangeText={t => setEditForm({...editForm, blood_group: t})} /></View>
                    <View style={{flex: 1}}><Text style={styles.formLabel}>Guardian Name</Text><TextInput style={styles.input} value={editForm.guardian_name} onChangeText={t => setEditForm({...editForm, guardian_name: t})} /></View>
                  </View>
                  <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 8}}><Text style={styles.formLabel}>Address/City</Text><TextInput style={styles.input} value={editForm.city} onChangeText={t => setEditForm({...editForm, city: t})} /></View>
                    <View style={{flex: 1}}><Text style={styles.formLabel}>Pin Code</Text><TextInput style={styles.input} value={editForm.pin_code} onChangeText={t => setEditForm({...editForm, pin_code: t})} /></View>
                  </View>
                </ScrollView>
                <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16}}>
                  <TouchableOpacity style={{padding: 12}} onPress={() => setEditBookingSelected(null)}><Text style={{color: '#64748b'}}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={{padding: 12, backgroundColor: Colors.light.primary, borderRadius: 8}} onPress={handleEditSave} disabled={editLoading}>
                    {editLoading ? <ActivityIndicator color="white" size="small" /> : <Text style={{color: 'white'}}>Save Changes</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
`;
content = content.replace(
  "      ) : null}\n      </ScrollView>\n  );\n}",
  bookingsUI + "\n      ) : null}\n      </ScrollView>\n  );\n}"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated patient-booking.tsx');
