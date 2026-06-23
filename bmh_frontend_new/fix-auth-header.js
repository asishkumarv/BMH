const fs = require('fs');

const files = [
  'app/admin/login.tsx',
  'app/admin/register.tsx',
  'app/department/login.tsx',
  'app/department/register.tsx',
  'app/employee/login.tsx',
  'app/employee/register.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Match the header and the logo container
  const regex = /<View style=\{styles\.header\}>[\s\S]*?<Pressable style=\{styles\.backBtn\}[^>]*>[\s\S]*?<\/Pressable>[\s\S]*?<\/View>\s*<View style=\{\{ alignItems: 'center', marginBottom: 32 \}\}>\s*<Image source=\{require\('\.\.\/\.\.\/assets\/CompanyLogo\.jpg'\)\} style=\{\{ width: 300, height: 90 \}\} resizeMode="contain" \/>\s*<\/View>/;

  const replacement = `            <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', marginBottom: 32 }]}>
              <Pressable style={[styles.backBtn, { marginBottom: 0 }]} onPress={() => router.back()}>
                <ArrowLeft color="#1E40AF" size={16} />
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
              
              <View style={{ flex: 1, alignItems: 'center', marginRight: 60 }}>
                <Image source={require('../../assets/CompanyLogo.jpg')} style={{ width: 220, height: 60 }} resizeMode="contain" />
              </View>
            </View>`;

  const newContent = content.replace(regex, replacement);
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log('Fixed auth header in', file);
  } else {
    console.log('No match found in', file);
  }
});
