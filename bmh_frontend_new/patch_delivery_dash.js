const fs = require('fs');

const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/delivery/dashboard/index.tsx';
let content = fs.readFileSync(file, 'utf8');

// Imports
content = content.replace(
  "import { MapPin, Phone, User, CheckCircle, Clock, Package, Navigation } from 'lucide-react-native';",
  "import { MapPin, Phone, User, CheckCircle, Clock, Package, Navigation, Camera as CameraIcon, Sun, Moon } from 'lucide-react-native';\nimport { CameraView, useCameraPermissions } from 'expo-camera';"
);

// State
const stateInjection = `  const [alarmSound, setAlarmSound] = useState<Audio.Sound | null>(null);

  // New State
  const [filterState, setFilterState] = useState('All');
  const [summary, setSummary] = useState<any>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [actionType, setActionType] = useState('');
  const [cameraMessage, setCameraMessage] = useState({ text: '', type: '' });
  const [loadingAction, setLoadingAction] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const fetchSummary = async (empId: number) => {
    try {
      const res = await axios.get(\`https://napi.bharatmedicalhallplus.com/attendance/today/\$\{empId\}\`);
      if (res.data.success) setSummary(res.data.data);
    } catch (error) {}
  };
  
  const handleAction = async (type: string) => {
    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') return Alert.alert('Camera permission required.');
    }
    let { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus !== 'granted') return Alert.alert('Location permission required.');
    
    setActionType(type);
    setCameraMessage({ text: '', type: '' });
    setCameraVisible(true);
  };
  
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      setLoadingAction(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      const location = await Location.getCurrentPositionAsync({});
      
      const payload: any = {
        employee_id: user.id,
        image: \`data:image/jpeg;base64,\$\{photo.base64\}\`,
        lat: location.coords.latitude,
        lng: location.coords.longitude
      };
      
      payload.action = actionType;
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/attendance/verify-face', payload);
      
      if (res.data.success) {
        setCameraMessage({ text: res.data.message, type: 'success' });
        setTimeout(() => setCameraVisible(false), 2000);
      } else {
        setCameraMessage({ text: res.data.message, type: 'error' });
      }
      fetchSummary(user.id);
    } catch (error: any) {
      setCameraMessage({ text: error.response?.data?.message || "Something went wrong.", type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };
`;

content = content.replace("  const [alarmSound, setAlarmSound] = useState<Audio.Sound | null>(null);", stateInjection);

// Call fetchSummary on init
content = content.replace("fetchOrders(storedUser.id);", "fetchOrders(storedUser.id);\n          fetchSummary(storedUser.id);");

// Compute Stats & Filters
const renderTop = `  return (
    <View style={styles.container}>
      {cameraVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>Confirm {actionType}</Text>
            <View style={{ width: '100%', height: 300, borderRadius: 12, overflow: 'hidden', marginBottom: 15 }}>
              <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
            </View>
            {cameraMessage.text ? (
              <Text style={{ textAlign: 'center', marginBottom: 15, color: cameraMessage.type === 'error' ? 'red' : 'green', fontWeight: 'bold' }}>{cameraMessage.text}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: '#e2e8f0', borderRadius: 8, marginRight: 10 }} onPress={() => setCameraVisible(false)} disabled={loadingAction}>
                <Text style={{ textAlign: 'center', color: '#475569', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: '#10b981', borderRadius: 8 }} onPress={handleCapture} disabled={loadingAction}>
                {loadingAction ? <ActivityIndicator color="#fff" /> : <Text style={{ textAlign: 'center', color: '#fff', fontWeight: 'bold' }}>Capture & Verify</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Welcome, {user?.full_name}</Text>
          <Text style={styles.subtitle}>GPS: {locationStatus}</Text>
        </View>
        
        {/* Creative Attendance Widget */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {!summary || summary.can_check_in ? (
            <TouchableOpacity style={{ backgroundColor: '#10b981', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => handleAction('login')}>
              <Sun size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Check In</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={{ backgroundColor: '#f43f5e', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => handleAction('logout')} disabled={!summary.can_check_out}>
              <Moon size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{summary.can_check_out ? 'Check Out' : 'Off Duty'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Widget */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15, gap: 10 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: filterState === 'All' ? '#3b82f6' : '#e0e7ff', padding: 15, borderRadius: 12, alignItems: 'center' }} onPress={() => setFilterState('All')}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: filterState === 'All' ? '#fff' : '#1e40af' }}>{orders.length}</Text>
          <Text style={{ fontSize: 12, color: filterState === 'All' ? '#fff' : '#1e40af' }}>Total</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, backgroundColor: filterState === 'Pending' ? '#f59e0b' : '#fef3c7', padding: 15, borderRadius: 12, alignItems: 'center' }} onPress={() => setFilterState('Pending')}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: filterState === 'Pending' ? '#fff' : '#b45309' }}>{orders.filter(o => o.status !== 'Delivered').length}</Text>
          <Text style={{ fontSize: 12, color: filterState === 'Pending' ? '#fff' : '#b45309' }}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, backgroundColor: filterState === 'Completed' ? '#10b981' : '#d1fae5', padding: 15, borderRadius: 12, alignItems: 'center' }} onPress={() => setFilterState('Completed')}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: filterState === 'Completed' ? '#fff' : '#047857' }}>{orders.filter(o => o.status === 'Delivered').length}</Text>
          <Text style={{ fontSize: 12, color: filterState === 'Completed' ? '#fff' : '#047857' }}>Completed</Text>
        </TouchableOpacity>
      </View>
`;

content = content.replace(
  /return \(\s*<View style=\{styles\.container\}>\s*<View style=\{styles\.header\}>\s*<View>\s*<Text style=\{styles\.title\}>Welcome, \{user\?\.full_name\}<\/Text>\s*<Text style=\{styles\.subtitle\}>GPS: \{locationStatus\}<\/Text>\s*<\/View>/g,
  renderTop
);

// Map over filtered orders instead of orders
content = content.replace(
  "data={orders}",
  "data={orders.filter(o => { if (filterState === 'Completed') return o.status === 'Delivered'; if (filterState === 'Pending') return o.status !== 'Delivered'; return true; })}"
);

fs.writeFileSync(file, content, 'utf8');
console.log('index.tsx patched with Stats and Attendance widgets.');
