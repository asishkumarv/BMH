const fs = require('fs');
const path = require('path');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const routesDir = path.join(__dirname, 'routes');
const files = getAllFiles(routesDir);

const schema = {};

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const tableName = match[1].toLowerCase();
    const columns = match[2].split(',').map(c => c.trim().replace(/['"`$\n\r]/g, '')).filter(c => c && !c.includes('{') && !c.includes(' ') && c.toLowerCase() !== 'created_at');
    
    if (!schema[tableName]) {
      schema[tableName] = new Set();
    }
    columns.forEach(c => schema[tableName].add(c));
  }
});

let sql = '';
for (const [table, cols] of Object.entries(schema)) {
  sql += `CREATE TABLE IF NOT EXISTS ${table} (\n`;
  sql += `  id SERIAL PRIMARY KEY,\n`;
  Array.from(cols).forEach(col => {
    if (col !== 'id') {
      sql += `  ${col} VARCHAR(255),\n`;
    }
  });
  sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
  sql += `);\n\n`;
}

fs.writeFileSync('init_ecogreen.sql', sql);
console.log('init_ecogreen.sql generated.');
