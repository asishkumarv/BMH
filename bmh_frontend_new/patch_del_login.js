const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/delivery/login.tsx';
let c = fs.readFileSync(file, 'utf8');

const importTarget = `import { Colors } from '../../constants/Colors';`;
const importReplacement = `import { Colors } from '../../constants/Colors';
import { registerForPushNotificationsAsync } from '../../utils/pushNotifications';`;
c = c.replace(importTarget, importReplacement);

const reqTarget = `const response = await axios.post('https://napi.bharatmedicalhallplus.com/employee/login', {`;
const reqReplacement = `const pushToken = await registerForPushNotificationsAsync();
      const response = await axios.post('https://napi.bharatmedicalhallplus.com/employee/login', {
        pushToken,`;
c = c.replace(reqTarget, reqReplacement);

fs.writeFileSync(file, c);
console.log('delivery login patched for push token');
