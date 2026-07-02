import os
import re

files = [
    r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\wallet.tsx',
    r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\wallet.tsx',
    r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\wallet.tsx',
    r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\doctor\dashboard\wallet.tsx'
]

for filepath in files:
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add searchQuery state if missing
    if 'const [searchQuery, setSearchQuery] = useState(\'\');' not in content:
        content = content.replace(
            "const [selectedPeerId, setSelectedPeerId] = useState('');",
            "const [selectedPeerId, setSelectedPeerId] = useState('');\n  const [searchQuery, setSearchQuery] = useState('');"
        )
    
    # Check if ScrollView is imported
    if 'ScrollView' not in content[:500]:
        content = content.replace('import { View, Text, StyleSheet,', 'import { View, Text, StyleSheet, ScrollView,')

    # Find the peerList block using regex
    # The block starts with <View style={styles.peerList}> and ends with </View>
    
    # We will replace the entire label and view block based on the label text
    # Admin says "Select Person", others say "Select Peer"
    label = "Select Person" if 'admin' in filepath else "Select Peer"
    
    # Regex to match the whole block:
    # <Text style={styles.inputLabel}>Select Person</Text> ... </View> (until the next empty line or inputLabel)
    
    replacement = f'''<Text style={{styles.inputLabel}}>{label}</Text>
              <TextInput 
                style={{styles.input}} 
                placeholder="Search name..." 
                value={{searchQuery}}
                onChangeText={{setSearchQuery}} 
              />
              <View style={{{{ maxHeight: 200, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginTop: 8, marginBottom: 16 }}}}>
                <ScrollView nestedScrollEnabled>
                  {{peers.filter((p: any) => p.full_name && p.full_name.toLowerCase().includes(searchQuery.toLowerCase())).map((p: any) => (
                    <Pressable 
                      key={{p.id}} 
                      style={{{{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: selectedPeerId === p.id ? '#eff6ff' : 'transparent' }}}}
                      onPress={{() => setSelectedPeerId(p.id)}}
                    >
                      <Text style={{{{ color: selectedPeerId === p.id ? '#2563eb' : '#334155', fontWeight: selectedPeerId === p.id ? '600' : '400' }}}}>{{p.full_name}}</Text>
                      {"" if 'admin' in filepath else "<Text style={{ color: '#64748b', fontSize: 12 }}>{p.role}</Text>"}
                    </Pressable>
                  ))}}
                  {{peers.length === 0 && <Text style={{{{padding: 12, color: '#64748b'}}}}>{'No persons found.' if 'admin' in filepath else 'No peers found in your department.'}</Text>}}
                </ScrollView>
              </View>'''
    
    # Use re.sub to replace the block
    pattern = r'<Text style=\{styles\.inputLabel\}>' + label + r'</Text>[\s\S]*?</View>'
    # We need to make sure we don't accidentally match the whole file if there's another </View>.
    # So we match until the first </View> that is indented the same way, or just use a non-greedy match.
    # The non-greedy match `.*?` should work fine.
    
    new_content = re.sub(pattern, replacement, content, count=1)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
    else:
        print(f"No match found for {filepath}")
