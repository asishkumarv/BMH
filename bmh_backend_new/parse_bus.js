const xlsx = require('xlsx');

try {
  const workbook = xlsx.readFile('c:/Users/Lohitha Asish/Desktop/BMH/Bus ,Route,Time.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  console.log('Columns:', Object.keys(data[0] || {}));
  console.log('Sample data (first 3 rows):');
  console.log(data.slice(0, 3));
} catch (err) {
  console.error('Failed to parse excel:', err);
}
