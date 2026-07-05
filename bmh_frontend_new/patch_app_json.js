const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

if (!data.expo.plugins) {
  data.expo.plugins = [];
}
let hasNotifications = data.expo.plugins.find(p => typeof p === 'string' && p === 'expo-notifications' || Array.isArray(p) && p[0] === 'expo-notifications');

if (!hasNotifications) {
  data.expo.plugins.push([
    "expo-notifications",
    {
      "icon": "./assets/Logo.png",
      "color": "#ffffff"
    }
  ]);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log('app.json patched for expo-notifications plugin');
} else {
  console.log('app.json already has expo-notifications plugin');
}
