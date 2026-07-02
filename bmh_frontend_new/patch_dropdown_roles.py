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
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # I will replace the <Text style={{ color: selectedPeerId === p.id ? '#2563eb' : '#334155', fontWeight: selectedPeerId === p.id ? '600' : '400' }}>{p.full_name}</Text>
    # and any subsequent <Text> for the role with a new unified block.

    # regex to find the Pressable block for the peer inside the ScrollView
    pattern = r'(<Text style=\{\{ color: selectedPeerId === p\.id \? \'#2563eb\' : \'#334155\', fontWeight: selectedPeerId === p\.id \? \'600\' : \'400\' \}\}>\{p\.full_name\}</Text>)([\s\S]*?</Pressable>)'

    def repl(m):
        # We replace the matched text with full_name and a subtitle for role/department
        # We also need to strip out the old role text if it exists
        suffix = m.group(2)
        # remove old <Text style={{ color: '#64748b', fontSize: 12 }}>{p.role}</Text> from suffix
        suffix = re.sub(r'<Text[^>]*>\{p\.role\}</Text>\s*', '', suffix)
        
        new_text = r'''<Text style={{ color: selectedPeerId === p.id ? '#2563eb' : '#334155', fontWeight: selectedPeerId === p.id ? '600' : '400' }}>{p.full_name}</Text>
                      {(p.role || p.department) && (
                        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                          {p.role || 'Unknown Role'} {p.department ? `• ${p.department}` : ''}
                        </Text>
                      )}'''
        return new_text + suffix

    new_content = re.sub(pattern, repl, content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated dropdown details in {filepath}")
    else:
        print(f"No changes for dropdown in {filepath}")
