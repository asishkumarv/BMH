import re

def fix_employee_tables(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix ScrollView and View wrapper for the table to ensure it takes 100% width on desktop
    old_scroll_view = """<ScrollView horizontal={true} style={{ width: '100%' }} showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 800 }}>"""
    new_scroll_view = """<ScrollView horizontal={true} style={{ width: '100%' }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={{ minWidth: 900, flex: 1 }}>"""
    content = content.replace(old_scroll_view, new_scroll_view)

    # 2. Fix the Desktop Header Column Widths
    # Name: flex 2
    # Email: flex 2.5
    # Department: flex 1.5
    # Role: flex 1
    # Status: width 200 (fixed to allow buttons to sit nicely)
    old_header = """<Text style={[styles.cell, { flex: 2, fontWeight: '700', color: Colors.light.icon }]}>Name</Text>
        {isDesktop && <Text style={[styles.cell, { flex: 2, fontWeight: '700', color: Colors.light.icon }]}>Email</Text>}
        <Text style={[styles.cell, { flex: 1.5, fontWeight: '700', color: Colors.light.icon }]}>Department</Text>
        <Text style={[styles.cell, { flex: 1, fontWeight: '700', color: Colors.light.icon }]}>Role</Text>
        <Text style={[styles.cell, { flex: 1.5, fontWeight: '700', color: Colors.light.icon }]}>Status</Text>"""
        
    new_header = """<Text style={[styles.cell, { flex: 2, fontWeight: '700', color: Colors.light.icon }]}>Name</Text>
        {isDesktop && <Text style={[styles.cell, { flex: 2.5, fontWeight: '700', color: Colors.light.icon }]}>Email</Text>}
        <Text style={[styles.cell, { flex: 1.5, fontWeight: '700', color: Colors.light.icon }]}>Department</Text>
        <Text style={[styles.cell, { flex: 1, fontWeight: '700', color: Colors.light.icon }]}>Role</Text>
        <Text style={[styles.cell, { width: 180, fontWeight: '700', color: Colors.light.icon }]}>Status</Text>"""
    content = content.replace(old_header, new_header)

    # 3. Fix the Desktop Row Column Widths
    old_row = """<Text style={[styles.cell, { flex: 2, fontWeight: '600' }]}>{item.full_name}</Text>
        {isDesktop && <Text style={[styles.cell, { flex: 2, color: Colors.light.icon }]}>{item.email}</Text>}
        <Text style={[styles.cell, { flex: 1.5 }]}>{item.department}</Text>
        <Text style={[styles.cell, { flex: 1 }]}>{item.role}</Text>
        <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>"""
        
    new_row = """<Text style={[styles.cell, { flex: 2, fontWeight: '600' }]}>{item.full_name}</Text>
        {isDesktop && <Text style={[styles.cell, { flex: 2.5, color: Colors.light.icon }]}>{item.email}</Text>}
        <Text style={[styles.cell, { flex: 1.5 }]}>{item.department}</Text>
        <Text style={[styles.cell, { flex: 1 }]}>{item.role}</Text>
        <View style={{ width: 180, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>"""
    content = content.replace(old_row, new_row)
    
    # In department dashboard, `!isDesktop` doesn't have the `selectedUserType` buttons so we don't need to change `adminRow` styles. Wait, does department dashboard have Mobile view for employees?
    # Let's verify if `adminRow` exists in department dashboard.
    # We can replace the Mobile View code safely using regex for both.
    
    # 4. Mobile View Styling
    # Let's improve the adminRow formatting.
    # Replace the Mobile View column rendering
    old_mobile_view = """<View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'column', gap: 4 }}>
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

    new_mobile_view = """<View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <View style={[styles.statusBadge, item.status === 'approved' ? styles.statusApproved : item.status === 'pending' ? styles.statusPending : {backgroundColor: '#fee2e2'}]}>
                <Text style={[styles.statusText, item.status === 'approved' ? styles.textApproved : item.status === 'pending' ? styles.textPending : {color: '#dc2626'}]}>
                  {item.status}
                </Text>
              </View>
              {item.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable style={[styles.statusBadge, { backgroundColor: Colors.light.primary, paddingHorizontal: 10, paddingVertical: 4 }]} onPress={() => handleUpdateStatus(item.id, 'approved')}>
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Approve</Text>
                  </Pressable>
                  <Pressable style={[styles.statusBadge, { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 4 }]} onPress={() => handleUpdateStatus(item.id, 'rejected')}>
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Reject</Text>
                  </Pressable>
                </View>
              )}
              {item.status === 'approved' && (
                <Pressable style={[styles.statusBadge, { backgroundColor: '#f97316', paddingHorizontal: 10, paddingVertical: 4 }]} onPress={() => handleUpdateStatus(item.id, 'deactivated')}>
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Deactivate</Text>
                </Pressable>
              )}
              {(item.status === 'deactivated' || item.status === 'rejected') && (
                <Pressable style={[styles.statusBadge, { backgroundColor: Colors.light.primary, paddingHorizontal: 10, paddingVertical: 4 }]} onPress={() => handleUpdateStatus(item.id, 'approved')}>
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Approve</Text>
                </Pressable>
              )}
            </View>"""
    
    if old_mobile_view in content:
        content = content.replace(old_mobile_view, new_mobile_view)
    
    # 5. Fix Mobile Card styling: styles.adminRow if present
    # Currently adminRow might be: padding: 12, borderBottomWidth: 1...
    # We don't need to change `adminRow` styles if it's already decent, but adding `alignItems: 'flex-start'` would be better so that tall columns don't stretch the avatar center.
    content = content.replace("adminRow: {\n      flexDirection: 'row',\n      alignItems: 'center',", "adminRow: {\n      flexDirection: 'row',\n      alignItems: 'flex-start',")
    content = content.replace("adminRow: {\r\n      flexDirection: 'row',\r\n      alignItems: 'center',", "adminRow: {\r\n      flexDirection: 'row',\r\n      alignItems: 'flex-start',")

    # In department dashboard, they might have named it something else or the same
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

fix_employee_tables(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\employees.tsx')
fix_employee_tables(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\employees.tsx')
