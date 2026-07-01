import os
import re

def update_login_files():
    base_dir = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app'
    for root, _, files in os.walk(base_dir):
        if 'login.tsx' in files or 'register.tsx' in files:
            for file in ['login.tsx', 'register.tsx']:
                if file in files:
                    filepath = os.path.join(root, file)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()

                    # Add TouchableOpacity to imports if not present
                    if 'TouchableOpacity' not in content:
                        content = re.sub(r"import \{([^}]+)\} from 'react-native';", 
                                         lambda m: f"import {{{m.group(1)}, TouchableOpacity}} from 'react-native';" if 'TouchableOpacity' not in m.group(1) else m.group(0), 
                                         content)

                    # We want to change the main action buttons. Usually they have style={styles.loginBtn} or styles.submitBtn or styles.registerBtn.
                    # It's safer to just change ALL Pressables that have text like "Login", "Sign In", "Register", "Create Account"
                    # But actually the user said "make login registration buttons are responsive like clickable animation in al modules".
                    # Let's replace the Pressable with TouchableOpacity for the main button.
                    # It looks like: <Pressable style={styles.loginBtn} ...> ... </Pressable>
                    
                    content = re.sub(r'<Pressable([^>]*?style=\{styles\.(?:loginBtn|registerBtn|submitBtn|button)\}[^>]*)>', r'<TouchableOpacity\1 activeOpacity={0.7}>', content)
                    content = re.sub(r'</Pressable>(?=\s*(?:</View>|{errorMessage|<))', r'</TouchableOpacity>', content) # Simple heuristic, might not work perfectly if nested.
                    
                    # Safer way: replace ALL <Pressable to <TouchableOpacity and </Pressable> to </TouchableOpacity> in login files.
                    if file == 'login.tsx':
                        content = content.replace('<Pressable', '<TouchableOpacity activeOpacity={0.7}').replace('</Pressable>', '</TouchableOpacity>')
                        
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                        print(f"Updated {filepath}")

update_login_files()
