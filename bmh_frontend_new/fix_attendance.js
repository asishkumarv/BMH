const fs = require('fs');
let code = fs.readFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/admin/dashboard/attendance.tsx', 'utf8');
const lines = code.split('\n');

// Find the line with </TouchableOpacity> and then </View> around line 307
let inserted = false;
for (let i = 270; i < 320; i++) {
  if (lines[i] && lines[i].includes('Location Config</Text>}')) {
    // skip the next </TouchableOpacity> and </View>
    lines.splice(i + 3, 0, '      </View>');
    inserted = true;
    break;
  }
}

if (inserted) {
  fs.writeFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/admin/dashboard/attendance.tsx', lines.join('\n'));
  console.log('Fixed');
} else {
  console.log('Not found');
}
