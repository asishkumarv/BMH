const fs = require('fs');
const files = [
  'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/admin/dashboard/employees.tsx',
  'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/admin/dashboard/doctors/index.tsx',
  'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/department/dashboard/doctors/index.tsx',
  'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/patient-booking.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    // Replace all .map( with ?.map( except if already ?.map(
    // We match any character that is not ? followed by .map(
    c = c.replace(/([^\?])\.map\(/g, '$1?.map(');
    fs.writeFileSync(f, c, 'utf8');
    console.log('Safeguarded map in', f);
  } else {
    console.log('File not found:', f);
  }
});
