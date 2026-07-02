import os
import re

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-booking.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add bulkRefreshKey
if 'const [bulkRefreshKey, setBulkRefreshKey] = useState(0);' not in content:
    content = content.replace(
        "const [bulkOriginalSlot, setBulkOriginalSlot] = useState<any>(null);",
        "const [bulkOriginalSlot, setBulkOriginalSlot] = useState<any>(null);\n  const [bulkRefreshKey, setBulkRefreshKey] = useState(0);"
    )

# 2. Add it to useEffect
old_use_effect = '''  useEffect(() => {
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
  }, [activeTab, rescheduleMode, bulkDoctorFilter, bulkDateFilter]);'''

new_use_effect = '''  useEffect(() => {
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
  }, [activeTab, rescheduleMode, bulkDoctorFilter, bulkDateFilter, bulkRefreshKey]);'''

if old_use_effect in content:
    content = content.replace(old_use_effect, new_use_effect)

# 3. Add to handleConfirmBulkReschedule
old_success = '''              if (res.data.success) {
                Alert.alert('Success', res.data.message);
                setBulkOriginalSlot(null);
              } else {'''
new_success = '''              if (res.data.success) {
                Alert.alert('Success', res.data.message);
                setBulkOriginalSlot(null);
                setBulkRefreshKey(k => k + 1);
              } else {'''

if old_success in content:
    content = content.replace(old_success, new_success)

# 4. Make sure doctor name is in Origin Slots
# Origin slots rendering looks like this:
origin_pattern = r'<View style=\{styles.slotDetailRow\}><Calendar color="#64748b" size=\{16\} \/><Text style=\{styles.slotDetailText\}>\{new Date\(s.date\).toLocaleDateString\(\'en-GB\'\)\}<\/Text><\/View>\s*<View style=\{styles.slotDetailRow\}><Clock color="#64748b" size=\{16\} \/><Text style=\{styles.slotDetailText\}>\{s.start_time\} - \{s.end_time\}<\/Text><\/View>\s*<\/View>\s*<View style=\{\{flexDirection: \'row\', justifyContent: \'space-between\', alignItems: \'center\', marginTop: 12\}\}>\s*<Text style=\{\{fontSize: 13, color: \'#64748b\'\}\}>Booked: \{s.booked_count \|\| 0\}<\/Text>\s*<View style=\{styles.selectBtn\}><Text style=\{styles.selectBtnText\}>Select Origin Slot<\/Text><\/View>'

# We will use re.sub for origin slots.
import re
# Since we might have already added it to Target slots but not origin, let's just do a blanket regex search for slotDetails
# Wait, it's safer to just find all <View style={styles.slotDetails}> and if there is no User icon inside, insert it.

def add_doctor_name_to_slot(match):
    inner_content = match.group(1)
    if '<User color="#64748b"' not in inner_content:
        # insert it right after the start of slotDetails
        new_row = '\n                                <View style={styles.slotDetailRow}><User color="#64748b" size={16} /><Text style={[styles.slotDetailText, {fontWeight: \'bold\', color: \'#1e293b\'}]}>Dr. {s.doctor_name}</Text></View>'
        return '<View style={styles.slotDetails}>' + new_row + inner_content
    return match.group(0)

content = re.sub(r'<View style=\{styles\.slotDetails\}>([\s\S]*?)<\/View>', add_doctor_name_to_slot, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated employee patient-booking successfully (part 2).')
