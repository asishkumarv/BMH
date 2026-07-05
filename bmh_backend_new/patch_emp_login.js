const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/employeeController.js';
let c = fs.readFileSync(file, 'utf8');

const target = `      let { email, password } = req.body;`;
const replacement = `      let { email, password, pushToken } = req.body;`;
c = c.replace(target, replacement);

const target2 = `      res.json({ success: true, data: user });`;
const replacement2 = `      if (pushToken && pushToken !== user.push_token) {
        await pool.query('UPDATE employees SET push_token = $1 WHERE id = $2', [pushToken, user.id]);
        user.push_token = pushToken;
      }
      res.json({ success: true, data: user });`;
c = c.replace(target2, replacement2);

fs.writeFileSync(file, c);
console.log('employeeController login updated for push token');
