import re
import os

def update_frontend_employees(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update handleApproveEmployee to handleUpdateStatus
    old_handle = """  const handleApproveEmployee = async (employeeId: string) => {
    try {
      const response = await axios.put(`https://napi.bharatmedicalhallplus.com/employees/${employeeId}/status`, {
        status: 'approved'
      });
      if (response.data.success) {
        setEmployees(employees.map(e => e.id === employeeId ? { ...e, status: 'approved' } : e));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to approve employee');
      console.error(error);
    }
  };"""

    new_handle = """  const handleUpdateStatus = async (employeeId: string, newStatus: string) => {
    try {
      const response = await axios.put(`https://napi.bharatmedicalhallplus.com/employees/${employeeId}/status`, {
        status: newStatus
      });
      if (response.data.success) {
        setEmployees(employees.map(e => e.id === employeeId ? { ...e, status: newStatus } : e));
      }
    } catch (error) {
      Alert.alert('Error', `Failed to update status to ${newStatus}`);
      console.error(error);
    }
  };"""

    if old_handle in content:
        content = content.replace(old_handle, new_handle)
    elif "handleUpdateStatus" not in content:
        print(f"Could not find handleApproveEmployee in {filepath}")
        return

    # 2. Update renderItem for mobile view (isDesktop === false)
    # Finding the mobile status section
    mobile_status_old = """            <View style={[styles.statusBadge, item.status === 'approved' ? styles.statusApproved : styles.statusPending]}>
              <Text style={[styles.statusText, item.status === 'approved' ? styles.textApproved : styles.textPending]}>
                {item.status}
              </Text>
            </View>"""
    
    mobile_status_new = """            <View style={{ flexDirection: 'column', gap: 4 }}>
              <View style={[styles.statusBadge, item.status === 'approved' ? styles.statusApproved : item.status === 'pending' ? styles.statusPending : {backgroundColor: '#fee2e2'}]}>
                <Text style={[styles.statusText, item.status === 'approved' ? styles.textApproved : item.status === 'pending' ? styles.textPending : {color: '#dc2626'}]}>
                  {item.status}
                </Text>
              </View>
              {item.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Pressable style={[styles.statusBadge, { backgroundColor: Colors.light.primary, paddingHorizontal: 6, paddingVertical: 2 }]} onPress={() => handleUpdateStatus(item.id, 'approved')}>
                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>Approve</Text>
                  </Pressable>
                  <Pressable style={[styles.statusBadge, { backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2 }]} onPress={() => handleUpdateStatus(item.id, 'rejected')}>
                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>Reject</Text>
                  </Pressable>
                </View>
              )}
              {item.status === 'approved' && (
                <Pressable style={[styles.statusBadge, { backgroundColor: '#f97316', paddingHorizontal: 6, paddingVertical: 2 }]} onPress={() => handleUpdateStatus(item.id, 'deactivated')}>
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>Deactivate</Text>
                </Pressable>
              )}
              {(item.status === 'deactivated' || item.status === 'rejected') && (
                <Pressable style={[styles.statusBadge, { backgroundColor: Colors.light.primary, paddingHorizontal: 6, paddingVertical: 2 }]} onPress={() => handleUpdateStatus(item.id, 'approved')}>
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>Approve</Text>
                </Pressable>
              )}
            </View>"""

    if mobile_status_old in content:
        # We need to make sure we only replace the mobile one, which is before isDesktop check
        # But wait, mobile_status_old is exactly what's inside the mobile view block and desktop view block
        pass

    # Actually, it's safer to do regex for the desktop part and mobile part.
    # Let's replace the desktop buttons section first:
    desktop_buttons_old = """        <View style={{ flex: 1, justifyContent: 'center' }}>
          {item.status === 'pending' ? (
            <Pressable 
              style={[styles.statusBadge, { backgroundColor: Colors.light.primary }]}
              onPress={() => handleApproveEmployee(item.id)}
            >
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Approve</Text>
            </Pressable>
          ) : (
            <View style={[styles.statusBadge, item.status === 'approved' ? styles.statusApproved : styles.statusPending]}>
              <Text style={[styles.statusText, item.status === 'approved' ? styles.textApproved : styles.textPending]}>
                {item.status}
              </Text>
            </View>
          )}
        </View>"""
        
    desktop_buttons_new = """        <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <View style={[styles.statusBadge, item.status === 'approved' ? styles.statusApproved : item.status === 'pending' ? styles.statusPending : {backgroundColor: '#fee2e2'}]}>
            <Text style={[styles.statusText, item.status === 'approved' ? styles.textApproved : item.status === 'pending' ? styles.textPending : {color: '#dc2626'}]}>{item.status}</Text>
          </View>
          {item.status === 'pending' && (
            <>
              <Pressable style={[styles.statusBadge, { backgroundColor: Colors.light.primary }]} onPress={() => handleUpdateStatus(item.id, 'approved')}>
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Approve</Text>
              </Pressable>
              <Pressable style={[styles.statusBadge, { backgroundColor: '#ef4444' }]} onPress={() => handleUpdateStatus(item.id, 'rejected')}>
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Reject</Text>
              </Pressable>
            </>
          )}
          {item.status === 'approved' && (
            <Pressable style={[styles.statusBadge, { backgroundColor: '#f97316' }]} onPress={() => handleUpdateStatus(item.id, 'deactivated')}>
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Deactivate</Text>
            </Pressable>
          )}
          {(item.status === 'deactivated' || item.status === 'rejected') && (
            <Pressable style={[styles.statusBadge, { backgroundColor: Colors.light.primary }]} onPress={() => handleUpdateStatus(item.id, 'approved')}>
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Approve</Text>
            </Pressable>
          )}
        </View>"""

    if desktop_buttons_old in content:
        content = content.replace(desktop_buttons_old, desktop_buttons_new)
        # Also need to fix the width of the desktop header column
        content = content.replace("<Text style={[styles.cell, { flex: 1, fontWeight: '700', color: Colors.light.icon }]}>Status</Text>", "<Text style={[styles.cell, { flex: 1.5, fontWeight: '700', color: Colors.light.icon }]}>Status</Text>")
    
    # Now mobile part:
    mobile_buttons_old = """          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.statusBadge, item.status === 'approved' ? styles.statusApproved : styles.statusPending]}>
              <Text style={[styles.statusText, item.status === 'approved' ? styles.textApproved : styles.textPending]}>
                {item.status}
              </Text>
            </View>"""

    mobile_buttons_new = """          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
""" + mobile_status_new

    if mobile_buttons_old in content:
        content = content.replace(mobile_buttons_old, mobile_buttons_new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

update_frontend_employees(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\employees.tsx')
update_frontend_employees(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\employees.tsx')
