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
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace <img src={require('...')} ... /> with <Image source={require('...')} ... />
  // We need to carefully handle the style object and src -> source.
  content = content.replace(/<img src=\{(require\('[^']+'\))\} style=\{\{([^}]+), objectFit: 'contain'(.*?)\}\} alt="[^"]+" \/>/g, '<Image source={$1} style={{$2}} resizeMode="contain" />');

  content = content.replace(/<img src=\{(require\('[^']+'\))\} style=\{\{([^}]+), objectFit: 'contain' \}\} alt="[^"]+" \/>/g, '<Image source={$1} style={{$2}} resizeMode="contain" />');


  // Add Image to react-native import if not present
  if (content.indexOf('<Image ') !== -1) {
    if (!content.includes('Image,') && !content.includes(', Image') && content.indexOf('{ Image }') === -1) {
       content = content.replace(/import \{([^}]*)\} from 'react-native';/, (match, p1) => {
         if (!p1.includes('Image')) {
           return `import { ${p1}, Image } from 'react-native';`;
         }
         return match;
       });
    }
  }

  fs.writeFileSync(file, content);
  console.log('Fixed', file);
});
