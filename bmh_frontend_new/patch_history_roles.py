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

    # Update type Handover
    content = re.sub(
        r'type Handover = { id: string; from_name: string; to_name: string; from_employee_id: string; to_employee_id: string; amount: string; status: string; created_at: string; };',
        'type Handover = { id: string; from_name: string; to_name: string; from_employee_id: string; to_employee_id: string; amount: string; status: string; created_at: string; from_role?: string; from_department?: string; to_role?: string; to_department?: string; };',
        content
    )

    # For admin
    if 'admin' in filepath:
        content = content.replace(
            '''<Text style={{fontWeight: 'bold', color: '#1e293b'}}>From: {h.from_name}</Text>
        <Text style={{fontSize: 12, color: '#64748b', marginTop: 4}}>{new Date(h.created_at).toLocaleString()}</Text>''',
            '''<Text style={{fontWeight: 'bold', color: '#1e293b'}}>From: {h.from_name}</Text>
        {h.from_role && <Text style={{fontSize: 12, color: '#475569', marginTop: 2}}>{h.from_role} • {h.from_department}</Text>}
        <Text style={{fontSize: 12, color: '#64748b', marginTop: 4}}>{new Date(h.created_at).toLocaleString()}</Text>'''
        )
    else:
        # For others
        content = content.replace(
            '''<Text style={{fontWeight: 'bold', color: '#1e293b'}}>{isSent ? `To: ${h.to_name}` : `From: ${h.from_name}`}</Text>
                  <Text style={{fontSize: 12, color: '#64748b', marginTop: 4}}>{new Date(h.created_at).toLocaleString()}</Text>''',
            '''<Text style={{fontWeight: 'bold', color: '#1e293b'}}>{isSent ? `To: ${h.to_name}` : `From: ${h.from_name}`}</Text>
                  {((isSent && h.to_role) || (!isSent && h.from_role)) && (
                    <Text style={{fontSize: 12, color: '#475569', marginTop: 2}}>
                      {isSent ? `${h.to_role} • ${h.to_department}` : `${h.from_role} • ${h.from_department}`}
                    </Text>
                  )}
                  <Text style={{fontSize: 12, color: '#64748b', marginTop: 4}}>{new Date(h.created_at).toLocaleString()}</Text>'''
        )
        # Also need to fix doctor which might have slightly different spacing or formatting
        # Wait, I'll use regex if simple string replace fails.
        # But this is safe. Let's see if it works.

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print('Updated frontend history successfully')
