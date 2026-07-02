import os
import re

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-booking.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add User icon import
if 'User ' not in content and 'User,' not in content:
    content = content.replace(
        "Printer, Search } from 'lucide-react-native';",
        "Printer, Search, User } from 'lucide-react-native';"
    )

# 2. Update handleSelectBulkSlot logic
old_fetch = '''      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const url = `https://napi.bharatmedicalhallplus.com/doctors/slots?doctor_id=${slot.doctor_id}&date=${futureDate.toISOString().split('T')[0]}`;
      const res = await axios.get(url);
      setRescheduleSlots(res.data.data || []);'''

new_fetch = '''      const url = `https://napi.bharatmedicalhallplus.com/doctors/slots?doctor_id=${slot.doctor_id}`;
      const res = await axios.get(url);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const validSlots = (res.data.data || []).filter((s: any) => new Date(s.date) >= today && s.id !== slot.id);
      setRescheduleSlots(validSlots);'''

if old_fetch in content:
    content = content.replace(old_fetch, new_fetch)

# 3. Add doctor name to target slots (rescheduleSlots map)
old_target_details = '''                              <View style={styles.slotDetails}>
                                <View style={styles.slotDetailRow}><Calendar color="#64748b" size={16} /><Text style={styles.slotDetailText}>{new Date(s.date).toLocaleDateString('en-GB')}</Text></View>
                                <View style={styles.slotDetailRow}><Clock color="#64748b" size={16} /><Text style={styles.slotDetailText}>{s.start_time} - {s.end_time}</Text></View>
                              </View>'''

new_target_details = '''                              <View style={styles.slotDetails}>
                                <View style={styles.slotDetailRow}><User color="#64748b" size={16} /><Text style={[styles.slotDetailText, {fontWeight: 'bold', color: '#1e293b'}]}>Dr. {s.doctor_name}</Text></View>
                                <View style={styles.slotDetailRow}><Calendar color="#64748b" size={16} /><Text style={styles.slotDetailText}>{new Date(s.date).toLocaleDateString('en-GB')}</Text></View>
                                <View style={styles.slotDetailRow}><Clock color="#64748b" size={16} /><Text style={styles.slotDetailText}>{s.start_time} - {s.end_time}</Text></View>
                              </View>'''

# Make sure we only replace in the bulk original and target areas.
content = content.replace(old_target_details, new_target_details)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated employee patient-booking successfully.")
