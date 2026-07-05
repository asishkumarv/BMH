const fs = require('fs');
const content = fs.readFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/admin/dashboard/doctors/index.tsx', 'utf8');
console.log('Admin UI has refundProcessing:', content.includes('setRefundProcessing('));
console.log('Admin State has refundProcessing:', content.includes('const [refundProcessing'));

const subContent = fs.readFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/department/dashboard/doctors/index.tsx', 'utf8');
console.log('Subadmin State has refundProcessing:', subContent.includes('const [refundProcessing'));

const empContent = fs.readFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/patient-booking.tsx', 'utf8');
console.log('Employee has handleCancelBooking:', empContent.includes('handleCancelBooking'));
