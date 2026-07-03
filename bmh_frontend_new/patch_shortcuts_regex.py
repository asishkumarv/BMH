import os
import re

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-booking.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Gender section
gender_pattern = r"(<Text style=\{styles\.formLabel\}>Gender</Text>\s*<View style=\{styles\.toggleRow\}>)"
new_gender = """<Text style={styles.formLabel}>Gender (Type 'm' or 'f')</Text>
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
                <View style={[styles.toggleRow, genderFocused && { shadowColor: '#3b82f6', shadowOpacity: 0.5, shadowRadius: 4, elevation: 4, borderWidth: 1, borderColor: '#3b82f6', borderRadius: 8 }]}>"""
content = re.sub(gender_pattern, new_gender, content)

# Replace Payment Mode section
payment_pattern = r"(<Text style=\{styles\.formLabel\}>Payment Mode</Text>\s*<View style=\{styles\.toggleRow\}>)"
new_payment = """<Text style={styles.formLabel}>Payment Mode (Type 'c' or 'o')</Text>
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
                <View style={[styles.toggleRow, paymentFocused && { shadowColor: '#3b82f6', shadowOpacity: 0.5, shadowRadius: 4, elevation: 4, borderWidth: 1, borderColor: '#3b82f6', borderRadius: 8 }]}>"""
content = re.sub(payment_pattern, new_payment, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied Regex patches")
