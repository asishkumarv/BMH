import base64

with open(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\assets\CompanyLogo.jpg', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')

js_content = f"export const COMPANY_LOGO_BASE64 = 'data:image/jpeg;base64,{b64}';"

with open(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\logoBase64.ts', 'w', encoding='utf-8') as f:
    f.write(js_content)
