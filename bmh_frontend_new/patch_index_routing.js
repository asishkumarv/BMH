const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/index.tsx';
let c = fs.readFileSync(file, 'utf8');

const target = `          if (localStorage.getItem('employeeUser')) {
            router.replace('/employee/dashboard');
            return;
          }`;

const replacement = `          const empStr = localStorage.getItem('employeeUser');
          if (empStr) {
            const user = JSON.parse(empStr);
            if (user.department === 'Delivery') {
              router.replace('/delivery/dashboard');
            } else {
              router.replace('/employee/dashboard');
            }
            return;
          }`;

c = c.replace(target, replacement);

const target2 = `          const empUser = await AsyncStorage.getItem('employeeUser');
          if (empUser) {
            router.replace('/employee/dashboard');
            return;
          }`;

const replacement2 = `          const empUser = await AsyncStorage.getItem('employeeUser');
          if (empUser) {
            const user = JSON.parse(empUser);
            if (user.department === 'Delivery') {
              router.replace('/delivery/dashboard');
            } else {
              router.replace('/employee/dashboard');
            }
            return;
          }`;

c = c.replace(target2, replacement2);

fs.writeFileSync(file, c);
console.log('index.tsx routing patched');
