import re

for filepath in [r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\register.tsx', r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\register.tsx']:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The login link text block:
    # <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(...)}>
    #   <Text style={styles.loginLinkAction}>Access System Login</Text>
    # </Pressable>
    
    # Let's fix that exactly.
    content = re.sub(r'(<TouchableOpacity[^>]*>\s*<Text[^>]*>[^<]*</Text>\s*)</Pressable>', r'\1</TouchableOpacity>', content)
    
    # Wait, earlier I didn't replace <Pressable with <TouchableOpacity for this link in `update_registers_safe.py` because I left it as `pass`!
    # So it still says <Pressable onPress=...>
    
    # So let's replace the whole loginLinkRow section safely:
    
    login_old_emp = """              <View style={styles.loginLinkRow}>
                <Text style={styles.loginLinkText}>Already authenticated within our logs? </Text>
                <Pressable onPress={() => router.push('/employee/login' as any)}>
                  <Text style={styles.loginLinkAction}>Access System Login</Text>
                </Pressable>
              </View>"""
    login_new_emp = """              <View style={styles.loginLinkRow}>
                <Text style={styles.loginLinkText}>Already authenticated within our logs? </Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/employee/login' as any)}>
                  <Text style={styles.loginLinkAction}>Access System Login</Text>
                </TouchableOpacity>
              </View>"""
              
    content = content.replace(login_old_emp, login_new_emp)

    login_old_dept = """              <View style={styles.loginLinkRow}>
                <Text style={styles.loginLinkText}>Already authenticated within our logs? </Text>
                <Pressable onPress={() => router.push('/department/login' as any)}>
                  <Text style={styles.loginLinkAction}>Access System Login</Text>
                </Pressable>
              </View>"""
    login_new_dept = """              <View style={styles.loginLinkRow}>
                <Text style={styles.loginLinkText}>Already authenticated within our logs? </Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/department/login' as any)}>
                  <Text style={styles.loginLinkAction}>Access System Login</Text>
                </TouchableOpacity>
              </View>"""

    content = content.replace(login_old_dept, login_new_dept)

    # What about the submit button? 
    # In my previous script I did: 
    # submit_block_old = ... </Pressable>
    # submit_block_new = ... </TouchableOpacity>
    # It SHOULD have worked for the submit button. Let's check why there was a TS error.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        print(f"Fixed {filepath}")
