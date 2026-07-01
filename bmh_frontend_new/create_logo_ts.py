import os

b64 = open('logo_base64.txt').read().strip()
js_content = f"export const COMPANY_LOGO_BASE64 = 'data:image/jpeg;base64,{b64}';"

with open(r'app\employee\dashboard\logoBase64.ts', 'w') as f:
    f.write(js_content)
