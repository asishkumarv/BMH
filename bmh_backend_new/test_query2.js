const { pool } = require('./config/db');

async function run() {
  try {
    const result = await pool.query(`
        SELECT ch.*, 
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
        FROM cash_handovers ch
        LEFT JOIN employees f ON ch.from_employee_id = f.id::text
        LEFT JOIN department_admins d_f ON ch.from_employee_id = 'SA-' || d_f.id::text
        LEFT JOIN super_admins s_f ON ch.from_employee_id = 'ADMIN-' || s_f.id::text
        LEFT JOIN doctors doc_f ON ch.from_employee_id = 'DOC-' || doc_f.id::text
        LEFT JOIN employees t ON ch.to_employee_id = t.id::text
        LEFT JOIN department_admins d_t ON ch.to_employee_id = 'SA-' || d_t.id::text
        LEFT JOIN super_admins s_t ON ch.to_employee_id = 'ADMIN-' || s_t.id::text
        LEFT JOIN doctors doc_t ON ch.to_employee_id = 'DOC-' || doc_t.id::text
        ORDER BY ch.created_at DESC
        LIMIT 2
    `);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    pool.end();
  }
}
run();
