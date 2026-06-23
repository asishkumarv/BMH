const fs = require('fs');
const files = [
  'app/index.tsx',
  'app/roles.tsx',
  'components/ui/AdminSidebar.tsx',
  'components/ui/SubAdminSidebar.tsx',
  'components/ui/EmployeeSidebar.tsx',
  'app/admin/login.tsx',
  'app/admin/register.tsx',
  'app/department/login.tsx',
  'app/department/register.tsx',
  'app/employee/login.tsx',
  'app/employee/register.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // index.tsx
    content = content.replace(/style=\{\{ width: 100, height: 100\}\}/g, 'style={{ width: 250, height: 70 }}');
    // roles.tsx
    content = content.replace(/style=\{\{ width: 120, height: 120\}\}/g, 'style={{ width: 280, height: 80 }}');
    
    // auth pages
    content = content.replace(/style=\{\{ width: 150, height: 150\}\}/g, 'style={{ width: 300, height: 90 }}');

    // sidebars
    content = content.replace(/style=\{\{ width: 40, height: 40, marginRight: 12 \}\}/g, 'style={{ width: 120, height: 40, marginRight: 8 }}');
    
    // left panel logo
    content = content.replace(/style=\{\{ width: '80%', height: '80%'\}\}/g, "style={{ width: '100%', height: '100%' }}");

    fs.writeFileSync(file, content);
    console.log('Adjusted dimensions in', file);
  }
});
