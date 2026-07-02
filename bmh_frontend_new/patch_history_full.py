import os
import re

# We will patch admin wallet separately because its structure is a bit different.

# 1. Admin Wallet
admin_file = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\wallet.tsx'
with open(admin_file, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<Text style={styles.pendingNote}>From: {h.from_name}</Text>',
    '''<Text style={styles.pendingNote}>From: {h.from_name} ({h.from_employee_id})</Text>\n                    <Text style={{fontSize: 12, color: '#475569', marginTop: 2}}>{h.from_role} • {h.from_department}</Text>'''
)

# For historyPeer, we might have previously patched it in patch_history_roles.py, let's look for exactly what is there now.
# Wait, my previous patch in `patch_history_roles.py` replaced `<Text style={{fontWeight: 'bold', color: '#1e293b'}}>From: {h.from_name}</Text>`
# But wait! I patched `<Text style={{fontWeight: 'bold', color: '#1e293b'}}>From: {h.from_name}</Text>` in `patch_history_roles.py` but `grep_search` showed `<Text style={styles.historyPeer}>From: {h.from_name}</Text>` for admin! That means my previous patch FAILED on admin historyCard!

# Let's just use regex to replace `<Text style={styles.historyPeer}>From: {h.from_name}</Text>`
content = re.sub(
    r'<Text style=\{styles.historyPeer\}>From: \{h\.from_name\}</Text>\s*<Text style=\{styles\.historyDate\}>\{new Date\(h\.created_at\)\.toLocaleString\(\)\}</Text>',
    r'''<Text style={styles.historyPeer}>From: {h.from_name} ({h.from_employee_id})</Text>
                      {h.from_role && <Text style={{fontSize: 12, color: '#475569', marginTop: 2}}>{h.from_role} • {h.from_department}</Text>}
                      <Text style={styles.historyDate}>{new Date(h.created_at).toLocaleString()}</Text>''',
    content
)

with open(admin_file, 'w', encoding='utf-8') as f:
    f.write(content)


# 2. Department, Employee, Doctor
files = [
    r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\wallet.tsx',
    r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\wallet.tsx',
    r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\doctor\dashboard\wallet.tsx'
]

for filepath in files:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # pendingCard
    content = content.replace(
        '<Text style={styles.pendingNote}>From: {h.from_name}</Text>',
        '''<Text style={styles.pendingNote}>From: {h.from_name} ({h.from_employee_id})</Text>\n                    <Text style={{fontSize: 12, color: '#475569', marginTop: 2}}>{h.from_role} • {h.from_department}</Text>'''
    )

    # txCard
    # It might be in this format:
    # <Text style={styles.txType}>
    #   {h.from_employee_id == employeeId ? `Handed to ${h.to_name}` : `Received from ${h.from_name}`}
    # </Text>
    
    # We will use regex to find this block and replace it
    pattern = r'<Text style=\{styles\.txType\}>\s*\{h\.from_employee_id == employeeId \? `Handed to \$\{h\.to_name\}` : `Received from \$\{h\.from_name\}`\}\s*</Text>'
    replacement = r'''<Text style={styles.txType}>
                      {h.from_employee_id == employeeId ? `Handed to ${h.to_name} (${h.to_employee_id})` : `Received from ${h.from_name} (${h.from_employee_id})`}
                    </Text>
                    <Text style={{fontSize: 12, color: '#475569', marginTop: 2}}>
                      {h.from_employee_id == employeeId ? `${h.to_role} • ${h.to_department}` : `${h.from_role} • ${h.from_department}`}
                    </Text>'''
    
    content = re.sub(pattern, replacement, content)

    # Wait, my previous patch_history_roles.py tried to replace `<Text style={{fontWeight: 'bold', color: '#1e293b'}}>{isSent ? ...` but that was for some other component or maybe I got the code completely wrong. Let's make sure I'm doing it cleanly.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print('Updated frontend history successfully')
