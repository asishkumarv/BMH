const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.match(/\.(jsx?|tsx?)$/)) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app');
let count = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  content = content.replace(/outlineStyle\s*:\s*['"]none['"]/g, 'outlineWidth: 0');
  content = content.replace(/outline\s*:\s*['"]none['"]/g, 'outlineWidth: 0');
  if (content !== original) {
    fs.writeFileSync(file, content);
    count++;
  }
});

console.log('Fixed outline styles in ' + count + ' files.');
