def fix_line(filepath, line_no):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    if line_no - 1 < len(lines):
        lines[line_no - 1] = lines[line_no - 1].replace('</Pressable>', '</TouchableOpacity>')
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)

fix_line(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\register.tsx', 414)
fix_line(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\register.tsx', 402)
