import re
import os

def fix_mismatched_tags():
    for filepath in [r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\register.tsx', r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\register.tsx']:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Fix </Pressable> closing a <TouchableOpacity>
        # The block is:
        # <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(...)}>
        #   <Text style={styles.loginLinkAction}>Access System Login</Text>
        # </Pressable>
        # Actually in my script I replaced <Pressable onPress=...
        # So there's a mismatch.
        
        # Regex to find <TouchableOpacity ...> ... </Pressable>
        # Just replace the specific </Pressable> that comes after <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(
        
        regex = r'(<TouchableOpacity activeOpacity=\{0\.7\}[^>]*>\s*<Text[^>]*>[^<]*</Text>\s*)</Pressable>'
        content = re.sub(regex, r'\1</TouchableOpacity>', content)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

fix_mismatched_tags()
