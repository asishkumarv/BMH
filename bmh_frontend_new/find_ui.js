const fs = require('fs');
const lines = fs.readFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/patient-booking.tsx', 'utf8').split('\n');
console.log('Total Lines:', lines.length);

let startIdx = lines.findIndex(l => l.includes('activeTab === \\'Reschedule\\' ? ('));
console.log('Reschedule tab starts at:', startIdx);
let nextTab = lines.findIndex((l, i) => i > startIdx && l.includes(') : activeTab ==='));
console.log('Next tab or end starts at:', nextTab, '->', nextTab > -1 ? lines[nextTab] : 'not found');
