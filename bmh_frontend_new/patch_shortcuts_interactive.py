import os
import re

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-booking.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add references and states
refs_str = "const prRef = React.useRef<TextInput>(null);"
new_refs_str = """const prRef = React.useRef<TextInput>(null);
  const genderRef = React.useRef<TextInput>(null);
  const paymentRef = React.useRef<TextInput>(null);
  const [genderFocused, setGenderFocused] = useState(false);
  const [paymentFocused, setPaymentFocused] = useState(false);"""
if "const genderRef =" not in content:
    content = content.replace(refs_str, new_refs_str)

# 2. Update PR ref onSubmitEditing
old_pr = '''onSubmitEditing={() => handleBooking()}'''
new_pr = '''onSubmitEditing={() => genderRef.current?.focus()}'''
if old_pr in content:
    content = content.replace(old_pr, new_pr)

# 3. Update Gender view
old_gender = '''              <View style={{flex: 1, marginRight: isMobile ? 0 : 10, marginBottom: isMobile ? 16 : 0}}>
                <Text style={styles.formLabel}>Gender</Text>
                <View style={styles.toggleRow}>'''

new_gender = '''              <View style={{flex: 1, marginRight: isMobile ? 0 : 10, marginBottom: isMobile ? 16 : 0}}>
                <Text style={styles.formLabel}>Gender (Type 'm' or 'f')</Text>
                <TextInput
                  ref={genderRef}
                  style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }}
                  onFocus={() => setGenderFocused(true)}
                  onBlur={() => setGenderFocused(false)}
                  autoCapitalize="none"
                  value=""
                  onChangeText={(text) => {
                    const last = text.slice(-1).toLowerCase();
                    if (last === 'm') setGender('Male');
                    if (last === 'f') setGender('Female');
                  }}
                  returnKeyType="next"
                  onSubmitEditing={() => paymentRef.current?.focus()}
                />
                <View style={[styles.toggleRow, genderFocused && { shadowColor: '#3b82f6', shadowOpacity: 0.5, shadowRadius: 4, elevation: 4, borderWidth: 1, borderColor: '#3b82f6', borderRadius: 8 }]}>'''

if old_gender in content:
    content = content.replace(old_gender, new_gender)

# 4. Update Payment view
old_payment = '''              <View style={{flex: 1}}>
                <Text style={styles.formLabel}>Payment Mode</Text>
                <View style={styles.toggleRow}>'''

new_payment = '''              <View style={{flex: 1}}>
                <Text style={styles.formLabel}>Payment Mode (Type 'c' or 'o')</Text>
                <TextInput
                  ref={paymentRef}
                  style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }}
                  onFocus={() => setPaymentFocused(true)}
                  onBlur={() => setPaymentFocused(false)}
                  autoCapitalize="none"
                  value=""
                  onChangeText={(text) => {
                    const last = text.slice(-1).toLowerCase();
                    if (last === 'c') setPaymentMode('Cash');
                    if (last === 'o') setPaymentMode('Online');
                  }}
                  returnKeyType="done"
                  onSubmitEditing={() => handleBooking()}
                />
                <View style={[styles.toggleRow, paymentFocused && { shadowColor: '#3b82f6', shadowOpacity: 0.5, shadowRadius: 4, elevation: 4, borderWidth: 1, borderColor: '#3b82f6', borderRadius: 8 }]}>'''

if old_payment in content:
    content = content.replace(old_payment, new_payment)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied interactive keyboard shortcuts for Gender and Payment.")
