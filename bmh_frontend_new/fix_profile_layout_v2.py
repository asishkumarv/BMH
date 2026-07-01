import re

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\profile.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace row style to include flexWrap: 'wrap' and remove minWidth issues
content = content.replace("row: { flexDirection: 'row', gap: 32, alignItems: 'flex-start' },", 
                          "row: { flexDirection: 'row', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' },")
content = content.replace("leftCol: { flex: 1, minWidth: 350 },", "leftCol: { flex: 1, minWidth: 320 },")
content = content.replace("rightCol: { flex: 1, minWidth: 350 },", "rightCol: { flex: 1, minWidth: 320 },")

# Remove isMobile logic from the view containers to just let flexWrap do its job natively
content = content.replace("style={[styles.row, isMobile && styles.rowMobile]}", "style={styles.row}")
content = content.replace("style={[styles.leftCol, isMobile && styles.colMobile]}", "style={styles.leftCol}")
content = content.replace("style={[styles.rightCol, isMobile && styles.colMobile]}", "style={styles.rightCol}")
content = content.replace("style={[styles.card, isMobile && styles.cardMobile]}", "style={styles.card}")
content = content.replace("style={[styles.container, isMobile && styles.containerMobile]}", "style={styles.container}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated profile.tsx")
