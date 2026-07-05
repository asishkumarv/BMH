const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/order-assign/ManualOrders.jsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Auto fetch
const fetchTarget = `  const fetchManualOrders = async () => {
    try {
      setLoading(true);`;
const fetchReplacement = `  const fetchManualOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);`;
c = c.replace(fetchTarget, fetchReplacement);

const finallyTarget = `    } finally {
      setLoading(false);
    }`;
const finallyReplacement = `    } finally {
      if (!silent) setLoading(false);
    }`;
c = c.replace(finallyTarget, finallyReplacement);

const useEffectTarget = `  useEffect(() => {
    fetchManualOrders();
  }, [assignmentFilter]);`;
const useEffectReplacement = `  useEffect(() => {
    fetchManualOrders();
    const interval = setInterval(() => {
      fetchManualOrders(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [assignmentFilter]);`;
c = c.replace(useEffectTarget, useEffectReplacement);


// 2. Reassign
const assignTarget = `          {item.delivery_boy_id ? (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
               {boyImg ? <Image source={{uri: boyImg}} style={styles.avatar} /> : <User size={20} color="#94a3b8" style={{marginRight: 4}}/>}
               <Text style={styles.cellText} numberOfLines={1}>{item.delivery_boy_name}</Text>
            </View>
          ) : (
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={''}
                onValueChange={(val) => handleAssignBoy(item.id, val)}
                style={styles.inlinePicker}
              >
                <Picker.Item label="Assign To" value="" />
                {deliveryBoys?.map(boy => (
                  <Picker.Item key={boy.id} label={boy.full_name} value={boy.id} />
                ))}
              </Picker>
            </View>
          )}`;

const assignReplacement = `          {(item.delivery_boy_id && item.status === 'Delivered') ? (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
               {boyImg ? <Image source={{uri: boyImg}} style={styles.avatar} /> : <User size={20} color="#94a3b8" style={{marginRight: 4}}/>}
               <Text style={styles.cellText} numberOfLines={1}>{item.delivery_boy_name}</Text>
            </View>
          ) : (
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={item.delivery_boy_id || ''}
                onValueChange={(val) => { if(val) handleAssignBoy(item.id, val); }}
                style={styles.inlinePicker}
              >
                <Picker.Item label={item.delivery_boy_id ? "Reassign To" : "Assign To"} value="" />
                {deliveryBoys?.map(boy => (
                  <Picker.Item key={boy.id} label={boy.full_name} value={boy.id} />
                ))}
              </Picker>
            </View>
          )}`;
c = c.replace(assignTarget, assignReplacement);


// 3. Schedule order inputs
const scheduleTarget = `                <View style={styles.formCol}>
                  <Text style={styles.label}>Mode of Delivery</Text>
                  <View style={styles.dropdownWrapper}>
                    <Picker
                      selectedValue={formData.mode_of_delivery}
                      onValueChange={(val) => setFormData({...formData, mode_of_delivery: val})}
                      style={styles.picker}
                    >
                      <Picker.Item label="Counter" value="Counter" />
                        <Picker.Item label="Schedule Delivery" value="Schedule Delivery" />
                      <Picker.Item label="Local" value="Local" />
                      <Picker.Item label="Bus" value="Bus" />
                    </Picker>
                  </View>
                </View>`;
const scheduleReplacement = scheduleTarget + `
                {formData.mode_of_delivery === 'Schedule Delivery' && (
                  <>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Scheduled Date</Text>
                      <TextInput style={styles.input} value={formData.scheduled_date || ''} onChangeText={(t) => setFormData({...formData, scheduled_date: t})} placeholder="YYYY-MM-DD" />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Scheduled Time</Text>
                      <TextInput style={styles.input} value={formData.scheduled_time || ''} onChangeText={(t) => setFormData({...formData, scheduled_time: t})} placeholder="HH:MM" />
                    </View>
                  </>
                )}`;
c = c.replace(scheduleTarget, scheduleReplacement);

fs.writeFileSync(file, c);
console.log('ManualOrders patched successfully');
