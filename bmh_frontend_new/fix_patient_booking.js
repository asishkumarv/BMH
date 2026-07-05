const fs = require('fs');
const filePath = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/patient-booking.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// Find the index of "import React"
const reactImportIndex = content.indexOf('import React');

if (reactImportIndex !== -1) {
  // Slice out everything before "import React"
  content = content.slice(reactImportIndex);
  
  // Now we need to update the ORIGINAL executeCancel to include refund logic
  const oldExecuteCancel = `const executeCancel = async (b: any) => {
      try {
        const res = await axios.post(\`https://napi.bharatmedicalhallplus.com/bookings/\${b.booking_id}/cancel\`, {
          cancelled_by_id: user.id,
          cancelled_by_name: user.name || user.full_name,
          cancelled_by_role: user.role,
          cancelled_by_dept: user.department || ''
        });
        if (res.data.success) {
          alert('Booking cancelled successfully');
          fetchAllBookings();
        }
      } catch(err: any) {
        alert(err?.response?.data?.message || 'Failed to cancel booking');
      }
    };`;

  const newExecuteCancel = `const executeCancel = async (b: any) => {
      try {
        const res = await axios.post(\`https://napi.bharatmedicalhallplus.com/bookings/\${b.booking_id || b.id}/cancel\`, {
          cancelled_by_id: user.id,
          cancelled_by_name: user.name || user.full_name,
          cancelled_by_role: user.role,
          cancelled_by_dept: user.department || '',
          refund_type: cancelRefundMode,
          refund_tnx: cancelRefundTnx
        });
        if (res.data.success) {
          alert('Booking cancelled successfully');
          setCancelBookingSelected(null);
          setCancelRefundTnx('');
          fetchAllBookings();
        }
      } catch(err: any) {
        alert(err?.response?.data?.message || 'Failed to cancel booking');
      }
    };`;

  if (content.includes('const executeCancel = async (b: any) => {\r\n      try {\r\n        const res = await axios.post(`https://napi.bharatmedicalhallplus.com/bookings/${b.booking_id}/cancel`') || content.includes('const res = await axios.post(`https://napi.bharatmedicalhallplus.com/bookings/${b.booking_id}/cancel`')) {
    // We will do a regex replace to be safe about whitespace
    const regex = /const executeCancel = async \(b: any\) => \{[\s\S]*?Failed to cancel booking'\);\s*\}\s*\};/;
    content = content.replace(regex, newExecuteCancel);
  } else {
    console.log("Could not find the original executeCancel in the file!");
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed patient-booking.tsx syntax error and restored refund logic');
} else {
  console.log("Could not find 'import React' in patient-booking.tsx!");
}
