const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/delivery/dashboard/index.tsx';
let c = fs.readFileSync(file, 'utf8');

// Add Coffee import
if (!c.includes('Coffee')) {
  c = c.replace('Sun, Moon } from \'lucide-react-native\'', 'Sun, Moon, Coffee } from \'lucide-react-native\'');
}

const attendanceWidgetTarget = `          {/* Creative Attendance Widget */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {!summary || summary.can_check_in ? (
              <TouchableOpacity style={{ backgroundColor: '#10b981', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => handleAction('login')}>
                <Sun size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Check In</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={{ backgroundColor: '#f43f5e', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => handleAction('logout')} disabled={!summary.can_check_out}>
                <Moon size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{summary.can_check_out ? 'Check Out' : 'Off Duty'}</Text>
              </TouchableOpacity>
            )}
          </View>`;

const attendanceWidgetReplacement = `          {/* Creative Attendance Widget */}
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {(!summary || summary.can_check_in) && (
              <TouchableOpacity style={{ backgroundColor: '#10b981', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => handleAction('login')}>
                <Sun size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Check In</Text>
              </TouchableOpacity>
            )}
            
            {summary && summary.can_break_in && !summary.can_check_in && (
              <TouchableOpacity style={{ backgroundColor: '#f59e0b', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => handleAction('break_in')}>
                <Coffee size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Break In</Text>
              </TouchableOpacity>
            )}

            {summary && summary.can_break_out && !summary.can_check_in && (
              <TouchableOpacity style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => handleAction('break_out')}>
                <Coffee size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Break Out</Text>
              </TouchableOpacity>
            )}

            {summary && summary.can_check_out && !summary.can_check_in && (
              <TouchableOpacity style={{ backgroundColor: '#f43f5e', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => handleAction('logout')}>
                <Moon size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Check Out</Text>
              </TouchableOpacity>
            )}
            
            {summary && !summary.can_check_in && !summary.can_check_out && (
              <View style={{ backgroundColor: '#94a3b8', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Moon size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Off Duty</Text>
              </View>
            )}
          </View>`;

c = c.replace(attendanceWidgetTarget, attendanceWidgetReplacement);
fs.writeFileSync(file, c);
console.log('Patched attendance widget');
