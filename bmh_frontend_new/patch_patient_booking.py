import os

filepath = r"c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-booking.tsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = """            <Text style={{fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 16}}>Select Token for Dr. {selectedSlot.doctor_name}</Text>
            <Text style={{fontSize: 14, color: '#64748b', marginBottom: 20}}>Tokens marked in red are already booked. Tokens in orange are Blocked.</Text>"""

replacement = """            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <Text style={{fontSize: 20, fontWeight: 'bold', color: '#0f172a'}}>Select Token for Dr. {selectedSlot.doctor_name}</Text>
            </View>
            <View style={{flexDirection: 'row', gap: 16, marginBottom: 16}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}><Calendar size={18} color="#64748b" /><Text style={{fontSize: 15, color: '#475569', fontWeight: '500'}}>{new Date(selectedSlot.date).toLocaleDateString('en-GB')}</Text></View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}><Clock size={18} color="#64748b" /><Text style={{fontSize: 15, color: '#475569', fontWeight: '500'}}>{selectedSlot.start_time} - {selectedSlot.end_time}</Text></View>
            </View>
            <Text style={{fontSize: 14, color: '#64748b', marginBottom: 20}}>Tokens marked in red are already booked. Tokens in orange are Blocked.</Text>"""

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced")
else:
    print("Target not found")
