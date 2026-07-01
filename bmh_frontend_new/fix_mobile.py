import re

def fix_mobile_in_profile(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The line in question looks like:
    # <View style={styles.profileRow}><Text style={styles.profileKey}>Mobile:</Text><Text style={styles.profileVal}>{pd.mobile || 'N/A'}</Text></View>
    # We want to change `{pd.mobile || 'N/A'}` to `{(selectedEmployee as any).mobile || pd.mobile || 'N/A'}`
    
    old_str = "{pd.mobile || 'N/A'}"
    new_str = "{(selectedEmployee as any).mobile || pd.mobile || 'N/A'}"
    
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")
    else:
        print(f"Could not find exact string in {filepath}, perhaps it was already changed.")

fix_mobile_in_profile(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\employees.tsx')
fix_mobile_in_profile(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\employees.tsx')
