import os

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\check-in.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Picker import
if "import { Picker } from '@react-native-picker/picker';" not in content:
    content = content.replace("import axios from 'axios';", "import axios from 'axios';\nimport { Picker } from '@react-native-picker/picker';")

# Replace select with Picker
old_select = '''          <select 
            style={Object.assign({}, styles.selectInput, { border: 'none', outline: 'none' }) as any}
            value={doctorFilter}
            onChange={(e: any) => setDoctorFilter(e.target.value)}
          >
            <option value="">All Doctors</option>
            {doctorsList.map((doc: any) => (
              <option key={doc} value={doc}>Dr. {doc}</option>
            ))}
          </select>'''

new_select = '''          <View style={{flex: 1, justifyContent: 'center'}}>
            <Picker 
              selectedValue={doctorFilter}
              onValueChange={(itemValue) => setDoctorFilter(itemValue)}
              style={styles.selectInput}
            >
              <Picker.Item label="All Doctors" value="" />
              {doctorsList.map((doc: any) => (
                <Picker.Item key={doc} label={`Dr. ${doc}`} value={doc} />
              ))}
            </Picker>
          </View>'''

content = content.replace(old_select, new_select)

# Also fix the outlineStyle typing on TextInput just in case it's causing issues, but the main issue is select/option
# The outlineStyle: 'none' inside TextInput style array might cause warnings on mobile, it's safer to remove or platform check it, but let's leave it if it works.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated check-in.tsx successfully')
