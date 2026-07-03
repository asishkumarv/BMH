import os

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-booking.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_pr = '''<TextInput ref={prRef} style={styles.input} value={pr} onChangeText={setPr} placeholder="PR Details" returnKeyType="done" onSubmitEditing={() => handleCreateBooking()} />'''
new_pr = '''<TextInput ref={prRef} style={styles.input} value={pr} onChangeText={setPr} placeholder="PR Details" returnKeyType="done" onSubmitEditing={() => handleBooking()} />'''

if old_pr in content:
    content = content.replace(old_pr, new_pr)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed compilation error.")
else:
    print("Could not find exact string. Using replace.")
    content = content.replace("handleCreateBooking()", "handleBooking()")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced handleCreateBooking with handleBooking")
