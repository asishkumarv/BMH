import os

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\payslips.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace <View style={{ alignItems: 'flex-end' }}> with <View style={{ alignItems: 'flex-end', flex: 1, paddingLeft: 16 }}>
content = content.replace(
    "<View style={{ alignItems: 'flex-end' }}>", 
    "<View style={{ alignItems: 'flex-end', flex: 1, paddingLeft: 16 }}>"
)

# Replace psSubtext style to add textAlign: 'right'
content = content.replace(
    "psSubtext: { fontSize: 12, color: Colors.light.icon, marginTop: 4 },",
    "psSubtext: { fontSize: 12, color: Colors.light.icon, marginTop: 4, textAlign: 'right', flexWrap: 'wrap' },"
)

# Replace psRow to have alignItems: 'flex-start' instead of 'center' so if it wraps, label stays at top
content = content.replace(
    "psRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },",
    "psRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap', marginBottom: 8 },"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated department payslips.tsx successfully')
