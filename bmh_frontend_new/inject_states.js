const fs = require('fs');

function injectStateAfterActiveTab(filePath, stateCode) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(stateCode.trim().substring(0, 50))) {
    console.log(filePath, 'already has state injected');
    return;
  }
  
  // Find "const [activeTab, setActiveTab] = useState"
  const match = content.match(/const\s+\[activeTab,\s*setActiveTab\]\s*=\s*useState[^;]+;/);
  if (match) {
    content = content.replace(match[0], match[0] + '\n' + stateCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully injected state into', filePath);
  } else {
    console.log('Failed to find activeTab state in', filePath);
  }
}

// 1. Employee Patient Booking
const empState = `
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
      alert(err?.response?.data?.message || 'Failed to cancel booking');
    }
  };
`;
injectStateAfterActiveTab('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/patient-booking.tsx', empState);

// 2. Admin & Sub-Admin Cancelled Tokens State
const adminState = `
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
      const userData = await AsyncStorage.getItem('adminUser') || await AsyncStorage.getItem('departmentUser') || await AsyncStorage.getItem('user');
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
      alert(err?.response?.data?.message || 'Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };
`;

injectStateAfterActiveTab('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/admin/dashboard/doctors/index.tsx', adminState);
injectStateAfterActiveTab('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/department/dashboard/doctors/index.tsx', adminState);
