import re

def fix_attendance_dropdown(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    old_dropdown = """const Dropdown = ({ options, value, onChange }: any) => {
  const [open, setOpen] = useState(false);
  
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.input, { padding: 0, justifyContent: 'center', minWidth: 200, flex: 2 }]}>
        {React.createElement(
          'select',
          {
            value: value,
            onChange: (e: any) => onChange(e.target.value),
            style: { width: '100%', height: '100%', border: 'none', backgroundColor: 'transparent', padding: '12px', fontSize: '16px', color: value ? '#111827' : '#9ca3af' }
          },
          React.createElement('option', { value: '', disabled: true }, 'Select Department'),
          ...options.map((o: any) => React.createElement('option', { key: o.name, value: o.name }, o.name))
        )}
      </View>
    );
  }

  return (
    <View style={{zIndex: 1000, position: 'relative', flex: 2, minWidth: 200}}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={[styles.input, {justifyContent: 'center'}]}>
        <Text style={{color: value ? '#111827' : '#9ca3af'}}>{value || "Select Department"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={{position: 'absolute', top: 55, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, zIndex: 9999, maxHeight: 200, elevation: 5}}>
          <ScrollView nestedScrollEnabled>
            {options.map((o: any) => (
              <TouchableOpacity key={o.name} style={{padding: 12, borderBottomWidth: 1, borderColor: '#f3f4f6'}} onPress={() => {onChange(o.name); setOpen(false);}}>
                <Text>{o.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};"""

    new_dropdown = """import { Modal } from 'react-native';

const Dropdown = ({ options, value, onChange }: any) => {
  const [open, setOpen] = useState(false);
  
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.input, { padding: 0, justifyContent: 'center', minWidth: 200, flex: 2 }]}>
        {React.createElement(
          'select',
          {
            value: value,
            onChange: (e: any) => onChange(e.target.value),
            style: { width: '100%', height: '100%', border: 'none', backgroundColor: 'transparent', padding: '12px', fontSize: '16px', color: value ? '#111827' : '#9ca3af' }
          },
          React.createElement('option', { value: '', disabled: true }, 'Select Department'),
          ...options.map((o: any) => React.createElement('option', { key: o.name, value: o.name }, o.name))
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 2, minWidth: 200 }}>
      <TouchableOpacity onPress={() => setOpen(true)} style={[styles.input, {justifyContent: 'center'}]}>
        <Text style={{color: value ? '#111827' : '#9ca3af'}}>{value || "Select Department"}</Text>
      </TouchableOpacity>
      
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }} 
          onPress={() => setOpen(false)}
          activeOpacity={1}
        >
          <View style={{ backgroundColor: 'white', width: '100%', maxWidth: 400, maxHeight: '60%', borderRadius: 12, overflow: 'hidden' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#f8fafc' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Select Department</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((o: any) => (
                <TouchableOpacity 
                  key={o.name} 
                  style={{ padding: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' }} 
                  onPress={() => { onChange(o.name); setOpen(false); }}
                >
                  <Text style={{ fontSize: 16, color: value === o.name ? '#0284c7' : '#334155', fontWeight: value === o.name ? '600' : '400' }}>
                    {o.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};"""

    # If already imports Modal, avoid importing it twice. Let's just use regular replace since we know the file structure.
    if "import { Modal } from 'react-native';" not in content and "Modal" not in content.split("react-native")[0]:
        # we will just add Modal to react-native imports if not present, but it's easier to just assume React Native Modal is imported or we can add it inline? No, it's a module.
        pass

    # To be safe, let's just replace the Dropdown definition without injecting `import { Modal }` at the top if it's tricky.
    # Actually, we can just replace the Dropdown component code. React Native's Modal might already be imported. Let's check `attendance.tsx` for Modal import.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        # replace dropdown
        # we will use regex to find Dropdown
        pattern = re.compile(r'const Dropdown = \(\{ options, value, onChange \}: any\) => \{.*?\n  \};\n', re.DOTALL)
        content = re.sub(pattern, new_dropdown.replace("import { Modal } from 'react-native';\n\n", "") + '\n', content)
        
        # fix imports
        if 'Modal' not in content.split("from 'react-native'")[0] and 'react-native' in content:
            content = content.replace("from 'react-native';", ", Modal } from 'react-native';")
            
        f.write(content)

fix_attendance_dropdown(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\attendance.tsx')
