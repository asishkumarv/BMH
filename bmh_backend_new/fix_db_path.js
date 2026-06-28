const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'routes');
const files = fs.readdirSync(dir);
files.forEach(f => {
  if (f.endsWith('Routes.js')) {
    let p = path.join(dir, f);
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/require\(['"`]\.\.\/\.\.\/db['"`]\)/g, 'require("../db")');
    fs.writeFileSync(p, c);
  }
});
console.log('Fixed db paths in routes');
