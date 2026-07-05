const fs = require('fs');
const filePath = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/bookingController.js';

let content = fs.readFileSync(filePath, 'utf8');

// Replace booked_by
content = content.replace(/pb\.booked_by as booked_by_id/g, 'pb.booked_by::varchar as booked_by_id');
content = content.replace(/cpb\.booked_by as booked_by_id/g, 'cpb.booked_by::varchar as booked_by_id');
content = content.replace(/0 as print_count/g, '0::integer as print_count');
content = content.replace(/NULL::timestamp as modified_date/g, 'NULL::timestamp as modified_date');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed booked_by type mismatch');
