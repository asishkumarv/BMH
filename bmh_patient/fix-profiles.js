const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if(file !== 'node_modules' && file !== '.expo' && file !== '.git') {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if(dirFile.endsWith('.tsx')) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
};

const allFiles = walkSync('./app');

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if(content.includes('<img ')) {
    content = content.replace(/<img src=\{([^}]+)\} alt="Profile" style=\{\{([^}]+), objectFit: 'cover' \}\} \/>/g, '<Image source={{ uri: $1 }} style={{$2}} resizeMode="cover" />');
    content = content.replace(/<img src=\{([^}]+)\} style=\{\{([^}]+), objectFit: 'cover' \}\} alt="[^"]+" \/>/g, '<Image source={{ uri: $1 }} style={{$2}} resizeMode="cover" />');
    
    if (!content.includes('Image,') && !content.includes(', Image') && content.indexOf('{ Image }') === -1) {
       content = content.replace(/import \{([^}]*)\} from 'react-native';/, (match, p1) => {
         if (!p1.includes('Image')) {
           return `import { ${p1}, Image } from 'react-native';`;
         }
         return match;
       });
    }
    changed = true;
  }
  
  if(changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed profile image', file);
  }
});
