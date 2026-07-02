import os
import re

filepath = r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_backend_new\controllers\walletController.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# For getHandovers
old_get_query = '''        SELECT ch.*, 
               COALESCE(f.full_name, d_f.full_name, s_f.full_name, doc_f.full_name, 'Unknown') as from_name, 
               COALESCE(t.full_name, d_t.full_name, s_t.full_name, doc_t.full_name, 'Unknown') as to_name
        FROM cash_handovers ch'''

new_get_query = '''        SELECT ch.*, 
               COALESCE(f.full_name, d_f.full_name, s_f.full_name, doc_f.full_name, 'Unknown') as from_name,
               CASE 
                 WHEN f.id IS NOT NULL THEN f.role
                 WHEN d_f.id IS NOT NULL THEN 'Sub Admin'
                 WHEN s_f.id IS NOT NULL THEN 'Super Admin'
                 WHEN doc_f.id IS NOT NULL THEN 'Doctor'
                 ELSE 'Unknown'
               END as from_role,
               CASE 
                 WHEN f.id IS NOT NULL THEN f.department
                 WHEN d_f.id IS NOT NULL THEN (SELECT name FROM departments WHERE id = d_f.department_id)
                 WHEN s_f.id IS NOT NULL THEN 'Admin'
                 WHEN doc_f.id IS NOT NULL THEN doc_f.department
                 ELSE 'Unknown'
               END as from_department,
               
               COALESCE(t.full_name, d_t.full_name, s_t.full_name, doc_t.full_name, 'Unknown') as to_name,
               CASE 
                 WHEN t.id IS NOT NULL THEN t.role
                 WHEN d_t.id IS NOT NULL THEN 'Sub Admin'
                 WHEN s_t.id IS NOT NULL THEN 'Super Admin'
                 WHEN doc_t.id IS NOT NULL THEN 'Doctor'
                 ELSE 'Unknown'
               END as to_role,
               CASE 
                 WHEN t.id IS NOT NULL THEN t.department
                 WHEN d_t.id IS NOT NULL THEN (SELECT name FROM departments WHERE id = d_t.department_id)
                 WHEN s_t.id IS NOT NULL THEN 'Admin'
                 WHEN doc_t.id IS NOT NULL THEN doc_t.department
                 ELSE 'Unknown'
               END as to_department
        FROM cash_handovers ch'''

content = content.replace(old_get_query, new_get_query)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated walletController.js successfully')
