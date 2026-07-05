const fs = require('fs');
const filePath = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/bookingController.js';

let content = fs.readFileSync(filePath, 'utf8');

// The issue is query += ` AND date = ${params.length}`; instead of query += ` AND date = $${params.length}`;
// We need to add $ before ${params.length} in getBookings
// Let's do a global replace for all occurrences in getBookings where we have `= ${params.length}` 
// and replace with `= $${params.length}`.
// Also handle `ILIKE ${params.length}` and `ILIKE '%' || ${params.length} || '%'`

content = content.replace(/= \$\{params\.length\}/g, '= $$${params.length}');
content = content.replace(/ILIKE \$\{params\.length\}/g, 'ILIKE $$${params.length}');
content = content.replace(/ILIKE '%' \|\| \$\{params\.length\}/g, 'ILIKE \'%\' || $$${params.length}');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed missing $ before ${params.length} in bookingController.js');
