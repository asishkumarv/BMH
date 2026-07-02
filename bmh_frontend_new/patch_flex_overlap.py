import os

def fix_flex(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix formCol inline styles
    old_inline = "isMobile && { marginBottom: 16 }"
    new_inline = "isMobile ? { flex: 0, marginBottom: 16, width: '100%' } : { flex: 1 }"
    content = content.replace(old_inline, new_inline)

    # 2. Fix the edit forms that don't have isMobile check
    # They use formRow and formGroup without isMobile check.
    # Let's add the isMobile check to them too!
    content = content.replace("<View style={styles.formRow}>", "<View style={[styles.formRow, isMobile && { flexDirection: 'column' }]}>")
    
    # 3. For formGroup, we can also fix its flex issue
    old_formGroup_inline = "style={styles.formGroup}"
    new_formGroup_inline = "style={[styles.formGroup, isMobile ? { flex: 0, width: '100%' } : { flex: 1 }]}"
    content = content.replace(old_formGroup_inline, new_formGroup_inline)

    # 4. In styles, remove flex: 1 from formCol and formGroup
    content = content.replace("formCol: { flex: 1 },", "formCol: { },")
    content = content.replace("formGroup: { marginBottom: 16, flex: 1 },", "formGroup: { marginBottom: 16 },")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f'Updated {filepath}')

fix_flex(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\doctors\index.tsx')
fix_flex(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\doctors\index.tsx')
