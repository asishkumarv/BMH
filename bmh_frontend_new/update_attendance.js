const fs = require('fs');
const glob = require('glob');
const files = glob.sync('app/**/attendance.tsx');
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/r\.worked_mins \? formatMins\(r\.worked_mins\) : '-'/g, 
    "r.worked_mins != null ? formatMins(r.worked_mins) : (r.check_in && r.check_out ? formatMins(Math.floor((new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 60000)) : '-')");
  fs.writeFileSync(f, c);
});
