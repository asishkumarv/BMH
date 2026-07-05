const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/components/ui/TopHeader.tsx';
let c = fs.readFileSync(file, 'utf8');

const profileTarget = `  const handleProfileClick = () => {
    if (userType === 'super_admin') {
      router.push('/admin/dashboard/profile');
    } else if (userType === 'department_admin') {
      router.push('/department/dashboard/profile');
    } else if (userType === 'employee') {
      router.push('/employee/dashboard/profile');
    }
    setDropdownVisible(false);
  };`;

const profileReplacement = `  const handleProfileClick = () => {
    if (userType === 'super_admin') {
      router.push('/admin/dashboard/profile');
    } else if (userType === 'department_admin') {
      router.push('/department/dashboard/profile');
    } else if (userType === 'employee') {
      router.push('/employee/dashboard/profile');
    } else if (userType === 'delivery') {
      router.push('/delivery/dashboard/profile');
    }
    setDropdownVisible(false);
  };`;

c = c.replace(profileTarget, profileReplacement);

const fetchTarget = `        if (userType === 'employee' && user.id) {
          fetchAttendanceStatus(user.id);
        }`;

const fetchReplacement = `        if ((userType === 'employee' || userType === 'delivery') && user.id) {
          fetchAttendanceStatus(user.id);
        }`;

c = c.replace(fetchTarget, fetchReplacement);

fs.writeFileSync(file, c);
console.log('TopHeader patched');
