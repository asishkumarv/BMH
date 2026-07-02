import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Import KeyboardAvoidingView
    if 'KeyboardAvoidingView' not in content:
        content = content.replace("Platform } from 'react-native';", "Platform, KeyboardAvoidingView } from 'react-native';")

    # 2. Fix the styles for formRow and formCol (revert flexWrap and minWidth)
    content = content.replace("formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 5 },", "formRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },")
    content = content.replace("formCol: { flex: 1, minWidth: 200, marginBottom: 15 },", "formCol: { flex: 1 },")
    
    # 3. Add contentContainerStyle={{ padding: 24 }} to the form ScrollViews and wrap in KeyboardAvoidingView
    
    # For Create Doctor Form
    old_add_form = '''      {showAddForm ? (
        <ScrollView style={styles.card}>'''
    
    new_add_form = '''      {showAddForm ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.card} contentContainerStyle={{ padding: 24 }}>'''
    
    if old_add_form in content:
        content = content.replace(old_add_form, new_add_form)
        
        # Replace the closing of the form ScrollView
        old_add_form_close = '''          </TouchableOpacity>
        </ScrollView>
      ) : showAddSlotForm ? ('''
      
        new_add_form_close = '''          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      ) : showAddSlotForm ? ('''
      
        content = content.replace(old_add_form_close, new_add_form_close)

    # For Create Slot Form
    old_slot_form = '''      ) : showAddSlotForm ? (
        <ScrollView style={styles.card}>'''
        
    new_slot_form = '''      ) : showAddSlotForm ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.card} contentContainerStyle={{ padding: 24 }}>'''
        
    if old_slot_form in content:
        content = content.replace(old_slot_form, new_slot_form)
        
        # Replace the closing of the slot form ScrollView
        old_slot_form_close = '''          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          <View style={styles.tabContainer}>'''
          
        new_slot_form_close = '''          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <>
          <View style={styles.tabContainer}>'''
          
        content = content.replace(old_slot_form_close, new_slot_form_close)

    # 4. Make sure isMobile && { flexDirection: 'column' } also adds gap: 16 if gap isn't working, but let's just make it simpler.
    # Actually, if we just removed flexWrap: 'wrap', then on desktop it will be flex: 1 (taking 50% width each), and on mobile it will be flex-direction: column (stacking).
    # Since we have `isMobile && { marginBottom: 16 }` on the `formCol`s, it will space them vertically!
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f'Updated {filepath} successfully')

fix_file(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\admin\dashboard\doctors\index.tsx')
fix_file(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\doctors\index.tsx')
