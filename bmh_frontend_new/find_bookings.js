const fs = require('fs');
const lines = fs.readFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/patient-booking.tsx', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('Bookings') && l.includes('activeTab')) {
    console.log('Line', i + 1, ':', l);
    // print 2 lines before and 2 after
    for(let j=Math.max(0, i-2); j<Math.min(lines.length, i+3); j++) {
      console.log('  ', j+1, lines[j]);
    }
  }
});
