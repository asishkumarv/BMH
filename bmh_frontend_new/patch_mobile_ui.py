import os
import re

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\doctors\index.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Wrap the Slots table with ScrollView
old_slots_table_start = '''              {activeTab === 'Slots' && (
                <View style={styles.card}>
                  <View style={styles.tableRowHeader}>'''

new_slots_table_start = '''              {activeTab === 'Slots' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.card}>
                  <View style={{ minWidth: 900 }}>
                  <View style={styles.tableRowHeader}>'''

content = content.replace(old_slots_table_start, new_slots_table_start)

# Close the ScrollView for Slots table
old_slots_table_end = '''                  ))}
                  {slots.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No slots found.</Text>}
                </View>
              )}'''

new_slots_table_end = '''                  ))}
                  {slots.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No slots found.</Text>}
                  </View>
                </ScrollView>
              )}'''

content = content.replace(old_slots_table_end, new_slots_table_end)

# 2. Fix the Action buttons inside the Slots table
old_actions = '''                      <Text style={styles.tableCell}>
                        <TouchableOpacity style={{backgroundColor: '#3b82f6', padding: 6, borderRadius: 6, alignItems: 'center'}} onPress={() => handleManageTokens(s)}>
                          <Text style={{color: 'white', fontSize: 12}}>Tokens</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{backgroundColor: '#10b981', padding: 6, borderRadius: 6, alignItems: 'center', marginTop: 4}} onPress={() => { setReassignSlot(s); setReassignPeonId(s.assigned_peon_id || ''); }}>
                          <Text style={{color: 'white', fontSize: 12}}>Reassign</Text>
                        </TouchableOpacity>
                      </Text>'''

new_actions = '''                      <View style={[styles.tableCell, { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }]}>
                        <TouchableOpacity style={{backgroundColor: '#3b82f6', padding: 6, borderRadius: 6, alignItems: 'center'}} onPress={() => handleManageTokens(s)}>
                          <Text style={{color: 'white', fontSize: 12}}>Tokens</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{backgroundColor: '#10b981', padding: 6, borderRadius: 6, alignItems: 'center'}} onPress={() => { setReassignSlot(s); setReassignPeonId(s.assigned_peon_id || ''); }}>
                          <Text style={{color: 'white', fontSize: 12}}>Reassign</Text>
                        </TouchableOpacity>
                      </View>'''

content = content.replace(old_actions, new_actions)

# 3. Fix form spacing by making formCol have a default marginBottom and formRow to wrap if needed
# We'll replace `formCol: { flex: 1 },` with `formCol: { flex: 1, minWidth: '45%', marginBottom: 16 },`
# and `formRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },` with `formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 0 },`

content = content.replace("formCol: { flex: 1 },", "formCol: { flex: 1, minWidth: 200, marginBottom: 15 },")
content = content.replace("formRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },", "formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 5 },")

# Also fix the input height if it's squished
content = content.replace("input: { \n    backgroundColor: '#f8fafc', \n    borderWidth: 1, \n    borderColor: '#e2e8f0', \n    borderRadius: 8, \n    paddingHorizontal: 14, \n    fontSize: 14, \n    color: '#1e293b',\n    height: 50,\n  },", 
                          "input: { \n    backgroundColor: '#f8fafc', \n    borderWidth: 1, \n    borderColor: '#e2e8f0', \n    borderRadius: 8, \n    paddingHorizontal: 14, \n    fontSize: 14, \n    color: '#1e293b',\n    minHeight: 50,\n    justifyContent: 'center',\n  },")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated index.tsx successfully')
