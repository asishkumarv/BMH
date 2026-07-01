import re

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\profile.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace !isDesktop with isMobile
content = content.replace('!isDesktop', 'isMobile')

# We need to extract isMobile from useResponsive as well
if 'const { isDesktop } = useResponsive();' in content:
    content = content.replace('const { isDesktop } = useResponsive();', 'const { isMobile } = useResponsive();')
elif 'const { isDesktop, isMobile }' not in content and 'const { isMobile, isDesktop }' not in content:
    # Just in case it's already there or something else
    content = content.replace('const { isDesktop', 'const { isDesktop, isMobile')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated profile.tsx")
