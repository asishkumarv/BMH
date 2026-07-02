import os
import re

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-booking.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the missing </View> after Calendar
pattern = r"(<Text style=\{styles\.slotDetailText\}>\{new Date\(s\.date\)\.toLocaleDateString\('en-GB'\)\}<\/Text>)\s*(<View style=\{styles\.slotDetailRow\}>)"
replacement = r"\1\n                  </View>\n                  \2"

content = re.sub(pattern, replacement, content)

# Check if there are any other missing </View> from the same bug.
# There might be cases where the date string is slightly different.
# Let's also check `<Text style={styles.slotDetailText}>{new Date(s.date).toLocaleDateString('en-GB')}</Text>\n<View` in case they were all on one line.
pattern2 = r"(<Text style=\{styles\.slotDetailText\}>\{new Date\(s\.date\)\.toLocaleDateString\('en-GB'\)\}<\/Text>)\s*(<View style=\{styles\.slotDetailRow\}>)"

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed JSX corruption in patient-booking.tsx")
