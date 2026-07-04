const fs = require('fs');

const path = 'app/admin/dashboard/tasks.tsx';
let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// 1. Add 'recurring' to activeTab state
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'all' | 'my' | 'employees'>('all');",
  "const [activeTab, setActiveTab] = useState<'all' | 'my' | 'employees' | 'recurring'>('all');\n  const [recurringTasks, setRecurringTasks] = useState<any[]>([]);\n  const [isRecurring, setIsRecurring] = useState(false);\n  const [frequency, setFrequency] = useState('daily');\n  const [specificDays, setSpecificDays] = useState('');"
);

// 2. Fetch Recurring Tasks
content = content.replace(
  "const [taskRes, usersRes] = await Promise.all([",
  "const [taskRes, usersRes, recurringRes] = await Promise.all([\n"
);
content = content.replace(
  "axios.get('https://napi.bharatmedicalhallplus.com/employees/all-users')",
  "axios.get('https://napi.bharatmedicalhallplus.com/employees/all-users'),\n        axios.get('https://napi.bharatmedicalhallplus.com/tasks/recurring?user_type=super_admin')"
);
content = content.replace(
  "if (taskRes.data.success) setTasks(taskRes.data.data);",
  "if (taskRes.data.success) setTasks(taskRes.data.data);\n      if (recurringRes.data.success) setRecurringTasks(recurringRes.data.data);"
);

// 3. Update handleCreateTask for recurring
content = content.replace(
  /await axios\.post\('https:\/\/napi\.bharatmedicalhallplus\.com\/tasks', \{([\s\S]*?)\}\);/m,
  `if (isRecurring) {
        let parsedDays = null;
        if (frequency === 'weekly' || frequency === 'monthly') {
          if (!specificDays) return Alert.alert('Error', 'Please specify days or dates.');
          parsedDays = specificDays.split(',').map(s => s.trim()).filter(s => s);
        }
        await axios.post('https://napi.bharatmedicalhallplus.com/tasks/recurring', {
          title, description, assigner_type: 'super_admin', assigner_id: superAdminUser.id || 1,
          assignee_type: finalAssigneeType, assignee_id: parseInt(finalAssigneeId), department: finalDept,
          priority, frequency, specific_days: parsedDays
        });
        fetchInitData();
      } else {
        await axios.post('https://napi.bharatmedicalhallplus.com/tasks', {$1});
      }`
);

// 4. Clear fields
content = content.replace(
  "setPriority('Moderate');",
  "setPriority('Moderate');\n      setIsRecurring(false);\n      setFrequency('daily');\n      setSpecificDays('');"
);

// 5. Add tab
content = content.replace(
  "{ id: 'employees', label: 'Employees' }",
  "{ id: 'employees', label: 'Employees' },\n            { id: 'recurring', label: 'Recurring Schedules' }"
);

// 6. Fix renderer logic
const recurringCard = `
  const renderRecurringTaskCard = (task: any) => (
    <View key={task.id} style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{task.title} (Recurring)</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[styles.statusBadge, { backgroundColor: task.status === 'active' ? '#dcfce7' : '#f3f4f6' }]}>
            <Text style={[styles.statusText, { color: task.status === 'active' ? '#16a34a' : '#6b7280' }]}>{task.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.taskDesc}>{task.description}</Text>
      
      <View style={styles.taskMeta}>
        <View style={styles.metaItem}>
          <User color={Colors.light.icon} size={16} />
          <Text style={styles.metaText}>Assignee: {task.assignee_name || 'Unknown'} - {task.department || 'N/A'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Clock color={Colors.light.icon} size={16} />
          <Text style={styles.metaText}>Schedule: {task.frequency.toUpperCase()} {task.specific_days ? '(' + JSON.parse(task.specific_days).join(', ') + ')' : ''}</Text>
        </View>
      </View>
      
      <View style={styles.taskActions}>
          <Pressable 
            style={[styles.actionBtn, { backgroundColor: task.status === 'active' ? '#f59e0b' : '#10b981' }]}
            onPress={async () => {
              try {
                const newStatus = task.status === 'active' ? 'paused' : 'active';
                await axios.put(\`https://napi.bharatmedicalhallplus.com/tasks/recurring/\${task.id}/status\`, { status: newStatus });
                fetchInitData();
                Alert.alert('Success', \`Schedule \${newStatus}\`);
              } catch(e) {
                Alert.alert('Error', 'Failed to update schedule');
              }
            }}
          >
            <Text style={styles.actionBtnText}>{task.status === 'active' ? 'Pause Schedule' : 'Resume Schedule'}</Text>
          </Pressable>
          <Pressable 
            style={[styles.actionBtn, { backgroundColor: '#ef4444', marginLeft: 8 }]}
            onPress={async () => {
              Alert.alert('Delete Schedule', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => {
                  try {
                    await axios.delete(\`https://napi.bharatmedicalhallplus.com/tasks/recurring/\${task.id}\`);
                    fetchInitData();
                  } catch(e) {
                    Alert.alert('Error', 'Failed to delete schedule');
                  }
                }}
              ])
            }}
          >
            <Text style={styles.actionBtnText}>Delete</Text>
          </Pressable>
      </View>
    </View>
  );
`;

content = content.replace(
  "const renderTaskCard = (task: any) => (",
  recurringCard + "\n  const renderTaskCard = (task: any) => ("
);

content = content.replace(
  "getTasksForTab().map(renderTaskCard)",
  "activeTab === 'recurring' ? recurringTasks.map(renderRecurringTaskCard) : getTasksForTab().map(renderTaskCard)"
);

content = content.replace(
  "getTasksForTab().length === 0",
  "(activeTab === 'recurring' ? recurringTasks.length : getTasksForTab().length) === 0"
);

// 7. UI changes
const recurringFields = `
            <Text style={styles.label}>Schedule Type</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <Pressable style={[styles.radioBtn, !isRecurring && styles.radioActive]} onPress={() => setIsRecurring(false)}>
                <Text style={{ color: !isRecurring ? '#FFF' : Colors.light.text }}>One-time Task</Text>
              </Pressable>
              <Pressable style={[styles.radioBtn, isRecurring && styles.radioActive]} onPress={() => setIsRecurring(true)}>
                <Text style={{ color: isRecurring ? '#FFF' : Colors.light.text }}>Recurring Task</Text>
              </Pressable>
            </View>

            {isRecurring && (
              <View style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
                <Text style={styles.label}>Frequency</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {['daily', 'weekly', 'monthly'].map(f => (
                    <Pressable key={f} style={[styles.radioBtn, frequency === f && styles.radioActive, { flex: 1, paddingVertical: 8 }]} onPress={() => { setFrequency(f); setSpecificDays(''); }}>
                      <Text style={{ textAlign: 'center', color: frequency === f ? '#FFF' : Colors.light.text }}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                    </Pressable>
                  ))}
                </View>

                {frequency === 'weekly' && (
                  <>
                    <Text style={styles.label}>Specific Days (e.g. 1 for Mon, 7 for Sun)</Text>
                    <TextInput style={styles.input} value={specificDays} onChangeText={setSpecificDays} placeholder="1, 3, 5 (Mon, Wed, Fri)" />
                  </>
                )}
                {frequency === 'monthly' && (
                  <>
                    <Text style={styles.label}>Specific Dates (e.g. 1, 15, 30) or Ranges (1-5)</Text>
                    <TextInput style={styles.input} value={specificDays} onChangeText={setSpecificDays} placeholder="1, 15, 28" />
                  </>
                )}
              </View>
            )}
`;

content = content.replace(
  "<Text style={styles.label}>Priority</Text>",
  recurringFields + "\n            <Text style={styles.label}>Priority</Text>"
);

// 10. Hide Due Date if recurring
content = content.replace(
  "<Text style={styles.label}>Due Date & Time</Text>",
  "{!isRecurring && (\n              <>\n                <Text style={styles.label}>Due Date & Time</Text>"
);
content = content.replace(
  "</View>\n              </View>\n            </ScrollView>",
  "</View>\n              </>\n            )}\n              </View>\n              </View>\n            </ScrollView>"
);

fs.writeFileSync(path, content);
console.log('Modified app/admin/dashboard/tasks.tsx');
