const fs = require('fs');

const path = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/admin/dashboard/doctors/index.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Cancelled Tokens to TABS
content = content.replace(
  "const TABS = ['Doctors', 'Slots', 'Bookings', 'Revenue'];",
  "const TABS = ['Doctors', 'Slots', 'Bookings', 'Cancelled Tokens', 'Revenue'];"
);

// 2. Add State for Cancelled Tokens
const newState = `
  // Cancelled Tokens State
  const [cancelledTokens, setCancelledTokens] = useState<any[]>([]);
  const [cDate, setCDate] = useState('');
  const [cDoctor, setCDoctor] = useState('');
  const [cPatient, setCPatient] = useState('');
  const [cEmployee, setCEmployee] = useState('');
  const [showCDatePicker, setShowCDatePicker] = useState(false);
  const [todayRefund, setTodayRefund] = useState(0);
  const [filterRefund, setFilterRefund] = useState(0);

  // Refund Processing State
  const [refundProcessing, setRefundProcessing] = useState<any>(null);
  const [refundType, setRefundType] = useState('Cash');
  const [refundTnx, setRefundTnx] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  useEffect(() => {
    if (activeTab === 'Cancelled Tokens') fetchCancelledTokens();
  }, [activeTab, cDate, cDoctor, cPatient, cEmployee]);

  const fetchCancelledTokens = async () => {
    try {
      let url = 'https://napi.bharatmedicalhallplus.com/bookings/cancelled-list?';
      if (cDate) url += \`date=\${cDate}&\`;
      if (cDoctor) url += \`doctor_id=\${cDoctor}&\`;
      if (cEmployee) url += \`booked_by=\${cEmployee}&\`;
      if (cPatient) url += \`patient_name=\${cPatient}&\`;
      const res = await axios.get(url);
      const tokens = res.data.data || [];
      setCancelledTokens(tokens);
      
      const today = new Date().toISOString().split('T')[0];
      const todayTotal = tokens.filter((t: any) => t.refund_status === 'Refunded' && new Date(t.cancelled_at).toISOString().split('T')[0] === today).reduce((sum: number, t: any) => sum + parseFloat(t.fee), 0);
      setTodayRefund(todayTotal);

      const filterTotal = tokens.filter((t: any) => t.refund_status === 'Refunded').reduce((sum: number, t: any) => sum + parseFloat(t.fee), 0);
      setFilterRefund(filterTotal);

      const deptsRes = await axios.get('https://napi.bharatmedicalhallplus.com/department').catch(() => ({data: {data: []}}));
      setDepartments(deptsRes.data.data || []);
      const empRes = await axios.get('https://napi.bharatmedicalhallplus.com/employees').catch(()=>null);
      if (empRes?.data?.data) setEmployees(empRes.data.data);
      const docsRes = await axios.get('https://napi.bharatmedicalhallplus.com/doctors').catch(()=>null);
      if (docsRes?.data?.data) setDoctors(docsRes.data.data);
    } catch(e) {
      console.error(e);
    }
  };

  const handleProcessRefund = async () => {
    if (refundType === 'Online' && !refundTnx) {
      alert('Transaction number is required for Online refunds');
      return;
    }
    setProcessingRefund(true);
    try {
      // Need user id for processed_by, but admin dashboard doesn't have it easily accessible? 
      // Admin dashboard might be used by Sub Admin or Super Admin. We should use local storage.
      const userData = await AsyncStorage.getItem('adminUser');
      let userId = '1';
      if (userData) {
         const user = JSON.parse(userData);
         userId = user.id;
      }

      const res = await axios.put(\`https://napi.bharatmedicalhallplus.com/bookings/cancelled/\${refundProcessing.id}/refund\`, {
        refund_type: refundType,
        refund_tnx: refundTnx,
        processed_by_id: userId
      });
      if (res.data.success) {
        alert('Refund processed successfully');
        setRefundProcessing(null);
        setRefundTnx('');
        fetchCancelledTokens();
      }
    } catch(err: any) {
      alert(err.response?.data?.message || 'Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };
`;
// We also need AsyncStorage in imports.
content = content.replace(
  "import { Picker } from '@react-native-picker/picker';",
  "import { Picker } from '@react-native-picker/picker';\nimport AsyncStorage from '@react-native-async-storage/async-storage';"
);

content = content.replace(
  "  useEffect(() => {\n    if (activeTab === 'Bookings') fetchBookings();",
  newState + "\n  useEffect(() => {\n    if (activeTab === 'Bookings') fetchBookings();"
);


// 3. Update Bookings tab table to include Modified columns
const bookingsTableHeader = `
                <View style={styles.tableRowHeader}>
                  <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Token</Text>
                  <Text style={styles.tableCellHeader}>Patient</Text>
                  <Text style={styles.tableCellHeader}>Doctor & Slot</Text>
                  <Text style={styles.tableCellHeader}>Booked By</Text>
                  <Text style={styles.tableCellHeader}>Status</Text>
                  <Text style={styles.tableCellHeader}>Modified Details</Text>
                </View>
`;
const bookingsTableRow = `
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>#{b.token_number}</Text>
                    <View style={styles.tableCell}>
                      <Text style={{fontWeight: '500'}}>{b.patient_name}</Text>
                      <Text style={{fontSize: 12, color: '#64748b'}}>{b.mobile}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text>{b.doctor_name}</Text>
                      <Text style={{fontSize: 12, color: '#64748b'}}>{new Date(b.date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text>{b.booked_by_name || 'Self'}</Text>
                    </View>
                    <Text style={styles.tableCell}>{b.status}</Text>
                    <View style={styles.tableCell}>
                      {b.modified_date ? (
                        <>
                          <Text style={{fontSize: 12, color: '#0f172a'}}>By: {b.modified_by_name}</Text>
                          <Text style={{fontSize: 10, color: '#64748b'}}>{new Date(b.modified_date).toLocaleString()}</Text>
                        </>
                      ) : (
                        <Text style={{fontSize: 12, color: '#94a3b8'}}>-</Text>
                      )}
                    </View>
                  </View>
`;

content = content.replace(
  /<View style={styles\.tableRowHeader}>[\s\S]*?<\/View>[\s\S]*?\{bookings\.map\(\(b, i\) => \([\s\S]*?<\/View>\n                \)\)}/m,
  bookingsTableHeader + "{bookings.map((b, i) => (" + bookingsTableRow + "))}"
);

// 4. Add Cancelled Tokens Tab UI
const cancelledTokensUI = `
            {activeTab === 'Cancelled Tokens' && (
              <View style={styles.card}>
                <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
                  <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1e293b'}}>Cancelled Tokens & Refunds</Text>
                  <View style={{flexDirection: 'row', gap: 16}}>
                    <View style={{backgroundColor: '#ecfdf5', padding: 8, borderRadius: 8}}>
                      <Text style={{fontSize: 12, color: '#065f46', fontWeight: 'bold'}}>Today's Refunds: ₹{todayRefund}</Text>
                    </View>
                    <View style={{backgroundColor: '#eff6ff', padding: 8, borderRadius: 8}}>
                      <Text style={{fontSize: 12, color: '#1e3a8a', fontWeight: 'bold'}}>Filtered Refunds: ₹{filterRefund}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.filterRow, isMobile && { flexDirection: 'column' }, {flexWrap: 'wrap'}]}>
                  <View style={[styles.filterCol, {minWidth: 150}]}>
                    <Text style={styles.label}>Patient Name</Text>
                    <TextInput style={[styles.input, {padding: 10}]} value={cPatient} onChangeText={setCPatient} placeholder="Search patient" />
                  </View>
                  <View style={[styles.filterCol, {minWidth: 150}]}>
                    <Text style={styles.label}>Date</Text>
                    {Platform.OS === 'web' ? (
                      <input type="date" value={cDate} onChange={(e) => setCDate(e.target.value)} style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', width: '100%' } as any} />
                    ) : (
                      <>
                        <TouchableOpacity onPress={() => setShowCDatePicker(true)}>
                          <TextInput style={[styles.input, {padding: 10}]} value={cDate} editable={false} placeholder="Select Date" />
                        </TouchableOpacity>
                        {showCDatePicker && <DateTimePicker value={cDate ? new Date(cDate) : new Date()} mode="date" display="default" onChange={(e, d) => { setShowCDatePicker(false); if(d) setCDate(d.toISOString().split('T')[0]); }} />}
                      </>
                    )}
                  </View>
                  <View style={[styles.filterCol, {minWidth: 150}]}>
                    <Text style={styles.label}>Doctor</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={cDoctor} onValueChange={setCDoctor} style={styles.picker}>
                        <Picker.Item label="All Doctors" value="" />
                        {doctors.map((d: any) => <Picker.Item key={d.id} label={d.full_name} value={d.id} />)}
                      </Picker>
                    </View>
                  </View>
                  <View style={[styles.filterCol, {minWidth: 150}]}>
                    <Text style={styles.label}>Cancelled By</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={cEmployee} onValueChange={setCEmployee} style={styles.picker}>
                        <Picker.Item label="All" value="" />
                        {employees.map((e: any) => <Picker.Item key={e.id} label={e.full_name} value={e.id} />)}
                      </Picker>
                    </View>
                  </View>
                  <View style={[styles.filterCol, {minWidth: 150, justifyContent: 'flex-end'}]}>
                    <TouchableOpacity style={styles.clearBtn} onPress={() => { setCDoctor(''); setCEmployee(''); setCDate(''); setCPatient(''); }}>
                      <Text style={styles.clearBtnText}>Clear Filters</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ minWidth: isMobile ? 1000 : '100%' }}>
                    <View style={styles.tableRowHeader}>
                      <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Token</Text>
                      <Text style={styles.tableCellHeader}>Patient</Text>
                      <Text style={styles.tableCellHeader}>Doctor & Date</Text>
                      <Text style={styles.tableCellHeader}>Cancelled At</Text>
                      <Text style={styles.tableCellHeader}>Cancelled By</Text>
                      <Text style={styles.tableCellHeader}>Fee</Text>
                      <Text style={styles.tableCellHeader}>Refund Status</Text>
                    </View>
                    {cancelledTokens.map((b, i) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>#{b.token_number}</Text>
                        <View style={styles.tableCell}>
                          <Text style={{fontWeight: '500'}}>{b.patient_name}</Text>
                          <Text style={{fontSize: 12, color: '#64748b'}}>{b.mobile}</Text>
                        </View>
                        <View style={styles.tableCell}>
                          <Text>{b.doctor_name}</Text>
                          <Text style={{fontSize: 12, color: '#64748b'}}>{new Date(b.date).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.tableCell}>
                          <Text>{new Date(b.cancelled_at).toLocaleDateString()}</Text>
                          <Text style={{fontSize: 12, color: '#64748b'}}>{new Date(b.cancelled_at).toLocaleTimeString()}</Text>
                        </View>
                        <View style={styles.tableCell}>
                          <Text>{b.cancelled_by_name || 'System'}</Text>
                          <Text style={{fontSize: 12, color: '#64748b'}}>{b.cancelled_by_role}</Text>
                        </View>
                        <Text style={[styles.tableCell, {fontWeight: 'bold'}]}>₹{b.fee}</Text>
                        <View style={styles.tableCell}>
                          {b.refund_status === 'Refunded' ? (
                            <View>
                              <Text style={{color: '#10b981', fontWeight: 'bold'}}>Refunded</Text>
                              <Text style={{fontSize: 10, color: '#64748b'}}>{b.refund_type}</Text>
                            </View>
                          ) : (
                            <TouchableOpacity style={{backgroundColor: '#f59e0b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start'}} onPress={() => setRefundProcessing(b)}>
                              <Text style={{color: 'white', fontSize: 12, fontWeight: 'bold'}}>Process Refund</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                    {cancelledTokens.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No cancelled tokens found.</Text>}
                  </View>
                </ScrollView>
              </View>
            )}
`;
content = content.replace(
  "{activeTab === 'Revenue' && (",
  cancelledTokensUI + "\n            {activeTab === 'Revenue' && ("
);

// 5. Add Refund Processing Modal
const refundModal = `
      {/* Refund Modal */}
      <Modal visible={!!refundProcessing} animationType="slide" transparent={true} onRequestClose={() => setRefundProcessing(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {maxWidth: 400}]}>
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalTitle}>Process Refund</Text>
              <TouchableOpacity onPress={() => setRefundProcessing(null)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            {refundProcessing && (
              <View>
                <Text style={{fontSize: 16, marginBottom: 16}}>
                  Refunding <Text style={{fontWeight: 'bold', color: '#10b981'}}>₹{refundProcessing.fee}</Text> for Token #{refundProcessing.token_number}
                </Text>
                
                <Text style={styles.label}>Refund Type</Text>
                <View style={[styles.pickerContainer, {marginBottom: 16}]}>
                  <Picker selectedValue={refundType} onValueChange={setRefundType} style={styles.picker}>
                    <Picker.Item label="Cash" value="Cash" />
                    <Picker.Item label="Online" value="Online" />
                  </Picker>
                </View>
                
                {refundType === 'Online' && (
                  <View style={{marginBottom: 16}}>
                    <Text style={styles.label}>Transaction Number *</Text>
                    <TextInput style={styles.input} value={refundTnx} onChangeText={setRefundTnx} placeholder="Enter Txn Number" />
                  </View>
                )}
                
                {refundType === 'Cash' && (
                  <Text style={{fontSize: 12, color: '#64748b', marginBottom: 16}}>
                    Warning: Cash refund amount will be deducted from your cash-in-hand wallet balance.
                  </Text>
                )}
                
                <TouchableOpacity style={styles.submitBtn} onPress={handleProcessRefund} disabled={processingRefund}>
                  {processingRefund ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Confirm Refund</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
`;
content = content.replace(
  "{/* Edit Doctor Modal */}",
  refundModal + "\n      {/* Edit Doctor Modal */}"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated index.tsx (Admin Doctors)');
