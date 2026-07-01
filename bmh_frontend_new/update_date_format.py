import re

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update toLocaleDateString() to use 'en-GB' (dd/mm/yyyy)
    content = content.replace(".toLocaleDateString()", ".toLocaleDateString('en-GB')")
    
    # 2. Update toLocaleString() to toLocaleDateString('en-GB') for nowStr
    content = content.replace("new Date().toLocaleString()", "new Date().toLocaleDateString('en-GB')")

    # 3. Change "Date : " to "Appt date : " in HTML
    content = content.replace("<div>Date : ${printDate}</div>", "<div>Appt date : ${printDate}</div>")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

update_file(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-booking.tsx')
update_file(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-history.tsx')
