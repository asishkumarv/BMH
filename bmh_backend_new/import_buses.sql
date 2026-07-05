
CREATE TABLE IF NOT EXISTS buses (
  id SERIAL PRIMARY KEY,
  bus_id VARCHAR(50),
  bus_name VARCHAR(255),
  operator_name VARCHAR(255),
  bus_number VARCHAR(100),
  route_code VARCHAR(100),
  source VARCHAR(255),
  destination VARCHAR(255),
  selected_stop_via VARCHAR(255),
  stop_arrival_time VARCHAR(50),
  departure_time VARCHAR(50),
  arrival_time VARCHAR(50),
  reporting_time VARCHAR(50),
  travel_duration VARCHAR(100),
  frequency VARCHAR(100),
  days_of_operation VARCHAR(100),
  parcel_accepted VARCHAR(50),
  parcel_contact_person VARCHAR(255),
  mobile_no VARCHAR(50),
  booking_counter VARCHAR(255),
  gps_available VARCHAR(50),
  average_transit_time VARCHAR(100),
  status VARCHAR(50),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
TRUNCATE TABLE buses RESTART IDENTITY CASCADE;

INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        'BUS0001', 'Biswakarma', NULL, 
        'OD-11G-6920', 'R001', 'Baleswar golei', 
        'Badasahi', NULL, 
        NULL, '18:00', 
        NULL, '07:00',
        '6 Hr 45 Min', 'Daily', 'Daily', 
        'Yes', 'Mr. Rakesh', 
        '9876543210', 'Baripada Bus Stand', 'No', 
        '7 Hours', 'Active', 'Doesn''t accept parcels after departure'
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Sahu', NULL, 
        'OR-11H-5195', 'R006', 'Baleswar golei', 
        'Udla', 'Udala', 
        '21:00', '19:30', 
        NULL, NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Basudev', NULL, 
        'OD-11C-9998', NULL, 'Old bus stand', 
        'Bombaychaka', NULL, 
        NULL, '12:30', 
        NULL, NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Jhuna', NULL, 
        'OD-11N-7415', NULL, 'Old Bus stand', 
        'Rairangpur', NULL, 
        NULL, '13:00', 
        NULL, NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Shree Ganesh', NULL, 
        'OR-02B-H1151', NULL, 'Old Bus Stand', 
        'Tiring', 'Bisoi', 
        NULL, '14:25', 
        NULL, NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Chaudhary', NULL, 
        'OD-11B-6622', NULL, 'Baleswor golei', 
        'Udla', NULL, 
        NULL, '15:00', 
        NULL, NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Madhusudan ', NULL, 
        'OD-11B-7725', NULL, 'Baleswar golei', 
        'Gain amarda ', NULL, 
        NULL, '14:50', 
        NULL, NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Shree Ganesh', NULL, 
        'OR-11E-3388', NULL, 'Old Bus Stand', 
        'Bisoi ', NULL, 
        NULL, '14:25', 
        NULL, NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Biswakarma', NULL, 
        'OD-11G-6920', NULL, 'Baleswar golei', 
        'Badasahi ', NULL, 
        NULL, '18:00', 
        NULL, NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Jhuna', NULL, 
        'OD-11N-7415', NULL, 'Murgabadi golei', 
        'Bisoi', NULL, 
        NULL, '13:05', 
        NULL, NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Dev&Dev', NULL, 
        'OR-11F-6859', NULL, 'Baleswar golei', 
        'Udla', NULL, 
        NULL, '14:00', 
        NULL, NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Sherawali', NULL, 
        'JH-11Z-7733', NULL, 'Old Bus Stand', 
        'Bohoragora', NULL, 
        NULL, '13:20', 
        NULL, NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Maa Ambika', NULL, 
        'OR-11D-9403', NULL, 'Baleswar golei', 
        'Udla', NULL, 
        NULL, '19:05', 
        NULL, NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Raja (Bisoi)', NULL, 
        'OD-11A-30233', 'R005', 'Old Bus Stand', 
        'Bahalda', 'Bisoi', 
        NULL, '09:52', 
        '11:15', NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        NULL, 'Raja(Udala)', NULL, 
        NULL, NULL, 'Baleswar golei', 
        'Bhubaneswar', 'Udala', 
        '22:15', '20:45', 
        NULL, NULL,
        NULL, NULL, NULL, 
        NULL, NULL, 
        NULL, NULL, NULL, 
        NULL, 'Active', NULL
      );
