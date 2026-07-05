const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/delivery/dashboard/index.tsx';
let c = fs.readFileSync(file, 'utf8');

const correctBlock = `      <View style={{flexDirection:'row', gap: 10, paddingHorizontal: 15, marginBottom: 15}}>
        {alarmSound && (
          <TouchableOpacity style={[styles.refreshBtn, {backgroundColor: '#ef4444'}]} onPress={stopAlarm}>
            <Text style={[styles.refreshBtnText, {color: '#fff'}]}>Stop Alarm</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.refreshBtn} onPress={() => user && fetchOrders(user.id)}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
      ) : orders.length === 0 ? (
        <View style={styles.noDataContainer}>
          <Package size={48} color="#CBD5E1" />
          <Text style={styles.noData}>No orders assigned to you yet.</Text>
          <Text style={styles.noDataSub}>We will notify you when a new order arrives.</Text>
        </View>
      ) : (
        <FlatList
          data={orders.filter(o => { if (filterState === 'Completed') return o.status === 'Delivered'; if (filterState === 'Pending') return o.status !== 'Delivered'; return true; })}
          keyExtractor={item => \`\$\{item.type\}-\$\{item.id\}\`}
          renderItem={renderOrder}
`;

// we need to slice the string and insert it properly.
// Let's just restore the file completely from a known good state or rewrite the block.
// Since the file is broken, let's just use string replace very carefully.

c = c.replace(/<Text style={{ fontSize: 12, color: filterState === 'Completed' \? '#fff' : '#047857' }}>Completed<\/Text>\s*<\/TouchableOpacity>\s*<\/View>[\s\S]*?contentContainerStyle={styles\.listContainer}/,
  `<Text style={{ fontSize: 12, color: filterState === 'Completed' ? '#fff' : '#047857' }}>Completed</Text>
        </TouchableOpacity>
      </View>

` + correctBlock + `
          contentContainerStyle={styles.listContainer}`
);

fs.writeFileSync(file, c);
console.log('Restored FlatList and syntax properly');
