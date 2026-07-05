const fs = require('fs');

const filePath = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/department/dashboard/doctors/index.tsx';

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Update search placeholder
  content = content.replace(/placeholder="Search patient"/g, 'placeholder="Search patient or ID"');

  // 2. Add ID header
  content = content.replace(
    /<Text style=\{\[styles\.tableCellHeader, \{flex: 0\.5\}\]\}>Token<\/Text>/g,
    '<Text style={[styles.tableCellHeader, {flex: 0.5}]}>Token</Text>\n                  <Text style={[styles.tableCellHeader, {flex: 0.5}]}>ID</Text>'
  );

  // 3. Add ID cell in table body
  content = content.replace(
    /<Text style=\{\[styles\.tableCell, \{flex: 0\.5, fontWeight: 'bold'\}\]\}>#\{b\.token_number\}<\/Text>/g,
    '<Text style={[styles.tableCell, {flex: 0.5, fontWeight: \'bold\'}]}>#{b.token_number}</Text>\n                  <Text style={[styles.tableCell, {flex: 0.5}]}>#{b.booking_id || b.id || b.original_booking_id}</Text>'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated:', filePath);
} else {
  console.log('File not found:', filePath);
}
