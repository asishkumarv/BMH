import os
import re

filepath = r"c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-booking.tsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variables
state_target = "const [rescheduleSelectedBooking, setRescheduleSelectedBooking] = useState<any>(null);"
state_replacement = """const [rescheduleSelectedBooking, setRescheduleSelectedBooking] = useState<any>(null);
  const [rescheduleMode, setRescheduleMode] = useState<'single' | 'bulk'>('single');
  const [bulkOriginalSlot, setBulkOriginalSlot] = useState<any>(null);
  const [bulkDoctorFilter, setBulkDoctorFilter] = useState('');
  const [bulkDateFilter, setBulkDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [bulkAvailableSlots, setBulkAvailableSlots] = useState<any[]>([]);"""

if state_target in content:
    content = content.replace(state_target, state_replacement)
else:
    print("state_target not found")

# 2. Add useEffect for bulkAvailableSlots
useEffect_target = "const fetchRescheduleBookings = async () => {"
useEffect_replacement = """useEffect(() => {
    if (activeTab === 'Reschedule' && rescheduleMode === 'bulk') {
      const fetchBulkSlots = async () => {
        try {
          let url = `https://napi.bharatmedicalhallplus.com/doctors/slots?`;
          if (bulkDoctorFilter) url += `doctor_id=${bulkDoctorFilter}&`;
          if (bulkDateFilter) url += `date=${bulkDateFilter}`;
          const res = await axios.get(url);
          setBulkAvailableSlots(res.data.data || []);
        } catch(e) {}
      };
      fetchBulkSlots();
    }
  }, [activeTab, rescheduleMode, bulkDoctorFilter, bulkDateFilter]);

  const handleSelectBulkSlot = async (slot: any) => {
    setBulkOriginalSlot(slot);
    setRescheduleLoading(true);
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const url = `https://napi.bharatmedicalhallplus.com/doctors/slots?doctor_id=${slot.doctor_id}&date=${futureDate.toISOString().split('T')[0]}`;
      const res = await axios.get(url);
      setRescheduleSlots(res.data.data || []);
    } catch(e) {
      console.error(e);
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleConfirmBulkReschedule = async (newSlot: any) => {
    if (!bulkOriginalSlot) return;
    Alert.alert('Confirm Bulk Reschedule', `Are you sure you want to move all tokens from ${bulkOriginalSlot.start_time} to ${newSlot.start_time}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reschedule All', onPress: async () => {
          setRescheduleLoading(true);
          try {
            const res = await axios.put(`https://napi.bharatmedicalhallplus.com/bookings/bulk/reschedule`, {
              original_slot_id: bulkOriginalSlot.id,
              new_slot_id: newSlot.id
            });
            if (res.data.success) {
              Alert.alert('Success', res.data.message);
              setBulkOriginalSlot(null);
            } else {
              Alert.alert('Error', res.data.message);
            }
          } catch(e: any) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to bulk reschedule');
          } finally {
            setRescheduleLoading(false);
          }
      }}
    ]);
  };

  const fetchRescheduleBookings = async () => {"""

if useEffect_target in content:
    content = content.replace(useEffect_target, useEffect_replacement)
else:
    print("useEffect_target not found")

# 3. Add UI inside Reschedule Tab
ui_target = """<Text style={{fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16}}>Reschedule Bookings</Text>"""
ui_replacement = """<View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1e293b'}}>Reschedule Bookings</Text>
              <View style={{flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 4}}>
                <TouchableOpacity onPress={() => { setRescheduleMode('single'); setRescheduleSelectedBooking(null); }} style={{paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: rescheduleMode === 'single' ? 'white' : 'transparent', shadowColor: rescheduleMode === 'single' ? '#000' : 'transparent', elevation: rescheduleMode === 'single' ? 2 : 0}}>
                  <Text style={{fontWeight: '600', color: rescheduleMode === 'single' ? '#0f172a' : '#64748b'}}>Single</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setRescheduleMode('bulk'); setBulkOriginalSlot(null); }} style={{paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: rescheduleMode === 'bulk' ? 'white' : 'transparent', shadowColor: rescheduleMode === 'bulk' ? '#000' : 'transparent', elevation: rescheduleMode === 'bulk' ? 2 : 0}}>
                  <Text style={{fontWeight: '600', color: rescheduleMode === 'bulk' ? '#0f172a' : '#64748b'}}>Bulk Slot Move</Text>
                </TouchableOpacity>
              </View>
            </View>"""

if ui_target in content:
    content = content.replace(ui_target, ui_replacement)
else:
    print("ui_target not found")

ui_body_target = """{rescheduleSelectedBooking ? ("""
ui_body_replacement = """{rescheduleMode === 'bulk' ? (
              <View>
                {bulkOriginalSlot ? (
                  <View>
                    <TouchableOpacity onPress={() => setBulkOriginalSlot(null)} style={{marginBottom: 16}}>
                      <Text style={{color: Colors.light.primary, fontWeight: '600'}}>← Back to Slots</Text>
                    </TouchableOpacity>
                    <Text style={styles.sectionTitle}>Select Target Slot for Bulk Reschedule</Text>
                    <Text style={{color: '#64748b', marginBottom: 16}}>Moving all active tokens from: {new Date(bulkOriginalSlot.date).toLocaleDateString('en-GB')} {bulkOriginalSlot.start_time}</Text>
                    {rescheduleSlots.length === 0 ? (
                      <Text style={{color: '#64748b'}}>No future slots available to move these tokens to.</Text>
                    ) : (
                      <View style={styles.grid}>
                        {rescheduleSlots.map((s: any, i: number) => (
                          <TouchableOpacity key={i} style={[styles.slotCard, isMobile && { width: '100%' }]} onPress={() => handleConfirmBulkReschedule(s)} disabled={rescheduleLoading}>
                            <View style={styles.slotDetails}>
                              <View style={styles.slotDetailRow}><Calendar color="#64748b" size={16} /><Text style={styles.slotDetailText}>{new Date(s.date).toLocaleDateString('en-GB')}</Text></View>
                              <View style={styles.slotDetailRow}><Clock color="#64748b" size={16} /><Text style={styles.slotDetailText}>{s.start_time} - {s.end_time}</Text></View>
                            </View>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12}}>
                              <Text style={{fontSize: 13, color: '#3b82f6', fontWeight: '500'}}>Available: {s.total_tokens - (s.booked_count || 0)}/{s.total_tokens}</Text>
                              <View style={styles.selectBtn}><Text style={styles.selectBtnText}>{rescheduleLoading ? 'Rescheduling...' : 'Move Here'}</Text></View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    <View style={[styles.filterRow, isMobile && { flexDirection: 'column' }]}>
                      <View style={[styles.filterCol, {flex: 1}]}>
                        <Text style={styles.label}>Select Doctor</Text>
                        <View style={styles.pickerContainer}>
                          <Picker selectedValue={bulkDoctorFilter} onValueChange={setBulkDoctorFilter} style={styles.picker}>
                            <Picker.Item label="All Doctors" value="" />
                            {uniqueDoctors.map((d: any) => (
                              <Picker.Item key={d.id} label={d.name} value={d.id} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      <View style={[styles.filterCol, {flex: 1}]}>
                        <Text style={styles.label}>Select Date</Text>
                        {Platform.OS === 'web' ? (
                          <input type="date" value={bulkDateFilter} onChange={(e) => setBulkDateFilter(e.target.value)} style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', width: '100%' } as any} />
                        ) : (
                          <TextInput style={styles.input} value={bulkDateFilter} onChangeText={setBulkDateFilter} placeholder="YYYY-MM-DD" />
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.grid}>
                      {bulkAvailableSlots.map((s: any, i: number) => (
                        <TouchableOpacity key={i} style={[styles.slotCard, isMobile && { width: '100%' }]} onPress={() => handleSelectBulkSlot(s)}>
                          <View style={styles.slotDetails}>
                            <View style={styles.slotDetailRow}><Calendar color="#64748b" size={16} /><Text style={styles.slotDetailText}>{new Date(s.date).toLocaleDateString('en-GB')}</Text></View>
                            <View style={styles.slotDetailRow}><Clock color="#64748b" size={16} /><Text style={styles.slotDetailText}>{s.start_time} - {s.end_time}</Text></View>
                          </View>
                          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12}}>
                            <Text style={{fontSize: 13, color: '#64748b'}}>Booked: {s.booked_count || 0}</Text>
                            <View style={styles.selectBtn}><Text style={styles.selectBtnText}>Select Origin Slot</Text></View>
                          </View>
                        </TouchableOpacity>
                      ))}
                      {bulkAvailableSlots.length === 0 && <Text style={{color: '#64748b', padding: 20}}>No slots found. Select a specific date/doctor.</Text>}
                    </View>
                  </View>
                )}
              </View>
            ) : rescheduleSelectedBooking ? ("""

if ui_body_target in content:
    content = content.replace(ui_body_target, ui_body_replacement)
else:
    print("ui_body_target not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patient booking patched successfully")
