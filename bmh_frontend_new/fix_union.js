const fs = require('fs');
const filePath = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/controllers/bookingController.js';

let content = fs.readFileSync(filePath, 'utf8');

// We will find the SELECT * FROM ( ... UNION ALL ... ) block and replace it.
const regex = /SELECT \* FROM \([\s\S]*?\) as combined_bookings/m;

const newQuery = `SELECT * FROM (
        SELECT pb.id as booking_id, pb.token_number, pb.status, pb.payment_mode, pb.reason_for_visit, pb.pr, pb.reference,
               pb.modified_date, pb.modified_by_name, pb.modified_by_role, pb.modified_by_dept, pb.created_at, pb.slot_id,
               p.id as patient_id, p.name as patient_name, p.mobile, p.blood_group, p.city, p.pin_code, p.guardian_name, p.age, p.gender, pb.print_count,
               ds.date, ds.start_time, ds.end_time, ds.fee,
               d.id as doctor_id, d.full_name as doctor_name, d.department,
               e.full_name as booked_by_name, pb.booked_by as booked_by_id
        FROM patient_bookings pb
        LEFT JOIN patients p ON pb.patient_id = p.id
        JOIN doctor_slots ds ON pb.slot_id = ds.id
        JOIN doctors d ON ds.doctor_id = d.id
        LEFT JOIN employees e ON pb.booked_by::varchar = e.id::varchar

        UNION ALL

        SELECT cpb.original_booking_id as booking_id, cpb.token_number, 'Cancelled'::varchar as status, cpb.payment_mode, cpb.reason_for_visit, cpb.pr, cpb.reference,
               NULL::timestamp as modified_date, NULL::varchar as modified_by_name, NULL::varchar as modified_by_role, NULL::varchar as modified_by_dept, cpb.cancelled_at as created_at, cpb.slot_id,
               p.id as patient_id, p.name as patient_name, p.mobile, p.blood_group, p.city, p.pin_code, p.guardian_name, p.age, p.gender, 0 as print_count,
               ds.date, ds.start_time, ds.end_time, ds.fee,
               d.id as doctor_id, d.full_name as doctor_name, d.department,
               e.full_name as booked_by_name, cpb.booked_by as booked_by_id
        FROM cancelled_patient_bookings cpb
        LEFT JOIN patients p ON cpb.patient_id = p.id
        JOIN doctor_slots ds ON cpb.slot_id = ds.id
        JOIN doctors d ON ds.doctor_id = d.id
        LEFT JOIN employees e ON cpb.booked_by::varchar = e.id::varchar
      ) as combined_bookings`;

content = content.replace(regex, newQuery);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed UNION ALL type mismatch in bookingController.js');
